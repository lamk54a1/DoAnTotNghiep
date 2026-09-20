const express = require('express');
const router = express.Router();
const { register, login, logout, getProfile, updateProfile, updateIdentity, changePassword, changeEmail, oauthStart, oauthCallback } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { createRateLimit } = require('../middleware/rateLimit');
const { getPasswordResetStatus, requestPasswordReset, resetPassword } = require('../controllers/passwordResetController');

const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.',
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/password-reset/status', getPasswordResetStatus);
router.post('/forgot-password', createRateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.' }), requestPasswordReset);
router.post('/reset-password', createRateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.' }), resetPassword);
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/identity', verifyToken, updateIdentity);
router.put('/password', verifyToken, changePassword);
router.put('/email', verifyToken, changeEmail);
router.get('/oauth/:provider', oauthStart);
router.get('/oauth/:provider/callback', oauthCallback);

module.exports = router;
