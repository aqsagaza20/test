// ============================================================
//  MedTerm App v6.0 – app.js
//  Chapter 1 full rich content · Images gallery · Search · Exam · PWA
//  Offline support · Session management
// ============================================================

const STATE = {
  currentPage: 'home',
  currentChapter: null,
  currentMode: null,
  currentSource: 'doctor',
  translateLang: 'ar',
  favorites: JSON.parse(localStorage.getItem('medterm_favs') || '[]'),
  apiKey: localStorage.getItem('medterm_apikey') || '',
  ttsLang: 'ar',
  quizState: null,
  organFilter: 'all',
  completedChapters: JSON.parse(localStorage.getItem('medterm_done') || '[]'),
  aiCache: JSON.parse(sessionStorage.getItem('medterm_aicache') || '{}'),
  searchTimeout: null
};

// ── ROUTER ─────────────────────────────────────────────────
function navigate(page, params = {}) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (!el) return;
  el.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const nb = document.querySelector(`.nav-btn[data-page="${page}"]`);
  if (nb) nb.classList.add('active');
  STATE.currentPage = page;
  const hash = params.chapter ? `#${page}/${params.chapter}` : `#${page}`;
  history.pushState({ page, params }, '', hash);
  
  switch (page) {
    case 'home':
      initHome();
      break;
    case 'chapters':
      initChapters();
      break;
    case 'chapter-detail':
      initChapterDetail(params.chapter);
      break;
    case 'favorites':
      initFavorites();
      break;
    case 'quiz':
      initQuiz();
      break;
    case 'overview':
      initOverview();
      break;
    case 'body3d':
      initBody3D();
      break;
    case 'search':
      // صفحة البحث لا تحتاج تهيئة إضافية
      break;
    case 'exam':
      if (typeof initExam === 'function') initExam();
      break;
    case 'study':
      if (typeof initStudy === 'function') initStudy();
      break;
    case 'progress':
      if (typeof initProgress === 'function') initProgress();
      break;
  }
  
  // إضافة XP عند فتح فصل (مرة واحدة فقط لكل جلسة)
  if (page === 'chapter-detail' && params.chapter && typeof addXP === 'function') {
    const key = 'visited_ch_' + params.chapter;
    if (!sessionStorage.getItem(key)) {
      addXP(3, 'chapter-open');
      sessionStorage.setItem(key, '1');
    }
  }
  
  // إغلاق وضع التركيز إذا انتقلنا لصفحة غير فصل
  if (page !== 'chapter-detail' && document.body.classList.contains('focus-mode')) {
    document.body.classList.remove('focus-mode');
    const btn = document.getElementById('focusModeBtn');
    if (btn) {
      btn.textContent = '🎯';
      btn.title = 'وضع التركيز';
    }
  }
  
  window.scrollTo(0, 0);
}

// ── HOME ───────────────────────────────────────────────────
function initHome() {
  updateStats();
  const grid = document.getElementById('homeChaptersGrid');
  if (!grid) return;
  grid.innerHTML = '';
  CHAPTERS.slice(0, 6).forEach(ch => grid.appendChild(buildChapterCard(ch)));
  
  // تحديث الرسم البياني الأسبوعي إذا كان موجوداً
  if (typeof updateWeeklyChart === 'function') {
    updateWeeklyChart();
  }
}

function updateStats() {
  const favEl = document.getElementById('statFav');
  const doneEl = document.getElementById('statDone');
  const badge = document.getElementById('favBadge');
  if (favEl) favEl.textContent = STATE.favorites.length;
  if (doneEl) doneEl.textContent = STATE.completedChapters.length;
  if (badge) {
    badge.textContent = STATE.favorites.length;
    badge.style.display = STATE.favorites.length > 0 ? 'flex' : 'none';
  }
}

// ── CHAPTERS ───────────────────────────────────────────────
function initChapters() {
  const grid = document.getElementById('allChaptersGrid');
  if (!grid) return;
  grid.innerHTML = '';
  CHAPTERS.forEach(ch => grid.appendChild(buildChapterCard(ch)));
}

function buildChapterCard(ch) {
  const isFav = STATE.favorites.includes(ch.id);
  const isDone = STATE.completedChapters.includes(ch.id);
  const div = document.createElement('div');
  div.className = 'chapter-card' + (isFav ? ' favorited' : '');
  div.style.setProperty('--card-accent', ch.color);
  div.innerHTML = `
    <span class="card-fav">⭐</span>
    <div class="card-icon">${ch.icon}</div>
    <div>
      <div class="card-num">الفصل ${ch.id} · ص ${ch.pages}</div>
      <div class="card-title">${ch.title}</div>
      <div class="card-pages">${ch.titleEn}</div>
    </div>
    ${isDone ? '<div style="font-size:0.7rem;color:var(--green);font-weight:700;margin-top:4px">✓ مكتمل</div>' : ''}
  `;
  div.onclick = () => navigate('chapter-detail', { chapter: ch.id });
  return div;
}

// ── CHAPTER DETAIL ─────────────────────────────────────────
function initChapterDetail(chId) {
  const ch = CHAPTERS.find(c => c.id === chId);
  if (!ch) return;
  
  STATE.currentChapter = ch;
  STATE.currentMode = null;
  
  document.getElementById('chIcon').textContent = ch.icon;
  document.getElementById('chTag').textContent = `الفصل ${ch.id} · ص ${ch.pages}`;
  document.getElementById('chTitle').textContent = ch.title;
  document.getElementById('chDesc').textContent = ch.desc;
  
  const hero = document.getElementById('chapterHero');
  hero.style.borderRight = `4px solid ${ch.color}`;
  hero.style.background = `linear-gradient(135deg, ${ch.color}18, transparent)`;
  
  const idx = CHAPTERS.findIndex(c => c.id === chId);
  document.getElementById('chProgressFill').style.width = Math.round(((idx + 1) / CHAPTERS.length) * 100) + '%';
  
  updateFavButton();
  
  // Show images button (يظهر دائماً للفصل الأول، وباقي الفصول حسب البيانات)
  const imgBtn = document.getElementById('chImagesBtn');
  if (imgBtn) {
    if (ch.id === 1 || (ch.images && ch.images.length)) {
      imgBtn.style.display = 'flex';
    } else {
      imgBtn.style.display = 'none';
    }
  }
  
  // Show sentences button only for chapters that have sentences
  const sentBtn = document.getElementById('chSentencesBtn');
  if (sentBtn) {
    sentBtn.style.display = ch.sentences && ch.sentences.length ? 'flex' : 'none';
  }
  
  // إخفاء كل الأقسام
  document.getElementById('chTabsWrap').style.display = 'none';
  document.getElementById('chTranslateWrap').style.display = 'none';
  const sw = document.getElementById('chSentencesWrap');
  if (sw) sw.style.display = 'none';
  
  const imgWrap = document.getElementById('chImagesWrap');
  if (imgWrap) imgWrap.style.display = 'none';
  
  document.getElementById('chSourceContent').innerHTML = '';
  document.getElementById('chTranslateContent').innerHTML = '';
}

function showChapterMode(mode) {
  STATE.currentMode = mode;
  const ch = STATE.currentChapter;
  
  // إخفاء كل اللوحات
  document.getElementById('chTabsWrap').style.display = 'none';
  document.getElementById('chTranslateWrap').style.display = 'none';
  const imgWrap = document.getElementById('chImagesWrap');
  if (imgWrap) imgWrap.style.display = 'none';
  const sentWrap = document.getElementById('chSentencesWrap');
  if (sentWrap) sentWrap.style.display = 'none';

  if (mode === 'explain') {
    document.getElementById('chTabsWrap').style.display = 'block';
    switchSource('doctor');
  } else if (mode === 'translate') {
    document.getElementById('chTranslateWrap').style.display = 'block';
    renderTranslation('ar');
  } else if (mode === 'images') {
    if (imgWrap) {
      imgWrap.style.display = 'block';
      renderChapterImages(ch);
    }
  } else if (mode === 'sentences') {
    if (sentWrap) {
      sentWrap.style.display = 'block';
      renderSentences(ch);
    }
  }
  
  // وضع علامة اكتمال الفصل
  markDone(ch.id);
  
  // التمرير للقسم المختار
  setTimeout(() => {
    const map = {
      explain: 'chTabsWrap',
      translate: 'chTranslateWrap',
      images: 'chImagesWrap',
      sentences: 'chSentencesWrap'
    };
    const el = document.getElementById(map[mode] || 'chTabsWrap');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function markDone(chId) {
  if (!STATE.completedChapters.includes(chId)) {
    STATE.completedChapters.push(chId);
    localStorage.setItem('medterm_done', JSON.stringify(STATE.completedChapters));
    updateStats();
    
    // إضافة XP لإكمال الفصل
    if (typeof addXP === 'function') {
      addXP(10, 'chapter-complete');
    }
  }
}

// ── NUMBERED SENTENCES ────────────────────────────────────
function renderSentences(ch) {
  const wrap = document.getElementById('chSentencesWrap');
  if (!wrap) return;
  
  if (!ch.sentences || !ch.sentences.length) {
    wrap.innerHTML = `<div class="sent-empty"><p>لا توجد جمل مرقّمة لهذا الفصل بعد.</p></div>`;
    return;
  }

  // ترتيب الجمل حسب الرقم
  const sorted = [...ch.sentences].sort((a, b) => parseFloat(a.num) - parseFloat(b.num));

  const buildCard = (s, displayNum) => {
    // تجهيز النصوص للاستخدام في onclick
    const safeText = esc(s.text);
    const safePron = esc(s.pron || '');
    const safeAr = esc(s.ar);
    const safeNote = esc(s.note || '');
    
    return `
      <div class="sent-card" id="sentCard_${s.num}">
        <div class="sent-num">${displayNum}</div>
        <div class="sent-body">
          <div class="sent-en">
            <span class="sent-en-text">${s.text}</span>
            <button class="sent-speak-btn" onclick="speakText('${safeText}','en-US')" title="استمع بالإنجليزية">🔊 EN</button>
          </div>
          ${s.pron ? `
            <div class="sent-pron">
              <span class="sent-pron-label">النطق:</span>
              <span class="sent-pron-text">${s.pron}</span>
              <button class="sent-speak-btn" onclick="speakText('${safePron}','ar-SA')" title="استمع للنطق">🔊</button>
            </div>
          ` : ''}
          <div class="sent-ar">
            <span class="sent-ar-label">الترجمة:</span>
            <span class="sent-ar-text">${s.ar}</span>
            <button class="sent-speak-btn" onclick="speakText('${safeAr}','ar-SA')" title="استمع بالعربية">🔊 AR</button>
          </div>
          ${s.note ? `
            <div class="sent-note">
              <span class="sent-note-icon">💡</span>
              <span>${s.note}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  };

  // بناء المحتوى مع التجميع
  let lastGroup = null;
  let cardsHTML = '';
  
  sorted.forEach((s, idx) => {
    const displayNum = idx + 1;
    if (s.group && s.group !== lastGroup) {
      cardsHTML += `<div class="sent-group-header">${s.group}</div>`;
      lastGroup = s.group;
    }
    cardsHTML += buildCard(s, displayNum);
  });

  wrap.innerHTML = `
    <div class="sent-header">
      <h3>📝 الجمل المرقّمة – الفصل ${ch.id}</h3>
      <p>${ch.sentences.length} جملة · كل جملة مع النطق والترجمة والشرح</p>
      <div class="sent-controls">
        <button class="sent-ctrl-btn" onclick="speakAllSentences(${ch.id})">🔊 استمع للكل</button>
        <button class="sent-ctrl-btn" onclick="stopAudio()">⏹ إيقاف</button>
      </div>
    </div>
    <div class="sent-list">
      ${cardsHTML}
    </div>`;
}

function speakAllSentences(chId) {
  const ch = CHAPTERS.find(c => c.id === chId);
  if (!ch || !ch.sentences) return;
  
  const texts = ch.sentences.map(s => s.text + ' … ' + s.ar).join(' … ');
  speakText(texts.slice(0, 2000), 'en-US');
  showToast('🔊 جاري تشغيل جميع الجمل...');
}

// ── CHAPTER IMAGES ─────────────────────────────────────────
function renderChapterImages(ch) {
  const wrap = document.getElementById('chImagesWrap');
  if (!wrap) return;
  
  // الفصل الأول: استخدام الصور المحلية
  if (ch.id === 1) {
    const localImages = [
      {
        id: 'img_levels',
        title: 'مستويات التنظيم الهيكلي',
        titleEn: 'Levels of Structural Organization',
        file: '1-levels.webp',
        desc: 'توضح هذه الصورة التدرج من المستوى الكيميائي (ذرات وجزيئات) إلى المستوى الخلوي، ثم النسيجي، فالعضوي، فجهاز الأعضاء، وأخيراً مستوى الكائن الحي الكامل. كل مستوى أكثر تعقيداً من السابق.',
        labels: ['الكيميائي', 'الخلوي', 'النسيجي', 'العضوي', 'جهاز', 'كائن']
      },
      {
        id: 'img_position',
        title: 'الوضع التشريحي القياسي',
        titleEn: 'Anatomical Position',
        file: '2-position.webp',
        desc: 'الوضع المرجعي القياسي: الشخص واقف منتصباً يواجه المراقب، القدمان متضامتان، الذراعان مدليتان على الجانبين مع توجيه راحتي اليدين للأمام. كل المصطلحات الاتجاهية تُبنى على هذا الوضع.',
        labels: ['وجه للأمام', 'راحتان للأمام', 'قدمان متضامتان']
      },
      {
        id: 'img_directions',
        title: 'جدول المصطلحات الاتجاهية',
        titleEn: 'Directional Terms',
        file: '3-directions.webp',
        desc: 'جدول يعرض 11 مصطلحاً اتجاهياً مع تعريف كل منهم ومثاله التوضيحي. تُستخدم هذه المصطلحات في التقارير الطبية لوصف موضع جزء من الجسم بالنسبة لجزء آخر.',
        labels: ['علوي', 'سفلي', 'أمامي', 'خلفي', 'وسطي', 'جانبي', 'قريب', 'بعيد', 'سطحي', 'عميق', 'وسيط']
      },
      {
        id: 'img_regions',
        title: 'مناطق جسم الإنسان',
        titleEn: 'Body Regions',
        file: '4-regions.webp',
        desc: 'توضح الصورة مناطق الجسم المسماة: منطقة الرأس (الجبهة والعين والأذن والخد والذقن)، الرقبة العنقية، الصدر، المنطقة الإبطية، مناطق عضلات الذراع. تُستخدم هذه الأسماء في التوصيف الطبي.',
        labels: ['الرأس', 'الرقبة', 'الصدر', 'البطن', 'الحوض', 'الطرف العلوي', 'الطرف السفلي']
      },
      {
        id: 'img_abdomen',
        title: 'تقسيمات البطن',
        titleEn: 'Abdominal Regions',
        file: '5-abdomen.webp',
        desc: 'تقسيم البطن إلى 9 مناطق (المراق الأيمن – الشرسوفي – المراق الأيسر – القطن الأيمن – السري – القطن الأيسر – الحرقفي الأيمن – تحت المعدي – الحرقفي الأيسر) و4 أرباع: RUQ, LUQ, RLQ, LLQ.',
        labels: ['9 مناطق', '4 أرباع', 'RUQ', 'LUQ', 'RLQ', 'LLQ', 'سري', 'شرسوفي']
      },
      {
        id: 'img_planes',
        title: 'المستويات التشريحية',
        titleEn: 'Body Planes',
        file: '6-planes.webp',
        desc: 'المستوى السهمي يقسم الجسم يميناً وشمالاً. المستوى التاجي (الأمامي) يقسمه أمام وخلف. المستوى العرضي يقسمه أعلى وأسفل. المستوى المائل يقسمه بشكل مائل.',
        labels: ['سهمي', 'تاجي', 'عرضي', 'مائل']
      },
      {
        id: 'img_cavities',
        title: 'تجاويف الجسم',
        titleEn: 'Body Cavities',
        file: '7-cavities.webp',
        desc: 'التجويفان الرئيسيان: الأمامي البطني (يضم الصدري والبطني الحوضي) والخلفي الظهري (يضم القحفي والفقري).',
        labels: ['قحفي', 'فقري', 'صدري', 'بطني', 'حوضي', 'أمامي', 'خلفي']
      },
      {
        id: 'img_homeostasis',
        title: 'التوازن الداخلي',
        titleEn: 'Homeostasis',
        file: '8-homeostasis.webp',
        desc: 'مخطط آلية التغذية الراجعة: محفز → مستقبل → مركز التكامل → مؤثر → استجابة، ثم يعود الأثر للمستقبل (تغذية راجعة). يبين أيضاً مساري التغذية: السلبية (إعادة التوازن) والإيجابية (تعزيز التغيير).',
        labels: ['مستقبل', 'مركز تحكم', 'مؤثر', 'تغذية راجعة', 'سلبي', 'إيجابي']
      },
      {
        id: 'img_tissues',
        title: 'الأنسجة الأربعة',
        titleEn: 'Four Tissues',
        file: '9-tissues.webp',
        desc: 'الأنسجة الأربعة الرئيسية في الجسم: النسيج الطلائي (يغطي الأسطح)، النسيج الضام (يربط ويدعم)، النسيج العضلي (ينتج الحركة)، النسيج العصبي (ينقل الإشارات).',
        labels: ['طلائي', 'ضام', 'عضلي', 'عصبي']
      }
    ];
    
    wrap.innerHTML = `
      <div class="images-header">
        <h3>🖼️ صور الفصل ${ch.id} - عالية الجودة</h3>
        <span class="source-meta">${localImages.length} صورة تشريحية - يمكن تكبيرها وتحميلها</span>
      </div>
      <div class="images-gallery">
        ${localImages.map(img => `
          <div class="img-card">
            <div class="img-header">
              <span class="img-title">${img.title}</span>
              <span class="img-title-en">${img.titleEn}</span>
            </div>
            <div class="img-wrapper" onclick="openImageLightbox('assets/images/chapter1/${img.file}', '${esc(img.desc)}', 1)">
              <img src="assets/images/chapter1/${img.file}" 
                   alt="${img.title}"
                   class="img-photo"
                   loading="lazy"
                   onerror="this.src='icons/icon-192.png'; this.alt='صورة غير متوفرة'"/>
              <div class="img-zoom-hint">🔍 اضغط للتكبير</div>
            </div>
            ${img.labels ? `
              <div class="img-labels">
                ${img.labels.map(l => `<span class="img-label">${l}</span>`).join('')}
              </div>
            ` : ''}
            <div class="img-desc">
              <button class="speak-btn" onclick="speakText('${esc(img.desc)}','ar-SA'); event.stopPropagation()">🔊</button>
              <p>${img.desc}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    // للفصول الأخرى، استخدم الصور من البيانات
    if (!ch.images || !ch.images.length) {
      wrap.innerHTML = `<div class="sent-empty"><p>لا توجد صور لهذا الفصل</p></div>`;
      return;
    }
    
    wrap.innerHTML = `
      <div class="images-header">
        <h3>🖼️ صور الفصل ${ch.id}</h3>
        <span class="source-meta">${ch.images.length} صورة تشريحية</span>
      </div>
      <div class="images-gallery">
        ${ch.images.map(img => `
          <div class="img-card">
            <div class="img-header">
              <span class="img-title">${img.title}</span>
              <span class="img-title-en">${img.titleEn}</span>
            </div>
            <div class="img-wrapper" onclick="openImageLightbox('${esc(img.url)}', '${esc(img.desc)}', ${ch.id})">
              <img src="${img.url}" 
                   alt="${img.title}"
                   class="img-photo"
                   loading="lazy"
                   onerror="this.src='${esc(img.fallback || img.url)}'"/>
              <div class="img-zoom-hint">🔍 اضغط للتكبير</div>
            </div>
            ${img.labels ? `
              <div class="img-labels">
                ${img.labels.map(l => `<span class="img-label">${l}</span>`).join('')}
              </div>
            ` : ''}
            <div class="img-desc">
              <button class="speak-btn" onclick="speakText('${esc(img.desc)}','ar-SA'); event.stopPropagation()">🔊</button>
              <p>${img.desc}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  requestAnimationFrame(initLazyImages);
}

// دالة فتح معرض الصور مع تحكم متكامل
function openImageLightbox(src, caption, chapterId) {
  // التحقق من وجود الصورة المحلية أولاً
  let imageSrc = src;
  
  // إذا كانت الصورة محلية للفصل الأول، تأكد من المسار
  if (chapterId === 1 && src.startsWith('assets/')) {
    imageSrc = src;
  }
  
  const modal = document.getElementById('imgLightboxModal');
  const img = document.getElementById('lightboxImage');
  const cap = document.getElementById('lightboxCaption');
  
  if (!modal || !img || !cap) return;
  
  img.src = imageSrc;
  cap.textContent = caption || '';
  currentZoom = 1;
  img.style.transform = 'scale(1)';
  modal.style.display = 'flex';
  currentLightboxImage = img;
}

// دوال التحكم في الصور (معرفة في index.html)
// هذه الدوال تُستدعى من index.html

// ── initLazyImages – تحميل الصور عند التمرير ──────────────
function initLazyImages() {
  const imgs = document.querySelectorAll('img.lazy-img[data-src]');
  if (!imgs.length) return;
  
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        img.src = img.dataset.src;
        img.onerror = () => {
          const fb = img.dataset.fallback;
          if (fb && fb !== img.src) {
            img.src = fb;
            img.onerror = null;
          } else {
            img.style.minHeight = '80px';
            img.alt = '⚠️ تعذّر تحميل الصورة';
          }
        };
        img.removeAttribute('data-src');
        obs.unobserve(img);
      });
    }, { rootMargin: '250px 0px' });
    
    imgs.forEach(img => observer.observe(img));
  } else {
    imgs.forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }
}

// ── SOURCE TABS ────────────────────────────────────────────
let _switchTimer = null;

function switchSource(source) {
  STATE.currentSource = source;
  document.querySelectorAll('.ch-tab').forEach(t => t.classList.toggle('active', t.dataset.source === source));
  const ch = STATE.currentChapter;
  const container = document.getElementById('chSourceContent');
  
  if (source === 'doctor') {
    clearTimeout(_switchTimer);
    renderDoctorExplain(ch, container);
  } else {
    clearTimeout(_switchTimer);
    _switchTimer = setTimeout(() => renderAIExplain(ch, source, container), 350);
  }
}

// ── DOCTOR EXPLAIN – rich version for ch1, standard for others ──
function renderDoctorExplain(ch, container) {
  // Rich chapter 1 with sections
  if (ch.id === 1 && ch.sections) {
    renderDoctorExplainRich(ch, container);
    return;
  }
  
  // Standard
  const termsHTML = ch.terms.map(t => buildTermRow(t, ch)).join('');
  
  container.innerHTML = `
    <div class="source-header">
      <div>
        <h3>👨‍⚕️ شرح الدكتور – الفصل ${ch.id}</h3>
        <span class="source-meta">${ch.terms.length} مصطلح · ${ch.pages} صفحة</span>
      </div>
      <button class="speak-btn speak-all" onclick="speakText('${esc(ch.overview)}','ar-SA')">🔊 استمع</button>
    </div>
    <div class="source-body">
      <div class="section-block">
        <h4>📌 نظرة عامة على الفصل</h4>
        <p>${ch.overview}</p>
      </div>
      <div class="section-block">
        <h4>📚 المصطلحات الأساسية</h4>
        ${termsHTML}
      </div>
      <div class="highlight-box">
        <strong>💡 تذكر:</strong> هذا الفصل يشمل الصفحات ${ch.pages} – احفظ المصطلحات باللغتين للامتحانات.
      </div>
    </div>`;
}

function renderDoctorExplainRich(ch, container) {
  // Build sections accordion
  const sectionsHTML = ch.sections.map((sec, si) => `
    <div class="rich-section" id="rsec_${sec.id}">
      <div class="rich-sec-header" onclick="toggleRichSection('rsec_${sec.id}')">
        <span class="rsec-icon">${sec.icon}</span>
        <span class="rsec-title">${sec.title}</span>
        <svg class="rsec-arrow" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6" stroke-width="2"/>
        </svg>
      </div>
      <div class="rich-sec-body ${si === 0 ? 'open' : ''}">
        ${sec.content.map(item => `
          <div class="rich-item">
            <div class="rich-item-heading">
              <span>${item.heading}</span>
              <button class="speak-btn" onclick="speakText('${esc(item.body)}','ar-SA'); event.stopPropagation()">🔊 AR</button>
              ${item.bodyEn ? `<button class="speak-btn" onclick="speakText('${esc(item.bodyEn)}','en-US'); event.stopPropagation()">🔊 EN</button>` : ''}
            </div>
            <p class="rich-item-body">${item.body.replace(/\n/g, '<br>')}</p>
            ${item.bodyEn ? `<p class="rich-item-en">${item.bodyEn.replace(/\n/g, '<br>')}</p>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  const termsHTML = ch.terms.map(t => buildTermRow(t, ch)).join('');

  container.innerHTML = `
    <div class="source-header">
      <div>
        <h3>👨‍⚕️ شرح الدكتور – الفصل ${ch.id}</h3>
        <span class="source-meta">${ch.terms.length} مصطلح · ${ch.sections.length} موضوع · ${ch.pages} صفحة</span>
      </div>
      <button class="speak-btn speak-all" onclick="speakText('${esc(ch.overview)}','ar-SA')">🔊 استمع</button>
    </div>
    <div class="source-body">
      <div class="section-block">
        <h4>📌 نظرة عامة</h4>
        <p>${ch.overview}</p>
        ${ch.author ? `<p class="rich-author">📖 المصدر: ${ch.author}</p>` : ''}
      </div>

      <div class="section-block">
        <h4>📋 مواضيع الفصل (اضغط لفتح كل موضوع)</h4>
        <div class="rich-sections">${sectionsHTML}</div>
      </div>

      <div class="section-block">
        <h4>📚 المصطلحات الكاملة (${ch.terms.length} مصطلح)</h4>
        ${termsHTML}
      </div>

      <div class="highlight-box">
        <strong>💡 للامتحان:</strong> احفظ الاتجاهات الـ11 مع أمثلتها، وتسلسل مستويات التنظيم، ومكونات التوازن الداخلي.
      </div>
    </div>`;
}

function toggleRichSection(id) {
  const sec = document.getElementById(id);
  if (!sec) return;
  const body = sec.querySelector('.rich-sec-body');
  const arrow = sec.querySelector('.rsec-arrow');
  body.classList.toggle('open');
  arrow.style.transform = body.classList.contains('open') ? 'rotate(90deg)' : '';
}

function buildTermRow(t, ch) {
  const pron = t.pron ? `<span class="term-pron">النطق: ${t.pron}</span>` : '';
  const safeEn = esc(t.en);
  const safeAr = esc(t.ar);
  const safeDesc = esc(t.desc);
  
  return `
    <div class="term-row">
      <div class="term-dot" style="background:${ch.color}25;color:${ch.color}">📖</div>
      <div class="term-content">
        <div class="term-en">
          <span class="term-en-word">${t.en}</span>
          <button class="speak-btn" onclick="speakText('${safeEn}','en-US'); event.stopPropagation()">🔊 EN</button>
          <button class="speak-btn" onclick="speakText('${safeAr}','ar-SA'); event.stopPropagation()">🔊 AR</button>
        </div>
        <div class="term-ar">${t.ar}</div>
        ${pron}
        <div class="term-desc">${t.desc}</div>
      </div>
    </div>`;
}

// ── AI EXPLAIN ─────────────────────────────────────────────
const AIService = {
  async call(prompt) {
    const key = STATE.apiKey;
    if (!key) return null;
    
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1200,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      if (!res.ok) throw new Error('API ' + res.status);
      const data = await res.json();
      return data.content?.[0]?.text || '';
    } catch (err) {
      console.warn('AI call failed:', err);
      return null;
    }
  },

  cacheGet(key) {
    try {
      const cache = JSON.parse(sessionStorage.getItem('medterm_aicache') || '{}');
      return cache[key] || null;
    } catch {
      return null;
    }
  },
  
  cacheSet(key, value) {
    try {
      const cache = JSON.parse(sessionStorage.getItem('medterm_aicache') || '{}');
      cache[key] = value;
      // حد أقصى 50 مدخلاً
      const keys = Object.keys(cache);
      if (keys.length > 50) delete cache[keys[0]];
      sessionStorage.setItem('medterm_aicache', JSON.stringify(cache));
      STATE.aiCache[key] = value;
    } catch (e) {
      console.warn('AI cache write failed:', e);
    }
  }
};

async function renderAIExplain(ch, source, container) {
  const labels = {
    chatgpt: { name: '🤖 ChatGPT', color: '#10b981' },
    gemini: { name: '✨ Gemini', color: '#f59e0b' },
    notebook: { name: '📓 NotebookLM', color: '#8b5cf6' }
  };
  
  const lbl = labels[source];
  const cacheKey = `${ch.id}_${source}`;

  // 1. من الكاش
  const cached = AIService.cacheGet(cacheKey);
  if (cached) {
    renderAIContent(container, lbl, cached, ch);
    return;
  }

  container.innerHTML = `<div class="source-loading"><div class="spinner"></div><p>جاري توليد شرح ${lbl.name}…</p></div>`;

  // 2. الفصل الأول لديه محتوى مدمج
  if (ch.id === 1 && ch.aiContent?.[source]) {
    AIService.cacheSet(cacheKey, ch.aiContent[source]);
    renderAIContent(container, lbl, ch.aiContent[source], ch);
    return;
  }

  // 3. لا يوجد مفتاح API
  if (!STATE.apiKey) {
    const demo = buildDemoAIContent(ch, source);
    AIService.cacheSet(cacheKey, demo);
    renderAIContent(container, lbl, demo, ch);
    showToast('💡 أضف API Key لشرح ذكاء اصطناعي مباشر');
    return;
  }

  // 4. طلب مباشر
  try {
    const text = await AIService.call(buildAIPrompt(ch, source));
    if (!text) throw new Error('empty response');
    AIService.cacheSet(cacheKey, text);
    renderAIContent(container, lbl, text, ch);
  } catch (err) {
    console.warn('AI explain failed:', err);
    const demo = buildDemoAIContent(ch, source);
    renderAIContent(container, lbl, demo, ch);
    showToast('⚠️ خطأ في الاتصال – عرض محتوى تجريبي');
  }
}

function buildAIPrompt(ch, source) {
  const styles = {
    chatgpt: 'أسلوب ChatGPT: شرح واضح بنقاط، سهل للمبتدئ مع أمثلة عملية',
    gemini: 'أسلوب Gemini: تحليلي مع ربط المعلومات بالسياق العلمي والتطبيقي',
    notebook: 'أسلوب NotebookLM: ملاحظات دراسية أكاديمية منظمة للمراجعة'
  };
  
  return `أنت مساعد تعليمي لطلاب التمريض. اشرح الفصل التالي بـ${styles[source]}.

الفصل: ${ch.title} (${ch.titleEn}) | الصفحات: ${ch.pages}
الموضوع: ${ch.overview}
المصطلحات: ${ch.terms.map(t => `${t.en}(${t.ar})`).join(', ')}

المطلوب: مقدمة مبسطة (3 جمل) + أهم 5 نقاط للحفظ + التطبيق التمريضي + نصيحة للمراجعة.
الرد بالعربية فقط.`;
}

function buildDemoAIContent(ch, source) {
  const s = {
    chatgpt: `📌 **مقدمة:**\n${ch.overview}\n\n✅ **أهم 5 نقاط:**\n${ch.terms.slice(0, 5).map((t, i) => `${i + 1}. **${t.en}** (${t.ar}): ${t.desc}`).join('\n')}\n\n🏥 **التطبيق التمريضي:**\nفهم هذا الفصل أساسي لأي ممرض للتعامل مع المرضى وقراءة التقارير الطبية.\n\n💡 **نصيحة:** اكتب المصطلحات يومياً مع صور ذهنية!`,
    gemini: `🔬 **التحليل العلمي:**\n${ch.overview}\n\nالمصطلحات المحورية:\n${ch.terms.slice(0, 5).map(t => `• **${t.en}**: ${t.desc}`).join('\n')}\n\n🔗 **الترابط:** فهم هذه المفاهيم يساعد في ربط الفصول وتطبيقها سريرياً.`,
    notebook: `📓 **ملاحظات الفصل ${ch.id}:**\n**العنوان:** ${ch.title}\n**الصفحات:** ${ch.pages}\n\n**الملخص:**\n${ch.overview}\n\n**المصطلحات:**\n${ch.terms.slice(0, 6).map(t => `• ${t.en} | ${t.ar} – ${t.desc}`).join('\n')}\n\n**للمراجعة:**\n- راجع مرتين يومياً\n- استخدم Flash Cards`
  };
  
  return s[source] || s.chatgpt;
}

function renderAIContent(container, lbl, content, ch) {
  const html = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/• /g, '&bull; ');
  
  container.innerHTML = `
    <div class="source-header">
      <div>
        <h3>${lbl.name} – الفصل ${ch.id}</h3>
        <span class="source-meta" style="color:${lbl.color}">ذكاء اصطناعي</span>
      </div>
      <button class="speak-btn speak-all" onclick="speakText('${esc(content.replace(/\*\*/g, ''))}','ar-SA')">🔊 استمع</button>
    </div>
    <div class="source-body">
      <div class="section-block"><p style="line-height:2">${html}</p></div>
      <div class="highlight-box"><strong>📣 ملاحظة:</strong> مولّد بالذكاء الاصطناعي – قارنه دائماً بالكتاب.</div>
    </div>`;
}

// ── TRANSLATION ─────────────────────────────────────────────
function setTranslateLang(lang) {
  STATE.translateLang = lang;
  document.querySelectorAll('.trl-lang').forEach(b => {
    b.classList.toggle('active', b.textContent.includes(lang === 'ar' ? 'العربية' : 'English'));
  });
  renderTranslation(lang);
}

function renderTranslation(lang) {
  const ch = STATE.currentChapter;
  const container = document.getElementById('chTranslateContent');
  
  const rows = ch.terms.map(t => {
    const primary = lang === 'ar' ? t.ar : t.en;
    const secondary = lang === 'ar' ? t.en : t.ar;
    const spLang = lang === 'ar' ? 'ar-SA' : 'en-US';
    const pron = t.pron ? `<span class="term-pron">🗣️ ${t.pron}</span>` : '';
    const safePrimary = esc(primary);
    const safeSecondary = esc(secondary);
    
    return `
      <div class="term-row">
        <div class="term-dot" style="background:var(--accent-soft);color:var(--accent)">🌐</div>
        <div class="term-content">
          <div class="term-en">
            <span class="term-en-word">${primary}</span>
            <button class="speak-btn" onclick="speakText('${safePrimary}','${spLang}'); event.stopPropagation()">🔊</button>
            <button class="speak-btn" onclick="speakText('${safeSecondary}','${lang === 'ar' ? 'en-US' : 'ar-SA'}'); event.stopPropagation()">🔊 ${lang === 'ar' ? 'EN' : 'AR'}</button>
          </div>
          <div class="term-ar">${secondary}</div>
          ${pron}
          <div class="term-desc">${t.desc}</div>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="source-header">
      <div>
        <h3>🌐 ترجمة الفصل ${ch.id} – ${lang === 'ar' ? 'عربي' : 'English'}</h3>
        <span class="source-meta">${ch.terms.length} مصطلح مع النطق</span>
      </div>
    </div>
    <div class="source-body">${rows}</div>`;
}

// ── FAVORITES ──────────────────────────────────────────────
function toggleChapterFav() {
  const ch = STATE.currentChapter;
  if (!ch) return;
  
  const idx = STATE.favorites.indexOf(ch.id);
  if (idx > -1) {
    STATE.favorites.splice(idx, 1);
    showToast('🗑️ تمت الإزالة من المفضلة');
  } else {
    STATE.favorites.push(ch.id);
    showToast('⭐ تمت الإضافة إلى المفضلة!');
    
    // إضافة XP عند إضافة مفضلة
    if (typeof addXP === 'function') {
      addXP(2, 'favorite');
    }
  }
  
  localStorage.setItem('medterm_favs', JSON.stringify(STATE.favorites));
  updateFavButton();
  updateStats();
}

function updateFavButton() {
  const btn = document.getElementById('chFavBtn');
  if (!btn || !STATE.currentChapter) return;
  btn.classList.toggle('active', STATE.favorites.includes(STATE.currentChapter.id));
}

function initFavorites() {
  const c = document.getElementById('favoritesContainer');
  if (!c) return;
  
  if (STATE.favorites.length === 0) {
    c.innerHTML = `<div class="empty-state"><div class="em-icon">⭐</div><h3>لا يوجد مفضلة بعد</h3><p>اضغط على النجمة ⭐ في أي فصل لحفظه هنا</p></div>`;
    return;
  }
  
  c.innerHTML = `<div class="favorites-list">${
    CHAPTERS.filter(ch => STATE.favorites.includes(ch.id)).map(ch => `
      <div class="fav-item" onclick="navigate('chapter-detail',{chapter:${ch.id}})">
        <div class="fav-item-icon" style="background:${ch.color}22;border:1px solid ${ch.color}44">${ch.icon}</div>
        <div class="fav-item-info">
          <h4>${ch.title}</h4>
          <p>الفصل ${ch.id} · ص ${ch.pages} · ${ch.titleEn}</p>
        </div>
        <button class="fav-remove" onclick="event.stopPropagation();removeFav(${ch.id})">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke-width="2"/>
          </svg>
        </button>
      </div>`).join('')
  }</div>`;
}

function removeFav(chId) {
  const idx = STATE.favorites.indexOf(chId);
  if (idx > -1) STATE.favorites.splice(idx, 1);
  localStorage.setItem('medterm_favs', JSON.stringify(STATE.favorites));
  updateStats();
  initFavorites();
  showToast('🗑️ تمت الإزالة من المفضلة');
}

// ── QUIZ ───────────────────────────────────────────────────
function initQuiz() {
  const c = document.getElementById('quizContainer');
  if (!c) return;
  
  if (STATE.quizState) {
    renderQuizGame(c);
    return;
  }
  
  c.innerHTML = `
    <div class="quiz-intro">
      <div class="quiz-intro-icon">🧠</div>
      <h3>اختر فصلاً لتبدأ الاختبار</h3>
      <p>كل فصل يحتوي على أسئلة متعددة الاختيار</p>
    </div>
    <div class="quiz-selector">
      <button class="quiz-chapter-btn quiz-all-btn" onclick="startQuizAll()">
        <div class="q-icon">🎯</div>
        <div class="q-info">
          <h4>اختبار شامل</h4>
          <p>جميع الفصول</p>
        </div>
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      ${CHAPTERS.map(ch => `
        <button class="quiz-chapter-btn" onclick="startQuiz(${ch.id})" style="--qcolor:${ch.color}">
          <div class="q-icon">${ch.icon}</div>
          <div class="q-info">
            <h4>${ch.title}</h4>
            <p>${ch.quiz.length} سؤال · الفصل ${ch.id}</p>
          </div>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>`).join('')}
    </div>`;
}

function startQuiz(chId) {
  const ch = CHAPTERS.find(c => c.id === chId);
  if (!ch) return;
  
  STATE.quizState = {
    chapter: ch,
    questions: shuffle([...ch.quiz]),
    current: 0,
    score: 0,
    answered: false,
    done: false,
    isAll: false
  };
  
  renderQuizGame(document.getElementById('quizContainer'));
}

function startQuizAll() {
  const allQ = CHAPTERS.flatMap(ch => ch.quiz.map(q => ({ ...q, chTitle: ch.title })));
  
  STATE.quizState = {
    chapter: { title: 'اختبار شامل', icon: '🎯', id: 0 },
    questions: shuffle(allQ).slice(0, 20),
    current: 0,
    score: 0,
    answered: false,
    done: false,
    isAll: true
  };
  
  renderQuizGame(document.getElementById('quizContainer'));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderQuizGame(container) {
  const qs = STATE.quizState;
  if (!qs) return;
  
  if (qs.done) {
    const pct = Math.round((qs.score / qs.questions.length) * 100);
    const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '✅' : '📚';
    const xpEarned = qs.score * 10;
    
    container.innerHTML = `
      <div class="quiz-result">
        <div class="result-icon">${emoji}</div>
        <div class="result-score">${qs.score}<span>/${qs.questions.length}</span></div>
        <div class="result-pct">${pct}%</div>
        <div class="result-xp" style="color:var(--teal); font-weight:700; margin:8px 0">+${xpEarned} XP</div>
        <div class="result-msg">${pct >= 80 ? 'ممتاز! أداء رائع 🎉' : pct >= 50 ? 'جيد! استمر في المراجعة 💪' : 'راجع الفصل مرة أخرى 📖'}</div>
        <div class="result-btns">
          <button class="retry-btn" onclick="STATE.quizState=null;initQuiz()">اختر فصلاً آخر</button>
          <button class="retry-btn secondary" onclick="${qs.isAll ? 'startQuizAll()' : 'startQuiz(' + qs.chapter.id + ')'}">إعادة الاختبار</button>
        </div>
      </div>`;
    
    // إضافة XP
    if (typeof addXP === 'function') {
      addXP(xpEarned, 'quiz');
      const d = JSON.parse(localStorage.getItem('medterm_xp') || '{}');
      d.quizzes = (d.quizzes || 0) + 1;
      localStorage.setItem('medterm_xp', JSON.stringify(d));
    }
    
    return;
  }
  
  const q = qs.questions[qs.current];
  
  container.innerHTML = `
    <div class="quiz-game">
      <div class="quiz-header">
        <h3>${qs.chapter.icon} ${qs.chapter.title}</h3>
        <span class="quiz-score">✅ ${qs.score} نقطة</span>
      </div>
      <div class="quiz-progress">
        <div class="quiz-progress-fill" style="width:${(qs.current / qs.questions.length) * 100}%"></div>
      </div>
      <div class="question-card">
        <div class="question-num">سؤال ${qs.current + 1} من ${qs.questions.length}</div>
        <div class="question-text">${q.q}</div>
      </div>
      <div class="answers-grid">
        ${q.opts.map((opt, i) => `<button class="answer-btn" id="ans_${i}" onclick="answerQuiz(${i})">${opt}</button>`).join('')}
      </div>
    </div>`;
}

function answerQuiz(idx) {
  const qs = STATE.quizState;
  if (!qs || qs.answered) return;
  
  qs.answered = true;
  const q = qs.questions[qs.current];
  const btns = document.querySelectorAll('.answer-btn');
  
  btns.forEach(b => b.disabled = true);
  
  if (idx === q.ans) {
    btns[idx].classList.add('correct');
    qs.score++;
    showToast('✅ إجابة صحيحة!');
  } else {
    btns[idx].classList.add('wrong');
    if (btns[q.ans]) btns[q.ans].classList.add('correct');
    showToast('❌ إجابة خاطئة');
  }
  
  setTimeout(() => {
    qs.current++;
    qs.answered = false;
    
    if (qs.current >= qs.questions.length) {
      qs.done = true;
    }
    
    renderQuizGame(document.getElementById('quizContainer'));
  }, 1300);
}

// ── OVERVIEW ───────────────────────────────────────────────
function initOverview() {
  const grid = document.getElementById('overviewGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  CHAPTERS.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'overview-card';
    card.style.setProperty('--ov-color', ch.color);
    
    card.innerHTML = `
      <div class="overview-card-header" onclick="toggleOverview(this.parentElement)">
        <span class="ov-icon">${ch.icon}</span>
        <span class="ov-title">الفصل ${ch.id}: ${ch.title}</span>
        <svg class="ov-arrow" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6" stroke-width="2"/>
        </svg>
      </div>
      <div class="overview-card-body">
        <div class="ov-meta">
          <span>📄 ${ch.pages}</span>
          <span>🌐 ${ch.titleEn}</span>
          <span>📝 ${ch.quiz.length} أسئلة</span>
          ${ch.images ? `<span>🖼️ ${ch.images.length} صورة</span>` : ''}
        </div>
        <p>${ch.overview}</p>
        <div class="ov-terms">
          ${ch.terms.slice(0, 4).map(t => `<span class="ov-term-chip">${t.en}</span>`).join('')}
        </div>
        <div class="ov-actions">
          <button onclick="navigate('chapter-detail',{chapter:${ch.id}})">فتح الفصل →</button>
          <button onclick="startQuiz(${ch.id});navigate('quiz')">اختبار 🧠</button>
        </div>
      </div>`;
    
    grid.appendChild(card);
  });
}

function toggleOverview(card) {
  card.classList.toggle('expanded');
}

// ── BODY 3D ────────────────────────────────────────────────
function initBody3D() {
  const container = document.getElementById('bodyExplorer');
  if (!container) return;
  
  const cats = ['all', 'nervous', 'cardiovascular', 'respiratory', 'digestive', 'urinary', 'lymphatic'];
  const catLbls = {
    all: 'الكل',
    nervous: 'عصبي',
    cardiovascular: 'دوري',
    respiratory: 'تنفسي',
    digestive: 'هضمي',
    urinary: 'بولي',
    lymphatic: 'ليمفاوي'
  };
  
  const filtered = STATE.organFilter === 'all' ? ORGANS : ORGANS.filter(o => o.category === STATE.organFilter);
  
  container.innerHTML = `
    <div class="organs-filter">
      ${cats.map(c => `<button class="filter-btn${STATE.organFilter === c ? ' active' : ''}" onclick="filterOrgans('${c}')">${catLbls[c]}</button>`).join('')}
    </div>
    <div class="organs-grid">
      ${filtered.map(o => `
        <div class="organ-card" onclick="openOrganModal(${o.id})">
          <div class="organ-emoji">${o.emoji}</div>
          <div class="organ-name-ar">${o.nameAr}</div>
          <div class="organ-name-en">${o.nameEn}</div>
        </div>`).join('')}
    </div>
    <div class="organ-modal-overlay" id="organModalOverlay" onclick="handleOrganModalClick(event)">
      <div class="organ-modal" id="organModalContent"><div class="modal-handle"></div></div>
    </div>`;
}

function filterOrgans(cat) {
  STATE.organFilter = cat;
  initBody3D();
}

function openOrganModal(organId) {
  const organ = ORGANS.find(o => o.id === organId);
  if (!organ) return;
  
  const safeNameEn = esc(organ.nameEn);
  const safeNameAr = esc(organ.nameAr);
  
  document.getElementById('organModalContent').innerHTML = `
    <div class="modal-handle"></div>
    <button class="close-organ-modal" onclick="closeOrganModal()">✕ إغلاق</button>
    <h3>${organ.emoji} ${organ.nameAr}</h3>
    <p class="em-sub">
      ${organ.nameEn}&nbsp;
      <button class="speak-btn" onclick="speakText('${safeNameEn}','en-US'); event.stopPropagation()">🔊 EN</button>
      <button class="speak-btn" onclick="speakText('${safeNameAr}','ar-SA'); event.stopPropagation()">🔊 AR</button>
    </p>
    <div class="organ-3d-view">
      <div class="organ-3d-anim">${organ.emoji}</div>
      <span class="organ-3d-label">محاكاة تفاعلية</span>
    </div>
    <div class="organ-facts">
      ${organ.facts.map(f => `<div class="organ-fact"><span class="fact-icon">💡</span><span class="fact-text">${f}</span></div>`).join('')}
    </div>`;
  
  document.getElementById('organModalOverlay').classList.add('visible');
}

function closeOrganModal() {
  const el = document.getElementById('organModalOverlay');
  if (el) el.classList.remove('visible');
}

function handleOrganModalClick(e) {
  if (e.target === document.getElementById('organModalOverlay')) {
    closeOrganModal();
  }
}

// ── TTS ────────────────────────────────────────────────────
function speakText(text, lang) {
  if (!('speechSynthesis' in window)) {
    showToast('⚠️ المتصفح لا يدعم النطق');
    return;
  }
  
  window.speechSynthesis.cancel();
  
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang || (STATE.ttsLang === 'ar' ? 'ar-SA' : 'en-US');
  utter.rate = 0.85;
  utter.pitch = 1;
  
  const bar = document.getElementById('audioBar');
  const titleEl = document.getElementById('audioTitle');
  const langEl = document.getElementById('audioLang');
  const fillEl = document.getElementById('audioProgressFill');
  
  if (titleEl) titleEl.textContent = text.slice(0, 45) + (text.length > 45 ? '…' : '');
  if (langEl) langEl.textContent = utter.lang.startsWith('ar') ? 'AR' : 'EN';
  if (bar) bar.style.display = 'flex';
  if (fillEl) fillEl.style.width = '0%';

  const totalChars = text.length || 1;
  
  utter.addEventListener('boundary', (e) => {
    if (e.charIndex !== undefined && fillEl) {
      fillEl.style.width = Math.min(100, Math.round((e.charIndex / totalChars) * 100)) + '%';
    }
  });
  
  utter.onend = () => {
    if (fillEl) fillEl.style.width = '100%';
    setTimeout(() => {
      if (bar) bar.style.display = 'none';
    }, 900);
  };
  
  utter.onerror = () => {
    if (bar) bar.style.display = 'none';
  };
  
  window.speechSynthesis.speak(utter);
}

function stopAudio() {
  window.speechSynthesis.cancel();
  document.getElementById('audioBar').style.display = 'none';
}

function toggleAudioLang() {
  STATE.ttsLang = STATE.ttsLang === 'ar' ? 'en' : 'ar';
  document.getElementById('langSwitch').textContent = STATE.ttsLang.toUpperCase();
}

// ── SIDEBAR ────────────────────────────────────────────────
function openSidebar() {
  document.getElementById('sideDrawer').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
  buildDrawerChapters();
}

function closeSidebar() {
  document.getElementById('sideDrawer').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('visible');
  document.body.style.overflow = '';
}

function buildDrawerChapters() {
  const el = document.getElementById('drawerChaptersList');
  if (!el || el.children.length > 0) return;
  
  el.innerHTML = CHAPTERS.map(ch => `
    <a href="#" onclick="navigate('chapter-detail',{chapter:${ch.id}});closeSidebar()">
      <span>${ch.icon}</span> ${ch.title}
    </a>`).join('');
}

// ── TOAST ──────────────────────────────────────────────────
// toastTimer معرف في index.html، نستخدمه هنا بدون إعادة تعريف

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  
  t.textContent = msg;
  t.classList.add('show');
  
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── API KEY ────────────────────────────────────────────────
function openApiModal() {
  const m = document.getElementById('apiModal');
  if (m) {
    m.classList.add('visible');
    const i = document.getElementById('apiKeyInput');
    if (i && STATE.apiKey) i.value = '••••••••••••••••';
  }
}

function closeApiModal() {
  const m = document.getElementById('apiModal');
  if (m) m.classList.remove('visible');
}

function saveApiKey() {
  const i = document.getElementById('apiKeyInput');
  if (!i) return;
  
  const key = i.value.trim();
  if (key) {
    STATE.apiKey = key;
    localStorage.setItem('medterm_apikey', key);
    closeApiModal();
    showToast('✅ تم حفظ API Key!');
  } else {
    showToast('⚠️ أدخل المفتاح أولاً');
  }
}

// ── HELPER ────────────────────────────────────────────────
function esc(str, max = 200) {
  if (!str) return '';
  
  return String(str)
    .slice(0, max)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\\/g, '&#92;')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');
}

// ── INIT ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const hash = location.hash.replace('#', '');
  
  if (hash) {
    const p = hash.split('/');
    navigate(p[0], p[1] ? { chapter: parseInt(p[1]) } : {});
  } else {
    navigate('home');
  }
  
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeSidebar();
      closeApiModal();
      closeOrganModal();
      
      // إغلاق معرض الصور إذا كان مفتوحاً
      const lightbox = document.querySelector('.img-lightbox-modal');
      if (lightbox && lightbox.style.display === 'flex') {
        lightbox.style.display = 'none';
      }
    }
  });
  
  if (!STATE.apiKey) {
    setTimeout(() => showToast('🔑 أضف API Key للذكاء الاصطناعي'), 2500);
  }
});

window.addEventListener('popstate', () => {
  const hash = location.hash.replace('#', '');
  if (hash) {
    const p = hash.split('/');
    navigate(p[0], p[1] ? { chapter: parseInt(p[1]) } : {});
  }
});

// تصدير الدوال العامة
window.navigate = navigate;
window.showChapterMode = showChapterMode;
window.switchSource = switchSource;
window.toggleRichSection = toggleRichSection;
window.setTranslateLang = setTranslateLang;
window.toggleChapterFav = toggleChapterFav;
window.speakText = speakText;
window.stopAudio = stopAudio;
window.toggleAudioLang = toggleAudioLang;
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
window.openApiModal = openApiModal;
window.closeApiModal = closeApiModal;
window.saveApiKey = saveApiKey;
window.showToast = showToast;
window.esc = esc;
window.filterOrgans = filterOrgans;
window.openOrganModal = openOrganModal;
window.closeOrganModal = closeOrganModal;
window.handleOrganModalClick = handleOrganModalClick;
window.toggleOverview = toggleOverview;
window.startQuiz = startQuiz;
window.startQuizAll = startQuizAll;
window.answerQuiz = answerQuiz;
window.removeFav = removeFav;
window.speakAllSentences = speakAllSentences;
window.openImageLightbox = openImageLightbox;
window.initLazyImages = initLazyImages;
