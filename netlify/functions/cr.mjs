import {
  PRIORITIES,
  REQUEST_TYPES,
  clean,
  cleanList,
  customerKey,
  json,
  listJSON,
  makeCustomerId,
  makeRequestId,
  parseBody,
  requestKey,
  store,
  validateEmail,
} from '../lib/cr-store.mjs';

const SYSTEMS = new Set(['dashboard', 'scalla', 'arbox', 'meta', 'email', 'other']);
const AREAS = new Set(['leads', 'studio', 'marketing', 'alerts', 'reports', 'access', 'other']);
const CATEGORIES = new Set(['data', 'integration', 'calculation', 'display', 'performance', 'permissions', 'feature', 'other']);

async function getCustomers() {
  const customers = await listJSON('customers/');
  const active = customers.filter((customer) => customer.active !== false).sort((a, b) => a.name.localeCompare(b.name, 'he'));
  if (active.length) return active;
  return [{ id: 'giliguli', name: 'GiliGuli', dashboardId: 'DB-GILIGULI', active: true }];
}

function normalizeRequest(payload) {
  const now = new Date().toISOString();
  const type = clean(payload.type, 20);
  const priority = clean(payload.priority, 20);
  const customerName = clean(payload.customerName, 100);
  const title = clean(payload.title, 160);
  const description = clean(payload.description, 5000);
  const contactName = clean(payload.contactName, 120);
  const contactEmail = clean(payload.contactEmail, 160).toLowerCase();

  const errors = [];
  if (!REQUEST_TYPES.has(type)) errors.push('type');
  if (!PRIORITIES.has(priority)) errors.push('priority');
  if (customerName.length < 2) errors.push('customerName');
  if (title.length < 5) errors.push('title');
  if (description.length < 15) errors.push('description');
  if (contactName.length < 2) errors.push('contactName');
  if (!validateEmail(contactEmail)) errors.push('contactEmail');
  if (!payload.confirmed) errors.push('confirmed');
  if (clean(payload.website, 120)) errors.push('spam');

  const id = makeRequestId();
  return {
    errors,
    record: {
      id,
      type,
      customerId: clean(payload.customerId, 80) || makeCustomerId(customerName),
      customerName,
      dashboardId: clean(payload.dashboardId, 80),
      contact: {
        name: contactName,
        email: contactEmail,
        phone: clean(payload.contactPhone, 40),
      },
      title,
      category: CATEGORIES.has(clean(payload.category, 30)) ? clean(payload.category, 30) : 'other',
      priority,
      area: AREAS.has(clean(payload.area, 30)) ? clean(payload.area, 30) : 'other',
      systems: cleanList(payload.systems, SYSTEMS, 8),
      description,
      businessReason: clean(payload.businessReason, 3000),
      expectedBehavior: clean(payload.expectedBehavior, 3000),
      actualBehavior: clean(payload.actualBehavior, 3000),
      reproductionSteps: clean(payload.reproductionSteps, 4000),
      frequency: clean(payload.frequency, 50),
      businessImpact: clean(payload.businessImpact, 2000),
      affectedUsers: clean(payload.affectedUsers, 120),
      environment: clean(payload.environment, 500),
      evidenceUrl: clean(payload.evidenceUrl, 1000),
      firstObservedAt: clean(payload.firstObservedAt, 20),
      desiredDate: clean(payload.desiredDate, 20),
      status: 'new',
      assignee: '',
      targetDate: '',
      resolution: '',
      createdAt: now,
      updatedAt: now,
      source: 'customer_form',
      history: [{ at: now, actor: contactName, action: 'request_created', note: '' }],
      notes: [],
    },
  };
}

export default async (request) => {
  try {
    if (request.method === 'OPTIONS') {
      return json(204, {}, { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    }

    if (request.method === 'GET') {
      return json(200, { customers: await getCustomers() });
    }

    if (request.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });

    const payload = await parseBody(request);
    const { errors, record } = normalizeRequest(payload);
    if (errors.length) return json(400, { error: 'VALIDATION_ERROR', fields: errors });

    const db = store();
    const result = await db.setJSON(requestKey(record.id), record, { onlyIfNew: true });
    if (!result.modified) return json(409, { error: 'ID_CONFLICT' });

    return json(201, {
      ok: true,
      request: {
        id: record.id,
        status: record.status,
        createdAt: record.createdAt,
      },
    });
  } catch (error) {
    console.error('[cr] request failed:', error.message);
    if (error.message === 'PAYLOAD_TOO_LARGE') return json(413, { error: 'PAYLOAD_TOO_LARGE' });
    if (error instanceof SyntaxError) return json(400, { error: 'INVALID_JSON' });
    return json(500, { error: 'STORE_ERROR' });
  }
}
