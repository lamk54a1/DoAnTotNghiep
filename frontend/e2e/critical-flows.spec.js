/* eslint-disable @typescript-eslint/no-require-imports */
const { test, expect, request } = require('@playwright/test');
const { createRequire } = require('node:module');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const requireFromBackend = createRequire(path.resolve(__dirname, '../../backend/package.json'));
const dotenv = requireFromBackend('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env.local'), override: true });
const { Pool } = requireFromBackend('pg');
const bcrypt = requireFromBackend('bcryptjs');
const sharp = requireFromBackend('sharp');

const API_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://127.0.0.1:3051';
const PASSWORD = 'Test12345';
const WEBHOOK_SECRET = 'e2e-sepay-secret-at-least-24-characters';
const ADMIN_EMAIL = 'e2e-root-admin@slna.test';
const USER_EMAIL = 'e2e-user@slna.test';
const USER_TWO_EMAIL = 'e2e-user-two@slna.test';
const IDENTITY_EMAIL = 'e2e-identity@slna.test';
const DUPLICATE_EMAIL = 'e2e-duplicate@slna.test';
const MATCH_NAME = 'E2E Test Opponent';

const db = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
});

const state = { userIds: [], orderIds: [], matchId: null, paidOrder: null, expiredOrder: null, uploadedPath: null };
const authStates = new Map();

const apiContext = async (storageState) => {
  const context = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Origin: FRONTEND_URL },
    storageState,
  });
  return {
    get: (url, options) => context.get(`/api${url}`, options),
    post: (url, options) => context.post(`/api${url}`, options),
    put: (url, options) => context.put(`/api${url}`, options),
    patch: (url, options) => context.patch(`/api${url}`, options),
    storageState: () => context.storageState(),
    dispose: () => context.dispose(),
  };
};

const loginContext = async (email) => {
  const key = String(email).trim().toLowerCase();
  if (authStates.has(key)) return apiContext(authStates.get(key));
  const context = await apiContext();
  const response = await context.post('/auth/login', { data: { email, password: PASSWORD } });
  expect(response.ok()).toBeTruthy();
  authStates.set(key, await context.storageState());
  return context;
};

const cleanup = async () => {
  const users = await db.query("SELECT id FROM users WHERE email = ANY($1::text[])", [[ADMIN_EMAIL, USER_EMAIL, USER_TWO_EMAIL, IDENTITY_EMAIL, DUPLICATE_EMAIL]]);
  const userIds = users.rows.map((row) => row.id);
  const orders = userIds.length
    ? await db.query('SELECT id FROM orders WHERE user_id = ANY($1::int[])', [userIds])
    : { rows: [] };
  const orderIds = orders.rows.map((row) => row.id);
  const matches = await db.query('SELECT id FROM matches WHERE opponent = $1', [MATCH_NAME]);
  const matchIds = matches.rows.map((row) => row.id);
  if (orderIds.length) {
    await db.query('DELETE FROM sepay_transactions WHERE order_id = ANY($1::int[])', [orderIds]);
  }
  await db.query("DELETE FROM sepay_transactions WHERE transaction_id BETWEEN 910000000 AND 919999999");
  if (matchIds.length) await db.query('DELETE FROM tickets WHERE match_id = ANY($1::int[])', [matchIds]);
  if (orderIds.length) await db.query('DELETE FROM orders WHERE id = ANY($1::int[])', [orderIds]);
  if (matchIds.length) await db.query('DELETE FROM matches WHERE id = ANY($1::int[])', [matchIds]);
  if (userIds.length) await db.query('DELETE FROM users WHERE id = ANY($1::int[])', [userIds]);
  if (state.uploadedPath) await fs.unlink(state.uploadedPath).catch(() => undefined);
};

test.describe.serial('Ma trận kiểm thử trọng yếu T01-T16', () => {
  test.beforeAll(async () => {
    await cleanup();
    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    const fixtureUsers = [
      [ADMIN_EMAIL, 'E2E Root Admin', '0900000001', 'ADMIN', '079000000001', 'VERIFIED'],
      [USER_EMAIL, 'E2E User', '0900000002', 'USER', '079000000002', 'VERIFIED'],
      [USER_TWO_EMAIL, 'E2E User Two', '0900000003', 'USER', '079000000003', 'VERIFIED'],
      [IDENTITY_EMAIL, 'E2E Identity', '0900000004', 'USER', null, 'NOT_SUBMITTED'],
      [DUPLICATE_EMAIL, 'E2E Duplicate', '0900000005', 'USER', null, 'NOT_SUBMITTED'],
    ];
    for (const [email, name, phone, role, cccd, cccdStatus] of fixtureUsers) {
      const result = await db.query(
        `INSERT INTO users (email, password, full_name, phone_number, address, role, status, cccd, cccd_status, profile_completed)
         VALUES ($1,$2,$3,$4,'Địa chỉ kiểm thử E2E',$5,'ACTIVE',$6,$7,true) RETURNING id`,
        [email, passwordHash, name, phone, role, cccd, cccdStatus]
      );
      state.userIds.push(result.rows[0].id);
    }
    const match = await db.query(
      `INSERT INTO matches (opponent, match_date, stadium, competition_name, status, ticket_price_min)
       VALUES ($1, NOW() + INTERVAL '7 days', 'Sân vận động Vinh', 'E2E League', 'ON_SALE', 100000) RETURNING id`,
      [MATCH_NAME]
    );
    state.matchId = match.rows[0].id;
    for (let seat = 1; seat <= 4; seat += 1) {
      await db.query(
        `INSERT INTO tickets (match_id, seat_code, sector, row, seat_number, price, status)
         VALUES ($1,$2,'A1','1',$3,100000,'AVAILABLE')`,
        [state.matchId, `A1-R1-S${seat}`, seat]
      );
    }
  });

  test.afterAll(async () => {
    await cleanup();
    await db.end();
  });

  test('T01 - đăng nhập sai bị từ chối, đăng nhập đúng tạo cookie phiên hợp lệ', async () => {
    const context = await apiContext();
    const wrong = await context.post('/auth/login', { data: { email: USER_EMAIL, password: 'SaiMatKhau123' } });
    expect(wrong.status()).toBe(400);
    expect((await wrong.json()).message).not.toMatch(/không tồn tại|sai mật khẩu/i);
    const correct = await context.post('/auth/login', { data: { email: USER_EMAIL, password: PASSWORD } });
    expect(correct.status()).toBe(200);
    expect(correct.headers()['set-cookie']).toContain('slna_session=');
    authStates.set(USER_EMAIL, await context.storageState());
    const profile = await context.get('/auth/profile');
    expect(profile.status()).toBe(200);
    expect((await profile.json()).email).toBe(USER_EMAIL);
    await context.dispose();
  });

  test('T02 - đổi email thiếu hoặc sai mật khẩu bị từ chối và email không đổi', async () => {
    const user = await loginContext(USER_EMAIL);
    for (const currentPassword of ['', 'SaiMatKhau123']) {
      const response = await user.put('/auth/email', { data: { email: 'changed-e2e@slna.test', currentPassword } });
      expect(response.status()).toBe(400);
    }
    const profile = await user.get('/auth/profile');
    expect((await profile.json()).email).toBe(USER_EMAIL);
    await user.dispose();
  });

  test('T03 - USER gọi endpoint quản trị nhận 403', async () => {
    const user = await loginContext(USER_EMAIL);
    const response = await user.get('/admin/stats');
    expect(response.status()).toBe(403);
    await user.dispose();
  });

  test('T04 - hai người giữ cùng ghế đồng thời, chỉ một người thành công', async () => {
    const first = await loginContext(USER_EMAIL);
    const second = await loginContext(USER_TWO_EMAIL);
    const responses = await Promise.all([
      first.post(`/tickets/hold/${state.matchId}`, { data: { seats: ['A1-R1-S1'] } }),
      second.post(`/tickets/hold/${state.matchId}`, { data: { seats: ['A1-R1-S1'] } }),
    ]);
    expect(responses.map((item) => item.status()).sort()).toEqual([200, 409]);
    await first.post(`/tickets/release/${state.matchId}`, { data: { seats: ['A1-R1-S1'] } });
    await second.post(`/tickets/release/${state.matchId}`, { data: { seats: ['A1-R1-S1'] } });
    await first.dispose();
    await second.dispose();
  });

  test('T05 - server bỏ qua tổng tiền client sửa và tự tính theo giá ghế', async () => {
    const user = await loginContext(USER_EMAIL);
    expect((await user.post(`/tickets/hold/${state.matchId}`, { data: { seats: ['A1-R1-S2'] } })).status()).toBe(200);
    const response = await user.post('/orders', {
      data: { matchId: state.matchId, tickets: ['A1-R1-S2'], paymentMethod: 'SEPAY', totalAmount: 1 },
    });
    expect(response.status()).toBe(201);
    state.paidOrder = await response.json();
    state.orderIds.push(state.paidOrder.id);
    expect(Number(state.paidOrder.totalAmount)).toBe(100000);
    await user.dispose();
  });

  test('T06 - webhook SePay khớp đơn đang chờ và chỉ xử lý một giao dịch', async () => {
    const context = await apiContext();
    const payload = JSON.stringify({
      id: 910000006,
      transferAmount: 100000,
      code: state.paidOrder.orderQrCode,
      accountNumber: String(process.env.BANK_ACCOUNT_NO),
      transferType: 'in',
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = `sha256=${crypto.createHmac('sha256', WEBHOOK_SECRET).update(timestamp).update('.').update(payload).digest('hex')}`;
    const response = await context.post('/payments/sepay/webhook', {
      data: payload,
      headers: { 'Content-Type': 'application/json', 'x-sepay-timestamp': timestamp, 'x-sepay-signature': signature },
    });
    expect(response.status()).toBe(200);
    const duplicate = await context.post('/payments/sepay/webhook', {
      data: payload,
      headers: { 'Content-Type': 'application/json', 'x-sepay-timestamp': timestamp, 'x-sepay-signature': signature },
    });
    expect(duplicate.status()).toBe(200);
    const count = await db.query('SELECT COUNT(*)::int AS count FROM sepay_transactions WHERE transaction_id = 910000006');
    expect(count.rows[0].count).toBe(1);
    await context.dispose();
  });

  test('T07 - đơn hết hạn chuyển CANCELLED và hoàn ghế về AVAILABLE', async () => {
    const user = await loginContext(USER_TWO_EMAIL);
    expect((await user.post(`/tickets/hold/${state.matchId}`, { data: { seats: ['A1-R1-S3'] } })).status()).toBe(200);
    const create = await user.post('/orders', { data: { matchId: state.matchId, tickets: ['A1-R1-S3'], paymentMethod: 'SEPAY' } });
    expect(create.status()).toBe(201);
    state.expiredOrder = await create.json();
    state.orderIds.push(state.expiredOrder.id);
    await db.query("UPDATE orders SET expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1", [state.expiredOrder.id]);
    expect((await user.get('/orders/my')).status()).toBe(200);
    const order = await db.query('SELECT status FROM orders WHERE id = $1', [state.expiredOrder.id]);
    const ticket = await db.query("SELECT status, order_id FROM tickets WHERE match_id = $1 AND seat_code = 'A1-R1-S3'", [state.matchId]);
    expect(order.rows[0].status).toBe('CANCELLED');
    expect(ticket.rows[0]).toMatchObject({ status: 'AVAILABLE', order_id: null });
    await user.dispose();
  });

  test('T08 - quét QR lần đầu thành công, lần hai bị từ chối', async () => {
    const ticket = await db.query("SELECT ticket_qr_code FROM tickets WHERE match_id = $1 AND seat_code = 'A1-R1-S2'", [state.matchId]);
    const qr = ticket.rows[0].ticket_qr_code;
    expect(qr).toBeTruthy();
    const admin = await loginContext(ADMIN_EMAIL);
    const first = await admin.post('/tickets/scan', { data: { ticketQrCode: qr, matchId: state.matchId } });
    const second = await admin.post('/tickets/scan', { data: { ticketQrCode: qr, matchId: state.matchId } });
    expect(first.status()).toBe(200);
    expect(second.status()).toBe(409);
    await admin.dispose();
  });

  test('T09 - file giả ảnh và file quá 5 MB đều bị từ chối', async () => {
    const admin = await loginContext(ADMIN_EMAIL);
    const fake = await admin.post('/uploads/team-logo', {
      multipart: { image: { name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not-an-image') } },
    });
    expect(fake.status()).toBe(400);
    const tooLarge = await admin.post('/uploads/team-logo', {
      multipart: { image: { name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) } },
    });
    expect(tooLarge.status()).toBe(413);
    await admin.dispose();
  });

  test('T10 - chatbot trả cấu trúc có kiểm soát và nguồn chỉ thuộc allowlist', async () => {
    const context = await apiContext();
    for (const question of ['SLNA là gì?', 'Tin mới nhất của SLNA là gì?']) {
      const response = await context.post('/chatbot/ask', { data: { question, history: [] } });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(typeof body.answer).toBe('string');
      expect(body.answer.length).toBeGreaterThan(10);
      for (const source of body.sources || []) {
        expect(new URL(source.url).hostname).toMatch(/(^|\.)(slnafc\.com|vpf\.vn)$/);
      }
    }
    await context.dispose();
  });

  test('T11 - webhook sai chữ ký bị từ chối và không ghi giao dịch', async () => {
    const context = await apiContext();
    const payload = JSON.stringify({ id: 910000011, transferAmount: 100000, code: state.paidOrder.orderQrCode, accountNumber: String(process.env.BANK_ACCOUNT_NO), transferType: 'in' });
    const response = await context.post('/payments/sepay/webhook', {
      data: payload,
      headers: { 'Content-Type': 'application/json', 'x-sepay-timestamp': String(Math.floor(Date.now() / 1000)), 'x-sepay-signature': `sha256=${'0'.repeat(64)}` },
    });
    expect(response.status()).toBe(401);
    const stored = await db.query('SELECT 1 FROM sepay_transactions WHERE transaction_id = 910000011');
    expect(stored.rowCount).toBe(0);
    await context.dispose();
  });

  test('T12 - thanh toán hợp lệ tạo order SUCCESS và QR vé duy nhất', async () => {
    const order = await db.query('SELECT status, transaction_id FROM orders WHERE id = $1', [state.paidOrder.id]);
    const tickets = await db.query('SELECT status, ticket_qr_code FROM tickets WHERE order_id = $1', [state.paidOrder.id]);
    expect(order.rows[0].status).toBe('SUCCESS');
    expect(order.rows[0].transaction_id).toBe('sepay:910000006');
    expect(tickets.rows).toHaveLength(1);
    expect(tickets.rows[0].status).toBe('SOLD');
    expect(tickets.rows[0].ticket_qr_code).toBeTruthy();
  });

  test('T13 - email quản trị viên gốc được nhận diện sau chuẩn hóa', async () => {
    const admin = await apiContext();
    const login = await admin.post('/auth/login', { data: { email: ADMIN_EMAIL.toUpperCase(), password: PASSWORD } });
    expect(login.status()).toBe(200);
    const response = await admin.get('/admin/capabilities');
    expect(response.status()).toBe(200);
    expect((await response.json()).canManageAdmins).toBe(true);
    await admin.dispose();
  });

  test('T14 - tách nền ngoài nhưng giữ vùng trắng nằm kín bên trong logo', async () => {
    const admin = await loginContext(ADMIN_EMAIL);
    const input = await sharp(Buffer.from(`<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" fill="white"/><rect x="8" y="8" width="24" height="24" fill="#003078"/><rect x="16" y="16" width="8" height="8" fill="white"/></svg>`)).png().toBuffer();
    const response = await admin.post('/uploads/team-logo', {
      multipart: { image: { name: 'logo.png', mimeType: 'image/png', buffer: input } },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    state.uploadedPath = path.resolve(__dirname, '../../backend', body.path.replace(/^\//, ''));
    const { data, info } = await sharp(state.uploadedPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3];
    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(20, 20)).toBe(255);
    await admin.dispose();
  });

  test('T15 - CCCD 12 số hợp lệ được xác minh tự động', async () => {
    const user = await loginContext(IDENTITY_EMAIL);
    const response = await user.put('/auth/identity', { data: { cccd: '079000000015', address: 'Địa chỉ hợp lệ từ CCCD' } });
    expect(response.status()).toBe(200);
    expect((await response.json()).user.cccdStatus).toBe('VERIFIED');
    await user.dispose();
  });

  test('T16 - CCCD sai độ dài hoặc đã được tài khoản khác sử dụng đều bị từ chối', async () => {
    const user = await loginContext(DUPLICATE_EMAIL);
    const invalid = await user.put('/auth/identity', { data: { cccd: '12345', address: 'Địa chỉ hợp lệ từ CCCD' } });
    expect(invalid.status()).toBe(400);
    const duplicate = await user.put('/auth/identity', { data: { cccd: '079000000015', address: 'Địa chỉ hợp lệ từ CCCD' } });
    expect(duplicate.status()).toBe(400);
    const profile = await user.get('/auth/profile');
    expect((await profile.json()).cccd).toBeFalsy();
    await user.dispose();
  });
});
