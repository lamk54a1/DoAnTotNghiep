# Đặc tả use case SLNA Ticketing

Cập nhật theo mã nguồn tháng 10/2026. Trạng thái kỹ thuật giữ nguyên trong tài liệu; giao diện có thể hiển thị nhãn tiếng Việt.

## Tác nhân và quyền

- Khách: xem trận, tin, nhà tài trợ; đăng ký, đăng nhập và yêu cầu đặt lại mật khẩu.
- USER: quản lý hồ sơ/CCCD, giữ ghế, tạo đơn SePay và xem vé của mình.
- ADMIN: quản trị nội dung, trận, đơn, vé giấy, đối soát và soát vé.
- SCANNER: kiểm soát vé tại cổng, không có toàn bộ quyền quản trị.
- Quản trị viên gốc: ADMIN đang ACTIVE có email khớp SUPER_ADMIN_EMAIL; không phải role riêng.
- Dịch vụ ngoài: SePay, Google/Meta OAuth, SMTP, Gemini và nguồn SLNAFC/VPF.

## UC01 Đăng ký và đăng nhập

Tiền điều kiện: email và dữ liệu hợp lệ. LOCAL dùng mật khẩu băm; OAuth chỉ hiển thị khi nhà cung cấp đã cấu hình.
Luồng: kiểm tra thông tin → xác thực → cấp phiên cookie HttpOnly → tải hồ sơ. OAuth kiểm tra state gắn với trình duyệt trước khi hoàn tất.
Ngoại lệ: email trùng, sai mật khẩu, tài khoản khóa, provider chưa cấu hình hoặc state sai. Không đưa hash/secret vào response.

## UC02 Đặt lại mật khẩu

Áp dụng cho tài khoản LOCAL đang ACTIVE. Người dùng nhập email; phản hồi công khai không tiết lộ tài khoản có tồn tại.
Server tạo token ngẫu nhiên, lưu SHA256 thay vì token gốc, hạn 15 phút và gửi liên kết qua SMTP.
Token hợp lệ được dùng một lần; đổi mật khẩu và vô hiệu hóa token/phiên cũ. Email SMTP là địa chỉ gửi, không giới hạn địa chỉ người nhận.

## UC03 Hồ sơ và CCCD

USER cập nhật hồ sơ, gửi thông tin xác minh; ADMIN xử lý theo quyền.
Đổi email/mật khẩu LOCAL yêu cầu mật khẩu hiện tại. Trạng thái CCCD VERIFIED là điều kiện mua vé.
Dữ liệu cá nhân không được đưa vào chatbot công khai hoặc báo cáo kiểm thử.

## UC04 Giữ ghế

Tiền điều kiện: đăng nhập, CCCD VERIFIED, trận ON_SALE; chọn 1–4 ghế.
Server kiểm tra ghế trong transaction và cập nhật AVAILABLE → HELD; held_by là người giữ, held_until là thời điểm server cộng 10 phút.
Ghế đã bị người khác giữ/bán phải bị từ chối. Hết hạn giữ thì trả về AVAILABLE.
Kiểm thử cạnh tranh thực tế vẫn cần chạy trên PostgreSQL tách biệt.

## UC05 Tạo đơn SePay

Server khóa/kiểm tra trận và vé đang giữ đúng chủ, còn hạn; kiểm tra hạn mức 4 vé/trận theo CCCD.
Tổng tiền tính từ PostgreSQL, không tin giá client; tối thiểu 1.000 đồng.
Tạo mã SLNA + 12 ký tự hex, đơn PENDING có hạn thanh toán mới 15 phút; vé chuyển SOLD nhưng QR còn NULL.
Trả VietQR chứa tài khoản nhận, số tiền và nội dung. Chỉ hỗ trợ phương thức SEPAY.
SOLD ở bước này không đồng nghĩa đã thanh toán hoặc được vào sân.

## UC06 Nhận webhook và phát hành vé

SePay gửi webhook. Server xác thực HMAC-SHA256, timestamp và raw body; xử lý transaction_id duy nhất để chống ghi nhận lặp.
Giao dịch tiền vào phải đúng tài khoản, mã đơn, số tiền và đơn PENDING còn hạn.
Khớp: cập nhật SUCCESS, transaction_id, sinh QR và lưu MATCHED/audit trong transaction.
Lệch: lưu REVIEW_* để đối soát; không sinh QR. Tiền ra được bỏ qua; gửi thử không tạo thanh toán thật.
HTTP 200 chỉ là xác nhận tiếp nhận/xử lý, không chứng minh đơn đã thanh toán.
ADMIN không được ép đơn SEPAY thành SUCCESS thủ công.

## UC07 Hết hạn và xem vé

Đơn chưa trả tiền quá hạn → CANCELLED; vé của đơn được trả AVAILABLE và xóa liên kết/QR theo vòng đời.
USER chỉ xem vé của mình. Vé online chỉ được vào sân khi trạng thái đơn hợp lệ và có QR.
Không mô tả hoàn tiền tự động vì chưa có nghiệp vụ này.

## UC08 Vé giấy

ADMIN dành ghế AVAILABLE → PAPER_RESERVED, in QR/PDF và ghi nhận thông tin in.
Bán vé chuyển PAPER_SOLD. Vé đã in không được trả về kho online.
PAPER_RESERVED chưa đủ điều kiện vào sân.

## UC09 Soát vé bằng điện thoại

ADMIN/SCANNER chọn trận, mở camera sau qua HTTPS và quét liên tục.
Client gửi ticketQrCode + matchId; server khóa vé, kiểm tra đúng trận, đã thanh toán/bán giấy và chưa quét.
Thành công: is_scanned = true, ghi audit; hiển thị phản hồi lớn và âm/rung.
Sai trận, QR lạ, chưa trả tiền, đã dùng đều bị từ chối. Lỗi mạng không được cho qua như thành công.
Schema không có scanned_at; thời điểm thao tác truy vết qua nhật ký. Không hỗ trợ soát offline.

## UC10 Cấp quyền nhân viên

Chỉ quản trị viên gốc được cấp/thu hồi ADMIN hoặc SCANNER.
Server bảo vệ tài khoản gốc, tăng token_version khi đổi quyền và lưu audit.
Việc ẩn nút ở frontend không thay thế kiểm tra quyền backend.

## UC11 Nội dung quản trị

ADMIN quản lý trận/ghế, banner, nhà tài trợ và logo theo quyền.
Upload phải qua kiểm tra loại nội dung, kích thước và tên file do server tạo.
Tách nền logo là xử lý nền sáng nối với mép, không phải mô hình phân đoạn ảnh tổng quát.

## UC12 Chatbot

Nhận câu hỏi và lịch sử; phân loại nhu cầu, lấy dữ liệu nghiệp vụ hoặc nguồn chính thức rồi tạo phản hồi Gemini.
Không suy đoán tồn kho/giá mới khi thiếu dữ liệu. Có phương án dự phòng khi provider lỗi/timeout.
Không đưa secret hay thông tin cá nhân nhạy cảm vào ngữ cảnh công khai.

## Quan hệ dữ liệu

tickets.order_id liên kết trực tiếp orders.id; không có order_items.
Các bảng hỗ trợ gồm sepay_transactions, password_reset_tokens, knowledge_sources, knowledge_documents, sponsors, audit_logs, site_settings.
audit_logs.user_id là liên kết logic, không phải khóa ngoại khai báo.
