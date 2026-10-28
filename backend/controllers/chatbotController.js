const pool = require('../config/db');
const { generateConversationalAnswer } = require('../services/aiChatService');
const {
  SOURCES,
  getOfficialSquad,
  getLatestOfficialKnowledge,
  isAllowedUrl,
  searchOfficialKnowledge,
} = require('../services/officialNewsService');

const { normalize, isFollowUp, classifyQuestion, selectMatch } = require('../services/chatbotIntent');

const formatDateTime = (value) => new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
}).format(new Date(value));

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const withTimeout = async (promise, fallback, timeoutMs = 5000) => {
  let timer;
  try {
    return await Promise.race([promise, new Promise((resolve) => { timer = setTimeout(() => resolve(fallback), timeoutMs); })]);
  } finally {
    clearTimeout(timer);
  }
};

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

const getMatchByQuestion = async (question) => {
  const result = await withTimeout(pool.query(`
    SELECT id, opponent, match_date, stadium, competition_name, ticket_price_min,
           stand_prices, free_stands, status, home_score, away_score
    FROM matches
    ORDER BY match_date DESC
    LIMIT 50
  `), { rows: [] });
  return selectMatch(result.rows, question);
};

const getTicketInventory = async (matchId) => {
  const result = await withTimeout(pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available,
      COUNT(*) FILTER (WHERE status = 'HELD')::int AS held,
      COUNT(*) FILTER (WHERE status IN ('SOLD', 'PAPER_SOLD'))::int AS sold,
      COUNT(*) FILTER (WHERE status = 'PAPER_RESERVED')::int AS "paperReserved"
    FROM tickets
    WHERE match_id = $1
  `, [matchId]), { rows: [] });
  return result.rows[0] || { total: 0, available: 0, held: 0, sold: 0, paperReserved: 0 };
};

const answerSchedule = async () => {
  const matches = await getFeaturedMatches();
  if (matches.length === 0) return 'Hiện hệ thống chưa có lịch trận sắp tới.';
  return ['Các trận sắp tới của SLNA:', ...matches.map((m) => `- SLNA vs ${m.opponent}: ${formatDateTime(m.match_date)} tại ${m.stadium}. Trạng thái: ${m.status}.`)].join('\n');
};

const answerTicketPrice = async (selectedMatch = null) => {
  const match = selectedMatch || await getUpcomingMatch();
  if (!match) return 'Hiện chưa có trận đang/sắp mở bán nên chưa có giá vé.';
  const standPrices = match.stand_prices || {};
  if (!Object.keys(standPrices).length) return `Trận SLNA vs ${match.opponent} chưa có bảng giá khán đài để xác nhận. Bạn kiểm tra trang trận đấu hoặc liên hệ hỗ trợ.`;
  const freeStands = match.free_stands || [];
  return [
    `Giá vé trận SLNA vs ${match.opponent}:`,
    ...Object.entries(standPrices).map(([stand, price]) => `- Khán đài ${stand}: ${freeStands.includes(stand) ? 'Miễn phí' : formatMoney(price)}`),
    'Bạn có thể bấm “Mua vé” ở trang trận đấu để chọn ghế trực tiếp.',
  ].join('\n');
};

const answerTicketAvailability = async (selectedMatch = null) => {
  const match = selectedMatch || await getUpcomingMatch();
  if (!match) return 'Hiện chưa có trận sắp tới để kiểm tra số vé.';
  if (match.status !== 'ON_SALE') {
    return `Trận SLNA vs ${match.opponent} hiện có trạng thái ${match.status} và chưa mở bán vé trực tuyến.`;
  }
  const inventory = await getTicketInventory(match.id);
  if (inventory.total === 0) return `Kho vé trận SLNA vs ${match.opponent} chưa được khởi tạo.`;
  return [
    `Tình trạng vé trận SLNA vs ${match.opponent} lúc này:`,
    `- Còn bán online: ${inventory.available} vé.`,
    `- Đang được giữ: ${inventory.held} vé.`,
    `- Đã dành cho đơn online hoặc bán giấy: ${inventory.sold} vé (đơn online có thể còn chờ thanh toán).`,
    `- Đã dành cho vé giấy: ${inventory.paperReserved} vé.`,
    'Dữ liệu được tra trực tiếp từ kho vé tại thời điểm bạn hỏi.',
  ].join('\n');
};

const answerSpecificMatch = (match) => {
  const lines = [
    `Thông tin trận SLNA vs ${match.opponent}:`,
    `- Giải đấu: ${match.competition_name}.`,
    `- Thời gian: ${formatDateTime(match.match_date)}.`,
    `- Địa điểm: ${match.stadium}.`,
    `- Trạng thái: ${match.status}.`,
  ];
  if (match.status === 'FINISHED') lines.push(`- Kết quả: SLNA ${match.home_score ?? '-'} - ${match.away_score ?? '-'} ${match.opponent}.`);
  return lines.join('\n');
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

const answerAccount = (question = '') => {
  const text = normalize(question);
  if (/(quen|doi|dat lai).*mat khau/.test(text)) return 'Nếu quên mật khẩu, chọn “Quên mật khẩu” trên trang đăng nhập, nhập email đã đăng ký rồi mở liên kết trong email. Liên kết có hạn 15 phút và chỉ dùng một lần. Tài khoản Google/Facebook cần đăng nhập hoặc khôi phục qua nhà cung cấp tương ứng. Nếu muốn đổi mật khẩu khi đang đăng nhập, vào tài khoản và nhập mật khẩu hiện tại.';
  if (/dang nhap/.test(text)) return 'Bạn đăng nhập bằng email/mật khẩu hay Google/Facebook? Với email/mật khẩu, có thể dùng “Quên mật khẩu”. Bạn gửi nội dung thông báo lỗi để mình hướng dẫn đúng; không gửi mật khẩu hoặc mã xác thực.';
  return [
  'Bạn có thể cập nhật thông tin cá nhân trong mục tài khoản:',
  '- Cập nhật họ tên, số điện thoại, địa chỉ.',
  '- Đổi email cần tự nhập mật khẩu hiện tại để xác nhận; hệ thống không hiển thị hoặc điền sẵn mật khẩu.',
  '- Tài khoản Google/Facebook quản lý email và mật khẩu tại nhà cung cấp đăng nhập.',
    '- Upload mặt trước CCCD để hệ thống đọc mã QR và xác minh tự động trước khi mua vé.',
].join('\n');
};

const answerPayment = (question = '') => {
  if (/(da|roi)/.test(normalize(question)) && /(chua|khong).*(ve|xac nhan|thanh cong)/.test(normalize(question))) {
    return 'Mình chưa thể kiểm tra đơn cá nhân trong cuộc trò chuyện này. Bạn kiểm tra đã chuyển đúng số tiền và nội dung trên đơn, sau đó xem lại “Vé của tôi”. Nếu đã bị trừ tiền mà chưa có vé, liên hệ hỗ trợ để đối soát; không chuyển thêm tiền chỉ vì chưa thấy vé.';
  }
  return [
  'Ghế được giữ 10 phút khi chọn. Sau khi tạo đơn, bạn có 15 phút để thanh toán đơn đó.',
  '- Chuyển đúng số tiền và nội dung thanh toán hiển thị trên đơn.',
  '- QR vé chỉ được phát hành sau khi đơn được xác nhận thanh toán thành công.',
  '- Đơn quá hạn hoặc bị hủy sẽ tự trả ghế về kho vé.',
].join('\n');
};

const answerCccd = () => [
  'CCCD được dùng để xác minh người mua và áp dụng giới hạn tối đa 4 vé cho mỗi trận.',
  '- Vào Thông tin cá nhân để gửi số CCCD.',
  '- Chờ quản trị viên duyệt trước khi mua vé.',
  '- Một CCCD chỉ được liên kết với một tài khoản và bị khóa sau khi xác minh.',
].join('\n');

const answerPolicy = () => [
  'Một số lưu ý khi sử dụng vé:',
  '- Mỗi CCCD được mua tối đa 4 vé cho một trận.',
  '- Vé điện tử dùng mã QR và chỉ có giá trị một lần quét.',
  '- Không chia sẻ mã QR cho người khác.',
  '- Mình chưa có chính sách hoàn/hủy vé và giờ đóng cổng đã xác minh; bạn cần liên hệ ban tổ chức để xác nhận.',
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

const getSafeCitations = (documents) => documents.flatMap((document) => {
  const source = SOURCES.find((item) => item.publisher === document.publisher);
  if (!source || !isAllowedUrl(document.url, source)) return [];
  return [{
    title: document.title,
    url: document.url,
    publisher: document.publisher,
    publishedAt: document.publishedAt || null,
    fetchedAt: document.fetchedAt || null,
  }];
});

const answerFromOfficialDocuments = (documents) => {
  if (documents.length === 0) {
    return 'Mình chưa tìm thấy thông tin phù hợp trong các nguồn chính thức đã được đồng bộ. Mình sẽ không suy đoán khi chưa có nguồn xác minh.';
  }
  return [
    'Thông tin mình tìm được từ các nguồn chính thức:',
    ...documents.map((document) => {
      const fullExcerpt = String(document.summary || document.content || '').replace(/\s+/g, ' ').trim();
      const excerpt = fullExcerpt.length > 360
        ? `${fullExcerpt.slice(0, 360).replace(/\s+\S*$/, '')}…`
        : fullExcerpt;
      return `- ${document.title}${excerpt ? `: ${excerpt}` : ''}`;
    }),
    'Bạn có thể mở các nguồn bên dưới để kiểm tra nội dung đầy đủ.',
  ].join('\n');
};

const documentsForAi = (documents) => (Array.isArray(documents) ? documents : []).map((document) => [
  `Tiêu đề: ${document.title}`,
  `Nhà xuất bản: ${document.publisher}`,
  `URL: ${document.url}`,
  `Ngày đăng: ${document.publishedAt || 'Không rõ'}; lần đồng bộ: ${document.fetchedAt || 'Không rõ'}`,
  `Nội dung: ${String(document.content || document.summary || '').replace(/\s+/g, ' ').trim().slice(0, 2500)}`,
].join('\n')).join('\n\n');

const squadForAi = (squad) => squad.players.map((player) => [
  `Tên: ${player.name}`,
  `Số áo: ${player.number}`,
  `Vị trí: ${player.position}`,
  player.birthDate ? `Ngày sinh: ${player.birthDate}` : null,
  player.hometown ? `Quê quán: ${player.hometown}` : null,
  player.height ? `Chiều cao: ${player.height} cm` : null,
  player.weight ? `Cân nặng: ${player.weight} kg` : null,
].filter(Boolean).join('; ')).join('\n');

const answerFromOfficialSquad = (squad) => {
  if (!squad || squad.players.length === 0) {
    return 'Mình chưa đồng bộ được bảng cầu thủ chính thức của SLNA từ VPF hoặc trang CLB. Mình sẽ không tự ghép danh sách từ các bài tin rời rạc.';
  }
  const positions = ['Thủ môn', 'Hậu vệ', 'Tiền vệ', 'Tiền đạo'];
  const season = String(squad.title || '').match(/20\d{2}\/\d{2}/)?.[0];
  const sourceName = squad.publisher === 'VPF' ? 'trang đội bóng chính thức của VPF' : 'trang đội hình chính thức của SLNA';
  return [
    `Dưới đây là danh sách đầy đủ các cầu thủ SLNA theo ${sourceName}${season ? `, mùa giải ${season}` : ''}:`,
    ...positions.flatMap((position) => {
      const players = squad.players.filter((player) => normalize(player.position) === normalize(position));
      return players.length > 0
        ? [
          '',
          position,
          ...players.map((player) => {
            const birthYear = String(player.birthDate || '').match(/(?:19|20)\d{2}/)?.[0];
            const details = [birthYear, player.number ? `số áo ${player.number}` : null].filter(Boolean).join(' · ');
            return `• ${player.name}${details ? ` (${details})` : ''}`;
          }),
        ]
        : [];
    }),
    '',
    `Tổng cộng: ${squad.players.length} cầu thủ. Danh sách có thể thay đổi khi VPF cập nhật đăng ký; bạn có thể mở nguồn chính thức bên dưới để kiểm tra.`,
  ].join('\n');
};

const askChatbot = async (req, res) => {
  const question = String(req.body?.question || '').trim();
  if (!question) return res.status(400).json({ message: 'Vui lòng nhập câu hỏi.' });
  if (question.length > 500) return res.status(400).json({ message: 'Câu hỏi không được dài quá 500 ký tự.' });

  const text = normalize(question);
  const recentHistory = (Array.isArray(req.body?.history) ? req.body.history : []).slice(-4);
  const rawHistoryText = recentHistory
    .filter((message) => message?.role === 'user')
    .slice(-1)
    .map((message) => String(message?.content || '').slice(0, 1200))
    .join(' ');
  const historyText = normalize(rawHistoryText);
  try {
    let answer;
    let sources = [];
    let aiGrounding = '';
    let contextType = 'verified';
    const preliminaryIntent = classifyQuestion({ text, historyText });
    const needsMatch = ['TICKET_PRICE', 'TICKET_AVAILABILITY', 'SCHEDULE', 'RESULTS', 'GENERAL'].includes(preliminaryIntent);
    const selectedMatch = needsMatch ? await getMatchByQuestion(question)
      || (isFollowUp(text) ? await getMatchByQuestion(rawHistoryText) : null) : null;
    const intent = classifyQuestion({ text, historyText, hasSelectedMatch: Boolean(selectedMatch) });

    if (intent === 'TICKET_AVAILABILITY') answer = await answerTicketAvailability(selectedMatch);
    else if (intent === 'TICKET_PRICE') answer = await answerTicketPrice(selectedMatch);
    else if (intent === 'SPECIFIC_MATCH') answer = answerSpecificMatch(selectedMatch);
    else if (intent === 'SCHEDULE') answer = await answerSchedule();
    else if (intent === 'RESULTS') answer = await answerResults();
    else if (intent === 'PAYMENT') answer = answerPayment(question);
    else if (intent === 'BUY_TICKET') answer = await answerBuyTicket();
    else if (intent === 'MY_TICKETS') answer = answerMyTickets();
    else if (intent === 'STADIUM') answer = await answerStadium();
    else if (intent === 'SPONSORS') answer = await answerSponsors();
    else if (intent === 'CCCD') answer = answerCccd();
    else if (intent === 'ACCOUNT') answer = answerAccount(question);
    else if (intent === 'POLICY') answer = answerPolicy();
    else if (intent === 'CONTACT') answer = answerContact();
    else if (intent === 'SQUAD') {
      const squad = await getOfficialSquad();
      answer = answerFromOfficialSquad(squad);
      sources = squad ? getSafeCitations([squad]) : [];
      if (squad) aiGrounding = squadForAi(squad);
      contextType = 'official';
    } else if (intent === 'LATEST_NEWS') {
      const preferredSource = /(slna|song lam)/.test(text) ? 'SLNAFC' : /(vleague|v-league|vpf)/.test(text) ? 'VPF' : null;
      const documents = await getLatestOfficialKnowledge(3, preferredSource);
      answer = answerFromOfficialDocuments(documents);
      sources = getSafeCitations(documents);
      aiGrounding = documentsForAi(documents);
      contextType = 'official';
    } else if (intent === 'OFFICIAL_SEARCH') {
      const preferredSource = /(slna|song lam|clb)/.test(text) ? 'SLNAFC' : /(vleague|v-league|vpf)/.test(text) ? 'VPF' : null;
      const documents = await searchOfficialKnowledge(question, 3, preferredSource);
      answer = answerFromOfficialDocuments(documents);
      sources = getSafeCitations(documents);
      aiGrounding = documentsForAi(documents);
      contextType = 'official';
    } else {
      answer = fallbackAnswer();
      contextType = 'general';
    }

    // Keep transactional facts deterministic; the model must not invent policy, prices or order status.
    // A squad list must stay complete and byte-for-byte grounded in the parsed official table.
    // Sending it through a language model risks omissions, renaming or invented players.
    const needsAi = ['GENERAL', 'LATEST_NEWS', 'OFFICIAL_SEARCH'].includes(intent);
    try {
      const conversationalAnswer = needsAi && (contextType === 'general' || sources.length > 0)
        ? await generateConversationalAnswer({
        question,
        history: isFollowUp(text) ? recentHistory : [],
        groundedAnswer: contextType === 'general' ? '' : aiGrounding || answer,
        sources,
        contextType,
      }) : null;
      if (conversationalAnswer) answer = conversationalAnswer;
    } catch (aiError) {
      console.error('Không thể tạo câu trả lời hội thoại, dùng phương án dự phòng:', aiError.message);
    }

    res.json({
      answer,
      sources,
      suggestions: ['Trận sắp tới khi nào?', 'Còn bao nhiêu vé?', 'Giá từng khán đài?', 'Thanh toán vé thế nào?'],
    });
  } catch (err) {
    res.status(500).json({ message: 'Chatbot chưa thể trả lời lúc này. Vui lòng thử lại sau.' });
  }
};

module.exports = { askChatbot, answerFromOfficialSquad, classifyQuestion, normalize };
