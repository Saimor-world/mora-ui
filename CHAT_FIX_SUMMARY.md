# 🔧 Chat-Fix - Claude Model Error Behoben

## ✅ Was wurde gefixt

### 1. **Claude Model-Name korrigiert**
- ❌ Alt: `claude-3-5-sonnet-20241022` (ungültig)
- ✅ Neu: `claude-3-5-sonnet-20240620` (korrekt)

**Geänderte Dateien:**
- `mora-ui/app/api/chat/route.ts` (Zeile 47)
- `mora-ui/lib/api/aiClient.ts` (Zeile 89)

### 2. **Fehlerbehandlung verbessert**
- ✅ Detaillierte Error-Messages für alle Provider (Anthropic, OpenAI, Gemini)
- ✅ Console-Logging für besseres Debugging
- ✅ HTTP Status Codes in Fehlermeldungen

**Geänderte Dateien:**
- `mora-ui/app/api/chat/route.ts` (alle Provider-Handler)

### 3. **Dokumentation erstellt**
- ✅ `AI_PROVIDER_SETUP.md` - Komplette Anleitung für Provider-Wechsel
- ✅ Gemini als kostenlose Alternative dokumentiert

---

## 🚀 Nächste Schritte

### Option A: Claude weiter nutzen (Kostenpflichtig)

**Wenn dein Claude API-Key gültig ist:**

Der Fix sollte jetzt funktionieren! Teste einfach:

1. **UI neu laden** (Browser: Ctrl+Shift+R)
2. **Chat öffnen** (Icon unten rechts)
3. **Nachricht senden**: "Hallo Môra"

**Falls es immer noch nicht geht:**
- Prüfe deinen API-Key auf https://console.anthropic.com/
- Schaue in Browser Console (F12) nach detailliertem Fehler

---

### Option B: Zu Gemini wechseln (KOSTENLOS - Empfohlen!)

**Wenn Claude nicht funktioniert, nutze Gemini:**

#### Schritt 1: API Key holen
```
1. Gehe zu: https://aistudio.google.com/apikey
2. Klicke "Create API Key"
3. Kopiere den Key
```

#### Schritt 2: `.env.local` bearbeiten
```bash
# In: mora-ui/.env.local

# Ändere diese Zeilen:
NEXT_PUBLIC_AI_PROVIDER=gemini
NEXT_PUBLIC_AI_API_KEY=<DEIN_GEMINI_KEY>
NEXT_PUBLIC_AI_MODEL=gemini-2.0-flash-exp
```

#### Schritt 3: UI neu starten
```bash
# Terminal wo npm run dev läuft:
# Drücke Ctrl+C, dann:
npm run dev
```

#### Schritt 4: Testen
```
1. Browser: http://localhost:3002
2. Chat öffnen
3. "Hallo Môra" schreiben
4. ✅ Sollte funktionieren!
```

---

## 🔍 Debugging

### Browser Console (F12)
Schaue nach:
```
[Anthropic API Error] 401 {...}
[Gemini API Error] 400 {...}
```

### Terminal (npm run dev)
Schaue nach:
```
[Chat API] Error: ...
```

### Häufige Fehler

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| `401 Unauthorized` | API-Key ungültig | Neuen Key holen |
| `429 Rate Limit` | Zu viele Requests | Warten oder zu Gemini wechseln |
| `400 Bad Request` | Model-Name falsch | Wurde gefixt! |
| `CORS Error` | Browser-Blockade | Nutze `/api/chat` Proxy (bereits implementiert) |

---

## 📊 Status

- ✅ UI läuft: `http://localhost:3002` (PID 21104)
- ✅ Backend läuft: `http://localhost:8081`
- ✅ Model-Name gefixt
- ✅ Error-Handling verbessert
- ⚠️ **Claude API-Key muss geprüft werden**
- ✅ **Gemini als Fallback bereit**

---

## 💡 Empfehlung

**Für sofortige Demo:**
→ Wechsle zu Gemini (kostenlos, schnell, zuverlässig)

**Für Production:**
→ Prüfe Claude API-Key und Credits

---

## 📝 Geänderte Dateien (Git)

```bash
modified:   mora-ui/app/api/chat/route.ts
modified:   mora-ui/lib/api/aiClient.ts
new file:   mora-ui/AI_PROVIDER_SETUP.md
new file:   mora-ui/CHAT_FIX_SUMMARY.md
```

---

## ✅ Definition of Done

- [x] Claude Model-Name korrigiert
- [x] Error-Handling verbessert
- [x] Gemini-Fallback dokumentiert
- [ ] Chat funktioniert (nach API-Key-Fix oder Gemini-Wechsel)

**Nächster Schritt:** Entscheide dich für Option A (Claude) oder B (Gemini) und teste!
