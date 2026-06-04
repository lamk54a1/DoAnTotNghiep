const pool = require('../config/db');

const ensureUserIdentityColumns = () => pool.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS cccd varchar(12);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS address text;
  CREATE UNIQUE INDEX IF NOT EXISTS users_cccd_unique_idx ON users (cccd) WHERE cccd IS NOT NULL;
`);

const getDashboardStats = async (req, res) => {
  const { year, matchId } = req.query;
  const filters = ["o.status = 'SUCCESS'"];
  const params = [];

  if (year) {
    params.push(Number(year));
    filters.push(`EXTRACT(YEAR FROM o.created_at) = $${params.length}`);
  }

  if (matchId) {
    params.push(Number(matchId));
    filters.push(`EXISTS (SELECT 1 FROM tickets tx WHERE tx.order_id = o.id AND tx.match_id = $${params.length})`);
  }

  const whereClause = filters.join(' AND ');

  try {
    // 1. Tính tổng doanh thu từ các đơn hàng thành công
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(o.total_amount), 0) as total_revenue
       FROM orders o
       WHERE ${whereClause}`,
      params
    );
    
    // 2. Đếm tổng số vé đã bán thành công
    const ticketsResult = await pool.query(
      `SELECT COUNT(t.id) as total_tickets_sold
       FROM tickets t
       JOIN orders o ON o.id = t.order_id
       WHERE ${whereClause}
       ${matchId ? `AND t.match_id = $${params.length}` : ''}`,
      params
    );

    // 3. Đếm tổng số cổ động viên đăng ký tài khoản
    const usersResult = await pool.query(
      "SELECT COUNT(*) as total_users FROM users WHERE role = 'USER'"
    );

    const pendingOrdersResult = await pool.query(
      "SELECT COUNT(*) as pending_orders FROM orders WHERE status = 'PENDING'"
    );

    res.json({
      totalRevenue: revenueResult.rows[0].total_revenue || 0,
      totalTicketsSold: ticketsResult.rows[0].total_tickets_sold || 0,
      totalUsers: usersResult.rows[0].total_users || 0,
      pendingOrders: pendingOrdersResult.rows[0].pending_orders || 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Không thể tải dữ liệu thống kê Admin.' });
  }
};

const getOrders = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        o.id,
        o.user_id AS "userId",
        u.full_name AS "customerName",
        u.email AS "customerEmail",
        o.total_amount AS "totalAmount",
        o.status,
        o.payment_method AS "paymentMethod",
        o.order_qr_code AS "orderQrCode",
        o.created_at AS "createdAt",
        COUNT(t.id)::int AS "ticketCount",
        STRING_AGG(DISTINCT m.opponent, ', ') AS "opponents"
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN tickets t ON t.order_id = o.id
      LEFT JOIN matches m ON m.id = t.match_id
      GROUP BY o.id, u.full_name, u.email
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Không thể tải danh sách đơn hàng.' });
  }
};

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const allowedStatuses = ['PENDING', 'SUCCESS', 'CANCELLED'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Trạng thái đơn hàng không hợp lệ.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentOrderResult = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (currentOrderResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    if (currentOrderResult.rows[0].status === 'SUCCESS' && status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Đơn hàng đã thành công, không thể hủy vé.' });
    }

    if (currentOrderResult.rows[0].status === 'CANCELLED' && status === 'SUCCESS') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Đơn hàng đã hủy không thể chuyển lại thành công.' });
    }

    const orderResult = await client.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, status',
      [status, id]
    );

    if (status === 'CANCELLED') {
      await client.query(
        `UPDATE tickets
         SET status = 'AVAILABLE', order_id = NULL, ticket_qr_code = NULL
         WHERE order_id = $1`,
        [id]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Đã cập nhật trạng thái đơn hàng.', ...orderResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Không thể cập nhật trạng thái đơn hàng.' });
  } finally {
    client.release();
  }
};

const getUsers = async (req, res) => {
  try {
    await ensureUserIdentityColumns();
    const result = await pool.query(`
      SELECT
        id,
        email,
        full_name AS "fullName",
        phone_number AS "phoneNumber",
        cccd,
        address,
        role,
        status,
        created_at AS "createdAt"
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Không thể tải danh sách người dùng.' });
  }
};

const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['ACTIVE', 'BANNED'].includes(status)) {
    return res.status(400).json({ message: 'Trạng thái tài khoản không hợp lệ.' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET status = $1
       WHERE id = $2 AND role <> 'ADMIN'
       RETURNING id, status`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng hoặc không thể khóa quản trị viên.' });
    }

    res.json({ message: 'Đã cập nhật trạng thái tài khoản.', ...result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Không thể cập nhật trạng thái tài khoản.' });
  }
};

module.exports = {
  getDashboardStats,
  getOrders,
  updateOrderStatus,
  getUsers,
  updateUserStatus
};
