
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { pool, initDatabase } from './db';

const app = express();
const PORT = process.env.PORT || 3030;

// Middleware Logging: Memantau setiap request yang masuk ke server
// Fix: Use 'any' type for req and res to avoid property access errors in specific environments
app.use((req: any, res: any, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}) as any);

app.use(express.json() as any);

// Fix untuk BigInt: MySQL terkadang mengembalikan BigInt yang tidak bisa di-JSON stringify
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// --- API ROUTES ---

// Health Check dengan detail status DB
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

// GET: Ambil Produk
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, price, cost_price AS costPrice, category, is_active AS isActive, outlet_id AS outletId 
      FROM products 
      ORDER BY category, name
    `);
    res.json(rows);
  } catch (err: any) {
    console.error('❌ Error Fetch Products:', err);
    res.status(500).json({ error: 'Database Error', details: err.message });
  }
});

// POST: Simpan Transaksi (Critical Section)
app.post('/api/transactions', async (req, res) => {
  const { id, items, subtotal, discount, total, paymentMethod, customerName, createdAt, outletId, cashierId } = req.body;
  
  if (!id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Data transaksi tidak valid atau keranjang kosong' });
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log(`[TRANSACTION] Memulai simpan transaksi #${id}...`);

    // 1. Insert Header Transaksi
    await connection.query(
      `INSERT INTO transactions 
       (id, subtotal, discount, total, payment_method, customer_name, status, created_at, outlet_id, cashier_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, subtotal, discount, total, paymentMethod, customerName || null, 'COMPLETED', new Date(createdAt), outletId || 'o1', cashierId || 'u1']
    );
    
    // 2. Insert Items secara batch atau loop
    for (const item of items) {
      await connection.query(
        `INSERT INTO transaction_items 
         (transaction_id, product_id, name, price, cost_price, quantity, note) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id, 
          item.id, 
          item.name, 
          item.price, 
          item.costPrice || item.cost_price || 0, 
          item.quantity, 
          item.note || null
        ]
      );
    }

    await connection.commit();
    console.log(`[TRANSACTION] ✅ Berhasil! Transaksi #${id} tersimpan dengan ${items.length} item.`);
    res.status(201).json({ success: true, id });
  } catch (err: any) {
    await connection.rollback();
    console.error(`[TRANSACTION] ❌ Gagal Simpan #${id}:`, err.message);
    res.status(500).json({ error: 'Gagal memproses transaksi di server', details: err.message });
  } finally {
    connection.release();
  }
});

// GET: Ambil Riwayat Transaksi (JOIN SQL Version)
app.get('/api/transactions', async (req, res) => {
  try {
    console.log('[API] Fetching all transactions with items...');
    
    const [rows]: any = await pool.query(`
      SELECT 
        t.id, t.subtotal, t.discount, t.total, t.payment_method AS paymentMethod, 
        t.customer_name AS customerName, t.status, t.created_at AS createdAt, 
        t.outlet_id AS outletId, t.cashier_id AS cashierId,
        ti.product_id AS item_id, ti.name AS item_name, ti.price AS item_price, 
        ti.cost_price AS item_costPrice, ti.quantity AS item_quantity, ti.note AS item_note
      FROM transactions t
      LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
      ORDER BY t.created_at DESC
      LIMIT 300
    `);

    // Grouping Hasil JOIN: Mengubah flat rows menjadi nested object { ..., items: [] }
    const txMap = new Map();

    rows.forEach((row: any) => {
      if (!txMap.has(row.id)) {
        txMap.set(row.id, {
          id: row.id,
          subtotal: Number(row.subtotal),
          discount: Number(row.discount),
          total: Number(row.total),
          paymentMethod: row.paymentMethod,
          customerName: row.customerName,
          status: row.status,
          createdAt: row.createdAt,
          outletId: row.outletId,
          cashierId: row.cashierId,
          items: [] // Inisialisasi array kosong
        });
      }

      // Jika ada rincian item di row ini, masukkan ke array items
      if (row.item_id) {
        txMap.get(row.id).items.push({
          id: row.item_id,
          name: row.item_name,
          price: Number(row.item_price),
          costPrice: Number(row.item_costPrice),
          quantity: Number(row.item_quantity),
          note: row.item_note
        });
      }
    });

    const finalResult = Array.from(txMap.values());
    console.log(`[API] Berhasil menarik ${finalResult.length} transaksi.`);
    res.json(finalResult);
  } catch (err: any) {
    console.error('❌ Error Fetch Transactions:', err);
    res.status(500).json({ error: 'Gagal mengambil data riwayat', details: err.message });
  }
});

// PUT: Void Transaksi
app.put('/api/transactions/:id/void', async (req, res) => {
  const { id } = req.params;
  const { voidReason } = req.body;
  try {
    const [result]: any = await pool.query(
      'UPDATE transactions SET status = ?, void_reason = ? WHERE id = ?', 
      ['VOIDED', voidReason || 'No reason provided', id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }
    
    res.json({ success: true, message: `Transaksi ${id} dibatalkan.` });
  } catch (err: any) {
    console.error('❌ Error Void:', err);
    res.status(500).json({ error: 'Gagal membatalkan transaksi', details: err.message });
  }
});

// Error Handling Global
// Fix: Use 'any' type for req and res to avoid property access errors in specific environments
app.use((err: any, req: any, res: any, next: NextFunction) => {
  console.error('[GLOBAL ERROR]', err);
  res.status(500).json({ error: 'Terjadi kesalahan internal pada server' });
});

app.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║    ANGKRINGAN POS PRO SERVER RUNNING     ║
  ║    Port: ${PORT}                            ║
  ║    Status: READY                         ║
  ╚══════════════════════════════════════════╝
  `);
  await initDatabase();
});
