const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { writeAuditLog } = require('../utils/auditLog');

const ensureUserIdentityColumns = (db = pool) => db.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS cccd varchar(12);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_cccd varchar(12);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS cccd_status varchar(20) DEFAULT 'NOT_SUBMITTED';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS cccd_verified_at timestamp;
    UPDATE users
    SET cccd_status = 'VERIFIED',
        cccd_verified_at = COALESCE(cccd_verified_at, NOW())
    WHERE cccd IS NOT NULL
    AND (cccd_status IS NULL OR cccd_status <> 'VERIFIED');
`);

const ensureTicketHoldColumns = (db = pool) => db.query(`
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS held_by integer REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS held_until timestamp;
`);

const createOrder = async (req, res) => {
    const { paymentMethod, tickets, matchId } = req.body;
    const userId = req.user.id;
    const client = await pool.connect();

    try {
        await ensureUserIdentityColumns(client);
        await ensureTicketHoldColumns(client);
        if (!Array.isArray(tickets) || tickets.length === 0 || tickets.length > 4) {
            return res.status(400).json({ message: 'Mỗi đơn hàng phải có từ 1 đến 4 ghế.' });
        }

        const userIdentityResult = await client.query(
            'SELECT cccd, cccd_status FROM users WHERE id = $1',
            [userId]
        );

        if (userIdentityResult.rowCount === 0 || !userIdentityResult.rows[0].cccd || userIdentityResult.rows[0].cccd_status !== 'VERIFIED') {
            return res.status(403).json({ message: 'Vui lòng xác minh CCCD và chờ admin duyệt trước khi mua vé.' });
        }
        const buyerCccd = userIdentityResult.rows[0].cccd;

        const uniqueTickets = [...new Set(tickets)];
        if (uniqueTickets.length !== tickets.length) {
            return res.status(400).json({ message: 'Danh sách ghế không hợp lệ.' });
        }

        await client.query('BEGIN');

        const matchResult = await client.query(
            'SELECT status FROM matches WHERE id = $1 FOR UPDATE',
            [matchId]
        );

        if (matchResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Không tìm thấy trận đấu.' });
        }

        if (matchResult.rows[0].status !== 'ON_SALE') {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'Trận đấu này hiện không mở bán vé.' });
        }

        const purchasedCountResult = await client.query(
            `SELECT COUNT(t.id)::int AS ticket_count
             FROM tickets t
             JOIN orders o ON o.id = t.order_id
             JOIN users u ON u.id = o.user_id
             WHERE u.cccd = $1
             AND t.match_id = $2
             AND o.status <> 'CANCELLED'
             AND t.status = 'SOLD'`,
            [buyerCccd, matchId]
        );
        const purchasedCount = Number(purchasedCountResult.rows[0].ticket_count || 0);

        if (purchasedCount + uniqueTickets.length > 4) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                message: `Bạn chỉ được mua tối đa 4 vé cho trận này. Hiện bạn đã có ${purchasedCount} vé.`
            });
        }

        const inventoryResult = await client.query(
            'SELECT COUNT(*)::int AS ticket_count FROM tickets WHERE match_id = $1',
            [matchId]
        );

        if (Number(inventoryResult.rows[0].ticket_count || 0) === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Kho vé của trận này chưa được khởi tạo. Vui lòng chờ admin sinh vé trước khi đặt.' });
        }

        await client.query(`
            UPDATE tickets
            SET status = 'AVAILABLE', held_by = NULL, held_until = NULL
            WHERE status = 'HELD' AND held_until <= NOW()
        `);

        const ticketPrices = await client.query(
            `SELECT seat_code, price
             FROM tickets
             WHERE match_id = $1
             AND seat_code = ANY($2::text[])
             AND status = 'HELD'
             AND held_by = $3
             AND held_until > NOW()
             FOR UPDATE`,
            [matchId, uniqueTickets, userId]
        );

        if (ticketPrices.rowCount !== uniqueTickets.length) {
            throw new Error('Thời gian giữ ghế đã hết hoặc ghế không còn thuộc phiên của bạn.');
        }

        const totalAmount = ticketPrices.rows.reduce((sum, ticket) => sum + Number(ticket.price), 0);
        const paymentMethodMap = {
            bank: 'BANK_TRANSFER',
            BANK_TRANSFER: 'BANK_TRANSFER',
            momo: 'MOMO',
            MOMO: 'MOMO',
            vnpay: 'VNPAY',
            VNPAY: 'VNPAY',
            cash: 'CASH',
            CASH: 'CASH'
        };
        const normalizedPaymentMethod = paymentMethodMap[paymentMethod] || 'BANK_TRANSFER';

        // 1. Tạo QR Code đơn hàng
        const orderQrCode = `ORDER-${uuidv4().substring(0, 8).toUpperCase()}`;
        
        // 2. Tạo link VietQR
        const paymentQrCode = `https://img.vietqr.io/image/vietcombank-123456-compact.png?amount=${totalAmount}&addInfo=${encodeURIComponent('THANH TOAN VE ' + orderQrCode)}`;

        // 3. Insert đơn hàng
        const orderRes = await client.query(
            `INSERT INTO orders (user_id, total_amount, status, payment_method, order_qr_code, payment_qr_code) 
             VALUES ($1, $2, 'PENDING', $3, $4, $5) RETURNING *`,
            [userId, totalAmount, normalizedPaymentMethod, orderQrCode, paymentQrCode]
        );
        const newOrder = orderRes.rows[0];

        // 4. Cập nhật trực tiếp dựa trên cột seat_code nguyên bản của Database Lãm
        const updatedTickets = [];
        for (const seatCode of uniqueTickets) {
            const ticketQr = `TICKET-${uuidv4().substring(0, 12).toUpperCase()}`;
            
            const tRes = await client.query(
                `UPDATE tickets 
                 SET status = 'SOLD', order_id = $1, ticket_qr_code = $2,
                     held_by = NULL, held_until = NULL
                 WHERE match_id = $3 
                 AND seat_code = $4 
                 AND status = 'HELD'
                 AND held_by = $5
                 AND held_until > NOW()
                 RETURNING *`,
                [newOrder.id, ticketQr, matchId, seatCode, userId]
            );

            if (tRes.rowCount === 0) {
                throw new Error(`Ghế ${seatCode} không tồn tại hoặc đã có người mua trước!`);
            }
            updatedTickets.push(tRes.rows[0]);
        }

        await client.query('COMMIT');
        await writeAuditLog({ userId, action: 'ORDER_CREATED', entityType: 'order', entityId: newOrder.id, metadata: { matchId, ticketCount: uniqueTickets.length, totalAmount } });
        
        res.status(201).json({
            id: newOrder.id,
            orderQrCode: newOrder.order_qr_code,
            tickets: updatedTickets
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("=== LỖI TẠO ĐƠN HÀNG BACKEND ===", err.message);
        res.status(400).json({ message: err.message });
    } finally {
        client.release();
    }
};

const getPurchasedTicketCountByMatch = async (req, res) => {
    const { matchId } = req.params;

    try {
        await ensureUserIdentityColumns();
        const result = await pool.query(
            `SELECT COUNT(t.id)::int AS "ticketCount"
             FROM tickets t
             JOIN orders o ON o.id = t.order_id
             JOIN users u ON u.id = o.user_id
             JOIN users buyer ON buyer.id = $1
             WHERE u.cccd = buyer.cccd
             AND t.match_id = $2
             AND o.status <> 'CANCELLED'
             AND t.status = 'SOLD'`,
            [req.user.id, matchId]
        );

        res.json({ ticketCount: result.rows[0].ticketCount || 0 });
    } catch (err) {
        console.error('Không thể kiểm tra số vé đã mua:', err.message);
        res.json({ ticketCount: 0 });
    }
};

const getMyOrders = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                o.id,
                o.total_amount AS "totalAmount",
                o.status,
                o.payment_method AS "paymentMethod",
                o.order_qr_code AS "orderQrCode",
                o.created_at AS "createdAt",
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', t.id,
                            'seatCode', t.seat_code,
                            'sector', t.sector,
                            'seatNumber', t.seat_number,
                            'price', t.price,
                            'status', t.status,
                            'ticketQrCode', t.ticket_qr_code,
                            'opponent', m.opponent,
                            'matchDate', m.match_date,
                            'stadium', m.stadium,
                            'competitionName', m.competition_name
                        )
                        ORDER BY t.seat_code
                    ) FILTER (WHERE t.id IS NOT NULL),
                    '[]'::json
                ) AS tickets
             FROM orders o
             LEFT JOIN tickets t ON t.order_id = o.id
             LEFT JOIN matches m ON m.id = t.match_id
             WHERE o.user_id = $1
             GROUP BY o.id
             ORDER BY o.created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Không thể tải danh sách vé của bạn.' });
    }
};

module.exports = { createOrder, getPurchasedTicketCountByMatch, getMyOrders };
