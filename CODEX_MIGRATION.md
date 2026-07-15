# Claude-to-Codex Migration Notes

## Phase 1 - Approved And Applied

Applied without changing runtime behavior:

- Added project README with current architecture and source-of-truth notes.
- Added project-local AGENTS.md for Codex operating rules.
- Added `.env.example` with variable names only.
- Expanded `.gitignore` for local secrets, Claude runtime state, generated deploy zips, logs, and reconstruction artifacts.

No dashboard logic, proxy logic, API code, deployment config, or generated documents were modified in this phase.

## Phase 2 - Approved And Applied

Applied with behavior preserved:

- Created a local ignored `.env` with the existing runtime values.
- Removed Scalla credentials from dashboard JavaScript.
- Removed the Arbox API key from dashboard JavaScript.
- Added server-side Arbox proxy support for local and Netlify paths.
- Updated Scalla local/serverless paths to inject credentials server-side.
- Removed hardcoded Scalla/Arbox fallbacks from Netlify functions.
- Added fail-fast config validation for the AI chat function.

Validated:

- Scalla login via server-side handler.
- Scalla leads fetch via server-side handler.
- Arbox users fetch via server-side handler.
- Local proxy health reports Scalla, Arbox, and Anthropic config present.

## Current Source Of Truth

Use:

- `giliguli_dashboard.html`
- `public/giliguli_dashboard.html`

Do not use as source of truth yet:

- `public/index.html`
- root `index.html`

Reason: `public/index.html` differs from the latest dashboard, while root `index.html` is the client intake form.

## Remaining Migration Plan

## Phase 3 - Approved And Applied

Applied:

- Relinked the local Netlify project state to `clever-gelato-1497aa`.
- Confirmed Netlify site ID `5500ba1f-a541-4f5f-b0c1-f9b150bcca1a`.
- Confirmed required production env vars are present and secret where appropriate.
- Replaced `public/index.html` with the current dashboard source so the Netlify root URL serves the latest dashboard.

Remaining duplicate HTML:

- `giliguli_dashboard.html` remains the root development source.
- `public/giliguli_dashboard.html` remains a named deployed copy.
- `public/index.html` is now the deploy root copy.

These three dashboard copies currently match after consolidation.

## Phase 4 - Approved And Applied

Applied:

- Removed NUL bytes from the three synchronized dashboard HTML files.
- Added npm scripts for local run, syntax check, and production deploy.
- Removed unused `express` dependency and simplified `package-lock.json`.
- Archived old local/generated artifacts under `_local_archive/`.
- Archived the broken `.git` folder and initialized a valid project-local Git repository.

No runtime credentials were removed from `.env`; it remains the active local secrets file and is ignored.

## Remaining Migration Plan

### Live Scalla Hosting

- Keep localhost proxy for local demos, or
- Add Cloudflare Tunnel from an Israeli machine, or
- Deploy proxy to an Israeli VPS.

Netlify currently reaches the Scalla function successfully in the latest check, but the safer architecture for guaranteed live Scalla remains an Israeli-egress proxy if Scalla geo-blocking reappears.

### Verification

- Validate Scalla login and lead fetch with dynamic tenant id.
- Validate Arbox public v3 endpoints used by the studio tab.
- Validate Meta function only when Meta env vars are present.
- Validate AI chat only when `ANTHROPIC_API_KEY` is present.
- Smoke-test dashboard on local proxy and on deployed static site.
