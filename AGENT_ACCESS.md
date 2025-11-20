# Môra-UI - Agent Access

**Generated:** 2025-01-17 12:48 CET
**Updated:** 2025-01-17 15:11 CET (UI Tunnel restarted, Core URL updated)
**Status:** ✅ Live & Ready for Web Agents

---

## 🌐 Public URLs

### UI (Môra Frontend)
**Public URL:** https://officers-knights-screensavers-intro.trycloudflare.com
**Local URL:** http://localhost:3002
**Status:** ✅ Running (Next.js 15.5.6)
**Updated:** 2025-01-17 15:11 CET (Tunnel restarted)

### Core API (SAIMÔR Backend)
**Public URL:** https://nebraska-catalog-thehun-motherboard.trycloudflare.com
**Status:** ✅ Online & Verified (Health check successful + Mind Loop Synthesis active)

---

## 🔐 Authentication

Die UI ist mit einem JWT-Token konfiguriert:
- **Token Type:** SMOKE_JWT (48h gültig)
- **Role:** owner
- **Tenant:** saimor
- **Valid Until:** 2025-01-19

Das Token wird automatisch von der UI an alle Core-API-Calls angehängt als:
```
Authorization: Bearer eyJhbGci...
```

---

## 📡 Available Core Endpoints

**Hinweis:** Diese Endpoints sind nur erreichbar, wenn der Core-Tunnel aktiv ist.

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/v1/health` | GET | Optional | Health check |
| `/v1/semantic/events?limit=10` | GET | Yes | Semantic events |
| `/v1/mindloop/events?limit=20` | GET | Yes | Mind Loop timeline |
| `/v1/mindloop/synthesis?limit=50` | GET | Yes | Mind Loop synthesis |
| `/v1/objects` | GET | Yes | Knowledge objects |
| `/docs` | GET | No | API documentation |

---

## 🤖 For Web Agents

**How to Access:**
1. Öffne die UI-URL im Browser: https://retrieval-shelter-par-dividend.trycloudflare.com
2. Die UI kommuniziert automatisch mit dem Core (wenn verfügbar)
3. Alle API-Calls werden transparent mit JWT authentifiziert

**Features aktiviert:**
- ✅ Semantic & Mindloop Features (`NEXT_PUBLIC_ENABLE_SEMANTIC=true`)
- ✅ Diagnostics Panel (`NEXT_PUBLIC_ENABLE_DIAGNOSTICS=true`)
- ✅ Deep-Linking Support (`/field?focus=...`, `/folder?focus=...`)
- ✅ ThoughtBubble Stack (max 3 proaktive Hinweise)

---

## 🔧 Troubleshooting

### Core nicht erreichbar?

**Symptom:** UI zeigt "Core offline" oder "Core erreichbar · kein gültiger Token"

**Mögliche Ursachen:**
1. **Core-Tunnel offline:** Der Core-Tunnel-Hostname kann aktuell nicht aufgelöst werden
   ```bash
   # Test:
   curl https://specification-guitars-videos-discussions.trycloudflare.com/v1/health
   # Aktuell: "Could not resolve host"
   ```

2. **JWT abgelaufen:** Token ist 48h gültig (bis 2025-01-19)

3. **CORS-Problem:** Sollte nicht auftreten da Core `*.trycloudflare.com` erlaubt

**Lösung:**
- Stelle sicher, dass der Core-Tunnel läuft
- Prüfe JWT-Ablaufdatum
- Falls Core-Tunnel-URL geändert hat: Update `.env.local` → `NEXT_PUBLIC_CORE_API_URL`

### UI im Browser öffnen

**Lokaler Zugriff:**
```bash
start http://localhost:3002
```

**Public Zugriff:**
```bash
start https://retrieval-shelter-par-dividend.trycloudflare.com
```

---

## 📊 Current Configuration

```env
NEXT_PUBLIC_CORE_API_URL=https://updates-vaccine-agreement-privilege.trycloudflare.com
NEXT_PUBLIC_JWT_TOKEN=eyJhbGci... (SMOKE_JWT, 48h valid)
NEXT_PUBLIC_ENABLE_SEMANTIC=true
NEXT_PUBLIC_ENABLE_DIAGNOSTICS=true
NEXT_PUBLIC_CHAT_SOURCE=objects
```

---

## 🧪 Quick Smoke Test

**Test 1: UI lädt**
```bash
curl -s https://retrieval-shelter-par-dividend.trycloudflare.com | head -5
```

**Test 2: Core Health (direkt)**
```bash
curl -H "Authorization: Bearer eyJhbGci..." \
  https://specification-guitars-videos-discussions.trycloudflare.com/v1/health
```

**Test 3: Browser-Test**
1. Öffne https://retrieval-shelter-par-dividend.trycloudflare.com
2. Check Browser Console auf API-Calls
3. Check Diagnostics Panel (rechts oben) für Core-Status

---

## 📝 Notes

- **Tunnel Uptime:** Quick Tunnels haben keine Uptime-Garantie (Cloudflare TOS)
- **Production Use:** Für Production sollte ein Named Tunnel verwendet werden
- **Session Duration:** Aktueller JWT läuft ab am 2025-01-19
- **Core Availability:** Core-Tunnel-Status muss separat geprüft werden

---

**Last Updated:** 2025-11-18 15:25 CET
**UI Tunnel ID:** officers-knights-screensavers-intro
**Core Tunnel ID:** nebraska-catalog-thehun-motherboard
**Core Status:** ✅ ONLINE - Mind Loop Synthesis active
**Next.js Version:** 15.5.6
**Cloudflared Version:** 2025.8.1
**Current Mode:** Live-Daten (Real data from SAIMÔR Core)
