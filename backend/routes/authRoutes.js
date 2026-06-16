const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, updateIdentity, changePassword, changeEmail, oauthStart, oauthCallback } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/identity', verifyToken, updateIdentity);
router.put('/password', verifyToken, changePassword);
router.put('/email', verifyToken, changeEmail);
router.get('/oauth/:provider', oauthStart);
router.get('/oauth/:provider/callback', oauthCallback);

module.exports = router;
