-- Một số database được tạo từ schema cũ chưa có đủ các cột thời gian
-- đang được code hiện tại sử dụng. Migration này đồng bộ chúng với schema.sql.
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT NOW();

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT NOW();

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT NOW();
