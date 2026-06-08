const pool = require('../config/db');
const { writeAuditLog } = require('../utils/auditLog');
const { v4: uuidv4 } = require('uuid');

const STAND_CONFIGS = [
    { prefix: 'A', rows: 80, seatsPerRow: 100, price: 100000 },
    { prefix: 'B', rows: 60, seatsPerRow: 100, price: 50000 },
    { prefix: 'C', rows: 30, seatsPerRow: 100, price: 20000 },
    { prefix: 'D', rows: 30, seatsPerRow: 100, price: 20000 },
];

const ensureFreeStandsColumn = (db = pool) => db.query(
    `ALTER TABLE matches ADD COLUMN IF NOT EXISTS free_stands text[] DEFAULT '{}'::text[];
     ALTER TABLE matches ADD COLUMN IF NOT EXISTS stand_prices jsonb DEFAULT '{"A":100000,"B":50000,"C":20000,"D":20000}'::jsonb;`
);

const ensureTicketScanColumn = (db = pool) => db.query(
    `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_scanned boolean DEFAULT false;
     CREATE INDEX IF NOT EXISTS tickets_match_id_idx ON tickets (match_id);
     CREATE INDEX IF NOT EXISTS tickets_match_status_idx ON tickets (match_id, status);
     CREATE INDEX IF NOT EXISTS tickets_match_seat_code_idx ON tickets (match_id, seat_code);`
);

const ensureTicketStatusValues = async (db = pool) => {
    await db.query("ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'PAPER_RESERVED'");
    await db.query("ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'PAPER_SOLD'");
};

// 1. Hàm lấy chi tiết vé
const getTicketsByMatch = async (req, res) => {
    const { matchId } = req.params;
    try {
        await ensureTicketScanColumn();
        await ensureTicketStatusValues();
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
        console.error('Không thể lấy danh sách ghế:', err.message);
        res.status(500).json({ message: "Không thể lấy danh sách ghế", error: err.message });
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
        const matchResult = await client.query('SELECT id, free_stands, stand_prices FROM matches WHERE id = $1', [matchId]);
        if (matchResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Không tìm thấy trận đấu.' });
        }

        const freeStands = matchResult.rows[0].free_stands || [];
        const standPrices = { A: 100000, B: 50000, C: 20000, D: 20000, ...(matchResult.rows[0].stand_prices || {}) };
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
            const price = freeStands.includes(stand.prefix) ? 0 : Number(standPrices[stand.prefix] ?? stand.price);
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
            const price = freeStands.includes(stand.prefix) ? 0 : Number(standPrices[stand.prefix] ?? stand.price);
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

const getTicketInventoryByMatch = async (req, res) => {
    const { matchId } = req.params;
    try {
        await ensureTicketScanColumn();
        await ensureTicketStatusValues();
        const result = await pool.query(
            `SELECT
                SUBSTRING(seat_code FROM 1 FOR 1) AS stand,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available,
                COUNT(*) FILTER (WHERE status = 'SOLD')::int AS sold,
                COUNT(*) FILTER (WHERE status = 'PAPER_RESERVED')::int AS "paperReserved",
                COUNT(*) FILTER (WHERE status = 'PAPER_SOLD')::int AS "paperSold",
                COUNT(*) FILTER (WHERE status IN ('SOLD', 'PAPER_SOLD') AND is_scanned = true)::int AS scanned,
                COALESCE(SUM(price) FILTER (WHERE status = 'SOLD'), 0)::int AS revenue,
                COALESCE(SUM(price) FILTER (WHERE status = 'PAPER_SOLD'), 0)::int AS "paperRevenue"
             FROM tickets
             WHERE match_id = $1
             GROUP BY stand
             ORDER BY stand ASC`,
            [matchId]
        );

        const inventory = {};
        for (const row of result.rows) {
            inventory[row.stand] = {
                total: row.total,
                available: row.available,
                sold: row.sold,
                paperReserved: row.paperReserved,
                paperSold: row.paperSold,
                scanned: row.scanned,
                revenue: row.revenue,
                paperRevenue: row.paperRevenue,
            };
        }

        res.json(inventory);
    } catch (err) {
        res.status(500).json({ message: 'Không thể tải tồn kho vé.', error: err.message });
    }
};

const updatePaperTickets = async (req, res) => {
    const matchId = Number(req.params.matchId);
    const { stand, quantity, mode } = req.body;
    const normalizedStand = String(stand || '').toUpperCase();
    const ticketCount = Number(quantity);

    if (!STAND_CONFIGS.some((item) => item.prefix === normalizedStand)) {
        return res.status(400).json({ message: 'Khán đài không hợp lệ.' });
    }

    if (!Number.isInteger(ticketCount) || ticketCount <= 0) {
        return res.status(400).json({ message: 'Số lượng vé giấy phải lớn hơn 0.' });
    }

    if (!['RESERVE', 'RELEASE', 'MARK_SOLD', 'UNMARK_SOLD'].includes(mode)) {
        return res.status(400).json({ message: 'Thao tác vé giấy không hợp lệ.' });
    }

    const client = await pool.connect();
    try {
        await ensureTicketStatusValues();
        const statusTransitions = {
            RESERVE: { from: 'AVAILABLE', to: 'PAPER_RESERVED' },
            RELEASE: { from: 'PAPER_RESERVED', to: 'AVAILABLE' },
            MARK_SOLD: { from: 'PAPER_RESERVED', to: 'PAPER_SOLD' },
            UNMARK_SOLD: { from: 'PAPER_SOLD', to: 'PAPER_RESERVED' },
        };
        const { from: fromStatus, to: toStatus } = statusTransitions[mode];

        await client.query('BEGIN');
        const selectedResult = await client.query(
            `WITH selected_tickets AS (
                SELECT id, ticket_qr_code
                FROM tickets
                WHERE match_id = $1
                AND SUBSTRING(seat_code FROM 1 FOR 1) = $2
                AND status = $3
                ORDER BY row::int ASC, seat_number ASC
                LIMIT $4
             )
             SELECT id, ticket_qr_code AS "ticketQrCode"
             FROM selected_tickets`,
            [matchId, normalizedStand, fromStatus, ticketCount]
        );

        for (const ticket of selectedResult.rows) {
            const nextQrCode = mode === 'RELEASE'
                ? null
                : ticket.ticketQrCode || `TICKET-${uuidv4().substring(0, 12).toUpperCase()}`;

            await client.query(
                `UPDATE tickets
                 SET status = $1, ticket_qr_code = $2
                 WHERE id = $3`,
                [toStatus, nextQrCode, ticket.id]
            );
        }
        await client.query('COMMIT');

        await writeAuditLog({
            userId: req.user.id,
            action: {
                RESERVE: 'PAPER_TICKETS_RESERVED',
                RELEASE: 'PAPER_TICKETS_RELEASED',
                MARK_SOLD: 'PAPER_TICKETS_SOLD',
                UNMARK_SOLD: 'PAPER_TICKETS_UNSOLD',
            }[mode],
            entityType: 'match',
            entityId: matchId,
            metadata: { stand: normalizedStand, requested: ticketCount, updated: selectedResult.rowCount }
        });

        const messages = {
            RESERVE: `Đã giữ ${selectedResult.rowCount} vé giấy cho khán đài ${normalizedStand}.`,
            RELEASE: `Đã trả ${selectedResult.rowCount} vé giấy về bán online cho khán đài ${normalizedStand}.`,
            MARK_SOLD: `Đã ghi nhận bán ${selectedResult.rowCount} vé giấy cho khán đài ${normalizedStand}.`,
            UNMARK_SOLD: `Đã hoàn ${selectedResult.rowCount} vé giấy đã bán về trạng thái đang giữ.`,
        };

        res.json({
            message: messages[mode],
            updatedCount: selectedResult.rowCount
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Không thể cập nhật vé giấy.', error: err.message });
    } finally {
        client.release();
    }
};

const getPaperTicketsByMatch = async (req, res) => {
    const { matchId } = req.params;
    const stand = String(req.query.stand || '').toUpperCase();
    const status = String(req.query.status || '').toUpperCase();
    const values = [matchId];
    const filters = ['t.match_id = $1', "t.status IN ('PAPER_RESERVED', 'PAPER_SOLD')"];

    if (STAND_CONFIGS.some((item) => item.prefix === stand)) {
        values.push(stand);
        filters.push(`SUBSTRING(t.seat_code FROM 1 FOR 1) = $${values.length}`);
    }

    if (status === 'PAPER_RESERVED' || status === 'PAPER_SOLD') {
        values.push(status);
        filters.push(`t.status = $${values.length}`);
    }

    try {
        await ensureTicketStatusValues();
        const missingQrResult = await pool.query(
            `SELECT t.id
             FROM tickets t
             WHERE ${filters.join(' AND ')}
             AND t.ticket_qr_code IS NULL`,
            values
        );

        for (const ticket of missingQrResult.rows) {
            await pool.query(
                'UPDATE tickets SET ticket_qr_code = $1 WHERE id = $2',
                [`TICKET-${uuidv4().substring(0, 12).toUpperCase()}`, ticket.id]
            );
        }

        const result = await pool.query(
            `SELECT
                t.id,
                t.seat_code AS "seatCode",
                t.sector,
                t.row,
                t.seat_number AS "seatNumber",
                t.price,
                t.status,
                t.ticket_qr_code AS "ticketQrCode",
                m.opponent,
                m.match_date AS "matchDate",
                m.stadium,
                m.competition_name AS "competitionName"
             FROM tickets t
             JOIN matches m ON m.id = t.match_id
             WHERE ${filters.join(' AND ')}
             ORDER BY t.row::int ASC, t.seat_number ASC`,
            values
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Không thể tải danh sách vé giấy.', error: err.message });
    }
};

const scanTicket = async (req, res) => {
    const ticketQrCode = String(req.body.ticketQrCode || '').trim().toUpperCase();

    if (!ticketQrCode) {
        return res.status(400).json({ message: 'Vui lòng nhập hoặc quét mã vé.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureTicketScanColumn(client);

        const ticketResult = await client.query(
            `SELECT
                t.id,
                t.seat_code AS "seatCode",
                t.status,
                t.is_scanned AS "isScanned",
                t.ticket_qr_code AS "ticketQrCode",
                o.status AS "orderStatus",
                u.full_name AS "customerName",
                m.opponent,
                m.match_date AS "matchDate",
                m.stadium
             FROM tickets t
             LEFT JOIN orders o ON o.id = t.order_id
             LEFT JOIN users u ON u.id = o.user_id
             LEFT JOIN matches m ON m.id = t.match_id
             WHERE t.ticket_qr_code = $1
             FOR UPDATE OF t`,
            [ticketQrCode]
        );

        if (ticketResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Không tìm thấy vé với mã QR này.' });
        }

        const ticket = ticketResult.rows[0];
        const isOnlineTicketValid = ticket.status === 'SOLD' && ticket.orderStatus !== 'CANCELLED';
        const isPaperTicketValid = ticket.status === 'PAPER_SOLD';
        if (!isOnlineTicketValid && !isPaperTicketValid) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'Vé không hợp lệ hoặc đơn đã bị hủy.', ticket });
        }

        if (ticket.isScanned) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'Vé này đã được soát trước đó.', ticket });
        }

        await client.query('UPDATE tickets SET is_scanned = true WHERE id = $1', [ticket.id]);
        await client.query('COMMIT');
        await writeAuditLog({ userId: req.user.id, action: 'TICKET_SCANNED', entityType: 'ticket', entityId: ticket.id, metadata: { ticketQrCode, seatCode: ticket.seatCode } });

        res.json({ message: 'Soát vé thành công.', ticket: { ...ticket, isScanned: true } });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Không thể soát vé.' });
    } finally {
        client.release();
    }
};

module.exports = { getTicketsByMatch, getSoldSeatsByMatch, getTicketInventoryByMatch, generateAllSeats, updatePaperTickets, getPaperTicketsByMatch, scanTicket };
