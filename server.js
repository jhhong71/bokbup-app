// 오늘의 복붙 — REST API 서버 (의존성 없는 순수 Node.js)
// 실행: node server.js  →  http://localhost:3456
//
// API
//   GET  /api/meta                  카테고리 · MBTI 목록 · MBTI 설명
//   GET  /api/emoticons             전체 이모티콘 (?cat= ?q= ?mbti= 필터 지원)
//   GET  /api/emoticons/trend       트렌드 랭킹 (실제 복붙 횟수 반영, hot 내림차순)
//   GET  /api/picks?n=8             오늘의 추천 (일 단위 결정적 로테이션)
//   POST /api/emoticons/:id/copy    복붙 이벤트 집계 (트렌드 hot에 실시간 반영)

const http = require('http');
const fs = require('fs');
const path = require('path');
const { CATS, MBTI_ALL, MBTI_DESCS, DATA } = require('./data/emoticons');

const PORT = process.env.PORT || 3456;
const PUBLIC_DIR = path.join(__dirname, 'public');
const STATS_FILE = path.join(__dirname, 'data', 'stats.json');

// 오픈소스 컬렉션 (kaomoji-collection, MIT — data/LICENSE-kaomoji-collection.txt)
let IMPORTED = [];
try { IMPORTED = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'data', 'imported.json'), 'utf8')); } catch (e) {}
const ALL = DATA.concat(IMPORTED);
const BY_ID = new Map(ALL.map(d => [d.id, d]));

// ── 서버측 복붙 통계 (파일 영속화) ──
let stats = {};
try { stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); } catch (e) { stats = {}; }

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(STATS_FILE, JSON.stringify(stats, null, 2), () => {});
  }, 300);
}

// 시드 hot + 서버에 쌓인 실제 복붙 횟수
function withHot(item) {
  const copies = stats[item.id] || 0;
  return Object.assign({}, item, { hot: (item.hot || 0) + copies });
}

function matches(it, q) {
  if (it.content.toLowerCase().includes(q)) return true;
  if (it.tags.some(t => t.toLowerCase().includes(q))) return true;
  const cat = CATS.find(c => c.id === it.cat);
  if (cat && cat.ko.includes(q)) return true;
  if (it.mbti.some(m => m.toLowerCase().includes(q))) return true;
  return it.desc.includes(q);
}

// 일 단위 결정적 추천 로테이션 (전체 컬렉션에서 골고루)
function dailyPicks(n) {
  const day = Math.floor(Date.now() / 86400000);
  const out = [];
  const used = {};
  for (let i = 0; out.length < Math.min(n, ALL.length); i++) {
    const idx = (day * 911 + i * 2657) % ALL.length;
    if (!used[idx]) { used[idx] = true; out.push(ALL[idx]); }
    if (i > ALL.length * 3) break;
  }
  return out;
}

function sendJson(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(obj));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

function serveStatic(res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === '/') rel = '/index.html';
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  if (p === '/api/meta' && req.method === 'GET') {
    return sendJson(res, 200, { cats: CATS, mbtiAll: MBTI_ALL, mbtiDescs: MBTI_DESCS });
  }

  if (p === '/api/emoticons' && req.method === 'GET') {
    // id 목록 조회 (보관함·최근 복사용)
    const idsParam = url.searchParams.get('ids');
    if (idsParam) {
      const items = idsParam.split(',').slice(0, 300)
        .map(id => BY_ID.get(id)).filter(Boolean).map(withHot);
      return sendJson(res, 200, { items, total: items.length });
    }

    let items = ALL;
    const cat = url.searchParams.get('cat');
    const mbti = url.searchParams.get('mbti');
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    if (cat) items = items.filter(d => d.cat === cat);
    if (mbti) items = items.filter(d => d.mbti.includes(mbti.toUpperCase()));
    if (q) items = items.filter(d => matches(d, q));

    const total = items.length;
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit')) || 300));
    let out;
    if (mbti && !q && !cat && items.length > 0) {
      // MBTI 추천은 매일 다른 구간에서 뽑기
      const day = Math.floor(Date.now() / 86400000);
      const start = (day * 97) % items.length;
      out = [];
      for (let i = 0; i < Math.min(limit, items.length); i++) out.push(items[(start + i) % items.length]);
    } else {
      out = items.slice(0, limit);
    }
    return sendJson(res, 200, { items: out.map(withHot), total });
  }

  if (p === '/api/emoticons/trend' && req.method === 'GET') {
    const items = ALL.filter(d => d.cat === 'trend').map(withHot)
      .sort((a, b) => (b.hot || 0) - (a.hot || 0));
    return sendJson(res, 200, { items, total: items.length });
  }

  if (p === '/api/picks' && req.method === 'GET') {
    const n = Math.max(1, Math.min(20, Number(url.searchParams.get('n')) || 8));
    return sendJson(res, 200, { items: dailyPicks(n).map(withHot) });
  }

  const copyMatch = p.match(/^\/api\/emoticons\/([A-Za-z0-9_-]+)\/copy$/);
  if (copyMatch && req.method === 'POST') {
    const id = copyMatch[1];
    const item = BY_ID.get(id);
    if (!item) return sendJson(res, 404, { ok: false, error: 'unknown id' });
    stats[id] = (stats[id] || 0) + 1;
    scheduleSave();
    return sendJson(res, 200, { ok: true, id, hot: (item.hot || 0) + stats[id] });
  }

  if (p.startsWith('/api/')) return sendJson(res, 404, { ok: false, error: 'not found' });

  if (req.method === 'GET') return serveStatic(res, p);

  res.writeHead(405); res.end();
});

server.listen(PORT, () => {
  console.log('오늘의 복붙 서버 실행 중 → http://localhost:' + PORT);
});
