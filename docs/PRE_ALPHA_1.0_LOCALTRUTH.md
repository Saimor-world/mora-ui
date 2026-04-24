# PRE ALPHA 1.0 — Local Truth

Stand: 2026-04-18

Aktive Wahrheiten:
- UI: `C:\saimor\INTERFACE`
- Core: `C:\saimor\CORE`
- Startpfad: `C:\saimor\scripts\Start-LocalTruth.ps1`
- Headless/Agent-Start: `powershell -ExecutionPolicy Bypass -File C:\saimor\scripts\Start-LocalTruth.ps1 -NoBrowser`
- Erzwungener Neustart: `powershell -ExecutionPolicy Bypass -File C:\saimor\scripts\Start-LocalTruth.ps1 -ForceRestart -NoBrowser`

Lokale URLs:
- UI: `http://127.0.0.1:3000/login`
- Core: `http://127.0.0.1:8081/v3/health`

Lokale Testkonten:
- `nextchaptergermany@gmail.com / nextchapter123`
- `demo@saimor.io / demo123`

Produktzustand:
- localhost ist die Primärwahrheit
- HQ ist nur Mirror, nicht führend
- Mail und Kalender tragen echte Setup-Blocker im OS
- Mora liest denselben Kommunikationskontext wie Home / Mail / Kalender / Integrationen

Bekannte reale Blocker:
- Google Kalender braucht echte Werte in `C:\saimor\CORE\.env`:
  - `GOOGLE_CALENDAR_CLIENT_ID`
  - `GOOGLE_CALENDAR_CLIENT_SECRET`
  - `GOOGLE_CALENDAR_REDIRECT_URL=http://127.0.0.1:8081/v3/integrations/calendar/callback`
- Mail braucht echte Werte in `C:\saimor\CORE\.env` oder benutzerspezifische Speicherung über den Integrationsbereich:
  - `EMAIL_IMAP_HOST`
  - `EMAIL_IMAP_USER`
  - `EMAIL_IMAP_PASSWORD`
  - `SMTP_HOST`
  - `SMTP_USER`
  - `SMTP_PASSWORD`

Definition für Pre Alpha 1.0:
- ein lokaler, reproduzierbarer Startpfad
- eine aktive UI-Wahrheit
- eine aktive Core-Wahrheit
- ehrliche Setup-/Connect-Zustände statt Demo-Scheinlogik
- echte Datenpfade vorbereitet, auch wenn Credentials noch fehlen
- reproduzierbare Gates: `npm run verify:mr16:smoke` in `C:\saimor\INTERFACE` und `pytest -q` in `C:\saimor\CORE`
