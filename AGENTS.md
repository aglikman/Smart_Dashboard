# AGENTS.md - Smart Dashboard Project

## Working Rules

- Treat this project as a customer-facing dashboard pilot for GiliGuli.
- Do not expose credential values in chat, logs, docs, screenshots, or commits.
- Prefer read-only inspection first when changing integrations.
- Keep runtime behavior stable unless Arye explicitly approves a behavior change.
- Use `giliguli_dashboard.html` as the development source of truth.
- `public/index.html` and `public/giliguli_dashboard.html` are currently synchronized deployed copies of the dashboard.

## Architecture Notes

- `scalla_proxy.js` is the local live-data proxy and static file server.
- Scalla CRM requires Israeli egress. Netlify functions are not a reliable live Scalla backend.
- Arbox public API uses the public v3 endpoint.
- AI chat is implemented in `netlify/functions/agent.js` and requires a server-side Anthropic API key.
- Email threshold alerts use EmailJS from the browser and store config in localStorage.

## Safe Commands

- Local run: `node scalla_proxy.js`
- Local dashboard: `http://localhost:3001`
- Health check: `http://localhost:3001/health`

## Migration Priorities

1. Keep one dashboard entrypoint.
2. Move credentials to environment variables.
3. Keep generated artifacts out of source control.
4. Keep deployment path matched to the local source of truth.
5. Keep customer docs aligned with the real run path.
