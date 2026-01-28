
import express from 'express';
import cors from 'cors';
import path from 'path'; // Import path untuk lokasi file
import { pool, checkConnection, initDatabase } from './db';

const app = express();
const PORT = process.env.PORT || 3030;

app.use(cors() as any);
app.use(express.json() as any);

// Logging middleware untuk Railway Logs
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- API ROUTES ---
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY category, name');
    res.json(rows);
  } catch (err: any) {
    console.error('DB Error:', err.message);
    res.status(500).json({ error: 'Gagal mengambil data produk' });
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
  } catch (err) {
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

app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// --- INTEGRASI FRONTEND (SERVE STATIC FILES) ---
// Bagian ini penting agar saat buka URL di browser, yang muncul adalah web App-nya
const frontendPath = path.resolve((process as any).cwd(), 'dist');

// 1. Serve file statis (CSS, JS, Gambar) dari folder dist
app.use(express.static(frontendPath));

// 2. Catch-all Route: Apapun URL-nya (selain /api), kirimkan index.html
// Ini wajib untuk React Router (SPA) agar tidak 404 saat refresh halaman
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, async () => {
  console.log(`🚀 Backend Angkringan running on port ${PORT}`);
  console.log(`📂 Serving Frontend from: ${frontendPath}`);
  
  // Jalankan inisialisasi database otomatis
  await initDatabase();
});
