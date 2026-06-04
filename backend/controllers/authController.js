const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ensureUserIdentityColumns = () => pool.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS cccd varchar(12);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS address text;
  CREATE UNIQUE INDEX IF NOT EXISTS users_cccd_unique_idx ON users (cccd) WHERE cccd IS NOT NULL;
`);

const normalizeCccd = (value) => String(value || '').replace(/\D/g, '');

const getProfile = async (req, res) => {
  try {
    await ensureUserIdentityColumns();
    const result = await pool.query(
      `SELECT
        id,
        email,
        full_name AS "fullName",
        phone_number AS "phoneNumber",
        cccd,
        address,
        role,
        status,
        created_at AS "createdAt"
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Không thể tải thông tin cá nhân.' });
  }
};

const updateProfile = async (req, res) => {
  const { fullName, phoneNumber, address } = req.body;

  if (!String(fullName || '').trim()) {
    return res.status(400).json({ message: 'Vui lòng nhập họ và tên.' });
  }

  if (!/^[0-9]{10}$/.test(String(phoneNumber || ''))) {
    return res.status(400).json({ message: 'Số điện thoại phải gồm đúng 10 chữ số.' });
  }

  if (!String(address || '').trim()) {
    return res.status(400).json({ message: 'Vui lòng nhập địa chỉ.' });
  }

  try {
    await ensureUserIdentityColumns();
    const result = await pool.query(
      `UPDATE users
       SET full_name = $1, phone_number = $2, address = $3
       WHERE id = $4
       RETURNING
        id,
        email,
        full_name AS "fullName",
        phone_number AS "phoneNumber",
        cccd,
        address,
        role,
        status,
        created_at AS "createdAt"`,
      [String(fullName).trim(), phoneNumber, String(address).trim(), req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }

    res.json({ message: 'Đã cập nhật thông tin cá nhân.', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Không thể cập nhật thông tin cá nhân.' });
  }
};

// ĐĂNG KÝ
const register = async (req, res) => {
  const { email, password, fullName, phoneNumber, address } = req.body;
  const cccd = normalizeCccd(req.body.cccd);

  if (!cccd || !/^\d{12}$/.test(cccd)) {
    return res.status(400).json({ message: 'CCCD phải gồm đúng 12 chữ số.' });
  }

  if (!String(address || '').trim()) {
    return res.status(400).json({ message: 'Vui lòng nhập địa chỉ.' });
  }

  try {
    await ensureUserIdentityColumns();
    // 1. Kiểm tra tài khoản tồn tại chưa
    const userExist = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: 'Email này đã được sử dụng!' });
    }

    const cccdExist = await pool.query('SELECT id FROM users WHERE cccd = $1', [cccd]);
    if (cccdExist.rows.length > 0) {
      return res.status(400).json({ message: 'CCCD này đã được đăng ký tài khoản!' });
    }

    // 2. Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Lưu vào database (Mặc định role là USER)
    const newUser = await pool.query(
      `INSERT INTO users (email, password, full_name, phone_number, cccd, address, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'USER', 'ACTIVE')
       RETURNING id, email, full_name, role`,
      [email, hashedPassword, fullName, phoneNumber, cccd, String(address).trim()]
    );

    res.status(201).json({ message: 'Đăng ký tài khoản thành công!', user: newUser.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'CCCD hoặc email này đã được sử dụng!' });
    }
    res.status(500).json({ message: 'Lỗi hệ thống khi đăng ký.' });
  }
};

// ĐĂNG NHẬP
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // 1. Tìm user theo email
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không chính xác!' });
    }

    const user = result.rows[0];

    // 2. Kiểm tra tài khoản có bị khóa không
    if (user.status === 'BANNED') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa do vi phạm điều khoản!' });
    }

    // 3. Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không chính xác!' });
    }

    // 4. Tạo mã Token JWT (Lưu ID và Quyền của User vào đây)
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'SLNA_SECRET_KEY_2026', // Khóa bí mật
      { expiresIn: '30d' } // Token có hiệu lực trong 30 ngày
    );

    // 5. Trả dữ liệu về cho Frontend
    res.json({
      message: 'Đăng nhập thành công!',
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi hệ thống khi đăng nhập.' });
  }
};

module.exports = { register, login, getProfile, updateProfile };
