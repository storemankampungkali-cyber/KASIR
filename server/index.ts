
import express from 'express';
import cors from 'cors';
import { pool, initDatabase } from './db';

const app = express();
const PORT = process.env.PORT || 3030;

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}) as any);

app.use(express.json() as any);

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
      SELECT id, name, price, cost_price AS costPrice, category, is_active AS isActive, outlet_id AS outletId 
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

app.get('/api/transactions', async (req, res) => {
  try {
    const [transactions]: any = await pool.query(`
      SELECT id, subtotal, discount, total, payment_method AS paymentMethod, 
             customer_name AS customerName, status, created_at AS createdAt, 
             outlet_id AS outletId, cashier_id AS cashierId 
      FROM transactions ORDER BY created_at DESC LIMIT 100
    `);

    if (transactions.length === 0) return res.json([]);

    const txIds = transactions.map((t: any) => String(t.id));
    
    // Menggunakan format [[ids]] untuk IN query agar lebih stabil di mysql2
    const [items]: any = await pool.query(`
      SELECT transaction_id, product_id as id, name, price, cost_price as costPrice, quantity, note 
      FROM transaction_items 
      WHERE transaction_id IN (?)
    `, [txIds]);

    const result = transactions.map((t: any) => ({
      ...t,
      items: items.filter((item: any) => String(item.transaction_id) === String(t.id))
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal ambil riwayat' });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { id, items, subtotal, discount, total, paymentMethod, customerName, createdAt, outletId, cashierId } = req.body;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 1. Simpan Header Transaksi
    await connection.query(
      'INSERT INTO transactions (id, subtotal, discount, total, payment_method, customer_name, status, created_at, outlet_id, cashier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, subtotal, discount, total, paymentMethod, customerName, 'COMPLETED', new Date(createdAt), outletId, cashierId]
    );
    
    // 2. Simpan Rincian Items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await connection.query(
          'INSERT INTO transaction_items (transaction_id, product_id, name, price, cost_price, quantity, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, item.id, item.name, item.price, item.costPrice ?? item.cost_price ?? 0, item.quantity, item.note]
        );
      }
    }

    await connection.commit();
    console.log(`✅ Transaksi #${id} Berhasil Disimpan dengan ${items?.length} items.`);
    res.json({ success: true, id });
  } catch (err: any) {
    await connection.rollback();
    console.error(`❌ Gagal Simpan Transaksi #${id}:`, err.message);
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
  console.log(`🚀 API RUNNING ON PORT ${PORT}`);
  await initDatabase();
});
