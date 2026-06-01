# Server / OpenClaw Audit — 2026-06-01

**Status:** Findings from local sources (Docker compose, Caddyfile, larry-ui). Live SSH parts pending (agent lacked terminal permission).

## 1. Services & process manager
- All core services run under **Docker Compose** (project `saimor`, workdir `/root/saimor/ops`). No systemd / PM2.
- Services: Caddy (80/443), Core API (internal 8081), Next.js UI (internal 3000), Gateway (internal 8000), Redis, Postgres, Qdrant, n8n.
- **Larry dashboard** = separate Docker Compose project (`larry-ui/`), joins `saimor_app` network externally. Reverse-proxied at `larry.saimor.world` via docker0 bridge `172.17.0.1:18789`.
- Watchtower auto-updates public images every 12h.

## 2. larry.saimor.world auth — server-enforced (confirmed)
- HTTP Basic Auth applied by **Caddy** before any request reaches larry-ui: `basicauth { marius $2a$14$... }` on the vhost.
- The 401 is Caddy's, not client-side hiding. ✅ P0 hardening holds.
- `dash.saimor.world` has **no** basicauth block — verify separately.

## 3. Mailbox / IMAP — current architecture
- **No** OpenClaw mail gateway and **no** IMAP server on the Saimor host.
- larry-ui has a direct IMAP client (`imapflow`, `email-search-route.ts`) connecting to external providers:
  - business IMAP (`EMAIL_IMAP_HOST/USER/PASS`)
  - personal Gmail (`PERSONAL_EMAIL_IMAP_HOST=imap.gmail.com`)
- Searches most recent ~220 messages/folder per request.
- Volume mounts `/data/larry-inbox`, `/data/larry-personal-inbox` → planned/existing file-based inbox store alongside search route.
- CORE has `/v1/mail.py` (content not read this session).

## 4. Integrations capabilities object
- Not fully readable from local files. Nightwatch shows Gateway exposes `health.channels` (name, mode, connected) + agent runtime metrics.
- CORE `integrations.py` likely stores OAuth tokens (Google Calendar, cloud). Exact `overview` shape needs a live `GET /v1/integrations/overview` with valid JWT.

## 5. Recommendation: IMAP over OpenClaw-bridge
- **Use direct IMAP (Option A).** CORE already has `/v1/mail.py` + integrations store.
- Add an `asyncio.create_task` IMAP IDLE background task to CORE on startup → parse incoming → insert as node in an `Inbox` folder → emit to `CONSCIOUS_STREAM_ENABLED=true`. Surfaces mail in MORA with no new infra.
- n8n webhook (Option B) is better for **WORLD inbound customer signals** (Postmark/Resend inbound), not the personal/business mail loop.

## Open (needs live SSH `ssh saimor-server`)
- Read CORE `/v1/mail.py` + `integrations.py` contents.
- Live `GET /v1/integrations/overview` shape.
- Confirm `/data/larry-inbox` store format.
- `dash.saimor.world` auth check.
