# Kích hoạt đăng nhập Google và Facebook

Ứng dụng dùng OAuth Authorization Code trên backend. Hai nút đăng nhập/đăng ký chỉ bật khi máy chủ có đủ ID và secret tương ứng. Không đưa secret vào frontend, Git hoặc tin nhắn.

## Google

1. Vào [Google Cloud Console](https://console.cloud.google.com/), tạo một project và mở **Google Auth Platform**.
2. Trong **Branding**, đặt tên ứng dụng (ví dụ `SLNA Ticketing`), email hỗ trợ, tên miền trang chủ `https://veslnafc.xyz`, và thêm `veslnafc.xyz` vào authorized domains nếu được hỏi.
3. Trong **Audience**, chọn **External**. Nếu ứng dụng còn ở chế độ Testing, thêm các Google account muốn thử vào **Test users**. Muốn người dùng bất kỳ đăng nhập, chuyển sang Production sau khi hoàn thiện các yêu cầu của Google.
4. Trong **Clients**, tạo **OAuth client ID** kiểu **Web application**. Authorized redirect URI phải đúng tuyệt đối: `https://api.veslnafc.xyz/api/auth/oauth/google/callback`. Nếu cần authorized JavaScript origin, dùng `https://veslnafc.xyz` (không có path).
5. Lấy Client ID và Client Secret để tự nhập trên VPS.

## Facebook

1. Vào [Meta for Developers](https://developers.facebook.com/apps/), tạo app cho trường hợp sử dụng **Facebook Login** (không phải Facebook Login for Business nếu chỉ đăng nhập tài khoản cá nhân).
2. Trong phần thiết lập Facebook Login cho Web, bật Web OAuth Login và điền **Valid OAuth Redirect URIs**: `https://api.veslnafc.xyz/api/auth/oauth/facebook/callback`.
3. Trong app settings, dùng website `https://veslnafc.xyz`, app domain `veslnafc.xyz`, và hoàn tất các yêu cầu về chính sách quyền riêng tư/xóa dữ liệu nếu Meta yêu cầu trước khi công khai app.
4. Luồng này yêu cầu `email` và `public_profile`. Nếu người dùng không chia sẻ email, backend sẽ từ chối tạo tài khoản thay vì tạo tài khoản thiếu email.
5. Lấy App ID và App Secret để tự nhập trên VPS. Khi còn Development mode, chỉ tài khoản có role trong app mới thử được; cần hoàn tất yêu cầu của Meta để người dùng khác đăng nhập.

Khi Meta yêu cầu thông tin để gửi xét duyệt: dùng biểu tượng `frontend/public/images/meta-app-icon.png` (1024 × 1024), URL chính sách `https://veslnafc.xyz/privacy`, URL hướng dẫn xóa dữ liệu `https://veslnafc.xyz/data-deletion`, và chọn hạng mục Thể thao nếu giao diện có. Chỉ nhập các URL sau khi bản frontend chứa những trang này đã triển khai và có thể mở công khai.

## Bật trên VPS

Trên Vercel, `NEXT_PUBLIC_API_BASE_URL` phải là `https://api.veslnafc.xyz/api` để trình duyệt bắt đầu OAuth trực tiếp tại domain API. Nếu để `/api` qua rewrite của frontend, cookie `state` có thể được đặt ở domain frontend và callback ở domain API sẽ không nhận được cookie đó.

Trên VPS, mở `/srv/slna/app/backend/.env` và điền:

```dotenv
FRONTEND_URL=https://veslnafc.xyz
BACKEND_URL=https://api.veslnafc.xyz
GOOGLE_CLIENT_ID=<Client ID từ Google>
GOOGLE_CLIENT_SECRET=<Client Secret từ Google>
FACEBOOK_APP_ID=<App ID từ Meta>
FACEBOOK_APP_SECRET=<App Secret từ Meta>
```

Lưu file, chạy `systemctl restart slna-api`, rồi kiểm tra `curl -s https://api.veslnafc.xyz/api/auth/oauth/providers`. Kết quả `google: true` hoặc `facebook: true` chỉ chứng minh đã cấu hình đủ biến, **chưa** chứng minh OAuth hoạt động; phải thử đăng nhập thật bằng tài khoản thử nghiệm.

Các tài khoản email/mật khẩu cũ **không tự liên kết** với Google/Facebook, kể cả trùng email, để tránh chiếm tài khoản. Tài khoản OAuth mới cần điền số điện thoại và địa chỉ tại màn **Hoàn thiện thông tin cá nhân**.
