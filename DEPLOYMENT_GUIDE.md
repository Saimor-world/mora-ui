# 🚀 Môra UI - Deployment Guide

**Ziel:** Môra UI im Browser sehen - JETZT! 🎯

---

## ⚡ SCHNELLSTER WEG: Vercel (5 Minuten)

**Warum Vercel?**
- ✅ **Kostenlos** (für private Projekte)
- ✅ **2 Minuten Setup**
- ✅ **Auto-Deploy** bei jedem Git Push
- ✅ **HTTPS automatisch** (SSL Zertifikate)
- ✅ **Global CDN** (schnell weltweit)

### Schritt 1: Vercel Account
```bash
# 1. Gehe zu: https://vercel.com
# 2. "Sign Up with GitHub"
# 3. Authorisiere Vercel für GitHub
```

### Schritt 2: Projekt Importieren
```bash
# 1. Klick "Add New" → "Project"
# 2. Suche "mora-ui" in deinen Repos
# 3. Klick "Import"
```

### Schritt 3: Environment Variables
```
Vercel fragt nach .env Variablen:

NEXT_PUBLIC_CORE_BASE_URL = https://voice.saimor.world
NEXT_PUBLIC_ADMIN_TOKEN = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_N8N_EMAIL_DIGEST = https://voice.saimor.world/webhook/email-digest
NEXT_PUBLIC_N8N_BROADCAST_DOC = https://voice.saimor.world/webhook/broadcast-doc
NEXT_PUBLIC_N8N_DUPLICATE_HUNTER = https://voice.saimor.world/webhook/duplicate-hunter
```

**Token holen:**
```bash
# Aus deiner lokalen .env.local kopieren:
cat C:/mora-ui/.env.local
```

### Schritt 4: Deploy!
```bash
# 1. Klick "Deploy"
# 2. Warte 2-3 Minuten
# 3. FERTIG! 🎉

# Vercel zeigt dir die URL:
# https://mora-ui-xyz.vercel.app
```

### Schritt 5: Custom Domain (Optional)
```bash
# Falls du eine Domain wie mora.saimor.world willst:
# 1. Vercel Dashboard → Settings → Domains
# 2. "Add Domain" → "mora.saimor.world"
# 3. DNS Record bei Hetzner/Cloudflare:
#    CNAME mora.saimor.world → cname.vercel-dns.com
```

**Ergebnis:** 🎉 **Môra UI LIVE in 5 Minuten!**

---

## 🐳 ALTERNATIVE: Docker auf Hetzner

**Warum Docker?**
- ✅ **Volle Kontrolle**
- ✅ **Eigener Server**
- ✅ **Keine Vercel-Abhängigkeit**
- ⚠️ **Mehr Aufwand** (15-30 Minuten)

### Schritt 1: Dockerfile Vorbereiten
```dockerfile
# Dockerfile (existiert bereits in mora-ui)
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Schritt 2: docker-compose.yml
```yaml
# docker-compose.yml
version: '3.8'

services:
  mora-ui:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      - NEXT_PUBLIC_CORE_BASE_URL=https://voice.saimor.world
      - NEXT_PUBLIC_ADMIN_TOKEN=${MORA_ADMIN_TOKEN}
      - NEXT_PUBLIC_N8N_EMAIL_DIGEST=https://voice.saimor.world/webhook/email-digest
      - NEXT_PUBLIC_N8N_BROADCAST_DOC=https://voice.saimor.world/webhook/broadcast-doc
      - NEXT_PUBLIC_N8N_DUPLICATE_HUNTER=https://voice.saimor.world/webhook/duplicate-hunter
    networks:
      - saimor-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  saimor-network:
    external: true
```

### Schritt 3: Deploy auf Hetzner
```bash
# 1. SSH zum Server
ssh deploy@49.12.195.166

# 2. Projekt klonen
cd /home/deploy
git clone https://github.com/Saimor-world/mora-ui.git
cd mora-ui

# 3. .env erstellen
cat > .env <<EOF
MORA_ADMIN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EOF

# 4. Docker Build & Start
docker-compose build
docker-compose up -d

# 5. Logs checken
docker-compose logs -f mora-ui
```

### Schritt 4: Caddy Reverse Proxy
```bash
# In /etc/caddy/Caddyfile (oder dein Caddy-Config):

mora.saimor.world {
    reverse_proxy localhost:3000

    log {
        output file /var/log/caddy/mora-ui.log
        format json
    }
}

# Caddy neu laden:
sudo systemctl reload caddy
```

**Ergebnis:** 🎉 **Môra UI @ https://mora.saimor.world**

---

## 💻 QUICK & DIRTY: SSH Tunnel (JETZT sofort!)

**Warum SSH Tunnel?**
- ✅ **SOFORT** (30 Sekunden)
- ✅ **Kein Deployment nötig**
- ✅ **Lokale Dev-Server nutzen**
- ⚠️ **Nur temporär** (Tunnel muss offen bleiben)

### Schritt 1: Dev Server Starten
```bash
# Terminal 1 (lokal auf deinem PC):
cd C:/mora-ui
npm run dev -- -p 3004

# Server läuft auf localhost:3004
```

### Schritt 2: SSH Tunnel (wenn Server remote läuft)
```bash
# Falls mora-ui auf Hetzner Server läuft:
# Terminal 2 (lokal auf deinem PC):
ssh -L 3004:localhost:3004 deploy@49.12.195.166

# Jetzt kannst du zugreifen:
# http://localhost:3004
```

### Schritt 3: Browser Öffnen
```bash
# Öffne im Browser:
http://localhost:3004

# Oder falls auf Server:
http://49.12.195.166:3004
```

**Ergebnis:** 🎉 **Môra UI sofort im Browser!**

---

## 📊 VERGLEICH: Welche Methode?

| Methode | Zeit | Schwierigkeit | Permanent | URL |
|---------|------|--------------|-----------|-----|
| **Vercel** | 5 min | ⭐ Sehr leicht | ✅ Ja | https://mora-ui.vercel.app |
| **Docker/Hetzner** | 30 min | ⭐⭐⭐ Mittel | ✅ Ja | https://mora.saimor.world |
| **SSH Tunnel** | 30 sec | ⭐ Leicht | ❌ Nein | http://localhost:3004 |

---

## 🎯 MEINE EMPFEHLUNG

### Für SOFORT (jetzt gleich sehen):
```bash
# Option 3: SSH Tunnel
cd C:/mora-ui
npm run dev -- -p 3004
# Dann Browser: http://localhost:3004
```

### Für PRODUCTION (professionell):
```bash
# Option 1: Vercel
# 1. https://vercel.com → Sign Up
# 2. Import mora-ui Repo
# 3. Add Environment Variables
# 4. Deploy
# → FERTIG in 5 Minuten!
```

### Für VOLLE KONTROLLE (wenn Zeit):
```bash
# Option 2: Docker auf Hetzner
# Siehe Schritte oben
# → Dauert 30 Minuten, aber dann hast du alles selbst in der Hand
```

---

## 🐛 Troubleshooting

### Problem: "Port 3000 already in use"
```bash
# Lösung: Anderen Port nutzen
npm run dev -- -p 3004
```

### Problem: "Failed to fetch" im Browser
```bash
# Ursache: Core API nicht erreichbar
# Check: Läuft Core API?
curl https://voice.saimor.world/v1/health

# Fix: .env.local checken
cat .env.local
# NEXT_PUBLIC_CORE_BASE_URL muss https://voice.saimor.world sein
```

### Problem: "3D Scene lädt nicht"
```bash
# Bekanntes Problem (aus TEST_GUIDE.md)
# Debugging:
# 1. F12 → Console Tab
# 2. Suche nach Errors (rot)
# 3. Poste Errors hier für Fix

# Mögliche Ursachen:
# - WebGL nicht aktiviert
# - React Three Fiber Mount-Problem
# - GPU-Treiber Issue
```

### Problem: "Build failed"
```bash
# Check Node Version:
node --version
# Muss ≥ 18 sein

# Dependencies neu installieren:
rm -rf node_modules package-lock.json
npm install

# Build nochmal:
npm run build
```

### Problem: "CORS Error"
```bash
# Ursache: Core API blockiert Requests
# Fix: Core API muss Port allowen

# Check Core API CORS config:
# In saimor-core/core/app.py sollte stehen:
# allow_origins=[
#     "https://mora-ui.vercel.app",  # Vercel
#     "https://mora.saimor.world",    # Custom Domain
#     "http://localhost:3004",        # Local Dev
# ]
```

---

## ✅ Nach Deployment: Checklist

- [ ] **UI lädt** im Browser
- [ ] **Folder Mode** funktioniert (Tree + List View)
- [ ] **Context Panel** zeigt Details bei Click
- [ ] **Insights Panel** zeigt Stats
- [ ] **API Connection** zeigt "Live" (nicht "Offline")
- [ ] **Field Mode** lädt (⚠️ bekanntes 3D Issue)
- [ ] **Workflow Runner** sichtbar im Panel
- [ ] **Console** zeigt keine roten Errors (F12)

---

## 🚀 JETZT LOSLEGEN!

**Du willst die UI JETZT sehen?**

### Schnellste Lösung (30 Sekunden):
```bash
cd C:/mora-ui
npm run dev -- -p 3004
# Browser: http://localhost:3004
```

### Professionellste Lösung (5 Minuten):
```bash
# 1. Gehe zu https://vercel.com
# 2. "Sign Up with GitHub"
# 3. "Import mora-ui"
# 4. Add .env variables
# 5. Deploy
# → LIVE @ https://mora-ui.vercel.app
```

**Viel Erfolg! 🎉**

---

**Brauchst du Hilfe?**
- Frag mich (Claude)
- Oder ChatGPT Agent "MORA OS"
- Oder check TEST_GUIDE.md für Debugging

**Let's go!** 🚀
