const pool = require('../config/db');

// 1. LẤY DANH SÁCH TẤT CẢ TRẬN ĐẤU (Cả User và Admin đều dùng)
const getMatches = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, opponent, opponent_logo AS "opponentLogo", 
        match_date AS "matchDate", stadium, description, 
        ticket_price_min AS "ticketPriceMin", banner_image AS "bannerImage", 
        status, home_score AS "homeScore", away_score AS "awayScore"
      FROM matches
      ORDER BY match_date ASC
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
    const query = `
      SELECT 
        id, opponent, opponent_logo AS "opponentLogo", 
        match_date AS "matchDate", stadium, description, 
        ticket_price_min AS "ticketPriceMin", banner_image AS "bannerImage", 
        status, home_score AS "homeScore", away_score AS "awayScore"
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
  const { opponent, opponentLogo, matchDate, stadium, description, ticketPriceMin, status } = req.body;
  try {
    const query = `
      INSERT INTO matches (opponent, opponent_logo, match_date, stadium, description, ticket_price_min, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id, opponent, opponent_logo AS "opponentLogo", match_date AS "matchDate", stadium, description, ticket_price_min AS "ticketPriceMin", status
    `;
    const result = await pool.query(query, [opponent, opponentLogo, matchDate, stadium, description, ticketPriceMin, status]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. ADMIN CẬP NHẬT TRẬN ĐẤU / CẬP NHẬT TỶ SỐ
const updateMatch = async (req, res) => {
  const { id } = req.params;
  const { opponent, opponentLogo, matchDate, stadium, description, ticketPriceMin, status, homeScore, awayScore } = req.body;
  try {
    const query = `
      UPDATE matches 
      SET 
        opponent = $1, 
        opponent_logo = $2, 
        match_date = $3, 
        stadium = $4, 
        description = $5, 
        ticket_price_min = $6, 
        status = $7, 
        home_score = $8, 
        away_score = $9
      WHERE id = $10 
      RETURNING id, opponent, opponent_logo AS "opponentLogo", match_date AS "matchDate", stadium, description, ticket_price_min AS "ticketPriceMin", status, home_score AS "homeScore", away_score AS "awayScore"
    `;
    const result = await pool.query(query, [
      opponent, opponentLogo, matchDate, stadium, description, ticketPriceMin, status, homeScore, awayScore, id
    ]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy trận đấu cần sửa!' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Export tất cả các hàm ra ngoài cho file route sử dụng
module.exports = { 
  getMatches, 
  getMatchById, 
  createMatch, 
  updateMatch 
};