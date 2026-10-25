const CACHE_VERSION = "v3";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const MAX_IMAGE_CACHE = 60;

// الملفات الأساسية للتطبيق
const STATIC_ASSETS = ["/", "/index.html"];

// تثبيت SW وتحميل الملفات الأساسية
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// تنظيف الـ caches القديمة
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== IMAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// التحكم في الطلبات
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل طلبات non-GET وFirebase وخارج الموقع
  if (
    request.method !== "GET" ||
    !url.origin.includes(self.location.origin) ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  const isImage = /\.(webp|png|jpg|jpeg|gif|svg|ico)(\?|$)/i.test(url.pathname);
  const isStaticAsset = /\.(js|css|woff2|woff|ttf)(\?|$)/i.test(url.pathname);
  const isHtml = url.pathname === "/" || url.pathname.endsWith(".html");

  if (isStaticAsset) {
    // JS/CSS: Cache First (Vercel يضع hash في الاسم فلن يتغيروا)
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        });
      })
    );
  } else if (isImage) {
    // الصور: Cache First مع حد أقصى للذاكرة
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response.ok) return response;
          const clone = response.clone();
          caches.open(IMAGE_CACHE).then(async (cache) => {
            const keys = await cache.keys();
            if (keys.length >= MAX_IMAGE_CACHE) {
              await cache.delete(keys[0]);
            }
            cache.put(request, clone);
          });
          return response;
        });
      })
    );
  } else if (isHtml) {
    // HTML: Network First (للتأكد من التحديثات)
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
