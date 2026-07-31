// sw.js — يدعم الآن تخزين مكتبات CDN الخارجية (React, Tailwind, Babel) للعمل بدون إنترنت
const CACHE_NAME = 'herafi-cache-v4';
const DATA_CACHE_NAME = 'herafi-data-cache-v1';

// نضيف روابط المكتبات الخارجية هنا ليتم تحميلها وحفظها من أول تشغيل
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // نستخدم {mode: 'no-cors'} حتى لا يفشل التحميل بسبب قيود CORS للروابط الخارجية
      return Promise.all(
        CORE_ASSETS.map((url) =>
          fetch(url, { mode: 'no-cors' })
            .then((response) => cache.put(url, response))
            .catch(() => null) // لو فشل رابط واحد، لا نوقف البقية
        )
      );
    })
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

  // بيانات Supabase: شبكة أولاً، مع حفظ نسخة للعمل بدون إنترنت
  if (url.hostname.includes('supabase.co')) {
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
    return;
  }

  // كل شيء آخر (ملفات الموقع + مكتبات CDN الخارجية): شبكة أولاً، ثم كاش عند الفشل
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // نحفظ أي استجابة ناجحة، حتى النوع "opaque" الخاص بالروابط الخارجية
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
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
