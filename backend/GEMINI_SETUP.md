# Cấu hình chatbot Gemini

Chatbot dùng Gemini API để diễn đạt câu trả lời tự nhiên. Dữ liệu vé, lịch đấu,
đội hình và tin chính thức vẫn được lấy từ hệ thống trước khi gửi làm ngữ cảnh.
Nếu Gemini lỗi hoặc hết hạn mức, chatbot tự động dùng câu trả lời dự phòng.

## 1. Tạo API key

1. Mở https://aistudio.google.com/app/apikey và đăng nhập tài khoản Google.
2. Tạo API key trong một Google Cloud project.
3. Không gửi khóa cho người khác và không commit khóa lên Git.

## 2. Cấu hình máy chủ

Thêm vào `/srv/slna/app/backend/.env`:

```env
GEMINI_API_KEY=khóa_của_bạn
GEMINI_CHAT_MODEL=gemini-3.5-flash-lite
GEMINI_TIMEOUT_MS=20000
```

Không cần cài thêm package. Sau khi lưu, khởi động lại API:

```bash
systemctl restart slna-api
systemctl is-active slna-api
```

Kiểm tra biến đã được đọc mà không in khóa:

```bash
cd /srv/slna/app/backend
runuser -u slna -- node -r dotenv/config -e "console.log({model:process.env.GEMINI_CHAT_MODEL, configured:Boolean(process.env.GEMINI_API_KEY)})"
```

Kết quả đúng có `configured: true`.

## 3. Kiểm thử chatbot

```bash
curl -s https://api.veslnafc.xyz/api/chatbot/ask \
  -H 'Content-Type: application/json' \
  --data '{"question":"SLNA là gì?","history":[]}'
```

Gemini Free Tier có hạn mức theo project. Khi vượt hạn mức, hệ thống vẫn trả lời
bằng dữ liệu dự phòng thay vì làm hỏng API chatbot.
