const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, updateIdentity } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/identity', verifyToken, updateIdentity);

module.exports = router;
