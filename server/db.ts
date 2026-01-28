
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Fix: Cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" error
dotenv.config({ path: path.resolve((process as any).cwd(), '.env') });

const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'angkringan_pos',
  port: parseInt(process.env.MYSQLPORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: true // WAJIB TRUE: Agar bisa menjalankan banyak query sekaligus
};

// Debugging log
console.log(`🔌 Attempting DB Connection to: ${dbConfig.host} on port ${dbConfig.port} as user ${dbConfig.user}`);

export const pool = mysql.createPool(dbConfig);

// --- JURUS ANTI GAGAL: SQL DITANAM LANGSUNG DISINI ---
const INITIAL_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS outlets (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      address TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      role ENUM('ADMIN', 'CASHIER') DEFAULT 'CASHIER',
      outlet_id VARCHAR(50),
      pin VARCHAR(6),
      FOREIGN KEY (outlet_id) REFERENCES outlets(id)
  );

  CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(15, 2) NOT NULL,
      cost_price DECIMAL(15, 2) NOT NULL,
      category VARCHAR(50) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      outlet_id VARCHAR(50),
      FOREIGN KEY (outlet_id) REFERENCES outlets(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(50) PRIMARY KEY,
      subtotal DECIMAL(15, 2) NOT NULL,
      discount DECIMAL(15, 2) DEFAULT 0,
      total DECIMAL(15, 2) NOT NULL,
      payment_method VARCHAR(20) NOT NULL,
      customer_name VARCHAR(100),
      status ENUM('COMPLETED', 'VOIDED') DEFAULT 'COMPLETED',
      void_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      outlet_id VARCHAR(50),
      cashier_id VARCHAR(50),
      FOREIGN KEY (outlet_id) REFERENCES outlets(id),
      FOREIGN KEY (cashier_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transaction_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transaction_id VARCHAR(50),
      product_id VARCHAR(50),
      name VARCHAR(255) NOT NULL,
      price DECIMAL(15, 2) NOT NULL,
      cost_price DECIMAL(15, 2) NOT NULL,
      quantity INT NOT NULL,
      note TEXT,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS app_config (
      config_key VARCHAR(50) PRIMARY KEY,
      config_value JSON NOT NULL
  );

  -- Data Awal (INSERT IGNORE biar tidak error kalau sudah ada)
  INSERT IGNORE INTO outlets (id, name, address) VALUES ('o1', 'Angkringan Pusat', 'Jl. Malioboro No. 1');
  INSERT IGNORE INTO users (id, name, role, outlet_id, pin) VALUES ('u1', 'Alfian Dimas', 'ADMIN', 'o1', '123456');
  INSERT IGNORE INTO app_config (config_key, config_value) VALUES ('qris', '{"merchantName": "ANGKRINGAN PRO", "isActive": true, "qrImageUrl": ""}');
`;

// Fungsi inisialisasi yang lebih sederhana dan kuat
export const initDatabase = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Langsung jalankan SQL Schema setiap kali server nyala
    // Karena kita pakai 'IF NOT EXISTS' dan 'INSERT IGNORE', ini aman dijalankan berulang kali
    console.log('🔄 Memastikan struktur database tersedia...');
    await connection.query(INITIAL_SCHEMA_SQL);
    console.log('✅ Database siap! Tabel dan data awal sudah termuat.');

    return true;
  } catch (err: any) {
    console.error('❌ FATAL: Gagal inisialisasi database:', err.message);
    return false;
  } finally {
    if (connection) connection.release();
  }
};

export const checkConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Connected Successfully!');
    connection.release();
    return true;
  } catch (err: any) {
    console.error('❌ MySQL Connection Failed:', err.message);
    return false;
  }
};
