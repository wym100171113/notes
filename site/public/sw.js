/* 学习笔记站 Service Worker
 * 策略: stale-while-revalidate —— 命中的资源立即用缓存返回, 同时后台向网络请求更新缓存。
 * 哈希文件名(如 @localSearchIndexroot.xxxx.js)内容不可变, 天然适合长期缓存;
 * HTML/页面走网络优先, 避免发布后看到旧内容。
 * 版本号在每次构建时通过 sw-version 生成(见 prepare.mjs), 有新版本时强制刷新旧缓存。
 */
const VERSION = '__SW_VERSION__'
const CACHE_NAME = `notes-sw-${VERSION}`
const PRECACHE = ['/notes/', '/notes/物理/', '/notes/数学/', '/notes/化学/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== location.origin) return

  const isPage = request.mode === 'navigate' || url.pathname.endsWith('.html')
  const isIndex = url.pathname.includes('localSearchIndex')

  // 大索引/哈希资源: 缓存优先 + 后台更新
  if (isIndex || !isPage) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res && res.ok) {
              const clone = res.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return res
          })
          .catch(() => cached)
        return cached || network
      })
    )
    return
  }

  // 页面: 网络优先, 离线时回退缓存
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return res
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/notes/')))
  )
})
