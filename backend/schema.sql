DO $$
BEGIN
  CREATE TYPE ticket_status AS ENUM ('AVAILABLE', 'SOLD', 'PAPER_RESERVED', 'PAPER_SOLD', 'HELD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE order_status AS ENUM ('PENDING', 'PAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  address TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  cccd VARCHAR(12),
  pending_cccd VARCHAR(12),
  cccd_status VARCHAR(20) DEFAULT 'NOT_SUBMITTED',
  cccd_verified_at TIMESTAMP,
  auth_provider VARCHAR(20) DEFAULT 'LOCAL',
  provider_id VARCHAR(255),
  profile_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_cccd_unique_idx ON users (cccd) WHERE cccd IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_provider_unique_idx ON users (auth_provider, provider_id) WHERE provider_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  opponent VARCHAR(160) NOT NULL,
  opponent_logo TEXT,
  match_date TIMESTAMP NOT NULL,
  stadium VARCHAR(160) NOT NULL,
  description TEXT,
  competition_name VARCHAR(120) DEFAULT 'V-League 2026',
  ticket_price_min INTEGER DEFAULT 0,
  stand_prices JSONB DEFAULT '{"A":100000,"B":50000,"C":20000,"D":20000}'::jsonb,
  banner_image TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  home_score INTEGER,
  away_score INTEGER,
  free_stands TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  total_amount INTEGER NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'PENDING',
  payment_method VARCHAR(30),
  order_qr_code VARCHAR(80),
  payment_qr_code TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  seat_code VARCHAR(30) NOT NULL,
  sector VARCHAR(30),
  row VARCHAR(10),
  seat_number INTEGER,
  price INTEGER NOT NULL DEFAULT 0,
  status ticket_status NOT NULL DEFAULT 'AVAILABLE',
  ticket_qr_code VARCHAR(80),
  is_scanned BOOLEAN DEFAULT false,
  held_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  held_until TIMESTAMP,
  is_printed BOOLEAN DEFAULT false,
  printed_at TIMESTAMP,
  printed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tickets_match_seat_code_unique_idx ON tickets (match_id, seat_code);
CREATE INDEX IF NOT EXISTS tickets_match_id_idx ON tickets (match_id);
CREATE INDEX IF NOT EXISTS tickets_match_status_idx ON tickets (match_id, status);
CREATE INDEX IF NOT EXISTS tickets_hold_expiry_idx ON tickets (held_until) WHERE status = 'HELD';
CREATE INDEX IF NOT EXISTS tickets_paper_printed_idx ON tickets (match_id, status, is_printed);

CREATE TABLE IF NOT EXISTS sponsors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'PARTNER',
  logo_url TEXT NOT NULL,
  website_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sponsors_display_idx ON sponsors (is_active, level, sort_order, id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80),
  entity_id VARCHAR(80),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tài khoản admin mẫu. Đổi email/mật khẩu hash trước khi dùng production.
-- INSERT INTO users (email, password, full_name, role, status, profile_completed)
-- VALUES ('admin@slna.local', '$2a$10$replace_bcrypt_hash_here', 'Admin SLNA', 'ADMIN', 'ACTIVE', true)
-- ON CONFLICT (email) DO NOTHING;
