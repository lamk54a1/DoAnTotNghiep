-- Chuyển bốn khán đài tổng quát thành các khu vé đúng theo sơ đồ sân Vinh.
-- ID vé, đơn hàng, trạng thái và QR được giữ nguyên; chỉ chuẩn hóa khu/mã ghế.
WITH legacy_tickets AS (
  SELECT
    id,
    CASE
      WHEN LEFT(seat_code, 1) = 'A' AND row::int <= 20 THEN 'A1'
      WHEN LEFT(seat_code, 1) = 'A' AND row::int <= 40 THEN 'A2'
      WHEN LEFT(seat_code, 1) = 'A' AND row::int <= 60 THEN 'A3'
      WHEN LEFT(seat_code, 1) = 'A' THEN 'A5'
      WHEN LEFT(seat_code, 1) = 'B' AND row::int <= 20 THEN 'B8'
      WHEN LEFT(seat_code, 1) = 'B' AND row::int <= 40 THEN 'B9'
      WHEN LEFT(seat_code, 1) = 'B' THEN 'B10'
      WHEN LEFT(seat_code, 1) = 'C' AND row::int <= 15 THEN 'C6'
      WHEN LEFT(seat_code, 1) = 'C' THEN 'C7'
      WHEN LEFT(seat_code, 1) = 'D' AND row::int <= 10 THEN 'D11'
      WHEN LEFT(seat_code, 1) = 'D' AND row::int <= 20 THEN 'D12'
      WHEN LEFT(seat_code, 1) = 'D' THEN 'D13'
    END AS zone,
    CASE
      WHEN LEFT(seat_code, 1) = 'A' THEN ((row::int - 1) % 20) + 1
      WHEN LEFT(seat_code, 1) = 'B' THEN ((row::int - 1) % 20) + 1
      WHEN LEFT(seat_code, 1) = 'C' THEN ((row::int - 1) % 15) + 1
      WHEN LEFT(seat_code, 1) = 'D' THEN ((row::int - 1) % 10) + 1
    END AS local_row
  FROM tickets
  WHERE seat_code ~ '^[ABCD][0-9]+-[0-9]+$'
)
UPDATE tickets AS t
SET sector = legacy.zone,
    row = legacy.local_row::text,
    seat_code = legacy.zone || '-R' || LPAD(legacy.local_row::text, 2, '0') || '-' || LPAD(t.seat_number::text, 3, '0')
FROM legacy_tickets AS legacy
WHERE t.id = legacy.id;

UPDATE matches
SET stand_prices = jsonb_build_object(
      'A1', COALESCE(stand_prices->'A1', stand_prices->'A', '150000'::jsonb),
      'A2', COALESCE(stand_prices->'A2', stand_prices->'A', '100000'::jsonb),
      'A3', COALESCE(stand_prices->'A3', stand_prices->'A', '100000'::jsonb),
      'A5', COALESCE(stand_prices->'A5', stand_prices->'A', '80000'::jsonb),
      'B8', COALESCE(stand_prices->'B8', stand_prices->'B', '50000'::jsonb),
      'B9', COALESCE(stand_prices->'B9', stand_prices->'B', '50000'::jsonb),
      'B10', COALESCE(stand_prices->'B10', stand_prices->'B', '50000'::jsonb),
      'C6', COALESCE(stand_prices->'C6', stand_prices->'C', '30000'::jsonb),
      'C7', COALESCE(stand_prices->'C7', stand_prices->'C', '30000'::jsonb),
      'D11', COALESCE(stand_prices->'D11', stand_prices->'D', '30000'::jsonb),
      'D12', COALESCE(stand_prices->'D12', stand_prices->'D', '30000'::jsonb),
      'D13', COALESCE(stand_prices->'D13', stand_prices->'D', '30000'::jsonb)
    );

UPDATE matches AS m
SET free_stands = COALESCE((
  SELECT ARRAY_AGG(DISTINCT expanded.zone ORDER BY expanded.zone)
  FROM UNNEST(COALESCE(m.free_stands, '{}'::text[])) AS old(value)
  CROSS JOIN LATERAL UNNEST(
    CASE old.value
      WHEN 'A' THEN ARRAY['A1','A2','A3','A5']
      WHEN 'B' THEN ARRAY['B8','B9','B10']
      WHEN 'C' THEN ARRAY['C6','C7']
      WHEN 'D' THEN ARRAY['D11','D12','D13']
      ELSE ARRAY[old.value]
    END
  ) AS expanded(zone)
), '{}'::text[]);

ALTER TABLE matches ALTER COLUMN stand_prices SET DEFAULT
  '{"A1":150000,"A2":100000,"A3":100000,"A5":80000,"B8":50000,"B9":50000,"B10":50000,"C6":30000,"C7":30000,"D11":30000,"D12":30000,"D13":30000}'::jsonb;
