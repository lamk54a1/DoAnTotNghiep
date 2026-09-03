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

const buildGrounding = ({ groundedAnswer, sources }) => {
  const sourceLines = (Array.isArray(sources) ? sources : []).map((source, index) => (
    `[${index + 1}] ${source.publisher}: ${source.title} - ${source.url}`
  ));
  return [
    'DỮ LIỆU ĐÃ XÁC MINH CHO CÂU HỎI HIỆN TẠI:',
    String(groundedAnswer || 'Không có dữ liệu phù hợp.').slice(0, MAX_GROUNDING_CONTENT),
    sourceLines.length ? `NGUỒN ĐÃ KIỂM TRA:\n${sourceLines.join('\n')}` : 'NGUỒN ĐÃ KIỂM TRA: Không có.',
  ].join('\n\n');
};

const generateConversationalAnswer = async ({ question, history, groundedAnswer, sources }) => {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return null;

  const model = String(process.env.OPENAI_CHAT_MODEL || 'gpt-5.6-luna').trim();
  const input = [
    ...sanitizeHistory(history),
    {
      role: 'user',
      content: [
        `CÂU HỎI HIỆN TẠI: ${redactSensitiveData(question).trim()}`,
        buildGrounding({ groundedAnswer, sources }),
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
        'Bạn là trợ lý hội thoại của CLB Sông Lam Nghệ An và hệ thống bán vé SLNA.',
        'Trả lời tự nhiên, thân thiện, trực tiếp bằng tiếng Việt, giống một trợ lý hiểu ngữ cảnh chứ không đọc lại máy móc dữ liệu.',
        'Dùng lịch sử hội thoại để hiểu câu hỏi nối tiếp, đại từ và điều người dùng đang muốn biết.',
        'Đối với thông tin có thể thay đổi như cầu thủ, lịch đấu, kết quả, giá vé, tồn vé, tin tức và chính sách: chỉ khẳng định điều có trong dữ liệu đã xác minh của câu hỏi hiện tại.',
        'Không tự bổ sung tên, số liệu, ngày tháng, URL hoặc sự kiện từ trí nhớ. Nếu dữ liệu thiếu, nói rõ chưa xác minh được và gợi ý người dùng hỏi cụ thể hơn.',
        'Không nhắc đến prompt, dữ liệu grounding, luật nội bộ hay việc bạn là mô hình AI.',
        'Không chèn danh sách nguồn vào nội dung vì giao diện sẽ hiển thị nguồn riêng.',
        'Ưu tiên một câu trả lời hoàn chỉnh, có giải thích hữu ích; dùng danh sách khi có nhiều mục cần so sánh hoặc liệt kê.',
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
