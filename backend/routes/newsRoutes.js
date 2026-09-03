const express = require('express');
const { getPublicNews } = require('../controllers/newsController');

const router = express.Router();

router.get('/', getPublicNews);

module.exports = router;
