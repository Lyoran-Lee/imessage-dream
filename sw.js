/* message-dream Service Worker
 * 离线缓存应用壳，保证加壳成 APP / PWA 后页面可后台保活、断网可用
 */
const CACHE_NAME = 'message-dream-cache-v1';
// 缓存核心资源（同目录相对路径，兼容任意部署路径）
const CORE_ASSETS = [
  './',
  './index.html'
];

// 安装：预缓存核心资源
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS).catch(function () { /* 忽略单个失败 */ });
    }).then(function () { return self.skipWaiting(); })
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// 网络优先、失败回退缓存（保证内容最新，离线也能打开）
self.addEventListener('fetch', function (event) {
  // 只处理同源 GET 请求
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(function (res) {
        // 请求成功：克隆并写入缓存（仅缓存 2xx 响应）
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return res;
      })
      .catch(function () {
        // 网络失败：回退到缓存
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
  );
});
