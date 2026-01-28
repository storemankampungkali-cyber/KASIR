
import express from 'express';
import cors from 'cors';
import { pool, checkConnection, initDatabase } from './db';

const app = express();
const PORT = process.env.PORT || 3030;

// Izinkan akses dari mana saja (Vercel, Localhost, dll)
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}) as any);

app.use(express.json() as any);

// Logging middleware untuk Railway Logs
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- ROOT ROUTE (Indikator Server Hidup) ---
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; text-align: center; padding: 50px;">
      <h1>🚀 Angkringan POS API is Running!</h1>
      <p>Backend siap melayani request.</p>
      <p>Gunakan Frontend di Vercel untuk mengakses aplikasi.</p>
    </div>
  `);
});

// --- HEALTH CHECK YANG LEBIH PINTAR ---
app.get('/health', async (req, res) => {
  try {
    // Coba ping database
    await pool.query('SELECT 1');
    res.json({ 
      status: 'UP', 
      database: 'CONNECTED', 
      timestamp: new Date().toISOString() 
    });
  } catch (err: any) {
    console.error('Health Check DB Failed:', err.message);
    res.status(500).json({ 
      status: 'DOWN', 
      database: 'DISCONNECTED', 
      error: err.message 
    });
  }
});

// --- API ROUTES ---
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY category, name');
    res.json(rows);
  } catch (err: any) {
    console.error('DB Error:', err.message);
    res.status(500).json({ error: 'Gagal mengambil data produk', details: err.message });
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
    console.error('Insert Error:', err.message);
    res.status(500).json({ error: 'Gagal menambah produk' });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100');
    res.json(rows);
  } catch (err: any) {
    console.error('Transactions Error:', err.message);
    res.status(500).json({ error: 'Gagal mengambil transaksi' });
  }
});

app.put('/api/transactions/:id/void', async (req, res) => {
  const { id } = req.params;
  const { voidReason } = req.body;
  try {
    await pool.query('UPDATE transactions SET status = ?, void_reason = ? WHERE id = ?', ['VOIDED', voidReason, id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Void Error:', err.message);
    res.status(500).json({ error: 'Gagal membatalkan transaksi' });
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
    console.error('Update Error:', err.message);
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

app.listen(PORT, async () => {
  console.log(`🚀 Backend Angkringan running on port ${PORT}`);
  
  // Jalankan inisialisasi database otomatis
  await initDatabase();
});
