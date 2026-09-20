const express = require('express');
const { isAdmin } = require('../middleware/authMiddleware');
const { getHomeBanner, updateHomeBanner } = require('../controllers/siteController');

const router = express.Router();
router.get('/home-banner', getHomeBanner);
router.put('/home-banner', isAdmin, updateHomeBanner);

module.exports = router;
