
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve((process as any).cwd(), '.env') });

const getDbConfig = () => {
  if (process.env.MYSQL_URL) {
    return {
      uri: process.env.MYSQL_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      multipleStatements: true
    };
  }

  return {
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'railway',
    port: parseInt(process.env.MYSQLPORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    multipleStatements: true
  };
};

const dbConfig = getDbConfig();
export const pool = (dbConfig as any).uri 
  ? mysql.createPool((dbConfig as any).uri) 
  : mysql.createPool(dbConfig as any);

const SCHEMA_QUERIES = [
  `CREATE TABLE IF NOT EXISTS outlets (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      address TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      role ENUM('ADMIN', 'CASHIER') DEFAULT 'CASHIER',
      outlet_id VARCHAR(50),
      pin VARCHAR(6),
      FOREIGN KEY (outlet_id) REFERENCES outlets(id)
  )`,
  `CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(15, 2) NOT NULL DEFAULT 0,
      cost_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
      category VARCHAR(50) NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      outlet_id VARCHAR(50),
      FOREIGN KEY (outlet_id) REFERENCES outlets(id)
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(50) PRIMARY KEY,
      subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
      discount DECIMAL(15, 2) DEFAULT 0,
      total DECIMAL(15, 2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(20) NOT NULL,
      customer_name VARCHAR(100),
      status ENUM('COMPLETED', 'VOIDED') DEFAULT 'COMPLETED',
      void_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      outlet_id VARCHAR(50),
      cashier_id VARCHAR(50),
      FOREIGN KEY (outlet_id) REFERENCES outlets(id),
      FOREIGN KEY (cashier_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS transaction_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transaction_id VARCHAR(50),
      product_id VARCHAR(50),
      name VARCHAR(255) NOT NULL,
      price DECIMAL(15, 2) NOT NULL DEFAULT 0,
      cost_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
      quantity INT NOT NULL DEFAULT 1,
      note TEXT,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
  )`,
  `INSERT IGNORE INTO outlets (id, name, address) VALUES ('o1', 'Angkringan Pusat', 'Jl. Malioboro No. 1')`,
  `INSERT IGNORE INTO users (id, name, role, outlet_id, pin) VALUES ('u1', 'Alfian Dimas', 'ADMIN', 'o1', '123456')`
];

export const initDatabase = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('🔄 Checking Database Schema Consistency...');
    for (const query of SCHEMA_QUERIES) {
      await connection.query(query);
    }
    console.log('✅ Database Ready.');
    return true;
  } catch (err: any) {
    console.error('❌ Database Sync Failed:', err.message);
    return false;
  } finally {
    if (connection) connection.release();
  }
};
