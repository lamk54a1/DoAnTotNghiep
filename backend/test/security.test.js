const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET ||= 'test-secret-at-least-32-characters-long';

const { isTicketAdmissionAllowed } = require('../controllers/ticketController');
const { isStrongPassword } = require('../controllers/authController');
const { detectImageType } = require('../routes/uploadRoutes');
const { releaseExpiredOrders } = require('../utils/orderLifecycle');
const pool = require('../config/db');
const ExcelJS = require('exceljs');

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

test('nhận diện ảnh dựa trên magic bytes thay vì tên file', () => {
  assert.deepEqual(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0x00])), { ext: '.jpg', mime: 'image/jpeg' });
  assert.equal(detectImageType(Buffer.from('<script>alert(1)</script>')), null);
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
