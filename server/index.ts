
import express from 'express';
import cors from 'cors';
import { pool, initDatabase } from './db';

const app = express();
// Railway/VPS biasanya menggunakan port dari env, jika tidak ada pakai 3030
const PORT = process.env.PORT || 3030;

// Middleware logging yang lebih detail untuk monitoring VPS
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}) as any);

app.use(express.json() as any);

// Root route untuk cek status server via Browser (http://IP_VPS)
app.get('/', (req, res) => {
  // Fix: Property 'uptime' does not exist on type 'Process'. Casting to any to access Node.js runtime uptime.
  const uptimeSeconds = Math.floor((process as any).uptime());
  
  res.send(`
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px; background: #f4f7f9; min-height: 100vh;">
      <div style="background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); display: inline-block;">
        <h1 style="color: #4089C9; margin-bottom: 10px;">🚀 Angkringan POS API Online!</h1>
        <p style="color: #64748b;">Backend VPS berhasil diakses pada <b>${new Date().toLocaleString()}</b></p>
        <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 10px; font-family: monospace; font-size: 14px; text-align: left;">
          <b>Status Database:</b> Checking... <br/>
          <b>Uptime:</b> ${uptimeSeconds} detik
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">Endpoint API: <code>/api/products</code> | Health: <code>/health</code></p>
      </div>
    </div>
  `);
});

app.get('/health', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT 1 as ok');
    res.json({ 
      status: 'UP', 
      database: rows[0]?.ok === 1 ? 'CONNECTED' : 'ERROR',
      timestamp: new Date().toISOString() 
    });
  } catch (err: any) {
    console.error('❌ Health Check Failed:', err.message);
    res.status(500).json({ status: 'DOWN', error: err.message });
  }
});

// API Routes
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE is_active = 1 ORDER BY category, name');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal ambil produk', details: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { id, name, price, costPrice, category, isActive, outletId } = req.body;
  try {
    await pool.query(
      'INSERT INTO products (id, name, price, cost_price, category, is_active, outlet_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, price, costPrice, category, isActive, outletId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal tambah produk' });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 50');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal ambil transaksi' });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { id, items, subtotal, discount, total, paymentMethod, customerName, createdAt, outletId, cashierId } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      'INSERT INTO transactions (id, subtotal, discount, total, payment_method, customer_name, status, created_at, outlet_id, cashier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, subtotal, discount, total, paymentMethod, customerName, 'COMPLETED', new Date(createdAt), outletId, cashierId]
    );
    for (const item of items) {
      await connection.query(
        'INSERT INTO transaction_items (transaction_id, product_id, name, price, cost_price, quantity, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, item.id, item.name, item.price, item.costPrice, item.quantity, item.note]
      );
    }
    await connection.commit();
    res.json({ success: true, id });
  } catch (err: any) {
    await connection.rollback();
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
    res.status(500).json({ error: 'Gagal void transaksi' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, costPrice, category, isActive } = req.body;
  try {
    await pool.query(
      'UPDATE products SET name=?, price=?, cost_price=?, category=?, is_active=? WHERE id=?',
      [name, price, costPrice, category, isActive, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal update produk' });
  }
});

app.put('/api/config/qris', async (req, res) => {
  const config = req.body;
  try {
    await pool.query(
      'INSERT INTO app_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?',
      ['qris', JSON.stringify(config), JSON.stringify(config)]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal update QRIS' });
  }
});

// Menjalankan server pada 0.0.0.0 agar bisa menerima koneksi eksternal
const server = app.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`
  --------------------------------------------------
  🚀 ANGKRINGAN POS SERVER IS RUNNING
  --------------------------------------------------
  📍 Local:    http://localhost:${PORT}
  📍 Network:  http://0.0.0.0:${PORT}
  --------------------------------------------------
  `);
  
  await initDatabase();
});
