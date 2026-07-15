import {
  PRIORITIES,
  STATUSES,
  adminConfigured,
  checkPassword,
  clean,
  customerKey,
  issueToken,
  json,
  listJSON,
  makeCustomerId,
  parseBody,
  requestKey,
  store,
  validateEmail,
  verifyToken,
} from '../lib/cr-store.mjs';

const UPDATE_FIELDS = new Set(['status', 'priority', 'assignee', 'targetDate', 'resolution']);

async function listDashboardData() {
  const [requests, customers] = await Promise.all([listJSON('requests/'), listJSON('customers/')]);
  requests.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  customers.sort((a, b) => a.name.localeCompare(b.name, 'he'));
  return { requests, customers };
}

async function updateRequest(payload) {
  const id = clean(payload.id, 40);
  const db = store();
  const key = requestKey(id);
  const record = await db.get(key, { type: 'json', consistency: 'strong' });
  if (!record) return json(404, { error: 'NOT_FOUND' });

  const now = new Date().toISOString();
  const changes = [];
  for (const field of UPDATE_FIELDS) {
    if (!(field in payload)) continue;
    const max = field === 'resolution' ? 3000 : 160;
    const value = clean(payload[field], max);
    if (field === 'status' && !STATUSES.has(value)) continue;
    if (field === 'priority' && !PRIORITIES.has(value)) continue;
    if (record[field] !== value) {
      changes.push({ field, from: record[field] || '', to: value });
      record[field] = value;
    }
  }

  const note = clean(payload.note, 3000);
  if (note) {
    record.notes = Array.isArray(record.notes) ? record.notes : [];
    record.notes.push({ at: now, author: clean(payload.author, 100) || 'מנהל', text: note });
  }
  if (!changes.length && !note) return json(400, { error: 'NO_CHANGES' });

  record.updatedAt = now;
  record.history = Array.isArray(record.history) ? record.history : [];
  record.history.push({ at: now, actor: clean(payload.author, 100) || 'מנהל', action: 'admin_update', changes, note: note ? 'note_added' : '' });
  await db.setJSON(key, record);
  return json(200, { ok: true, request: record });
}

async function addCustomer(payload) {
  const name = clean(payload.name, 100);
  if (name.length < 2) return json(400, { error: 'INVALID_CUSTOMER' });
  const id = makeCustomerId(name);
  const now = new Date().toISOString();
  const customer = {
    id,
    name,
    dashboardId: clean(payload.dashboardId, 80),
    contactEmail: validateEmail(payload.contactEmail) ? clean(payload.contactEmail, 160).toLowerCase() : '',
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await store().setJSON(customerKey(id), customer, { onlyIfNew: true });
  return json(201, { ok: true, customer });
}

async function toggleCustomer(payload) {
  const id = clean(payload.id, 80);
  const db = store();
  const key = customerKey(id);
  const customer = await db.get(key, { type: 'json', consistency: 'strong' });
  if (!customer) return json(404, { error: 'NOT_FOUND' });
  customer.active = payload.active === true;
  customer.updatedAt = new Date().toISOString();
  await db.setJSON(key, customer);
  return json(200, { ok: true, customer });
}

export default async (request) => {
  try {
    if (request.method === 'OPTIONS') {
      return json(204, {}, { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
    }
    if (request.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });

    const payload = await parseBody(request);
    const action = clean(payload.action, 40);

    if (action === 'login') {
      if (!adminConfigured()) return json(503, { error: 'ADMIN_NOT_CONFIGURED' });
      if (!checkPassword(payload.password)) return json(401, { error: 'INVALID_CREDENTIALS' });
      return json(200, { ok: true, token: issueToken(), expiresIn: 28800 });
    }

    if (!verifyToken(request)) return json(401, { error: 'UNAUTHORIZED' });

    if (action === 'list') return json(200, await listDashboardData());
    if (action === 'update') return updateRequest(payload);
    if (action === 'add_customer') return addCustomer(payload);
    if (action === 'toggle_customer') return toggleCustomer(payload);
    return json(400, { error: 'UNKNOWN_ACTION' });
  } catch (error) {
    console.error('[cr-admin] request failed:', error.message);
    if (error.message === 'PAYLOAD_TOO_LARGE') return json(413, { error: 'PAYLOAD_TOO_LARGE' });
    if (error instanceof SyntaxError) return json(400, { error: 'INVALID_JSON' });
    return json(500, { error: 'STORE_ERROR' });
  }
}
