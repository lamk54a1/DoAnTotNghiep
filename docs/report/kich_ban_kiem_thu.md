# Kế hoạch và bằng chứng kiểm thử SLNA Ticketing

## Kết quả đã thực thi

Bộ backend npm test: 31/31 đạt, không thất bại/không bỏ qua trong đợt rà soát. Chủ yếu là unit test và phụ thuộc giả lập.
Không coi kết quả này là bằng chứng đã chạy đầy đủ API, PostgreSQL đồng thời, trình duyệt, tải 1.000 người hoặc pentest.
Lint/build frontend cần chạy lại trước nghiệm thu. Không ghi số liệu hiệu năng khi chưa đo.

## Kịch bản nghiệm thu cần chạy

Mọi dòng dưới đây là kế hoạch, chưa mặc định Đạt. Khi chạy, bổ sung ngày, môi trường, commit, dữ liệu thử, thực tế và bằng chứng.

| Mã | Thao tác | Kết quả mong đợi |
|---|---|---|
| AUTH01 | LOCAL đúng/sai mật khẩu | Cookie HttpOnly hoặc từ chối; không lộ hash |
| AUTH02 | OAuth Google/Facebook, state sai/hết hạn | Đăng nhập hợp lệ; chặn state không khớp |
| AUTH03 | Reset token đúng, hết 15 phút, dùng lại | Chỉ token hợp lệ chưa dùng đổi được mật khẩu |
| AUTH04 | Email không tồn tại khi reset | Phản hồi không tiết lộ tài khoản |
| ROLE01 | USER/SCANNER gọi API quản trị | Từ chối theo quyền backend |
| ROLE02 | ADMIN thường cấp ADMIN | Từ chối; chỉ quản trị viên gốc có quyền |
| ROLE03 | Gốc cấp/thu hồi SCANNER | Đổi quyền, tăng token_version, có audit |
| HOLD01 | CCCD chưa VERIFIED hoặc trận chưa ON_SALE | Không giữ ghế |
| HOLD02 | Hai người giữ cùng ghế đồng thời | Chỉ một người giữ thành công |
| HOLD03 | Quá 10 phút giữ ghế | Ghế trở lại khả dụng |
| ORDER01 | Sửa giá client hoặc vượt 4 vé/trận | Giá server; chặn vượt hạn mức |
| ORDER02 | Checkout ghế giữ hợp lệ | PENDING hạn mới 15 phút; SOLD nhưng QR NULL |
| PAY01 | Chữ ký sai/timestamp cũ | Không phát hành vé |
| PAY02 | Đúng tài khoản, mã, tiền, còn hạn | SUCCESS + QR + MATCHED |
| PAY03 | Gửi lại cùng transaction_id | Không ghi nhận/thực hiện lần hai |
| PAY04 | Sai tiền/tài khoản/mã hoặc hết hạn | REVIEW_*; không sinh QR |
| PAY05 | Gửi thử webhook | Không tạo thanh toán thật |
| EXP01 | Đơn PENDING hết 15 phút | CANCELLED, hoàn vé AVAILABLE |
| SCAN01 | Vé hợp lệ, đúng trận | Đánh dấu is_scanned và lưu audit |
| SCAN02 | QR quét hai lần/đồng thời | Không có hai lần chấp nhận |
| SCAN03 | Sai trận, chưa trả tiền, lỗi mạng | Không báo vào sân thành công |
| PAPER01 | Dành, in, bán và quét vé giấy | PAPER_RESERVED → PAPER_SOLD, kiểm tra đã quét |
| MEDIA01 | File giả ảnh/quá giới hạn | Từ chối; không lưu dữ liệu độc hại |
| MEDIA02 | Logo nền sáng có chi tiết trắng bên trong | Giữ chi tiết; kiểm tra kết quả trực quan |
| AI01 | Lịch/giá/tin/thiếu dữ liệu | Đúng trọng tâm, nguồn phù hợp, không bịa dữ liệu |
| AI02 | Gemini timeout/404/429 | Fallback an toàn, không lộ khóa |
| UI01 | Admin mobile, trạng thái tiếng Việt, Vé của tôi | Chữ rõ, không tràn, nhãn nhất quán |
| UI02 | Camera điện thoại iOS/Android | Xin quyền, camera sau, quét liên tục; tính năng tùy thiết bị |

## Kế hoạch tải 1.000 người

1. Dùng staging riêng và PostgreSQL dữ liệu giả; không chạy tải trên hệ thống đang bán vé.
2. Tách kịch bản đọc lịch, đăng nhập, giữ ghế và tạo đơn. 1.000 người đồng thời không đồng nghĩa 1.000 request/giây.
3. Tăng tải theo bậc 10 → 50 → 100 → 250 → 500 → 1.000; dừng khi vượt ngưỡng tài nguyên/lỗi đã thống nhất.
4. Không gửi email hàng loạt, gọi Gemini hoặc chuyển tiền thật; mock dịch vụ ngoài.
5. Đo p50/p95/p99, throughput, tỷ lệ lỗi, CPU/RAM, pool DB, khóa/deadlock.
6. Kiểm tra invariant: không bán trùng, không quá hạn mức, không QR trước thanh toán, không xử lý lặp.
7. Ghi cấu hình máy, commit, script, số người, thời gian ramp/steady, log và kết quả. Chỉ kết luận trong phạm vi môi trường đo.

## Mẫu ghi nhận

| Ngày/commit | Môi trường | Mã ca | Thực tế | Đạt/Không đạt | Bằng chứng |
|---|---|---|---|---|---|
| Điền khi chạy | Staging | TC… | … | Chưa chạy | Log/ảnh/SQL đã ẩn dữ liệu riêng tư |

Không đưa API key, mật khẩu ứng dụng SMTP, token hay CCCD thật vào phụ lục.
