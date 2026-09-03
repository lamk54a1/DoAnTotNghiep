const pool = require('../config/db');
const { syncOfficialNews } = require('../services/officialNewsService');

const SOURCE_KEY = 'SLNAFC';

const parsePagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 9, 1), 20);
  return { page, limit, offset: (page - 1) * limit };
};

const loadNews = async ({ limit, offset }) => {
  const [articles, total, source] = await Promise.all([
    pool.query(`
      SELECT d.id, d.title, d.url, d.summary,
             d.image_url AS "imageUrl", d.category,
             d.published_at AS "publishedAt", d.fetched_at AS "fetchedAt",
             s.publisher
      FROM knowledge_documents d
      JOIN knowledge_sources s ON s.source_key = d.source_key
      WHERE d.source_key = $1 AND s.is_enabled = true
      ORDER BY d.published_at DESC NULLS LAST, d.fetched_at DESC, d.id DESC
      LIMIT $2 OFFSET $3
    `, [SOURCE_KEY, limit, offset]),
    pool.query(`
      SELECT COUNT(*)::int AS total
      FROM knowledge_documents d
      JOIN knowledge_sources s ON s.source_key = d.source_key
      WHERE d.source_key = $1 AND s.is_enabled = true
    `, [SOURCE_KEY]),
    pool.query(`
      SELECT publisher, base_url AS "baseUrl", last_synced_at AS "lastSyncedAt",
             last_sync_status AS "lastSyncStatus"
      FROM knowledge_sources
      WHERE source_key = $1 AND is_enabled = true
    `, [SOURCE_KEY]),
  ]);

  return {
    items: articles.rows,
    total: total.rows[0]?.total || 0,
    source: source.rows[0] || {
      publisher: 'SLNAFC',
      baseUrl: 'https://slnafc.com',
      lastSyncedAt: null,
      lastSyncStatus: null,
    },
  };
};

const getPublicNews = async (req, res) => {
  const pagination = parsePagination(req.query);
  try {
    let result = await loadNews(pagination);
    if (result.total === 0) {
      await syncOfficialNews({ maxArticles: pagination.limit, sourceKeys: [SOURCE_KEY] });
      result = await loadNews(pagination);
    } else {
      const lastSyncedAt = result.source.lastSyncedAt ? new Date(result.source.lastSyncedAt).getTime() : 0;
      if (Date.now() - lastSyncedAt > 30 * 60 * 1000) {
        syncOfficialNews({ sourceKeys: [SOURCE_KEY] }).catch((error) => {
          console.error('Không thể làm mới tin SLNAFC:', error.message);
        });
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
    return res.json({
      items: result.items,
      source: result.source,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.total,
        totalPages: Math.max(Math.ceil(result.total / pagination.limit), 1),
      },
    });
  } catch (error) {
    console.error('Không thể tải tin SLNAFC:', error.message);
    return res.status(500).json({ message: 'Không thể tải tin tức từ SLNAFC lúc này.' });
  }
};

module.exports = { getPublicNews, parsePagination };
