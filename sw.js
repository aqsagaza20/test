// ============================================================
//  MedTerm Service Worker v6.0 - النسخة الكاملة
//  تحميل جميع الموارد · تخزين 7 أيام · تشغيل كامل بدون إنترنت
// ============================================================

const CACHE_VERSION = 'medterm-v9.0';
const FONT_CACHE = 'medterm-fonts-v3';
const IMAGE_CACHE = 'medterm-images-v2';
const DATA_CACHE = 'medterm-data-v1';
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 أيام
const CACHE_META_KEY = 'medterm-cache-meta';

// ========================================
//  الملفات الأساسية للتطبيق
// ========================================
const APP_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './features.js',
  './security.js',
  './session.js',
  './worker.js',
  './manifest.json'
];

// ========================================
//  الأيقونات - جميع المقاسات
// ========================================
const ICON_FILES = [
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png'
];

// ========================================
//  الصور المحلية للفصل الأول (عالية الجودة)
// ========================================
const LOCAL_IMAGES = [
  './assets/images/chapter1/1-levels.webp',
  './assets/images/chapter1/2-position.webp',
  './assets/images/chapter1/3-directions.webp',
  './assets/images/chapter1/4-regions.webp',
  './assets/images/chapter1/5-abdomen.webp',
  './assets/images/chapter1/6-planes.webp',
  './assets/images/chapter1/7-cavities.webp',
  './assets/images/chapter1/8-homeostasis.webp',
  './assets/images/chapter1/9-tissues.webp'
];

// ========================================
//  الصور الخارجية من Wikimedia
// ========================================
const EXTERNAL_IMAGES = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Figure_01_01_01.jpg/600px-Figure_01_01_01.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Blausen_0019_AnatomicalDirectionalReferences.png/400px-Blausen_0019_AnatomicalDirectionalReferences.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Anatomical_terms_of_location_-_anterior_posterior.jpg/400px-Anatomical_terms_of_location_-_anterior_posterior.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Human_body_features.jpg/400px-Human_body_features.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Abdo_regions.jpg/500px-Abdo_regions.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/BodyPlanes.jpg/500px-BodyPlanes.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/2201_BodyCavities.jpg/500px-2201_BodyCavities.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Homeostasis_Feedback_Loop.jpg/500px-Homeostasis_Feedback_Loop.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Anatomy_and_Physiology_OpenStax.jpg/480px-Anatomy_and_Physiology_OpenStax.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Anatomical_Position.jpg/300px-Anatomical_Position.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Blausen_0019_AnatomicalDirectionalReferences.png/400px-Blausen_0019_AnatomicalDirectionalReferences.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Gray1219.png/320px-Gray1219.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Blausen_0002_AbdominalQuadrants.png/400px-Blausen_0002_AbdominalQuadrants.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Human_anatomy_planes%2C_labeled.jpg/400px-Human_anatomy_planes%2C_labeled.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Body_cavities.jpg/400px-Body_cavities.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Negative_Feedback.jpg/400px-Negative_Feedback.jpg'
];

// ========================================
//  خطوط Google Fonts (كاملة للتشغيل بدون إنترنت)
// ========================================
const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800&display=swap',
  'https://fonts.gstatic.com/s/cairo/v28/SLXVc1nY6HkvangtZmpcWmhzfH5lWWgcQyyS4J0.woff2',
  'https://fonts.gstatic.com/s/cairo/v28/SLXVc1nY6HkvangtZmpcWmhzfH5lWWgcQyS4J0.woff2',
  'https://fonts.gstatic.com/s/cairo/v28/SLXVc1nY6HkvangtZmpcWmhzfH5lWWgcQS4J0.woff2',
  'https://fonts.gstatic.com/s/tajawal/v9/Iurf6YBj_oCad4k1l8KiHrRpiYlJ.woff2',
  'https://fonts.gstatic.com/s/tajawal/v9/Iurf6YBj_oCad4k1l8KiHrFpiQ.woff2'
];

// ========================================
//  جميع الموارد مجتمعة
// ========================================
const ALL_RESOURCES = [
  ...APP_FILES,
  ...ICON_FILES,
  ...LOCAL_IMAGES,
  ...EXTERNAL_IMAGES,
  ...FONT_URLS
];

const TOTAL = ALL_RESOURCES.length;

// ========================================
//  دوال مساعدة
// ========================================

// إرسال رسالة لجميع العملاء
function notifyClients(data) {
  self.clients.matchAll({ includeUncontrolled: true })
    .then(clients => {
      clients.forEach(c => c.postMessage(data));
    });
}

// حفظ معلومات الكاش
async function saveCacheMeta() {
  const cache = await caches.open(CACHE_VERSION);
  await cache.put(CACHE_META_KEY, new Response(
    JSON.stringify({ 
      cachedAt: Date.now(), 
      version: CACHE_VERSION, 
      total: TOTAL,
      resources: ALL_RESOURCES.length
    })
  ));
}

// الحصول على معلومات الكاش
async function getCacheMeta() {
  try {
    const cache = await caches.open(CACHE_VERSION);
    const res = await cache.match(CACHE_META_KEY);
    return res ? await res.json() : null;
  } catch {
    return null;
  }
}

// حذف الكاش القديم
async function deleteOldCaches() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name !== CACHE_VERSION && 
    name !== FONT_CACHE && 
    name !== IMAGE_CACHE &&
    name !== DATA_CACHE
  );
  return Promise.all(oldCaches.map(name => caches.delete(name)));
}

// حساب حجم الكاش
async function getCacheSize() {
  let totalSize = 0;
  let totalItems = 0;
  
  const cacheNames = await caches.keys();
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    totalItems += keys.length;
    
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.clone().blob();
        totalSize += blob.size;
      }
    }
  }
  
  return { items: totalItems, sizeMB: (totalSize / (1024 * 1024)).toFixed(2) };
}

// ========================================
//  التثبيت (Install)
// ========================================
self.addEventListener('install', event => {
  console.log('[Service Worker] تثبيت الإصدار:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => {
        // تثبيت الملفات الأساسية أولاً
        return Promise.allSettled(
          APP_FILES.map(f => 
            cache.add(f).catch(err => {
              console.warn(`[SW] فشل تخزين ${f}:`, err);
            })
          )
        );
      })
      .then(() => {
        console.log('[Service Worker] تم التثبيت بنجاح');
        return self.skipWaiting();
      })
  );
});

// ========================================
//  التفعيل (Activate)
// ========================================
self.addEventListener('activate', event => {
  console.log('[Service Worker] تفعيل الإصدار الجديد');
  
  event.waitUntil(
    deleteOldCaches()
      .then(() => {
        console.log('[Service Worker] تم حذف الكاش القديم');
        return self.clients.claim();
      })
      .then(() => {
        console.log('[Service Worker] جاهز للتحكم بالصفحات');
      })
  );
});

// ========================================
//  معالجة الطلبات (Fetch)
// ========================================
self.addEventListener('fetch', event => {
  // تجاهل طلبات POST
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // تجاهل طلبات التحليلات
  if (url.pathname.includes('analytics') || url.pathname.includes('track')) {
    return;
  }

  // ========================================
  //  الصور المحلية
  // ========================================
  if (url.pathname.includes('/assets/images/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) {
            return cached;
          }
          return fetch(event.request)
            .then(res => {
              if (res.ok) {
                cache.put(event.request, res.clone());
              }
              return res;
            })
            .catch(() => {
              return new Response('', { status: 404 });
            });
        })
      )
    );
    return;
  }

  // ========================================
  //  الأيقونات
  // ========================================
  if (url.pathname.includes('/icons/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request)
            .then(res => {
              if (res.ok) cache.put(event.request, res.clone());
              return res;
            });
        })
      )
    );
    return;
  }

  // ========================================
  //  الخطوط
  // ========================================
  if (url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com')) {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          
          return fetch(event.request)
            .then(res => {
              if (res.ok) {
                cache.put(event.request, res.clone());
              }
              return res;
            })
            .catch(() => {
              return new Response('', { status: 503 });
            });
        })
      )
    );
    return;
  }

  // ========================================
  //  الصور الخارجية
  // ========================================
  if (url.hostname.includes('wikimedia') || url.hostname.includes('wikipedia')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          
          return fetch(event.request)
            .then(res => {
              if (res.ok) {
                cache.put(event.request, res.clone());
              }
              return res;
            })
            .catch(() => {
              return new Response('', { status: 503 });
            });
        })
      )
    );
    return;
  }

  // ========================================
  //  الملفات الأساسية - Cache First
  // ========================================
  event.respondWith(
    caches.open(CACHE_VERSION).then(cache =>
      cache.match(event.request).then(cached => {
        if (cached) {
          // تحديث في الخلفية
          fetch(event.request)
            .then(res => {
              if (res.ok) {
                cache.put(event.request, res.clone());
              }
            })
            .catch(() => {});
          return cached;
        }
        
        return fetch(event.request)
          .then(res => {
            if (res.ok) {
              cache.put(event.request, res.clone());
            }
            return res;
          })
          .catch(() => {
            // صفحة الخطأ للتوجيه
            if (event.request.mode === 'navigate') {
              return new Response(
                `<!DOCTYPE html>
                <html dir="rtl">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>MedTerm – بدون إنترنت</title>
                  <style>
                    body {
                      font-family: 'Cairo', sans-serif;
                      background: #0d1117;
                      color: #e2e8f0;
                      text-align: center;
                      padding: 60px 20px;
                      margin: 0;
                      direction: rtl;
                    }
                    .offline-icon { font-size: 4rem; margin-bottom: 20px; }
                    h1 { font-size: 1.8rem; color: #63b3ed; margin-bottom: 10px; }
                    p { font-size: 1rem; color: #a0aec0; margin-bottom: 30px; line-height: 1.6; }
                    .btn {
                      display: inline-block;
                      background: #63b3ed;
                      color: #0d1117;
                      padding: 12px 30px;
                      border-radius: 30px;
                      text-decoration: none;
                      font-weight: 700;
                      margin-top: 20px;
                    }
                    .btn:hover { background: #4299e1; }
                  </style>
                </head>
                <body>
                  <div class="offline-icon">📴</div>
                  <h1>أنت غير متصل بالإنترنت</h1>
                  <p>بعض المحتوى غير متاح حالياً.<br>يمكنك استخدام المحتوى الذي قمت بتحميله مسبقاً.</p>
                  <a href="./" class="btn">العودة للرئيسية</a>
                </body>
                </html>`,
                { 
                  status: 200, 
                  headers: { 
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-cache'
                  } 
                }
              );
            }
            return new Response('', { status: 404 });
          });
      })
    )
  );
});

// ========================================
//  معالجة الرسائل
// ========================================
self.addEventListener('message', async event => {
  if (!event.data) return;

  // تخطي الانتظار
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // ========================================
  //  تحميل كل الموارد
  // ========================================
  if (event.data.type === 'DOWNLOAD_ALL') {
    console.log('[Service Worker] بدء تحميل جميع الموارد...');
    
    let done = 0;
    const cacheApp = await caches.open(CACHE_VERSION);
    const cacheFonts = await caches.open(FONT_CACHE);
    const cacheImgs = await caches.open(IMAGE_CACHE);
    const cacheData = await caches.open(DATA_CACHE);

    let lastReportedPct = 0;

    for (const url of ALL_RESOURCES) {
      try {
        const isFont = url.includes('fonts.google') || url.includes('fonts.gstatic');
        const isImage = url.includes('wikimedia') || url.includes('wikipedia') || url.includes('/assets/images/') || url.includes('/icons/');
        const bucket = isFont ? cacheFonts : isImage ? cacheImgs : cacheApp;
        
        const existing = await bucket.match(url);
        if (!existing) {
          const res = await fetch(url, { 
            cache: 'no-cache',
            mode: 'cors',
            credentials: 'omit'
          });
          
          if (res.ok) {
            await bucket.put(url, res.clone());
          } else {
            console.warn(`[SW] فشل تحميل ${url}: ${res.status}`);
          }
        }
      } catch (e) {
        console.warn(`[SW] خطأ في تخزين ${url}:`, e);
      }
      
      done++;
      const pct = Math.round((done / TOTAL) * 100);
      
      if (pct >= lastReportedPct + 2 || done === TOTAL) {
        lastReportedPct = pct;
        
        notifyClients({
          type: 'DOWNLOAD_PROGRESS',
          done,
          total: TOTAL,
          pct,
          label: url.split('/').pop().split('?')[0].slice(0, 35)
        });
      }
    }

    await saveCacheMeta();
    
    // حساب حجم التخزين
    const size = await getCacheSize();
    
    notifyClients({
      type: 'DOWNLOAD_COMPLETE',
      total: TOTAL,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_MAX_AGE,
      size: size.sizeMB
    });
    
    console.log('[Service Worker] اكتمل التحميل بنجاح');
  }

  // ========================================
  //  التحقق من حالة الكاش
  // ========================================
  if (event.data.type === 'CHECK_CACHE') {
    const meta = await getCacheMeta();
    const valid = meta ? (Date.now() - meta.cachedAt) < CACHE_MAX_AGE : false;
    
    const size = await getCacheSize();
    
    notifyClients({
      type: 'CACHE_STATUS',
      valid,
      meta,
      expiresInDays: meta ? Math.max(0, Math.floor((meta.cachedAt + CACHE_MAX_AGE - Date.now()) / 86400000)) : 0,
      size: size.sizeMB,
      items: size.items
    });
  }

  // ========================================
  //  مسح الكاش
  // ========================================
  if (event.data.type === 'CLEAR_CACHE') {
    await Promise.all([
      caches.delete(CACHE_VERSION),
      caches.delete(FONT_CACHE),
      caches.delete(IMAGE_CACHE),
      caches.delete(DATA_CACHE)
    ]);
    
    notifyClients({ type: 'CACHE_CLEARED' });
    console.log('[Service Worker] تم مسح جميع الكاش');
  }

  // ========================================
  //  الحصول على حجم الكاش
  // ========================================
  if (event.data.type === 'GET_CACHE_SIZE') {
    const size = await getCacheSize();
    notifyClients({
      type: 'CACHE_SIZE',
      items: size.items,
      sizeMB: size.sizeMB
    });
  }
});

// ========================================
//  مزامنة الخلفية (للمستقبل)
// ========================================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('[Service Worker] مزامنة الخلفية');
}

// ========================================
//  إشعارات فورية (للمستقبل)
// ========================================
self.addEventListener('push', event => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || './'
    },
    actions: [
      { action: 'open', title: 'فتح التطبيق' },
      { action: 'close', title: 'إغلاق' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('MedTerm', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// ========================================
//  مزامنة دورية (للمستقبل)
// ========================================
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-cache') {
    event.waitUntil(updateCachePeriodically());
  }
});

async function updateCachePeriodically() {
  console.log('[Service Worker] تحديث دوري للكاش');
  
  const meta = await getCacheMeta();
  if (!meta) return;
  
  if (Date.now() - meta.cachedAt > 6 * 24 * 60 * 60 * 1000) {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'CACHE_NEEDS_UPDATE' });
    });
  }
}

// ========================================
//  معالجة الأخطاء
// ========================================
self.addEventListener('error', event => {
  console.error('[Service Worker] خطأ:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[Service Worker] رفض غير معالج:', event.reason);
});
