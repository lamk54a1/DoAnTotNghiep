# SLNA Ticketing

Hệ thống bán vé trực tuyến cho CLB Sông Lam Nghệ An, gồm backend Express/PostgreSQL và frontend Next.js.

## Yêu cầu

- Node.js 20+
- PostgreSQL 14+
- npm

## Cấu hình môi trường

Backend:

```bash
cd backend
copy .env.example .env
```

Điền đầy đủ các biến bắt buộc trong `backend/.env`:

- `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT`
- `JWT_SECRET`: chuỗi dài, ngẫu nhiên, không commit lên git
- `FRONTEND_URL`: ví dụ `http://localhost:3000`
- `BACKEND_URL`: ví dụ `http://localhost:5000`

Frontend:

```bash
cd frontend
copy .env.example .env.local
```

Biến chính:

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api`

## Khởi tạo database

Tạo database PostgreSQL, sau đó chạy:

```bash
psql -U postgres -d slna_ticketing -f backend/schema.sql
```

File `backend/schema.sql` chứa schema chính cho `users`, `matches`, `tickets`, `orders`, `sponsors`, `audit_logs`. Tài khoản admin mẫu đang để dạng comment; hãy tạo hash bcrypt thật trước khi dùng.

## Chạy local

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Mặc định frontend chạy ở `http://localhost:3000`, backend chạy ở `http://localhost:5000`.

## Build production

```bash
cd frontend
npm run build
npm start
```

Frontend đang dùng `next build --webpack` và font hệ thống để tránh lỗi tải Google Fonts khi build trong môi trường không có mạng.

## Ghi chú bảo mật

- Không commit file `.env`, `.env.local` hoặc secret thật.
- API `/api/tickets/inventory/:matchId` chỉ trả dữ liệu tồn kho public.
- API `/api/tickets/admin/inventory/:matchId` yêu cầu admin và trả thêm doanh thu.
- Luồng thanh toán hiện tạo đơn `PENDING`; chưa phải tích hợp cổng thanh toán/webhook thật.
