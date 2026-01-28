import express, { Request, Response } from 'express';
import cors from 'cors';
import { pool, checkConnection } from './db';

const app = express();
const PORT = 3030;

// Fix: Cast cors() as any to resolve "No overload matches this call" error caused by type incompatibility between @types/cors and express middleware
app.use(cors() as any);
// Fix: Cast express.json() as any to resolve "No overload matches this call" error on line 10 (Argument of type 'NextHandleFunction' is not assignable to parameter of type 'PathParams')
app.use(express.json() as any);

// Middlewares
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- PRODUCTS API ---
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY category, name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', async (req, res) => {
  // Fix: Destructure using camelCase to correctly extract properties sent by the frontend's Product interface
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  checkConnection();
});
