const test = require('node:test');
const assert = require('node:assert/strict');
const {
  extractOutputText,
  generateConversationalAnswer,
  redactSensitiveData,
  sanitizeHistory,
  toGeminiContents,
} = require('../services/aiChatService');
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

test('đọc nội dung văn bản từ phản hồi Gemini API', () => {
  const text = extractOutputText({
    candidates: [{ content: { parts: [{ text: 'Câu trả lời tự nhiên.' }] } }],
  });
  assert.equal(text, 'Câu trả lời tự nhiên.');
});

test('chuyển lịch sử hội thoại sang đúng vai trò của Gemini', () => {
  assert.deepEqual(toGeminiContents([
    { role: 'user', content: 'SLNA là gì?' },
    { role: 'assistant', content: 'Là câu lạc bộ bóng đá.' },
  ], 'Sân nhà ở đâu?'), [
    { role: 'user', parts: [{ text: 'SLNA là gì?' }] },
    { role: 'model', parts: [{ text: 'Là câu lạc bộ bóng đá.' }] },
    { role: 'user', parts: [{ text: 'Sân nhà ở đâu?' }] },
  ]);
});

test('gọi Gemini bằng khóa backend và không đưa khóa vào URL', async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_CHAT_MODEL;
  let request;
  process.env.GEMINI_API_KEY = 'gemini-test-key';
  process.env.GEMINI_CHAT_MODEL = 'gemini-test-model';
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Đã trả lời.' }] } }] }),
    };
  };

  try {
    const answer = await generateConversationalAnswer({
      question: 'SLNA là gì?',
      history: [],
      groundedAnswer: '',
      sources: [],
      contextType: 'general',
    });
    assert.equal(answer, 'Đã trả lời.');
    assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent');
    assert.equal(request.options.headers['x-goog-api-key'], 'gemini-test-key');
    assert.equal(request.url.includes('gemini-test-key'), false);
    const body = JSON.parse(request.options.body);
    assert.equal(body.contents.at(-1).role, 'user');
    assert.match(body.systemInstruction.parts[0].text, /trợ lý hội thoại hữu ích/);
  } finally {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.GEMINI_CHAT_MODEL;
    else process.env.GEMINI_CHAT_MODEL = originalModel;
  }
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
  }), 'SQUAD');
  assert.equal(classifyQuestion({ text: normalize('Giá vé khán đài A bao nhiêu?') }), 'TICKET_PRICE');
});
