# AI Insights Chat — Setup Notes

## What was built

- `netlify/functions/agent.js` — server-side Claude agent. Logs into Scalla once per request,
  exposes Scalla CRM + Arbox as tools, runs the tool-use loop, returns a Hebrew answer.
- Embedded chat panel in `giliguli_dashboard.html` (floating 💬 button, bottom-left) — calls
  `/.netlify/functions/agent`, keeps conversation history in the browser tab only (not persisted).

Scope: Giliguli pilot only, matching how the recent KPI additions were shipped. Not yet a
reusable template component for future clients.

## Required: set the Anthropic API key in Netlify

The function will return a 500 error until this is set. In Netlify: **Site settings → Environment
variables** → add:

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your Anthropic API key |

Optional overrides (all have working defaults, only set if needed):

| Key | Default | Purpose |
|---|---|---|
| `ANTHROPIC_MODEL` | `claude-sonnet-5` | swap model if cost/latency needs differ |
| `SCALLA_USER` / `SCALLA_PASS` | none | required for Scalla tool access |
| `SCALLA_TENANT` | empty | optional fallback; login `unique_id` is preferred |
| `ARBOX_KEY` | none | required for Arbox tool access |

## What the agent can actually do (by design, not guesswork)

Tools given to Claude are limited to **confirmed-working** operations only:

- Scalla: `Listrecordsbymodule`, `SearchRecords` (single field/value condition only),
  `GetModuleFields`, `Dashboard`.
- Arbox: `activeMemberships`, `schedule`, `lateCancellation`, `bookings`, `receipts` reports.

The four Arbox report guesses from the 2026-07-07 KPI work (inactive members, expired
memberships, renewals, cancellations) were deliberately **not** wired into the agent, since
those endpoint names are unverified. If a client asks about those, the agent is instructed to
say the data isn't reliably available rather than guessing.

## Known limitations (v1)

- Each tool call returns raw records capped at 200 rows to control cost/context — the agent is
  told to flag when a figure is based on a truncated sample.
- Multi-condition search isn't supported by the underlying Scalla API (only one field/value pair
  confirmed) — the agent falls back to listing + reasoning over records for anything more complex.
- No live-tool caching: every question triggers a fresh Scalla login + API calls. Fine for pilot
  usage; would need a shared session/cache if this scales to many concurrent users per client.
- Conversation history lives only in the browser tab (lost on refresh) — no server-side chat log.

## Next steps

1. Set `ANTHROPIC_API_KEY` in Netlify and do a live test against the Giliguli dashboard.
2. Watch `/stats` (via `scalla_proxy.js` locally, or Netlify function logs in production) for
   Scalla login/API errors surfaced by real usage.
3. Once validated, decide whether to templatize this for future clients (per the CR process,
   more than incidental changes should probably become a "Feature Addition").
