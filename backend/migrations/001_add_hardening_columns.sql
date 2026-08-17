ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'SUCCESS';

ALTER TABLE users ADD COLUMN IF NOT EXISTS cccd varchar(12);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_cccd varchar(12);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cccd_status varchar(20) DEFAULT 'NOT_SUBMITTED';
ALTER TABLE users ADD COLUMN IF NOT EXISTS cccd_verified_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider varchar(20) DEFAULT 'LOCAL';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id varchar(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS free_stands text[] DEFAULT '{}'::text[];
ALTER TABLE matches ADD COLUMN IF NOT EXISTS competition_name varchar(120) DEFAULT 'V-League 2026';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS stand_prices jsonb DEFAULT '{"A":100000,"B":50000,"C":20000,"D":20000}'::jsonb;

ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'PAPER_RESERVED';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'PAPER_SOLD';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'HELD';

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_scanned boolean DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS held_by integer REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS held_until timestamp;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_printed boolean DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS printed_at timestamp;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS printed_by integer REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id varchar(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expires_at timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS users_cccd_unique_idx ON users (cccd) WHERE cccd IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_provider_unique_idx ON users (auth_provider, provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tickets_match_id_idx ON tickets (match_id);
CREATE INDEX IF NOT EXISTS tickets_match_status_idx ON tickets (match_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS tickets_match_seat_code_unique_idx ON tickets (match_id, seat_code);
CREATE INDEX IF NOT EXISTS tickets_hold_expiry_idx ON tickets (held_until) WHERE status = 'HELD';
CREATE INDEX IF NOT EXISTS tickets_paper_printed_idx ON tickets (match_id, status, is_printed);
CREATE INDEX IF NOT EXISTS orders_pending_expiry_idx ON orders (expires_at) WHERE status = 'PENDING';
