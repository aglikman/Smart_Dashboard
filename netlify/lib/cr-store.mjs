import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'smart-dashboard-cr';

export const REQUEST_TYPES = new Set(['bug', 'change']);
export const PRIORITIES = new Set(['critical', 'high', 'medium', 'low']);
export const STATUSES = new Set(['new', 'triage', 'in_progress', 'waiting_customer', 'scheduled', 'resolved', 'closed']);

export function store() {
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

export function json(statusCode, body, extraHeaders = {}) {
  return new Response(statusCode === 204 ? null : JSON.stringify(body), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

export async function parseBody(request) {
  const declaredSize = Number(request.headers.get('content-length') || 0);
  if (declaredSize > 200_000) throw new Error('PAYLOAD_TOO_LARGE');
  const body = await request.text();
  if (!body) return {};
  if (body.length > 200_000) throw new Error('PAYLOAD_TOO_LARGE');
  return JSON.parse(body);
}

export function clean(value, max = 500) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

export function cleanList(value, allowed = null, maxItems = 20) {
  if (!Array.isArray(value)) return [];
  const values = value.map((item) => clean(item, 80)).filter(Boolean).slice(0, maxItems);
  return allowed ? values.filter((item) => allowed.has(item)) : values;
}

export function makeRequestId() {
  const day = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CR-${day}-${suffix}`;
}

export function makeCustomerId(name) {
  const slug = clean(name, 80)
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 45);
  return `${slug || 'customer'}-${crypto.randomBytes(2).toString('hex')}`;
}

export function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value, 160));
}

export async function listJSON(prefix) {
  const db = store();
  const { blobs } = await db.list({ prefix });
  const rows = await Promise.all(blobs.map((entry) => db.get(entry.key, { type: 'json', consistency: 'strong' })));
  return rows.filter(Boolean);
}

function digest(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function safeEqual(left, right) {
  return crypto.timingSafeEqual(digest(left), digest(right));
}

export function adminConfigured() {
  return Boolean(process.env.CR_ADMIN_PASSWORD && process.env.CR_AUTH_SECRET);
}

export function checkPassword(password) {
  const expected = process.env.CR_ADMIN_PASSWORD || '';
  return expected.length >= 12 && safeEqual(password || '', expected);
}

export function issueToken() {
  const payload = {
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60),
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.CR_AUTH_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyToken(request) {
  if (!adminConfigured()) return false;
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return false;
  const expected = crypto.createHmac('sha256', process.env.CR_AUTH_SECRET).update(encoded).digest('base64url');
  if (!safeEqual(signature, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return payload.role === 'admin' && Number(payload.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function requestKey(id) {
  return `requests/${clean(id, 40)}.json`;
}

export function customerKey(id) {
  return `customers/${clean(id, 80)}.json`;
}
