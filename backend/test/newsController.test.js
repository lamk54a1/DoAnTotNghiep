const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePagination } = require('../controllers/newsController');

test('chuẩn hóa phân trang tin tức công khai', () => {
  assert.deepEqual(parsePagination({}), { page: 1, limit: 9, offset: 0 });
  assert.deepEqual(parsePagination({ page: '3', limit: '6' }), { page: 3, limit: 6, offset: 12 });
  assert.deepEqual(parsePagination({ page: '-4', limit: '100' }), { page: 1, limit: 20, offset: 0 });
});
