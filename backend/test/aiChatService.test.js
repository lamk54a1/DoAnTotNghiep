const test = require('node:test');
const assert = require('node:assert/strict');
const { extractOutputText, redactSensitiveData, sanitizeHistory } = require('../services/aiChatService');

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
