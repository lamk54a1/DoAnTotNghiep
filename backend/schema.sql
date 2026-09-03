DO $$
BEGIN
  CREATE TYPE ticket_status AS ENUM ('AVAILABLE', 'SOLD', 'PAPER_RESERVED', 'PAPER_SOLD', 'HELD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE order_status AS ENUM ('PENDING', 'SUCCESS', 'CANCELLED');
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
  token_version INTEGER NOT NULL DEFAULT 0,
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
  transaction_id VARCHAR(120),
  expires_at TIMESTAMP,
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
CREATE INDEX IF NOT EXISTS orders_pending_expiry_idx ON orders (expires_at) WHERE status = 'PENDING';
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_qr_code_unique_idx ON orders (order_qr_code) WHERE order_qr_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tickets_ticket_qr_code_unique_idx ON tickets (ticket_qr_code) WHERE ticket_qr_code IS NOT NULL;

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

CREATE TABLE IF NOT EXISTS knowledge_sources (
  source_key VARCHAR(30) PRIMARY KEY,
  publisher VARCHAR(120) NOT NULL,
  base_url TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMP,
  last_sync_status VARCHAR(20),
  last_sync_error TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id BIGSERIAL PRIMARY KEY,
  source_key VARCHAR(30) NOT NULL REFERENCES knowledge_sources(source_key) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  summary TEXT,
  content TEXT,
  image_url VARCHAR(2000),
  category VARCHAR(150),
  published_at TIMESTAMP,
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  content_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_documents_source_date_idx ON knowledge_documents (source_key, published_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_documents_search_idx ON knowledge_documents
USING GIN (to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(summary, '') || ' ' || COALESCE(content, '')));

INSERT INTO knowledge_sources (source_key, publisher, base_url)
VALUES ('SLNAFC', 'SLNAFC', 'https://slnafc.com'), ('VPF', 'VPF', 'https://vpf.vn')
ON CONFLICT (source_key) DO UPDATE
SET publisher = EXCLUDED.publisher, base_url = EXCLUDED.base_url, updated_at = NOW();

-- Tài khoản admin mẫu. Đổi email/mật khẩu hash trước khi dùng production.
-- INSERT INTO users (email, password, full_name, role, status, profile_completed)
-- VALUES ('admin@slna.local', '$2a$10$replace_bcrypt_hash_here', 'Admin SLNA', 'ADMIN', 'ACTIVE', true)
-- ON CONFLICT (email) DO NOTHING;
