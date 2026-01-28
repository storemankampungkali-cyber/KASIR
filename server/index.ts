
import express, { Request, Response } from 'express';
import cors from 'cors';
import { pool, checkConnection } from './db';

const app = express();
// Railway akan menentukan PORT secara dinamis melalui process.env.PORT
const PORT = process.env.PORT || 3030;

app.use(cors() as any);
app.use(express.json() as any);

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY category, name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
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
  } catch (err) {
    console.error('Create Product Error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Tambahkan endpoint health check untuk Railway
app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  checkConnection();
});
