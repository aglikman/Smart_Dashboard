#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const liveMode = args.has('--live');
const results = [];

function record(status, name, detail = '') {
  results.push({ status, name, detail });
  const suffix = detail ? ` - ${detail}` : '';
  console.log(`[${status}] ${name}${suffix}`);
}

function pass(name, detail = '') { record('PASS', name, detail); }
function warn(name, detail = '') { record('WARN', name, detail); }
function fail(name, detail = '') { record('FAIL', name, detail); }

function runCheck(name, fn) {
  try {
    fn();
  } catch (error) {
    fail(name, error instanceof Error ? error.message : String(error));
  }
}

function requireFile(path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) throw new Error(`${path} is missing`);
  return fullPath;
}

function readText(path) { return readFileSync(requireFile(path), 'utf8'); }
function readBuffer(path) { return readFileSync(requireFile(path)); }
function hash(path) { return createHash('sha256').update(readBuffer(path)).digest('hex'); }

function lineNumberForOffset(text, offset) {
  let line = 1;
  for (let i = 0; i < offset; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

const ignoredDirs = new Set(['.git', '.netlify', '_local_archive', 'logs', 'node_modules', 'outputs', 'tmp']);
const sourceExtensions = new Set(['.cmd', '.css', '.example', '.html', '.js', '.json', '.md', '.mjs', '.ps1', '.toml', '.yaml', '.yml']);

function extensionOf(file) {
  const index = file.lastIndexOf('.');
  return index === -1 ? '' : file.slice(index).toLowerCase();
}

function walkSourceFiles(dir = root) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      files.push(...walkSourceFiles(join(dir, entry.name)));
      continue;
    }
    if (!entry.isFile()) continue;
    const fullPath = join(dir, entry.name);
    const relPath = relative(root, fullPath).replaceAll('\\', '/');
    if (relPath === '.env' || relPath.startsWith('.env.')) continue;
    if (sourceExtensions.has(extensionOf(entry.name))) files.push(relPath);
  }
  return files;
}

function parseEnvFile(path) {
  if (!existsSync(join(root, path))) return [];
  return readText(path)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const equalsIndex = line.indexOf('=');
      if (equalsIndex === -1) return null;
      const key = line.slice(0, equalsIndex).trim();
      let value = line.slice(equalsIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      return { key, value };
    })
    .filter(Boolean);
}

function looksLikePlaceholder(value) {
  return /^(your_|example|placeholder|changeme|todo|xxx|<.+>)$/i.test(value);
}

runCheck('dashboard deploy copies synchronized', () => {
  const sourceHash = hash('giliguli_dashboard.html');
  const mirrors = ['public/index.html', 'public/giliguli_dashboard.html'];
  const mismatches = mirrors.filter((path) => hash(path) !== sourceHash);
  if (mismatches.length) throw new Error(`not matching giliguli_dashboard.html: ${mismatches.join(', ')}`);
  pass('dashboard deploy copies synchronized', `${mirrors.length} deploy copies match source`);

  if (existsSync(join(root, 'index.html'))) {
    if (hash('index.html') === sourceHash) pass('optional root index mirror', 'index.html matches dashboard source');
    else warn('optional root index mirror', 'index.html differs from giliguli_dashboard.html');
  }
});

runCheck('source text hygiene', () => {
  const files = walkSourceFiles();
  const nulFiles = [];
  const conflictFiles = [];
  const placeholderFiles = [];

  for (const file of files) {
    const buffer = readBuffer(file);
    if (buffer.includes(0)) {
      nulFiles.push(file);
      continue;
    }
    const text = buffer.toString('utf8');
    if (/^(<<<<<<<|=======|>>>>>>>) /m.test(text)) conflictFiles.push(file);
    if (file !== 'scripts/run-dashboard-qa.mjs' && /\.(html|js|mjs)$/i.test(file) && /\b(TODO_DEPLOY|FIXME_DEPLOY|REPLACE_ME|YOUR_(?:API|KEY|TOKEN|SECRET|PASSWORD))\b/i.test(text)) {
      placeholderFiles.push(file);
    }
  }

  const issues = [];
  if (nulFiles.length) issues.push(`NUL bytes: ${nulFiles.join(', ')}`);
  if (conflictFiles.length) issues.push(`merge markers: ${conflictFiles.join(', ')}`);
  if (placeholderFiles.length) issues.push(`deploy placeholders: ${placeholderFiles.join(', ')}`);
  if (issues.length) throw new Error(issues.join(' | '));
  pass('source text hygiene', `${files.length} source/config files scanned`);
});

runCheck('javascript syntax', () => {
  const jsFiles = [
    'scalla_proxy.js',
    'netlify/functions/scalla.js',
    'netlify/functions/arbox.js',
    'netlify/functions/meta.js',
    'netlify/functions/agent.js',
    'netlify/functions/cr.mjs',
    'netlify/functions/cr-admin.mjs',
    'netlify/lib/cr-store.mjs',
    'netlify/edge-functions/password-gate.js',
  ];

  for (const file of jsFiles) {
    requireFile(file);
    const result = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) {
      const output = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
      throw new Error(`${file} failed node --check: ${output}`);
    }
  }
  pass('javascript syntax', `${jsFiles.length} files passed node --check`);
});

runCheck('npm check script', () => {
  const result = spawnSync('npm run check', { cwd: root, encoding: 'utf8', shell: true });
  if (result.status !== 0) {
    const output = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    throw new Error(output || 'npm run check failed');
  }
  pass('npm check script', 'npm run check passed');
});

runCheck('deployment configuration', () => {
  const netlifyToml = readText('netlify.toml');
  const packageJson = JSON.parse(readText('package.json'));
  const deployScript = packageJson.scripts?.deploy || '';
  const issues = [];

  if (!/\bpublish\s*=\s*"public"/.test(netlifyToml)) issues.push('netlify.toml publish must be "public"');
  if (!/\bfunctions\s*=\s*"netlify\/functions"/.test(netlifyToml)) issues.push('netlify.toml functions must be "netlify/functions"');
  if (!packageJson.scripts?.['qa:predeploy']) issues.push('package.json must define qa:predeploy');
  if (!deployScript.includes('qa:predeploy')) issues.push('package.json deploy must run qa:predeploy before Netlify deploy');
  if (!deployScript.includes('--dir=public')) issues.push('package.json deploy must deploy --dir=public');
  if (!deployScript.includes('--functions=netlify/functions')) issues.push('package.json deploy must deploy --functions=netlify/functions');
  if (issues.length) throw new Error(issues.join(' | '));
  pass('deployment configuration', 'Netlify and package deploy settings are aligned');
});

runCheck('environment contract', () => {
  const requiredKeys = [
    'SCALLA_USER',
    'SCALLA_PASS',
    'SCALLA_TENANT',
    'ARBOX_KEY',
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_MODEL',
    'META_ACCESS_TOKEN',
    'META_AD_ACCOUNT_ID',
    'META_PAGE_ID',
    'META_PAGE_ACCESS_TOKEN',
    'CR_ADMIN_PASSWORD',
    'CR_AUTH_SECRET',
    'SMART_DASHBOARD_ACCESS_PASSWORD',
    'SMART_DASHBOARD_ADMIN_PASSWORD',
    'SMART_DASHBOARD_AUTH_SECRET',
  ];
  const exampleEntries = parseEnvFile('.env.example');
  const exampleKeys = new Set(exampleEntries.map((entry) => entry.key));
  const missing = requiredKeys.filter((key) => !exampleKeys.has(key));
  if (missing.length) throw new Error(`missing from .env.example: ${missing.join(', ')}`);

  const valuedExampleKeys = exampleEntries.filter((entry) => entry.value && !looksLikePlaceholder(entry.value));
  if (valuedExampleKeys.length) throw new Error(`.env.example must not contain real values: ${valuedExampleKeys.map((entry) => entry.key).join(', ')}`);
  pass('environment contract', `${requiredKeys.length} expected env keys documented without values`);
});

runCheck('credential leak scan', () => {
  const sourceFiles = walkSourceFiles();
  const envEntries = parseEnvFile('.env')
    .filter((entry) => entry.value.length >= 8)
    .filter((entry) => !looksLikePlaceholder(entry.value));
  if (!existsSync(join(root, '.env'))) warn('credential value comparison', '.env not found; exact local secret comparison skipped');

  const leaks = [];
  for (const { key, value } of envEntries) {
    for (const file of sourceFiles) {
      const text = readText(file);
      if (text.includes(value)) leaks.push(`${key} value appears in ${file}`);
    }
  }

  const tokenPatterns = [
    { name: 'Anthropic API key', regex: /sk-ant-[A-Za-z0-9_-]{20,}/g },
    { name: 'Meta access token', regex: /EAAG[A-Za-z0-9]{20,}/g },
    { name: 'private key block', regex: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/g },
    { name: 'JWT-like token', regex: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g },
  ];

  for (const file of sourceFiles) {
    const text = readText(file);
    for (const pattern of tokenPatterns) {
      for (const match of text.matchAll(pattern.regex)) {
        leaks.push(`${pattern.name} pattern appears in ${file}:${lineNumberForOffset(text, match.index || 0)}`);
      }
    }
  }

  if (leaks.length) throw new Error(leaks.join(' | '));
  pass('credential leak scan', `${sourceFiles.length} source/config files scanned without printing secret values`);
});

async function fetchWithTimeout(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

if (liveMode) {
  try {
    const healthResponse = await fetchWithTimeout('http://localhost:3001/health');
    if (!healthResponse.ok) throw new Error(`health returned HTTP ${healthResponse.status}`);
    const healthText = await healthResponse.text();
    if (!/scalla|arbox|anthropic|ok|healthy/i.test(healthText)) {
      throw new Error('health response did not include expected dashboard service fields');
    }
    pass('live proxy health', 'http://localhost:3001/health responded');

    const dashboardResponse = await fetchWithTimeout('http://localhost:3001/');
    if (!dashboardResponse.ok) throw new Error(`dashboard root returned HTTP ${dashboardResponse.status}`);
    const html = await dashboardResponse.text();
    if (!/<html/i.test(html) || !/dashboard|giliguli|GiliGuli|גילי/i.test(html)) {
      throw new Error('dashboard root did not look like the dashboard HTML');
    }
    pass('live dashboard root', 'http://localhost:3001/ returned dashboard HTML');
  } catch (error) {
    fail('live smoke', error instanceof Error ? error.message : String(error));
  }
} else {
  warn('live smoke', 'skipped; run npm run qa:predeploy:live with local proxy running for UI/integration changes');
}

const failures = results.filter((result) => result.status === 'FAIL');
const warnings = results.filter((result) => result.status === 'WARN');
if (failures.length) {
  console.error(`\nDashboard QA FAILED: ${failures.length} blocker(s), ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(`\nDashboard QA PASSED: ${warnings.length} warning(s).`);
