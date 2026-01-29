
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { pool, initDatabase } from './db';

const app = express();
const PORT = process.env.PORT || 3030;

const toNum = (val: any) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }) as any);
app.use(express.json() as any);

app.use((req: any, res: any, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

(BigInt.prototype as any).toJSON = function () { return this.toString(); };

app.get('/health', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT 1 as ok');
    res.json({ status: 'UP', db: rows[0]?.ok === 1 ? 'OK' : 'ERR' });
  } catch (err: any) {
    res.status(500).json({ status: 'DOWN', error: err.message });
  }
});

// --- API PRODUK ---

app.get('/api/products', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM products ORDER BY category, name');
    const products = rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: toNum(p.price),
      costPrice: toNum(p.cost_price),
      category: p.category,
      isActive: p.is_active === 1 || p.is_active === true,
      outletId: p.outlet_id
    }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Gagal tarik produk' });
  }
});

app.post('/api/products', async (req, res) => {
  const { id, name, price, costPrice, category, isActive, outletId } = req.body;
  try {
    await pool.query(
      'INSERT INTO products (id, name, price, cost_price, category, is_active, outlet_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, price, costPrice, category, isActive ? 1 : 0, outletId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, costPrice, category, isActive } = req.body;
  try {
    await pool.query(
      'UPDATE products SET name = ?, price = ?, cost_price = ?, category = ?, is_active = ? WHERE id = ?',
      [name, price, costPrice, category, isActive ? 1 : 0, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- API TRANSAKSI ---

app.get('/api/transactions', async (req, res) => {
  try {
    const [rows]: any = await pool.query(`
      SELECT 
        t.id, t.subtotal, t.discount, t.total, t.payment_method, t.customer_name, 
        t.status, t.created_at, t.outlet_id, t.cashier_id, t.void_reason,
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
          subtotal: toNum(row.subtotal),
          discount: toNum(row.discount),
          total: toNum(row.total),
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

      if (row.product_id) {
        txMap.get(row.id).items.push({
          id: row.product_id,
          name: row.item_name,
          price: toNum(row.item_price),
          costPrice: toNum(row.item_cost_price),
          quantity: parseInt(row.item_quantity) || 0,
          note: row.item_note
        });
      }
    });

    res.json(Array.from(txMap.values()));
  } catch (err: any) {
    console.error('FETCH ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { id, items, subtotal, discount, total, paymentMethod, customerName, createdAt, outletId, cashierId } = req.body;
  
  if (!items || items.length === 0) return res.status(400).json({ error: 'Keranjang kosong' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO transactions (id, subtotal, discount, total, payment_method, customer_name, status, created_at, outlet_id, cashier_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, subtotal, discount, total, paymentMethod, customerName || null, 'COMPLETED', new Date(createdAt), outletId, cashierId]
    );

    for (const item of items) {
      await conn.query(
        `INSERT INTO transaction_items (transaction_id, product_id, name, price, cost_price, quantity, note) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, item.id, item.name, item.price, item.costPrice || 0, item.quantity, item.note || null]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.put('/api/transactions/:id/void', async (req, res) => {
  const { id } = req.params;
  const { voidReason } = req.body;
  try {
    await pool.query('UPDATE transactions SET status = ?, void_reason = ? WHERE id = ?', ['VOIDED', voidReason, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Gagal melakukan void' }); }
});

app.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`🚀 POS SERVER ON PORT ${PORT}`);
  await initDatabase();
});
