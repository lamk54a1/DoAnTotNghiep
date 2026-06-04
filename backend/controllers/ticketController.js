const pool = require('../config/db');

// 1. Hàm lấy chi tiết vé
const getTicketsByMatch = async (req, res) => {
    const { matchId } = req.params;
    try {
        const query = `
            SELECT 
                id, match_id AS "matchId", order_id AS "orderId",
                seat_code AS "seatCode", sector, row, seat_number AS "seatNumber",
                price, status, ticket_qr_code AS "ticketQrCode", is_scanned AS "isScanned"
            FROM tickets 
            WHERE match_id = $1 
            ORDER BY seat_code ASC
        `;
        const result = await pool.query(query, [matchId]);
        res.json(result.rows); 
    } catch (err) {
        res.status(500).json({ message: "Không thể lấy danh sách ghế" });
    }
};

// 2. Hàm lấy mảng ghế đã bán
const getSoldSeatsByMatch = async (req, res) => {
    const { matchId } = req.params;
    try {
        const query = `
            SELECT seat_code AS "seatCode"
            FROM tickets 
            WHERE match_id = $1 AND status = 'SOLD'
        `;
        const result = await pool.query(query, [matchId]);
        const soldSeats = result.rows.map(row => row.seatCode);
        res.json(soldSeats);
    } catch (err) {
        res.status(500).json({ message: "Không thể tải danh sách ghế đã bán", error: err.message });
    }
};

// 3. Hàm siêu tốc dành cho Admin sinh toàn bộ ghế
const generateAllSeats = async (req, res) => {
    const matchId = Number(req.params.matchId); 
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const matchResult = await client.query('SELECT id FROM matches WHERE id = $1', [matchId]);
        if (matchResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Không tìm thấy trận đấu.' });
        }

        const reservedTickets = await client.query(
            "SELECT 1 FROM tickets WHERE match_id = $1 AND status <> 'AVAILABLE' LIMIT 1",
            [matchId]
        );
        if (reservedTickets.rowCount > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'Không thể sinh lại vé vì trận đấu đã có ghế được đặt hoặc bán.' });
        }

        await client.query('DELETE FROM tickets WHERE match_id = $1', [matchId]);

  const query = `
            INSERT INTO tickets (match_id, seat_code, sector, row, seat_number, price, status)
            SELECT $1::int, 'A' || r.r_num || '-' || LPAD(s.s_num::text, 2, '0'), 'A' || r.r_num, r.r_num::text, s.s_num, 100000, 'AVAILABLE'::ticket_status
            FROM generate_series(1, 20) r(r_num) CROSS JOIN generate_series(1, 40) s(s_num)
            UNION ALL
            SELECT $1::int, 'B' || r.r_num || '-' || LPAD(s.s_num::text, 2, '0'), 'B' || r.r_num, r.r_num::text, s.s_num, 50000, 'AVAILABLE'::ticket_status
            FROM generate_series(1, 15) r(r_num) CROSS JOIN generate_series(1, 40) s(s_num)
            UNION ALL
            SELECT $1::int, 'C' || r.r_num || '-' || LPAD(s.s_num::text, 2, '0'), 'C' || r.r_num, r.r_num::text, s.s_num, 20000, 'AVAILABLE'::ticket_status
            FROM generate_series(1, 10) r(r_num) CROSS JOIN generate_series(1, 30) s(s_num)
            UNION ALL
            SELECT $1::int, 'D' || r.r_num || '-' || LPAD(s.s_num::text, 2, '0'), 'D' || r.r_num, r.r_num::text, s.s_num, 20000, 'AVAILABLE'::ticket_status
            FROM generate_series(1, 10) r(r_num) CROSS JOIN generate_series(1, 30) s(s_num);
        `;

        await client.query(query, [matchId]);
        await client.query('COMMIT');
        res.json({ message: "Thành công!" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};
module.exports = { getTicketsByMatch, getSoldSeatsByMatch, generateAllSeats };
