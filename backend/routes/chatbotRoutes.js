const express = require('express');
const { askChatbot } = require('../controllers/chatbotController');
const { createRateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const chatbotLimiter = createRateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Bạn đang gửi câu hỏi quá nhanh. Vui lòng thử lại sau ít phút.',
});

router.post('/ask', chatbotLimiter, askChatbot);

module.exports = router;
