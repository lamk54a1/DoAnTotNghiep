const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ĐĂNG KÝ
const register = async (req, res) => {
  const { email, password, fullName, phoneNumber } = req.body;
  try {
    // 1. Kiểm tra tài khoản tồn tại chưa
    const userExist = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: 'Email này đã được sử dụng!' });
    }

    // 2. Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Lưu vào database (Mặc định role là USER)
    const newUser = await pool.query(
      `INSERT INTO users (email, password, full_name, phone_number, role, status) 
       VALUES ($1, $2, $3, $4, 'USER', 'ACTIVE') RETURNING id, email, full_name, role`,
      [email, hashedPassword, fullName, phoneNumber]
    );

    res.status(201).json({ message: 'Đăng ký tài khoản thành công!', user: newUser.rows[0] });
  } catch (err) {
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

module.exports = { register, login };