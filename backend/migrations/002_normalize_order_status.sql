DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'order_status' AND e.enumlabel = 'PAID'
  ) THEN
    UPDATE orders SET status = 'SUCCESS' WHERE status::text = 'PAID';
  END IF;
END $$;

UPDATE orders
SET expires_at = created_at + INTERVAL '15 minutes'
WHERE status = 'PENDING' AND expires_at IS NULL;
