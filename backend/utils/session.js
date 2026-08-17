const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  throw new Error('Thiếu JWT_SECRET trong .env. Vui lòng cấu hình secret trước khi chạy backend.');
}

const COOKIE_NAME = 'slna_session';
const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;

const cookieOptions = () => {
  const sameSite = process.env.COOKIE_SAME_SITE === 'none' ? 'none' : 'lax';
  return ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
  sameSite,
  maxAge: SESSION_MAX_AGE_MS,
  path: '/',
  });
};

const createAccessToken = (user) => jwt.sign(
  { id: user.id, tokenVersion: Number(user.token_version || 0) },
  process.env.JWT_SECRET,
  { expiresIn: '2h', algorithm: 'HS256' }
);

const setSessionCookie = (res, user) => {
  res.cookie(COOKIE_NAME, createAccessToken(user), cookieOptions());
};

const clearSessionCookie = (res) => {
  const { maxAge: _maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
};

const parseCookies = (header = '') => Object.fromEntries(
  header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return [part, ''];
    return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
  })
);

const getRequestToken = (req) => {
  const cookies = parseCookies(req.headers.cookie || '');
  if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];
  const match = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
};

module.exports = {
  COOKIE_NAME,
  clearSessionCookie,
  createAccessToken,
  getRequestToken,
  setSessionCookie,
};
