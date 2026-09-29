const test = require('node:test');
const assert = require('node:assert/strict');
const { extractOutputText, redactSensitiveData, sanitizeHistory } = require('../services/aiChatService');
const { classifyQuestion, normalize } = require('../controllers/chatbotController');

test('chỉ giữ lịch sử hội thoại hợp lệ và giới hạn độ dài', () => {
  const history = sanitizeHistory([
    { role: 'system', content: 'không được phép' },
    { role: 'user', content: 'Cầu thủ SLNA gồm những ai?' },
    { role: 'bot', content: 'Đây là danh sách cầu thủ.' },
  ]);
  assert.deepEqual(history, [
    { role: 'user', content: 'Cầu thủ SLNA gồm những ai?' },
    { role: 'assistant', content: 'Đây là danh sách cầu thủ.' },
  ]);
});

test('đọc nội dung văn bản từ phản hồi Responses API', () => {
  const text = extractOutputText({
    output: [{ content: [{ type: 'output_text', text: 'Câu trả lời tự nhiên.' }] }],
  });
  assert.equal(text, 'Câu trả lời tự nhiên.');
});

test('ẩn email và chuỗi số cá nhân trước khi gửi sang dịch vụ AI', () => {
  assert.equal(
    redactSensitiveData('Email a@example.com, CCCD 012345678901'),
    'Email [ĐÃ ẨN EMAIL], CCCD [ĐÃ ẨN SỐ CÁ NHÂN]'
  );
});

test('không biến câu hỏi chung về SLNA thành truy vấn tin tức', () => {
  assert.equal(classifyQuestion({ text: normalize('SLNA là gì?') }), 'GENERAL');
  assert.equal(classifyQuestion({ text: normalize('Chào bạn, bạn làm được gì?') }), 'GENERAL');
});

test('chỉ tìm tin khi người dùng thực sự hỏi tin hoặc chủ đề thời sự', () => {
  assert.equal(classifyQuestion({ text: normalize('Tin mới nhất của SLNA là gì?') }), 'LATEST_NEWS');
  assert.equal(classifyQuestion({ text: normalize('Tình hình chấn thương của đội?') }), 'OFFICIAL_SEARCH');
});

test('câu hỏi tuổi cầu thủ không bị hiểu nhầm thành hỏi giá vé', () => {
  assert.equal(classifyQuestion({
    text: normalize('Cầu thủ trẻ nhất bao nhiêu tuổi?'),
    historyText: normalize('Cho tôi xem đội hình SLNA'),
  }), 'SQUAD');
  assert.equal(classifyQuestion({ text: normalize('Giá vé khán đài A bao nhiêu?') }), 'TICKET_PRICE');
});
