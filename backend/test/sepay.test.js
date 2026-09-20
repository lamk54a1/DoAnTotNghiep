const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifySepaySignature, normalizeTransfer } = require('../services/sepayService');
const { processSepayTransfer } = require('../controllers/sepayController');
const pool = require('../config/db');

test.after(async () => {
  await pool.end();
});

const transfer = {
  id: 92704,
  accountNumber: '123456789',
  code: 'SLNA12ABCDEF3456',
  content: 'SLNA12ABCDEF3456 chuyen tien',
  transferType: 'in',
  transferAmount: 50000,
};

test('SePay webhook chỉ chấp nhận chữ ký HMAC đúng trên raw body và timestamp mới', () => {
  const secret = 'test-secret-with-at-least-24-characters';
  const timestamp = '1789885000';
  const rawBody = Buffer.from(JSON.stringify(transfer));
  const signature = `sha256=${crypto.createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex')}`;
  const headers = { 'x-sepay-timestamp': timestamp, 'x-sepay-signature': signature };
  assert.equal(verifySepaySignature(headers, rawBody, secret, Number(timestamp)), true);
  assert.equal(verifySepaySignature(headers, Buffer.from('{}'), secret, Number(timestamp)), false);
  assert.equal(verifySepaySignature(headers, rawBody, secret, Number(timestamp) + 301), false);
  assert.equal(verifySepaySignature({ ...headers, 'x-sepay-signature': 'sha256=bad' }, rawBody, secret, Number(timestamp)), false);
});

test('SePay từ chối ID và số tiền không hợp lệ', () => {
  assert.equal(normalizeTransfer({ ...transfer, transferAmount: -1 }), null);
  assert.equal(normalizeTransfer({ ...transfer, id: 0 }), null);
  assert.equal(normalizeTransfer(transfer).paymentCode, transfer.code);
});

const fakeClient = ({ order, duplicate = false }) => {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('INSERT INTO sepay_transactions')) return { rowCount: duplicate ? 0 : 1 };
      if (sql.includes('FROM orders WHERE')) return { rowCount: order ? 1 : 0, rows: order ? [order] : [] };
      if (sql.includes('FROM tickets')) return { rows: [{ id: 77 }] };
      return { rowCount: 1, rows: [] };
    },
  };
};

test('SePay chỉ phát hành vé khi đúng mã, tài khoản, số tiền và còn hạn', async () => {
  const oldAccount = process.env.BANK_ACCOUNT_NO;
  process.env.BANK_ACCOUNT_NO = transfer.accountNumber;
  try {
    const client = fakeClient({ order: { id: 5, user_id: 2, total_amount: 50000, status: 'PENDING', is_within_deadline: true } });
    const outcome = await processSepayTransfer(transfer, client);
    assert.equal(outcome.status, 'MATCHED');
    assert.equal(client.calls.some(({ sql }) => sql.includes("UPDATE orders SET status = 'SUCCESS'")), true);
    assert.equal(client.calls.some(({ sql }) => sql.includes('UPDATE tickets SET ticket_qr_code')), true);

    const wrongAmount = fakeClient({ order: { id: 5, total_amount: 60000, status: 'PENDING', is_within_deadline: true } });
    assert.equal((await processSepayTransfer(transfer, wrongAmount)).status, 'REVIEW_AMOUNT');
    assert.equal(wrongAmount.calls.some(({ sql }) => sql.includes("UPDATE orders SET status = 'SUCCESS'")), false);

    const late = fakeClient({ order: { id: 5, total_amount: 50000, status: 'PENDING', is_within_deadline: false } });
    assert.equal((await processSepayTransfer(transfer, late)).status, 'REVIEW_EXPIRED');

    const wrongAccount = fakeClient({});
    assert.equal((await processSepayTransfer({ ...transfer, accountNumber: '999999999' }, wrongAccount)).status, 'REVIEW_ACCOUNT');
    assert.equal(wrongAccount.calls.some(({ sql }) => sql.includes("UPDATE orders SET status = 'SUCCESS'")), false);

    const outgoing = fakeClient({});
    assert.equal((await processSepayTransfer({ ...transfer, transferType: 'out' }, outgoing)).status, 'IGNORED_OUTGOING');

    const replay = fakeClient({ duplicate: true });
    assert.equal((await processSepayTransfer(transfer, replay)).duplicate, true);
    assert.equal(replay.calls.some(({ sql }) => sql.includes("UPDATE orders SET status = 'SUCCESS'")), false);
  } finally {
    if (oldAccount === undefined) delete process.env.BANK_ACCOUNT_NO;
    else process.env.BANK_ACCOUNT_NO = oldAccount;
  }
});
