const pool = require('../config/db');

const getHomeBanner = async (_req, res) => {
  try {
    const result = await pool.query("SELECT value FROM site_settings WHERE key = 'home_banner_image'");
    return res.json({ bannerImage: result.rows[0]?.value || null });
  } catch {
    return res.status(500).json({ message: 'Không thể tải ảnh banner trang chủ.' });
  }
};

const updateHomeBanner = async (req, res) => {
  const bannerImage = req.body.bannerImage;
  if (bannerImage !== null && (typeof bannerImage !== 'string' || !/^\/uploads\/banners\/[a-zA-Z0-9-]+\.(jpg|png|webp|gif)$/.test(bannerImage))) {
    return res.status(400).json({ message: 'Vui lòng tải ảnh banner lên hệ thống trước khi lưu.' });
  }
  try {
    const result = await pool.query(
      "INSERT INTO site_settings (key, value) VALUES ('home_banner_image', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW() RETURNING value",
      [bannerImage || '']
    );
    return res.json({ bannerImage: result.rows[0].value || null });
  } catch {
    return res.status(500).json({ message: 'Không thể lưu ảnh banner trang chủ.' });
  }
};

module.exports = { getHomeBanner, updateHomeBanner };
