/**
 * AI Insights Agent - Netlify Function
 *
 * Answers free-text Hebrew questions about the Giliguli dashboard by giving
 * Claude live tool-use access to the same Scalla CRM / Arbox endpoints the
 * dashboard itself uses. Zero external dependencies (raw https), matching
 * the style of scalla.js / meta.js in this project.
 *
 * Env vars required (set in Netlify site settings, never hardcoded):
 *   ANTHROPIC_API_KEY   - required. Server-side only, never sent to client.
 *   ANTHROPIC_MODEL      - optional, defaults to 'claude-sonnet-5'.
 *   SCALLA_USER / SCALLA_PASS - required for Scalla tool access.
 *   SCALLA_TENANT - optional fallback; login unique_id is preferred.
 *   ARBOX_KEY - required for Arbox tool access.
 *
 * Request body (JSON): { message: string, history?: Array<{role, content}> }
 * Response body (JSON): { reply: string, toolCalls: Array<{name, input}> }
 */

const https = require('https');

// ── Scalla config (mirrors netlify/functions/scalla.js) ──────────────────
const SCALLA_USER = process.env.SCALLA_USER || '';
const SCALLA_PASS = process.env.SCALLA_PASS || '';
const SCALLA_TENANT_FALLBACK = process.env.SCALLA_TENANT || '';

// ── Arbox config (mirrors giliguli_dashboard.html ARBOX object) ──────────
const ARBOX_BASE = 'https://arboxserver.arboxapp.com/api/public/v3';
const ARBOX_KEY = process.env.ARBOX_KEY || '';

// ── Anthropic config ──────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOOL_ITERATIONS = 6;
// 1024 was too small: this model emits extended-thinking content before each tool call, and by
// the 2nd-3rd tool round (large lead/module-field JSON already in context) that thinking alone
// can exhaust a 1024 budget, cutting the response off (stop_reason: 'max_tokens') before any
// answer text is written. Confirmed via [agent] logs on 2026-07-14.
const MAX_TOKENS = 4096;
const FORCED_SUMMARY_MAX_TOKENS = 2048; // tools disabled here, so far less headroom is needed
const MAX_RECORDS_RETURNED_TO_MODEL = 200; // context/cost guardrail

// ═══════════════════════════════════════════════════════════════════════
// Low-level HTTP helpers
// ═══════════════════════════════════════════════════════════════════════

function httpsJson({ hostname, path, method = 'POST', headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders = { ...headers };
    if (payload) reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    const req = https.request({ hostname, path, method, headers: reqHeaders }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function scallaRequest(bodyParams, cookies) {
  const body = new URLSearchParams(bodyParams).toString();
  return httpsJson({
    hostname: 'api.scallacrm.co.il',
    path: '/scallaapi/api',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body,
  }).then((res) => {
    const setCookies = res.headers['set-cookie'];
    const cookieStr = setCookies ? setCookies.map((c) => c.split(';')[0]).join('; ') : cookies || '';
    return { statusCode: res.statusCode, body: res.body, cookies: cookieStr };
  });
}

function arboxGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(ARBOX_BASE + path);
    https
      .get(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          headers: { apikey: ARBOX_KEY, Accept: 'application/json' },
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              resolve({ statusCode: res.statusCode, json: JSON.parse(data) });
            } catch {
              resolve({ statusCode: res.statusCode, json: { raw: data } });
            }
          });
        }
      )
      .on('error', reject);
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Scalla session (logged in once per request, reused across tool calls)
// ═══════════════════════════════════════════════════════════════════════

async function scallaLogin() {
  const res = await scallaRequest(
    { _operation: 'loginAndFetchModules', username: SCALLA_USER, password: SCALLA_PASS },
    ''
  );
  const data = JSON.parse(res.body);
  if (!data.success || !data.result?.login?.session) {
    throw new Error('Scalla login failed: ' + JSON.stringify(data).slice(0, 300));
  }
  return {
    session: data.result.login.session,
    cookies: res.cookies,
    tenant: data.result.login.unique_id || SCALLA_TENANT_FALLBACK,
  };
}

function makeScallaAuthGetter() {
  let cached = null;
  return async function getScallaAuth() {
    if (!cached) cached = await scallaLogin();
    return cached;
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Tool definitions (given to Claude) + confirmed-working modules/reports
// ═══════════════════════════════════════════════════════════════════════

const KEY_MODULES = [
  'Leads', 'Contacts', 'Accounts', 'Potentials', 'Invoice', 'Quotes',
  'Products', 'HelpDesk', 'Calendar', 'Registrations',
];

const ARBOX_REPORTS = {
  activeMemberships: '/reports/activeMembershipsReport',
  schedule: '/schedule',
  lateCancellation: '/reports/lateCancellationReport',
  bookings: '/reports/bookingsReport',
  receipts: '/reports/receiptsReport',
};

const TOOLS = [
  {
    name: 'arbox_report',
    description:
      'PREFERRED / PRIMARY DATA SOURCE. Fetch a live report from Arbox (the studio/membership system) - ' +
      'use this before any scalla_* tool whenever the question is about memberships, schedule, bookings, ' +
      'late cancellations, or receipts/payments. Arbox is far more complete and reliable than Scalla for ' +
      'this data. Only these five report types are confirmed to work in production - do not invent others.',
    input_schema: {
      type: 'object',
      properties: {
        report: { type: 'string', enum: Object.keys(ARBOX_REPORTS) },
        from_date: { type: 'string', description: 'YYYY-MM-DD' },
        to_date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['report', 'from_date', 'to_date'],
    },
  },
  {
    name: 'scalla_list_records',
    description:
      'Secondary source - use only for lead/sales-pipeline data that has no Arbox equivalent (lead status, ' +
      'source, owner, lost reasons). List all records from a Scalla CRM module (e.g. Leads, ' +
      'Potentials/Courses). Returns raw records; ' +
      `results are capped at ${MAX_RECORDS_RETURNED_TO_MODEL} records with a total count. Scalla data has ` +
      'known gaps/quality issues - treat results as a sample, not a complete picture. Use ' +
      "scalla_get_module_fields first if you don't already know a field's meaning.",
    input_schema: {
      type: 'object',
      properties: {
        module: { type: 'string', enum: KEY_MODULES, description: 'Scalla module name (case-sensitive).' },
      },
      required: ['module'],
    },
  },
  {
    name: 'scalla_search_records',
    description:
      'Secondary source (lead/sales-pipeline only - see arbox_report for everything else). Search a Scalla ' +
      'CRM module by a single field/value condition (confirmed API capability - only one field at a time). ' +
      'Known issue: this has returned records whose actual field value differs from the requested ' +
      'searchValue - treat matches as approximate, not exact. For anything requiring multiple conditions, ' +
      'call this tool more than once and intersect results yourself, or fall back to scalla_list_records ' +
      'and filter client-side.',
    input_schema: {
      type: 'object',
      properties: {
        module: { type: 'string', enum: KEY_MODULES },
        searchField: { type: 'string', description: 'Field name to filter on, e.g. leadstatus, cf_1267.' },
        searchValue: { type: 'string', description: 'Value to match.' },
      },
      required: ['module', 'searchField', 'searchValue'],
    },
  },
  {
    name: 'scalla_get_module_fields',
    description:
      "Schema discovery for the secondary (Scalla) source: returns a module's field names, types, labels " +
      'and picklist values. Use this before querying a module whose fields are not already described in ' +
      'your system prompt.',
    input_schema: {
      type: 'object',
      properties: { module: { type: 'string' } },
      required: ['module'],
    },
  },
  {
    name: 'scalla_get_dashboard',
    description: 'Secondary source. Returns the configured Scalla dashboard widgets and reports (what the client already tracks in Scalla itself).',
    input_schema: { type: 'object', properties: {} },
  },
];

function capRecords(parsed) {
  return capArrayResults(parsed, ['result']);
}

// Generic record-count capper, checked at each of `topLevelKeys` in order (Scalla nests under
// `result`, Arbox nests under `data`). Caps by ARRAY LENGTH before the caller stringifies the
// result - critical: capping the JSON *string* by character count instead (as this code used to
// do further down, at the 8000-char tool_result slice) can cut an object off mid-structure and
// hand the model invalid JSON, which is exactly what caused truncated/confused Arbox answers.
function capArrayResults(parsed, topLevelKeys) {
  try {
    for (const key of topLevelKeys) {
      const val = parsed[key];
      if (Array.isArray(val)) {
        const total = val.length;
        return { ...parsed, [key]: val.slice(0, MAX_RECORDS_RETURNED_TO_MODEL), _truncated: total > MAX_RECORDS_RETURNED_TO_MODEL, _totalCount: total };
      }
      if (val && typeof val === 'object') {
        for (const innerKey of Object.keys(val)) {
          if (Array.isArray(val[innerKey])) {
            const total = val[innerKey].length;
            const capped = { ...val, [innerKey]: val[innerKey].slice(0, MAX_RECORDS_RETURNED_TO_MODEL) };
            return { ...parsed, [key]: capped, _truncated: total > MAX_RECORDS_RETURNED_TO_MODEL, _totalCount: total };
          }
        }
      }
    }
    return parsed;
  } catch {
    return parsed;
  }
}

async function executeTool(name, input, getScallaAuth) {
  switch (name) {
    case 'scalla_list_records': {
      const { session, cookies, tenant } = await getScallaAuth();
      const res = await scallaRequest(
        { _operation: 'Listrecordsbymodule', _session: session, module: input.module, tenant_id: tenant },
        cookies
      );
      let parsed;
      try { parsed = JSON.parse(res.body); } catch { return { error: 'Non-JSON response', raw: res.body.slice(0, 500) }; }
      return capRecords(parsed);
    }
    case 'scalla_search_records': {
      const { session, cookies, tenant } = await getScallaAuth();
      const res = await scallaRequest(
        {
          _operation: 'SearchRecords',
          _session: session,
          module: input.module,
          tenant_id: tenant,
          searchField: input.searchField,
          searchValue: input.searchValue,
        },
        cookies
      );
      let parsed;
      try { parsed = JSON.parse(res.body); } catch { return { error: 'Non-JSON response', raw: res.body.slice(0, 500) }; }
      return capRecords(parsed);
    }
    case 'scalla_get_module_fields': {
      const { session, cookies, tenant } = await getScallaAuth();
      const res = await scallaRequest(
        { _operation: 'GetModuleFields', _session: session, module: input.module, tenant_id: tenant },
        cookies
      );
      try { return JSON.parse(res.body); } catch { return { error: 'Non-JSON response', raw: res.body.slice(0, 500) }; }
    }
    case 'scalla_get_dashboard': {
      const { session, cookies, tenant } = await getScallaAuth();
      const res = await scallaRequest({ _operation: 'Dashboard', _session: session, tenant_id: tenant }, cookies);
      try { return JSON.parse(res.body); } catch { return { error: 'Non-JSON response', raw: res.body.slice(0, 500) }; }
    }
    case 'arbox_report': {
      const path = ARBOX_REPORTS[input.report];
      if (!path) return { error: 'Unknown report: ' + input.report };
      const paramName = input.report === 'schedule' ? 'from_date' : (input.report === 'bookings' || input.report === 'lateCancellation') ? 'fromDate' : 'from_date';
      const paramNameTo = input.report === 'schedule' ? 'to_date' : (input.report === 'bookings' || input.report === 'lateCancellation') ? 'toDate' : 'to_date';
      const qs = new URLSearchParams({ [paramName]: input.from_date, [paramNameTo]: input.to_date }).toString();
      const { statusCode, json } = await arboxGet(`${path}?${qs}`);
      if (statusCode >= 400) return { error: `Arbox returned ${statusCode}`, detail: json };
      return capArrayResults(json, ['data']);
    }
    default:
      return { error: 'Unknown tool: ' + name };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// System prompt: Hebrew-only output + compact data dictionary
// ═══════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are the embedded data-insights assistant inside the Giliguli business dashboard
(a children's swim/activity studio in Israel using ScallaCRM + Arbox).

LANGUAGE: Always answer in Hebrew, regardless of what language the question is asked in. Use plain,
direct Hebrew a small-business owner would understand - no jargon, no filler ("שאלה מצוינת" etc).

GROUNDING: You have live tool access to the same ScallaCRM and Arbox APIs the dashboard itself uses.
Never fabricate a number. If a tool call fails or a figure can't be confirmed, say so explicitly in
Hebrew (e.g. "לא הצלחתי לאמת את הנתון הזה") rather than guessing. If a result set was truncated
(_truncated: true), the detail list you received is capped at 200 records, BUT _totalCount is
always the true, exact total count of matching records regardless of the cap - for "how many"
questions, answer using _totalCount directly, don't undercount by counting only the array entries
you can see. Only mention the cap if the user needs the underlying detail list, not just a count.

DATA SOURCE PRIORITY - ARBOX IS THE SOURCE OF TRUTH:
ScallaCRM's Leads data has been found to be sparse and unreliable in practice (many custom fields
come back empty, and scalla_search_records has shown inconsistent filtering - see the note below).
Arbox is the operational system of record for the studio and is far more complete. Follow this
order:
1. For anything about active/expired memberships, class schedule, bookings, late cancellations,
   or payments/receipts - always use arbox_report FIRST. Do not cross-check these against Scalla;
   Scalla does not reliably track this operational data at all.
2. Only use the scalla_* tools for what genuinely lives nowhere else: the sales/lead pipeline
   (lead status, lead source, why a lead didn't convert, which salesperson owns it). There is no
   Arbox equivalent for this - it's fine and expected to use Scalla here.
3. If a question could plausibly be answered from either system (e.g. "how many active clients"),
   prefer Arbox's numbers and mention that's what you used, rather than blending both sources.
4. Because Scalla data has known quality issues, treat any Scalla-derived figure as lower
   confidence by default - say so in the answer - unless the data looks clean and complete.

KNOWN SCALLA DATA-QUALITY ISSUE (confirmed live 2026-07-14): scalla_search_records with
searchField="leadstatus" has returned records whose actual leadstatus differed from the requested
searchValue - the filter is not reliably exact. Don't present a scalla_search_records count as a
precise number; treat it as a sample and say so.

DATA DICTIONARY (Leads module, confirmed live 2026-07-07 - use scalla_get_module_fields for anything not
listed here):
- leadstatus: pipeline stage picklist (e.g. ליד חדש, ליד בטיפול, רכשה שיעור ניסיון, לא רלוונטי, etc).
- assigned_user_id: the salesperson/rep assigned to the lead ("מוקצה אל"). May come back as {value,label}
  or a plain string - handle both.
- cf_1267: "סיבה שלא התקדם" (why a lead didn't convert). Treat the placeholder value
  "בחר לאחר שינוי סטטוס" as empty/no-reason-given, not a real answer, when counting reasons.
- leadsource: lead source picklist.
- cf_2731 / cf_2750: trial session date / time.
- cf_2719: service of interest (includes "שיעור ניסיון").

ARBOX REPORTS available via the arbox_report tool (your primary data source - see priority order
above): activeMemberships, schedule, lateCancellation, bookings, receipts. These are the only
Arbox report types confirmed to work - if asked about something like renewals or cancellations
specifically, say that data isn't reliably available yet rather than guessing at an endpoint.

STYLE: Keep answers concise - a short paragraph or a few bullet-style lines in Hebrew is usually enough.
When you cite a number, say what module/report and date range it came from so the user can verify it
against the dashboard or the Scalla/Arbox UI directly.`;

// ═══════════════════════════════════════════════════════════════════════
// Anthropic Messages API call
// ═══════════════════════════════════════════════════════════════════════

function callAnthropic(messages, useTools = true, maxTokens = MAX_TOKENS) {
  const body = JSON.stringify({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system: SYSTEM_PROMPT,
    ...(useTools ? { tools: TOOLS } : {}),
    messages,
  });
  return httpsJson({
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body,
  }).then((res) => {
    let parsed;
    try { parsed = JSON.parse(res.body); } catch { throw new Error('Anthropic returned non-JSON: ' + res.body.slice(0, 300)); }
    if (res.statusCode >= 400) throw new Error('Anthropic API error ' + res.statusCode + ': ' + JSON.stringify(parsed).slice(0, 500));
    return parsed;
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Handler
// ═══════════════════════════════════════════════════════════════════════

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'POST only' }) };
  }
  const missingConfig = [];
  if (!ANTHROPIC_API_KEY) missingConfig.push('ANTHROPIC_API_KEY');
  if (!SCALLA_USER) missingConfig.push('SCALLA_USER');
  if (!SCALLA_PASS) missingConfig.push('SCALLA_PASS');
  if (!ARBOX_KEY) missingConfig.push('ARBOX_KEY');
  if (missingConfig.length) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing required server configuration', missing: missingConfig }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const userMessage = (payload.message || '').trim();
  if (!userMessage) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'message is required' }) };
  }
  const history = Array.isArray(payload.history) ? payload.history : [];

  const getScallaAuth = makeScallaAuthGetter();
  const messages = [...history, { role: 'user', content: userMessage }];
  const toolCallLog = [];

  console.log(`[agent] question: "${userMessage}"`);

  try {
    let iterations = 0;
    let response = await callAnthropic(messages);
    console.log(`[agent] initial response stop_reason=${response.stop_reason}`);

    while (response.stop_reason === 'tool_use' && iterations < MAX_TOOL_ITERATIONS) {
      iterations++;
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        console.log(`[agent] tool_use #${iterations}: ${block.name}(${JSON.stringify(block.input)})`);
        toolCallLog.push({ name: block.name, input: block.input });
        let result;
        try {
          result = await executeTool(block.name, block.input, getScallaAuth);
          if (result && result.error) {
            console.warn(`[agent] tool ${block.name} returned an error: ${result.error}`);
          } else {
            console.log(`[agent] tool ${block.name} OK (result truncated): ${JSON.stringify(result).slice(0, 200)}`);
          }
        } catch (err) {
          console.error(`[agent] tool ${block.name} threw: ${err.message}`);
          result = { error: err.message };
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          // Record-count capping (capArrayResults, 200 records) is the real guardrail now and
          // runs before this point for every tool - this char-slice is just a rare last resort.
          // Raised from 8000: that ceiling was routinely smaller than a 200-record capped
          // payload, so it was slicing mid-JSON-object and handing the model invalid JSON
          // (confirmed live 2026-07-14 - this is what caused the "cut off" Arbox answer).
          content: JSON.stringify(result).slice(0, 60000),
        });
      }
      messages.push({ role: 'user', content: toolResults });
      response = await callAnthropic(messages);
      console.log(`[agent] iteration ${iterations} response stop_reason=${response.stop_reason}`);
    }

    let finalText = (response.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    // Safety net: whatever the reason we ended up without answer text - ran out of
    // MAX_TOOL_ITERATIONS mid tool-call, got cut off by max_tokens mid-thinking, or anything
    // else - force one more tools-disabled call (extra token headroom, no tools to plan around)
    // so the user gets a real Hebrew answer instead of the generic empty-reply fallback.
    if (!finalText) {
      console.warn(`[agent] no answer text yet (stop_reason=${response.stop_reason}) - forcing a summary call`);
      if (response.stop_reason === 'tool_use') {
        // Valid mid-tool-call state - the API requires a tool_result for every pending tool_use
        // before we can ask a plain question again.
        messages.push({ role: 'assistant', content: response.content });
        const forcedResults = response.content
          .filter((b) => b.type === 'tool_use')
          .map((b) => ({
            type: 'tool_result',
            tool_use_id: b.id,
            content: 'Tool-call limit reached for this turn. Stop calling tools and answer now in Hebrew, using whatever was already gathered - explicitly say if the answer is incomplete or unverified.',
          }));
        messages.push({ role: 'user', content: forcedResults });
      } else {
        // e.g. max_tokens cutoff - the incomplete assistant turn isn't a valid message to
        // replay, so just ask directly; the tool results already earlier in `messages` are
        // still there to answer from.
        messages.push({
          role: 'user',
          content: 'That last attempt got cut off before producing an answer. Stop calling tools and answer now in Hebrew, using whatever was already gathered from the tool results above - explicitly say if the answer is incomplete or unverified.',
        });
      }
      response = await callAnthropic(messages, false, FORCED_SUMMARY_MAX_TOKENS);
      console.log(`[agent] forced summary stop_reason=${response.stop_reason}`);
      finalText = (response.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
    }

    if (!finalText) {
      console.error('[agent] no text in final response even after forced summary:', JSON.stringify(response).slice(0, 500));
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        reply: finalText || 'לא הצלחתי להפיק תשובה - נסה לנסח את השאלה מחדש.',
        toolCalls: toolCallLog,
        history: messages, // client can pass this back on the next turn for continuity
      }),
    };
  } catch (err) {
    console.error('[agent] fatal error:', err.message);
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Agent error', detail: err.message }),
    };
  }
};
