ALTER TABLE tickets ADD COLUMN IF NOT EXISTS paper_sold_at timestamp;

UPDATE tickets
SET paper_sold_at = COALESCE(printed_at, NOW())
WHERE status = 'PAPER_SOLD' AND paper_sold_at IS NULL;

CREATE INDEX IF NOT EXISTS tickets_paper_sold_at_idx
  ON tickets (paper_sold_at)
  WHERE status = 'PAPER_SOLD';
