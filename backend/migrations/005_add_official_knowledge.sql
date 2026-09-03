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
  published_at TIMESTAMP,
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  content_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_documents_source_date_idx
  ON knowledge_documents (source_key, published_at DESC);

CREATE INDEX IF NOT EXISTS knowledge_documents_search_idx
  ON knowledge_documents
  USING GIN (to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(summary, '') || ' ' || COALESCE(content, '')));

INSERT INTO knowledge_sources (source_key, publisher, base_url)
VALUES
  ('SLNAFC', 'SLNAFC', 'https://slnafc.com'),
  ('VPF', 'VPF', 'https://vpf.vn')
ON CONFLICT (source_key) DO UPDATE
SET publisher = EXCLUDED.publisher,
    base_url = EXCLUDED.base_url,
    updated_at = NOW();
