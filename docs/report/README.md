# Tài liệu đồ án SLNA Ticketing

Bản hiện hành: Bao_cao_do_an_tot_nghiep_SLNA_Ticketing_hoan_chinh.docx.
Bản Bao_cao_do_an_tot_nghiep_SLNA_Ticketing.docx cũ được giữ làm tư liệu lịch sử, không dùng để nộp.

## Tái tạo

Chạy python build_full_report.py từ thư mục này (hoặc python docs/report/build_full_report.py từ gốc).
Cần python-docx và Pillow. build_report.py là điểm gọi tương thích, tạo cùng bản đầy đủ.
build_figures.py tạo 20 hình PNG: kiến trúc, use case tổng quát/chi tiết, ERD, activity, state và sequence cho đặt vé, xác thực, phân quyền, scanner, SePay, chatbot, đồng bộ nguồn và upload ảnh.
usecase_diagrams.puml là nguồn UML biên tập độc lập; PNG trong Word được sinh bằng build_figures.py.

Sau khi sinh Word, chạy `python docs/report/check_report.py` từ gốc dự án.
Kiểm tra gồm: tính toàn vẹn DOCX, chủ đề bắt buộc, lỗi thời hạn giữ ghế, chú thích và ảnh nhúng.
Bản hiện hành có 479 đoạn, 26 bảng, 21 vị trí hình từ 20 sơ đồ (kiến trúc xuất hiện ở hai chương).
Kiểm tra cấu trúc không thay thế kiểm tra dàn trang trực quan.

## Nội dung đồng bộ

- LOCAL/OAuth, reset SMTP, USER/ADMIN/SCANNER và quản trị viên gốc.
- Giữ ghế 10 phút; tạo đơn mới có 15 phút thanh toán.
- SEPAY duy nhất; SOLD khi tạo đơn nhưng QR chỉ sinh sau SUCCESS.
- Đối soát giao dịch lệch, chống lặp; scanner đúng trận và chống dùng lại.
- Gemini, nguồn chính thức, schema và giới hạn kiểm thử.
- Bộ backend 56/56 test và bộ tích hợp/E2E trọng yếu T01-T16 đạt 16/16; không suy rộng thành kiểm thử tải hay pentest.

## Hoàn thiện trước khi nộp

Điền thông tin trường, khoa, sinh viên, giảng viên theo mẫu; cập nhật mục lục trong Word.
Đợt này đã tạo DOCX và kiểm tra cấu trúc. Render từng trang chưa hoàn tất vì môi trường thiếu LibreOffice; cần kiểm tra lại phân trang, bảng và mục lục trước khi in.
Không đưa secret hay dữ liệu cá nhân thật vào phụ lục.
