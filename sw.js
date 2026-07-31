// sw.js — يدعم الآن عرض بيانات الحرفيين حتى بدون إنترنت
const CACHE_NAME = 'herafi-cache-v3';
const DATA_CACHE_NAME = 'herafi-data-cache-v1'; // كاش منفصل لبيانات Supabase

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DATA_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // طلبات بيانات Supabase (قوائم الحرفيين، إلخ): شبكة أولاً، وإن فشلت نرجع لآخر نسخة محفوظة
  if (url.hostname.includes('supabase.co')) {
    // فقط اطلبات القراءة (GET) تُحفظ - التسجيل/التعديل يحتاج إنترنت دائماً
    if (event.request.method === 'GET') {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            const responseClone = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
            return response;
          })
          .catch(() => caches.match(event.request))
      );
    }
    // POST/PATCH/DELETE (تسجيل، تعديل) تمر مباشرة، بدون كاش
    return;
  }

  // ملفات الموقع نفسه: شبكة أولاً لضمان آخر تحديث
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (event.request.method === 'GET' && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
