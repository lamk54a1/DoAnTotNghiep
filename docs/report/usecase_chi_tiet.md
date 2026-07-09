# Use Case Chi Tiết - SLNA Ticketing

Tài liệu này dùng để bổ sung vào phần phân tích thiết kế hệ thống trong báo cáo đồ án.

## UC01 - Đăng Ký Tài Khoản

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Khán giả |
| Mục tiêu | Tạo tài khoản người dùng để sử dụng hệ thống mua vé. |
| Tiền điều kiện | Người dùng chưa có tài khoản với email đang đăng ký. |
| Hậu điều kiện | Tài khoản được tạo với role `USER`, status `ACTIVE`. |
| Bảng liên quan | `users` |

Luồng chính:

1. Khán giả mở trang đăng ký.
2. Nhập email, mật khẩu, họ tên, số điện thoại và địa chỉ.
3. Frontend gửi request `POST /api/auth/register`.
4. Backend kiểm tra email đã tồn tại hay chưa.
5. Backend hash mật khẩu bằng bcrypt.
6. Backend tạo bản ghi mới trong bảng `users`.
7. Hệ thống thông báo đăng ký thành công và chuyển người dùng tới trang đăng nhập.

Luồng thay thế:

- Nếu email đã tồn tại, hệ thống trả thông báo lỗi.
- Nếu dữ liệu không hợp lệ, frontend/backend yêu cầu nhập lại.

## UC02 - Đăng Nhập

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Khán giả, Quản trị viên |
| Mục tiêu | Xác thực tài khoản và nhận JWT token. |
| Tiền điều kiện | Tài khoản đã tồn tại và chưa bị khóa. |
| Hậu điều kiện | Frontend lưu `access_token` và `user_info` trong localStorage. |
| Bảng liên quan | `users` |

Luồng chính:

1. Người dùng nhập email và mật khẩu.
2. Frontend gửi request `POST /api/auth/login`.
3. Backend tìm user theo email.
4. Backend kiểm tra trạng thái tài khoản.
5. Backend so sánh mật khẩu với hash đã lưu.
6. Backend tạo JWT chứa `id` và `role`.
7. Frontend lưu phiên đăng nhập.
8. Nếu role là `ADMIN`, chuyển tới `/admin/dashboard`; nếu là `USER`, chuyển tới trang chủ hoặc hoàn thiện hồ sơ.

Luồng thay thế:

- Sai email/mật khẩu: trả lỗi đăng nhập.
- Tài khoản bị khóa: trả lỗi không được truy cập.
- Thiếu `JWT_SECRET`: backend dừng khởi động để đảm bảo bảo mật.

## UC03 - Cập Nhật Thông Tin Cá Nhân

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Khán giả |
| Mục tiêu | Cập nhật họ tên, số điện thoại và địa chỉ. |
| Tiền điều kiện | Người dùng đã đăng nhập. |
| Hậu điều kiện | Thông tin hồ sơ được cập nhật, `profile_completed = true`. |
| Bảng liên quan | `users` |

Luồng chính:

1. Người dùng mở trang hồ sơ.
2. Hệ thống tải thông tin qua `GET /api/auth/profile`.
3. Người dùng cập nhật họ tên, số điện thoại, địa chỉ.
4. Frontend gửi request `PUT /api/auth/profile`.
5. Backend kiểm tra token và validate dữ liệu.
6. Backend cập nhật bảng `users`.
7. Frontend cập nhật lại `user_info`.

## UC04 - Xác Minh CCCD

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Khán giả, Quản trị viên |
| Mục tiêu | Xác minh định danh trước khi mua vé. |
| Tiền điều kiện | Người dùng đã đăng nhập và chưa có CCCD đã xác minh. |
| Hậu điều kiện | CCCD được duyệt hoặc từ chối bởi admin. |
| Bảng liên quan | `users`, `audit_logs` |

Luồng chính:

1. Người dùng gửi CCCD từ trang hồ sơ.
2. Backend lưu CCCD vào `pending_cccd`, đặt `cccd_status = PENDING`.
3. Admin mở trang quản lý người dùng.
4. Admin duyệt CCCD.
5. Backend chuyển `pending_cccd` sang `cccd`, đặt `cccd_status = VERIFIED`.
6. Hệ thống ghi audit log thao tác duyệt.

Luồng thay thế:

- CCCD đã tồn tại ở tài khoản khác: hệ thống từ chối.
- Admin từ chối: trạng thái chuyển về chưa xác minh hoặc giữ thông tin chờ chỉnh sửa.

## UC05 - Xem Lịch Thi Đấu

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Khán giả |
| Mục tiêu | Xem danh sách trận đấu và trạng thái mở bán. |
| Tiền điều kiện | Không bắt buộc đăng nhập. |
| Hậu điều kiện | Người dùng chọn được trận để xem chi tiết hoặc đặt vé. |
| Bảng liên quan | `matches`, `tickets` |

Luồng chính:

1. Người dùng mở trang `/matches`.
2. Frontend gọi `GET /api/matches`.
3. Backend trả danh sách trận đấu.
4. Frontend hiển thị đối thủ, thời gian, sân, trạng thái và giá vé.
5. Người dùng chọn một trận để vào chi tiết.

## UC06 - Chọn Ghế Và Giữ Ghế 10 Phút

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Khán giả |
| Mục tiêu | Giữ ghế tạm thời trong lúc người dùng thanh toán. |
| Tiền điều kiện | Người dùng đã đăng nhập; trận đấu đang mở bán; ghế đang `AVAILABLE`. |
| Hậu điều kiện | Ghế chuyển sang `HELD` trong 10 phút. |
| Bảng liên quan | `tickets`, `users` |

Luồng chính:

1. Người dùng mở trang `/booking/[id]`.
2. Frontend tải sơ đồ ghế qua `GET /api/tickets/:matchId`.
3. Người dùng chọn tối đa 4 ghế.
4. Frontend gửi `POST /api/tickets/hold/:matchId`.
5. Backend giải phóng các ghế `HELD` đã quá hạn.
6. Backend cập nhật các ghế hợp lệ:
   - `status = HELD`
   - `held_by = user.id`
   - `held_until = NOW() + INTERVAL '10 minutes'`
7. Frontend hiển thị đồng hồ đếm ngược giữ ghế.

Luồng thay thế:

- Ghế vừa bị người khác giữ: backend trả lỗi `409`.
- Chọn quá 4 ghế: backend trả lỗi validate.
- Hết 10 phút: ghế tự trở về `AVAILABLE`.

## UC07 - Tạo Đơn Đặt Vé Online

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Khán giả |
| Mục tiêu | Tạo đơn hàng và sinh QR vé cho ghế đã giữ. |
| Tiền điều kiện | Người dùng đã xác minh CCCD; ghế đang `HELD` bởi chính người dùng. |
| Hậu điều kiện | Đơn hàng được tạo ở trạng thái `PENDING`, ghế chuyển sang `SOLD`. |
| Bảng liên quan | `orders`, `tickets`, `users`, `matches`, `audit_logs` |

Luồng chính:

1. Người dùng chọn phương thức thanh toán tại checkout.
2. Frontend gửi `POST /api/orders`.
3. Backend kiểm tra CCCD đã `VERIFIED`.
4. Backend kiểm tra giới hạn tối đa 4 vé/trận theo CCCD.
5. Backend kiểm tra ghế còn đang `HELD`, đúng `held_by`, chưa hết hạn.
6. Backend tạo bản ghi trong `orders` với `status = PENDING`.
7. Backend cập nhật từng ghế:
   - `status = SOLD`
   - `order_id = newOrder.id`
   - `ticket_qr_code = TICKET-...`
   - xóa `held_by`, `held_until`
8. Backend ghi audit log `ORDER_CREATED`.
9. Frontend hiển thị thông báo đã tạo đơn và chờ xác nhận thanh toán.

Luồng thay thế:

- Chưa xác minh CCCD: từ chối tạo đơn.
- Ghế hết hạn giữ: trả lỗi và yêu cầu chọn lại.
- Vượt quá 4 vé/trận: trả thông báo giới hạn.

## UC08 - Xem Vé Của Tôi Và In Vé PDF

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Khán giả |
| Mục tiêu | Xem danh sách vé đã mua và in/xuất vé. |
| Tiền điều kiện | Người dùng đã đăng nhập và có đơn hàng. |
| Hậu điều kiện | Người dùng xem được thông tin vé và mã QR. |
| Bảng liên quan | `orders`, `tickets`, `matches` |

Luồng chính:

1. Người dùng mở `/my-tickets`.
2. Frontend gọi `GET /api/orders/my`.
3. Backend trả danh sách đơn và vé liên quan.
4. Frontend hiển thị trận đấu, ghế, giá vé, QR.
5. Người dùng chọn in/xuất vé PDF.

## UC09 - Quản Lý Trận Đấu

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Quản trị viên |
| Mục tiêu | Tạo và quản lý thông tin trận đấu. |
| Tiền điều kiện | Admin đã đăng nhập. |
| Hậu điều kiện | Bảng `matches` được cập nhật. |
| Bảng liên quan | `matches`, `tickets`, `audit_logs` |

Luồng chính:

1. Admin mở `/admin/matches`.
2. Admin nhập thông tin trận: đối thủ, logo, thời gian, sân, giải đấu, giá vé từng khán đài.
3. Frontend gửi `POST /api/matches` hoặc `PUT /api/matches/:id`.
4. Backend kiểm tra quyền admin.
5. Backend lưu dữ liệu vào bảng `matches`.
6. Hệ thống hiển thị trận trên frontend public nếu phù hợp trạng thái.

Luồng thay thế:

- Xóa trận đã có vé bán: hệ thống từ chối hoặc chỉ cho xóa khi vé còn hợp lệ theo điều kiện.

## UC10 - Sinh Kho Vé

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Quản trị viên |
| Mục tiêu | Sinh danh sách ghế/vé cho trận đấu. |
| Tiền điều kiện | Trận đấu đã tồn tại. |
| Hậu điều kiện | Bảng `tickets` có danh sách ghế theo khán đài. |
| Bảng liên quan | `matches`, `tickets`, `audit_logs` |

Luồng chính:

1. Admin chọn trận cần sinh vé.
2. Admin chọn khán đài A/B/C/D.
3. Frontend gửi `POST /api/tickets/generate/:matchId`.
4. Backend đọc cấu hình giá vé trong `stand_prices`.
5. Backend sinh ghế theo cấu hình hàng và số ghế.
6. Ghế mới có trạng thái `AVAILABLE`.

## UC11 - Quản Lý Đơn Hàng

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Quản trị viên |
| Mục tiêu | Theo dõi, xác nhận hoặc hủy đơn hàng. |
| Tiền điều kiện | Admin đã đăng nhập. |
| Hậu điều kiện | Trạng thái đơn và vé được cập nhật nhất quán. |
| Bảng liên quan | `orders`, `tickets`, `audit_logs` |

Luồng chính:

1. Admin mở `/admin/orders`.
2. Frontend gọi `GET /api/admin/orders`.
3. Admin xem thông tin khách hàng, trận đấu, ghế, tổng tiền.
4. Admin xác nhận thanh toán hoặc hủy đơn.
5. Backend cập nhật `orders.status`.
6. Nếu hủy đơn, hệ thống xử lý lại trạng thái vé theo nghiệp vụ.
7. Hệ thống ghi audit log.

## UC12 - Quản Lý Vé Giấy

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Quản trị viên |
| Mục tiêu | Tách một phần kho vé để bán trực tiếp bằng vé giấy. |
| Tiền điều kiện | Trận đã sinh kho vé; còn ghế `AVAILABLE`. |
| Hậu điều kiện | Vé giấy được giữ, in, bán hoặc soát theo trạng thái riêng. |
| Bảng liên quan | `tickets`, `matches`, `audit_logs` |

Luồng chính:

1. Admin mở tồn kho vé của trận.
2. Admin chọn khán đài và số lượng vé giấy.
3. Frontend gửi `PATCH /api/tickets/paper/:matchId` với mode `RESERVE`.
4. Backend chuyển các ghế từ `AVAILABLE` sang `PAPER_RESERVED`.
5. Admin in vé giấy PDF.
6. Backend đánh dấu `is_printed = true`.
7. Khi bán vé giấy, admin chuyển `PAPER_RESERVED` sang `PAPER_SOLD`.

Luồng thay thế:

- Nếu vé giấy đã in, hệ thống không cho trả về online.
- Nếu không còn đủ ghế `AVAILABLE`, hệ thống báo không đủ vé.

## UC13 - Soát Vé QR

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Quản trị viên |
| Mục tiêu | Kiểm tra vé tại cổng sân. |
| Tiền điều kiện | Vé có `ticket_qr_code`; admin đã đăng nhập. |
| Hậu điều kiện | Vé hợp lệ được đánh dấu `is_scanned = true`. |
| Bảng liên quan | `tickets`, `orders`, `matches`, `audit_logs` |

Luồng chính:

1. Admin mở `/admin/scanner`.
2. Admin quét hoặc nhập mã QR.
3. Frontend gửi request tới `POST /api/tickets/scan`.
4. Backend tìm vé theo `ticket_qr_code`.
5. Backend kiểm tra vé online `SOLD` hoặc vé giấy `PAPER_SOLD`.
6. Nếu vé hợp lệ và chưa soát, backend cập nhật `is_scanned = true`.
7. Hệ thống trả thông báo soát vé thành công.

Luồng thay thế:

- Không tìm thấy QR: báo vé không tồn tại.
- Vé chưa bán hoặc đơn bị hủy: báo vé không hợp lệ.
- Vé đã soát: cảnh báo không cho vào lần nữa.

## UC14 - Quản Lý Nhà Tài Trợ

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Quản trị viên |
| Mục tiêu | Quản lý logo và URL nhà tài trợ hiển thị trên trang chủ/vé PDF. |
| Tiền điều kiện | Admin đã đăng nhập. |
| Hậu điều kiện | Nhà tài trợ được hiển thị theo trạng thái và thứ tự. |
| Bảng liên quan | `sponsors` |

Luồng chính:

1. Admin mở `/admin/sponsors`.
2. Admin nhập tên, hạng tài trợ, website, thứ tự hiển thị.
3. Admin upload logo hoặc nhập URL logo.
4. Backend lưu vào bảng `sponsors`.
5. Trang chủ và vé PDF lấy danh sách nhà tài trợ đang active để hiển thị.

## UC15 - Chatbot Hỏi Đáp Thông Tin CLB

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Khán giả |
| Mục tiêu | Hỏi nhanh thông tin về CLB, trận đấu, vé và nhà tài trợ. |
| Tiền điều kiện | Không bắt buộc đăng nhập. |
| Hậu điều kiện | Người dùng nhận được câu trả lời từ chatbot. |
| Bảng liên quan | `matches`, `sponsors` |

Luồng chính:

1. Người dùng mở chatbot ở góc giao diện.
2. Người dùng nhập câu hỏi.
3. Frontend gửi `POST /api/chatbot/ask`.
4. Backend phân tích nội dung câu hỏi.
5. Backend truy vấn dữ liệu trận đấu/nhà tài trợ nếu cần.
6. Backend trả câu trả lời cho frontend.

## UC16 - Xem Thống Kê Doanh Thu

| Mục | Nội dung |
|---|---|
| Tác nhân chính | Quản trị viên |
| Mục tiêu | Theo dõi doanh thu, số vé bán và đơn chờ xử lý. |
| Tiền điều kiện | Admin đã đăng nhập. |
| Hậu điều kiện | Dashboard hiển thị thống kê theo năm/trận. |
| Bảng liên quan | `orders`, `tickets`, `matches`, `users` |

Luồng chính:

1. Admin mở `/admin/dashboard`.
2. Frontend gửi `GET /api/admin/stats`.
3. Backend kiểm tra quyền admin.
4. Backend tổng hợp doanh thu, vé bán, người dùng và đơn chờ xử lý.
5. Frontend hiển thị thẻ thống kê và biểu đồ dạng thanh.

Luồng thay thế:

- Token hết hạn hoặc không phải admin: backend trả `403`, frontend yêu cầu đăng nhập lại.
