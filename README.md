# Smart Dashboard Project

## Source of Truth

The current working dashboard source is:

- `giliguli_dashboard.html`
- `public/giliguli_dashboard.html`
- `public/index.html`

These files currently match and include the latest dashboard, including the AI chat panel. The root `/` path in the local proxy serves `giliguli_dashboard.html`; Netlify serves `public/index.html`.

## Application Shape

This is a static dashboard plus a small Node proxy.

- Frontend: single HTML dashboard with inline CSS and JavaScript.
- Local backend: `scalla_proxy.js`.
- Serverless functions: `netlify/functions/*.js`.
- Deployment config: `netlify.toml`.
- Storage: browser `localStorage` only. There is no database.

## Runtime Flow

Local live mode:

1. Start the dashboard with `npm run dashboard`, or double-click `start_dashboard.cmd` on Windows.
2. The launcher checks `http://localhost:3001/health`, starts `scalla_proxy.js` if needed, waits until the proxy is ready, and only then opens the V2 dashboard at `http://localhost:3001/outputs/versions/smart-dashboard-v2-2026-07-17/giliguli_dashboard_v2.html`.
3. Browser calls `http://localhost:3001/api/scalla`, `http://localhost:3001/api/arbox`, and local Netlify-style function adapters such as `/.netlify/functions/meta`.
4. Proxy calls Scalla CRM from the local Israeli internet connection and keeps credentials server-side.

Do not open the dashboard HTML file directly for live demos. Opening the file before the proxy is running prevents Scalla and Meta from connecting. To open the old root dashboard intentionally, run `powershell -NoProfile -ExecutionPolicy Bypass -File ./start_dashboard.ps1 -Classic`.

This local/Israeli-egress path is required because Scalla CRM blocks non-Israeli outbound IPs.

## External Systems

- Scalla CRM: `https://api.scallacrm.co.il/scallaapi/api`
- Arbox public API: `https://arboxserver.arboxapp.com/api/public/v3`
- Meta Graph API: through `netlify/functions/meta.js`; locally, `scalla_proxy.js` adapts the same Netlify function path
- AI chat: through `netlify/functions/agent.js`
- Email alerts: EmailJS browser SDK, configured in the dashboard UI and stored in browser `localStorage`

## Known Deployment Constraint

Netlify can serve the static dashboard, but it should not be relied on for live Scalla CRM data because Netlify function egress is not guaranteed to be Israeli. For a shareable live URL, use one of:

- Cloudflare Tunnel pointing to an always-on Israeli machine running `scalla_proxy.js`.
- Israeli VPS running the proxy.

## Migration Status

Phase 1 documented the project and protected local/generated artifacts.

Phase 2 moved Scalla and Arbox credentials out of browser-visible files and serverless source. Local development now reads ignored values from `.env`; production must provide the same names in the hosting environment.

Phase 3 consolidated the deployment entrypoint: `public/index.html` now matches the current dashboard source.

Phase 4 cleaned local project hygiene: the dashboard HTML files no longer contain NUL bytes, npm scripts are defined, the unused Express dependency was removed, old generated artifacts were archived locally, and this folder now has its own valid Git repository.

## CR and bug tracker

- Customer form: `DashBoard_CR_Form.html`
- Admin tracker: `DashBoard_CR_Admin.html`
- Public API: `netlify/functions/cr.mjs`
- Admin API: `netlify/functions/cr-admin.mjs`
- Persistent store: Netlify Blobs (`smart-dashboard-cr`)

The admin screen requires `CR_ADMIN_PASSWORD` and `CR_AUTH_SECRET` in the Netlify Functions environment. Customer requests are stored centrally and remain available across deployments.

Next phase should address product decisions: whether the AI chat remains Anthropic/Claude-powered, whether Meta should be configured locally, and whether customer docs need a refresh after the cleanup.


