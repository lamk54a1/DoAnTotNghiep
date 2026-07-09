# Kịch Bản Kiểm Thử Hệ Thống SLNA Ticketing

Tài liệu này bổ sung cho chương kiểm thử trong báo cáo đồ án. Các kịch bản được viết theo hướng kiểm thử thủ công và có thể chuyển thành test case tự động sau này.

## 1. Bảng Kịch Bản Kiểm Thử Tổng Hợp

| Mã | Nhóm | Kịch bản | Dữ liệu/Điều kiện | Kết quả mong đợi |
|---|---|---|---|---|
| TC01 | Đăng ký | Đăng ký tài khoản hợp lệ | Email chưa tồn tại, mật khẩu hợp lệ, đủ họ tên/SĐT/địa chỉ | Tạo user mới role `USER`, status `ACTIVE`, hiển thị thông báo đăng ký thành công |
| TC02 | Đăng ký | Đăng ký bằng email đã tồn tại | Email đã có trong bảng `users` | Hệ thống trả lỗi “Email này đã được sử dụng” |
| TC03 | Đăng ký | Đăng ký thiếu địa chỉ | Bỏ trống trường địa chỉ | Hệ thống không cho đăng ký và yêu cầu nhập địa chỉ |
| TC04 | Đăng nhập | Đăng nhập đúng tài khoản user | Email/mật khẩu đúng, role `USER` | Backend trả `access_token`, frontend lưu phiên đăng nhập và chuyển trang phù hợp |
| TC05 | Đăng nhập | Đăng nhập đúng tài khoản admin | Email/mật khẩu đúng, role `ADMIN` | Frontend chuyển tới `/admin/dashboard` |
| TC06 | Đăng nhập | Đăng nhập sai mật khẩu | Email tồn tại, mật khẩu sai | Hệ thống trả lỗi đăng nhập, không sinh token |
| TC07 | Đăng nhập | Đăng nhập tài khoản bị khóa | User có `status = BANNED` | Backend trả lỗi 403, không cho truy cập |
| TC08 | Hồ sơ | Cập nhật thông tin cá nhân hợp lệ | Họ tên, SĐT 10 số, địa chỉ hợp lệ | Bảng `users` được cập nhật, `profile_completed = true` |
| TC09 | Hồ sơ | Đổi mật khẩu sai mật khẩu hiện tại | Nhập sai `currentPassword` | Hệ thống từ chối đổi mật khẩu |
| TC10 | Hồ sơ | Đổi email sang email đã tồn tại | Email mới đã được dùng bởi user khác | Backend trả lỗi trùng email |
| TC11 | CCCD | Gửi CCCD hợp lệ | CCCD 12 số, chưa tồn tại | Lưu vào `pending_cccd`, trạng thái `PENDING` |
| TC12 | CCCD | Gửi CCCD đã tồn tại | CCCD đã thuộc tài khoản khác | Backend trả lỗi CCCD đã được sử dụng |
| TC13 | CCCD | Admin duyệt CCCD | User có `pending_cccd` | Chuyển sang `cccd`, `cccd_status = VERIFIED`, ghi audit log |
| TC14 | Trận đấu | Xem danh sách trận đấu public | Không cần đăng nhập | Trang `/matches` hiển thị danh sách trận từ API |
| TC15 | Trận đấu | Admin tạo trận đấu hợp lệ | Đủ đối thủ, thời gian, sân, trạng thái, giá vé | Tạo bản ghi trong `matches`, trận xuất hiện ở trang quản trị |
| TC16 | Trận đấu | User thường gọi API tạo trận | Token role `USER` | Backend trả 403, không tạo trận |
| TC17 | Kho vé | Admin sinh vé cho trận | Trận tồn tại, chọn khán đài A/B/C/D | Tạo các ghế trong bảng `tickets`, status `AVAILABLE` |
| TC18 | Kho vé | Sinh vé lại cho trận đã có ghế | Trận đã có một số ghế | Hệ thống chỉ bổ sung ghế còn thiếu, không tạo trùng `seat_code` |
| TC19 | Booking | Người dùng chọn ghế trống | Ghế `AVAILABLE`, user đăng nhập | Ghế chuyển sang `HELD`, có `held_by`, `held_until` |
| TC20 | Booking | Hai user giữ cùng một ghế | User A giữ trước, User B giữ sau | User B nhận lỗi ghế đã được giữ/mua |
| TC21 | Booking | Giữ quá 4 ghế | Chọn 5 ghế | Backend trả lỗi giới hạn số ghế |
| TC22 | Booking | Ghế hết hạn giữ | Ghế `HELD`, `held_until <= NOW()` | Hệ thống giải phóng về `AVAILABLE` |
| TC23 | Checkout | Tạo đơn khi chưa xác minh CCCD | User chưa có `cccd_status = VERIFIED` | Backend từ chối tạo đơn |
| TC24 | Checkout | Tạo đơn với ghế không thuộc user | Ghế `HELD` bởi user khác | Backend trả lỗi, không tạo đơn |
| TC25 | Checkout | Tạo đơn hợp lệ | User đã xác minh CCCD, ghế đang `HELD` bởi chính user | Tạo `orders` status `PENDING`, ghế chuyển `SOLD`, sinh `ticket_qr_code` |
| TC26 | Checkout | Mua vượt giới hạn 4 vé/trận | CCCD đã có 4 vé trận đó | Backend từ chối tạo đơn mới |
| TC27 | Vé của tôi | Xem danh sách vé đã mua | User có đơn hàng/vé | Trang `/my-tickets` hiển thị trận, ghế, QR |
| TC28 | Vé PDF | In/xuất vé online | Vé có `ticket_qr_code` | Vé PDF hiển thị thông tin CLB, trận, giá vé, QR và nhà tài trợ |
| TC29 | Vé giấy | Admin giữ vé giấy hợp lệ | Còn ghế `AVAILABLE` ở khán đài | Ghế chuyển sang `PAPER_RESERVED` |
| TC30 | Vé giấy | Admin giữ vé giấy khi không đủ ghế | Số lượng yêu cầu lớn hơn ghế còn trống | Backend trả lỗi không đủ vé |
| TC31 | Vé giấy | In vé giấy PDF | Vé `PAPER_RESERVED` | Vé được đánh dấu `is_printed = true`, có QR |
| TC32 | Vé giấy | Trả vé giấy chưa in về online | Vé `PAPER_RESERVED`, `is_printed = false` | Vé chuyển về `AVAILABLE` |
| TC33 | Vé giấy | Trả vé giấy đã in về online | Vé `PAPER_RESERVED`, `is_printed = true` | Backend từ chối, vé vẫn bị khóa khỏi online |
| TC34 | Vé giấy | Đánh dấu vé giấy đã bán | Vé `PAPER_RESERVED` | Vé chuyển sang `PAPER_SOLD`, doanh thu vé giấy tăng |
| TC35 | Soát vé | Soát vé online hợp lệ | Vé `SOLD`, chưa `is_scanned` | Cập nhật `is_scanned = true`, trả thông báo thành công |
| TC36 | Soát vé | Soát vé giấy hợp lệ | Vé `PAPER_SOLD`, chưa `is_scanned` | Cập nhật `is_scanned = true`, trả thông báo thành công |
| TC37 | Soát vé | Soát vé đã soát | Vé đã `is_scanned = true` | Hệ thống cảnh báo vé đã được soát trước đó |
| TC38 | Soát vé | Soát QR không tồn tại | QR không có trong bảng `tickets` | Backend trả 404 không tìm thấy vé |
| TC39 | Admin đơn hàng | Admin xác nhận đơn chờ | Order `PENDING` | Order chuyển trạng thái `PAID`, ghi audit log |
| TC40 | Admin đơn hàng | Admin hủy đơn | Order hợp lệ | Order chuyển `CANCELLED`, vé liên quan được xử lý theo nghiệp vụ |
| TC41 | Dashboard | Xem thống kê doanh thu bằng admin | Token admin hợp lệ | API `/api/admin/stats` trả doanh thu, vé bán, user, đơn chờ |
| TC42 | Dashboard | User thường gọi API dashboard | Token role `USER` | Backend trả 403 |
| TC43 | Inventory public | Gọi API tồn kho public | `GET /api/tickets/inventory/:matchId` | API chỉ trả số lượng vé, không trả `revenue`, `paperRevenue` |
| TC44 | Inventory admin | Admin gọi API tồn kho admin | `GET /api/tickets/admin/inventory/:matchId` | API trả tồn kho kèm doanh thu |
| TC45 | Nhà tài trợ | Admin thêm nhà tài trợ hợp lệ | Tên, level, logo URL, website URL hợp lệ | Tạo bản ghi `sponsors`, hiển thị ở trang chủ |
| TC46 | Nhà tài trợ | Nhập website không hợp lệ | URL không bắt đầu bằng `http://` hoặc `https://` | Backend trả lỗi validate |
| TC47 | Upload | User thường upload logo nhà tài trợ | Token user thường | Backend trả 403 |
| TC48 | Chatbot | Hỏi lịch thi đấu | Câu hỏi về trận sắp tới | Chatbot trả thông tin trận đấu từ database |
| TC49 | Chatbot | Hỏi nhà tài trợ | Câu hỏi liên quan sponsor | Chatbot trả danh sách/thông tin nhà tài trợ đang active |
| TC50 | Bảo mật | Gọi API cần đăng nhập không có token | Không gửi Authorization header | Backend trả 401 |
| TC51 | Bảo mật | Gọi API với token sai/hết hạn | Authorization Bearer không hợp lệ | Backend trả 403 |
| TC52 | Bảo mật | Thử SQL Injection ở email đăng nhập | Email dạng `' OR '1'='1` | Đăng nhập thất bại, không trả dữ liệu user |
| TC53 | Bảo mật | Thử XSS ở tên nhà tài trợ/trận đấu | Nhập `<script>alert(1)</script>` | Frontend hiển thị như text hoặc backend/frontend cần chặn/sanitize |
| TC54 | Cấu hình | Chạy backend thiếu `JWT_SECRET` | Xóa/thiếu JWT_SECRET trong `.env` | Backend dừng khởi động và báo thiếu cấu hình |
| TC55 | Cấu hình | Chạy backend thiếu DB_PASSWORD | Thiếu biến DB_PASSWORD | Backend dừng khởi động và báo thiếu cấu hình database |

## 2. Một Số Kịch Bản Nên Demo Khi Bảo Vệ

Nên chọn các kịch bản dễ nhìn, thể hiện nghiệp vụ đặc trưng:

1. Đăng nhập admin và mở dashboard.
2. Tạo trận đấu mới.
3. Sinh kho vé cho khán đài.
4. User đăng nhập, chọn ghế và thấy ghế chuyển sang đang giữ.
5. Tạo đơn vé online và xem vé trong “Vé của tôi”.
6. Admin giữ vé giấy, in vé giấy PDF.
7. Thử trả vé giấy đã in về online và hệ thống từ chối.
8. Soát vé bằng QR và thử soát lại để thấy cảnh báo vé đã được soát.
9. Thêm nhà tài trợ và kiểm tra hiển thị trên trang chủ/vé.
10. Gọi API public inventory và giải thích không lộ doanh thu.

## 3. Gợi Ý Trả Lời Khi Bị Hỏi Về Kiểm Thử

Có thể trình bày:

> Em đã kiểm thử thủ công các luồng chính gồm đăng ký/đăng nhập, xác minh CCCD, tạo trận, sinh vé, giữ ghế, tạo đơn, in vé PDF, vé giấy, soát vé, quản lý nhà tài trợ và phân quyền admin. Ngoài ra em có xây dựng danh sách test case để có thể chuyển thành unit test/integration test trong bước phát triển tiếp theo.

Nếu bị hỏi vì sao chưa có test tự động:

> Do phạm vi đồ án tập trung vào hoàn thiện chức năng nghiệp vụ và giao diện demo, em mới thực hiện kiểm thử thủ công theo kịch bản. Nếu triển khai production, em sẽ bổ sung Jest/Supertest cho backend API và Playwright/Cypress cho các luồng frontend quan trọng như chọn ghế, checkout và admin.
