const https = require('https');

const ARBOX_BASE = 'https://arboxserver.arboxapp.com/api/public/v3';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function arboxGet(apiPath) {
  return new Promise((resolve, reject) => {
    if (!apiPath || typeof apiPath !== 'string' || !apiPath.startsWith('/')) {
      reject(new Error('Invalid Arbox path'));
      return;
    }

    const url = new URL(ARBOX_BASE + apiPath);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        apikey: requireEnv('ARBOX_KEY'),
        Accept: 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });

    req.on('error', reject);
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
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const result = await arboxGet(payload.path);
    return {
      statusCode: result.statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: result.body,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Arbox proxy error', detail: err.message }),
    };
  }
};
