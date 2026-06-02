const express = require('express');
const router = express.Router();
// Đổi cách require thành destructuring để lấy đúng tên các hàm trong controller
const { getMatches, getMatchById, createMatch, updateMatch } = require('../controllers/matchController');
const { isAdmin } = require('../middleware/authMiddleware');

// USER & ADMIN đều xem được lịch thi đấu
router.get('/', getMatches);
router.get('/:id', getMatchById);

// CÁC CHỨC NĂNG CHỈ ADMIN MỚI ĐƯỢC LÀM (Có Middleware isAdmin bảo vệ)
router.post('/', isAdmin, createMatch);       // Tạo trận đấu mới
router.put('/:id', isAdmin, updateMatch);     // Sửa trận đấu / Cập nhật tỷ số

module.exports = router;