const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const createOrder = async (req, res) => {
    const { userId, totalAmount, paymentMethod, tickets, matchId } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Tạo QR Code đơn hàng
        const orderQrCode = `ORDER-${uuidv4().substring(0, 8).toUpperCase()}`;
        
        // 2. Tạo link VietQR
        const paymentQrCode = `https://img.vietqr.io/image/vietcombank-123456-compact.png?amount=${totalAmount}&addInfo=${encodeURIComponent('THANH TOAN VE ' + orderQrCode)}`;

        // 3. Insert đơn hàng
        const orderRes = await client.query(
            `INSERT INTO orders (user_id, total_amount, status, payment_method, order_qr_code, payment_qr_code) 
             VALUES ($1, $2, 'PENDING', $3, $4, $5) RETURNING *`,
            [userId, totalAmount, paymentMethod, orderQrCode, paymentQrCode]
        );
        const newOrder = orderRes.rows[0];

        // 4. Cập nhật trực tiếp dựa trên cột seat_code nguyên bản của Database Lãm
        const updatedTickets = [];
        for (const seatCode of tickets) {
            const ticketQr = `TICKET-${uuidv4().substring(0, 12).toUpperCase()}`;
            
            const tRes = await client.query(
                `UPDATE tickets 
                 SET status = 'SOLD', order_id = $1, ticket_qr_code = $2 
                 WHERE match_id = $3 
                 AND seat_code = $4 
                 AND status = 'AVAILABLE'
                 RETURNING *`,
                [newOrder.id, ticketQr, matchId, seatCode]
            );

            if (tRes.rowCount === 0) {
                throw new Error(`Ghế ${seatCode} không tồn tại hoặc đã có người mua trước!`);
            }
            updatedTickets.push(tRes.rows[0]);
        }

        await client.query('COMMIT');
        
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

module.exports = { createOrder };