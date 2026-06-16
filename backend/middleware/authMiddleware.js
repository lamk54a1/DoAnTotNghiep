const jwt = require('jsonwebtoken');

// 1. Middleware bắt buộc phải đăng nhập (Xác thực Token)
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Lấy chuỗi sau 'Bearer '

  if (!token) {
    return res.status(401).json({ message: 'Bạn vui lòng đăng nhập để thực hiện thao tác này!' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'SLNA_SECRET_KEY_2026');
    req.user = decoded; // Dữ liệu giải mã gồm { id, role }
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ!' });
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return next();

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'SLNA_SECRET_KEY_2026');
  } catch (err) {
    req.user = null;
  }
  next();
};

// 2. Middleware chỉ cho phép quyền ADMIN đi qua
const isAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === 'ADMIN') {
      next();
    } else {
      return res.status(403).json({ message: 'Lỗi bảo mật: Bạn không có quyền truy cập khu vực quản trị!' });
    }
  });
};

module.exports = { verifyToken, optionalAuth, isAdmin };
