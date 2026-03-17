// ============================================================
//  MedTerm Service Worker v5.0
//  7-day cache · Progress reporting · Cache-first strategy · Local images support
// ============================================================

const CACHE_VERSION = 'medterm-v8.0';
const FONT_CACHE = 'medterm-fonts-v2';
const IMAGE_CACHE = 'medterm-images-v1';
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_META_KEY = 'medterm-cache-meta';

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
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png'
];

const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800&display=swap'
];

const IMAGE_URLS = [
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

// الصور المحلية للفصل الأول
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

// تجميع كل الموارد
const ALL_RESOURCES = [...APP_FILES, ...FONT_URLS, ...IMAGE_URLS, ...LOCAL_IMAGES];
const TOTAL = ALL_RESOURCES.length;

// ── Helper: broadcast to all clients ─────────────────────
function notifyClients(data) {
  self.clients.matchAll({ includeUncontrolled: true })
    .then(clients => clients.forEach(c => c.postMessage(data)));
}

// ── Helper: cache metadata ────────────────────────────────
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

async function getCacheMeta() {
  try {
    const cache = await caches.open(CACHE_VERSION);
    const res = await cache.match(CACHE_META_KEY);
    return res ? await res.json() : null;
  } catch {
    return null;
  }
}

// ── Helper: clear old caches ─────────────────────────────
async function deleteOldCaches() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name !== CACHE_VERSION && 
    name !== FONT_CACHE && 
    name !== IMAGE_CACHE
  );
  return Promise.all(oldCaches.map(name => caches.delete(name)));
}

// ── INSTALL ───────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => {
        // تثبيت الملفات الأساسية فقط أثناء التثبيت
        return Promise.allSettled(
          APP_FILES.map(f => 
            cache.add(f).catch(err => {
              console.warn(`[SW] Failed to cache ${f}:`, err);
            })
          )
        );
      })
      .then(() => {
        console.log('[Service Worker] Installed successfully');
        return self.skipWaiting();
      })
  );
});

// ── ACTIVATE ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    deleteOldCaches()
      .then(() => {
        console.log('[Service Worker] Old caches cleared');
        return self.clients.claim();
      })
      .then(() => {
        console.log('[Service Worker] Activated and controlling clients');
      })
  );
});

// ── FETCH ─────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  // تجاهل طلبات POST أو الطلبات التي ليست GET
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // تجاهل طلبات التحليلات والإحصائيات
  if (url.pathname.includes('analytics') || url.pathname.includes('track')) {
    return;
  }

  // استراتيجية خاصة للصور المحلية
  if (url.pathname.startsWith('/assets/images/')) {
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
              // إذا فشل التحميل، نعيد صورة افتراضية
              return new Response('', { status: 404, statusText: 'Image not found' });
            });
        })
      )
    );
    return;
  }

  // Fonts
  if (url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com')) {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          
          return fetch(event.request)
            .then(res => {
              if (res.ok) {
                const clone = res.clone();
                cache.put(event.request, clone).catch(err => {
                  console.warn('[SW] Failed to cache font:', err);
                });
              }
              return res;
            })
            .catch(() => {
              // إذا فشل تحميل الخط، نعيد استجابة فارغة (المتصفح سيستخدم الخط الاحتياطي)
              return new Response('', { status: 503 });
            });
        })
      )
    );
    return;
  }

  // Images from Wikimedia
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
              // إذا فشل التحميل، نعيد صورة افتراضية
              return new Response('', { status: 503 });
            });
        })
      )
    );
    return;
  }

  // App – cache first with network fallback
  event.respondWith(
    caches.open(CACHE_VERSION).then(cache =>
      cache.match(event.request).then(cached => {
        // إذا وجدت في الكاش، أعدها
        if (cached) {
          // تحديث الكاش في الخلفية (stale-while-revalidate)
          fetch(event.request)
            .then(res => {
              if (res.ok) {
                cache.put(event.request, res.clone());
              }
            })
            .catch(() => {});
          return cached;
        }
        
        // إذا لم توجد، حاول التحميل من الشبكة
        return fetch(event.request)
          .then(res => {
            if (res.ok) {
              cache.put(event.request, res.clone());
            }
            return res;
          })
          .catch(() => {
            // إذا فشل كل شيء، أعد صفحة الخطأ المخصصة
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
                    .offline-icon {
                      font-size: 4rem;
                      margin-bottom: 20px;
                    }
                    h1 {
                      font-size: 1.8rem;
                      color: #63b3ed;
                      margin-bottom: 10px;
                    }
                    p {
                      font-size: 1rem;
                      color: #a0aec0;
                      margin-bottom: 30px;
                      line-height: 1.6;
                    }
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
                    .btn:hover {
                      background: #4299e1;
                    }
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
            
            // للطلبات الأخرى، أعد استجابة فارغة
            return new Response('', { status: 404 });
          });
      })
    )
  );
});

// ── MESSAGES ──────────────────────────────────────────────
self.addEventListener('message', async event => {
  if (!event.data) return;

  // Skip waiting
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Full download with progress
  if (event.data.type === 'DOWNLOAD_ALL') {
    console.log('[Service Worker] Starting full download...');
    
    let done = 0;
    const cacheApp = await caches.open(CACHE_VERSION);
    const cacheFonts = await caches.open(FONT_CACHE);
    const cacheImgs = await caches.open(IMAGE_CACHE);

    // إرسال تحديث كل 5% لتقليل الحمل
    let lastReportedPct = 0;

    for (const url of ALL_RESOURCES) {
      try {
        const isFont = url.includes('fonts.google') || url.includes('fonts.gstatic');
        const isImage = url.includes('wikimedia') || url.includes('wikipedia') || url.includes('/assets/images/');
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
            console.warn(`[SW] Failed to fetch ${url}: ${res.status}`);
          }
        }
      } catch (e) {
        console.warn(`[SW] Error caching ${url}:`, e);
      }
      
      done++;
      const pct = Math.round((done / TOTAL) * 100);
      
      // أرسل التحديث فقط إذا تغيرت النسبة بمقدار 5% أو كان آخر تحديث
      if (pct >= lastReportedPct + 5 || done === TOTAL) {
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
    
    notifyClients({
      type: 'DOWNLOAD_COMPLETE',
      total: TOTAL,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_MAX_AGE
    });
    
    console.log('[Service Worker] Download complete');
  }

  // Check cache status
  if (event.data.type === 'CHECK_CACHE') {
    const meta = await getCacheMeta();
    const valid = meta ? (Date.now() - meta.cachedAt) < CACHE_MAX_AGE : false;
    
    notifyClients({
      type: 'CACHE_STATUS',
      valid,
      meta,
      expiresInDays: meta ? Math.max(0, Math.floor((meta.cachedAt + CACHE_MAX_AGE - Date.now()) / 86400000)) : 0
    });
  }

  // Clear all caches
  if (event.data.type === 'CLEAR_CACHE') {
    await Promise.all([
      caches.delete(CACHE_VERSION),
      caches.delete(FONT_CACHE),
      caches.delete(IMAGE_CACHE)
    ]);
    
    notifyClients({ type: 'CACHE_CLEARED' });
    console.log('[Service Worker] All caches cleared');
  }

  // Get cache size
  if (event.data.type === 'GET_CACHE_SIZE') {
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
    
    notifyClients({
      type: 'CACHE_SIZE',
      items: totalItems,
      sizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    });
  }
});

// ── BACKGROUND SYNC (للميزات المستقبلية) ──────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // هذه الدالة ستستخدم للمزامنة في الخلفية عند عودة الاتصال
  // سنضيفها في التحديثات المستقبلية
  console.log('[Service Worker] Background sync triggered');
}

// ── PUSH NOTIFICATIONS (للميزات المستقبلية) ───────────────
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

// ── PERIODIC BACKGROUND SYNC (لمتصفحات Chrome المتطورة) ───
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-cache') {
    event.waitUntil(updateCachePeriodically());
  }
});

async function updateCachePeriodically() {
  // تحديث الكاش بشكل دوري
  console.log('[Service Worker] Periodic cache update');
  
  const meta = await getCacheMeta();
  if (!meta) return;
  
  // إذا كان الكاش قديماً بأكثر من 6 أيام، قم بتحديثه
  if (Date.now() - meta.cachedAt > 6 * 24 * 60 * 60 * 1000) {
    // إرسال إشارة للصفحة لبدء التحديث
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'CACHE_NEEDS_UPDATE' });
    });
  }
}

// ── ERROR HANDLING ────────────────────────────────────────
self.addEventListener('error', event => {
  console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[Service Worker] Unhandled rejection:', event.reason);
});