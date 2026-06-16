# Cấu hình đăng nhập Google và Facebook

Backend đọc cấu hình từ `backend/.env`.

## Google

1. Tạo OAuth 2.0 Client loại **Web application** trong Google Cloud Console.
2. Thêm Authorized JavaScript origin:
   - `http://localhost:3000`
3. Thêm Authorized redirect URI:
   - `http://localhost:5000/api/auth/oauth/google/callback`
4. Điền vào `.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Facebook

1. Tạo Facebook App và bật sản phẩm **Facebook Login**.
2. Trong Valid OAuth Redirect URIs, thêm:
   - `http://localhost:5000/api/auth/oauth/facebook/callback`
3. Điền vào `.env`:

```env
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

## URL hệ thống

```env
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

Khi triển khai production, thay cả hai URL và khai báo lại redirect URI HTTPS tương ứng trong Google Cloud Console và Facebook Developers.
