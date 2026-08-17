const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { writeAuditLog } = require('../utils/auditLog');
const { clearSessionCookie, setSessionCookie } = require('../utils/session');

const jwtSecret = process.env.JWT_SECRET;

const normalizeCccd = (value) => String(value || '').replace(/\D/g, '');
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isStrongPassword = (value) => (
  String(value || '').length >= 8
  && /[A-Za-z]/.test(value)
  && /\d/.test(value)
);

const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        id,
        email,
        full_name AS "fullName",
        phone_number AS "phoneNumber",
        cccd,
        pending_cccd AS "pendingCccd",
        CASE WHEN cccd IS NOT NULL THEN 'VERIFIED' ELSE cccd_status END AS "cccdStatus",
        cccd_verified_at AS "cccdVerifiedAt",
        address,
        profile_completed AS "profileCompleted",
        auth_provider AS "authProvider",
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
    const result = await pool.query(
      `UPDATE users
       SET full_name = $1, phone_number = $2, address = $3, profile_completed = true
       WHERE id = $4
       RETURNING
        id,
        email,
        full_name AS "fullName",
        phone_number AS "phoneNumber",
        cccd,
        pending_cccd AS "pendingCccd",
        CASE WHEN cccd IS NOT NULL THEN 'VERIFIED' ELSE cccd_status END AS "cccdStatus",
        cccd_verified_at AS "cccdVerifiedAt",
        address,
        profile_completed AS "profileCompleted",
        auth_provider AS "authProvider",
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

const updateIdentity = async (req, res) => {
  const cccd = normalizeCccd(req.body.cccd);

  if (!cccd || !/^\d{12}$/.test(cccd)) {
    return res.status(400).json({ message: 'Không đọc được CCCD hợp lệ từ ảnh. Vui lòng chụp rõ mặt trước CCCD.' });
  }

  try {

    const currentUserResult = await pool.query(
      'SELECT id, cccd FROM users WHERE id = $1',
      [req.user.id]
    );

    if (currentUserResult.rowCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }

    if (currentUserResult.rows[0].cccd) {
      return res.status(409).json({ message: 'Tài khoản này đã cập nhật CCCD. Không thể cập nhật lại.' });
    }

    const cccdExist = await pool.query(
      'SELECT id FROM users WHERE cccd = $1 AND id <> $2',
      [cccd, req.user.id]
    );

    if (cccdExist.rows.length > 0) {
      return res.status(400).json({ message: 'CCCD này đã được dùng cho tài khoản khác.' });
    }

    const result = await pool.query(
      `UPDATE users
       SET pending_cccd = $1, cccd_status = 'PENDING'
       WHERE id = $2 AND cccd IS NULL
       RETURNING
        id,
        email,
        full_name AS "fullName",
        phone_number AS "phoneNumber",
        cccd,
        pending_cccd AS "pendingCccd",
        cccd_status AS "cccdStatus",
        cccd_verified_at AS "cccdVerifiedAt",
        address,
        role,
        status,
        created_at AS "createdAt"`,
      [cccd, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ message: 'Tài khoản này đã cập nhật CCCD. Không thể cập nhật lại.' });
    }

    await writeAuditLog({ userId: req.user.id, action: 'CCCD_SUBMITTED', entityType: 'user', entityId: req.user.id, metadata: { cccdLastFour: cccd.slice(-4) } });
    res.json({ message: 'Đã gửi CCCD cho admin duyệt.', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'CCCD này đã được dùng cho tài khoản khác.' });
    }
    res.status(500).json({ message: 'Không thể cập nhật CCCD.' });
  }
};

// ĐĂNG KÝ
const register = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const fullName = String(req.body.fullName || '').trim();
  const phoneNumber = String(req.body.phoneNumber || '').trim();
  const address = String(req.body.address || '').trim();

  if (!isValidEmail(email)) return res.status(400).json({ message: 'Email không hợp lệ.' });
  if (fullName.length < 2 || fullName.length > 120) return res.status(400).json({ message: 'Họ tên phải có từ 2 đến 120 ký tự.' });
  if (!/^0\d{9}$/.test(phoneNumber)) return res.status(400).json({ message: 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0.' });
  if (address.length < 8 || address.length > 500) return res.status(400).json({ message: 'Địa chỉ phải có từ 8 đến 500 ký tự.' });
  if (!isStrongPassword(password)) return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số.' });

  try {
    const userExist = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: 'Email này đã được sử dụng!' });
    }

    // 2. Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 12);

    // 3. Lưu vào database (Mặc định role là USER)
    const newUser = await pool.query(
      `INSERT INTO users (email, password, full_name, phone_number, address, role, status, auth_provider, profile_completed)
       VALUES ($1, $2, $3, $4, $5, 'USER', 'ACTIVE', 'LOCAL', true)
       RETURNING id, email, full_name, role`,
      [email, hashedPassword, fullName, phoneNumber, address]
    );

    res.status(201).json({ message: 'Đăng ký tài khoản thành công!', user: newUser.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Email này đã được sử dụng!' });
    res.status(500).json({ message: 'Lỗi hệ thống khi đăng ký.' });
  }
};

// ĐĂNG NHẬP
const login = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ message: 'Email hoặc mật khẩu không chính xác!' });
  }
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
    setSessionCookie(res, user);

    // 5. Trả dữ liệu về cho Frontend
    res.json({
      message: 'Đăng nhập thành công!',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        cccd: user.cccd || null,
        cccdStatus: user.cccd ? 'VERIFIED' : user.cccd_status || 'NOT_SUBMITTED'
        ,
        profileCompleted: Boolean(user.profile_completed)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi hệ thống khi đăng nhập.' });
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ và số.' });
  }

  try {
    const result = await pool.query('SELECT password, auth_provider FROM users WHERE id = $1', [req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    if (result.rows[0].auth_provider !== 'LOCAL') {
      return res.status(400).json({ message: 'Mật khẩu của tài khoản mạng xã hội được quản lý bởi nhà cung cấp đăng nhập.' });
    }
    const isMatch = await bcrypt.compare(String(currentPassword || ''), result.rows[0].password);
    if (!isMatch) return res.status(400).json({ message: 'Mật khẩu hiện tại không chính xác.' });
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const updated = await pool.query(
      "UPDATE users SET password = $1, auth_provider = 'LOCAL', token_version = token_version + 1 WHERE id = $2 RETURNING *",
      [hashedPassword, req.user.id]
    );
    setSessionCookie(res, updated.rows[0]);
    res.json({ message: 'Đổi mật khẩu thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Không thể đổi mật khẩu.' });
  }
};

const changeEmail = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const currentPassword = String(req.body.currentPassword || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Email mới không hợp lệ.' });
  }

  try {
    const current = await pool.query('SELECT password, auth_provider FROM users WHERE id = $1', [req.user.id]);
    if (current.rowCount === 0) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    if (current.rows[0].auth_provider !== 'LOCAL') {
      return res.status(400).json({ message: 'Email của tài khoản mạng xã hội được quản lý bởi nhà cung cấp đăng nhập.' });
    }
    if (!await bcrypt.compare(currentPassword, current.rows[0].password)) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không chính xác.' });
    }
    const result = await pool.query(
      'UPDATE users SET email = $1, token_version = token_version + 1 WHERE id = $2 RETURNING *',
      [email, req.user.id]
    );
    setSessionCookie(res, result.rows[0]);
    res.json({ message: 'Đổi email thành công.', email: result.rows[0].email });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Email này đã được sử dụng.' });
    res.status(500).json({ message: 'Không thể đổi email.' });
  }
};

const oauthConfig = {
  google: {
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
  },
  facebook: {
    clientId: () => process.env.FACEBOOK_APP_ID,
    clientSecret: () => process.env.FACEBOOK_APP_SECRET,
    authUrl: 'https://www.facebook.com/v23.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v23.0/oauth/access_token',
    userUrl: 'https://graph.facebook.com/me?fields=id,name,email',
    scope: 'email,public_profile',
  },
};

const oauthStart = (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  const mode = req.query.mode === 'register' ? 'register' : 'login';
  const config = oauthConfig[provider];
  if (!config || !config.clientId() || !config.clientSecret()) {
    return res.redirect(`${frontendUrl}/${mode}?oauth_error=${encodeURIComponent(`${provider === 'google' ? 'Google' : 'Facebook'} chưa được cấu hình trên máy chủ.`)}`);
  }
  const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/oauth/${provider}/callback`;
  const state = jwt.sign({ provider, mode, nonce: crypto.randomBytes(12).toString('hex') }, jwtSecret, { expiresIn: '10m' });
  const params = new URLSearchParams({
    client_id: config.clientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scope,
    state,
  });
  res.redirect(`${config.authUrl}?${params.toString()}`);
};

const oauthCallback = async (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  const config = oauthConfig[provider];
  try {
    const stateData = jwt.verify(String(req.query.state || ''), jwtSecret);
    if (!config || stateData.provider !== provider || !req.query.code) throw new Error('Yêu cầu OAuth không hợp lệ.');
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/oauth/${provider}/callback`;
    const tokenParams = new URLSearchParams({
      client_id: config.clientId(),
      client_secret: config.clientSecret(),
      redirect_uri: redirectUri,
      code: String(req.query.code),
    });
    if (provider === 'google') tokenParams.set('grant_type', 'authorization_code');

    const finalTokenData = provider === 'facebook'
      ? await fetch(`${config.tokenUrl}?${tokenParams.toString()}`).then((response) => response.json())
      : await fetch(config.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenParams,
        }).then((response) => response.json());
    if (!finalTokenData.access_token) throw new Error('Không nhận được access token.');

    const separator = config.userUrl.includes('?') ? '&' : '?';
    const userResponse = await fetch(`${config.userUrl}${separator}access_token=${encodeURIComponent(finalTokenData.access_token)}`, {
      headers: provider === 'google' ? { Authorization: `Bearer ${finalTokenData.access_token}` } : undefined,
    });
    if (!userResponse.ok) throw new Error('Không đọc được thông tin tài khoản mạng xã hội.');
    const socialUser = await userResponse.json();
    const email = normalizeEmail(socialUser.email);
    if (!socialUser.id && !socialUser.sub) throw new Error('Không đọc được tài khoản mạng xã hội.');
    if (!email) throw new Error('Tài khoản mạng xã hội chưa cung cấp email.');
    if (provider === 'google' && socialUser.email_verified !== true) {
      throw new Error('Email Google chưa được xác minh.');
    }

    const providerId = String(socialUser.sub || socialUser.id);
    const providerName = provider.toUpperCase();
    let userResult = await pool.query(
      'SELECT * FROM users WHERE auth_provider = $1 AND provider_id = $2',
      [providerName, providerId]
    );
    if (userResult.rowCount === 0) {
      const emailResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (emailResult.rowCount > 0 && emailResult.rows[0].auth_provider !== providerName) {
        throw new Error('Email này đã có tài khoản. Vui lòng đăng nhập bằng mật khẩu để tránh liên kết nhầm tài khoản.');
      }
      userResult = emailResult;
    }
    if (userResult.rowCount === 0) {
      const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      userResult = await pool.query(
        `INSERT INTO users (email, password, full_name, role, status, auth_provider, provider_id, address, profile_completed)
         VALUES ($1, $2, $3, 'USER', 'ACTIVE', $4, $5, '', false)
         RETURNING *`,
        [email, randomPassword, socialUser.name || email.split('@')[0], providerName, providerId]
      );
    } else {
      await pool.query(
        'UPDATE users SET auth_provider = $1, provider_id = COALESCE(provider_id, $2) WHERE id = $3',
        [providerName, providerId, userResult.rows[0].id]
      );
      userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userResult.rows[0].id]);
    }
    const user = userResult.rows[0];
    if (user.status === 'BANNED') throw new Error('Tài khoản đã bị khóa.');
    setSessionCookie(res, user);
    const userPayload = Buffer.from(JSON.stringify({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      profileCompleted: Boolean(user.profile_completed),
      authProvider: user.auth_provider,
    })).toString('base64url');
    res.redirect(`${frontendUrl}/auth/callback?user=${encodeURIComponent(userPayload)}`);
  } catch (err) {
    let mode = 'login';
    try {
      mode = jwt.decode(String(req.query.state || ''))?.mode === 'register' ? 'register' : 'login';
    } catch {}
    res.redirect(`${frontendUrl}/${mode}?oauth_error=${encodeURIComponent(err.message || 'Đăng nhập mạng xã hội thất bại.')}`);
  }
};

const logout = (_req, res) => {
  clearSessionCookie(res);
  res.json({ message: 'Đã đăng xuất.' });
};

module.exports = { register, login, logout, getProfile, updateProfile, updateIdentity, changePassword, changeEmail, oauthStart, oauthCallback, isStrongPassword };
