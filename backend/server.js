const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env.local'), override: true });
const pool = require('./config/db');
const adminRoutes = require('./routes/adminRoutes');
const { expirePendingOrders } = require('./utils/orderLifecycle');

const app = express();
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

// ========================================================
// 1. CẤU HÌNH MIDDLEWARE HỆ THỐNG (BẮT BUỘC PHẢI ĐẶT TRÊN CÙNG)
// ========================================================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.headers.origin;
  const allowedOrigin = String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  if (origin && origin.replace(/\/$/, '') !== allowedOrigin) {
    return res.status(403).json({ message: 'Nguồn yêu cầu không được phép.' });
  }
  return next();
});
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  next();
});
app.use(express.json({ limit: '100kb' }));
app.use('/api/admin', adminRoutes);

// ========================================================
// 2. KHAI BÁO CÁC TUYẾN ĐƯỜNG (ROUTES)
// ========================================================
const matchRoutes = require('./routes/matchRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const sponsorRoutes = require('./routes/sponsorRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');

// Route kiểm tra hệ thống công khai
app.get('/', (req, res) => {
  res.send('Server SLNA Backend đang chạy mượt mà!');
});

// Định nghĩa các URL Prefix cho API công khai và người dùng
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && Object.prototype.hasOwnProperty.call(err, 'body')) {
    return res.status(400).json({ message: 'Dữ liệu JSON không hợp lệ.' });
  }
  console.error('Lỗi chưa xử lý:', err.message);
  return res.status(500).json({ message: 'Lỗi hệ thống.' });
});

// ========================================================
// 3. KHỞI ĐỘNG SERVER (LUÔN LUÔN ĐẶT Ở CUỐI CÙNG)
// ========================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy mượt mà tại http://localhost:${PORT}`);
});

const expiryTimer = setInterval(() => {
  expirePendingOrders(pool).catch((error) => console.error('Không thể dọn đơn hết hạn:', error.message));
}, 60 * 1000);
expiryTimer.unref();
