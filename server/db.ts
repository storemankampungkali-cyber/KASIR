
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Memastikan .env dibaca dari direktori yang benar
// Fix: Use process.cwd() instead of __dirname to avoid "Cannot find name '__dirname'" in environments where it's not defined (e.g., ESM or missing Node.js global types).
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'angkringan_pos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Helper to check connection
export const checkConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Connected Successfully');
    console.log(`📡 Connected to: ${process.env.DB_NAME} on ${process.env.DB_HOST}`);
    connection.release();
    return true;
  } catch (err: any) {
    console.error('❌ MySQL Connection Failed:');
    console.error(`Error Code: ${err.code}`);
    console.error(`Message: ${err.message}`);
    return false;
  }
};
