// 네트워크 우선(network-first) — 인터넷이 되면 항상 최신 화면을 먼저 불러오고,
// 오프라인일 때만 저장된 버전을 보여줘요. (업데이트가 바로 반영되도록)
const CACHE = 'dream-pet-v8';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS).catch(function () {}); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var accept = (req.headers.get('accept') || '');
  var isHTML = req.mode === 'navigate' || accept.indexOf('text/html') !== -1;

  if (isHTML) {
    // 최신 페이지를 항상 인터넷에서 먼저 가져오고, 실패하면 저장본
    e.respondWith(
      fetch(req).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { try { c.put(req, copy); } catch (x) {} });
        return resp;
      }).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match('./index.html'); });
      })
    );
  } else {
    // 아이콘 등 정적 파일은 저장본 우선(빠름), 백그라운드로 갱신
    e.respondWith(
      caches.match(req).then(function (r) {
        var net = fetch(req).then(function (resp) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { try { c.put(req, copy); } catch (x) {} });
          return resp;
        }).catch(function () { return r; });
        return r || net;
      })
    );
  }
});
