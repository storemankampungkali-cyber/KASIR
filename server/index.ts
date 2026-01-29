
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { pool, initDatabase } from './db';

const app = express();
const PORT = process.env.PORT || 3030;

// Logging Middleware
app.use((req: any, res: any, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}) as any);

app.use(express.json() as any);

// Fix untuk BigInt JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// --- API ROUTES ---

app.get('/health', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT 1 as ok');
    res.json({ status: 'UP', database: rows[0]?.ok === 1 ? 'CONNECTED' : 'ERROR' });
  } catch (err: any) {
    res.status(500).json({ status: 'DOWN', error: err.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, CAST(price AS DOUBLE) as price, CAST(cost_price AS DOUBLE) as costPrice, 
             category, is_active AS isActive, outlet_id AS outletId 
      FROM products ORDER BY category, name
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal ambil produk' });
  }
});

app.post('/api/products', async (req, res) => {
  const b = req.body;
  try {
    await pool.query(
      'INSERT INTO products (id, name, price, cost_price, category, is_active, outlet_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [b.id, b.name, b.price, b.costPrice ?? 0, b.category, b.isActive ?? 1, b.outletId ?? 'o1']
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal tambah produk' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const b = req.body;
  try {
    await pool.query(
      'UPDATE products SET name=?, price=?, cost_price=?, category=?, is_active=? WHERE id=?',
      [b.name, b.price, b.costPrice ?? 0, b.category, b.isActive ? 1 : 0, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal update produk' });
  }
});

// GET Transactions: SOLID JOIN VERSION
app.get('/api/transactions', async (req, res) => {
  try {
    const [rows]: any = await pool.query(`
      SELECT 
        t.id, 
        CAST(t.subtotal AS DOUBLE) as subtotal, 
        CAST(t.discount AS DOUBLE) as discount, 
        CAST(t.total AS DOUBLE) as total, 
        t.payment_method AS paymentMethod, 
        t.customer_name AS customerName, 
        t.status, 
        t.created_at AS createdAt, 
        t.outlet_id AS outletId, 
        t.cashier_id AS cashierId,
        ti.product_id AS item_id, 
        ti.name AS item_name, 
        CAST(ti.price AS DOUBLE) AS item_price, 
        CAST(ti.cost_price AS DOUBLE) AS item_costPrice, 
        ti.quantity AS item_quantity, 
        ti.note AS item_note
      FROM transactions t
      LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
      ORDER BY t.created_at DESC
      LIMIT 500
    `);

    const txMap = new Map();

    rows.forEach((row: any) => {
      if (!txMap.has(row.id)) {
        txMap.set(row.id, {
          id: row.id,
          subtotal: row.subtotal,
          discount: row.discount,
          total: row.total,
          paymentMethod: row.paymentMethod,
          customerName: row.customerName,
          status: row.status,
          createdAt: row.createdAt,
          outletId: row.outletId,
          cashierId: row.cashierId,
          items: []
        });
      }

      if (row.item_id) {
        txMap.get(row.id).items.push({
          id: row.item_id,
          name: row.item_name,
          price: row.item_price,
          costPrice: row.item_costPrice,
          quantity: row.item_quantity,
          note: row.item_note
        });
      }
    });

    res.json(Array.from(txMap.values()));
  } catch (err: any) {
    console.error('Error GET transactions:', err);
    res.status(500).json({ error: 'Gagal ambil riwayat', details: err.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { id, items, subtotal, discount, total, paymentMethod, customerName, createdAt, outletId, cashierId } = req.body;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    await connection.query(
      `INSERT INTO transactions (id, subtotal, discount, total, payment_method, customer_name, status, created_at, outlet_id, cashier_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, subtotal, discount, total, paymentMethod, customerName, 'COMPLETED', new Date(createdAt), outletId, cashierId]
    );
    
    if (items && Array.isArray(items)) {
      for (const item of items) {
        // Gunakan COALESCE atau check eksplisit untuk cost_price agar laporan modal tidak nol
        const cPrice = item.costPrice ?? item.cost_price ?? 0;
        await connection.query(
          `INSERT INTO transaction_items (transaction_id, product_id, name, price, cost_price, quantity, note) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, item.id, item.name, item.price, cPrice, item.quantity, item.note]
        );
      }
    }

    await connection.commit();
    res.json({ success: true });
  } catch (err: any) {
    await connection.rollback();
    console.error('Error POST transaction:', err);
    res.status(500).json({ error: 'Gagal simpan', details: err.message });
  } finally {
    connection.release();
  }
});

app.put('/api/transactions/:id/void', async (req, res) => {
  const { id } = req.params;
  const { voidReason } = req.body;
  try {
    await pool.query('UPDATE transactions SET status = ?, void_reason = ? WHERE id = ?', ['VOIDED', voidReason, id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal void' });
  }
});

app.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
  await initDatabase();
});
