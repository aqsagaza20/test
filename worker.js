// ============================================================
//  MedTerm Web Worker v1.0
//  تشفير وفك تشفير في الخلفية · معالجة البيانات الثقيلة
// ============================================================

// استيراد مكتبة التشفير (لن تعمل مباشرة في Worker، سنعيد كتابتها)
// سنستخدم الخوارزميات مباشرة

// pbkdf2 implementation (مبسطة للعرض - في الواقع نستخدم Web Crypto)
async function deriveKey(password, salt, iterations = 100000) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(password),
    { name: 'PBKDF2' }, false, ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: iterations,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// معالجة الرسائل الواردة
self.addEventListener('message', async (e) => {
  const { type, data, id } = e.data;
  
  try {
    switch (type) {
      case 'ENCRYPT':
        const encrypted = await encryptData(data.text, data.password);
        self.postMessage({ type: 'ENCRYPT_RESULT', data: encrypted, id });
        break;
        
      case 'DECRYPT':
        const decrypted = await decryptData(data.encrypted, data.password);
        self.postMessage({ type: 'DECRYPT_RESULT', data: decrypted, id });
        break;
        
      case 'PROCESS_TERMS':
        // معالجة قائمة طويلة من المصطلحات
        const processed = processTermsInChunks(data.terms, data.chunkSize || 100);
        self.postMessage({ type: 'PROCESS_TERMS_RESULT', data: processed, id });
        break;
        
      case 'GENERATE_QUIZ':
        // توليد اختبار ذكي
        const quiz = generateSmartQuiz(data.chapters, data.count);
        self.postMessage({ type: 'GENERATE_QUIZ_RESULT', data: quiz, id });
        break;
        
      case 'CALCULATE_STATS':
        // حساب إحصائيات متقدمة
        const stats = calculateAdvancedStats(data.xpData, data.sessionData);
        self.postMessage({ type: 'CALCULATE_STATS_RESULT', data: stats, id });
        break;
        
      default:
        self.postMessage({ type: 'ERROR', error: 'Unknown command', id });
    }
  } catch (err) {
    self.postMessage({ type: 'ERROR', error: err.message, id });
  }
});

// تشفير البيانات
async function encryptData(text, password) {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(text)
    );
    
    // تجميع salt + iv + ciphertext
    const result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(ciphertext), salt.length + iv.length);
    
    return btoa(String.fromCharCode(...result));
  } catch (err) {
    console.error('[Worker] Encryption failed:', err);
    throw err;
  }
}

// فك تشفير البيانات
async function decryptData(encrypted, password) {
  try {
    const raw = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    
    const salt = raw.slice(0, 16);
    const iv = raw.slice(16, 28);
    const ciphertext = raw.slice(28);
    
    const key = await deriveKey(password, salt);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error('[Worker] Decryption failed:', err);
    throw err;
  }
}

// معالجة المصطلحات على دفعات
function processTermsInChunks(terms, chunkSize) {
  const result = {
    total: terms.length,
    chunks: [],
    stats: {
      uniqueTerms: 0,
      averageLength: 0,
      categories: {}
    }
  };
  
  // تقسيم إلى أجزاء
  for (let i = 0; i < terms.length; i += chunkSize) {
    const chunk = terms.slice(i, i + chunkSize);
    result.chunks.push({
      start: i,
      end: Math.min(i + chunkSize, terms.length),
      data: chunk.map(t => ({
        en: t.en,
        ar: t.ar,
        desc: t.desc?.substring(0, 50) // تصغير الحجم
      }))
    });
  }
  
  // حساب إحصائيات
  const unique = new Set(terms.map(t => t.en?.toLowerCase())).size;
  result.stats.uniqueTerms = unique;
  
  let totalLength = 0;
  terms.forEach(t => {
    if (t.en) totalLength += t.en.length;
    if (t.category) {
      result.stats.categories[t.category] = (result.stats.categories[t.category] || 0) + 1;
    }
  });
  result.stats.averageLength = Math.round(totalLength / terms.length);
  
  return result;
}

// توليد اختبار ذكي
function generateSmartQuiz(chapters, count) {
  const questions = [];
  const usedChapters = [];
  
  // اختيار عشوائي للفصول
  while (usedChapters.length < Math.min(3, chapters.length)) {
    const randomIndex = Math.floor(Math.random() * chapters.length);
    const ch = chapters[randomIndex];
    if (!usedChapters.includes(ch.id) && ch.quiz?.length) {
      usedChapters.push(ch.id);
    }
  }
  
  // جمع الأسئلة من الفصول المختارة
  let pool = [];
  usedChapters.forEach(chId => {
    const ch = chapters.find(c => c.id === chId);
    if (ch) {
      pool = pool.concat(ch.quiz.map(q => ({ ...q, chapterId: ch.id })));
    }
  });
  
  // اختيار عشوائي
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// حساب إحصائيات متقدمة
function calculateAdvancedStats(xpData, sessionData) {
  const stats = {
    daily: {},
    weekly: {},
    monthly: {},
    predictions: {},
    weakPoints: [],
    strongPoints: []
  };
  
  // تحليل النقاط اليومية
  if (xpData.daily) {
    const days = Object.keys(xpData.daily);
    days.forEach(day => {
      stats.daily[day] = xpData.daily[day];
    });
    
    // توقع الغد
    const last7Days = days.slice(-7).map(d => xpData.daily[d] || 0);
    const average = last7Days.reduce((a, b) => a + b, 0) / Math.max(last7Days.length, 1);
    stats.predictions.tomorrow = Math.round(average * 1.1); // توقع زيادة 10%
  }
  
  // تحليل نقاط الضعف (من SessionManager)
  if (sessionData?.progress?.stats?.timeSpent) {
    const timeSpent = sessionData.progress.stats.timeSpent;
    const chaptersWithTime = Object.entries(timeSpent).map(([id, secs]) => ({
      id: parseInt(id),
      time: secs
    }));
    
    // أكثر الفصول دراسة
    stats.strongPoints = chaptersWithTime
      .sort((a, b) => b.time - a.time)
      .slice(0, 3)
      .map(c => c.id);
    
    // الفصول التي لم تدرس كافياً (أقل من 5 دقائق)
    const allChapters = CHAPTERS || [];
    stats.weakPoints = allChapters
      .filter(ch => !chaptersWithTime.find(c => c.id === ch.id) || 
                     (chaptersWithTime.find(c => c.id === ch.id)?.time || 0) < 300)
      .map(ch => ch.id)
      .slice(0, 3);
  }
  
  return stats;
}