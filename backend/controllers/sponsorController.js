const pool = require('../config/db');

const SPONSOR_LEVELS = ['DIAMOND', 'GOLD', 'SILVER', 'PARTNER'];

const sponsorSelect = `
  id,
  name,
  level,
  logo_url AS "logoUrl",
  website_url AS "websiteUrl",
  sort_order AS "sortOrder",
  is_active AS "isActive",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const validateSponsor = ({ name, level, logoUrl, websiteUrl }) => {
  if (!String(name || '').trim()) return 'Vui lòng nhập tên nhà tài trợ.';
  if (!SPONSOR_LEVELS.includes(level)) return 'Hạng nhà tài trợ không hợp lệ.';
  if (!String(logoUrl || '').trim()) return 'Vui lòng upload logo nhà tài trợ.';
  if (websiteUrl && !/^https?:\/\//i.test(String(websiteUrl))) {
    return 'Website phải bắt đầu bằng http:// hoặc https://.';
  }
  return null;
};

const getPublicSponsors = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${sponsorSelect}
       FROM sponsors
       WHERE is_active = true
       ORDER BY
         CASE level
           WHEN 'DIAMOND' THEN 1
           WHEN 'GOLD' THEN 2
           WHEN 'SILVER' THEN 3
           ELSE 4
         END,
         sort_order ASC,
         id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Không thể tải danh sách nhà tài trợ.' });
  }
};

const getSponsors = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${sponsorSelect} FROM sponsors ORDER BY sort_order ASC, id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Không thể tải danh sách nhà tài trợ.' });
  }
};

const createSponsor = async (req, res) => {
  const error = validateSponsor(req.body);
  if (error) return res.status(400).json({ message: error });

  const { name, level, logoUrl, websiteUrl, sortOrder = 0, isActive = true } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO sponsors (name, level, logo_url, website_url, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${sponsorSelect}`,
      [String(name).trim(), level, String(logoUrl).trim(), String(websiteUrl || '').trim() || null, Number(sortOrder) || 0, Boolean(isActive)]
    );
    res.status(201).json({ message: 'Đã thêm nhà tài trợ.', sponsor: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Không thể thêm nhà tài trợ.' });
  }
};

const updateSponsor = async (req, res) => {
  const error = validateSponsor(req.body);
  if (error) return res.status(400).json({ message: error });

  const { name, level, logoUrl, websiteUrl, sortOrder = 0, isActive = true } = req.body;
  try {
    const result = await pool.query(
      `UPDATE sponsors
       SET name = $1, level = $2, logo_url = $3, website_url = $4,
           sort_order = $5, is_active = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING ${sponsorSelect}`,
      [String(name).trim(), level, String(logoUrl).trim(), String(websiteUrl || '').trim() || null, Number(sortOrder) || 0, Boolean(isActive), req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Không tìm thấy nhà tài trợ.' });
    res.json({ message: 'Đã cập nhật nhà tài trợ.', sponsor: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Không thể cập nhật nhà tài trợ.' });
  }
};

const deleteSponsor = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sponsors WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Không tìm thấy nhà tài trợ.' });
    res.json({ message: 'Đã xóa nhà tài trợ.' });
  } catch (err) {
    res.status(500).json({ message: 'Không thể xóa nhà tài trợ.' });
  }
};

module.exports = { getPublicSponsors, getSponsors, createSponsor, updateSponsor, deleteSponsor };
