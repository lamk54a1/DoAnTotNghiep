const crypto = require('crypto');
const cheerio = require('cheerio');
const pool = require('../config/db');

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_ARTICLE_CONTENT = 12000;
const FETCH_TIMEOUT_MS = 8000;

const SOURCES = [
  {
    key: 'SLNAFC',
    publisher: 'SLNAFC',
    indexUrl: 'https://slnafc.com/tin-tuc',
    squadUrl: 'https://slnafc.com/doi-hinh',
    hostnames: new Set(['slnafc.com', 'www.slnafc.com']),
    imageHostnames: new Set(['slnafc.com', 'www.slnafc.com', 'cdn.slnafc.vn', 'www.cdn.slnafc.vn']),
    articlePath: /^\/tin-tuc\/(?!chuyen-muc(?:\/|$))[^/]+/,
  },
  {
    key: 'VPF',
    publisher: 'VPF',
    indexUrl: 'https://vpf.vn/',
    hostnames: new Set(['vpf.vn', 'www.vpf.vn']),
    imageHostnames: new Set(['vpf.vn', 'www.vpf.vn']),
    articlePath: /^\/tin-tuc\//,
  },
];

const compactText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const normalizeSquadLabel = (value) => compactText(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd');

const isAllowedUrl = (value, source) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && source.hostnames.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
};

const getAllowedImageUrl = (value, requestedUrl, source) => {
  if (!value) return null;
  try {
    const url = new URL(value, requestedUrl);
    url.hash = '';
    return url.protocol === 'https:' && source.imageHostnames.has(url.hostname.toLowerCase())
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

const fetchAllowedHtml = async (initialUrl, source) => {
  let currentUrl = initialUrl;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    if (!isAllowedUrl(currentUrl, source)) throw new Error('Nguồn chuyển hướng đến domain không được phép.');
    const response = await fetch(currentUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'SLNA-Ticketing-KnowledgeBot/1.0 (+official-source-sync)',
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error(`Redirect ${response.status} không có địa chỉ đích.`);
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    if (!response.ok) throw new Error(`Nguồn phản hồi HTTP ${response.status}.`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) throw new Error('Nguồn không trả về HTML.');
    const declaredSize = Number(response.headers.get('content-length') || 0);
    if (declaredSize > MAX_RESPONSE_BYTES) throw new Error('Trang nguồn vượt quá kích thước cho phép.');
    const html = await response.text();
    if (Buffer.byteLength(html) > MAX_RESPONSE_BYTES) throw new Error('Trang nguồn vượt quá kích thước cho phép.');
    return { html, finalUrl: currentUrl };
  }
  throw new Error('Nguồn chuyển hướng quá nhiều lần.');
};

const extractArticleUrls = (html, source) => {
  const $ = cheerio.load(html);
  const urls = new Set();
  $('a[href]').each((_index, element) => {
    try {
      const url = new URL($(element).attr('href'), source.indexUrl);
      url.hash = '';
      if (isAllowedUrl(url.toString(), source) && source.articlePath.test(url.pathname)) urls.add(url.toString());
    } catch {}
  });
  return [...urls];
};

const parsePublishedAt = ($, source) => {
  const pageText = compactText($('body').text());
  const slnaMatch = pageText.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (source.key === 'SLNAFC' && slnaMatch) {
    const [, hour, minute, day, month, year] = slnaMatch;
    const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00+07:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const metaDate = $('meta[property="article:published_time"]').attr('content') || '';
  if (metaDate && !Number.isNaN(Date.parse(metaDate))) return new Date(metaDate);
  if (slnaMatch) {
    const [, hour, minute, day, month, year] = slnaMatch;
    const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00+07:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const match = pageText.match(/(?:^|\s)(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) return null;
  const [, day, month, year, hour = '0', minute = '0'] = match;
  const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseArticle = (html, requestedUrl, source) => {
  const $ = cheerio.load(html);
  $('script, style, noscript, nav, footer, form').remove();
  const canonicalValue = $('link[rel="canonical"]').attr('href');
  const canonicalUrl = canonicalValue ? new URL(canonicalValue, requestedUrl).toString() : requestedUrl;
  if (!isAllowedUrl(canonicalUrl, source)) throw new Error('Canonical URL không thuộc nguồn được phép.');
  const title = compactText($('meta[property="og:title"]').attr('content') || $('h1').first().text() || $('title').text());
  const paragraphs = $('p').map((_index, element) => {
    const item = $(element);
    if (String(item.attr('class') || '').includes('cursor-pointer')) return null;
    const text = compactText(item.text());
    if (text.length < 40 || text === title || /^(Tag:|Tác giả|Tin liên quan)/i.test(text)) return null;
    return text;
  }).get();
  const summary = compactText(
    $('meta[property="og:description"]').attr('content')
    || $('meta[name="description"]').attr('content')
    || $('article p').first().text()
    || paragraphs[0]
  ).slice(0, 1000);
  const contentElement = $('article').first().length
    ? $('article').first()
    : $('.entry-content, .post-content, .single-content, main').first();
  const content = compactText(contentElement.length ? contentElement.text() : paragraphs.join(' ')).slice(0, MAX_ARTICLE_CONTENT);
  if (title.length < 8 || content.length < 40) return null;
  const imageCandidate = $('meta[property="og:image"]').attr('content')
    || $('meta[name="twitter:image"]').attr('content')
    || $('article img').first().attr('data-src')
    || $('article img').first().attr('src');
  const imageUrl = getAllowedImageUrl(imageCandidate, canonicalUrl, source);
  const category = compactText(
    $('meta[property="article:section"]').attr('content')
    || $('.category, .post-category, .news-category').first().text()
    || source.publisher
  ).slice(0, 150);
  return {
    sourceKey: source.key,
    publisher: source.publisher,
    title: title.slice(0, 500),
    url: canonicalUrl,
    summary,
    content,
    imageUrl,
    category,
    publishedAt: parsePublishedAt($, source),
    contentHash: crypto.createHash('sha256').update(`${title}\n${summary}\n${content}`).digest('hex'),
  };
};

const parseSquadPage = (html, requestedUrl, source) => {
  const $ = cheerio.load(html);
  const players = [];

  $('.slide-team-item').each((_index, element) => {
    const item = $(element);
    const number = compactText(item.find('.number-team').first().text());
    const name = compactText(item.find('p').filter((_i, paragraph) => {
      const className = String($(paragraph).attr('class') || '');
      return className.includes('uppercase') && className.includes('font-bold');
    }).first().text());
    const paragraphTexts = item.find('p, span').map((_i, element) => compactText($(element).text())).get();
    const position = paragraphTexts.find((value) => /^(Thủ môn|Hậu vệ|Tiền vệ|Tiền Vệ|Tiền đạo)$/i.test(value));
    const valueAfter = (label) => {
      const index = paragraphTexts.findIndex((value) => normalizeSquadLabel(value) === normalizeSquadLabel(label));
      return index >= 0 ? paragraphTexts[index + 1] || '' : '';
    };
    const valueBefore = (label) => {
      const index = paragraphTexts.findIndex((value) => normalizeSquadLabel(value) === normalizeSquadLabel(label));
      return index > 0 ? paragraphTexts[index - 1] || '' : '';
    };

    if (number && name && position) {
      players.push({
        number,
        name,
        position: position.replace(/Tiền Vệ/i, 'Tiền vệ'),
        birthDate: valueAfter('Ngày sinh'),
        hometown: valueAfter('Quê quán'),
        height: valueBefore('Chiều Cao'),
        weight: valueBefore('Cân nặng'),
      });
    }
  });

  if (players.length === 0) return null;
  const canonicalValue = $('link[rel="canonical"]').attr('href');
  const canonicalUrl = canonicalValue ? new URL(canonicalValue, requestedUrl).toString() : requestedUrl;
  if (!isAllowedUrl(canonicalUrl, source)) throw new Error('Canonical URL không thuộc nguồn được phép.');
  const content = players.map((player) => [
    player.position,
    player.number,
    player.name,
    player.birthDate,
    player.hometown,
    player.height,
    player.weight,
  ].join('|')).join('\n');
  const title = compactText(
    $('meta[property="og:title"]').attr('content')
    || $('title').text()
    || 'Đội hình chính thức CLB Bóng đá Sông Lam Nghệ An'
  ).slice(0, 500);

  return {
    sourceKey: source.key,
    publisher: source.publisher,
    title,
    url: canonicalUrl,
    summary: `Danh sách ${players.length} cầu thủ đội 1 SLNA theo vị trí và số áo.`,
    content,
    imageUrl: getAllowedImageUrl($('meta[property="og:image"]').attr('content'), canonicalUrl, source),
    category: 'Đội hình',
    publishedAt: null,
    contentHash: crypto.createHash('sha256').update(`${title}\n${content}`).digest('hex'),
  };
};

const saveArticle = async (article) => {
  await pool.query(`
    INSERT INTO knowledge_documents
      (source_key, title, url, summary, content, image_url, category, published_at, content_hash)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (url) DO UPDATE SET
      source_key = EXCLUDED.source_key,
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      content = EXCLUDED.content,
      image_url = EXCLUDED.image_url,
      category = EXCLUDED.category,
      published_at = COALESCE(EXCLUDED.published_at, knowledge_documents.published_at),
      content_hash = EXCLUDED.content_hash,
      fetched_at = NOW(),
      updated_at = CASE
        WHEN knowledge_documents.content_hash <> EXCLUDED.content_hash THEN NOW()
        ELSE knowledge_documents.updated_at
      END
  `, [article.sourceKey, article.title, article.url, article.summary, article.content, article.imageUrl, article.category, article.publishedAt, article.contentHash]);
};

const updateSourceStatus = async (source, status, error = null) => {
  await pool.query(`
    UPDATE knowledge_sources
    SET last_synced_at = NOW(), last_sync_status = $2, last_sync_error = $3, updated_at = NOW()
    WHERE source_key = $1
  `, [source.key, status, error ? String(error).slice(0, 1000) : null]);
};

const syncSource = async (source, maxArticles) => {
  try {
    const { html } = await fetchAllowedHtml(source.indexUrl, source);
    const urls = extractArticleUrls(html, source).slice(0, maxArticles);
    const targets = urls.map((url) => ({ url, parser: parseArticle }));
    if (source.squadUrl) targets.push({ url: source.squadUrl, parser: parseSquadPage });
    const settled = await Promise.allSettled(targets.map(async ({ url, parser }) => {
      const page = await fetchAllowedHtml(url, source);
      const article = parser(page.html, page.finalUrl, source);
      if (article) await saveArticle(article);
      return Boolean(article);
    }));
    const saved = settled.filter((item) => item.status === 'fulfilled' && item.value).length;
    const failed = settled.filter((item) => item.status === 'rejected').length;
    await updateSourceStatus(source, failed === targets.length && targets.length > 0 ? 'ERROR' : 'SUCCESS', failed ? `${failed}/${targets.length} trang không thể đồng bộ.` : null);
    return { source: source.key, discovered: targets.length, saved, failed };
  } catch (error) {
    await updateSourceStatus(source, 'ERROR', error.message);
    return { source: source.key, discovered: 0, saved: 0, failed: 1, error: error.message };
  }
};

const syncOfficialNews = async ({
  maxArticles = Number(process.env.OFFICIAL_NEWS_MAX_ARTICLES || 8),
  sourceKeys = null,
} = {}) => {
  const safeMax = Math.min(Math.max(Number(maxArticles) || 8, 1), 20);
  const results = [];
  const selectedSources = Array.isArray(sourceKeys)
    ? SOURCES.filter((source) => sourceKeys.includes(source.key))
    : SOURCES;
  for (const source of selectedSources) results.push(await syncSource(source, safeMax));
  return results;
};

const searchOfficialKnowledge = async (question, limit = 3, sourceKey = null) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 3, 1), 5);
  const stopWords = new Set(['ai', 'bao', 'cac', 'cua', 'cho', 'co', 'gi', 'la', 'moi', 'mot', 'nao', 'nhat', 'nhieu', 'nhung', 'thong', 'tin', 'toi', 'tu', 've']);
  const terms = String(question || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const query = [...new Set(terms.filter((term) => term.length > 2 && !stopWords.has(term)))].slice(0, 10).join(' | ');
  if (!query) return [];
  const result = await pool.query(`
    SELECT d.title, d.url, d.summary, d.content, d.published_at AS "publishedAt",
           d.fetched_at AS "fetchedAt", s.publisher,
           ts_rank(
             to_tsvector('simple', COALESCE(d.title, '') || ' ' || COALESCE(d.summary, '') || ' ' || COALESCE(d.content, '')),
             to_tsquery('simple', $1)
           ) AS rank
    FROM knowledge_documents d
    JOIN knowledge_sources s ON s.source_key = d.source_key
    WHERE s.is_enabled = true
      AND ($3::text IS NULL OR d.source_key = $3)
      AND to_tsvector('simple', COALESCE(d.title, '') || ' ' || COALESCE(d.summary, '') || ' ' || COALESCE(d.content, ''))
          @@ to_tsquery('simple', $1)
    ORDER BY rank DESC, d.published_at DESC NULLS LAST, d.fetched_at DESC
    LIMIT $2
  `, [query, safeLimit, sourceKey]);
  return result.rows;
};

const getOfficialSquad = async () => {
  const result = await pool.query(`
    SELECT d.title, d.url, d.content, d.published_at AS "publishedAt",
           d.fetched_at AS "fetchedAt", s.publisher
    FROM knowledge_documents d
    JOIN knowledge_sources s ON s.source_key = d.source_key
    WHERE s.is_enabled = true
      AND d.source_key = 'SLNAFC'
      AND d.category = 'Đội hình'
    ORDER BY d.fetched_at DESC
    LIMIT 1
  `);
  const document = result.rows[0];
  if (!document) return null;
  const players = String(document.content || '').split('\n').flatMap((line) => {
    const [position, number, name, birthDate = '', hometown = '', height = '', weight = ''] = line.split('|');
    return position && number && name ? [{
      position,
      number,
      name: name.trim(),
      birthDate,
      hometown,
      height,
      weight,
    }] : [];
  });
  return players.length > 0 ? { ...document, players } : null;
};

const getLatestOfficialKnowledge = async (limit = 3, sourceKey = null) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 3, 1), 5);
  const result = await pool.query(`
    SELECT d.title, d.url, d.summary, d.content, d.published_at AS "publishedAt",
           d.fetched_at AS "fetchedAt", s.publisher
    FROM knowledge_documents d
    JOIN knowledge_sources s ON s.source_key = d.source_key
    WHERE s.is_enabled = true
      AND ($2::text IS NULL OR d.source_key = $2)
    ORDER BY d.published_at DESC NULLS LAST, d.fetched_at DESC
    LIMIT $1
  `, [safeLimit, sourceKey]);
  return result.rows;
};

module.exports = {
  SOURCES,
  isAllowedUrl,
  getAllowedImageUrl,
  parseArticle,
  parseSquadPage,
  syncOfficialNews,
  searchOfficialKnowledge,
  getOfficialSquad,
  getLatestOfficialKnowledge,
};
