const test = require('node:test');
const assert = require('node:assert/strict');
const { combineDashboardSales } = require('../controllers/adminController');

test('dashboard cộng doanh thu và số vé giấy vào tổng bán hàng', () => {
  assert.deepEqual(combineDashboardSales({
    onlineRevenue: '420000',
    paperRevenue: '80000',
    onlineTicketsSold: '4',
    paperTicketsSold: '2',
  }), {
    totalRevenue: 500000,
    onlineRevenue: 420000,
    paperRevenue: 80000,
    totalTicketsSold: 6,
    onlineTicketsSold: 4,
    paperTicketsSold: 2,
  });
});
