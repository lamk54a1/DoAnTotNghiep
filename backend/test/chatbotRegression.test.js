const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyQuestion, normalize, selectMatch, isFollowUp } = require('../services/chatbotIntent');
const { buildKnowledgeQuery } = require('../services/officialNewsService');
const { askChatbot, answerFromOfficialSquad } = require('../controllers/chatbotController');
const pool = require('../config/db');

test.after(() => pool.end());

for (const [question, expected] of [
  ['Tôi muốn đổi mật khẩu', 'ACCOUNT'],
  ['Tôi đăng nhập không được', 'ACCOUNT'],
  ['Cầu thủ nào mới chuyển nhượng?', 'OFFICIAL_SEARCH'],
  ['Cầu thủ nào bị chấn thương?', 'OFFICIAL_SEARCH'],
  ['Huấn luyện viên mới nhất là ai?', 'OFFICIAL_SEARCH'],
  ['Tin mới nhất của SLNA?', 'LATEST_NEWS'],
  ['Đội hình gồm những ai?', 'SQUAD'],
  ['Cầu thủ trẻ nhất bao nhiêu tuổi?', 'SQUAD'],
  ['Tôi đã chuyển khoản mà chưa có vé', 'PAYMENT'],
  ['Hoàn tiền vé thế nào?', 'POLICY'],
  ['Giá vé khán đài A bao nhiêu?', 'TICKET_PRICE'],
  ['Nhà tài trợ là ai?', 'SPONSORS'],
]) {
  test(`không để trận/lịch sử cũ lấn câu hỏi: ${question}`, () => {
    assert.equal(classifyQuestion({ text: normalize(question), historyText: 'doi hinh cau thu tran slna gap ha noi', hasSelectedMatch: true }), expected);
  });
}

test('chỉ nối lịch sử cho câu hỏi nối tiếp rõ ràng', () => {
  assert.equal(isFollowUp(normalize('Trận đó ở đâu?')), true);
  assert.equal(isFollowUp(normalize('Tôi muốn đổi mật khẩu')), false);
  assert.equal(classifyQuestion({ text: 'anh ay bao nhieu tuoi', historyText: 'cau thu so 7' }), 'SQUAD');
});

test('chọn trận đúng đối thủ và mục đích thay vì thứ tự mảng', () => {
  const matches = [
    { id: 1, opponent: 'Hà Nội', status: 'FINISHED', match_date: '2020-01-01' },
    { id: 2, opponent: 'Hà Nội', status: 'ON_SALE', match_date: '2090-01-01' },
    { id: 3, opponent: 'Hà Nội', status: 'ON_SALE', match_date: '2091-01-01' },
  ];
  assert.equal(selectMatch(matches, 'Giá vé trận Hà Nội?').id, 2);
  assert.equal(selectMatch(matches, 'Kết quả trận Hà Nội?').id, 1);
  assert.equal(selectMatch(matches, 'Trận Hà Nội năm 2091?').id, 3);
  assert.equal(selectMatch(matches, 'Trận khác?'), null);
  assert.equal(selectMatch(matches, 'Hà Nội năm 2021?'), null);
});

test('tìm kiếm không dùng OR và loại bỏ từ đệm có dấu', () => {
  assert.equal(buildKnowledgeQuery('Cho tôi biết tình hình chấn thương của SLNA'), 'chấn & thương & slna');
  assert.equal(buildKnowledgeQuery('Cầu thủ nào mới chuyển nhượng SLNA?'), 'chuyển & nhượng & slna');
  assert.equal(buildKnowledgeQuery('cho tôi biết'), '');
});

test('danh sách cầu thủ từ VPF được giữ đầy đủ, phân nhóm và không cần Gemini viết lại', () => {
  const answer = answerFromOfficialSquad({
    publisher: 'VPF',
    title: 'Danh sách cầu thủ Sông Lam Nghệ An mùa giải 2026/27 - VPF',
    players: [
      { name: 'Cao Văn Bình', position: 'Thủ môn', number: '1', birthDate: '08-01-2005' },
      { name: 'Cittadini Roberto', position: 'Hậu vệ', number: '2', birthDate: '05/04/2005' },
      { name: 'Onoja Joseph', position: 'Tiền vệ', number: '5', birthDate: '06-11-1998' },
      { name: 'Phan Xuân Đại', position: 'Tiền đạo', number: '21', birthDate: '01-01-2003' },
    ],
  });
  assert.match(answer, /trang đội bóng chính thức của VPF, mùa giải 2026\/27/);
  assert.match(answer, /Thủ môn\n• Cao Văn Bình \(2005 · số áo 1\)/);
  assert.match(answer, /Hậu vệ\n• Cittadini Roberto/);
  assert.match(answer, /Tiền vệ\n• Onoja Joseph/);
  assert.match(answer, /Tiền đạo\n• Phan Xuân Đại/);
  assert.match(answer, /Tổng cộng: 4 cầu thủ/);
});

test('câu trả lời nghiệp vụ không gọi Gemini và không bịa giá khi thiếu bảng giá', async () => {
  const oldQuery = pool.query;
  const oldFetch = global.fetch;
  const oldKey = process.env.GEMINI_API_KEY;
  let calls = 0;
  process.env.GEMINI_API_KEY = 'test-only';
  global.fetch = async () => { calls++; throw new Error('Unexpected AI request'); };
  pool.query = async () => ({ rows: [{ id: 1, opponent: 'Hà Nội', status: 'ON_SALE', match_date: '2090-01-01', stand_prices: null }] });
  const ask = async (question) => {
    const res = { json(body) { this.body = body; }, status(code) { this.code = code; return this; } };
    await askChatbot({ body: { question, history: [{ role: 'user', content: 'Trận Hà Nội thế nào?' }] } }, res);
    assert.equal(res.code, undefined);
    return res.body.answer;
  };
  try {
    pool.query = async () => { throw new Error('Database unavailable'); };
    assert.match(await ask('Tôi muốn đổi mật khẩu'), /Quên mật khẩu/);
    assert.match(await ask('Thanh toán thế nào?'), /10 phút.*15 phút/s);
    pool.query = async () => ({ rows: [{ id: 1, opponent: 'Hà Nội', status: 'ON_SALE', match_date: '2090-01-01', stand_prices: null }] });
    assert.match(await ask('Giá vé Hà Nội bao nhiêu?'), /chưa có bảng giá/);
    assert.match(await ask('Tôi đã chuyển khoản mà chưa có vé'), /không chuyển thêm tiền/);
    pool.query = async () => ({ rows: [] });
    assert.match(await ask('Cầu thủ nào mới chuyển nhượng SLNA?'), /chưa tìm thấy/);
    assert.equal(calls, 0);
  } finally {
    pool.query = oldQuery;
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldKey;
  }
});
