
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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
  multipleStatements: true // WAJIB TRUE: Agar bisa menjalankan file schema.sql yang isinya banyak query
};

// Debugging log (Hanya tampil di server logs Railway)
console.log(`🔌 Attempting DB Connection to: ${dbConfig.host} on port ${dbConfig.port} as user ${dbConfig.user}`);

export const pool = mysql.createPool(dbConfig);

// Fungsi untuk membaca dan menjalankan schema.sql
export const initDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Cek apakah tabel 'products' sudah ada
    const [tables] = await connection.query(`SHOW TABLES LIKE 'products'`);
    
    // Jika tabel belum ada, jalankan schema.sql
    if ((tables as any[]).length === 0) {
      console.log('⚡ Database kosong terdeteksi. Menjalankan Auto-Migration...');
      
      const schemaPath = path.resolve((process as any).cwd(), 'server', 'schema.sql');
      
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await connection.query(sql);
        console.log('✅ Skema Database & Data Awal berhasil dibuat otomatis!');
      } else {
        console.error(`❌ File schema.sql tidak ditemukan di: ${schemaPath}`);
      }
    } else {
      console.log('✅ Database sudah terinisialisasi sebelumnya. Skipping migration.');
    }

    connection.release();
    return true;
  } catch (err: any) {
    console.error('❌ Gagal Inisialisasi Database:', err.message);
    return false;
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
