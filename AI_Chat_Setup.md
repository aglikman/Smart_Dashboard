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

## AI OS open tasks - updated 2026-07-25

Current status: the AI OS v1 is implemented as a Hebrew dashboard assistant, but production
readiness is not confirmed until the server-side environment variables are set and a live
question-answer test succeeds from the deployed Giliguli dashboard.

| Priority | Status | Task | Done when |
|---|---|---|---|
| P0 | Open | Configure production AI environment in Netlify: `ANTHROPIC_API_KEY`, `SCALLA_USER`, `SCALLA_PASS`, `SCALLA_TENANT`, and `ARBOX_KEY`. | The deployed function returns a Hebrew answer from `/.netlify/functions/agent` without exposing any secret values. |
| P0 | Open | Run live AI OS smoke test against the deployed Giliguli dashboard. | At least 3 real questions succeed: one Scalla CRM question, one Arbox question, and one unsupported-data question where the agent clearly says the data is not reliably available instead of guessing. |
| P0 | Open | Decide the production live-data path for Scalla. Netlify can host the static dashboard and functions, but Scalla live data should not depend on non-Israeli egress. | Arye selects either an Israeli always-on machine with Cloudflare Tunnel or an Israeli VPS running `scalla_proxy.js`. |
| P1 | Open | Monitor AI OS usage after go-live. | `/stats` locally or Netlify function logs are reviewed for Scalla login failures, Arbox errors, empty answers, token cutoffs, and repeated unsupported questions. |
| P1 | Open | Confirm the AI provider decision for the pilot. | Anthropic/Claude remains approved for the Giliguli pilot, or a replacement provider is chosen with cost, latency, privacy, and Hebrew quality considered. |
| P1 | Open | Decide whether chat history should remain browser-tab only. | A written decision exists: keep no server-side chat log, or add retention/audit behavior with customer-facing privacy wording. |
| P1 | Open | Decide whether AI OS becomes a reusable client template. | Giliguli-specific wording, integrations, and prompts are separated from reusable agent logic, or the feature stays pilot-only. |
| P1 | Open | Add caching/session strategy if usage grows. | Repeated questions no longer require a fresh Scalla login and full tool loop every time, without weakening tenant isolation. |
| P1 | Open | Keep AI OS aligned with the Auth/Admin roadmap. | Any multi-client AI OS rollout waits for production Auth, roles, and tenant isolation before exposing client-specific data. |
| P2 | Open | Refresh customer-facing docs after validation. | The user guide/runbook explains what the AI assistant can answer, what is intentionally unavailable, and who to contact when answers are incomplete. |

## Confirmed guardrails

- Secrets stay server-side only. Do not place API keys or credentials in dashboard HTML, browser
  JavaScript, screenshots, docs, logs, or commits.
- The agent only exposes confirmed Scalla and Arbox operations. Unverified report names remain
  excluded until live API validation proves them.
- Tool results are capped at 200 records. The agent must say when a number is based on a capped or
  incomplete sample.
- Conversation history is currently held in the browser tab only and is lost on refresh.
- Run `npm run qa:predeploy` before any deploy or production release.
