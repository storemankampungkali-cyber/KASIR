
import express from 'express';
import cors from 'cors';
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

app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

app.listen(PORT, async () => {
  console.log(`🚀 Backend Angkringan running on port ${PORT}`);
  // Jalankan inisialisasi database otomatis
  await initDatabase();
});
