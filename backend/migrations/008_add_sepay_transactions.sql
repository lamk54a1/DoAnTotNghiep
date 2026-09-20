CREATE TABLE IF NOT EXISTS sepay_transactions (
  transaction_id BIGINT PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  payment_code VARCHAR(80),
  account_number VARCHAR(80) NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sepay_transactions_review_idx
  ON sepay_transactions (received_at DESC) WHERE status <> 'MATCHED';
