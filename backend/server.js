const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const pool = require('./config/db');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// ========================================================
// 1. CẤU HÌNH MIDDLEWARE HỆ THỐNG (BẮT BUỘC PHẢI ĐẶT TRÊN CÙNG)
// ========================================================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json()); // Giúp Backend đọc được dữ liệu JSON (req.body) từ Form gửi lên
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

// ========================================================
// 3. KHỞI ĐỘNG SERVER (LUÔN LUÔN ĐẶT Ở CUỐI CÙNG)
// ========================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy mượt mà tại http://localhost:${PORT}`);
});
