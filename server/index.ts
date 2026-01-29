
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { pool, initDatabase } from './db';

const app = express();
const PORT = process.env.PORT || 3030;

// Force Numeric Types: Mengatasi masalah MySQL mengembalikan decimal sebagai string
const parseToNumber = (val: any) => {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};

app.use((req: any, res: any, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }) as any);
app.use(express.json() as any);

(BigInt.prototype as any).toJSON = function () { return this.toString(); };

// --- API ROUTES ---

app.get('/health', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT 1 as ok');
    res.json({ status: 'UP', database: rows[0]?.ok === 1 ? 'CONNECTED' : 'ERROR' });
  } catch (err: any) {
    res.status(500).json({ status: 'DOWN', error: err.message });
  }
});

// GET: Products
app.get('/api/products', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM products ORDER BY category, name');
    const products = rows.map((p: any) => ({
      ...p,
      price: parseToNumber(p.price),
      costPrice: parseToNumber(p.cost_price),
      isActive: p.is_active === 1 || p.is_active === true
    }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'DB Error' });
  }
});

// GET: Transactions (THE CRITICAL FIX)
app.get('/api/transactions', async (req, res) => {
  try {
    console.log('[BACKEND] Fetching all transactions...');
    
    // Query dengan LEFT JOIN yang lebih bersih
    const [rows]: any = await pool.query(`
      SELECT 
        t.*,
        ti.product_id, ti.name as item_name, ti.price as item_price, 
        ti.cost_price as item_cost_price, ti.quantity as item_quantity, ti.note as item_note
      FROM transactions t
      LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
      ORDER BY t.created_at DESC
      LIMIT 1000
    `);

    const txMap = new Map();

    rows.forEach((row: any) => {
      if (!txMap.has(row.id)) {
        txMap.set(row.id, {
          id: row.id,
          subtotal: parseToNumber(row.subtotal),
          discount: parseToNumber(row.discount),
          total: parseToNumber(row.total),
          paymentMethod: row.payment_method,
          customerName: row.customer_name,
          status: row.status,
          createdAt: row.created_at,
          outletId: row.outlet_id,
          cashierId: row.cashier_id,
          voidReason: row.void_reason,
          items: []
        });
      }

      // Pastikan item_id ada (bukan null hasil LEFT JOIN pada transaksi tanpa item)
      if (row.product_id) {
        txMap.get(row.id).items.push({
          id: row.product_id,
          name: row.item_name,
          price: parseToNumber(row.item_price),
          costPrice: parseToNumber(row.item_cost_price),
          quantity: parseInt(row.item_quantity) || 0,
          note: row.item_note
        });
      }
    });

    const result = Array.from(txMap.values());
    console.log(`[BACKEND] Sent ${result.length} transactions to frontend.`);
    res.json(result);
  } catch (err: any) {
    console.error('[BACKEND ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST: Save Transaction
app.post('/api/transactions', async (req, res) => {
  const { id, items, subtotal, discount, total, paymentMethod, customerName, createdAt, outletId, cashierId } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Keranjang belanja kosong' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    console.log(`[BACKEND] Saving transaction #${id} with ${items.length} items...`);

    // 1. Insert Header
    await connection.query(
      `INSERT INTO transactions (id, subtotal, discount, total, payment_method, customer_name, status, created_at, outlet_id, cashier_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, subtotal, discount, total, paymentMethod, customerName || null, 'COMPLETED', new Date(createdAt), outletId, cashierId]
    );

    // 2. Insert Items (Looping)
    for (const item of items) {
      await connection.query(
        `INSERT INTO transaction_items (transaction_id, product_id, name, price, cost_price, quantity, note) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, item.id, item.name, item.price, item.costPrice || 0, item.quantity, item.note || null]
      );
    }

    await connection.commit();
    console.log(`[BACKEND] Transaction #${id} saved successfully.`);
    res.json({ success: true });
  } catch (err: any) {
    await connection.rollback();
    console.error('[BACKEND SAVE ERROR]', err);
    res.status(500).json({ error: 'Gagal simpan transaksi', details: err.message });
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
  console.log(`🚀 SERVER POS PRO RUNNING ON PORT ${PORT}`);
  await initDatabase();
});
