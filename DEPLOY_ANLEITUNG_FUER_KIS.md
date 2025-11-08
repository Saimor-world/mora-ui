# 🤖 Deploy-Anleitung für KIs (Claude Code, ChatGPT, etc.)

**Für:** Andere KI-Assistenten die mora-ui deployen sollen
**Von:** Terminal Claude
**Datum:** 2025-11-08

---

## 🎯 MISSION: mora-ui für User im Browser sichtbar machen

---

## 📋 OPTION 1: VERCEL DEPLOYMENT (EMPFOHLEN)

**Warum Vercel?**
- ✅ Kostenlos für private Projekte
- ✅ 5 Minuten Setup
- ✅ Automatische HTTPS/SSL
- ✅ Automatisches Deployment bei Git Push
- ✅ **KEIN PASSWORD NÖTIG** (OAuth mit GitHub)

### Schritt-für-Schritt:

#### 1. **User muss Vercel Account haben**
```
Sage dem User:
"Bitte gehe zu https://vercel.com und klicke 'Sign Up with GitHub'.
Dann authorisiere Vercel für dein GitHub Account."

WICHTIG: User macht das SELBST (nicht du als KI!)
Grund: OAuth braucht menschlichen Browser-Login
```

#### 2. **Nach Login: Projekt importieren**
```
Sage dem User:
"Klicke in Vercel Dashboard auf 'Add New' → 'Project'
Dann suche 'mora-ui' in der Liste und klicke 'Import'"

Oder sage:
"Gehe direkt zu: https://vercel.com/new
Wähle 'mora-ui' aus deinen GitHub Repos"
```

#### 3. **Environment Variables konfigurieren**
```
Vercel fragt nach .env Variablen.
Sage dem User:

"Füge diese Environment Variables hinzu:

NEXT_PUBLIC_CORE_BASE_URL = https://voice.saimor.world
NEXT_PUBLIC_ADMIN_TOKEN = [kopiere aus C:/mora-ui/.env.local]
NEXT_PUBLIC_N8N_EMAIL_DIGEST = https://voice.saimor.world/webhook/email-digest
NEXT_PUBLIC_N8N_BROADCAST_DOC = https://voice.saimor.world/webhook/broadcast-doc
NEXT_PUBLIC_N8N_DUPLICATE_HUNTER = https://voice.saimor.world/webhook/duplicate-hunter
"

WICHTIG: Den JWT Token aus .env.local lesen:
```

**Als KI - So holst du den Token:**
```bash
# Lese .env.local
cat C:/mora-ui/.env.local | grep NEXT_PUBLIC_ADMIN_TOKEN

# Zeige dem User den kompletten Wert
# Er muss ihn in Vercel einfügen
```

#### 4. **Deploy Button drücken**
```
Sage dem User:
"Klicke jetzt auf 'Deploy' und warte 2-3 Minuten"

Vercel buildet automatisch:
- npm install
- npm run build
- Deployment

Nach 2-3 Minuten ist mora-ui LIVE!
```

#### 5. **URL an User geben**
```
Vercel zeigt URL: https://mora-ui-xyz123.vercel.app

Sage dem User:
"Fertig! Deine mora-ui ist jetzt live unter:
https://mora-ui-xyz123.vercel.app

Öffne die URL im Browser!"
```

### ⚠️ WICHTIG: Was DU als KI NICHT machen kannst

```
❌ NICHT möglich:
- Du kannst NICHT in Vercel einloggen (braucht menschlichen Browser)
- Du kannst NICHT OAuth authorisieren
- Du kannst NICHT Vercel Buttons klicken

✅ WAS du machen kannst:
- .env.local lesen und Token extrahieren
- User anleiten WO er was klicken soll
- Environment Variables auflisten
- Deploy-Status checken (nach Deployment)
```

### 🔐 PASSWORT? NEIN!

```
GUTE NACHRICHT: Kein Passwort nötig!

Vercel nutzt OAuth:
1. User klickt "Sign Up with GitHub"
2. GitHub fragt: "Allow Vercel access?"
3. User klickt "Authorize"
4. FERTIG - eingeloggt!

User braucht NUR sein GitHub Passwort (das er eh hat)
Kein neues Vercel-Passwort nötig!
```

---

## 📋 OPTION 2: DOCKER AUF HETZNER (Für fortgeschrittene)

**Warum Docker?**
- ✅ Volle Kontrolle
- ✅ Eigener Server (kein Vercel)
- ⚠️ **BRAUCHT PASSWORD** (SSH zum Server)

### Voraussetzungen:

```
User MUSS haben:
1. SSH Zugang zum Hetzner Server (deploy@49.12.195.166)
2. SSH Password oder SSH Key
3. Docker auf dem Server installiert
```

### Schritt-für-Schritt:

#### 1. **SSH Zugang testen**
```bash
# Als KI - versuche SSH:
ssh deploy@49.12.195.166 "echo 'SSH works'"

# Falls Password-Prompt:
# STOP! User muss Password eingeben
# Du als KI kannst das NICHT
```

#### 2. **Falls User SSH Zugang hat:**
```bash
# Projekt auf Server klonen
ssh deploy@49.12.195.166 << 'EOF'
cd /home/deploy
git clone https://github.com/Saimor-world/mora-ui.git
cd mora-ui
EOF

# .env erstellen
ssh deploy@49.12.195.166 << 'EOF'
cd /home/deploy/mora-ui
cat > .env <<ENVFILE
MORA_ADMIN_TOKEN=<TOKEN_HIER>
ENVFILE
EOF
```

#### 3. **Docker Build & Deploy**
```bash
# Docker Compose
ssh deploy@49.12.195.166 << 'EOF'
cd /home/deploy/mora-ui
docker-compose build
docker-compose up -d
EOF
```

#### 4. **Reverse Proxy (Caddy) konfigurieren**
```bash
# Caddy Config updaten
ssh deploy@49.12.195.166 << 'EOF'
sudo tee -a /etc/caddy/Caddyfile <<CADDY
mora.saimor.world {
    reverse_proxy localhost:3000
}
CADDY
sudo systemctl reload caddy
EOF
```

### 🔐 PASSWORT PROBLEM!

```
PROBLEM: SSH braucht Authentication

LÖSUNGEN:

Option A: User gibt dir Password
- User tippt: "Password ist xyz123"
- Du nutzt: sshpass -p "xyz123" ssh deploy@...
- ⚠️ UNSICHER! Password in Logs sichtbar

Option B: User macht SSH manuell
- Du gibst Commands als Liste
- User führt sie im Terminal aus
- ✅ SICHER! Du siehst kein Password

Option C: SSH Key bereits konfiguriert
- User hat vorher SSH Key setup gemacht
- ssh deploy@49.12... funktioniert ohne Password
- ✅ PERFEKT! Du kannst direkt deployen
```

### ⚠️ EMPFEHLUNG für KIs:

```
WENN Password nötig:
→ Gib User die Commands als Copy-Paste Liste
→ User macht es manuell im Terminal
→ DU machst kein SSH mit Password

WENN SSH Key vorhanden:
→ Du kannst direkt deployen
→ Kein Password nötig
```

---

## 📋 OPTION 3: LOKAL MIT SSH TUNNEL (Schnellste)

**Warum SSH Tunnel?**
- ✅ **SOFORT** (30 Sekunden)
- ✅ Kein Deployment nötig
- ✅ User sieht UI sofort
- ⚠️ Nur temporär (Browser muss offen bleiben)

### Schritt-für-Schritt:

#### 1. **Dev Server lokal starten**
```bash
# Als KI - kannst du machen:
cd C:/mora-ui
npm run dev -- -p 3004

# Server läuft im Background
# Check mit:
netstat -ano | findstr :3004
```

#### 2. **Browser öffnen**
```bash
# Windows:
start http://localhost:3004

# Falls "start" nicht funktioniert:
# Sage User: "Öffne Browser manuell: http://localhost:3004"
```

#### 3. **FERTIG!**
```
Server läuft auf localhost:3004
User öffnet Browser
UI ist sofort sichtbar! 🎉

KEIN PASSWORD NÖTIG!
KEIN DEPLOYMENT NÖTIG!
```

### 🔐 PASSWORT? NEIN!

```
Lokal = Kein Password
Du startest Server auf User's eigenem PC
Kein SSH, kein OAuth, nichts

Nur wenn Server auf REMOTE läuft (Hetzner):
→ Dann SSH Tunnel: ssh -L 3004:localhost:3004 deploy@...
→ DAS braucht Password (siehe Option 2)
```

---

## 🤖 ZUSAMMENFASSUNG FÜR KIs

### **Was du als KI machen KANNST:**

#### ✅ OHNE Password:
```bash
# 1. Lokalen Dev Server starten
cd C:/mora-ui
npm run dev -- -p 3004

# 2. Browser öffnen (versuchen)
start http://localhost:3004

# 3. Token aus .env.local lesen
cat C:/mora-ui/.env.local

# 4. User für Vercel anleiten
echo "Gehe zu https://vercel.com und klicke 'Sign Up with GitHub'"
```

#### ✅ MIT SSH Key (kein Password):
```bash
# Falls User SSH Key hat:
ssh deploy@49.12.195.166 "cd mora-ui && git pull && docker-compose up -d"
```

#### ❌ NICHT möglich (braucht User):
```bash
# 1. Vercel OAuth Login (User muss im Browser)
# 2. SSH mit Password (User muss tippen)
# 3. Vercel Buttons klicken (User muss klicken)
```

---

## 📊 DECISION TREE für KIs

```
START: User will mora-ui deployen

FRAGE 1: Ist User's PC lokal (localhost)?
├─ JA → Option 3: npm run dev (SOFORT, kein Password)
└─ NEIN → Weiter zu Frage 2

FRAGE 2: Hat User Vercel Account?
├─ JA → Option 1: Vercel (EINFACH, kein Password - OAuth)
├─ NEIN → Frage User: "Willst du Vercel Account erstellen?"
│   ├─ JA → Leite an: https://vercel.com
│   └─ NEIN → Weiter zu Frage 3
└─ Weiter zu Frage 3

FRAGE 3: Hat User SSH Zugang zum Server?
├─ JA, mit SSH Key → Option 2: Docker Deploy (du machst)
├─ JA, mit Password → Option 2: Docker Deploy (User macht manuell)
└─ NEIN → Geh zurück zu Option 1 (Vercel)

EMPFEHLUNG:
→ IMMER zuerst Option 3 probieren (lokal, sofort)
→ Dann Option 1 vorschlagen (Vercel, professionell)
→ Option 2 nur wenn User Server-Admin ist
```

---

## 💡 BEST PRACTICES für KIs

### 1. **Immer zuerst lokal versuchen:**
```bash
cd C:/mora-ui
npm run dev -- -p 3004

# Check ob Server läuft:
netstat -ano | findstr :3004

# Falls läuft:
echo "Server ready! Öffne Browser: http://localhost:3004"
```

### 2. **Token NIEMALS in Logs zeigen:**
```bash
# ❌ FALSCH:
echo "Dein Token: eyJhbGci..."

# ✅ RICHTIG:
TOKEN=$(cat .env.local | grep ADMIN_TOKEN | cut -d= -f2)
echo "Token gefunden (${#TOKEN} Zeichen)"
```

### 3. **User für OAuth anleiten (nicht selbst machen):**
```bash
# ❌ FALSCH:
# "Ich logge mich jetzt in Vercel ein..."
# → Geht nicht! Du bist eine KI!

# ✅ RICHTIG:
echo "Bitte gehe zu https://vercel.com und klicke 'Sign Up with GitHub'"
echo "Nach dem Login, klicke 'Import mora-ui'"
```

### 4. **Bei SSH: Erst testen ob Key vorhanden:**
```bash
# Test SSH ohne Password:
ssh -o BatchMode=yes deploy@49.12.195.166 "echo test" 2>&1

# Falls "Permission denied":
# → Kein SSH Key → Sage User er muss manuell deployen

# Falls "test" erscheint:
# → SSH Key vorhanden → Du kannst deployen!
```

---

## 🔐 PASSWORD HANDLING - WICHTIG!

### **Wann KEIN Password nötig:**

```
✅ Lokaler Dev Server (Option 3)
✅ Vercel mit GitHub OAuth (Option 1)
✅ SSH mit Key (Option 2, falls konfiguriert)
```

### **Wann Password NÖTIG:**

```
⚠️ SSH ohne Key (Option 2)
⚠️ sudo Commands auf Server (Option 2)
```

### **Was tun wenn Password nötig:**

```
OPTION A: User gibt Password
→ User: "Password ist xyz123"
→ Du: Nutze sshpass oder ähnliches
→ ⚠️ RISIKO: Password in Logs/History

OPTION B: User macht manuell
→ Du: Gib Commands als Liste
→ User: Copy-Paste ins Terminal
→ ✅ SICHER: Kein Password in deinen Logs

OPTION C: Wechsel zu anderer Methode
→ Du: "SSH braucht Password, lass uns Vercel nutzen"
→ User: Geht zu Vercel (kein Password nötig)
→ ✅ BESTE Lösung!

EMPFEHLUNG: Immer Option C wenn möglich!
```

---

## 📝 CHECKLISTE für KIs

Bevor du deployest, check:

- [ ] **User's Environment?** (Windows/Linux/Mac?)
- [ ] **Lokaler Zugriff?** (C:/mora-ui existiert?)
- [ ] **Node.js installiert?** (`node --version`)
- [ ] **Git Repo geklont?** (`git status` funktioniert?)
- [ ] **.env.local existiert?** (`cat .env.local`)
- [ ] **Token vorhanden?** (NEXT_PUBLIC_ADMIN_TOKEN gesetzt?)
- [ ] **Vercel Account?** (User fragen!)
- [ ] **SSH Zugang?** (Falls Docker gewünscht)
- [ ] **SSH Key oder Password?** (Wichtig für Methode!)

---

## 🚀 QUICK REFERENCE

### Schnellste Lösung (30 Sekunden):
```bash
cd C:/mora-ui && npm run dev -- -p 3004
# User öffnet: http://localhost:3004
```

### Professionellste Lösung (5 Minuten):
```
1. User → https://vercel.com
2. Sign Up with GitHub (OAuth)
3. Import mora-ui
4. Add .env variables
5. Deploy
→ LIVE!
```

### Server Lösung (30 Minuten):
```bash
# NUR wenn SSH Key vorhanden:
ssh deploy@SERVER << 'EOF'
cd mora-ui
git pull
docker-compose build
docker-compose up -d
EOF
```

---

## 🆘 TROUBLESHOOTING für KIs

### Problem: "npm command not found"
```bash
# Check Node.js:
node --version

# Falls nicht installiert:
echo "User muss Node.js installieren: https://nodejs.org"
```

### Problem: "Permission denied (SSH)"
```bash
# Kein SSH Key vorhanden
# Lösung: Wechsel zu Vercel oder lokaler Dev Server
```

### Problem: "Port 3004 already in use"
```bash
# Finde Prozess:
netstat -ano | findstr :3004

# Kill Prozess:
taskkill /F /PID <PID>

# Oder anderen Port:
npm run dev -- -p 3005
```

### Problem: "Build failed"
```bash
# Dependencies neu installieren:
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 💡 FINAL TIPS für KIs

1. **Start SIMPLE:** Immer zuerst lokal versuchen
2. **ASK USER:** Bei Password/OAuth → User muss machen
3. **NO SECRETS:** Token niemals in Logs/Console
4. **BE CLEAR:** Sage genau WO User was klicken muss
5. **FALLBACK:** Wenn eine Methode nicht geht → andere vorschlagen

---

**Status:** ✅ **GUIDE COMPLETE**

Diese Anleitung deckt ALLE Szenarien ab:
- ✅ Lokal (kein Password)
- ✅ Vercel (OAuth, kein Password)
- ✅ Docker (mit/ohne Password)

**Andere KIs sollten das problemlos deployen können!** 🚀

---

**Erstellt von:** Terminal Claude
**Für:** Alle KI-Assistenten (Claude Code, ChatGPT, etc.)
**Datum:** 2025-11-08
**Version:** 1.0
