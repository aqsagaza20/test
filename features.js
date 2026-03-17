// ============================================================
//  MedTerm Features v6.0
//  🌙 Theme · 📊 XP/Levels · 🎴 Study Mode · 🔍 Search · ⏱️ Exam
//  💾 Offline Support · 🔐 Session Management
// ============================================================

// ══════════════════════════════════════════════════════════
//  THEME SYSTEM  🌙☀️
// ══════════════════════════════════════════════════════════
const LIGHT_VARS = {
  '--bg': '#f0f4f8',
  '--bg2': '#ffffff',
  '--bg3': '#e8edf5',
  '--surface': '#ffffff',
  '--surface2': '#f5f7fa',
  '--surface3': '#edf0f5',
  '--border': 'rgba(66,153,225,0.15)',
  '--border2': 'rgba(66,153,225,0.3)',
  '--text': '#1a202c',
  '--text2': '#4a5568',
  '--text3': '#718096',
  '--accent': '#3182ce',
  '--accent2': '#2b6cb0',
  '--accent-soft': 'rgba(49,130,206,0.12)',
  '--accent-glow': 'rgba(49,130,206,0.06)',
  '--shadow': '0 4px 24px rgba(0,0,0,0.1)',
  '--shadow-sm': '0 2px 12px rgba(0,0,0,0.07)'
};

function applyTheme(dark) {
  const root = document.documentElement;
  if (dark) {
    Object.keys(LIGHT_VARS).forEach(k => root.style.removeProperty(k));
    document.body.classList.remove('light-mode');
  } else {
    Object.entries(LIGHT_VARS).forEach(([k, v]) => root.style.setProperty(k, v));
    document.body.classList.add('light-mode');
  }
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = dark ? '🌙' : '☀️';
}

function toggleTheme() {
  const isDark = !document.body.classList.contains('light-mode');
  const newDark = !isDark;
  applyTheme(newDark);
  localStorage.setItem('medterm_theme', newDark ? 'dark' : 'light');
  if (typeof showToast === 'function') showToast(newDark ? '🌙 الوضع الليلي' : '☀️ الوضع النهاري');
}

function initTheme() {
  const saved = localStorage.getItem('medterm_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = saved ? saved === 'dark' : prefersDark;
  applyTheme(dark);
}

// ══════════════════════════════════════════════════════════
//  XP & LEVELS SYSTEM  🏆
// ══════════════════════════════════════════════════════════
const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];
const LEVEL_NAMES = [
  '',
  'مبتدئ',
  'متعلم',
  'مثابر',
  'متقدم',
  'ماهر',
  'خبير',
  'متميز',
  'محترف',
  'أستاذ',
  'عبقري'
];
const LEVEL_ICONS = ['', '🌱', '📖', '💡', '🔬', '⚗️', '🧠', '🎓', '🏅', '🥇', '🏆'];

function getXPData() {
  try {
    return JSON.parse(localStorage.getItem('medterm_xp') || '{"xp":0,"quizzes":0,"studied":0,"streak":0,"lastStudy":"","breakdown":{},"daily":{}}');
  } catch {
    return { xp: 0, quizzes: 0, studied: 0, streak: 0, lastStudy: '', breakdown: {}, daily: {} };
  }
}

function saveXPData(d) {
  try {
    localStorage.setItem('medterm_xp', JSON.stringify(d));
  } catch (e) {
    console.warn('Failed to save XP data:', e);
  }
}

function getLevel(xp) {
  let lvl = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) lvl = i + 1;
    else break;
  }
  return Math.min(lvl, LEVEL_NAMES.length - 1);
}

function getLevelProgress(xp) {
  const lvl = getLevel(xp);
  const cur = LEVEL_THRESHOLDS[lvl - 1] || 0;
  const next = LEVEL_THRESHOLDS[lvl] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return { pct: Math.round(((xp - cur) / (next - cur)) * 100), cur, next, lvl };
}

// حد أقصى يومي 200 XP
const DAILY_XP_LIMIT = 200;

function getTodayXP() {
  const d = getXPData();
  const today = new Date().toDateString();
  return d.daily?.[today] || 0;
}

function addXP(amount, reason) {
  const d = getXPData();
  const today = new Date().toDateString();

  // التحقق من الحد اليومي
  d.daily = d.daily || {};
  const todayXP = d.daily[today] || 0;

  if (todayXP + amount > DAILY_XP_LIMIT) {
    if (typeof showToast === 'function') showToast(`⚠️ وصلت للحد اليومي (${DAILY_XP_LIMIT} XP)`);
    return d.xp;
  }

  const oldLvl = getLevel(d.xp);
  d.xp += amount;
  d.daily[today] = todayXP + amount;

  // إحصائيات حسب السبب
  d.breakdown = d.breakdown || {};
  d.breakdown[reason] = (d.breakdown[reason] || 0) + amount;

  // عدد البطاقات المدروسة
  if (reason === 'card') d.studied = (d.studied || 0) + 1;

  saveXPData(d);
  const newLvl = getLevel(d.xp);
  if (newLvl > oldLvl) setTimeout(() => showLevelUpModal(newLvl), 400);
  if (typeof updateXPBar === 'function') updateXPBar();
  if (typeof updateWeeklyChart === 'function') updateWeeklyChart();

  // مزامنة مع SessionManager
  if (typeof SessionManager !== 'undefined' && SessionManager.save) {
    SessionManager.save();
  }

  return d.xp;
}

function updateXPBar() {
  const d = getXPData();
  const lvl = getLevel(d.xp);
  const { pct, next } = getLevelProgress(d.xp);

  const elXP = document.getElementById('statXP');
  const elLvl = document.getElementById('statLevel');
  const elFill = document.getElementById('xpBarFill');
  const elCount = document.getElementById('xpBarCount');
  const elLabel = document.getElementById('xpLevelLabel');

  if (elXP) elXP.textContent = d.xp;
  if (elLvl) elLvl.textContent = toArabicNum(lvl);
  if (elFill) elFill.style.width = pct + '%';
  if (elCount) elCount.textContent = `${d.xp} / ${next} XP`;
  if (elLabel) elLabel.textContent = toArabicNum(lvl);
}

function toArabicNum(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function showLevelUpModal(lvl) {
  document.querySelectorAll('.levelup-overlay').forEach(el => el.remove());

  const overlay = document.createElement('div');
  overlay.className = 'levelup-overlay';
  overlay.innerHTML = `
    <div class="levelup-box">
      <div class="levelup-icon">${LEVEL_ICONS[lvl] || '🏆'}</div>
      <div class="levelup-title">ارتقيت للمستوى ${toArabicNum(lvl)}!</div>
      <div class="levelup-name">${LEVEL_NAMES[lvl] || 'بطل'}</div>
      <div class="levelup-sub">أحسنت! واصل مسيرتك التعليمية 🎓</div>
      <button class="levelup-close" onclick="this.closest('.levelup-overlay').classList.remove('visible');setTimeout(()=>this.closest('.levelup-overlay').remove(),400)">
        🎉 شكراً!
      </button>
    </div>`;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 400);
    }
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}

// ══════════════════════════════════════════════════════════
//  WEEKLY CHART  📊
// ══════════════════════════════════════════════════════════
function updateWeeklyChart() {
  const container = document.getElementById('weeklyChartContainer');
  if (!container) return;

  const d = getXPData();
  const weeklyData = [];
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  // آخر 7 أيام
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();
    weeklyData.push(d.daily?.[dateStr] || 0);
  }

  const maxXP = Math.max(...weeklyData, 1);

  const barsHTML = weeklyData
    .map(xp => {
      const height = (xp / maxXP) * 100;
      return `<div class="weekly-bar" style="height:${height}%" data-value="${xp} XP"></div>`;
    })
    .join('');

  document.getElementById('weeklyBars').innerHTML = barsHTML;
  document.getElementById('weeklyTotalXP').textContent = `${d.xp} XP`;
  container.style.display = 'block';
}

// ══════════════════════════════════════════════════════════
//  SEARCH SYSTEM  🔍
// ══════════════════════════════════════════════════════════
let searchTimeout = null;
let searchIndex = null;

// بناء فهرس البحث (يتم تخزينه محلياً)
function buildSearchIndex() {
  if (searchIndex) return searchIndex;

  searchIndex = {
    chapters: [],
    terms: [],
    sentences: []
  };

  try {
    CHAPTERS.forEach(ch => {
      // فصول
      searchIndex.chapters.push({
        id: ch.id,
        title: ch.title,
        titleEn: ch.titleEn,
        overview: ch.overview,
        icon: ch.icon,
        color: ch.color
      });

      // مصطلحات
      ch.terms?.forEach(term => {
        searchIndex.terms.push({
          chapterId: ch.id,
          chapterTitle: ch.title,
          en: term.en,
          ar: term.ar,
          desc: term.desc,
          icon: '📖'
        });
      });

      // جمل
      ch.sentences?.forEach(sent => {
        searchIndex.sentences.push({
          chapterId: ch.id,
          chapterTitle: ch.title,
          text: sent.text,
          ar: sent.ar,
          note: sent.note || '',
          icon: '📝'
        });
      });
    });

    // تخزين في localStorage للتشغيل بدون إنترنت
    try {
      localStorage.setItem('medterm_search_index', JSON.stringify(searchIndex));
    } catch (e) {
      console.warn('Failed to cache search index:', e);
    }
  } catch (e) {
    console.warn('Failed to build search index:', e);
  }

  return searchIndex;
}

// تحميل فهرس البحث من التخزين المحلي
function loadSearchIndex() {
  try {
    const cached = localStorage.getItem('medterm_search_index');
    if (cached) {
      searchIndex = JSON.parse(cached);
      return true;
    }
  } catch (e) {
    console.warn('Failed to load search index from cache:', e);
  }
  return false;
}

function performSearch() {
  const query = document.getElementById('searchInput')?.value.trim().toLowerCase();
  if (!query) {
    document.getElementById('searchResults').innerHTML = '<div class="search-placeholder">اكتب كلمة للبحث...</div>';
    return;
  }

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const filterChapters = document.getElementById('filterChapters')?.checked;
    const filterTerms = document.getElementById('filterTerms')?.checked;
    const filterSentences = document.getElementById('filterSentences')?.checked;

    const results = [];

    // تحميل أو بناء فهرس البحث
    if (!searchIndex && !loadSearchIndex()) {
      buildSearchIndex();
    }

    // البحث في الفصول
    if (filterChapters && searchIndex?.chapters) {
      searchIndex.chapters.forEach(ch => {
        if (
          ch.title.toLowerCase().includes(query) ||
          ch.titleEn.toLowerCase().includes(query) ||
          ch.overview.toLowerCase().includes(query)
        ) {
          results.push({
            type: 'chapter',
            id: ch.id,
            title: ch.title,
            preview: ch.overview.substring(0, 100) + '...',
            icon: ch.icon,
            color: ch.color
          });
        }
      });
    }

    // البحث في المصطلحات
    if (filterTerms && searchIndex?.terms) {
      searchIndex.terms.forEach(term => {
        if (
          term.en.toLowerCase().includes(query) ||
          term.ar.includes(query) ||
          term.desc.includes(query)
        ) {
          results.push({
            type: 'term',
            chapterId: term.chapterId,
            chapterTitle: term.chapterTitle,
            title: `${term.en} / ${term.ar}`,
            preview: term.desc,
            icon: '📖'
          });
        }
      });
    }

    // البحث في الجمل
    if (filterSentences && searchIndex?.sentences) {
      searchIndex.sentences.forEach(sent => {
        if (
          sent.text.toLowerCase().includes(query) ||
          sent.ar.includes(query) ||
          sent.note.includes(query)
        ) {
          results.push({
            type: 'sentence',
            chapterId: sent.chapterId,
            chapterTitle: sent.chapterTitle,
            title: sent.text.substring(0, 50) + '...',
            preview: sent.ar,
            icon: '📝'
          });
        }
      });
    }

    renderSearchResults(results, query);

    // تحديث إحصائيات البحث
    if (typeof addXP === 'function') {
      const d = getXPData();
      d.searches = (d.searches || 0) + 1;
      saveXPData(d);
    }
  }, 300);
}

function renderSearchResults(results, query) {
  const container = document.getElementById('searchResults');

  if (results.length === 0) {
    container.innerHTML = '<div class="search-placeholder">لا توجد نتائج للبحث</div>';
    return;
  }

  const highlightText = text => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="result-highlight">$1</span>');
  };

  container.innerHTML = results
    .map(
      r => `
    <div class="search-result-item" onclick="navigateToSearchResult('${r.type}', ${r.id || r.chapterId})">
      <span class="result-type ${r.type}">${r.type === 'chapter' ? 'فصل' : r.type === 'term' ? 'مصطلح' : 'جملة'}</span>
      <div class="result-title">${r.icon} ${highlightText(r.title)}</div>
      <div class="result-preview">${highlightText(r.preview)}</div>
      ${r.chapterTitle ? `<div style="font-size:0.7rem; color:var(--text3); margin-top:4px">من ${r.chapterTitle}</div>` : ''}
    </div>
  `
    )
    .join('');
}

function navigateToSearchResult(type, id) {
  if (type === 'chapter') {
    navigate('chapter-detail', { chapter: id });
  } else {
    navigate('chapter-detail', { chapter: id });
    // التمرير للقسم المناسب بعد ثانية
    setTimeout(() => {
      if (type === 'term') {
        const firstTerm = document.querySelector('.term-row');
        if (firstTerm) firstTerm.scrollIntoView({ behavior: 'smooth' });
      } else if (type === 'sentence') {
        document.getElementById('chSentencesBtn')?.click();
      }
    }, 500);
  }
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  performSearch();
}

// ══════════════════════════════════════════════════════════
//  STUDY MODE (Flashcards)  🎴
// ══════════════════════════════════════════════════════════
let studyState = { chapterId: null, cards: [], index: 0, flipped: false, correct: 0, total: 0 };

function initStudy() {
  const container = document.getElementById('studyContainer');
  if (!container) return;

  if (!studyState.chapterId) {
    renderStudyChapterPicker(container);
  } else {
    renderStudyCard(container);
  }
}

function renderStudyChapterPicker(container) {
  container.innerHTML = `
    <div class="study-picker">
      <div class="study-picker-header">
        <p>اختر فصلاً لبدء جلسة بطاقات الحفظ</p>
      </div>
      <button class="study-all-btn" onclick="startStudyAll()">
        🎯 دراسة كل المصطلحات
      </button>
      <div class="study-chapters-grid">
        ${CHAPTERS.map(
          ch => `
          <div class="study-ch-card" onclick="startStudy(${ch.id})" style="--sc-color:${ch.color}">
            <div class="sc-icon">${ch.icon}</div>
            <div class="sc-title">${ch.title}</div>
            <div class="sc-count">${ch.terms ? ch.terms.length : 0} مصطلح</div>
          </div>`
        ).join('')}
      </div>
    </div>`;
}

function startStudy(chId) {
  const ch = CHAPTERS.find(c => c.id === chId);
  if (!ch || !ch.terms || ch.terms.length === 0) {
    if (typeof showToast === 'function') showToast('لا توجد مصطلحات لهذا الفصل');
    return;
  }
  const shuffled = [...ch.terms].sort(() => Math.random() - 0.5);
  studyState = { chapterId: chId, cards: shuffled, index: 0, flipped: false, correct: 0, total: shuffled.length };
  renderStudyCard(document.getElementById('studyContainer'));
}

function startStudyAll() {
  let all = [];
  CHAPTERS.forEach(ch => {
    if (ch.terms) all = all.concat(ch.terms.map(t => ({ ...t, _ch: ch.title })));
  });
  all = all.sort(() => Math.random() - 0.5);
  if (all.length === 0) {
    if (typeof showToast === 'function') showToast('لا توجد مصطلحات');
    return;
  }
  studyState = { chapterId: 'all', cards: all, index: 0, flipped: false, correct: 0, total: all.length };
  renderStudyCard(document.getElementById('studyContainer'));
}

function renderStudyCard(container) {
  const s = studyState;
  if (s.index >= s.cards.length) {
    // انتهت الجلسة
    const xpEarned = s.correct * 5;
    addXP(xpEarned, 'study');
    container.innerHTML = `
      <div class="study-result">
        <div class="sr-icon">🎉</div>
        <div class="sr-title">انتهت الجلسة!</div>
        <div class="sr-score">${s.correct} / ${s.total}</div>
        <div class="sr-xp">+${xpEarned} XP 🏆</div>
        <div class="sr-msg">${
          s.correct === s.total
            ? 'ممتاز! أتقنت جميع المصطلحات!'
            : s.correct >= s.total * 0.7
            ? 'جيد جداً! استمر'
            : 'راجع المصطلحات مجدداً'
        }</div>
        <div class="sr-btns">
          <button class="sr-btn" onclick="studyState.chapterId=null;initStudy()">اختر فصلاً آخر</button>
          <button class="sr-btn accent" onclick="startStudy(${s.chapterId === 'all' ? "'all'" : s.chapterId});">إعادة</button>
        </div>
      </div>`;
    if (typeof updateXPBar === 'function') updateXPBar();
    return;
  }

  const card = s.cards[s.index];
  const pct = Math.round((s.index / s.total) * 100);

  container.innerHTML = `
    <div class="study-session">
      <div class="study-top">
        <button class="study-back-btn" onclick="studyState.chapterId=null;initStudy()">← العودة</button>
        <span class="study-counter">${s.index + 1} / ${s.total}</span>
        <span class="study-score-sm">✅ ${s.correct}</span>
      </div>
      <div class="study-progress-track"><div class="study-progress-fill" style="width:${pct}%"></div></div>
      <div class="flashcard ${s.flipped ? 'flipped' : ''}" onclick="flipCard()">
        <div class="flashcard-inner">
          <div class="flashcard-front">
            <div class="fc-hint">اضغط لرؤية الترجمة</div>
            <div class="fc-term">${card.en || card.ar || '—'}</div>
            ${card._ch ? `<div class="fc-chapter">${card._ch}</div>` : ''}
          </div>
          <div class="flashcard-back">
            <div class="fc-hint-back">الترجمة العربية</div>
            <div class="fc-translation">${card.ar || '—'}</div>
            ${card.desc ? `<div class="fc-def">${card.desc}</div>` : ''}
            <button class="fc-speak" onclick="event.stopPropagation();speakText('${esc(card.en || '')}','en-US')">🔊 EN</button>
          </div>
        </div>
      </div>
      <div class="study-actions ${s.flipped ? 'visible' : ''}">
        <button class="study-btn wrong-btn" onclick="markCard(false)">❌ لم أعرف</button>
        <button class="study-btn correct-btn" onclick="markCard(true)">✅ عرفت!</button>
      </div>
    </div>`;
}

function flipCard() {
  studyState.flipped = !studyState.flipped;
  const card = document.querySelector('.flashcard');
  if (card) card.classList.toggle('flipped', studyState.flipped);
  const actions = document.querySelector('.study-actions');
  if (actions) actions.classList.toggle('visible', studyState.flipped);
}

function markCard(correct) {
  if (correct) {
    studyState.correct++;
    addXP(2, 'card');
  }
  studyState.index++;
  studyState.flipped = false;
  renderStudyCard(document.getElementById('studyContainer'));
}

// ══════════════════════════════════════════════════════════
//  EXAM MODE  ⏱️
// ══════════════════════════════════════════════════════════
let examState = {
  active: false,
  questions: [],
  current: 0,
  score: 0,
  timer: null,
  timeLeft: 0,
  totalTime: 0,
  answers: [],
  chapterId: null
};

function initExam() {
  const container = document.getElementById('examContainer');
  if (!container) return;

  if (!examState.active) {
    renderExamSettings(container);
  } else {
    renderExamQuestion(container);
  }
}

function renderExamSettings(container) {
  container.innerHTML = `
    <div class="exam-settings">
      <h3 style="margin-bottom:16px">⚙️ إعدادات الامتحان</h3>
      
      <div class="setting-group">
        <label>اختر الفصل:</label>
        <select id="examChapter" class="setting-select">
          <option value="all">📚 جميع الفصول (شامل)</option>
          ${CHAPTERS.map(ch => `<option value="${ch.id}">${ch.icon} ${ch.title}</option>`).join('')}
        </select>
      </div>
      
      <div class="setting-group">
        <label>عدد الأسئلة:</label>
        <select id="examQuestionCount" class="setting-select">
          <option value="10">١٠ أسئلة</option>
          <option value="20" selected>٢٠ سؤال</option>
          <option value="30">٣٠ سؤال</option>
          <option value="50">٥٠ سؤال</option>
        </select>
      </div>
      
      <div class="setting-group">
        <label>المؤقت الزمني:</label>
        <select id="examTimer" class="setting-select">
          <option value="0">⏱️ بدون مؤقت</option>
          <option value="300">٥ دقائق</option>
          <option value="600" selected>١٠ دقائق</option>
          <option value="900">١٥ دقيقة</option>
          <option value="1800">٣٠ دقيقة</option>
        </select>
      </div>
      
      <div class="setting-group">
        <label>صعوبة الأسئلة:</label>
        <select id="examDifficulty" class="setting-select">
          <option value="all">جميع المستويات</option>
          <option value="easy">سهل ⭐</option>
          <option value="medium">متوسط ⭐⭐</option>
          <option value="hard">صعب ⭐⭐⭐</option>
        </select>
      </div>
      
      <button class="study-all-btn" onclick="startExam()" style="margin-top:16px">
        🚀 بدء الامتحان
      </button>
    </div>
  `;
}

function startExam() {
  const chapterId = document.getElementById('examChapter')?.value;
  const questionCount = parseInt(document.getElementById('examQuestionCount')?.value || 20);
  const timerSeconds = parseInt(document.getElementById('examTimer')?.value || 0);
  const difficulty = document.getElementById('examDifficulty')?.value || 'all';

  // جمع الأسئلة
  let allQuestions = [];
  if (chapterId === 'all') {
    allQuestions = CHAPTERS.flatMap(ch => ch.quiz.map(q => ({ ...q, chapterId: ch.id, chapterTitle: ch.title })));
  } else {
    const ch = CHAPTERS.find(c => c.id == chapterId);
    if (ch) allQuestions = ch.quiz.map(q => ({ ...q, chapterId: ch.id, chapterTitle: ch.title }));
  }

  if (allQuestions.length === 0) {
    if (typeof showToast === 'function') showToast('لا توجد أسئلة لهذا الفصل');
    return;
  }

  // تصفية حسب الصعوبة (محاكاة)
  if (difficulty !== 'all') {
    allQuestions = allQuestions.filter((_, i) => i % 3 === (difficulty === 'easy' ? 0 : difficulty === 'medium' ? 1 : 2));
  }

  // اختيار عشوائي
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

  examState = {
    active: true,
    questions: selected,
    current: 0,
    score: 0,
    timer: null,
    timeLeft: timerSeconds,
    totalTime: timerSeconds,
    answers: new Array(selected.length).fill(null),
    chapterId: chapterId
  };

  if (timerSeconds > 0) {
    examState.timer = setInterval(() => {
      examState.timeLeft--;
      updateExamTimer();
      if (examState.timeLeft <= 0) {
        clearInterval(examState.timer);
        endExam();
      }
    }, 1000);
  }

  renderExamQuestion(document.getElementById('examContainer'));
}

function updateExamTimer() {
  const timerEl = document.getElementById('examTimerDisplay');
  if (!timerEl) return;

  const minutes = Math.floor(examState.timeLeft / 60);
  const seconds = examState.timeLeft % 60;
  timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  if (examState.timeLeft < 60) {
    timerEl.classList.add('timer-warning');
  }
}

function renderExamQuestion(container) {
  const q = examState.questions[examState.current];

  const progress = (examState.current / examState.questions.length) * 100;

  container.innerHTML = `
    <div class="exam-container">
      <div class="exam-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
        <button class="back-btn" onclick="exitExam()">← إنهاء الامتحان</button>
        <div class="exam-progress">سؤال ${examState.current + 1} / ${examState.questions.length}</div>
        ${examState.totalTime > 0 ? `<div class="exam-timer" id="examTimerDisplay">${Math.floor(examState.timeLeft / 60)}:${(examState.timeLeft % 60).toString().padStart(2, '0')}</div>` : ''}
      </div>
      
      <div class="quiz-progress"><div class="quiz-progress-fill" style="width:${progress}%"></div></div>
      
      <div class="question-card">
        <div class="question-num">${q.chapterTitle ? `📘 ${q.chapterTitle}` : ''}</div>
        <div class="question-text">${q.q}</div>
      </div>
      
      <div class="answers-grid">
        ${q.opts
          .map(
            (opt, i) => `
          <button class="answer-btn ${examState.answers[examState.current] === i ? 'selected' : ''}" 
                  onclick="selectExamAnswer(${i})"
                  ${examState.answers[examState.current] !== null ? 'disabled' : ''}>
            ${opt}
          </button>
        `
          )
          .join('')}
      </div>
      
      <div style="display:flex; gap:10px; margin-top:20px">
        ${examState.current > 0 ? `<button class="retry-btn secondary" onclick="prevExamQuestion()" style="flex:1">→ السابق</button>` : ''}
        
        ${examState.answers[examState.current] !== null ? `<button class="retry-btn" onclick="nextExamQuestion()" style="flex:1">${examState.current === examState.questions.length - 1 ? 'إنهاء الامتحان' : 'التالي ←'}</button>` : ''}
      </div>
    </div>
  `;

  if (examState.totalTime > 0) updateExamTimer();
}

function selectExamAnswer(idx) {
  if (examState.answers[examState.current] !== null) return;

  const q = examState.questions[examState.current];
  examState.answers[examState.current] = idx;

  if (idx === q.ans) {
    examState.score++;
  }

  // تحديث واجهة الأزرار
  document.querySelectorAll('.answer-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.ans) btn.classList.add('correct');
    if (i === idx && i !== q.ans) btn.classList.add('wrong');
  });

  // إظهار زر التالي
  renderExamQuestion(document.getElementById('examContainer'));
}

function prevExamQuestion() {
  if (examState.current > 0) {
    examState.current--;
    renderExamQuestion(document.getElementById('examContainer'));
  }
}

function nextExamQuestion() {
  if (examState.current < examState.questions.length - 1) {
    examState.current++;
    renderExamQuestion(document.getElementById('examContainer'));
  } else {
    endExam();
  }
}

function endExam() {
  if (examState.timer) clearInterval(examState.timer);

  const correctCount = examState.answers.filter((a, i) => a === examState.questions[i]?.ans).length;
  const xpEarned = correctCount * 15;
  addXP(xpEarned, 'exam');

  const container = document.getElementById('examContainer');
  const pct = Math.round((correctCount / examState.questions.length) * 100);

  container.innerHTML = `
    <div class="quiz-result">
      <div class="result-icon">${pct >= 80 ? '🏆' : pct >= 50 ? '✅' : '📚'}</div>
      <div class="result-score">${correctCount}<span>/${examState.questions.length}</span></div>
      <div class="result-pct">${pct}%</div>
      <div class="result-xp" style="color:var(--teal); font-weight:700; margin:8px 0">+${xpEarned} XP</div>
      <div class="result-msg">
        ${pct >= 80 ? 'ممتاز! أداء رائع 🎉' : pct >= 50 ? 'جيد! استمر في المراجعة 💪' : 'راجع الفصل مرة أخرى 📖'}
      </div>
      
      <div style="width:100%; margin:20px 0; text-align:right">
        <h4 style="margin-bottom:10px">📊 تحليل الأداء:</h4>
        ${examState.questions
          .map(
            (q, i) => `
          <div style="padding:8px; background:var(--surface2); margin-bottom:4px; border-radius:8px; display:flex; align-items:center; gap:8px">
            <span style="color:${examState.answers[i] === q.ans ? 'var(--green)' : 'var(--red)'}">
              ${examState.answers[i] === q.ans ? '✅' : '❌'}
            </span>
            <span style="flex:1; font-size:0.8rem">${q.q.substring(0, 50)}...</span>
            <button class="speak-btn" onclick="speakText('${esc(q.q)}','ar-SA')">🔊</button>
          </div>
        `
          )
          .join('')}
      </div>
      
      <div class="result-btns">
        <button class="retry-btn" onclick="exitExam()">إعدادات جديدة</button>
        <button class="retry-btn secondary" onclick="retryExam()">إعادة الامتحان</button>
      </div>
    </div>
  `;

  // تحديث إحصائيات الامتحان
  const d = getXPData();
  d.exams = (d.exams || 0) + 1;
  saveXPData(d);
}

function exitExam() {
  examState.active = false;
  if (examState.timer) clearInterval(examState.timer);
  initExam();
}

function retryExam() {
  const oldChapter = examState.chapterId;
  examState.active = false;
  if (examState.timer) clearInterval(examState.timer);

  // إعادة تشغيل بنفس الإعدادات
  setTimeout(() => {
    document.getElementById('examChapter').value = oldChapter;
    startExam();
  }, 100);
}

// ══════════════════════════════════════════════════════════
//  PROGRESS PAGE  📊
// ══════════════════════════════════════════════════════════
function initProgress() {
  const container = document.getElementById('progressContainer');
  if (!container) return;

  const d = getXPData();
  const lvl = getLevel(d.xp);
  const { pct, next } = getLevelProgress(d.xp);
  const done = JSON.parse(localStorage.getItem('medterm_done') || '[]');
  const favs = JSON.parse(localStorage.getItem('medterm_favs') || '[]');
  const donePercent = Math.round((done.length / CHAPTERS.length) * 100);
  const achievements = getAchievements(d, done, favs);
  const earned = achievements.filter(a => a.earned);

  // إحصائيات ذكية من SessionManager
  const smart = typeof SessionManager !== 'undefined' && SessionManager.sessionData ? SessionManager.getSmartStats() : null;

  container.innerHTML = `
    <div class="progress-page">
      <!-- Level Card -->
      <div class="prog-level-card">
        <div class="plc-icon">${LEVEL_ICONS[lvl]}</div>
        <div class="plc-info">
          <div class="plc-title">المستوى ${toArabicNum(lvl)} — ${LEVEL_NAMES[lvl]}</div>
          <div class="plc-sub">${d.xp} XP إجمالي</div>
        </div>
      </div>
      <div class="prog-xp-bar">
        <div class="prog-xp-labels"><span>المستوى الحالي</span><span>${d.xp} / ${next} XP</span></div>
        <div class="prog-xp-track"><div class="prog-xp-fill" style="width:${pct}%"></div></div>
        <div class="prog-xp-next">المستوى التالي: ${LEVEL_NAMES[Math.min(lvl + 1, LEVEL_NAMES.length - 1)]}</div>
      </div>

      <!-- Daily Progress -->
      <div class="prog-section-title">📊 تقدم اليوم (${getTodayXP()}/${DAILY_XP_LIMIT} XP)</div>
      <div style="background:var(--surface); border-radius:var(--radius); padding:12px; margin-bottom:20px">
        <div style="height:8px; background:var(--surface3); border-radius:99px; overflow:hidden">
          <div style="width:${(getTodayXP() / DAILY_XP_LIMIT) * 100}%; height:100%; background:linear-gradient(90deg,var(--accent),var(--teal)); border-radius:99px"></div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="prog-stats-grid">
        <div class="prog-stat-card"><span class="psc-num">${d.xp}</span><span class="psc-lbl">نقطة XP</span></div>
        <div class="prog-stat-card"><span class="psc-num">${done.length}</span><span class="psc-lbl">فصل مكتمل</span></div>
        <div class="prog-stat-card"><span class="psc-num">${d.quizzes || 0}</span><span class="psc-lbl">اختبار ناجح</span></div>
        <div class="prog-stat-card"><span class="psc-num">${d.studied || 0}</span><span class="psc-lbl">بطاقة مدروسة</span></div>
        <div class="prog-stat-card"><span class="psc-num">${favs.length}</span><span class="psc-lbl">مفضلة</span></div>
        <div class="prog-stat-card"><span class="psc-num">${d.streak || 0}</span><span class="psc-lbl">يوم متتالي 🔥</span></div>
      </div>

      <!-- Smart Stats (from SessionManager) -->
      ${smart ? `
      <div class="prog-section-title">📊 إحصائياتي الذكية</div>
      <div class="smart-stats-grid">
        <div class="smart-stat"><div class="ss-icon">⏱️</div><div class="ss-val">${smart.totalTime}</div><div class="ss-lbl">وقت الدراسة</div></div>
        <div class="smart-stat"><div class="ss-icon">🎯</div><div class="ss-val">${smart.accuracy}%</div><div class="ss-lbl">دقة الإجابات</div></div>
        <div class="smart-stat"><div class="ss-icon">📖</div><div class="ss-val">${smart.chaptersCompleted}</div><div class="ss-lbl">فصول مكتملة</div></div>
        <div class="smart-stat"><div class="ss-icon">🔥</div><div class="ss-val">${smart.streak} يوم</div><div class="ss-lbl">التسلسل</div></div>
      </div>
      ` : ''}

      <!-- Cache Status -->
      <div class="prog-section-title">💾 التخزين المؤقت</div>
      <div id="cacheStatusCard" class="prog-xp-bar" style="margin-bottom:20px; cursor:pointer" onclick="checkCacheStatus()">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px">
          <span>حالة التخزين</span>
          <span id="cacheStatusText">جاري التحقق...</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.8rem">
          <span id="cacheSizeText">0 MB</span>
          <span id="cacheExpiryText">—</span>
        </div>
      </div>

      <!-- Chapter Progress -->
      <div class="prog-section-title">📚 تقدم الفصول (${donePercent}%)</div>
      <div class="prog-chapters">
        ${CHAPTERS.map(ch => {
          const isDone = done.includes(ch.id);
          return `
            <div class="prog-ch-row" onclick="navigate('chapter-detail',{chapter:${ch.id}})">
              <span class="pcr-icon">${ch.icon}</span>
              <span class="pcr-title">${ch.title}</span>
              <span class="pcr-status ${isDone ? 'done' : ''}">${isDone ? '✓' : '○'}</span>
            </div>`;
        }).join('')}
      </div>

      <!-- Achievements -->
      <div class="prog-section-title">🏅 الإنجازات (${earned.length}/${achievements.length})</div>
      <div class="prog-achievements">
        ${achievements
          .map(
            a => `
          <div class="achiev-card ${a.earned ? 'earned' : 'locked'}">
            <div class="achiev-icon">${a.icon}</div>
            <div class="achiev-info">
              <div class="achiev-name">${a.name}</div>
              <div class="achiev-desc">${a.desc}</div>
            </div>
            ${a.earned ? '<div class="achiev-check">✓</div>' : '<div class="achiev-lock">🔒</div>'}
          </div>`
          )
          .join('')}
      </div>

      <!-- Reset & Share -->
      <div style="display:flex;gap:10px;margin-top:4px">
        <button class="prog-share-btn" onclick="shareResults()">📤 مشاركة تقدمي</button>
        <button class="prog-reset-btn" style="flex:1" onclick="confirmReset()">🗑️ إعادة التعيين</button>
      </div>
    </div>
  `;

  // تحديث حالة الكاش
  setTimeout(() => checkCacheStatus(), 500);
}

function getAchievements(d, done, favs) {
  return [
    { icon: '🌱', name: 'الخطوة الأولى', desc: 'افتح أي فصل', earned: done.length >= 1 },
    { icon: '📖', name: 'قارئ نشط', desc: 'أكمل ٣ فصول', earned: done.length >= 3 },
    { icon: '🎓', name: 'طالب متميز', desc: 'أكمل ٧ فصول', earned: done.length >= 7 },
    { icon: '🏆', name: 'خريج التشريح', desc: 'أكمل جميع الفصول', earned: done.length >= 14 },
    { icon: '⭐', name: 'محب المفضلة', desc: 'أضف ٥ مفضلات', earned: favs.length >= 5 },
    { icon: '🧠', name: 'اختباري أول', desc: 'اجتز اختباراً واحداً', earned: (d.quizzes || 0) >= 1 },
    { icon: '🔥', name: 'بطل الاختبارات', desc: 'اجتز ١٠ اختبارات', earned: (d.quizzes || 0) >= 10 },
    { icon: '🎴', name: 'مبتدئ البطاقات', desc: 'ادرس ٢٠ بطاقة', earned: (d.studied || 0) >= 20 },
    { icon: '💯', name: 'حافظ المصطلحات', desc: 'ادرس ١٠٠ بطاقة', earned: (d.studied || 0) >= 100 },
    { icon: '💎', name: 'نجم MedTerm', desc: 'احصل على ٥٠٠ XP', earned: d.xp >= 500 },
    { icon: '⏱️', name: 'بطل الامتحان', desc: 'اجتز امتحاناً بمؤقت', earned: (d.exams || 0) >= 1 },
    { icon: '🔍', name: 'باحث محترف', desc: 'ابحث ١٠ مرات', earned: (d.searches || 0) >= 10 }
  ];
}

// ══════════════════════════════════════════════════════════
//  CACHE STATUS  💾
// ══════════════════════════════════════════════════════════
function checkCacheStatus() {
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
    document.getElementById('cacheStatusText').textContent = 'غير متاح';
    return;
  }

  navigator.serviceWorker.controller.postMessage({ type: 'CHECK_CACHE' });
}

function updateCacheStatusUI(status) {
  const statusEl = document.getElementById('cacheStatusText');
  const sizeEl = document.getElementById('cacheSizeText');
  const expiryEl = document.getElementById('cacheExpiryText');

  if (!statusEl || !sizeEl || !expiryEl) return;

  if (status.valid) {
    statusEl.textContent = '✅ مخزّن';
    statusEl.style.color = 'var(--green)';
    sizeEl.textContent = `${status.size || '?'} MB`;
    expiryEl.textContent = `صالحة ${status.expiresInDays} يوم`;
  } else {
    statusEl.textContent = '⚠️ غير مخزّن';
    statusEl.style.color = 'var(--orange)';
    sizeEl.textContent = '0 MB';
    expiryEl.textContent = 'اضغط ⬇️ للتحميل';
  }
}

// ══════════════════════════════════════════════════════════
//  VIRTUAL SCROLL FOR TERMS
// ══════════════════════════════════════════════════════════
class VirtualScrollTerms {
  constructor(container, terms, chapter, itemHeight = 80) {
    this.container = container;
    this.terms = terms;
    this.chapter = chapter;
    this.itemHeight = itemHeight;
    this.visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2;
    this.scrollTop = 0;
    this.render();

    container.addEventListener('scroll', () => {
      this.scrollTop = container.scrollTop;
      this.render();
    });
  }

  render() {
    const start = Math.floor(this.scrollTop / this.itemHeight);
    const end = Math.min(start + this.visibleCount, this.terms.length);

    let html = '<div style="height:' + this.terms.length * this.itemHeight + 'px; position:relative">';

    for (let i = start; i < end; i++) {
      const term = this.terms[i];
      const top = i * this.itemHeight;
      html += `
        <div style="position:absolute; top:${top}px; width:100%; padding:0 16px">
          ${buildTermRow(term, this.chapter)}
        </div>
      `;
    }

    html += '</div>';
    this.container.innerHTML = html;
  }
}

// ══════════════════════════════════════════════════════════
//  FOCUS MODE  🎯
// ══════════════════════════════════════════════════════════
let _focusActive = false;

function toggleFocusMode() {
  _focusActive = !_focusActive;
  document.body.classList.toggle('focus-mode', _focusActive);
  const btn = document.getElementById('focusModeBtn');
  if (btn) {
    btn.textContent = _focusActive ? '✕' : '🎯';
    btn.title = _focusActive ? 'إنهاء وضع التركيز' : 'وضع التركيز';
  }
  if (typeof showToast === 'function') showToast(_focusActive ? '🎯 وضع التركيز – بدون تشتيت!' : '↩ خروج من وضع التركيز');
}

// ══════════════════════════════════════════════════════════
//  NOTIFICATIONS  🔔
// ══════════════════════════════════════════════════════════
function requestNotifications() {
  if (!('Notification' in window)) {
    if (typeof showToast === 'function') showToast('⚠️ المتصفح لا يدعم الإشعارات');
    return;
  }
  if (Notification.permission === 'granted') {
    scheduleReminder();
    if (typeof showToast === 'function') showToast('✅ التذكيرات مفعلة');
    return;
  }
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') {
      scheduleReminder();
      if (typeof showToast === 'function') showToast('🔔 تم تفعيل التذكيرات اليومية!');
      localStorage.setItem('medterm_notif', '1');
      const btn = document.getElementById('notifBtn');
      if (btn) btn.textContent = '🔔 التذكيرات مفعلة';
    } else {
      if (typeof showToast === 'function') showToast('⚠️ تم رفض الإشعارات');
    }
  });
}

function scheduleReminder() {
  const msgs = ['حان وقت مراجعة علم التشريح! 🔬', 'لا تنسَ دراستك اليومية في MedTerm 📚', 'بضع دقائق يومياً تصنع الفارق 🧠', 'راجع مصطلحاتك الطبية اليوم ⚕️'];
  const msg = msgs[Math.floor(Math.random() * msgs.length)];

  if (Notification.permission === 'granted') {
    setTimeout(() => {
      new Notification('MedTerm – تذكير الدراسة', {
        body: msg,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-72.png',
        tag: 'medterm-reminder'
      });
    }, 5000);
  }
}

// ══════════════════════════════════════════════════════════
//  DAILY STREAK
// ══════════════════════════════════════════════════════════
function checkDailyStreak() {
  const today = new Date().toDateString();
  const d = getXPData();

  if (d.lastStudy !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    d.streak = d.lastStudy === yesterday ? (d.streak || 0) + 1 : 1;
    d.lastStudy = today;
    d.xp = (d.xp || 0) + 5; // مكافأة تسجيل الدخول اليومي
    saveXPData(d);
    if (typeof updateXPBar === 'function') updateXPBar();
    if (typeof updateWeeklyChart === 'function') updateWeeklyChart();
    if (d.streak > 1 && typeof showToast === 'function') showToast(`🔥 ${d.streak} أيام متتالية! +5 XP`);
  }
}

// ══════════════════════════════════════════════════════════
//  SHARE RESULTS  📤
// ══════════════════════════════════════════════════════════
function shareResults() {
  const d = getXPData();
  const lvl = getLevel(d.xp);
  const done = JSON.parse(localStorage.getItem('medterm_done') || '[]');
  const todayXP = getTodayXP();
  const text = `📚 تقدمي في MedTerm\n🏆 المستوى ${lvl} – ${LEVEL_NAMES[lvl]}\n✅ أكملت ${done.length} من 14 فصلاً\n💎 ${d.xp} XP مجمّعة\n📊 اليوم: ${todayXP} XP\n\n#MedTerm #علم_التشريح`;

  if (navigator.share) {
    navigator.share({ title: 'MedTerm – تقدمي', text }).catch(() => copyToClipboard(text));
  } else {
    copyToClipboard(text);
  }
}

function copyToClipboard(text) {
  navigator.clipboard
    ?.writeText(text)
    .then(() => showToast('📋 تم النسخ للحافظة!'))
    .catch(() => showToast('⚠️ تعذّر المشاركة'));
}

function confirmReset() {
  if (!confirm('هل تريد إعادة تعيين كل التقدم؟ لا يمكن التراجع.')) return;
  localStorage.removeItem('medterm_xp');
  localStorage.removeItem('medterm_done');
  localStorage.removeItem('medterm_favs');
  if (window.STATE) {
    window.STATE.favorites = [];
    window.STATE.completedChapters = [];
  }
  if (typeof updateXPBar === 'function') updateXPBar();
  initProgress();
  if (typeof showToast === 'function') showToast('🔄 تم إعادة التعيين');
}

// ══════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  if (typeof updateXPBar === 'function') updateXPBar();
  if (typeof updateWeeklyChart === 'function') updateWeeklyChart();
  checkDailyStreak();

  // تحميل فهرس البحث
  loadSearchIndex();

  // التحقق من حالة الإشعارات
  if (localStorage.getItem('medterm_notif') === '1') {
    const btn = document.getElementById('notifBtn');
    if (btn) btn.textContent = '🔔 التذكيرات مفعلة';
  }

  // الاستماع لرسائل Service Worker
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', event => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'CACHE_STATUS') {
        updateCacheStatusUI(data);
      }

      if (data.type === 'DOWNLOAD_COMPLETE') {
        if (typeof showToast === 'function') {
          showToast(`✅ تم تحميل ${data.total} ملف بنجاح! (${data.size} MB)`);
        }
        checkCacheStatus();
      }
    });
  }
});

// تصدير الدوال العامة
window.toggleTheme = toggleTheme;
window.performSearch = performSearch;
window.clearSearch = clearSearch;
window.navigateToSearchResult = navigateToSearchResult;
window.startStudy = startStudy;
window.startStudyAll = startStudyAll;
window.flipCard = flipCard;
window.markCard = markCard;
window.initExam = initExam;
window.startExam = startExam;
window.selectExamAnswer = selectExamAnswer;
window.prevExamQuestion = prevExamQuestion;
window.nextExamQuestion = nextExamQuestion;
window.exitExam = exitExam;
window.retryExam = retryExam;
window.toggleFocusMode = toggleFocusMode;
window.requestNotifications = requestNotifications;
window.shareResults = shareResults;
window.confirmReset = confirmReset;
window.initProgress = initProgress;
window.checkCacheStatus = checkCacheStatus;
window.addXP = addXP;
window.updateXPBar = updateXPBar;
window.updateWeeklyChart = updateWeeklyChart;
window.getXPData = getXPData;
