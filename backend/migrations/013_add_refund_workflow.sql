ALTER TABLE sepay_transactions
  ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS refund_note TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS refunded_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

UPDATE sepay_transactions
SET refund_status = 'REQUIRED'
WHERE status IN ('REVIEW_EXPIRED', 'REVIEW_AMOUNT')
  AND refund_status = 'NOT_REQUIRED';

CREATE INDEX IF NOT EXISTS sepay_transactions_refund_idx
  ON sepay_transactions (refund_status, received_at DESC)
  WHERE refund_status <> 'NOT_REQUIRED';
