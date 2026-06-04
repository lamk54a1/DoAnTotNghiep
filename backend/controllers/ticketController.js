const pool = require('../config/db');

const STAND_CONFIGS = [
    { prefix: 'A', rows: 80, seatsPerRow: 100, price: 100000 },
    { prefix: 'B', rows: 60, seatsPerRow: 100, price: 50000 },
    { prefix: 'C', rows: 30, seatsPerRow: 100, price: 20000 },
    { prefix: 'D', rows: 30, seatsPerRow: 100, price: 20000 },
];

const ensureFreeStandsColumn = (db = pool) => db.query(
    "ALTER TABLE matches ADD COLUMN IF NOT EXISTS free_stands text[] DEFAULT '{}'::text[]"
);

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
    const requestedStands = Array.isArray(req.body?.stands) ? req.body.stands : STAND_CONFIGS.map((stand) => stand.prefix);
    const allowedStands = new Set(STAND_CONFIGS.map((stand) => stand.prefix));
    const selectedStands = requestedStands.filter((stand) => allowedStands.has(stand));

    if (selectedStands.length === 0) {
        return res.status(400).json({ message: 'Vui lòng chọn ít nhất một khán đài để sinh vé.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureFreeStandsColumn(client);
        const matchResult = await client.query('SELECT id, free_stands FROM matches WHERE id = $1', [matchId]);
        if (matchResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Không tìm thấy trận đấu.' });
        }

        const freeStands = matchResult.rows[0].free_stands || [];
        for (const stand of STAND_CONFIGS.filter((item) => selectedStands.includes(item.prefix))) {
            await client.query(
                `DELETE FROM tickets
                 WHERE match_id = $1
                 AND sector LIKE $2
                 AND status = 'AVAILABLE'
                 AND order_id IS NULL
                 AND (row::int > $3 OR seat_number > $4)`,
                [matchId, `${stand.prefix}%`, stand.rows, stand.seatsPerRow]
            );
        }

        const standQueries = STAND_CONFIGS.filter((stand) => selectedStands.includes(stand.prefix)).map((stand) => {
            const price = freeStands.includes(stand.prefix) ? 0 : stand.price;
            return `
                SELECT
                    $1::int AS match_id,
                    '${stand.prefix}' || r.r_num || '-' || CASE WHEN s.s_num < 100 THEN LPAD(s.s_num::text, 2, '0') ELSE s.s_num::text END AS seat_code,
                    '${stand.prefix}' || r.r_num AS sector,
                    r.r_num::text AS row,
                    s.s_num AS seat_number,
                    ${price} AS price
                FROM generate_series(1, ${stand.rows}) r(r_num)
                CROSS JOIN generate_series(1, ${stand.seatsPerRow}) s(s_num)
            `;
        }).join('\n                UNION ALL\n');

        const query = `
            WITH generated_seats AS (
                ${standQueries}
            )
            INSERT INTO tickets (match_id, seat_code, sector, row, seat_number, price, status)
            SELECT match_id, seat_code, sector, row, seat_number, price, 'AVAILABLE'::ticket_status
            FROM generated_seats gs
            WHERE NOT EXISTS (
                SELECT 1
                FROM tickets t
                WHERE t.match_id = gs.match_id AND t.seat_code = gs.seat_code
            );
        `;

        const result = await client.query(query, [matchId]);
        for (const stand of STAND_CONFIGS.filter((item) => selectedStands.includes(item.prefix))) {
            const price = freeStands.includes(stand.prefix) ? 0 : stand.price;
            await client.query(
                `UPDATE tickets
                 SET price = $1
                 WHERE match_id = $2
                 AND sector LIKE $3
                 AND status = 'AVAILABLE'`,
                [price, matchId, `${stand.prefix}%`]
            );
        }
        await client.query('COMMIT');
        res.json({ message: `Đã bổ sung ${result.rowCount} ghế còn thiếu cho khán đài ${selectedStands.join(', ')}.` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};
module.exports = { getTicketsByMatch, getSoldSeatsByMatch, generateAllSeats };
