/**
 * Scalla CRM API Proxy + Dashboard Server (zero dependencies)
 *
 * Serves the dashboard HTML and proxies API calls to Scalla CRM.
 * Preserves cookies across requests (Scalla uses server-side sessions).
 * Tracks basic API monitoring: request counts, latency, error rates,
 * broken down by Scalla operation, plus a rolling log file.
 *
 * Usage:  node scalla_proxy.js
 * Then open: http://localhost:3001
 * Monitoring: http://localhost:3001/stats
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL, pathToFileURL } = require('url');

function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (!process.env[key]) process.env[key] = valueParts.join('=');
  }
}

loadLocalEnv();

const agentHandler = require('./netlify/functions/agent.js').handler;
const metaHandler = require('./netlify/functions/meta.js').handler;
const localNetlifyHandlers = new Map();

const PORT = 3001;
const TARGET = 'https://api.scallacrm.co.il/scallaapi/api';
const ARBOX_BASE = 'https://arboxserver.arboxapp.com/api/public/v3';
const STATIC_DIR = __dirname;
const LOG_FILE = path.join(__dirname, 'proxy.log');

// Cookie jar: persists cookies across Scalla API calls
let cookieJar = '';

// ═══════════════════════════════════════════════════════════════
// API MONITORING
// ═══════════════════════════════════════════════════════════════
const RECENT_LIMIT = 50;
const ERROR_RATE_WARN_THRESHOLD = 0.3; // console warning if >30% of last 10 calls failed

const stats = {
  startedAt: new Date().toISOString(),
  totalRequests: 0,
  successCount: 0,
  errorCount: 0,
  totalLatencyMs: 0,
  lastRequestAt: null,
  lastSuccessAt: null,
  lastError: null,     // { message, at, operation, statusCode }
  byOperation: {},      // operation -> { count, errors, totalLatencyMs, lastAt }
  recent: [],           // ring buffer of last N calls
};

function extractOperation(body) {
  try {
    const params = new URLSearchParams(body);
    return params.get('_operation') || 'unknown';
  } catch {
    return 'unknown';
  }
}

function recordApiCall({ operation, statusCode, latencyMs, error }) {
  const now = new Date().toISOString();
  const isError = !!error || (statusCode && statusCode >= 400);

  stats.totalRequests++;
  stats.totalLatencyMs += latencyMs;
  stats.lastRequestAt = now;

  if (!stats.byOperation[operation]) {
    stats.byOperation[operation] = { count: 0, errors: 0, totalLatencyMs: 0, lastAt: null };
  }
  const opStats = stats.byOperation[operation];
  opStats.count++;
  opStats.totalLatencyMs += latencyMs;
  opStats.lastAt = now;

  if (isError) {
    stats.errorCount++;
    opStats.errors++;
    stats.lastError = { message: error ? error.message : `HTTP ${statusCode}`, at: now, operation, statusCode: statusCode || null };
  } else {
    stats.successCount++;
    stats.lastSuccessAt = now;
  }

  const entry = { at: now, operation, statusCode: statusCode || null, latencyMs, error: error ? error.message : null };
  stats.recent.push(entry);
  if (stats.recent.length > RECENT_LIMIT) stats.recent.shift();

  // Best-effort append to log file - never blocks or crashes the server on write failure
  fs.appendFile(LOG_FILE, JSON.stringify(entry) + '\n', () => {});

  // Warn in console if recent calls are failing at a high rate
  const recentSample = stats.recent.slice(-10);
  const recentErrors = recentSample.filter(r => r.error || (r.statusCode && r.statusCode >= 400)).length;
  if (recentSample.length >= 5 && recentErrors / recentSample.length > ERROR_RATE_WARN_THRESHOLD) {
    console.warn(`⚠ [monitoring] High error rate: ${recentErrors}/${recentSample.length} of last calls failed`);
  }
}

function getStatsSummary() {
  const uptimeMs = Date.now() - new Date(stats.startedAt).getTime();
  const avgLatency = stats.totalRequests ? Math.round(stats.totalLatencyMs / stats.totalRequests) : 0;

  const byOperation = {};
  for (const [op, s] of Object.entries(stats.byOperation)) {
    byOperation[op] = {
      count: s.count,
      errors: s.errors,
      errorRatePct: s.count ? +((s.errors / s.count) * 100).toFixed(1) : 0,
      avgLatencyMs: s.count ? Math.round(s.totalLatencyMs / s.count) : 0,
      lastAt: s.lastAt,
    };
  }

  return {
    status: stats.totalRequests > 0 && stats.successCount === 0 ? 'down' : 'ok',
    startedAt: stats.startedAt,
    uptimeSeconds: Math.round(uptimeMs / 1000),
    totalRequests: stats.totalRequests,
    successCount: stats.successCount,
    errorCount: stats.errorCount,
    errorRatePct: stats.totalRequests ? +((stats.errorCount / stats.totalRequests) * 100).toFixed(1) : 0,
    avgLatencyMs: avgLatency,
    lastRequestAt: stats.lastRequestAt,
    lastSuccessAt: stats.lastSuccessAt,
    lastError: stats.lastError,
    cookiesActive: !!cookieJar,
    byOperation,
    recent: stats.recent.slice(-20).reverse(),
  };
}
// ═══════════════════════════════════════════════════════════════

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function scallaRequest(body) {
  return new Promise((resolve, reject) => {
    const targetUrl = new URL(TARGET);
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    };
    if (cookieJar) {
      headers['Cookie'] = cookieJar;
    }

    const options = {
      hostname: targetUrl.hostname,
      path: targetUrl.pathname,
      method: 'POST',
      headers,
    };

    const proxyReq = https.request(options, (proxyRes) => {
      // Capture Set-Cookie headers
      const setCookies = proxyRes.headers['set-cookie'];
      if (setCookies) {
        // Merge cookies into jar
        const newCookies = setCookies.map(c => c.split(';')[0]);
        const existing = cookieJar ? cookieJar.split('; ') : [];
        const merged = {};
        existing.forEach(c => { const [k] = c.split('='); if (k) merged[k] = c; });
        newCookies.forEach(c => { const [k] = c.split('='); if (k) merged[k] = c; });
        cookieJar = Object.values(merged).join('; ');
        console.log('[cookies]', cookieJar.substring(0, 80) + '...');
      }

      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => resolve({ statusCode: proxyRes.statusCode, body: data }));
    });

    proxyReq.on('error', reject);
    proxyReq.write(body);
    proxyReq.end();
  });
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function injectScallaCredentials(body) {
  const params = new URLSearchParams(body);
  if (params.get('_operation') === 'loginAndFetchModules') {
    if (!params.get('username')) params.set('username', requireEnv('SCALLA_USER'));
    if (!params.get('password')) params.set('password', requireEnv('SCALLA_PASS'));
  }
  return params.toString();
}

function arboxRequest(apiPath) {
  return new Promise((resolve, reject) => {
    if (!apiPath || typeof apiPath !== 'string' || !apiPath.startsWith('/')) {
      reject(new Error('Invalid Arbox path'));
      return;
    }

    const targetUrl = new URL(ARBOX_BASE + apiPath);
    const options = {
      hostname: targetUrl.hostname,
      path: targetUrl.pathname + targetUrl.search,
      method: 'GET',
      headers: {
        apikey: requireEnv('ARBOX_KEY'),
        Accept: 'application/json',
      },
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => resolve({ statusCode: proxyRes.statusCode, body: data }));
    });

    proxyReq.on('error', reject);
    proxyReq.end();
  });
}

async function loadLocalNetlifyHandler(relativePath) {
  if (!localNetlifyHandlers.has(relativePath)) {
    const moduleUrl = pathToFileURL(path.join(__dirname, relativePath)).href;
    localNetlifyHandlers.set(relativePath, import(moduleUrl).then(mod => mod.default));
  }
  return localNetlifyHandlers.get(relativePath);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 250000) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function runFetchStyleFunction(req, res, relativePath, label) {
  try {
    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readRequestBody(req);
    const handler = await loadLocalNetlifyHandler(relativePath);
    const requestHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      requestHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value);
    }
    const request = new Request(`http://localhost:${PORT}${req.url}`, {
      method: req.method,
      headers: requestHeaders,
      body,
    });
    const response = await handler(request);
    const headers = {};
    response.headers.forEach((value, key) => { headers[key] = value; });
    res.writeHead(response.status, headers);
    res.end(await response.text());
  } catch (err) {
    const status = err.message === 'PAYLOAD_TOO_LARGE' ? 413 : 500;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Local ${label} adapter error`, detail: err.message }));
  }
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      cookies: !!cookieJar,
      config: {
        scalla: !!(process.env.SCALLA_USER && process.env.SCALLA_PASS),
        arbox: !!process.env.ARBOX_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        meta: !!(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID),
      },
      uptimeSeconds: Math.round((Date.now() - new Date(stats.startedAt).getTime()) / 1000),
    }));
    return;
  }

  // Monitoring: full stats snapshot
  if (req.url === '/stats' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getStatsSummary(), null, 2));
    return;
  }

  // Monitoring: reset counters (dev convenience - does not touch the Scalla session/cookies)
  if (req.url === '/stats/reset' && req.method === 'POST') {
    stats.totalRequests = 0;
    stats.successCount = 0;
    stats.errorCount = 0;
    stats.totalLatencyMs = 0;
    stats.lastRequestAt = null;
    stats.lastSuccessAt = null;
    stats.lastError = null;
    stats.byOperation = {};
    stats.recent = [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'reset' }));
    return;
  }

  // AI Insights Agent (local dev adapter - mimics Netlify's serverless event/response shape
  // so agent.js runs unmodified without netlify-cli or Netlify auth)
  if (req.url === '/.netlify/functions/agent' && req.method === 'POST') {
    let agentBody = '';
    req.on('data', chunk => agentBody += chunk);
    req.on('end', async () => {
      try {
        const result = await agentHandler({ httpMethod: 'POST', headers: req.headers, body: agentBody });
        res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
        res.end(result.body);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Local agent adapter error', detail: err.message }));
      }
    });
    return;
  }

  // Meta Graph API local adapter. The dashboard calls the same Netlify-style
  // function path locally, so Meta works when served through this proxy.
  if (req.url === '/.netlify/functions/meta' && req.method === 'POST') {
    let metaBody = '';
    req.on('data', chunk => metaBody += chunk);
    req.on('end', async () => {
      try {
        const result = await metaHandler({ httpMethod: 'POST', headers: req.headers, body: metaBody });
        res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
        res.end(result.body);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Local Meta adapter error', detail: err.message }));
      }
    });
    return;
  }

  if (req.url.startsWith('/.netlify/functions/cr-admin')) {
    await runFetchStyleFunction(req, res, 'netlify/functions/cr-admin.mjs', 'CR admin');
    return;
  }

  if (req.url.startsWith('/.netlify/functions/cr')) {
    await runFetchStyleFunction(req, res, 'netlify/functions/cr.mjs', 'CR');
    return;
  }

  // Scalla API proxy
  if (req.url === '/api/scalla' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const operation = extractOperation(body);
      const startedAt = Date.now();
      try {
        body = injectScallaCredentials(body);
        // If this is a login, clear old cookies
        if (body.includes('loginAndFetchModules')) {
          cookieJar = '';
          console.log('[login] Clearing cookie jar');
        }
        const result = await scallaRequest(body);
        const latencyMs = Date.now() - startedAt;
        res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
        res.end(result.body);
        console.log('[api]', operation, '->', result.statusCode, `(${latencyMs}ms)`);
        recordApiCall({ operation, statusCode: result.statusCode, latencyMs });
      } catch (err) {
        const latencyMs = Date.now() - startedAt;
        console.error('[proxy error]', operation, err.message, `(${latencyMs}ms)`);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy error', detail: err.message }));
        recordApiCall({ operation, statusCode: 502, latencyMs, error: err });
      }
    });
    return;
  }

  // Arbox API proxy. Keeps the Arbox API key server-side instead of exposing it in dashboard JS.
  if (req.url === '/api/arbox' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const result = await arboxRequest(payload.path);
        res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
        res.end(result.body);
      } catch (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Arbox proxy error', detail: err.message }));
      }
    });
    return;
  }

  // Static file serving
  let filePath = req.url === '/' ? '/giliguli_dashboard.html' : req.url.split('?')[0];
  filePath = path.join(STATIC_DIR, decodeURIComponent(filePath));

  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + req.url);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  Dashboard server running at:');
  console.log('  http://localhost:' + PORT);
  console.log('');
  console.log('  API proxy:  POST http://localhost:' + PORT + '/api/scalla');
  console.log('  Health:     GET  http://localhost:' + PORT + '/health');
  console.log('  Stats:      GET  http://localhost:' + PORT + '/stats');
  console.log('  Log file:   ' + LOG_FILE);
  console.log('  AI Agent:   POST http://localhost:' + PORT + '/.netlify/functions/agent');
  console.log('  Meta:       POST http://localhost:' + PORT + '/.netlify/functions/meta');
  console.log('  CR Admin:   POST http://localhost:' + PORT + '/.netlify/functions/cr-admin');
  console.log('');
});


