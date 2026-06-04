const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getOrders,
  updateOrderStatus,
  getUsers,
  updateUserStatus
} = require('../controllers/adminController');
const { isAdmin } = require('../middleware/authMiddleware');

router.use(isAdmin);
router.get('/stats', getDashboardStats);
router.get('/orders', getOrders);
router.patch('/orders/:id/status', updateOrderStatus);
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);

module.exports = router;
