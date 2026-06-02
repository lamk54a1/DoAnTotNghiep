const express = require('express');
const router = express.Router();
const { createOrder } = require('../controllers/orderController');

// Đường dẫn: POST /api/orders
// Dữ liệu gửi lên phải khớp với IOrder (userId, tickets[], totalAmount,...)
router.post('/', createOrder);

module.exports = router;