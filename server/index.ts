
import express, { Request, Response } from 'express';
import cors from 'cors';
import { pool, checkConnection } from './db';

const app = express();
const PORT = 3030;

app.use(cors());
app.use(express.json());

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
  const { id, name, price, cost_price, category, is_active, outlet_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO products (id, name, price, cost_price, category, is_active, outlet_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, price, cost_price, category, is_active, outlet_id]
    );
    res.status(201).json({ message: 'Product created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { name, price, cost_price, category, is_active } = req.body;
  try {
    await pool.query(
      'UPDATE products SET name=?, price=?, cost_price=?, category=?, is_active=? WHERE id=?',
      [name, price, cost_price, category, is_active, req.params.id]
    );
    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// --- TRANSACTIONS API ---
app.get('/api/transactions', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC');
    // Fetch items for each transaction
    const transactionsWithItems = await Promise.all(rows.map(async (tx: any) => {
      const [items] = await pool.query('SELECT * FROM transaction_items WHERE transaction_id = ?', [tx.id]);
      return { ...tx, items };
    }));
    res.json(transactionsWithItems);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { id, items, subtotal, discount, total, paymentMethod, customerName, outletId, cashierId } = req.body;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Insert main transaction
    await connection.query(
      'INSERT INTO transactions (id, subtotal, discount, total, payment_method, customer_name, outlet_id, cashier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, subtotal, discount, total, paymentMethod, customerName, outletId, cashierId]
    );

    // Insert items
    for (const item of items) {
      await connection.query(
        'INSERT INTO transaction_items (transaction_id, product_id, name, price, cost_price, quantity, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, item.id, item.name, item.price, item.costPrice, item.quantity, item.note || '']
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'Transaction processed successfully' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to process transaction' });
  } finally {
    connection.release();
  }
});

app.put('/api/transactions/:id/void', async (req, res) => {
  const { voidReason } = req.body;
  try {
    await pool.query(
      'UPDATE transactions SET status="VOIDED", void_reason=? WHERE id=?',
      [voidReason, req.params.id]
    );
    res.json({ message: 'Transaction voided' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to void transaction' });
  }
});

// --- CONFIG API ---
app.get('/api/config/:key', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT config_value FROM app_config WHERE config_key = ?', [req.params.key]);
    res.json(rows[0]?.config_value || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

app.put('/api/config/:key', async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO app_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?',
      [req.params.key, JSON.stringify(req.body), JSON.stringify(req.body)]
    );
    res.json({ message: 'Config updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// Start Server
app.listen(PORT, async () => {
  await checkConnection();
  console.log(`🚀 POS Backend running at http://localhost:${PORT}`);
});
