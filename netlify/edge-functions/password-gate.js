const COOKIE_NAME = 'smartdash_auth';
const LOGIN_PATH = '/smartdash-auth/login';
const LOGOUT_PATH = '/smartdash-auth/logout';
const TOKEN_TTL_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();

function env(name) {
  return Netlify.env.get(name) || '';
}

function html(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders,
    },
  });
}

function redirect(target, headers = {}) {
  return new Response(null, {
    status: 303,
    headers: {
      location: target,
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function parseCookies(header) {
  const cookies = {};
  for (const item of (header || '').split(';')) {
    const index = item.indexOf('=');
    if (index === -1) continue;
    cookies[item.slice(0, index).trim()] = decodeURIComponent(item.slice(index + 1).trim());
  }
  return cookies;
}

function base64Url(bytes) {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function sign(payload) {
  const secret = env('SMART_DASHBOARD_AUTH_SECRET');
  if (!secret) return '';
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return base64Url(new Uint8Array(signature));
}

function constantEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

function normalizePath(pathname) {
  const lower = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return lower.endsWith('.html') ? lower.slice(0, -5) : lower;
}

function requiredLevel(url) {
  const path = normalizePath(url.pathname);
  if (path.startsWith('/.netlify/functions/cr-admin')) return 'admin';
  if (path === '/dashboard_control_panel' || path === '/dashboard_api_explorer' || path === '/dashboard_cr_admin') return 'admin';
  if (path === '/smartdash-auth/login' || path === '/smartdash-auth/logout') return 'public';
  return 'general';
}

function levelAllows(actual, required) {
  if (required === 'public') return true;
  if (required === 'general') return actual === 'general' || actual === 'admin';
  return actual === 'admin';
}

function safeTarget(rawTarget, origin) {
  try {
    const url = new URL(rawTarget || '/', origin);
    if (url.origin !== origin) return '/';
    if (normalizePath(url.pathname) === LOGIN_PATH || normalizePath(url.pathname) === LOGOUT_PATH) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

async function readAuth(request) {
  const token = parseCookies(request.headers.get('cookie'))[COOKIE_NAME];
  if (!token) return null;
  const [level, expires, signature] = token.split('.');
  const expiresAt = Number(expires);
  if (!level || !expiresAt || !signature || expiresAt <= Math.floor(Date.now() / 1000)) return null;
  const expected = await sign(`${level}|${expires}`);
  if (!expected || !constantEqual(signature, expected)) return null;
  return { level, expiresAt };
}

async function makeCookie(level) {
  const expires = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const signature = await sign(`${level}|${expires}`);
  return `${COOKIE_NAME}=${encodeURIComponent(`${level}.${expires}.${signature}`)}; Path=/; Max-Age=${TOKEN_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

function loginPage({ target, required, error = '', missingConfig = false }) {
  const isAdmin = required === 'admin';
  const title = isAdmin ? 'כניסת מנהל לדשבורד' : 'כניסה ל-Smart Dashboard';
  const subtitle = isAdmin
    ? 'נדרשת סיסמת מנהל נפרדת כדי לפתוח את לוח הבקרה או מסך הניהול.'
    : 'הגישה לדשבורד מוגנת בסיסמה.';
  const errorHtml = error ? `<div class="error">${error}</div>` : '';
  const configHtml = missingConfig ? '<div class="error">הגנת הסיסמה לא הוגדרה בסביבת השרת.</div>' : '';
  return html(`<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${title}</title>
  <style>
    :root { color-scheme: light; --ink:#172033; --muted:#667085; --line:#d8dee9; --purple:#6b5cf5; --purple-dark:#5142d8; --canvas:#f3f5f8; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px; background:var(--canvas); color:var(--ink); font-family: Arial, sans-serif; }
    main { width:min(430px,100%); padding:30px; background:#fff; border:1px solid var(--line); border-radius:8px; box-shadow:0 12px 35px rgba(22,25,42,.09); }
    .mark { width:42px; height:42px; display:grid; place-items:center; border-radius:8px; color:#fff; background:var(--purple); font-weight:800; margin-bottom:16px; }
    h1 { margin:0 0 6px; font-size:24px; }
    p { margin:0 0 22px; color:var(--muted); font-size:13px; line-height:1.6; }
    label { display:block; margin-bottom:6px; color:#344054; font-size:12px; font-weight:700; }
    input { width:100%; min-height:42px; padding:9px 10px; border:1px solid #cbd2de; border-radius:6px; outline:0; font:inherit; direction:ltr; }
    input:focus { border-color:var(--purple); box-shadow:0 0 0 3px rgba(107,92,245,.16); }
    button { width:100%; min-height:42px; margin-top:14px; border:0; border-radius:6px; color:#fff; background:var(--purple); font-weight:700; cursor:pointer; }
    button:hover { background:var(--purple-dark); }
    .error { margin-top:12px; padding:10px 12px; border-radius:6px; background:#ffebe9; color:#b42318; font-size:12px; }
  </style>
</head>
<body>
  <main>
    <div class="mark">SD</div>
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <form method="post" action="${LOGIN_PATH}">
      <input type="hidden" name="target" value="${target.replaceAll('"', '&quot;')}">
      <label for="password">סיסמה</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
      <button type="submit">כניסה</button>
    </form>
    ${errorHtml}
    ${configHtml}
  </main>
</body>
</html>`, error ? 401 : 200);
}

export default async (request, context) => {
  const url = new URL(request.url);
  const required = requiredLevel(url);

  if (required === 'public' && normalizePath(url.pathname) === LOGOUT_PATH) {
    return redirect(LOGIN_PATH, { 'set-cookie': `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
  }

  if (required === 'public' && normalizePath(url.pathname) === LOGIN_PATH && request.method === 'POST') {
    const form = await request.formData();
    const target = safeTarget(String(form.get('target') || '/'), url.origin);
    const targetRequired = requiredLevel(new URL(target, url.origin));
    const password = String(form.get('password') || '');
    const generalPassword = env('SMART_DASHBOARD_ACCESS_PASSWORD');
    const adminPassword = env('SMART_DASHBOARD_ADMIN_PASSWORD');
    const missingConfig = !generalPassword || !adminPassword || !env('SMART_DASHBOARD_AUTH_SECRET');

    let level = '';
    if (adminPassword && password === adminPassword) level = 'admin';
    else if (generalPassword && password === generalPassword) level = 'general';

    if (missingConfig || !levelAllows(level, targetRequired)) {
      return loginPage({
        target,
        required: targetRequired,
        error: missingConfig ? '' : 'הסיסמה אינה נכונה למסך הזה.',
        missingConfig,
      });
    }

    return redirect(target, { 'set-cookie': await makeCookie(level) });
  }

  if (required === 'public') {
    const target = safeTarget(url.searchParams.get('target') || '/', url.origin);
    const targetRequired = requiredLevel(new URL(target, url.origin));
    return loginPage({ target, required: targetRequired });
  }

  const auth = await readAuth(request);
  if (auth && levelAllows(auth.level, required)) return context.next();

  const target = safeTarget(request.url, url.origin);
  return loginPage({ target, required });
};
