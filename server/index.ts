
import express from 'express';
import cors from 'cors';
import { pool, initDatabase } from './db';

const app = express();
const PORT = process.env.PORT || 3030;

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

app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; text-align: center; padding: 50px;">
      <h1>🚀 Angkringan POS API Online!</h1>
      <p>Backend siap melayani permintaan.</p>
    </div>
  `);
});

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
      SELECT 
        id, 
        name, 
        price, 
        cost_price AS costPrice, 
        category, 
        is_active AS isActive, 
        outlet_id AS outletId 
      FROM products 
      ORDER BY category, name
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal ambil produk', details: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const b = req.body;
  const data = {
    id: b.id,
    name: b.name,
    price: b.price,
    cost_price: b.costPrice ?? b.cost_price ?? 0,
    category: b.category,
    is_active: b.isActive ?? b.is_active ?? 1,
    outlet_id: b.outletId ?? b.outlet_id ?? 'o1'
  };

  try {
    await pool.query(
      'INSERT INTO products (id, name, price, cost_price, category, is_active, outlet_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.id, data.name, data.price, data.cost_price, data.category, data.is_active, data.outlet_id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal tambah produk', details: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const b = req.body;
  const name = b.name;
  const price = b.price;
  const cost_price = b.costPrice ?? b.cost_price ?? 0;
  const category = b.category;
  const is_active = (b.isActive === false || b.is_active === 0) ? 0 : 1;

  try {
    await pool.query(
      'UPDATE products SET name=?, price=?, cost_price=?, category=?, is_active=? WHERE id=?',
      [name, price, cost_price, category, is_active, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal update produk', details: err.message });
  }
});

// GET: Transactions - Perbaikan Join data rincian menu
app.get('/api/transactions', async (req, res) => {
  try {
    // 1. Ambil data transaksi utama
    const [transactions]: any = await pool.query(`
      SELECT id, subtotal, discount, total, payment_method AS paymentMethod, 
             customer_name AS customerName, status, created_at AS createdAt, 
             outlet_id AS outletId, cashier_id AS cashierId 
      FROM transactions ORDER BY created_at DESC LIMIT 100
    `);

    if (transactions.length === 0) return res.json([]);

    // 2. Ambil semua item untuk transaksi di atas
    const txIds = transactions.map((t: any) => String(t.id));
    const [items]: any = await pool.query(`
      SELECT transaction_id, product_id as id, name, price, cost_price as costPrice, quantity, note 
      FROM transaction_items 
      WHERE transaction_id IN (?)
    `, [txIds]);

    console.log(`[API] Fetched ${transactions.length} transactions and ${items.length} items for them.`);

    // 3. Gabungkan item ke masing-masing transaksi dengan perbandingan string yang bersih
    const result = transactions.map((t: any) => {
      const transactionItems = items.filter((item: any) => String(item.transaction_id) === String(t.id));
      return {
        ...t,
        items: transactionItems
      };
    });

    res.json(result);
  } catch (err: any) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Gagal ambil riwayat transaksi', details: err.message });
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
        [id, item.id, item.name, item.price, item.costPrice ?? item.cost_price ?? 0, item.quantity, item.note]
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

const server = app.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`🚀 API REPAIRED & RUNNING ON PORT ${PORT}`);
  await initDatabase();
});
