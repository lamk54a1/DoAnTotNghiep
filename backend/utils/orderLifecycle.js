const ORDER_EXPIRY_MINUTES = 15;

async function releaseExpiredOrders(db) {
  const expired = await db.query(`
    SELECT id
    FROM orders
    WHERE status = 'PENDING'
      AND expires_at IS NOT NULL
      AND expires_at <= NOW()
    FOR UPDATE
  `);

  if (expired.rowCount === 0) return 0;
  const orderIds = expired.rows.map((row) => row.id);

  await db.query(
    `UPDATE tickets
     SET status = 'AVAILABLE', order_id = NULL, ticket_qr_code = NULL,
         held_by = NULL, held_until = NULL
     WHERE order_id = ANY($1::int[])`,
    [orderIds]
  );
  await db.query(
    `UPDATE orders SET status = 'CANCELLED', updated_at = NOW()
     WHERE id = ANY($1::int[]) AND status = 'PENDING'`,
    [orderIds]
  );
  return orderIds.length;
}

async function expirePendingOrders(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const count = await releaseExpiredOrders(client);
    await client.query('COMMIT');
    return count;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { ORDER_EXPIRY_MINUTES, releaseExpiredOrders, expirePendingOrders };
