const pool = require('../config/db');
const { writeAuditLog } = require('../utils/auditLog');

const STAND_PRICES = {
  A: 100000,
  B: 50000,
  C: 20000,
  D: 20000,
};

const ensureMatchColumns = (db = pool) => db.query(`
  ALTER TABLE matches ADD COLUMN IF NOT EXISTS free_stands text[] DEFAULT '{}'::text[];
  ALTER TABLE matches ADD COLUMN IF NOT EXISTS competition_name varchar(120) DEFAULT 'V-League 2026';
  ALTER TABLE matches ADD COLUMN IF NOT EXISTS stand_prices jsonb DEFAULT '{"A":100000,"B":50000,"C":20000,"D":20000}'::jsonb;
`);

const ensureTicketStatusValues = async (db = pool) => {
  await db.query("ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'PAPER_RESERVED'");
  await db.query("ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'PAPER_SOLD'");
};

const normalizeFreeStands = (freeStands) => {
  if (!Array.isArray(freeStands)) return [];
  return [...new Set(freeStands.filter((stand) => Object.prototype.hasOwnProperty.call(STAND_PRICES, stand)))];
};

const normalizeStandPrices = (standPrices = {}) => {
  const normalized = {};
  for (const [stand, defaultPrice] of Object.entries(STAND_PRICES)) {
    const value = Number(standPrices?.[stand] ?? defaultPrice);
    normalized[stand] = Number.isFinite(value) && value >= 0 ? value : defaultPrice;
  }
  return normalized;
};

const getTicketPriceMin = (standPrices, freeStands) => {
  const prices = Object.entries(standPrices).map(([stand, price]) => freeStands.includes(stand) ? 0 : Number(price));
  return Math.min(...prices);
};

const hasFullScore = (homeScore, awayScore) => (
  homeScore !== null
  && homeScore !== undefined
  && awayScore !== null
  && awayScore !== undefined
);

const syncAvailableTicketPrices = async (matchId, freeStands, standPrices) => {
  for (const [stand, price] of Object.entries(standPrices)) {
    await pool.query(
      `UPDATE tickets
       SET price = $1
       WHERE match_id = $2
       AND sector LIKE $3
       AND status = 'AVAILABLE'`,
      [freeStands.includes(stand) ? 0 : price, matchId, `${stand}%`]
    );
  }
};

// 1. LẤY DANH SÁCH TẤT CẢ TRẬN ĐẤU (Cả User và Admin đều dùng)
const getMatches = async (req, res) => {
  const { scope } = req.query;
  try {
    await ensureMatchColumns();
    let whereClause = '';
    let orderClause = 'ORDER BY match_date ASC';
    let limitClause = '';

    if (scope === 'featured') {
      whereClause = "WHERE status = 'ON_SALE' AND match_date >= NOW()";
      limitClause = 'LIMIT 1';
    } else if (scope === 'schedule') {
      whereClause = "WHERE status <> 'FINISHED' AND match_date >= NOW()";
    } else if (scope === 'results') {
      whereClause = "WHERE status = 'FINISHED'";
      orderClause = 'ORDER BY match_date DESC';
    }

    const query = `
      SELECT 
        id, opponent, opponent_logo AS "opponentLogo", 
        match_date AS "matchDate", stadium, description, 
        competition_name AS "competitionName",
        ticket_price_min AS "ticketPriceMin", stand_prices AS "standPrices", banner_image AS "bannerImage", 
        status, home_score AS "homeScore", away_score AS "awayScore",
        free_stands AS "freeStands"
      FROM matches
      ${whereClause}
      ${orderClause}
      ${limitClause}
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. LẤY CHI TIẾT MỘT TRẬN ĐẤU BẰNG ID
const getMatchById = async (req, res) => {
  const { id } = req.params;
  try {
    await ensureMatchColumns();
    const query = `
      SELECT 
        id, opponent, opponent_logo AS "opponentLogo", 
        match_date AS "matchDate", stadium, description, 
        competition_name AS "competitionName",
        ticket_price_min AS "ticketPriceMin", stand_prices AS "standPrices", banner_image AS "bannerImage", 
        status, home_score AS "homeScore", away_score AS "awayScore",
        free_stands AS "freeStands"
      FROM matches
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy trận đấu này!' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. ADMIN TẠO TRẬN ĐẤU MỚI
const createMatch = async (req, res) => {
  const { opponent, opponentLogo, matchDate, stadium, description, bannerImage, status, homeScore, awayScore, freeStands, standPrices, competitionName } = req.body;
  try {
    await ensureMatchColumns();
    const normalizedFreeStands = normalizeFreeStands(freeStands);
    const normalizedStandPrices = normalizeStandPrices(standPrices);
    const ticketPriceMin = getTicketPriceMin(normalizedStandPrices, normalizedFreeStands);
    const finalStatus = hasFullScore(homeScore, awayScore) ? 'FINISHED' : status;
    const query = `
      INSERT INTO matches (opponent, opponent_logo, match_date, stadium, description, competition_name, ticket_price_min, stand_prices, banner_image, status, home_score, away_score, free_stands)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, opponent, opponent_logo AS "opponentLogo", match_date AS "matchDate", stadium, description, competition_name AS "competitionName", ticket_price_min AS "ticketPriceMin", stand_prices AS "standPrices", banner_image AS "bannerImage", status, home_score AS "homeScore", away_score AS "awayScore", free_stands AS "freeStands"
    `;
    const result = await pool.query(query, [opponent, opponentLogo || null, matchDate, stadium, description || null, competitionName || 'V-League 2026', ticketPriceMin, normalizedStandPrices, bannerImage || null, finalStatus, homeScore ?? null, awayScore ?? null, normalizedFreeStands]);
    await writeAuditLog({ userId: req.user.id, action: 'MATCH_CREATED', entityType: 'match', entityId: result.rows[0].id, metadata: { opponent, competitionName } });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. ADMIN CẬP NHẬT TRẬN ĐẤU / CẬP NHẬT TỶ SỐ
const updateMatch = async (req, res) => {
  const { id } = req.params;
  const { opponent, opponentLogo, matchDate, stadium, description, bannerImage, status, homeScore, awayScore, freeStands, standPrices, competitionName } = req.body;
  try {
    await ensureMatchColumns();
    const normalizedFreeStands = normalizeFreeStands(freeStands);
    const normalizedStandPrices = normalizeStandPrices(standPrices);
    const ticketPriceMin = getTicketPriceMin(normalizedStandPrices, normalizedFreeStands);
    const finalStatus = hasFullScore(homeScore, awayScore) ? 'FINISHED' : status;
    const query = `
      UPDATE matches 
      SET 
        opponent = $1, 
        opponent_logo = $2, 
        match_date = $3, 
        stadium = $4, 
        description = $5, 
        competition_name = $6,
        ticket_price_min = $7, 
        stand_prices = $8,
        banner_image = $9,
        status = $10,
        home_score = $11,
        away_score = $12,
        free_stands = $13
      WHERE id = $14
      RETURNING id, opponent, opponent_logo AS "opponentLogo", match_date AS "matchDate", stadium, description, competition_name AS "competitionName", ticket_price_min AS "ticketPriceMin", stand_prices AS "standPrices", banner_image AS "bannerImage", status, home_score AS "homeScore", away_score AS "awayScore", free_stands AS "freeStands"
    `;
    const result = await pool.query(query, [
      opponent, opponentLogo || null, matchDate, stadium, description || null, competitionName || 'V-League 2026', ticketPriceMin, normalizedStandPrices, bannerImage || null, finalStatus, homeScore ?? null, awayScore ?? null, normalizedFreeStands, id
    ]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy trận đấu cần sửa!' });
    }
    await syncAvailableTicketPrices(id, normalizedFreeStands, normalizedStandPrices);
    await writeAuditLog({ userId: req.user.id, action: 'MATCH_UPDATED', entityType: 'match', entityId: id, metadata: { opponent, competitionName } });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteMatch = async (req, res) => {
  const { id } = req.params;
  try {
    await ensureTicketStatusValues();
    const soldTickets = await pool.query(
      "SELECT 1 FROM tickets WHERE match_id = $1 AND status NOT IN ('AVAILABLE', 'PAPER_RESERVED') LIMIT 1",
      [id]
    );

    if (soldTickets.rowCount > 0) {
      return res.status(409).json({ message: 'Không thể xóa trận đấu đã có vé được đặt hoặc bán.' });
    }

    await pool.query('DELETE FROM tickets WHERE match_id = $1', [id]);
    const result = await pool.query('DELETE FROM matches WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy trận đấu cần xóa!' });
    }

    res.json({ message: 'Đã xóa trận đấu.' });
  } catch (err) {
    res.status(500).json({ message: 'Không thể xóa trận đấu.', error: err.message });
  }
};

// Export tất cả các hàm ra ngoài cho file route sử dụng
module.exports = { 
  getMatches, 
  getMatchById, 
  createMatch, 
  updateMatch,
  deleteMatch
};
