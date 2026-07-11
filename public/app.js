// 오늘의 복붙 v2.1 — 프론트엔드 로직 (REST API 연동, 서버측 검색/필터)
(function () {
  'use strict';

  var $ = function (sel) { return document.querySelector(sel); };
  var LS = 'bokbup.v2.';

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(LS + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(LS + key, JSON.stringify(val)); } catch (e) {}
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmt(n) {
    return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : '' + n;
  }
  function fmtCount(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // ── 상태 ──
  var state = {
    tab: 'home',
    query: '',
    category: null,
    detail: null,
    settingsOpen: false,
    favs: load('favs', {}),
    counts: load('counts', {}),
    recent: load('recent', []),
    mbti: load('mbti', 'INFP'),
    vibrate: load('vibrate', true),
    onboarded: load('onboarded', false),
    toast: null,
    cats: [], mbtiAll: [], mbtiDescs: {},
    cache: {},               // id → item (지금까지 받아온 모든 항목)
    picks: [],
    results: [], resultTotal: 0, resultsFor: null,
    catItems: [], catTotal: 0, catFor: null,
    mbtiItems: [], mbtiFor: null,
    trendItems: [],
  };

  function mergeCache(items) {
    items.forEach(function (it) { state.cache[it.id] = it; });
    return items;
  }
  function byId(id) { return state.cache[id] || null; }
  function catOf(item) {
    for (var i = 0; i < state.cats.length; i++) if (state.cats[i].id === item.cat) return state.cats[i];
    return null;
  }

  // ── 실제 API ──
  function apiGet(path) {
    return fetch(path).then(function (r) { if (!r.ok) throw 0; return r.json(); });
  }
  function fetchItems(params) {
    var qs = Object.keys(params)
      .filter(function (k) { return params[k] !== null && params[k] !== undefined && params[k] !== ''; })
      .map(function (k) { return k + '=' + encodeURIComponent(params[k]); })
      .join('&');
    return apiGet('/api/emoticons' + (qs ? '?' + qs : '')).then(function (r) {
      mergeCache(r.items || []);
      return r;
    });
  }
  function apiCopy(id) {
    return fetch('/api/emoticons/' + encodeURIComponent(id) + '/copy', { method: 'POST' })
      .then(function (r) { return r.json(); }).catch(function () { return null; });
  }

  // ── 토스트 ──
  var toastTimer = null;
  function toast(msg) {
    clearTimeout(toastTimer);
    state.toast = msg;
    renderToast();
    toastTimer = setTimeout(function () { state.toast = null; renderToast(); }, 1500);
  }
  function renderToast() {
    $('#toast-root').innerHTML = state.toast
      ? '<div class="toast"><span style="font-family:\'Nunito\',sans-serif">✓</span><span>' + esc(state.toast) + '</span></div>'
      : '';
  }

  // ── 복사 ──
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return copyFallback(text); });
    }
    return Promise.resolve(copyFallback(text));
  }
  function copyFallback(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function doCopy(item) {
    copyText(item.content).then(function (ok) {
      if (state.vibrate) { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} }
      var short = item.content.length > 14 ? item.content.slice(0, 14) + '…' : item.content;
      toast(ok ? '복사됨!  ' + short : '복사에 실패했어요');
      if (!ok) return;
      state.counts[item.id] = (state.counts[item.id] || 0) + 1;
      state.recent = [item.id].concat(state.recent.filter(function (id) { return id !== item.id; })).slice(0, 10);
      save('counts', state.counts);
      save('recent', state.recent);
      // 서버에 복붙 이벤트 집계 → 트렌드 hot 실시간 반영
      apiCopy(item.id).then(function (r) {
        if (r && r.ok) {
          var it = byId(r.id);
          if (it) it.hot = r.hot;
          if (state.tab === 'trend') renderTrend();
        }
      });
      renderScreens();
    });
  }

  function toggleFav(id) {
    if (state.favs[id]) delete state.favs[id]; else state.favs[id] = true;
    save('favs', state.favs);
    if (state.vibrate) { try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} }
    renderScreens();
    renderOverlay();
  }

  function setMbti(m) {
    state.mbti = m;
    save('mbti', m);
  }

  // ── 카드 템플릿 ──
  function cardHTML(it, opts) {
    opts = opts || {};
    var fav = !!state.favs[it.id];
    var cat = catOf(it);
    var tagline = it.tags.map(function (t) { return '#' + t; }).join(' ');
    return '<div class="card" data-action="copy" data-id="' + it.id + '">' +
      '<div class="card-content">' + esc(it.content) + '</div>' +
      '<div class="card-meta">' +
      (opts.showCat ? '<div class="cat-badge">' + esc(cat ? cat.ko : '') + '</div>' : '') +
      '<div class="card-tagline">' + esc(tagline) + '</div>' +
      '<div class="info-btn" data-action="info" data-id="' + it.id + '">ⓘ</div>' +
      '<div class="heart-btn' + (fav ? ' on' : '') + '" data-action="fav" data-id="' + it.id + '">' + (fav ? '♥' : '♡') + '</div>' +
      '</div></div>';
  }

  function mbtiGridHTML(action) {
    return state.mbtiAll.map(function (m) {
      return '<div class="mbti-btn' + (state.mbti === m ? ' on' : '') + '" data-action="' + action + '" data-m="' + m + '">' + m + '</div>';
    }).join('');
  }

  function loadingHTML(msg) {
    return '<div style="text-align:center;padding:36px 0;color:#C7A984;font-size:13px">' + esc(msg || '불러오는 중…') + ' ⸜(｡˃ ᵕ ˂ )⸝</div>';
  }

  // ── 검색 (서버 API, 디바운스) ──
  var searchTimer = null, searchSeq = 0;
  function queueSearch() {
    clearTimeout(searchTimer);
    var q = state.query.trim();
    if (!q) return;
    searchTimer = setTimeout(function () {
      var seq = ++searchSeq;
      fetchItems({ q: q, limit: 300 }).then(function (r) {
        if (seq !== searchSeq) return;
        state.results = r.items;
        state.resultTotal = r.total;
        state.resultsFor = q;
        if (state.tab === 'home') renderHome();
      }).catch(function () { toast('데이터를 불러오지 못했어요'); });
    }, 200);
  }

  // ── 카테고리 (서버 API) ──
  function loadCategory() {
    var c = state.category;
    if (!c) return;
    fetchItems({ cat: c, limit: 300 }).then(function (r) {
      if (state.category !== c) return;
      state.catItems = r.items;
      state.catTotal = r.total;
      state.catFor = c;
      if (state.tab === 'home') renderHome();
    }).catch(function () { toast('데이터를 불러오지 못했어요'); });
  }

  // ── MBTI 추천 (서버 API) ──
  function loadMbti() {
    var m = state.mbti;
    fetchItems({ mbti: m, limit: 8 }).then(function (r) {
      if (state.mbti !== m) return;
      state.mbtiItems = r.items;
      state.mbtiFor = m;
      if (state.tab === 'mbti') renderMbti();
    }).catch(function () { toast('데이터를 불러오지 못했어요'); });
  }

  // ── 트렌드 (서버 API) ──
  function loadTrend() {
    apiGet('/api/emoticons/trend').then(function (r) {
      mergeCache(r.items || []);
      state.trendItems = r.items || [];
      if (state.tab === 'trend') renderTrend();
    }).catch(function () { toast('데이터를 불러오지 못했어요'); });
  }

  // ── 보관함 (id 목록 → 서버 조회) ──
  function loadSaved() {
    var favIds = Object.keys(state.favs);
    var ids = favIds.concat(state.recent.filter(function (id) { return favIds.indexOf(id) === -1; }));
    var missing = ids.filter(function (id) { return !state.cache[id]; });
    if (missing.length === 0) { renderSaved(); return; }
    fetchItems({ ids: missing.join(',') }).then(function () {
      if (state.tab === 'saved') renderSaved();
    }).catch(function () { toast('데이터를 불러오지 못했어요'); });
  }

  // ── 홈 ──
  function renderHome() {
    var el = $('#home-content');
    var q = state.query.trim();
    $('#clear-query').style.display = q ? 'flex' : 'none';

    if (q) {
      if (state.resultsFor !== q) {
        el.innerHTML = loadingHTML('찾는 중…');
        return;
      }
      var results = state.results;
      var shown = results.length;
      el.innerHTML =
        '<div class="sec-head" style="margin:2px 4px 12px">' +
          '<div class="sec-title" style="font-size:17px">검색 결과</div>' +
          '<div class="sec-count">' + fmtCount(state.resultTotal) + '개' +
            (state.resultTotal > shown ? ' 중 ' + shown + '개 표시' : '') + '</div>' +
          '<div class="sec-hint">터치하면 바로 복사</div>' +
        '</div>' +
        (results.length === 0
          ? '<div style="text-align:center;padding:40px 0;color:#B99B7C">' +
              '<div style="font-size:26px;margin-bottom:10px">૮꒰˶ᵔ ᗜ ᵔ˶꒱ა ?</div>' +
              '<div style="font-size:13.5px">앗, 딱 맞는 게 없어요.<br>다른 말로 검색해볼까요?</div>' +
            '</div>'
          : '') +
        '<div class="list">' + results.map(function (it) { return cardHTML(it, { showCat: true }); }).join('') + '</div>';
      return;
    }

    var chips = '<div class="chip-row">' + state.cats.map(function (c) {
      return '<div class="chip' + (state.category === c.id ? ' on' : '') + '" data-action="chip" data-cat="' + c.id + '">' +
        '<span style="font-family:\'Nunito\',sans-serif;font-size:12px">' + esc(c.icon) + '</span>' +
        '<span>' + esc(c.ko) + '</span></div>';
    }).join('') + '</div>';

    if (state.category) {
      var catObj = null;
      state.cats.forEach(function (c) { if (c.id === state.category) catObj = c; });
      var ready = state.catFor === state.category;
      var items = ready ? state.catItems : [];
      el.innerHTML = chips +
        '<div style="display:flex;align-items:center;gap:10px;margin:4px 2px 12px">' +
          '<div data-action="clear-cat" style="flex:none;width:30px;height:30px;border-radius:50%;background:#FFFAF0;border:1.5px solid #F2D8B5;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#C4762A;font-weight:800">←</div>' +
          '<div style="font-family:\'Jua\',sans-serif;font-size:18px;color:#4E3A2B">' + esc(catObj ? catObj.ko : '') + '</div>' +
          (ready ? '<div class="sec-count">' + fmtCount(state.catTotal) + '개' +
            (state.catTotal > items.length ? ' 중 ' + items.length + '개 표시' : '') + '</div>' : '') +
          '<div class="sec-hint">터치하면 바로 복사</div>' +
        '</div>' +
        (ready
          ? '<div class="list">' + items.map(function (it) { return cardHTML(it); }).join('') + '</div>'
          : loadingHTML());
    } else {
      el.innerHTML = chips +
        '<div class="sec-head" style="margin:4px 4px 12px">' +
          '<div class="sec-title" style="font-size:17px">오늘의 추천</div>' +
          '<div class="sec-eng">TODAY\'S PICK ✦</div>' +
          '<div class="sec-hint">터치하면 바로 복사</div>' +
        '</div>' +
        (state.picks.length
          ? '<div class="list">' + state.picks.map(function (it) { return cardHTML(it, { showCat: true }); }).join('') + '</div>'
          : loadingHTML());
    }
  }

  // ── 트렌드 ──
  function renderTrend() {
    var el = $('#screen-trend');
    var rankColors = ['#E96A7C', '#EF8F3D', '#E3B341'];
    var trend = state.trendItems.slice().sort(function (a, b) { return (b.hot || 0) - (a.hot || 0); });
    el.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin:10px 2px 4px">' +
        '<div style="font-family:\'Jua\',sans-serif;font-size:24px;color:#4E3A2B">트렌드</div>' +
        '<div style="background:#F2A7B3;color:#FFF;border-radius:999px;padding:3px 10px;font-family:\'Nunito\',sans-serif;font-size:10.5px;font-weight:800;letter-spacing:.05em">WEEKLY ✦</div>' +
      '</div>' +
      '<div style="font-size:12.5px;color:#B99B7C;margin:0 4px 14px">이번 주 인스타에서 가장 많이 복붙된 감성 데코 · 터치하면 바로 복사</div>' +
      (trend.length === 0 ? loadingHTML() : '') +
      '<div class="list">' + trend.map(function (it, i) {
        var fav = !!state.favs[it.id];
        var trendline = it.tags.slice(0, 3).map(function (t) { return '#' + t; }).join(' ') +
          (it.hot ? ' · ' + fmt(it.hot) + ' 복붙' : '');
        return '<div class="card" data-action="copy" data-id="' + it.id + '" style="display:flex;align-items:center;gap:13px">' +
          '<div style="flex:none;width:26px;font-family:\'Nunito\',sans-serif;font-size:17px;font-weight:800;color:' + (rankColors[i] || '#C7A984') + ';text-align:center">' + (i + 1) + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:16.5px;line-height:1.4;word-break:break-all">' + esc(it.content) + '</div>' +
            '<div style="font-size:11px;color:#B99B7C;margin-top:4px">' + esc(trendline) + '</div>' +
          '</div>' +
          '<div class="info-btn" data-action="info" data-id="' + it.id + '">ⓘ</div>' +
          '<div class="heart-btn' + (fav ? ' on' : '') + '" data-action="fav" data-id="' + it.id + '">' + (fav ? '♥' : '♡') + '</div>' +
        '</div>';
      }).join('') + '</div>';
  }

  // ── MBTI ──
  function renderMbti() {
    var el = $('#screen-mbti');
    var ready = state.mbtiFor === state.mbti;
    el.innerHTML =
      '<div style="font-family:\'Jua\',sans-serif;font-size:24px;color:#4E3A2B;margin:10px 2px 4px">MBTI 추천</div>' +
      '<div style="font-size:12.5px;color:#B99B7C;margin:0 4px 14px">내 MBTI를 고르면 찰떡인 이모티콘을 골라줘요 · 매일 새로운 픽</div>' +
      '<div class="mbti-grid" style="margin-bottom:18px">' + mbtiGridHTML('mbti-pick') + '</div>' +
      '<div class="sec-head" style="margin:0 4px 12px">' +
        '<div class="sec-title" style="font-size:17px">' + esc(state.mbti) + ' 맞춤 픽</div>' +
        '<div style="font-size:11.5px;color:#C79A6B">' + esc(state.mbtiDescs[state.mbti] || '') + '</div>' +
      '</div>' +
      (ready
        ? '<div class="list">' + state.mbtiItems.map(function (it) { return cardHTML(it); }).join('') + '</div>'
        : loadingHTML());
  }

  // ── 보관함 ──
  function renderSaved() {
    var el = $('#screen-saved');
    var savedItems = Object.keys(state.favs).map(byId).filter(Boolean);
    var recentItems = state.recent.map(byId).filter(Boolean);
    var noSaved = Object.keys(state.favs).length === 0 && state.recent.length === 0;
    el.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin:10px 2px 4px">' +
        '<div style="font-family:\'Jua\',sans-serif;font-size:24px;color:#4E3A2B">보관함</div>' +
        '<div style="background:#FDE3E7;color:#E96A7C;border-radius:999px;padding:3px 10px;font-family:\'Nunito\',sans-serif;font-size:11px;font-weight:800">' + savedItems.length + ' ♥</div>' +
      '</div>' +
      '<div style="font-size:12.5px;color:#B99B7C;margin:0 4px 14px">하트 누른 이모티콘과 최근 복사가 모여요</div>' +
      (noSaved
        ? '<div style="text-align:center;padding:34px 20px">' +
            '<div style="width:110px;height:110px;margin:0 auto 14px;border-radius:50%;border:2px dashed #F2D8B5;background:#FFFAF0;overflow:hidden">' +
              '<svg class="mascot" viewBox="0 0 64 64"><circle cx="18" cy="16" r="9" fill="#F2C894"/><circle cx="46" cy="16" r="9" fill="#F2C894"/><circle cx="18" cy="17" r="4.5" fill="#FBE3C4"/><circle cx="46" cy="17" r="4.5" fill="#FBE3C4"/><circle cx="32" cy="36" r="22" fill="#F2C894"/><ellipse cx="32" cy="43" rx="10" ry="8" fill="#FBE3C4"/><circle cx="24" cy="32" r="2.4" fill="#5C4531"/><circle cx="40" cy="32" r="2.4" fill="#5C4531"/><ellipse cx="32" cy="40" rx="3" ry="2.4" fill="#5C4531"/><path d="M32 42.5v2.5 M32 45c-1.5 2-4 2-5 .5 M32 45c1.5 2 4 2 5 .5" stroke="#5C4531" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="19" cy="40" r="3.2" fill="#F2A78C" opacity=".55"/><circle cx="45" cy="40" r="3.2" fill="#F2A78C" opacity=".55"/></svg>' +
            '</div>' +
            '<div style="font-family:\'Jua\',sans-serif;font-size:16px;color:#8A6B4F;margin-bottom:6px">아직 텅 비었어요 ( ˘•ω•˘ )</div>' +
            '<div style="font-size:12.5px;color:#B99B7C;line-height:1.6">마음에 드는 이모티콘의 ♡를 누르면<br>여기에 차곡차곡 모여요</div>' +
          '</div>'
        : '') +
      '<div class="list">' + savedItems.map(function (it) { return cardHTML(it, { showCat: true }); }).join('') + '</div>' +
      (recentItems.length > 0
        ? '<div class="sec-head" style="margin:20px 4px 10px">' +
            '<div class="sec-title" style="font-size:16px">최근 복사</div>' +
            '<div class="sec-eng" style="font-size:10.5px">RECENT</div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px">' +
          recentItems.map(function (it) {
            return '<div class="card" data-action="copy" data-id="' + it.id + '" style="border-radius:14px;padding:11px 15px;display:flex;align-items:center;gap:12px;box-shadow:none">' +
              '<div style="flex:1;min-width:0;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(it.content) + '</div>' +
              '<div style="flex:none;font-size:10.5px;color:#C7A984">' + (state.counts[it.id] || 0) + '번 복붙</div>' +
            '</div>';
          }).join('') + '</div>'
        : '');
  }

  // ── 시트 (상세 / 설정) ──
  function renderOverlay() {
    var root = $('#overlay-root');
    if (state.detail) {
      var d = state.detail;
      var favOn = !!state.favs[d.id];
      root.innerHTML =
        '<div class="sheet-wrap">' +
          '<div class="sheet-dim" data-action="close-detail"></div>' +
          '<div class="sheet">' +
            '<div class="sheet-handle"></div>' +
            '<div data-action="detail-copy" style="background:#FBF3E5;border:2px dashed #F2D8B5;border-radius:20px;padding:24px 16px 14px;text-align:center;cursor:pointer;margin-bottom:12px">' +
              '<div style="font-size:26px;line-height:1.5;word-break:break-all">' + esc(d.content) + '</div>' +
              '<div style="font-size:11px;color:#C7A984;margin-top:10px">터치하면 바로 복사돼요 ✦</div>' +
            '</div>' +
            '<div style="text-align:center;font-size:13px;color:#8A6B4F;margin-bottom:14px">' + esc(d.desc) + '</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:10px">' +
              d.tags.map(function (t) {
                return '<div data-action="tag" data-tag="' + esc(t) + '" style="background:#FDEBD3;border-radius:999px;padding:4px 11px;font-size:11.5px;color:#C4762A;cursor:pointer">#' + esc(t) + '</div>';
              }).join('') +
            '</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:18px">' +
              d.mbti.map(function (m) {
                return '<div style="background:#FFF;border:1.5px solid #F2A7B3;border-radius:999px;padding:4px 11px;font-family:\'Nunito\',sans-serif;font-size:11px;font-weight:800;color:#E96A7C">' + m + '</div>';
              }).join('') +
            '</div>' +
            '<div data-action="detail-fav" style="text-align:center;border-radius:999px;padding:13px 0;font-family:\'Jua\',sans-serif;font-size:15px;cursor:pointer;border:1.5px solid ' +
              (favOn ? '#F2A7B3;background:#FDE3E7;color:#E96A7C' : '#F2D8B5;background:#FFFAF0;color:#8A6B4F') + '">' +
              (favOn ? '♥ 보관함에 담김' : '♡ 보관함에 담기') +
            '</div>' +
          '</div>' +
        '</div>';
      return;
    }
    if (state.settingsOpen) {
      var copyTotal = Object.keys(state.counts).reduce(function (a, k) { return a + state.counts[k]; }, 0);
      root.innerHTML =
        '<div class="sheet-wrap">' +
          '<div class="sheet-dim" data-action="close-settings"></div>' +
          '<div class="sheet">' +
            '<div class="sheet-handle"></div>' +
            '<div style="font-family:\'Jua\',sans-serif;font-size:19px;color:#4E3A2B;text-align:center;margin-bottom:16px">설정</div>' +
            '<div class="setting-row">' +
              '<div style="flex:1;font-size:14px">복사 시 진동</div>' +
              '<div class="toggle' + (state.vibrate ? ' on' : '') + '" data-action="toggle-vibe"><div class="toggle-knob"></div></div>' +
            '</div>' +
            '<div class="setting-row">' +
              '<div style="flex:1;font-size:14px">내 MBTI</div>' +
              '<div style="font-family:\'Nunito\',sans-serif;font-size:13px;font-weight:800;color:#C4762A">' + esc(state.mbti) + '</div>' +
              '<div data-action="go-mbti-settings" style="background:#FDEBD3;border-radius:999px;padding:6px 13px;font-size:12px;color:#C4762A;cursor:pointer">변경</div>' +
            '</div>' +
            '<div class="setting-row">' +
              '<div style="flex:1;font-size:14px">복사 기록 지우기 <span style="font-size:11px;color:#B99B7C">' + copyTotal + '회 복붙함</span></div>' +
              '<div data-action="clear-recent" style="background:#FBF3E5;border:1.5px solid #F2D8B5;border-radius:999px;padding:6px 13px;font-size:12px;color:#8A6B4F;cursor:pointer">지우기</div>' +
            '</div>' +
            '<div class="setting-row">' +
              '<div style="flex:1;font-size:14px">앱 버전</div>' +
              '<div style="font-size:12px;color:#C79A6B">2.1.0</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      return;
    }
    root.innerHTML = '';
  }

  // ── 온보딩 ──
  function renderOnboard() {
    var root = $('#onboard-root');
    if (state.onboarded) { root.innerHTML = ''; return; }
    root.innerHTML =
      '<div style="position:absolute;inset:0;z-index:60;background:#FBF3E5;display:flex;flex-direction:column;overflow-y:auto">' +
        '<div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(400px 300px at 50% -6%, rgba(244,183,110,.32), transparent 70%),radial-gradient(340px 320px at -10% 60%, rgba(247,210,157,.30), transparent 70%)"></div>' +
        '<div style="position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 30px;text-align:center">' +
          '<div style="font-size:15px;color:#D3B693;margin-bottom:16px;letter-spacing:.2em">⋆⁺₊⋆ ☾ ⋆⁺₊⋆</div>' +
          '<div style="width:120px;height:120px;border-radius:34px;border:2px solid #F2D8B5;background:#FFFAF0;overflow:hidden;box-shadow:0 8px 24px rgba(196,148,90,.18);animation:bkFloat 3.5s ease-in-out infinite;margin-bottom:20px">' +
            '<svg class="mascot" viewBox="0 0 64 64"><circle cx="18" cy="16" r="9" fill="#F2C894"/><circle cx="46" cy="16" r="9" fill="#F2C894"/><circle cx="18" cy="17" r="4.5" fill="#FBE3C4"/><circle cx="46" cy="17" r="4.5" fill="#FBE3C4"/><circle cx="32" cy="36" r="22" fill="#F2C894"/><ellipse cx="32" cy="43" rx="10" ry="8" fill="#FBE3C4"/><circle cx="24" cy="32" r="2.4" fill="#5C4531"/><circle cx="40" cy="32" r="2.4" fill="#5C4531"/><ellipse cx="32" cy="40" rx="3" ry="2.4" fill="#5C4531"/><path d="M32 42.5v2.5 M32 45c-1.5 2-4 2-5 .5 M32 45c1.5 2 4 2 5 .5" stroke="#5C4531" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="19" cy="40" r="3.2" fill="#F2A78C" opacity=".55"/><circle cx="45" cy="40" r="3.2" fill="#F2A78C" opacity=".55"/></svg>' +
          '</div>' +
          '<div style="font-family:\'Jua\',sans-serif;font-size:32px;color:#4E3A2B">오늘의 복붙</div>' +
          '<div style="font-family:\'Nunito\',sans-serif;font-size:11.5px;font-weight:800;letter-spacing:.08em;color:#C79A6B;margin-top:7px">TODAY\'S COPY &amp; PASTE</div>' +
          '<div style="font-size:13.5px;color:#8A6B4F;margin-top:14px;line-height:1.7">버튼은 없어요 — 이모티콘을 <b style="color:#E07F2B">터치</b>하면<br>바로 클립보드에 담겨요 ⸜(｡˃ ᵕ ˂ )⸝♡</div>' +
          '<div style="font-family:\'Jua\',sans-serif;font-size:15px;color:#4E3A2B;margin:26px 0 10px">내 MBTI를 고르면 첫 추천을 준비해둘게요</div>' +
          '<div class="mbti-grid" style="gap:7px;width:100%;max-width:340px">' + mbtiGridHTML('ob-mbti') + '</div>' +
        '</div>' +
        '<div style="position:relative;padding:0 26px calc(30px + env(safe-area-inset-bottom))">' +
          '<div data-action="finish-onboard" style="background:#EF8F3D;color:#FFF;border-radius:999px;padding:15px 0;text-align:center;font-family:\'Jua\',sans-serif;font-size:17px;box-shadow:0 4px 14px rgba(224,127,43,.4);cursor:pointer">시작하기</div>' +
          '<div data-action="finish-onboard" style="margin-top:10px;background:#FFFAF0;border:1.5px solid #F2D8B5;color:#8A6B4F;border-radius:999px;padding:14px 0;text-align:center;font-family:\'Jua\',sans-serif;font-size:16px;cursor:pointer">건너뛰기</div>' +
          '<div style="text-align:center;font-size:11.5px;color:#C7A984;margin-top:10px">나중에 설정에서 바꿀 수 있어요</div>' +
        '</div>' +
      '</div>';
  }

  // ── 화면 전환 ──
  function renderNav() {
    document.querySelectorAll('.nav-item').forEach(function (n) {
      n.classList.toggle('on', n.getAttribute('data-tab') === state.tab);
    });
  }
  function renderScreens() {
    ['home', 'trend', 'mbti', 'saved'].forEach(function (t) {
      $('#screen-' + t).style.display = state.tab === t ? '' : 'none';
    });
    renderNav();
    if (state.tab === 'home') renderHome();
    else if (state.tab === 'trend') renderTrend();
    else if (state.tab === 'mbti') renderMbti();
    else if (state.tab === 'saved') renderSaved();
  }
  function syncSearchInput() {
    $('#search-input').value = state.query;
  }
  function goTab(tab) {
    state.tab = tab;
    if (tab !== 'home') { state.query = ''; state.category = null; syncSearchInput(); }
    $('#scroll').scrollTop = 0;
    renderScreens();
    if (tab === 'trend') loadTrend();
    else if (tab === 'mbti' && state.mbtiFor !== state.mbti) loadMbti();
    else if (tab === 'saved') loadSaved();
  }

  // ── 칩 가로 슬라이드 — 마우스 드래그·휠 지원 (터치는 브라우저 기본 스크롤) ──
  var dragRow = null, dragStartX = 0, dragStartScroll = 0, dragged = false;
  document.addEventListener('pointerdown', function (e) {
    var row = e.target.closest('.chip-row');
    if (!row || e.pointerType === 'touch') return;
    dragRow = row; dragStartX = e.clientX; dragStartScroll = row.scrollLeft; dragged = false;
  });
  document.addEventListener('pointermove', function (e) {
    if (!dragRow) return;
    var dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 5) { dragged = true; dragRow.classList.add('dragging'); }
    dragRow.scrollLeft = dragStartScroll - dx;
  });
  document.addEventListener('pointerup', function () {
    if (dragRow) dragRow.classList.remove('dragging');
    dragRow = null;
  });
  // 드래그 직후 발생하는 클릭은 칩 선택으로 처리하지 않음
  document.addEventListener('click', function (e) {
    if (dragged && e.target.closest('.chip-row')) {
      e.stopPropagation(); e.preventDefault(); dragged = false;
    }
  }, true);
  document.addEventListener('wheel', function (e) {
    var row = e.target.closest('.chip-row');
    if (row && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      row.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });

  // ── 이벤트 (위임) ──
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-action]');
    if (!t) return;
    var action = t.getAttribute('data-action');
    var id = t.getAttribute('data-id');
    var item = id ? byId(id) : null;

    switch (action) {
      case 'copy': if (item) doCopy(item); break;
      case 'info': e.stopPropagation(); if (item) { state.detail = item; renderOverlay(); } break;
      case 'fav': e.stopPropagation(); if (id) toggleFav(id); break;
      case 'nav': goTab(t.getAttribute('data-tab')); break;
      case 'chip': {
        var c = t.getAttribute('data-cat');
        state.category = state.category === c ? null : c;
        renderHome();
        if (state.category) loadCategory();
        break;
      }
      case 'clear-cat': state.category = null; renderHome(); break;
      case 'clear-query': state.query = ''; syncSearchInput(); renderHome(); break;
      case 'mbti-pick': setMbti(t.getAttribute('data-m')); renderMbti(); loadMbti(); break;
      case 'ob-mbti': setMbti(t.getAttribute('data-m')); renderOnboard(); break;
      case 'finish-onboard': state.onboarded = true; save('onboarded', true); renderOnboard(); break;
      case 'close-detail': state.detail = null; renderOverlay(); break;
      case 'detail-copy': if (state.detail) doCopy(state.detail); break;
      case 'detail-fav': if (state.detail) toggleFav(state.detail.id); break;
      case 'tag': {
        var tag = t.getAttribute('data-tag');
        state.detail = null;
        state.tab = 'home';
        state.category = null;
        state.query = tag;
        syncSearchInput();
        renderOverlay();
        renderScreens();
        queueSearch();
        break;
      }
      case 'open-settings': state.settingsOpen = true; renderOverlay(); break;
      case 'close-settings': state.settingsOpen = false; renderOverlay(); break;
      case 'toggle-vibe': state.vibrate = !state.vibrate; save('vibrate', state.vibrate); renderOverlay(); break;
      case 'go-mbti-settings': state.settingsOpen = false; goTab('mbti'); renderOverlay(); break;
      case 'clear-recent':
        state.recent = []; state.counts = {};
        save('recent', []); save('counts', {});
        toast('복사 기록을 지웠어요');
        renderOverlay(); renderScreens();
        break;
    }
  });

  $('#search-input').addEventListener('input', function (e) {
    state.query = e.target.value;
    renderHome();
    queueSearch();
  });

  // ── 시작: 실제 API에서 데이터 로드 ──
  function init() {
    renderScreens();
    renderOnboard();
    Promise.all([apiGet('/api/meta'), apiGet('/api/picks?n=8')])
      .then(function (res) {
        state.cats = res[0].cats;
        state.mbtiAll = res[0].mbtiAll;
        state.mbtiDescs = res[0].mbtiDescs;
        state.picks = mergeCache(res[1].items || []);
        renderScreens();
        renderOnboard();
      })
      .catch(function () { toast('데이터를 불러오지 못했어요'); });
  }

  init();
})();
