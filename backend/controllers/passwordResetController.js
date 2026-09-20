const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { isMailConfigured, sendPasswordResetEmail } = require('../services/mailService');

const genericMessage = 'Nếu email thuộc tài khoản hợp lệ, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.';
const isStrongPassword = (value) => String(value || '').length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getPasswordResetStatus = (_req, res) => res.json({ available: isMailConfigured() });

const requestPasswordReset = async (req, res) => {
  if (!isMailConfigured()) return res.status(503).json({ message: 'Chức năng gửi email chưa được cấu hình. Vui lòng liên hệ quản trị viên.' });

  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    return res.status(400).json({ message: 'Email không hợp lệ.' });
  }

  try {
    const userResult = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND status = 'ACTIVE' AND auth_provider = 'LOCAL'",
      [email]
    );
    if (userResult.rowCount === 0) return res.json({ message: genericMessage });

    const userId = userResult.rows[0].id;
    const recent = await pool.query(
      "SELECT 1 FROM password_reset_tokens WHERE user_id = $1 AND created_at > NOW() - INTERVAL '5 minutes' LIMIT 1",
      [userId]
    );
    if (recent.rowCount > 0) return res.json({ message: genericMessage });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '15 minutes')",
      [userId, tokenHash]
    );

    try {
      const resetUrl = new URL('/reset-password', process.env.FRONTEND_URL || 'http://localhost:3000');
      resetUrl.searchParams.set('token', token);
      await sendPasswordResetEmail(email, resetUrl.toString());
    } catch (error) {
      await pool.query('DELETE FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]);
      console.error('Không gửi được email đặt lại mật khẩu:', error.message);
    }
    return res.json({ message: genericMessage });
  } catch (error) {
    console.error('Lỗi yêu cầu đặt lại mật khẩu:', error.message);
    return res.status(500).json({ message: 'Không thể xử lý yêu cầu lúc này.' });
  }
};

const resetPassword = async (req, res) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ message: 'Liên kết đặt lại mật khẩu không hợp lệ.' });
  if (!isStrongPassword(password)) return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ và số.' });

  let client;
  try {
    const hash = await bcrypt.hash(password, 12);
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT t.user_id FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > NOW()
         AND u.status = 'ACTIVE' AND u.auth_provider = 'LOCAL'
       FOR UPDATE OF t, u`,
      [hashToken(token)]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Liên kết đã hết hạn hoặc đã được sử dụng.' });
    }

    const userId = result.rows[0].user_id;
    await client.query('UPDATE users SET password = $1, token_version = token_version + 1 WHERE id = $2', [hash, userId]);
    await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [userId]);
    await client.query('COMMIT');
    return res.json({ message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Lỗi đặt lại mật khẩu:', error.message);
    return res.status(500).json({ message: 'Không thể đặt lại mật khẩu lúc này.' });
  } finally {
    if (client) client.release();
  }
};

module.exports = { getPasswordResetStatus, requestPasswordReset, resetPassword };
