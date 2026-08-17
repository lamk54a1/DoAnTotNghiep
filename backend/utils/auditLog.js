const pool = require('../config/db');

const writeAuditLog = async ({ userId = null, action, entityType = null, entityId = null, metadata = {} }, db = pool) => {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entityType, entityId ? String(entityId) : null, metadata]
    );
  } catch (err) {
    console.error('Không thể ghi audit log:', err.message);
  }
};

module.exports = { writeAuditLog };
