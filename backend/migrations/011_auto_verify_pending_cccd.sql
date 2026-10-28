-- Tự duyệt các hồ sơ CCCD cũ nếu số đó chỉ xuất hiện ở một tài khoản
-- và chưa được tài khoản nào khác xác minh. Hồ sơ trùng vẫn giữ lại để admin xử lý.
WITH eligible AS (
  SELECT u.id
  FROM users u
  WHERE u.cccd IS NULL
    AND u.pending_cccd IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM users verified
      WHERE verified.cccd = u.pending_cccd AND verified.id <> u.id
    )
    AND (
      SELECT COUNT(*) FROM users pending
      WHERE pending.pending_cccd = u.pending_cccd AND pending.cccd IS NULL
    ) = 1
)
UPDATE users u
SET cccd = u.pending_cccd,
    pending_cccd = NULL,
    cccd_status = 'VERIFIED',
    cccd_verified_at = COALESCE(u.cccd_verified_at, NOW())
FROM eligible
WHERE u.id = eligible.id;
