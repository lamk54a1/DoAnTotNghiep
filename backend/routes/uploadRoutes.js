const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'matches');
const sponsorUploadDir = path.join(__dirname, '..', 'uploads', 'sponsors');
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(sponsorUploadDir, { recursive: true });

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.'));
    }
    cb(null, true);
  },
});

const sponsorStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, sponsorUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const sponsorUpload = multer({
  storage: sponsorStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) return cb(new Error('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.'));
    cb(null, true);
  },
});

router.post('/match-image', isAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Vui lòng chọn file ảnh.' });
  }

  res.status(201).json({
    message: 'Upload ảnh thành công.',
    path: `/uploads/matches/${req.file.filename}`,
    url: `/uploads/matches/${req.file.filename}`,
  });
});

router.post('/sponsor-logo', isAdmin, sponsorUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn file logo.' });
  res.status(201).json({
    message: 'Upload logo thành công.',
    path: `/uploads/sponsors/${req.file.filename}`,
    url: `/uploads/sponsors/${req.file.filename}`,
  });
});

module.exports = router;
