const https = require('https');

// ═══════════════════════════════════════════════════════════════
// CONFIG - all secrets come from Netlify env vars, never hardcode
// Site settings → Environment variables:
//   META_ACCESS_TOKEN      - System User token, scope: ads_read
//   META_AD_ACCOUNT_ID     - e.g. "act_123456789012345"
//   META_PAGE_ID           - Facebook Page ID
//   META_PAGE_ACCESS_TOKEN - Page token, scope: pages_read_engagement, read_insights
// ═══════════════════════════════════════════════════════════════
const GRAPH_API = 'graph.facebook.com';
const GRAPH_VERSION = 'v20.0';

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID || '';
const META_PAGE_ID = process.env.META_PAGE_ID || '';
const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';

function graphGet(path, queryParams) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(queryParams).toString();
    const options = {
      hostname: GRAPH_API,
      path: `/${GRAPH_VERSION}${path}?${qs}`,
      method: 'GET',
    };

    const req = https.request(options, (res) => {
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
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'POST only' }) };
  }

  try {
    let params;
    try {
      params = JSON.parse(event.body);
    } catch {
      params = Object.fromEntries(new URLSearchParams(event.body));
    }

    const action = params.action || 'campaigns';

    if (!META_ACCESS_TOKEN && action !== 'debug') {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'META_ACCESS_TOKEN not configured' }),
      };
    }

    let res;

    switch (action) {
      // ── Campaign table: מקור, סוג, לידים, הוצאה, המרות ──────
      // CPL is calculated client-side (spend / leads), not a native field.
      case 'campaigns': {
        const adAccount = params.ad_account_id || META_AD_ACCOUNT_ID;
        res = await graphGet(`/${adAccount}/insights`, {
          fields: 'campaign_name,objective,spend,actions',
          date_preset: params.date_preset || 'this_month',
          level: 'campaign',
          access_token: META_ACCESS_TOKEN,
        });
        break;
      }

      // ── Organic social card: חשיפות, מעורבות ────────────────
      // NOTE: page_post_engagements aggregates likes+shares+comments+clicks.
      // True separate like/share counts require per-post edges (a second
      // call per post) - not wired up here yet, add if the client needs
      // the breakdown instead of the combined engagement figure.
      case 'social': {
        const pageId = params.page_id || META_PAGE_ID;
        const pageToken = params.page_access_token || META_PAGE_ACCESS_TOKEN;
        res = await graphGet(`/${pageId}/insights`, {
          metric: 'page_impressions,page_engaged_users,page_post_engagements',
          period: 'week',
          access_token: pageToken,
        });
        break;
      }

      // ── Page fan count (closest native equivalent to "likes") ──
      case 'page_fans': {
        const pageId = params.page_id || META_PAGE_ID;
        const pageToken = params.page_access_token || META_PAGE_ACCESS_TOKEN;
        res = await graphGet(`/${pageId}`, {
          fields: 'fan_count,followers_count',
          access_token: pageToken,
        });
        break;
      }

      // ── Sanity check: confirm the token is valid and see its scopes ──
      case 'debug': {
        const token = params.access_token || META_ACCESS_TOKEN;
        res = await graphGet('/debug_token', {
          input_token: token,
          access_token: token,
        });
        break;
      }

      default:
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Unknown action: ' + action }),
        };
    }

    return {
      statusCode: res.statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: res.body,
    };

  } catch (err) {
    return {
      statusCode: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Proxy error', detail: err.message }),
    };
  }
};
