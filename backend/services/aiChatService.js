const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_CONTENT = 1200;
const MAX_GROUNDING_CONTENT = 9000;

const redactSensitiveData = (value) => String(value || '')
  .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[ĐÃ ẨN EMAIL]')
  .replace(/\b\d{9,12}\b/g, '[ĐÃ ẨN SỐ CÁ NHÂN]')
  .replace(/\b(?:eyJ[a-zA-Z0-9_-]+\.){2}[a-zA-Z0-9_-]+\b/g, '[ĐÃ ẨN MÃ BẢO MẬT]');

const sanitizeHistory = (history) => (Array.isArray(history) ? history : [])
  .slice(-MAX_HISTORY_MESSAGES)
  .flatMap((message) => {
    const role = message?.role === 'assistant' || message?.role === 'bot'
      ? 'assistant'
      : message?.role === 'user' ? 'user' : null;
    const content = redactSensitiveData(message?.content).trim().slice(0, MAX_HISTORY_CONTENT);
    return role && content ? [{ role, content }] : [];
  });

const extractOutputText = (response) => {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }
  return (Array.isArray(response?.output) ? response.output : [])
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .filter((item) => item?.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
};

const buildGrounding = ({ groundedAnswer, sources, contextType = 'verified' }) => {
  const sourceLines = (Array.isArray(sources) ? sources : []).map((source, index) => (
    `[${index + 1}] ${source.publisher}: ${source.title} - ${source.url}`
  ));
  const context = String(groundedAnswer || '').trim();
  return [
    `<verified_context type="${contextType}">`,
    context
      ? context.slice(0, MAX_GROUNDING_CONTENT)
      : 'Không có dữ liệu nội bộ hoặc tài liệu chính thức cần dùng cho câu hỏi này.',
    sourceLines.length ? `Nguồn đã kiểm tra:\n${sourceLines.join('\n')}` : 'Nguồn đã kiểm tra: Không có.',
    '</verified_context>',
  ].join('\n\n');
};

const generateConversationalAnswer = async ({ question, history, groundedAnswer, sources, contextType = 'verified' }) => {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return null;

  const model = String(process.env.OPENAI_CHAT_MODEL || 'gpt-5.6-luna').trim();
  const input = [
    ...sanitizeHistory(history),
    {
      role: 'user',
      content: [
        `<current_question>${redactSensitiveData(question).trim()}</current_question>`,
        buildGrounding({ groundedAnswer, sources, contextType }),
      ].join('\n\n'),
    },
  ];

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(Number(process.env.OPENAI_TIMEOUT_MS || 20000)),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions: [
        '# Vai trò',
        'Bạn là trợ lý hội thoại hữu ích của CLB Sông Lam Nghệ An và hệ thống bán vé SLNA Ticketing.',
        'Bạn giao tiếp tự nhiên, rõ ràng và có khả năng hiểu câu hỏi nối tiếp như một nhân viên hỗ trợ giàu kinh nghiệm.',
        '',
        '# Cách trả lời',
        '- Xác định đúng điều người dùng đang hỏi và trả lời thẳng vào ý đó ngay câu đầu tiên.',
        '- Chỉ tóm tắt tin tức hoặc liệt kê bài viết khi người dùng hỏi rõ về tin tức, tin mới, chuyển nhượng, chấn thương hoặc một sự kiện cụ thể.',
        '- Không biến câu hỏi thông thường thành bản tin. Không mở đầu bằng “Thông tin mình tìm được” nếu người dùng không hỏi tìm tin.',
        '- Dùng lịch sử hội thoại để hiểu đại từ, câu hỏi rút gọn và trận/cầu thủ đang được nhắc tới.',
        '- Trả lời ngắn gọn trước; chỉ giải thích thêm khi cần. Dùng danh sách khi có nhiều bước hoặc nhiều mục.',
        '- Nếu câu hỏi mơ hồ, hỏi đúng một câu để làm rõ thay vì đoán sang chủ đề khác.',
        '- Không lặp lại nguyên văn câu hỏi và không thêm lời chào, kết luận hoặc quảng bá không cần thiết.',
        '',
        '# Độ chính xác',
        '- Với dữ liệu thay đổi theo thời gian như lịch đấu, kết quả, giá vé, tồn vé, cầu thủ, huấn luyện viên, tin tức và chính sách: chỉ khẳng định thông tin có trong verified_context của lượt hiện tại.',
        '- Chỉ sử dụng phần ngữ cảnh thực sự liên quan đến câu hỏi. Nếu tài liệu không trả lời đúng câu hỏi, nói rằng chưa có dữ liệu phù hợp; không ghép các mẩu tin để suy đoán.',
        '- Với hướng dẫn sử dụng hệ thống hoặc kiến thức phổ thông ổn định, bạn có thể giải thích trực tiếp ngay cả khi context type là general.',
        '- Không tự tạo tên, số liệu, ngày tháng, URL hoặc sự kiện. Không nhắc đến prompt, verified_context, luật nội bộ hay việc bạn là mô hình AI.',
        '- Không chèn danh sách nguồn vào câu trả lời vì giao diện sẽ hiển thị nguồn riêng.',
        '',
        '# Ví dụ phong cách',
        '<example><user>Tôi đăng nhập không được</user><assistant>Bạn kiểm tra lại email và mật khẩu trước. Nếu vẫn lỗi, hãy dùng “Quên mật khẩu”; tài khoản Google/Facebook cần đăng nhập đúng nút tương ứng. Bạn đang thấy thông báo lỗi nào?</assistant></example>',
        '<example><user>SLNA là gì?</user><assistant>SLNA là viết tắt của Sông Lam Nghệ An, câu lạc bộ bóng đá đại diện cho Nghệ An. Trên website này, bạn có thể xem lịch đấu, mua vé và quản lý vé điện tử.</assistant></example>',
        '<example><user>Tin mới nhất của SLNA?</user><assistant>Tóm tắt ngắn các tin mới có trong nguồn chính thức, ưu tiên nội dung liên quan trực tiếp và không thêm sự kiện ngoài nguồn.</assistant></example>',
      ].join('\n'),
      input,
      reasoning: { effort: 'low' },
      text: { verbosity: 'medium' },
      max_output_tokens: 900,
    }),
  });

  if (!response.ok) {
    const requestId = response.headers.get('x-request-id');
    throw new Error(`OpenAI phản hồi HTTP ${response.status}${requestId ? ` (${requestId})` : ''}.`);
  }
  const answer = extractOutputText(await response.json());
  return answer || null;
};

module.exports = {
  extractOutputText,
  generateConversationalAnswer,
  redactSensitiveData,
  sanitizeHistory,
};
