const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamp NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

  for (const filename of files) {
    const applied = await pool.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [filename]);
    if (applied.rowCount > 0) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    console.log(`Đã áp dụng migration ${filename}`);
  }
}

migrate()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error('Migration thất bại:', error.message);
    await pool.end();
    process.exitCode = 1;
  });
