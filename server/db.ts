
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Railway menyediakan variabel lingkungan otomatis:
 * MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT
 */
export const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'angkringan_pos',
  port: parseInt(process.env.MYSQLPORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

export const checkConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Connected Successfully to Railway/Local');
    connection.release();
    return true;
  } catch (err: any) {
    console.error('❌ MySQL Connection Failed:', err.message);
    return false;
  }
};
