const express = require('express');
const router = express.Router();

const { getTicketsByMatch, getSoldSeatsByMatch, generateAllSeats } = require('../controllers/ticketController');
const { isAdmin } = require('../middleware/authMiddleware');

// API phục vụ sơ đồ ghế: GET /api/tickets/sold/:matchId
router.get('/sold/:matchId', getSoldSeatsByMatch);

// Tuyến đường cho Admin khởi tạo vé (Dùng phương thức POST chuẩn chỉnh)
router.post('/generate/:matchId', isAdmin, generateAllSeats);

// Lấy toàn bộ vé công khai
router.get('/:matchId', getTicketsByMatch);

module.exports = router;
