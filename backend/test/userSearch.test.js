const test = require('node:test');
const assert = require('node:assert/strict');
const { buildUserFilters } = require('../controllers/adminController');

test('lọc người dùng theo tên hoặc số điện thoại và vai trò bằng tham số SQL', () => {
  assert.deepEqual(buildUserFilters({ search: 'Nguyễn Văn', role: 'scanner' }), {
    whereClause: 'WHERE (full_name ILIKE $1 OR phone_number ILIKE $1) AND role = $2',
    params: ['%Nguyễn Văn%', 'SCANNER'],
  });
});

test('từ chối vai trò tìm kiếm không hợp lệ', () => {
  assert.throws(() => buildUserFilters({ role: 'SUPER_ADMIN' }), /không hợp lệ/);
});
