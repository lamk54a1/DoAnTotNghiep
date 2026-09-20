const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('node:crypto');
const { writeAuditLog } = require('../utils/auditLog');
const { ORDER_EXPIRY_MINUTES, releaseExpiredOrders, expirePendingOrders } = require('../utils/orderLifecycle');
const { isSepayConfigured } = require('../services/sepayService');

const paymentMethods = new Set(['BANK_TRANSFER', 'CASH', 'SEPAY']);

const isSepayReady = async () => {
    if (!isSepayConfigured()) return false;
    const result = await pool.query("SELECT to_regclass('public.sepay_transactions') IS NOT NULL AS ready");
    return result.rows[0]?.ready === true;
};

const buildPaymentQrCode = ({ totalAmount, orderQrCode, paymentMethod }) => {
    const bankId = String(process.env.BANK_ID || '').trim();
    const accountNo = String(process.env.BANK_ACCOUNT_NO || '').trim();
    const accountName = String(process.env.BANK_ACCOUNT_NAME || '').trim();
    if (!bankId || !accountNo || !accountName) return null;

    const query = new URLSearchParams({
        amount: String(totalAmount),
        addInfo: paymentMethod === 'SEPAY' ? orderQrCode : `THANH TOAN VE ${orderQrCode}`,
        accountName,
    });
    return `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNo)}-compact2.png?${query}`;
};

const createOrder = async (req, res) => {
    const { tickets } = req.body;
    const matchId = Number(req.body.matchId);
    const normalizedPaymentMethod = String(req.body.paymentMethod || '').toUpperCase();
    const userId = req.user.id;
    const uniqueTickets = Array.isArray(tickets)
        ? [...new Set(tickets.map((ticket) => String(ticket).trim()).filter(Boolean))]
        : [];

    if (!Number.isInteger(matchId) || matchId <= 0 || uniqueTickets.length === 0 || uniqueTickets.length > 4 || uniqueTickets.length !== tickets?.length) {
        return res.status(400).json({ message: 'Mỗi đơn hàng phải có từ 1 đến 4 ghế hợp lệ.' });
    }
    if (uniqueTickets.some((ticket) => ticket.length > 30)) {
        return res.status(400).json({ message: 'Danh sách ghế không hợp lệ.' });
    }
    if (!paymentMethods.has(normalizedPaymentMethod)) {
        return res.status(400).json({ message: 'Phương thức thanh toán không hợp lệ.' });
    }
    if (normalizedPaymentMethod === 'SEPAY') {
        try {
            if (!await isSepayReady()) return res.status(503).json({ message: 'SePay chưa sẵn sàng. Vui lòng chọn phương thức thanh toán khác.' });
        } catch {
            return res.status(503).json({ message: 'SePay chưa sẵn sàng. Vui lòng chọn phương thức thanh toán khác.' });
        }
    }

    const client = await pool.connect();

    try {
        const userIdentityResult = await client.query(
            'SELECT cccd, cccd_status FROM users WHERE id = $1',
            [userId]
        );

        if (userIdentityResult.rowCount === 0 || !userIdentityResult.rows[0].cccd || userIdentityResult.rows[0].cccd_status !== 'VERIFIED') {
            return res.status(403).json({ message: 'Vui lòng xác minh CCCD và chờ admin duyệt trước khi mua vé.' });
        }
        const buyerCccd = userIdentityResult.rows[0].cccd;

        await client.query('BEGIN');
        await releaseExpiredOrders(client);

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
        if (normalizedPaymentMethod === 'SEPAY' && (!Number.isSafeInteger(totalAmount) || totalAmount < 1000)) {
            throw Object.assign(new Error('Đơn thanh toán SePay phải từ 1.000đ.'), { statusCode: 400 });
        }
        // Mã này chỉ dùng để đối soát đơn, không phải QR vào sân.
        const orderQrCode = normalizedPaymentMethod === 'SEPAY'
            ? `SLNA${crypto.randomBytes(6).toString('hex').toUpperCase()}`
            : `ORDER-${uuidv4().substring(0, 8).toUpperCase()}`;
        const paymentQrCode = ['BANK_TRANSFER', 'SEPAY'].includes(normalizedPaymentMethod)
            ? buildPaymentQrCode({ totalAmount, orderQrCode, paymentMethod: normalizedPaymentMethod })
            : null;

        if (['BANK_TRANSFER', 'SEPAY'].includes(normalizedPaymentMethod) && !paymentQrCode) {
            throw Object.assign(new Error('Máy chủ chưa cấu hình tài khoản nhận chuyển khoản.'), { statusCode: 503 });
        }

        // 3. Insert đơn hàng
        const orderRes = await client.query(
            `INSERT INTO orders (
                user_id, total_amount, status, payment_method, order_qr_code, payment_qr_code, expires_at
             ) VALUES ($1, $2, 'PENDING', $3, $4, $5, NOW() + ($6 * INTERVAL '1 minute'))
             RETURNING *`,
            [userId, totalAmount, normalizedPaymentMethod, orderQrCode, paymentQrCode, ORDER_EXPIRY_MINUTES]
        );
        const newOrder = orderRes.rows[0];

        // 4. Cập nhật trực tiếp dựa trên cột seat_code nguyên bản của Database Lãm
        const updatedTickets = [];
        for (const seatCode of uniqueTickets) {
            const tRes = await client.query(
                `UPDATE tickets 
                 SET status = 'SOLD', order_id = $1, ticket_qr_code = NULL,
                     held_by = NULL, held_until = NULL
                 WHERE match_id = $2
                 AND seat_code = $3
                 AND status = 'HELD'
                 AND held_by = $4
                 AND held_until > NOW()
                 RETURNING *`,
                [newOrder.id, matchId, seatCode, userId]
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
            paymentQrCode: newOrder.payment_qr_code,
            expiresAt: newOrder.expires_at,
            totalAmount: newOrder.total_amount,
            status: newOrder.status,
            paymentMethod: newOrder.payment_method,
            tickets: updatedTickets
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("=== LỖI TẠO ĐƠN HÀNG BACKEND ===", err.message);
        const statusCode = err.statusCode || (err.message.includes('ghế') || err.message.includes('giữ') ? 409 : 500);
        res.status(statusCode).json({ message: statusCode === 500 ? 'Không thể tạo đơn hàng.' : err.message });
    } finally {
        client.release();
    }
};

const getPurchasedTicketCountByMatch = async (req, res) => {
    const { matchId } = req.params;

    try {
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
        res.status(500).json({ message: 'Không thể kiểm tra giới hạn vé đã mua.' });
    }
};

const getPaymentOptions = async (_req, res) => {
    try {
        return res.json({ sepayAvailable: await isSepayReady() });
    } catch {
        return res.json({ sepayAvailable: false });
    }
};

const getOrderStatus = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: 'Mã đơn không hợp lệ.' });
    try {
        const result = await pool.query(
            `SELECT id,
                    CASE WHEN status = 'PENDING' AND expires_at <= NOW() THEN 'CANCELLED' ELSE status::text END AS status,
                    payment_method AS "paymentMethod", expires_at AS "expiresAt"
             FROM orders WHERE id = $1 AND user_id = $2`,
            [id, req.user.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        return res.json(result.rows[0]);
    } catch {
        return res.status(500).json({ message: 'Không thể kiểm tra trạng thái đơn hàng.' });
    }
};

const getMyOrders = async (req, res) => {
    try {
        await expirePendingOrders(pool);
        const result = await pool.query(
            `SELECT
                o.id,
                o.total_amount AS "totalAmount",
                o.status,
                o.payment_method AS "paymentMethod",
                o.order_qr_code AS "orderQrCode",
                o.payment_qr_code AS "paymentQrCode",
                o.expires_at AS "expiresAt",
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

module.exports = { createOrder, getPurchasedTicketCountByMatch, getMyOrders, getPaymentOptions, getOrderStatus, buildPaymentQrCode };
