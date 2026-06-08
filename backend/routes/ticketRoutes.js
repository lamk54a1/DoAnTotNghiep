const express = require('express');
const router = express.Router();

const { getTicketsByMatch, getSoldSeatsByMatch, getTicketInventoryByMatch, generateAllSeats, updatePaperTickets, getPaperTicketsByMatch, scanTicket } = require('../controllers/ticketController');
const { isAdmin } = require('../middleware/authMiddleware');

// API phục vụ sơ đồ ghế: GET /api/tickets/sold/:matchId
router.get('/sold/:matchId', getSoldSeatsByMatch);
router.get('/inventory/:matchId', getTicketInventoryByMatch);
router.get('/paper/:matchId', isAdmin, getPaperTicketsByMatch);

// Tuyến đường cho Admin khởi tạo vé (Dùng phương thức POST chuẩn chỉnh)
router.post('/generate/:matchId', isAdmin, generateAllSeats);
router.patch('/paper/:matchId', isAdmin, updatePaperTickets);
router.post('/scan', isAdmin, scanTicket);

// Lấy toàn bộ vé công khai
router.get('/:matchId', getTicketsByMatch);

module.exports = router;
