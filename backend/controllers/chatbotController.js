const pool = require('../config/db');

const normalize = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd');

const formatDateTime = (value) => new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
}).format(new Date(value));

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const withTimeout = (promise, fallback, timeoutMs = 5000) => Promise.race([
  promise,
  new Promise((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
]);

const getUpcomingMatch = async () => {
  const result = await withTimeout(pool.query(`
    SELECT id, opponent, match_date, stadium, competition_name, ticket_price_min,
           stand_prices, free_stands, status
    FROM matches
    WHERE status <> 'FINISHED' AND match_date >= NOW()
    ORDER BY match_date ASC
    LIMIT 1
  `), { rows: [] });
  return result.rows[0] || null;
};

const getFeaturedMatches = async () => {
  const result = await withTimeout(pool.query(`
    SELECT id, opponent, match_date, stadium, competition_name, ticket_price_min, status
    FROM matches
    WHERE status <> 'FINISHED' AND match_date >= NOW()
    ORDER BY match_date ASC
    LIMIT 5
  `), { rows: [] });
  return result.rows;
};

const answerSchedule = async () => {
  const matches = await getFeaturedMatches();
  if (matches.length === 0) return 'Hiện hệ thống chưa có lịch trận sắp tới.';
  return ['Các trận sắp tới của SLNA:', ...matches.map((m) => `- SLNA vs ${m.opponent}: ${formatDateTime(m.match_date)} tại ${m.stadium}. Trạng thái: ${m.status}.`)].join('\n');
};

const answerTicketPrice = async () => {
  const match = await getUpcomingMatch();
  if (!match) return 'Hiện chưa có trận đang/sắp mở bán nên chưa có giá vé.';
  const standPrices = { A: 100000, B: 50000, C: 20000, D: 20000, ...(match.stand_prices || {}) };
  const freeStands = match.free_stands || [];
  return [
    `Giá vé trận SLNA vs ${match.opponent}:`,
    ...Object.entries(standPrices).map(([stand, price]) => `- Khán đài ${stand}: ${freeStands.includes(stand) ? 'Miễn phí' : formatMoney(price)}`),
    'Bạn có thể bấm “Mua vé” ở trang trận đấu để chọn ghế trực tiếp.',
  ].join('\n');
};

const answerBuyTicket = async () => {
  const match = await getUpcomingMatch();
  if (!match) return 'Hiện chưa có trận mở bán. Khi có trận mới, bạn vào Lịch thi đấu và bấm “Mua vé” để chọn ghế.';
  return [
    `Trận gần nhất: SLNA vs ${match.opponent}, ${formatDateTime(match.match_date)}.`,
    'Cách mua vé: đăng nhập tài khoản, xác minh CCCD, vào trang trận đấu, chọn ghế, thanh toán và nhận QR trong mục “Vé của tôi”.',
    'Mỗi tài khoản/CCCD được mua tối đa 4 vé cho một trận.',
  ].join('\n');
};

const answerStadium = async () => {
  const match = await getUpcomingMatch();
  return match
    ? `Trận gần nhất diễn ra tại ${match.stadium}. Địa chỉ CLB: Số 6 đường Đào Tấn, Phường Thành Vinh, Tỉnh Nghệ An.`
    : 'Sân nhà của CLB là Sân vận động Vinh. Địa chỉ CLB: Số 6 đường Đào Tấn, Phường Thành Vinh, Tỉnh Nghệ An.';
};

const answerSponsors = async () => {
  const result = await withTimeout(pool.query(`
    SELECT name, level
    FROM sponsors
    WHERE is_active = true
    ORDER BY CASE level WHEN 'DIAMOND' THEN 1 WHEN 'GOLD' THEN 2 WHEN 'SILVER' THEN 3 ELSE 4 END, sort_order ASC, id ASC
    LIMIT 12
  `), { rows: [] });
  if (result.rows.length === 0) return 'Hiện chưa có nhà tài trợ được hiển thị trên hệ thống.';
  return ['Một số nhà tài trợ đang hiển thị:', ...result.rows.map((s) => `- ${s.name} (${s.level})`), 'Bạn có thể xem logo và truy cập website nhà tài trợ ở trang chủ.'].join('\n');
};

const answerMyTickets = () => [
  'Bạn xem vé đã mua tại mục “Vé của tôi” trên thanh menu.',
  'Mỗi vé có mã QR riêng để soát vé. Không chia sẻ QR cho người khác để tránh bị quét trước.',
  'Nếu không thấy vé, hãy kiểm tra trạng thái đơn hàng hoặc đăng nhập lại đúng tài khoản đã mua.',
].join('\n');

const answerAccount = () => [
  'Bạn có thể cập nhật thông tin cá nhân trong mục tài khoản:',
  '- Cập nhật họ tên, số điện thoại, địa chỉ.',
  '- Đổi email, đổi mật khẩu.',
  '- Gửi CCCD để admin duyệt trước khi mua vé.',
].join('\n');

const answerPolicy = () => [
  'Một số lưu ý khi sử dụng vé:',
  '- Mỗi CCCD được mua tối đa 4 vé cho một trận.',
  '- Vé điện tử dùng mã QR và chỉ có giá trị một lần quét.',
  '- Không chia sẻ mã QR cho người khác.',
  '- Cổng có thể đóng đón khán giả sau 15 phút kể từ khi trận đấu bắt đầu.',
].join('\n');

const answerContact = () => [
  'Thông tin CLB Sông Lam Nghệ An:',
  'Công ty Cổ phần Thể thao Sông Lam Nghệ An',
  'MST: 2902103060',
  'Địa chỉ: Số 6 đường Đào Tấn, Phường Thành Vinh, Tỉnh Nghệ An, Việt Nam.',
].join('\n');

const answerResults = async () => {
  const result = await withTimeout(pool.query(`
    SELECT opponent, match_date, home_score, away_score
    FROM matches
    WHERE status = 'FINISHED'
    ORDER BY match_date DESC
    LIMIT 5
  `), { rows: [] });
  if (result.rows.length === 0) return 'Hiện hệ thống chưa có kết quả trận đấu nào.';
  return ['Kết quả gần đây:', ...result.rows.map((m) => `- SLNA ${m.home_score ?? '-'} - ${m.away_score ?? '-'} ${m.opponent}, ${formatDateTime(m.match_date)}.`)].join('\n');
};

const fallbackAnswer = () => [
  'Mình có thể hỗ trợ các thông tin về SLNA Ticketing như:',
  '- Lịch thi đấu và kết quả.',
  '- Giá vé, cách mua vé, giới hạn 4 vé/CCCD.',
  '- Sân vận động, thông tin CLB.',
  '- Vé của tôi, QR vé, tài khoản và CCCD.',
  '- Nhà tài trợ.',
  'Bạn hãy hỏi ví dụ: “Trận sắp tới khi nào?”, “Giá vé bao nhiêu?”, “Xem vé ở đâu?”.',
].join('\n');

const askChatbot = async (req, res) => {
  const question = String(req.body?.question || '').trim();
  if (!question) return res.status(400).json({ message: 'Vui lòng nhập câu hỏi.' });

  const text = normalize(question);
  try {
    let answer;
    if (/(lich|tran sap|sap toi|khi nao|doi nao|thi dau)/.test(text)) answer = await answerSchedule();
    else if (/(ket qua|ti so|ty so|da dau|thang|thua|hoa)/.test(text)) answer = await answerResults();
    else if (/(gia|bao nhieu|khan dai|ve bao)/.test(text)) answer = await answerTicketPrice();
    else if (/(mua ve|dat ve|chon ghe|thanh toan|qr)/.test(text)) answer = await answerBuyTicket();
    else if (/(ve cua toi|ve da mua|ma qr|qr ve|in pdf)/.test(text)) answer = answerMyTickets();
    else if (/(san|dia chi|vinh|o dau)/.test(text)) answer = await answerStadium();
    else if (/(nha tai tro|tai tro|sponsor|doi tac)/.test(text)) answer = await answerSponsors();
    else if (/(tai khoan|dang nhap|mat khau|email|cccd|can cuoc|thong tin ca nhan)/.test(text)) answer = answerAccount();
    else if (/(chinh sach|quy dinh|gioi han|hoan|huy|luu y)/.test(text)) answer = answerPolicy();
    else if (/(lien he|cong ty|mst|ma so thue|hotline)/.test(text)) answer = answerContact();
    else answer = fallbackAnswer();

    res.json({
      answer,
      suggestions: ['Trận sắp tới khi nào?', 'Giá vé bao nhiêu?', 'Tôi mua vé như thế nào?', 'Nhà tài trợ gồm những ai?'],
    });
  } catch (err) {
    res.status(500).json({ message: 'Chatbot chưa thể trả lời lúc này. Vui lòng thử lại sau.' });
  }
};

module.exports = { askChatbot };
