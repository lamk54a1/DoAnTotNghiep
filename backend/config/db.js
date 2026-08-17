const { Pool } = require('pg');
require('dotenv').config();

const requiredEnv = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(`Thiếu cấu hình database trong .env: ${missingEnv.join(', ')}`);
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
});

pool.connect((err, client, release) => {
  if (err) console.error('Lỗi kết nối Postgres:', err.stack);
  else {
    console.log('Đã kết nối PostgreSQL thành công!');
    release();
  }
});

module.exports = pool;
