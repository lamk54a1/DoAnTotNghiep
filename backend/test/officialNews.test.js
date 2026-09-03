const test = require('node:test');
const assert = require('node:assert/strict');
const { SOURCES, isAllowedUrl, getAllowedImageUrl, parseArticle, parseSquadPage } = require('../services/officialNewsService');

test('chỉ chấp nhận HTTPS thuộc domain nguồn chính thức', () => {
  const slna = SOURCES.find((source) => source.key === 'SLNAFC');
  assert.equal(isAllowedUrl('https://slnafc.com/tin-tuc/bai-viet', slna), true);
  assert.equal(isAllowedUrl('http://slnafc.com/tin-tuc/bai-viet', slna), false);
  assert.equal(isAllowedUrl('https://slnafc.com.example.com/tin-tuc/bai-viet', slna), false);
  assert.equal(isAllowedUrl('https://evil.example/tin-tuc/bai-viet', slna), false);
});

test('trích xuất bài viết và canonical URL từ HTML nguồn', () => {
  const slna = SOURCES.find((source) => source.key === 'SLNAFC');
  const article = parseArticle(`
    <html><head>
      <link rel="canonical" href="https://slnafc.com/tin-tuc/tin-chinh-thuc">
      <meta property="og:title" content="Thông báo chính thức từ SLNA">
      <meta property="og:description" content="Thông tin đã được câu lạc bộ xác nhận.">
      <meta property="article:published_time" content="2026-08-17T10:00:00+07:00">
      <meta property="og:image" content="https://cdn.slnafc.vn/news/test.jpg">
      <meta property="article:section" content="Đội 1">
    </head><body><article><p>Nội dung thông báo chính thức có đầy đủ thông tin cần kiểm chứng.</p></article></body></html>
  `, 'https://slnafc.com/tin-tuc/tin-chinh-thuc', slna);
  assert.equal(article.title, 'Thông báo chính thức từ SLNA');
  assert.equal(article.url, 'https://slnafc.com/tin-tuc/tin-chinh-thuc');
  assert.equal(article.imageUrl, 'https://cdn.slnafc.vn/news/test.jpg');
  assert.equal(article.category, 'Đội 1');
  assert.match(article.contentHash, /^[a-f0-9]{64}$/);
});

test('chỉ chấp nhận ảnh HTTPS từ hạ tầng hình ảnh SLNAFC', () => {
  const slna = SOURCES.find((source) => source.key === 'SLNAFC');
  assert.equal(getAllowedImageUrl('https://cdn.slnafc.vn/news/a.jpg', slna.indexUrl, slna), 'https://cdn.slnafc.vn/news/a.jpg');
  assert.equal(getAllowedImageUrl('https://evil.example/a.jpg', slna.indexUrl, slna), null);
  assert.equal(getAllowedImageUrl('http://cdn.slnafc.vn/a.jpg', slna.indexUrl, slna), null);
});

test('từ chối canonical URL chuyển sang domain ngoài allowlist', () => {
  const slna = SOURCES.find((source) => source.key === 'SLNAFC');
  assert.throws(() => parseArticle(`
    <html><head><link rel="canonical" href="https://evil.example/fake"></head>
    <body><h1>Thông báo giả mạo không được phép</h1><article>Nội dung đủ dài để được phân tích.</article></body></html>
  `, 'https://slnafc.com/tin-tuc/test', slna), /Canonical URL/);
});

test('trích xuất đội hình SLNA theo vị trí, số áo và tên cầu thủ', () => {
  const slna = SOURCES.find((source) => source.key === 'SLNAFC');
  const squad = parseSquadPage(`
    <html><head><title>Đội hình chính thức SLNA</title></head><body>
      <div class="slide-team-item"><div class="detail-team"><p class="number-team">1</p><div><p class="text-xs">Thủ môn</p><p class="font-bold uppercase">Cao Văn Bình</p><div><span>Ngày sinh</span><p>08/01/2005</p></div><div><span>Quê quán</span><p>Nghệ An</p></div><div><p>183</p><p>Chiều Cao</p><p>80</p><p>Cân nặng</p></div></div></div></div>
      <div class="slide-team-item"><div class="detail-team"><p class="number-team">7</p><div><p class="text-xs">Tiền đạo</p><p class="font-bold uppercase">Olaha Michael</p></div></div></div>
    </body></html>
  `, 'https://slnafc.com/doi-hinh', slna);
  assert.equal(squad.category, 'Đội hình');
  assert.equal(squad.summary, 'Danh sách 2 cầu thủ đội 1 SLNA theo vị trí và số áo.');
  assert.match(squad.content, /Thủ môn\|1\|Cao Văn Bình/);
  assert.match(squad.content, /Cao Văn Bình\|08\/01\/2005\|Nghệ An\|183\|80/);
  assert.match(squad.content, /Tiền đạo\|7\|Olaha Michael/);
});
