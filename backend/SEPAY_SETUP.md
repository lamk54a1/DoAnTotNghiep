# Kích hoạt thanh toán SePay

Tích hợp này dùng VietQR của tài khoản ngân hàng đã khai báo và webhook **SePay Webhooks** để tự động xác nhận tiền vào. Đây không phải API checkout thẻ của SePay. Không bật chức năng khi chưa liên kết tài khoản ngân hàng với SePay và chưa kiểm tra webhook.

## Chuẩn bị trong SePay

1. Đăng ký/đăng nhập `my.sepay.vn`, liên kết đúng tài khoản MB cá nhân nhận tiền; xác nhận trạng thái kết nối API thành công. Không dùng tài khoản Vietcombank cũ cho webhook/QR mới.
2. Trong **Cấu hình Công ty → Cấu trúc mã thanh toán**, tạo mẫu tiền tố `SLNA`, hậu tố **12 ký tự chữ và số**. Mã tạo ra có dạng `SLNA12ABCDEF3456`.
3. Tạo webhook loại **Tiền vào**, định dạng **JSON**, chọn đúng tài khoản ngân hàng, bật tự động gửi lại khi lỗi. URL: `https://api.veslnafc.xyz/api/payments/sepay/webhook`.
4. Chọn xác thực **HMAC-SHA256** và giữ kín Secret Key. Không dùng kiểu "Không xác thực" hoặc chỉ API Key cho endpoint này.
5. Nên bật bộ lọc mã thanh toán tiền tố `SLNA`; ứng dụng vẫn kiểm tra lại mã, tài khoản và số tiền.

## Cấu hình backend

Sau khi chạy migration `008_add_sepay_transactions.sql`, thêm vào `/srv/slna/app/backend/.env`:

```dotenv
BANK_ID=MB
BANK_ACCOUNT_NO=<số tài khoản MB đã liên kết trong SePay>
BANK_ACCOUNT_NAME=<tên chủ tài khoản MB đúng như ngân hàng hiển thị, không dấu>
SEPAY_WEBHOOK_SECRET=<Secret Key HMAC của webhook>
SEPAY_ENABLED=1
SEPAY_CHECKOUT_ENABLED=0
```

Không gửi Secret Key qua chat, không đưa vào frontend hoặc Git. Nếu có `backend/.env.local` trên VPS thì tệp đó ghi đè `.env`: kiểm tra cả hai tệp để tránh QR trỏ về tài khoản cũ. Khởi động lại `slna-api` sau khi đổi cấu hình. Cả chuyển khoản thủ công lẫn SePay dùng chung `BANK_ID`, `BANK_ACCOUNT_NO`, `BANK_ACCOUNT_NAME`; mã nguồn frontend không chứa số tài khoản. Các đơn/QR đã tạo trước lúc đổi ngân hàng không được tự cập nhật, hãy để chúng hết hạn hoặc xử lý riêng trước khi nhận tiền mới.

`SEPAY_ENABLED=1` cho phép endpoint webhook nhận thử/giao dịch, còn `SEPAY_CHECKOUT_ENABLED=0` khóa việc tạo đơn mới. Chỉ đổi `SEPAY_CHECKOUT_ENABLED=1` và khởi động lại service sau khi **Gửi thử** trả thành công, một giao dịch tiền vào thật xuất hiện trong SePay và bạn đã kiểm tra đúng tài khoản/QR. Khi `SEPAY_ENABLED=0`, webhook không nhận và không thể tạo đơn mới. Checkout chỉ hỗ trợ SePay; các đơn chuyển khoản thủ công/tiền mặt cũ vẫn được giữ để tra cứu và đối soát.

## Kiểm thử và vận hành

- Chạy `npm test` để kiểm tra chữ ký, chống trùng và đối soát bằng dữ liệu giả lập **cục bộ**.
- Nút **Gửi thử** trong SePay dùng ID giao dịch mẫu `0`; backend xác thực HMAC và trả thành công nhưng không ghi DB, không tạo vé. Đây chỉ kiểm tra đường truyền, không chứng minh giao dịch ngân hàng thật đã vào hệ thống.
- SePay **Test mode phải dùng backend và database staging riêng**. Không trỏ webhook Test mode vào API production vì tiền giả lập có thể tạo vé thật trong production.
- Sau khi thử staging, chỉ kích hoạt Live với tài khoản ngân hàng thật và Secret Key Live. Thử một giao dịch thật giá trị nhỏ, kiểm tra cả lịch sử SePay, sao kê ngân hàng, trạng thái đơn và QR vé.
- Chuyển khoản sai số tiền, sai tài khoản, sai mã hoặc đến sau khi đơn hết hạn sẽ không tự cấp vé. Admin xem tại **Đối soát SePay**; xử lý hoàn tiền/đối soát trên SePay và ngân hàng.
- Webhook có thể bị gián đoạn; cần theo dõi cảnh báo/lịch sử webhook SePay và đối chiếu sao kê định kỳ. Hiện chưa có tác vụ tự động lấy lại giao dịch bị bỏ lỡ từ SePay API.

Tài liệu chính thức: https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook và https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc.
