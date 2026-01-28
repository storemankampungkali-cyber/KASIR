
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve((process as any).cwd(), '.env') });

/**
 * LOGIC KONEKSI RAILWAY YANG LEBIH PINTAR
 * Railway sering menyediakan variabel MYSQL_URL yang berisi lengkap (user:pass@host:port/db).
 * Kita prioritaskan itu.
 */
const getDbConfig = () => {
  if (process.env.MYSQL_URL) {
    console.log('🔗 Menggunakan koneksi via MYSQL_URL dari Railway...');
    return {
      uri: process.env.MYSQL_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      multipleStatements: true
    };
  }

  // Fallback ke variabel terpisah
  console.log('🔗 Menggunakan koneksi via variabel terpisah (HOST, USER, dll)...');
  return {
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway', // Default railway DB name
    port: parseInt(process.env.MYSQLPORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    multipleStatements: true
  };
};

const dbConfig = getDbConfig();

// Debugging log (Masking password)
if ((dbConfig as any).uri) {
   console.log(`🔌 Config URI: ${(dbConfig as any).uri.split('@')[1]}`); // Hide credential
} else {
   const conf = dbConfig as any;
   console.log(`🔌 Config Manual: Host=${conf.host} | User=${conf.user} | DB=${conf.database} | Port=${conf.port}`);
}

export const pool = (dbConfig as any).uri 
  ? mysql.createPool((dbConfig as any).uri) 
  : mysql.createPool(dbConfig as any);

// --- SQL SCHEMA ---
// Kita hapus "USE database" agar fleksibel mengikuti nama DB dari Railway
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

  INSERT IGNORE INTO outlets (id, name, address) VALUES ('o1', 'Angkringan Pusat', 'Jl. Malioboro No. 1');
  INSERT IGNORE INTO users (id, name, role, outlet_id, pin) VALUES ('u1', 'Alfian Dimas', 'ADMIN', 'o1', '123456');
  INSERT IGNORE INTO app_config (config_key, config_value) VALUES ('qris', '{"merchantName": "ANGKRINGAN PRO", "isActive": true, "qrImageUrl": ""}');
`;

export const initDatabase = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('🔄 Memastikan struktur database tersedia...');
    await connection.query(INITIAL_SCHEMA_SQL);
    console.log('✅ Database siap! Tabel dan data awal sudah termuat.');
    return true;
  } catch (err: any) {
    console.error('❌ FATAL: Gagal inisialisasi database:', err.message);
    if (err.code === 'ECONNREFUSED') {
       console.error('💡 HINT: Pastikan Variable Database sudah dilink di Railway (Project > Settings > Variables).');
    }
    return false;
  } finally {
    if (connection) connection.release();
  }
};

export const checkConnection = async () => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    return true;
  } catch (err: any) {
    console.error('❌ MySQL Connection Failed:', err.message);
    return false;
  }
};
