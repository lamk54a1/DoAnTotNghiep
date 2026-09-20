const pool = require('../config/db');
const { assignTicketQrCodes } = require('../utils/ticketQr');
const { writeAuditLog } = require('../utils/auditLog');
const { isSepayConfigured, verifySepaySignature, normalizeTransfer } = require('../services/sepayService');

const processSepayTransfer = async (payload, client) => {
  const transfer = normalizeTransfer(payload);
  if (!transfer) return { invalid: true };

  await client.query('BEGIN');
  const inserted = await client.query(
    `INSERT INTO sepay_transactions
       (transaction_id, payment_code, account_number, amount, status, payload)
     VALUES ($1, $2, $3, $4, 'RECEIVED', $5::jsonb)
     ON CONFLICT (transaction_id) DO NOTHING RETURNING transaction_id`,
    [transfer.transactionId, transfer.paymentCode || null, transfer.accountNumber, transfer.amount, JSON.stringify(payload)]
  );
  if (inserted.rowCount === 0) {
    await client.query('COMMIT');
    return { duplicate: true };
  }

  let status = 'REVIEW_CODE';
  let orderId = null;
  if (transfer.transferType !== 'in') status = 'IGNORED_OUTGOING';
  else if (transfer.accountNumber !== String(process.env.BANK_ACCOUNT_NO || '').trim()) status = 'REVIEW_ACCOUNT';
  else if (/^SLNA[A-F0-9]{12}$/.test(transfer.paymentCode)) {
    const result = await client.query(
      `SELECT id, user_id, total_amount, status, (expires_at > NOW()) AS is_within_deadline
       FROM orders WHERE order_qr_code = $1 AND payment_method = 'SEPAY'
       FOR UPDATE`,
      [transfer.paymentCode]
    );
    if (result.rowCount === 0) status = 'REVIEW_NO_ORDER';
    else {
      const order = result.rows[0];
      orderId = order.id;
      if (order.status !== 'PENDING' || !order.is_within_deadline) status = 'REVIEW_EXPIRED';
      else if (Number(order.total_amount) !== transfer.amount) status = 'REVIEW_AMOUNT';
      else {
        await client.query(
          "UPDATE orders SET status = 'SUCCESS', transaction_id = $1, updated_at = NOW() WHERE id = $2 AND status = 'PENDING'",
          [`sepay:${transfer.transactionId}`, order.id]
        );
        await assignTicketQrCodes(client, [order.id]);
        await writeAuditLog({ userId: order.user_id, action: 'ORDER_PAID_SEPAY', entityType: 'order', entityId: order.id, metadata: { transactionId: transfer.transactionId, amount: transfer.amount } }, client);
        status = 'MATCHED';
      }
    }
  }

  await client.query(
    'UPDATE sepay_transactions SET order_id = $1, status = $2 WHERE transaction_id = $3',
    [orderId, status, transfer.transactionId]
  );
  await client.query('COMMIT');
  return { status, orderId };
};

const handleSepayWebhook = async (req, res) => {
  if (!isSepayConfigured()) return res.status(503).json({ success: false });
  if (!verifySepaySignature(req.headers, req.body)) return res.status(401).json({ success: false });

  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false });
  }

  const client = await pool.connect().catch((error) => {
    console.error('Không kết nối được DB cho webhook SePay:', error.message);
    return null;
  });
  if (!client) return res.status(503).json({ success: false });
  try {
    const outcome = await processSepayTransfer(payload, client);
    if (outcome.invalid) return res.status(400).json({ success: false });
    if (outcome.status && outcome.status !== 'MATCHED') console.warn('SePay cần đối soát:', outcome.status, outcome.orderId || 'không có đơn');
    return res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Không xử lý được webhook SePay:', error.message);
    return res.status(500).json({ success: false });
  } finally {
    client.release();
  }
};

module.exports = { handleSepayWebhook, processSepayTransfer };
