// 오늘의 복붙 — 서비스워커 (앱 셸 캐시 + 오프라인 지원)
var CACHE = 'bokbup-v2';
var SHELL = [
  '/',
  '/app.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return; // 복붙 집계 POST 등은 그대로 통과

  var url = new URL(req.url);

  // API: 네트워크 우선, 실패 시 캐시 (오프라인에서도 마지막 데이터 표시)
  if (url.origin === location.origin && url.pathname.indexOf('/api/') === 0) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res.ok) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || new Response('{"items":[],"total":0}', { headers: { 'Content-Type': 'application/json' } });
        });
      })
    );
    return;
  }

  // HTML(페이지 이동): 네트워크 우선 — 배포한 업데이트가 바로 반영되도록
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res.ok) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () { return caches.match(req).then(function (hit) { return hit || caches.match('/'); }); })
    );
    return;
  }

  // 정적 리소스·폰트: 캐시 우선, 없으면 네트워크 후 캐시
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res.ok && (url.origin === location.origin || url.hostname.indexOf('gstatic.com') !== -1 || url.hostname.indexOf('googleapis.com') !== -1)) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); });
        }
        return res;
      });
    })
  );
});
