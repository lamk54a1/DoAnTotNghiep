const express = require('express');
const router = express.Router();

const { getTicketsByMatch, getSoldSeatsByMatch, getTicketInventoryByMatch, getPublicTicketInventoryByMatch, generateAllSeats, updatePaperTickets, getPaperTicketsByMatch, markPaperTicketsPrinted, scanTicket, holdSeats, releaseSeats } = require('../controllers/ticketController');
const { isAdmin, optionalAuth, verifyToken } = require('../middleware/authMiddleware');
const { createRateLimit } = require('../middleware/rateLimit');

const holdLimiter = createRateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: 'Bạn thao tác giữ ghế quá nhanh. Vui lòng thử lại sau.',
});

// API phục vụ sơ đồ ghế: GET /api/tickets/sold/:matchId
router.get('/sold/:matchId', getSoldSeatsByMatch);
router.get('/inventory/:matchId', getPublicTicketInventoryByMatch);
router.get('/admin/inventory/:matchId', isAdmin, getTicketInventoryByMatch);
router.get('/paper/:matchId', isAdmin, getPaperTicketsByMatch);

// Tuyến đường cho Admin khởi tạo vé (Dùng phương thức POST chuẩn chỉnh)
router.post('/generate/:matchId', isAdmin, generateAllSeats);
router.patch('/paper/:matchId', isAdmin, updatePaperTickets);
router.post('/paper/:matchId/print', isAdmin, markPaperTicketsPrinted);
router.post('/scan', isAdmin, scanTicket);

// Lấy toàn bộ vé công khai
router.post('/hold/:matchId', verifyToken, holdLimiter, holdSeats);
router.post('/release/:matchId', verifyToken, releaseSeats);
router.get('/:matchId', optionalAuth, getTicketsByMatch);

module.exports = router;
