const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();
const uploadRoot = path.join(__dirname, '..', 'uploads');
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const detectImageType = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ext: '.jpg', mime: 'image/jpeg' };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: '.png', mime: 'image/png' };
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return { ext: '.webp', mime: 'image/webp' };
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString())) return { ext: '.gif', mime: 'image/gif' };
  return null;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5, parts: 6 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) return cb(new Error('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.'));
    return cb(null, true);
  },
});

const uploadImage = (folder) => (req, res) => {
  upload.single('image')(req, res, async (error) => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ message: error.message || 'Không thể upload ảnh.' });
    }
    if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn file ảnh.' });

    const detected = detectImageType(req.file.buffer);
    if (!detected || detected.mime !== req.file.mimetype) {
      return res.status(400).json({ message: 'Nội dung file không khớp định dạng ảnh khai báo.' });
    }

    try {
      const targetDir = path.join(uploadRoot, folder);
      await fs.promises.mkdir(targetDir, { recursive: true });
      const filename = `${Date.now()}-${crypto.randomUUID()}${detected.ext}`;
      await fs.promises.writeFile(path.join(targetDir, filename), req.file.buffer, { flag: 'wx' });
      const publicPath = `/uploads/${folder}/${filename}`;
      return res.status(201).json({ message: 'Upload ảnh thành công.', path: publicPath, url: publicPath });
    } catch {
      return res.status(500).json({ message: 'Không thể lưu file ảnh.' });
    }
  });
};

router.post('/match-image', isAdmin, uploadImage('matches'));
router.post('/sponsor-logo', isAdmin, uploadImage('sponsors'));

module.exports = router;
module.exports.detectImageType = detectImageType;
