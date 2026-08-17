const pool = require('../config/db');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const { writeAuditLog } = require('../utils/auditLog');
const { releaseExpiredOrders } = require('../utils/orderLifecycle');

const assignTicketQrCodes = async (client, orderIds) => {
  const tickets = await client.query(
    `SELECT id FROM tickets
     WHERE order_id = ANY($1::int[]) AND ticket_qr_code IS NULL
     FOR UPDATE`,
    [orderIds]
  );
  for (const ticket of tickets.rows) {
    await client.query(
      'UPDATE tickets SET ticket_qr_code = $1 WHERE id = $2',
      [`TICKET-${uuidv4().substring(0, 12).toUpperCase()}`, ticket.id]
    );
  }
};

const getDashboardStats = async (req, res) => {
  const { year, matchId } = req.query;
  const filters = ["o.status = 'SUCCESS'"];
  const params = [];

  if (year && (!Number.isInteger(Number(year)) || Number(year) < 2000 || Number(year) > 2100)) {
    return res.status(400).json({ message: 'Năm thống kê không hợp lệ.' });
  }
  if (matchId && (!Number.isInteger(Number(matchId)) || Number(matchId) <= 0)) {
    return res.status(400).json({ message: 'Mã trận đấu không hợp lệ.' });
  }

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

    const monthlyRevenueResult = await pool.query(
      `SELECT TO_CHAR(o.created_at, 'YYYY-MM') AS month, COALESCE(SUM(o.total_amount), 0)::int AS revenue
       FROM orders o
       WHERE ${whereClause}
       GROUP BY month
       ORDER BY month ASC`,
      params
    );

    const ticketsByMatchResult = await pool.query(
      `SELECT m.id, m.opponent, COUNT(o.id)::int AS "ticketsSold"
       FROM matches m
       LEFT JOIN tickets t ON t.match_id = m.id AND t.status = 'SOLD'
       LEFT JOIN orders o ON o.id = t.order_id AND o.status = 'SUCCESS'
       GROUP BY m.id, m.opponent
       ORDER BY "ticketsSold" DESC
       LIMIT 8`
    );

    res.json({
      totalRevenue: revenueResult.rows[0].total_revenue || 0,
      totalTicketsSold: ticketsResult.rows[0].total_tickets_sold || 0,
      totalUsers: usersResult.rows[0].total_users || 0,
      pendingOrders: pendingOrdersResult.rows[0].pending_orders || 0,
      monthlyRevenue: monthlyRevenueResult.rows,
      ticketsByMatch: ticketsByMatchResult.rows
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
    await releaseExpiredOrders(client);

    const currentOrderResult = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (currentOrderResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    const currentStatus = currentOrderResult.rows[0].status;
    if (currentStatus === status) {
      await client.query('COMMIT');
      return res.json({ message: 'Trạng thái đơn hàng không thay đổi.', id: Number(id), status });
    }

    if (currentStatus !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Chỉ đơn đang chờ xử lý mới có thể được duyệt hoặc hủy.' });
    }

    const orderResult = await client.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status',
      [status, id]
    );

    if (status === 'CANCELLED') {
      await client.query(
        `UPDATE tickets
         SET status = 'AVAILABLE', order_id = NULL, ticket_qr_code = NULL
         WHERE order_id = $1`,
        [id]
      );
    } else if (status === 'SUCCESS') {
      await assignTicketQrCodes(client, [Number(id)]);
    }

    await client.query('COMMIT');
    await writeAuditLog({ userId: req.user.id, action: 'ORDER_STATUS_UPDATED', entityType: 'order', entityId: id, metadata: { status } });
    res.json({ message: 'Đã cập nhật trạng thái đơn hàng.', ...orderResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Không thể cập nhật trạng thái đơn hàng.' });
  } finally {
    client.release();
  }
};

const bulkUpdateOrderStatus = async (req, res) => {
  const { ids, status } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'Vui lòng chọn ít nhất một đơn hàng.' });
  }

  if (!['SUCCESS', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ message: 'Chỉ hỗ trợ duyệt hoặc hủy hàng loạt.' });
  }

  const orderIds = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (orderIds.length === 0) {
    return res.status(400).json({ message: 'Danh sách đơn hàng không hợp lệ.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await releaseExpiredOrders(client);

    const ordersResult = await client.query(
      `SELECT id, status
       FROM orders
       WHERE id = ANY($1::int[])
       FOR UPDATE`,
      [orderIds]
    );

    const pendingOrderIds = ordersResult.rows
      .filter((order) => order.status === 'PENDING')
      .map((order) => order.id);

    if (pendingOrderIds.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Không có đơn chờ xử lý nào để cập nhật.' });
    }

    const updateResult = await client.query(
      `UPDATE orders
       SET status = $1, updated_at = NOW()
       WHERE id = ANY($2::int[])
       AND status = 'PENDING'
       RETURNING id, status`,
      [status, pendingOrderIds]
    );

    if (status === 'CANCELLED') {
      await client.query(
        `UPDATE tickets
         SET status = 'AVAILABLE', order_id = NULL, ticket_qr_code = NULL
         WHERE order_id = ANY($1::int[])`,
        [pendingOrderIds]
      );
    } else {
      await assignTicketQrCodes(client, pendingOrderIds);
    }

    await client.query('COMMIT');
    await writeAuditLog({
      userId: req.user.id,
      action: 'ORDER_BULK_STATUS_UPDATED',
      entityType: 'order',
      metadata: { status, orderIds: pendingOrderIds, count: updateResult.rowCount }
    });

    res.json({
      message: `Đã cập nhật ${updateResult.rowCount} đơn hàng.`,
      updatedCount: updateResult.rowCount,
      skippedCount: orderIds.length - updateResult.rowCount,
      orders: updateResult.rows
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Không thể cập nhật hàng loạt đơn hàng.' });
  } finally {
    client.release();
  }
};

const getUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        email,
        full_name AS "fullName",
        phone_number AS "phoneNumber",
        cccd,
        pending_cccd AS "pendingCccd",
        cccd_status AS "cccdStatus",
        cccd_verified_at AS "cccdVerifiedAt",
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
       SET status = $1, token_version = token_version + 1
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

const reviewUserIdentity = async (req, res) => {
  const { id } = req.params;
  const { decision } = req.body;

  if (!['APPROVE', 'REJECT'].includes(decision)) {
    return res.status(400).json({ message: 'Quyết định duyệt CCCD không hợp lệ.' });
  }

  try {
    const userResult = await pool.query(
      'SELECT id, pending_cccd, cccd FROM users WHERE id = $1 AND role <> $2',
      [id, 'ADMIN']
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    const user = userResult.rows[0];
    if (user.cccd) {
      return res.status(409).json({ message: 'Người dùng này đã được xác minh CCCD.' });
    }

    if (!user.pending_cccd) {
      return res.status(400).json({ message: 'Người dùng chưa gửi CCCD để duyệt.' });
    }

    const result = decision === 'APPROVE'
      ? await pool.query(
        `UPDATE users
         SET cccd = pending_cccd,
             pending_cccd = NULL,
             cccd_status = 'VERIFIED',
             cccd_verified_at = NOW()
         WHERE id = $1 AND cccd IS NULL
         RETURNING id, cccd, cccd_status AS "cccdStatus"`,
        [id]
      )
      : await pool.query(
        `UPDATE users
         SET pending_cccd = NULL,
             cccd_status = 'REJECTED'
         WHERE id = $1 AND cccd IS NULL
         RETURNING id, cccd, cccd_status AS "cccdStatus"`,
        [id]
      );

    await writeAuditLog({
      userId: req.user.id,
      action: decision === 'APPROVE' ? 'CCCD_APPROVED' : 'CCCD_REJECTED',
      entityType: 'user',
      entityId: id,
      metadata: { cccdLastFour: user.pending_cccd.slice(-4) }
    });

    res.json({ message: decision === 'APPROVE' ? 'Đã duyệt CCCD.' : 'Đã từ chối CCCD.', ...result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'CCCD này đã được dùng cho tài khoản khác.' });
    }
    res.status(500).json({ message: 'Không thể duyệt CCCD.' });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        al.id,
        al.user_id AS "userId",
        u.email AS "userEmail",
        al.action,
        al.entity_type AS "entityType",
        al.entity_id AS "entityId",
        al.metadata,
        al.created_at AS "createdAt"
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Không thể tải lịch sử hoạt động.' });
  }
};

const exportOrdersReport = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        o.id,
        u.full_name AS "customerName",
        u.email AS "customerEmail",
        u.cccd,
        o.total_amount AS "totalAmount",
        o.status,
        o.payment_method AS "paymentMethod",
        o.order_qr_code AS "orderQrCode",
        o.created_at AS "createdAt",
        COUNT(t.id)::int AS "ticketCount",
        STRING_AGG(DISTINCT m.opponent, ', ') AS "opponents",
        STRING_AGG(t.seat_code, ', ' ORDER BY t.seat_code) AS "seatCodes"
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN tickets t ON t.order_id = o.id
      LEFT JOIN matches m ON m.id = t.match_id
      GROUP BY o.id, u.full_name, u.email, u.cccd
      ORDER BY o.created_at DESC
    `);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SLNA Ticketing';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Don hang');
    worksheet.columns = [
      { header: 'Mã đơn', key: 'id', width: 10 },
      { header: 'Khách hàng', key: 'customerName', width: 24 },
      { header: 'Email', key: 'customerEmail', width: 28 },
      { header: 'CCCD', key: 'cccd', width: 16 },
      { header: 'Trận đấu', key: 'opponents', width: 28 },
      { header: 'Số ghế', key: 'seatCodes', width: 40 },
      { header: 'Số vé', key: 'ticketCount', width: 10 },
      { header: 'Tổng tiền', key: 'totalAmount', width: 16 },
      { header: 'Trạng thái', key: 'status', width: 14 },
      { header: 'Thanh toán', key: 'paymentMethod', width: 18 },
      { header: 'Mã QR đơn', key: 'orderQrCode', width: 20 },
      { header: 'Ngày tạo', key: 'createdAt', width: 22 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003078' } };

    for (const row of result.rows) {
      worksheet.addRow({
        ...row,
        totalAmount: Number(row.totalAmount || 0),
        createdAt: row.createdAt ? new Date(row.createdAt).toLocaleString('vi-VN') : '',
      });
    }

    worksheet.getColumn('totalAmount').numFmt = '#,##0';
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    const summary = workbook.addWorksheet('Tong quan');
    const totalRevenue = result.rows
      .filter((row) => row.status === 'SUCCESS')
      .reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    summary.addRows([
      ['Chỉ số', 'Giá trị'],
      ['Tổng số đơn', result.rows.length],
      ['Đơn thành công', result.rows.filter((row) => row.status === 'SUCCESS').length],
      ['Đơn chờ xử lý', result.rows.filter((row) => row.status === 'PENDING').length],
      ['Đơn đã hủy', result.rows.filter((row) => row.status === 'CANCELLED').length],
      ['Doanh thu đơn thành công', totalRevenue],
    ]);
    summary.getRow(1).font = { bold: true };
    summary.columns = [{ width: 28 }, { width: 22 }];

    await writeAuditLog({ userId: req.user.id, action: 'ORDERS_REPORT_EXPORTED', entityType: 'report', metadata: { rows: result.rows.length } });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="slna-orders-report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Không thể xuất báo cáo Excel.' });
  }
};

module.exports = {
  getDashboardStats,
  getOrders,
  updateOrderStatus,
  bulkUpdateOrderStatus,
  getUsers,
  updateUserStatus,
  reviewUserIdentity,
  getAuditLogs,
  exportOrdersReport
};
