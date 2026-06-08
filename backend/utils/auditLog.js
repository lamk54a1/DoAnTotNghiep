const pool = require('../config/db');

const ensureAuditLogsTable = (db = pool) => db.query(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id integer,
    action varchar(80) NOT NULL,
    entity_type varchar(80),
    entity_id varchar(80),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp DEFAULT NOW()
  );
`);

const writeAuditLog = async ({ userId = null, action, entityType = null, entityId = null, metadata = {} }, db = pool) => {
  try {
    await ensureAuditLogsTable(db);
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entityType, entityId ? String(entityId) : null, metadata]
    );
  } catch (err) {
    console.error('Không thể ghi audit log:', err.message);
  }
};

module.exports = { ensureAuditLogsTable, writeAuditLog };
