const https = require('https');

const SCALLA_API = 'https://api.scallacrm.co.il/scallaapi/api';
const SCALLA_USER = 'edendavid92@gmail.com';
const SCALLA_PASS = 'edendavid92@gmail.com';
const SCALLA_TENANT = 'aixbRzmXysBCuzgpT5aXB9GigJyoExGlUpmKEYZY';

function scallaRequest(body, cookies) {
  return new Promise((resolve, reject) => {
    const url = new URL(SCALLA_API);
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    };
    if (cookies) headers['Cookie'] = cookies;

    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers,
    }, (res) => {
      const setCookies = res.headers['set-cookie'];
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const cookieStr = setCookies
          ? setCookies.map(c => c.split(';')[0]).join('; ')
          : '';
        resolve({ statusCode: res.statusCode, body: data, cookies: cookieStr });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'POST only' }) };
  }

  try {
    let params;
    try {
      params = JSON.parse(event.body);
    } catch {
      params = Object.fromEntries(new URLSearchParams(event.body));
    }

    const action = params.action || 'leads';

    // Step 1: Login (every invocation - stateless)
    const loginBody = new URLSearchParams({
      _operation: 'loginAndFetchModules',
      username: params.username || SCALLA_USER,
      password: params.password || SCALLA_PASS,
    }).toString();

    const loginRes = await scallaRequest(loginBody, '');
    const loginData = JSON.parse(loginRes.body);

    if (!loginData.success || !loginData.result?.login?.session) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Login failed', detail: loginData }),
      };
    }

    const session = loginData.result.login.session;
    const cookies = loginRes.cookies;
    const tenant = params.tenant_id || SCALLA_TENANT;

    // Step 2: Execute requested action
    let actionBody;
    switch (action) {
      case 'leads':
        actionBody = new URLSearchParams({
          _operation: 'Listrecordsbymodule',
          _session: session,
          module: 'Leads',
          tenant_id: tenant,
        }).toString();
        break;

      case 'fields':
        actionBody = new URLSearchParams({
          _operation: 'GetModuleFields',
          _session: session,
          module: params.module || 'Leads',
          tenant_id: tenant,
        }).toString();
        break;

      case 'list':
        actionBody = new URLSearchParams({
          _operation: 'Listrecordsbymodule',
          _session: session,
          module: params.module || 'Leads',
          tenant_id: tenant,
        }).toString();
        break;

      case 'search':
        actionBody = new URLSearchParams({
          _operation: 'SearchRecords',
          _session: session,
          module: params.module || 'Leads',
          tenant_id: tenant,
          searchValue: params.searchValue || '',
          searchField: params.searchField || '',
        }).toString();
        break;

      case 'dashboard':
        actionBody = new URLSearchParams({
          _operation: 'Dashboard',
          _session: session,
          tenant_id: tenant,
        }).toString();
        break;

      case 'login_only':
        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            result: {
              session,
              modules: loginData.result.modules,
              unique_id: loginData.result.login.unique_id,
            },
          }),
        };

      default:
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Unknown action: ' + action }),
        };
    }

    const actionRes = await scallaRequest(actionBody, cookies);

    return {
      statusCode: actionRes.statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: actionRes.body,
    };

  } catch (err) {
    return {
      statusCode: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Proxy error', detail: err.message }),
    };
  }
};
