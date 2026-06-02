const pool = require('../config/db');

const getDashboardStats = async (req, res) => {
  try {
    // 1. Tính tổng doanh thu từ các đơn hàng thành công
    const revenueResult = await pool.query(
      "SELECT SUM(total_amount) as total_revenue FROM orders WHERE status = 'SUCCESS'"
    );
    
    // 2. Đếm tổng số vé đã bán thành công
    const ticketsResult = await pool.query(
      "SELECT COUNT(*) as total_tickets_sold FROM tickets WHERE status = 'SOLD'"
    );

    // 3. Đếm tổng số cổ động viên đăng ký tài khoản
    const usersResult = await pool.query(
      "SELECT COUNT(*) as total_users FROM users WHERE role = 'USER'"
    );

    res.json({
      totalRevenue: revenueResult.rows[0].total_revenue || 0,
      totalTicketsSold: ticketsResult.rows[0].total_tickets_sold || 0,
      totalUsers: usersResult.rows[0].total_users || 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Không thể tải dữ liệu thống kê Admin.' });
  }
};

module.exports = { getDashboardStats };