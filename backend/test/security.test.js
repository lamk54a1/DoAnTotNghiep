const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET ||= 'test-secret-at-least-32-characters-long';

const { isTicketAdmissionAllowed } = require('../controllers/ticketController');
const { isStrongPassword, oauthStart, oauthCallback, oauthProviders } = require('../controllers/authController');
const { detectImageType } = require('../routes/uploadRoutes');
const { releaseExpiredOrders } = require('../utils/orderLifecycle');
const pool = require('../config/db');
const ExcelJS = require('exceljs');
const sharp = require('sharp');
const { removeLightEdgeBackground } = require('../utils/imageProcessing');

test.after(async () => {
  await pool.end();
});

test('chỉ vé online đã thanh toán thành công mới được vào sân', () => {
  assert.equal(isTicketAdmissionAllowed({ status: 'SOLD', orderStatus: 'PENDING' }), false);
  assert.equal(isTicketAdmissionAllowed({ status: 'SOLD', orderStatus: 'CANCELLED' }), false);
  assert.equal(isTicketAdmissionAllowed({ status: 'SOLD', orderStatus: 'SUCCESS' }), true);
  assert.equal(isTicketAdmissionAllowed({ status: 'PAPER_SOLD', orderStatus: null }), true);
});

test('mật khẩu đăng ký phải có ít nhất 8 ký tự, chữ và số', () => {
  assert.equal(isStrongPassword('short1'), false);
  assert.equal(isStrongPassword('onlyletters'), false);
  assert.equal(isStrongPassword('secure123'), true);
});

test('OAuth chỉ bật khi có cấu hình và ràng buộc state với cookie trình duyệt', async () => {
  const previous = { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET };
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
  const res = {
    cookie(name, value, options) { this.cookieData = { name, value, options }; },
    clearCookie(name, options) { this.cleared = { name, options }; },
    redirect(url) { this.redirectUrl = url; },
    json(body) { this.body = body; },
  };
  try {
    oauthProviders({}, res);
    assert.equal(res.body.google, true);
    oauthStart({ params: { provider: 'google' }, query: { mode: 'login' } }, res);
    const authUrl = new URL(res.redirectUrl);
    assert.equal(authUrl.searchParams.get('state'), res.cookieData.value);
    assert.equal(res.cookieData.options.httpOnly, true);
    assert.equal(res.cookieData.options.sameSite, 'lax');

    await oauthCallback({ params: { provider: 'google' }, query: { state: res.cookieData.value, code: 'fake' }, headers: {} }, res);
    assert.match(res.redirectUrl, /oauth_error=/);
    assert.ok(res.cleared);
  } finally {
    if (previous.id === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previous.id;
    if (previous.secret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = previous.secret;
  }
});

test('nhận diện ảnh dựa trên magic bytes thay vì tên file', () => {
  assert.deepEqual(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0x00])), { ext: '.jpg', mime: 'image/jpeg' });
  assert.equal(detectImageType(Buffer.from('<script>alert(1)</script>')), null);
});

test('chỉ tách nền sáng nối với mép ảnh và giữ vùng trắng bên trong logo', async () => {
  const width = 7;
  const height = 7;
  const pixels = Buffer.alloc(width * height * 4, 255);

  for (let y = 1; y <= 5; y += 1) {
    for (let x = 1; x <= 5; x += 1) {
      if (x === 1 || x === 5 || y === 1 || y === 5) {
        const offset = (y * width + x) * 4;
        pixels[offset] = 0;
        pixels[offset + 1] = 48;
        pixels[offset + 2] = 120;
      }
    }
  }

  const input = await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const output = await removeLightEdgeBackground(input);
  const { data } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  assert.equal(data[3], 0);
  assert.equal(data[((3 * width + 3) * 4) + 3], 255);
  assert.equal(data[((1 * width + 1) * 4) + 3], 255);
});

test('đơn hết hạn được hủy và vé được hoàn về kho', async () => {
  const calls = [];
  const db = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('SELECT id')) return { rowCount: 1, rows: [{ id: 42 }] };
      return { rowCount: 1, rows: [] };
    },
  };

  assert.equal(await releaseExpiredOrders(db), 1);
  assert.match(calls[1].sql, /SET status = 'AVAILABLE'/);
  assert.deepEqual(calls[1].params, [[42]]);
  assert.match(calls[2].sql, /SET status = 'CANCELLED'/);
});

test('ExcelJS vẫn tạo được workbook sau khi nâng UUID', async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Bao cao').addRow(['OK']);
  const output = await workbook.xlsx.writeBuffer();
  assert.ok(output.byteLength > 0);
});
