import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'giliguli_dashboard.html');
const rootOutPath = path.join(root, 'demo_dashboard.html');
const publicOutPath = path.join(root, 'public', 'demo_dashboard.html');

function replaceRequired(input, pattern, replacement, label) {
  const output = input.replace(pattern, replacement);
  if (output === input) {
    throw new Error(`Could not apply replacement: ${label}`);
  }
  return output;
}

let html = fs.readFileSync(sourcePath, 'utf8');

html = html
  .replaceAll('הבית של גיליגולי', 'סטודיו דמו')
  .replaceAll('גיליגולי', 'סטודיו דמו')
  .replaceAll('GiliGuli', 'Demo Studio')
  .replaceAll('Giliguli', 'Demo Studio')
  .replaceAll('giliguli', 'demo-studio')
  .replaceAll('ScallaCRM', 'CRM')
  .replaceAll('Scalla CRM', 'CRM')
  .replaceAll('Arbox', 'מערכת סטודיו')
  .replaceAll('ב-מערכת סטודיו', 'במערכת סטודיו')
  .replaceAll('מ-מערכת סטודיו', 'ממערכת סטודיו')
  .replaceAll('Meta Ads', 'שיווק דיגיטלי')
  .replaceAll('Meta API', 'חיבור שיווקי')
  .replaceAll('arye.glikman@gmail.com', 'demo-alerts@example.com')
  .replaceAll('הגיעה מסטודיו דמו', 'הפניה פנימית')
  .replaceAll('הפניות מסטודיו דמו', 'הפניות פנימיות')
  .replaceAll('דשבורד ניהולי v3.0 | חיבור API חי ל-CRM', 'דשבורד דמו אנונימי | ללא חיבור למערכות לקוח')
  .replaceAll('סטודיו דמו | דשבורד ניהולי v3.0 | Scalla API v2.0', 'סטודיו דמו | דשבורד דמו אנונימי | נתונים סינתטיים')
  .replaceAll('נתונים חיים מ-Scalla ו-מערכת סטודיו', 'נתוני דמו אנונימיים')
  .replaceAll('אני אבדוק את הנתונים החיים ואענה בעברית', 'אני עונה על בסיס נתוני דמו בלבד');

html = html.replace(/\sdata-href="https:\/\/[^"]+"/g, ' data-demo-report="true"');
html = html.replace(
  /href="https:\/\/(?:houseofdemo-studio\.scallacrm\.co\.il|houseofgiliguli\.scallacrm\.co\.il|manage\.arboxapp\.com)[^"]*"/g,
  'href="#" data-demo-link="true" onclick="return false;"'
);
html = html
  .replaceAll('houseofdemo-studio.scallacrm.co.il', 'demo-crm.example.local')
  .replaceAll('houseofgiliguli.scallacrm.co.il', 'demo-crm.example.local')
  .replaceAll('https://manage.arboxapp.com', 'https://demo-reports.example.local')
  .replaceAll('https://api.scallacrm.co.il/scallaapi/api', '');

html = replaceRequired(
  html,
  '<div class="header-date" id="currentDate"></div>',
  '<div class="badge-live" id="demoModeBadge">נתוני דמו אנונימיים</div>\n      <div class="header-date" id="currentDate"></div>',
  'demo header badge'
);

const demoConfig = `const DEMO_MODE = true;
const DEMO_EMAIL = 'demo-alerts@example.com';

const SCALLA = {
  API: '',
  TENANT: '',
  PROXY: '',
};

const ARBOX = {
  ENDPOINT: '',
};

const META = {
  ENDPOINT: '',
};`;

html = replaceRequired(
  html,
  /const SCALLA = \{[\s\S]*?\n\};\r?\n\r?\nconst ARBOX = \{[\s\S]*?\n\};\r?\n\r?\nconst META = \{[\s\S]*?\n\};/,
  demoConfig,
  'demo config'
);

const demoData = `// ═══════════════════════════════════════════════════════════════
// SYNTHETIC DEMO DATA - anonymized, not derived from customer records
// ═══════════════════════════════════════════════════════════════
const CACHED_STATUS = [
  { label: 'ליד בטיפול',        pct: 26.44, count: 92, color: '#6B21A8' },
  { label: 'נסיונות חיוג',      pct: 20.11, count: 70, color: '#FCD34D' },
  { label: 'לא רלוונטי',        pct: 18.68, count: 65, color: '#9CA3AF' },
  { label: 'רכשה שיעור ניסיון', pct: 12.07, count: 42, color: '#16A34A' },
  { label: 'ליד חדש',           pct:  8.91, count: 31, color: '#0EA5E9' },
  { label: 'מיקום',             pct:  5.75, count: 20, color: '#34D399' },
  { label: 'לחזור בעתיד',       pct:  4.31, count: 15, color: '#F9A8D4' },
  { label: 'תואמה שיחה',        pct:  3.74, count: 13, color: '#F59E0B' },
];

const CACHED_SOURCES = [
  { label: 'קמפיינים ממומנים', count: 96 },
  { label: 'רשתות חברתיות',    count: 74 },
  { label: 'אתר אינטרנט',      count: 61 },
  { label: 'הפניות פנימיות',   count: 43 },
  { label: 'WhatsApp',         count: 31 },
  { label: 'אירוע קהילתי',     count: 24 },
  { label: 'לא ידוע',          count: 19 },
];

const CACHED_LEADS = [
  { name: 'לקוחה דמו 001', status: 'new', statusLabel: 'ליד חדש', source: 'אתר אינטרנט', age: '1-3 חודשים', reason: '-', owner: 'צוות א', phone: '050-0XXXXX1', date: '22/07/2026', rawDate: '2026-07-22 09:15:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 002', status: 'in-progress', statusLabel: 'ליד בטיפול', source: 'קמפיינים ממומנים', age: '4-8 חודשים', reason: '-', owner: 'צוות ב', phone: '050-0XXXXX2', date: '22/07/2026', rawDate: '2026-07-22 08:40:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 003', status: 'calling', statusLabel: 'נסיונות חיוג', source: 'רשתות חברתיות', age: '1-3 חודשים', reason: '-', owner: 'צוות ג', phone: '050-0XXXXX3', date: '21/07/2026', rawDate: '2026-07-21 18:20:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 004', status: 'purchased', statusLabel: 'רכשה שיעור ניסיון', source: 'WhatsApp', age: 'שנה-2.5 שנים', reason: '-', owner: 'צוות א', phone: '050-0XXXXX4', date: '21/07/2026', rawDate: '2026-07-21 15:05:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 005', status: 'scheduled', statusLabel: 'תואמה שיחה', source: 'הפניות פנימיות', age: 'לא ידוע', reason: '-', owner: 'צוות ב', phone: '050-0XXXXX5', date: '20/07/2026', rawDate: '2026-07-20 17:25:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 006', status: 'irrelevant', statusLabel: 'לא רלוונטי', source: 'קמפיינים ממומנים', age: '1-3 חודשים', reason: 'מחוץ לאזור השירות', owner: 'צוות ג', phone: '050-0XXXXX6', date: '20/07/2026', rawDate: '2026-07-20 10:10:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 007', status: 'location', statusLabel: 'מיקום', source: 'אתר אינטרנט', age: '4-8 חודשים', reason: 'מעדיפה מיקום אחר', owner: 'צוות א', phone: '050-0XXXXX7', date: '19/07/2026', rawDate: '2026-07-19 13:32:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 008', status: 'return', statusLabel: 'לחזור בעתיד', source: 'רשתות חברתיות', age: '1-4 חודשים', reason: 'מעוניינת בחודש הבא', owner: 'צוות ב', phone: '050-0XXXXX8', date: '19/07/2026', rawDate: '2026-07-19 09:12:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 009', status: 'in-progress', statusLabel: 'ליד בטיפול', source: 'אירוע קהילתי', age: 'לא ידוע', reason: '-', owner: 'צוות ג', phone: '050-0XXXXX9', date: '18/07/2026', rawDate: '2026-07-18 14:45:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 010', status: 'calling', statusLabel: 'נסיונות חיוג', source: 'קמפיינים ממומנים', age: '1-3 חודשים', reason: '-', owner: 'צוות א', phone: '050-0XXXX10', date: '18/07/2026', rawDate: '2026-07-18 11:00:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 011', status: 'purchased', statusLabel: 'רכשה שיעור ניסיון', source: 'הפניות פנימיות', age: '4-8 חודשים', reason: '-', owner: 'צוות ב', phone: '050-0XXXX11', date: '17/07/2026', rawDate: '2026-07-17 16:30:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 012', status: 'new', statusLabel: 'ליד חדש', source: 'WhatsApp', age: 'לא ידוע', reason: '-', owner: 'צוות ג', phone: '050-0XXXX12', date: '17/07/2026', rawDate: '2026-07-17 12:12:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 013', status: 'irrelevant', statusLabel: 'לא רלוונטי', source: 'לא ידוע', age: '1-3 חודשים', reason: 'תקציב לא מתאים', owner: 'צוות א', phone: '050-0XXXX13', date: '16/07/2026', rawDate: '2026-07-16 15:22:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 014', status: 'calling', statusLabel: 'נסיונות חיוג', source: 'קמפיינים ממומנים', age: '1-4 חודשים', reason: '-', owner: 'צוות ב', phone: '050-0XXXX14', date: '16/07/2026', rawDate: '2026-07-16 09:55:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 015', status: 'in-progress', statusLabel: 'ליד בטיפול', source: 'אתר אינטרנט', age: 'שנה-2.5 שנים', reason: '-', owner: 'צוות ג', phone: '050-0XXXX15', date: '15/07/2026', rawDate: '2026-07-15 17:42:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 016', status: 'purchased', statusLabel: 'רכשה שיעור ניסיון', source: 'רשתות חברתיות', age: '4-8 חודשים', reason: '-', owner: 'צוות א', phone: '050-0XXXX16', date: '15/07/2026', rawDate: '2026-07-15 08:20:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 017', status: 'scheduled', statusLabel: 'תואמה שיחה', source: 'קמפיינים ממומנים', age: '1-3 חודשים', reason: '-', owner: 'צוות ב', phone: '050-0XXXX17', date: '14/07/2026', rawDate: '2026-07-14 13:00:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 018', status: 'calling', statusLabel: 'נסיונות חיוג', source: 'הפניות פנימיות', age: 'לא ידוע', reason: '-', owner: 'צוות ג', phone: '050-0XXXX18', date: '14/07/2026', rawDate: '2026-07-14 10:11:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 019', status: 'return', statusLabel: 'לחזור בעתיד', source: 'אתר אינטרנט', age: '1-3 חודשים', reason: 'מבקשת תזכורת', owner: 'צוות א', phone: '050-0XXXX19', date: '13/07/2026', rawDate: '2026-07-13 18:16:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 020', status: 'in-progress', statusLabel: 'ליד בטיפול', source: 'WhatsApp', age: '1-4 חודשים', reason: '-', owner: 'צוות ב', phone: '050-0XXXX20', date: '13/07/2026', rawDate: '2026-07-13 12:38:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 021', status: 'irrelevant', statusLabel: 'לא רלוונטי', source: 'קמפיינים ממומנים', age: 'לא ידוע', reason: 'אין זמינות בשעות', owner: 'צוות ג', phone: '050-0XXXX21', date: '12/07/2026', rawDate: '2026-07-12 11:50:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 022', status: 'new', statusLabel: 'ליד חדש', source: 'רשתות חברתיות', age: '4-8 חודשים', reason: '-', owner: 'צוות א', phone: '050-0XXXX22', date: '12/07/2026', rawDate: '2026-07-12 09:30:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 023', status: 'calling', statusLabel: 'נסיונות חיוג', source: 'קמפיינים ממומנים', age: '1-3 חודשים', reason: '-', owner: 'צוות ב', phone: '050-0XXXX23', date: '11/07/2026', rawDate: '2026-07-11 16:01:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 024', status: 'location', statusLabel: 'מיקום', source: 'אירוע קהילתי', age: 'לא ידוע', reason: 'רחוקה מהסניף', owner: 'צוות ג', phone: '050-0XXXX24', date: '11/07/2026', rawDate: '2026-07-11 10:20:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 025', status: 'purchased', statusLabel: 'רכשה שיעור ניסיון', source: 'אתר אינטרנט', age: '1-4 חודשים', reason: '-', owner: 'צוות א', phone: '050-0XXXX25', date: '10/07/2026', rawDate: '2026-07-10 13:47:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 026', status: 'in-progress', statusLabel: 'ליד בטיפול', source: 'קמפיינים ממומנים', age: '4-8 חודשים', reason: '-', owner: 'צוות ב', phone: '050-0XXXX26', date: '10/07/2026', rawDate: '2026-07-10 08:56:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 027', status: 'calling', statusLabel: 'נסיונות חיוג', source: 'WhatsApp', age: '1-3 חודשים', reason: '-', owner: 'צוות ג', phone: '050-0XXXX27', date: '09/07/2026', rawDate: '2026-07-09 17:04:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 028', status: 'irrelevant', statusLabel: 'לא רלוונטי', source: 'רשתות חברתיות', age: 'לא ידוע', reason: 'לא מתאים כרגע', owner: 'צוות א', phone: '050-0XXXX28', date: '09/07/2026', rawDate: '2026-07-09 14:31:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 029', status: 'in-progress', statusLabel: 'ליד בטיפול', source: 'הפניות פנימיות', age: '1-4 חודשים', reason: '-', owner: 'צוות ב', phone: '050-0XXXX29', date: '08/07/2026', rawDate: '2026-07-08 11:39:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 030', status: 'calling', statusLabel: 'נסיונות חיוג', source: 'אתר אינטרנט', age: 'שנה-2.5 שנים', reason: '-', owner: 'צוות ג', phone: '050-0XXXX30', date: '08/07/2026', rawDate: '2026-07-08 09:17:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 031', status: 'return', statusLabel: 'לחזור בעתיד', source: 'קמפיינים ממומנים', age: '4-8 חודשים', reason: 'מבקשת להמתין', owner: 'צוות א', phone: '050-0XXXX31', date: '07/07/2026', rawDate: '2026-07-07 18:50:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 032', status: 'scheduled', statusLabel: 'תואמה שיחה', source: 'WhatsApp', age: 'לא ידוע', reason: '-', owner: 'צוות ב', phone: '050-0XXXX32', date: '07/07/2026', rawDate: '2026-07-07 12:26:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 033', status: 'purchased', statusLabel: 'רכשה שיעור ניסיון', source: 'רשתות חברתיות', age: '1-3 חודשים', reason: '-', owner: 'צוות ג', phone: '050-0XXXX33', date: '06/07/2026', rawDate: '2026-07-06 10:14:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 034', status: 'in-progress', statusLabel: 'ליד בטיפול', source: 'אירוע קהילתי', age: '4-8 חודשים', reason: '-', owner: 'צוות א', phone: '050-0XXXX34', date: '05/07/2026', rawDate: '2026-07-05 15:41:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 035', status: 'calling', statusLabel: 'נסיונות חיוג', source: 'קמפיינים ממומנים', age: '1-3 חודשים', reason: '-', owner: 'צוות ב', phone: '050-0XXXX35', date: '04/07/2026', rawDate: '2026-07-04 11:05:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 036', status: 'irrelevant', statusLabel: 'לא רלוונטי', source: 'לא ידוע', age: 'לא ידוע', reason: 'כפילות במערכת', owner: 'צוות ג', phone: '050-0XXXX36', date: '03/07/2026', rawDate: '2026-07-03 12:00:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 037', status: 'new', statusLabel: 'ליד חדש', source: 'אתר אינטרנט', age: '1-4 חודשים', reason: '-', owner: 'צוות א', phone: '050-0XXXX37', date: '02/07/2026', rawDate: '2026-07-02 09:30:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 038', status: 'in-progress', statusLabel: 'ליד בטיפול', source: 'הפניות פנימיות', age: 'שנה-2.5 שנים', reason: '-', owner: 'צוות ב', phone: '050-0XXXX38', date: '01/07/2026', rawDate: '2026-07-01 14:10:00', monthKey: '2026-07' },
  { name: 'לקוחה דמו 039', status: 'calling', statusLabel: 'נסיונות חיוג', source: 'קמפיינים ממומנים', age: '4-8 חודשים', reason: '-', owner: 'צוות ג', phone: '050-0XXXX39', date: '28/06/2026', rawDate: '2026-06-28 13:20:00', monthKey: '2026-06' },
  { name: 'לקוחה דמו 040', status: 'purchased', statusLabel: 'רכשה שיעור ניסיון', source: 'אתר אינטרנט', age: '1-3 חודשים', reason: '-', owner: 'צוות א', phone: '050-0XXXX40', date: '24/06/2026', rawDate: '2026-06-24 10:05:00', monthKey: '2026-06' },
];`;

html = replaceRequired(
  html,
  /\/\/ ═+\r?\n\/\/ CACHED FALLBACK DATA[\s\S]*?const CACHED_LEADS = \[[\s\S]*?\];/,
  demoData,
  'synthetic cached data'
);

html = replaceRequired(
  html,
  'async function scallaPost(params) {',
  `async function scallaPost(params) {
  if (DEMO_MODE) throw new Error('Demo mode does not connect to CRM');`,
  'Scalla guard'
);

html = replaceRequired(
  html,
  'async function loadScallaData() {',
  `async function loadScallaData() {
  if (DEMO_MODE) {
    const badge = document.getElementById('crmBadge');
    const dot = document.getElementById('crmDot');
    const txt = document.getElementById('crmStatus');
    const note = document.getElementById('leadsInfoNote');
    leadsData = CACHED_LEADS;
    statusData = CACHED_STATUS;
    sourceData = CACHED_SOURCES;
    scallaDataSource = 'demo';
    if (badge) {
      badge.innerHTML = '<span class="pulse"></span> CRM דמו ✓';
      badge.style.background = 'rgba(74,222,128,0.22)';
    }
    if (dot) dot.className = 'fr-dot sample';
    if (txt) txt.textContent = 'CRM - נתוני דמו אנונימיים';
    if (note) {
      note.innerHTML = '✅ <strong>נתוני CRM דמו אנונימיים</strong> - 40 רשומות סינתטיות | ללא חיבור למערכות לקוח';
      note.style.cssText = 'background:var(--success-light);color:var(--success);border-radius:10px;padding:11px 14px;font-size:12px;font-weight:500;display:flex;align-items:center;gap:8px;margin-bottom:16px;';
    }
    renderKPIs();
    renderCharts();
    renderFilters();
    renderTable();
    return;
  }`,
  'demo Scalla loader'
);

html = html.replace(
  "scallaDataSource === 'live' ? 'CRM חי' : 'נתונים שמורים';",
  "scallaDataSource === 'live' ? 'CRM חי' : (scallaDataSource === 'demo' ? 'CRM דמו' : 'נתונים שמורים');"
);

html = html.replace(
  "const sourceLabel = scallaDataSource === 'live' ? 'נתונים חיים' : 'מדגם 40 רשומות';",
  "const sourceLabel = scallaDataSource === 'live' ? 'נתונים חיים' : (scallaDataSource === 'demo' ? 'נתוני דמו אנונימיים' : 'מדגם 40 רשומות');"
);

html = html.replace(
  `const dateLabel = scallaDataSource === 'live'
    ? new Date().toLocaleDateString('he-IL')
    : '01/07/2026';`,
  `const dateLabel = scallaDataSource === 'live'
    ? new Date().toLocaleDateString('he-IL')
    : (scallaDataSource === 'demo' ? 'דמו 2026' : '01/07/2026');`
);

html = replaceRequired(
  html,
  'function updateDynamicReportLinks() {',
  `function updateDynamicReportLinks() {
  if (DEMO_MODE) return;`,
  'report link guard'
);

const demoStudioFunction = `function demoSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function demoSetHtml(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}

function demoRankingRows(items, scoreClass = '') {
  return items.map((item, index) =>
    '<div class="ranking-item"><div class="rank-num rank-' + Math.min(index + 1, 3) + '">' + (index + 1) +
    '</div><div class="ranking-name">' + item.name + '</div><div class="ranking-score ' + scoreClass + '">' + item.score + '</div></div>'
  ).join('');
}

function demoExpiryRows(items, color = '') {
  return items.map(item =>
    '<div class="expiry-item" style="' + (color ? 'border-right-color:' + color + ';' : '') + '">' +
      '<div class="expiry-avatar" style="' + (color ? 'background:linear-gradient(135deg,' + color + ',#d97706);' : '') + '">' + item.name.charAt(0) + '</div>' +
      '<div class="expiry-info"><div class="expiry-name">' + item.name + '</div><div class="expiry-meta">' + item.meta + ' | פגה: ' + item.expires + '</div></div>' +
      '<div class="expiry-days" style="' + (item.days <= 7 ? 'color:var(--danger);' : '') + '">' + (item.days === 0 ? 'היום!' : item.days + ' ימים') + '</div>' +
    '</div>'
  ).join('');
}

function loadDemoStudioData() {
  const fh = 126, ih = 84, kr = 52, expiringWeek = 7;
  const total = fh + ih + kr;
  demoSetText('kpiFH', fh);
  demoSetText('kpiIH', ih);
  demoSetText('kpiKR', kr);
  demoSetText('kpiExp', expiringWeek);
  demoSetText('fhNum', fh);
  demoSetText('ihNum', ih);
  demoSetText('krNum', kr);
  demoSetText('expiryCount', '12 מנויים');
  demoSetText('punchExpCount', '9 כרטיסיות');
  demoSetText('kpiActivePlans', total);
  demoSetText('kpiActivePlansSub', 'הגדול ביותר: Full House (126)');
  demoSetText('kpiPacksSold', 18);
  demoSetText('kpiPacksActiveSub', kr + ' פעילות | החודש');
  demoSetText('kpiInactive', 31);
  demoSetText('kpiInactiveSub', 'ללא פעילות ב-30 יום');
  demoSetText('kpiExpiredPlans', 9);
  demoSetText('kpiExpiredPlansSub', 'פגו ב-30 הימים האחרונים');
  demoSetText('kpiRenewals', 22);
  demoSetText('kpiRenewalsSub', '30 הימים האחרונים');
  demoSetText('kpiCancellations', 4);
  demoSetText('kpiCancellationsSub', 'לפי תאריך ביטול');
  demoSetText('kpiPunchExpKPI', 9);
  demoSetText('kpiActiveCourses', 14);
  const studioBadge = document.querySelector('#tab-btn-studio .tab-badge');
  if (studioBadge) studioBadge.textContent = total;

  [['fh', fh], ['ih', ih], ['kr', kr]].forEach(([cls, n]) => {
    const pct = Math.round(n / total * 100);
    const card = document.querySelector('.membership-card.' + cls);
    if (card) {
      card.querySelector('.cap-fill').style.width = pct + '%';
      card.querySelector('.cap-label').textContent = pct + '% מסה"כ ' + total + ' מנויים פעילים';
    }
  });

  demoSetHtml('expiryList', demoExpiryRows([
    { name: 'לקוחה דמו 041', meta: 'Full House', expires: '25/07/2026', days: 3 },
    { name: 'לקוחה דמו 042', meta: 'In House', expires: '27/07/2026', days: 5 },
    { name: 'לקוחה דמו 043', meta: 'Full House', expires: '31/07/2026', days: 9 },
    { name: 'לקוחה דמו 044', meta: 'In House', expires: '04/08/2026', days: 13 },
    { name: 'לקוחה דמו 045', meta: 'Full House', expires: '09/08/2026', days: 18 },
    { name: 'לקוחה דמו 046', meta: 'In House', expires: '17/08/2026', days: 26 },
  ]));

  demoSetHtml('punchExpList', demoExpiryRows([
    { name: 'לקוחה דמו 047', meta: 'כרטיסיית 10 כניסות', expires: '23/07/2026', days: 1 },
    { name: 'לקוחה דמו 048', meta: 'כרטיסיית 5 כניסות', expires: '26/07/2026', days: 4 },
    { name: 'לקוחה דמו 049', meta: 'כרטיסיית 10 כניסות', expires: '30/07/2026', days: 8 },
    { name: 'לקוחה דמו 050', meta: 'כרטיסיית 5 כניסות', expires: '05/08/2026', days: 14 },
  ], '#f59e0b'));

  demoSetHtml('workshopList', [
    ['בייבי יוגה', 'יום חמישי 23/07/2026 | 10:00-10:45', 'מדריכה א', 12],
    ['תנועה והתפתחות', 'יום חמישי 23/07/2026 | 17:00-17:45', 'מדריכה ב', 14],
    ['סדנת הורים ותינוקות', 'יום שישי 24/07/2026 | 09:30-10:30', 'מדריכה ג', 10],
    ['חוג מוזיקה', 'יום ראשון 26/07/2026 | 16:30-17:15', 'מדריכה א', 12],
  ].map(item =>
    '<div class="workshop-item"><div class="workshop-header"><div class="workshop-name">📌 ' + item[0] +
    '</div><div class="workshop-date">' + item[1] + '</div></div><div class="workshop-progress"><div style="flex:1;font-size:11px;color:var(--text-secondary);">👤 ' +
    item[2] + '</div><div class="workshop-count">עד ' + item[3] + ' משתתפות</div></div></div>'
  ).join(''));

  demoSetHtml('topList', demoRankingRows([
    { name: 'לקוחה דמו 051', score: '11 שיעורים' },
    { name: 'לקוחה דמו 052', score: '9 שיעורים' },
    { name: 'לקוחה דמו 053', score: '8 שיעורים' },
    { name: 'לקוחה דמו 054', score: '7 שיעורים' },
    { name: 'לקוחה דמו 055', score: '7 שיעורים' },
  ]));
  demoSetHtml('noShowList', demoRankingRows([
    { name: 'לקוחה דמו 056', score: '3 ביטולים' },
    { name: 'לקוחה דמו 057', score: '2 ביטולים' },
    { name: 'לקוחה דמו 058', score: '2 ביטולים' },
  ], 'danger'));
  demoSetHtml('courseBookingList', demoRankingRows([
    { name: 'בייבי יוגה', score: '38 הרשמות' },
    { name: 'תנועה והתפתחות', score: '31 הרשמות' },
    { name: 'חוג מוזיקה', score: '24 הרשמות' },
    { name: 'סדנת הורים', score: '19 הרשמות' },
  ]));
  demoSetHtml('nonEngagedList', demoRankingRows([
    { name: 'לקוחה דמו 059', score: 'Full House' },
    { name: 'לקוחה דמו 060', score: 'In House' },
    { name: 'לקוחה דמו 061', score: 'Full House' },
  ]));
  demoSetText('onetimeCount', '6 לידים חמים');
  demoSetHtml('onetimeList', demoRankingRows([
    { name: 'לקוחה דמו 062', score: 'שיעור ניסיון' },
    { name: 'לקוחה דמו 063', score: 'חדש ב-CRM' },
    { name: 'לקוחה דמו 064', score: 'מעקב השבוע' },
  ]));

  const note = document.getElementById('studioInfoNote');
  if (note) {
    note.innerHTML = '✅ נתוני מערכת סטודיו <strong>דמו אנונימיים</strong> - ללא חיבור למערכות לקוח | ' + total + ' מנויים פעילים';
    note.style.cssText = 'background:var(--success-light);color:var(--success);border-radius:10px;padding:11px 14px;font-size:12px;font-weight:500;display:flex;align-items:center;gap:8px;margin-bottom:16px;';
  }
  const arboxBadge = document.getElementById('arboxBadge');
  const arboxDot = document.getElementById('arboxDot');
  const arboxTxt = document.getElementById('arboxStatus');
  if (arboxBadge) {
    arboxBadge.innerHTML = '<span class="pulse"></span> סטודיו דמו ✓';
    arboxBadge.style.background = 'rgba(74,222,128,0.22)';
  }
  if (arboxDot) arboxDot.className = 'fr-dot sample';
  if (arboxTxt) arboxTxt.textContent = 'מערכת סטודיו - נתוני דמו אנונימיים';
}`;

html = replaceRequired(
  html,
  'async function loadStudioData() {',
  `${demoStudioFunction}

async function loadStudioData() {
  if (DEMO_MODE) {
    loadDemoStudioData();
    return;
  }`,
  'demo studio loader'
);

html = replaceRequired(
  html,
  'async function arboxProxy(path) {',
  `async function arboxProxy(path) {
  if (DEMO_MODE) throw new Error('Demo mode does not connect to studio systems');`,
  'studio API guard'
);

html = html
  .replaceAll("{ source: 'הפניות פנימיות', type: 'referral', leads: 4, spend: 0, conv: 1 }", "{ source: 'הפניות פנימיות', type: 'referral', leads: 14, spend: 0, conv: 4 }")
  .replaceAll("{ source: 'קמפיין פייסבוק - שיינקין', type: 'paid',     leads: 22, spend: 5800, conv: 1 }", "{ source: 'קמפיין דיגיטלי - אזור מרכז', type: 'paid', leads: 42, spend: 9200, conv: 8 }")
  .replaceAll("{ source: 'פייסבוק / אינסטגרם אורגני', type: 'organic', leads:  5, spend:    0, conv: 0 }", "{ source: 'סושיאל אורגני', type: 'organic', leads: 18, spend: 0, conv: 3 }")
  .replaceAll('38,500', '64,200')
  .replaceAll('50,000', '80,000')
  .replaceAll('77% מהיעד החודשי - פיגור של 11,500₪', '80% מהיעד החודשי - פיגור של 15,800₪')
  .replaceAll('6,400', '9,100')
  .replaceAll('8,000', '12,000')
  .replaceAll('80% ניצול | 1,600₪ נותרו לחודש', '76% ניצול | 2,900₪ נותרו לחודש')
  .replaceAll("data: [9, 11, 14, 4]", "data: [12, 16, 21, 18]")
  .replaceAll("data: [15, 15, 15, 15]", "data: [18, 18, 18, 18]")
  .replaceAll("data: [2800, 3100, 3500, 3000]", "data: [4200, 4600, 5200, 4900]")
  .replaceAll('12.4K', '18.7K')
  .replaceAll('8.2%', '9.4%')
  .replaceAll('1,020', '2,340')
  .replaceAll('id="metaEngaged">45', 'id="metaEngaged">86');

html = replaceRequired(
  html,
  'async function metaPost(action, params = {}) {',
  `async function metaPost(action, params = {}) {
  if (DEMO_MODE) throw new Error('Demo mode does not connect to marketing systems');`,
  'marketing API guard'
);

html = replaceRequired(
  html,
  'async function loadMetaData() {',
  `async function loadMetaData() {
  if (DEMO_MODE) {
    renderCampaignTable(DEMO_CAMPAIGN_ROWS);
    const note = document.getElementById('marketingInfoNote');
    if (note) {
      note.innerHTML = '✅ נתוני שיווק <strong>דמו אנונימיים</strong> - קמפיינים, תקציב והמרות סינתטיים';
      note.style.cssText = 'background:var(--success-light);color:var(--success);border-radius:10px;padding:11px 14px;font-size:12px;font-weight:500;display:flex;align-items:center;gap:8px;margin-bottom:16px;';
    }
    const dot = document.getElementById('metaDot');
    const status = document.getElementById('metaStatus');
    const srcNote = document.getElementById('metaSourceNote');
    if (dot) dot.className = 'fr-dot sample';
    if (status) status.textContent = 'שיווק - נתוני דמו';
    if (srcNote) srcNote.textContent = 'נתוני דמו אנונימיים';
    return;
  }`,
  'demo marketing loader'
);

html = replaceRequired(
  html,
  'function openReportTileInNewTab(tile) {',
  `function openReportTileInNewTab(tile) {
  if (DEMO_MODE) return;`,
  'tile click guard'
);

html = html
  .replaceAll("ENDPOINT: '/.netlify/functions/agent',", "ENDPOINT: '',")
  .replaceAll('enabled: true,', 'enabled: false,')
  .replaceAll("const AI_CHAT_ENABLED_KEY = 'ai_chat_enabled';", "const AI_CHAT_ENABLED_KEY = 'ai_chat_enabled_demo';");

html = replaceRequired(
  html,
  'function getSavedAiChatEnabled() {',
  `function getSavedAiChatEnabled() {
  if (DEMO_MODE) return false;`,
  'AI chat saved state guard'
);

html = replaceRequired(
  html,
  'function initAiChat() {',
  `function initAiChat() {
  if (DEMO_MODE) {
    setAiChatEnabled(false, false);
    const master = document.querySelector('.ai-chat-master');
    if (master) master.hidden = true;
    return;
  }`,
  'AI chat init guard'
);

html = html
  .replaceAll('🔄 רענן נתונים', 'רענן דמו')
  .replaceAll('⚙️ הגדרת שליחת מיילים (EmailJS)', 'הגדרת שליחת מיילים (EmailJS) - דמו')
  .replaceAll('שלום! אפשר לשאול אותי שאלות על הלידים, המכירות והמנויים בסטודיו - אני עונה על בסיס נתוני דמו בלבד.', 'צאט ה-AI מושבת בגרסת הדמו כדי למנוע גישה לנתוני לקוח חיים.');

fs.writeFileSync(rootOutPath, html, 'utf8');
fs.writeFileSync(publicOutPath, html, 'utf8');

console.log(`Created ${path.relative(root, rootOutPath)}`);
console.log(`Created ${path.relative(root, publicOutPath)}`);
