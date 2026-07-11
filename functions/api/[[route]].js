// 오늘의 복붙 — Cloudflare Pages Functions REST API
// server.js와 동일한 엔드포인트. 복붙 집계는 D1(DB 바인딩: DB)에 저장.
//
//   GET  /api/meta
//   GET  /api/emoticons        (?cat= ?q= ?mbti= ?ids= ?limit=)
//   GET  /api/emoticons/trend
//   GET  /api/picks?n=8
//   POST /api/emoticons/:id/copy

let CACHE = null; // isolate 수명 동안 데이터 캐시

async function loadData(context) {
  if (CACHE) return CACHE;
  const origin = new URL(context.request.url).origin;
  const [curated, imported] = await Promise.all([
    context.env.ASSETS.fetch(origin + '/data/curated.json').then(r => r.json()),
    context.env.ASSETS.fetch(origin + '/data/imported.json').then(r => r.json()).catch(() => []),
  ]);
  const ALL = curated.DATA.concat(imported);
  CACHE = {
    CATS: curated.CATS,
    MBTI_ALL: curated.MBTI_ALL,
    MBTI_DESCS: curated.MBTI_DESCS,
    ALL,
    BY_ID: new Map(ALL.map(d => [d.id, d])),
  };
  return CACHE;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function matches(it, q, CATS) {
  if (it.content.toLowerCase().includes(q)) return true;
  if (it.tags.some(t => t.toLowerCase().includes(q))) return true;
  const cat = CATS.find(c => c.id === it.cat);
  if (cat && cat.ko.includes(q)) return true;
  if (it.mbti.some(m => m.toLowerCase().includes(q))) return true;
  return it.desc.includes(q);
}

function dailyPicks(ALL, n) {
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

async function statsFor(env, ids) {
  // 해당 id들의 서버 집계 조회 (없으면 0)
  const map = {};
  if (!env.DB || ids.length === 0) return map;
  const marks = ids.map(() => '?').join(',');
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, copies FROM stats WHERE id IN (' + marks + ')'
    ).bind(...ids).all();
    for (const r of results) map[r.id] = r.copies;
  } catch (e) { /* 테이블 미생성 등 — 시드값만 사용 */ }
  return map;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const p = url.pathname;
  const data = await loadData(context);
  const { CATS, MBTI_ALL, MBTI_DESCS, ALL, BY_ID } = data;

  if (p === '/api/meta' && request.method === 'GET') {
    return json({ cats: CATS, mbtiAll: MBTI_ALL, mbtiDescs: MBTI_DESCS });
  }

  if (p === '/api/emoticons' && request.method === 'GET') {
    const idsParam = url.searchParams.get('ids');
    if (idsParam) {
      const items = idsParam.split(',').slice(0, 300).map(id => BY_ID.get(id)).filter(Boolean);
      return json({ items, total: items.length });
    }
    let items = ALL;
    const cat = url.searchParams.get('cat');
    const mbti = url.searchParams.get('mbti');
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    if (cat) items = items.filter(d => d.cat === cat);
    if (mbti) items = items.filter(d => d.mbti.includes(mbti.toUpperCase()));
    if (q) items = items.filter(d => matches(d, q, CATS));
    const total = items.length;
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit')) || 300));
    let out;
    if (mbti && !q && !cat && items.length > 0) {
      const day = Math.floor(Date.now() / 86400000);
      const start = (day * 97) % items.length;
      out = [];
      for (let i = 0; i < Math.min(limit, items.length); i++) out.push(items[(start + i) % items.length]);
    } else {
      out = items.slice(0, limit);
    }
    return json({ items: out, total });
  }

  if (p === '/api/emoticons/trend' && request.method === 'GET') {
    const trend = ALL.filter(d => d.cat === 'trend');
    const stats = await statsFor(env, trend.map(d => d.id));
    const items = trend
      .map(d => Object.assign({}, d, { hot: (d.hot || 0) + (stats[d.id] || 0) }))
      .sort((a, b) => (b.hot || 0) - (a.hot || 0));
    return json({ items, total: items.length });
  }

  if (p === '/api/picks' && request.method === 'GET') {
    const n = Math.max(1, Math.min(20, Number(url.searchParams.get('n')) || 8));
    return json({ items: dailyPicks(ALL, n) });
  }

  const copyMatch = p.match(/^\/api\/emoticons\/([A-Za-z0-9_-]+)\/copy$/);
  if (copyMatch && request.method === 'POST') {
    const id = copyMatch[1];
    const item = BY_ID.get(id);
    if (!item) return json({ ok: false, error: 'unknown id' }, 404);
    let copies = 0;
    if (env.DB) {
      try {
        const row = await env.DB.prepare(
          'INSERT INTO stats (id, copies) VALUES (?1, 1) ON CONFLICT(id) DO UPDATE SET copies = copies + 1 RETURNING copies'
        ).bind(id).first();
        copies = row ? row.copies : 0;
      } catch (e) { /* DB 미설정 시에도 앱은 동작 */ }
    }
    return json({ ok: true, id, hot: (item.hot || 0) + copies });
  }

  return json({ ok: false, error: 'not found' }, 404);
}
