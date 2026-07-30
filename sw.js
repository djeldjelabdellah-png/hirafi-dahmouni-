// sw.js — النسخة المحدّثة: استراتيجية "الشبكة أولاً"
// يحاول دائماً يجيب أحدث نسخة من الإنترنت، ولو فشل (بدون نت) يستخدم الكاش
const CACHE_NAME = 'herafi-cache-v2';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
  // أضف باقي ملفاتك الثابتة هنا لو موجودة (style.css، إلخ)
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting(); // يفعّل النسخة الجديدة فوراً بدل ما ينتظر إغلاق كل التبويبات
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // يتحكم بالصفحات المفتوحة فوراً بدون إعادة تحميل يدوية
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // طلبات Supabase تمر مباشرة للشبكة، بدون تدخل الكاش إطلاقاً
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // استراتيجية "الشبكة أولاً": نحاول الإنترنت، ولو فشل نرجع للكاش
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
