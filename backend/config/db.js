const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'slna_ticketing',
  password: process.env.DB_PASSWORD || 'Slna1201@',
  port: process.env.DB_PORT || 5432,
});

pool.connect((err) => {
  if (err) console.error('Lỗi kết nối Postgres:', err.stack);
  else console.log('Đã kết nối PostgreSQL thành công!');
});

module.exports = pool;