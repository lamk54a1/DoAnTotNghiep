const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getOrders,
  updateOrderStatus,
  bulkUpdateOrderStatus,
  getUsers,
  updateUserStatus,
  reviewUserIdentity,
  getAuditLogs,
  exportOrdersReport
} = require('../controllers/adminController');
const { isAdmin } = require('../middleware/authMiddleware');

router.use(isAdmin);
router.get('/stats', getDashboardStats);
router.get('/reports/orders.xlsx', exportOrdersReport);
router.get('/orders', getOrders);
router.patch('/orders/bulk/status', bulkUpdateOrderStatus);
router.patch('/orders/:id/status', updateOrderStatus);
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/identity', reviewUserIdentity);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
