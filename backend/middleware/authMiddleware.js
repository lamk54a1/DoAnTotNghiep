const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { getRequestToken } = require('../utils/session');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const isSuperAdminEmail = (email) => {
  const configuredEmail = normalizeEmail(process.env.SUPER_ADMIN_EMAIL);
  return Boolean(configuredEmail) && normalizeEmail(email) === configuredEmail;
};

const loadActiveUser = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  const result = await pool.query(
    `SELECT id, role, status, token_version AS "tokenVersion"
     FROM users WHERE id = $1`,
    [decoded.id]
  );
  const user = result.rows[0];
  if (!user || user.status !== 'ACTIVE' || Number(user.tokenVersion) !== Number(decoded.tokenVersion || 0)) {
    return null;
  }
  return user;
};

const verifyToken = async (req, res, next) => {
  const token = getRequestToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Bạn vui lòng đăng nhập để thực hiện thao tác này!' });
  }

  try {
    const user = await loadActiveUser(token);
    if (!user) return res.status(401).json({ message: 'Phiên đăng nhập không còn hiệu lực.' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ!' });
  }
};

const optionalAuth = async (req, _res, next) => {
  const token = getRequestToken(req);
  if (!token) return next();
  try {
    req.user = await loadActiveUser(token);
  } catch {
    req.user = null;
  }
  return next();
};

const isAdmin = (req, res, next) => verifyToken(req, res, () => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Bạn không có quyền truy cập khu vực quản trị!' });
  }
  return next();
});

const isSuperAdmin = async (req, res, next) => isAdmin(req, res, async () => {
  if (!normalizeEmail(process.env.SUPER_ADMIN_EMAIL)) {
    return res.status(503).json({ message: 'Máy chủ chưa cấu hình tài khoản quản trị gốc.' });
  }
  try {
    const result = await pool.query(
      "SELECT email FROM users WHERE id = $1 AND role = 'ADMIN' AND status = 'ACTIVE'",
      [req.user.id]
    );
    if (result.rowCount === 0 || !isSuperAdminEmail(result.rows[0].email)) {
      return res.status(403).json({ message: 'Chỉ quản trị viên gốc mới được thay đổi quyền quản trị.' });
    }
    return next();
  } catch {
    return res.status(500).json({ message: 'Không thể xác minh quyền quản trị gốc.' });
  }
});

module.exports = { verifyToken, optionalAuth, isAdmin, isSuperAdmin, isSuperAdminEmail, loadActiveUser };
