const express = require('express');
const router = express.Router();
const { createOrder, getPurchasedTicketCountByMatch, getMyOrders } = require('../controllers/orderController');
const { verifyToken } = require('../middleware/authMiddleware');

// Đường dẫn: POST /api/orders
// Dữ liệu gửi lên phải khớp với IOrder (userId, tickets[], totalAmount,...)
router.get('/my', verifyToken, getMyOrders);
router.get('/match/:matchId/count', verifyToken, getPurchasedTicketCountByMatch);
router.post('/', verifyToken, createOrder);

module.exports = router;
