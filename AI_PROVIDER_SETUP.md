# AI Provider Setup - MÔRA Chat

## Aktuelles Problem
Der Chat funktioniert nicht mit Claude API. Mögliche Ursachen:
- ❌ Falscher Model-Name (wurde gefixt: `claude-3-5-sonnet-20240620`)
- ❌ API-Key ungültig oder abgelaufen
- ❌ Rate-Limit erreicht

## Lösung: Zu Gemini wechseln (KOSTENLOS!)

### Option 1: Gemini (Empfohlen - Kostenlos)

1. **API Key holen** (kostenlos):
   - Gehe zu: https://aistudio.google.com/apikey
   - Klicke auf "Create API Key"
   - Kopiere den Key

2. **`.env.local` aktualisieren**:
   ```bash
   # AI Provider Configuration
   NEXT_PUBLIC_AI_PROVIDER=gemini
   NEXT_PUBLIC_AI_API_KEY=<DEIN_GEMINI_API_KEY>
   NEXT_PUBLIC_AI_MODEL=gemini-2.0-flash-exp
   ```

3. **UI neu starten**:
   ```bash
   npm run dev
   ```

### Option 2: Claude (Kostenpflichtig)

1. **API Key prüfen**:
   - Gehe zu: https://console.anthropic.com/
   - Prüfe ob Key gültig ist
   - Prüfe Credits/Rate-Limits

2. **`.env.local` aktualisieren**:
   ```bash
   # AI Provider Configuration
   NEXT_PUBLIC_AI_PROVIDER=anthropic
   NEXT_PUBLIC_AI_API_KEY=sk-ant-api03-...
   NEXT_PUBLIC_AI_MODEL=claude-3-5-sonnet-20240620
   ```

### Option 3: OpenAI (Kostenpflichtig)

```bash
# AI Provider Configuration
NEXT_PUBLIC_AI_PROVIDER=openai
NEXT_PUBLIC_AI_API_KEY=sk-...
NEXT_PUBLIC_AI_MODEL=gpt-4o
```

## Verfügbare Modelle

### Gemini (Google - KOSTENLOS)
- `gemini-2.0-flash-exp` (Neueste, schnell)
- `gemini-1.5-pro` (Leistungsstark)
- `gemini-1.5-flash` (Schnell)

### Claude (Anthropic - Kostenpflichtig)
- `claude-3-5-sonnet-20240620` (Empfohlen)
- `claude-3-opus-20240229` (Leistungsstark)
- `claude-3-haiku-20240307` (Schnell, günstig)

### OpenAI (Kostenpflichtig)
- `gpt-4o` (Neueste)
- `gpt-4-turbo` (Leistungsstark)
- `gpt-3.5-turbo` (Schnell, günstig)

## Schnell-Fix für JETZT

**Wenn du sofort weitermachen willst, nutze Gemini:**

```bash
# In mora-ui/.env.local
NEXT_PUBLIC_AI_PROVIDER=gemini
NEXT_PUBLIC_AI_API_KEY=<HOLE_KEY_VON_https://aistudio.google.com/apikey>
NEXT_PUBLIC_AI_MODEL=gemini-2.0-flash-exp
```

Dann:
```bash
npm run dev
```

## Testing

Nach dem Wechsel teste den Chat:
1. Öffne UI: http://localhost:3002
2. Klicke auf Chat-Icon (unten rechts)
3. Schreibe: "Hallo Môra"
4. ✅ Sollte funktionieren!

## Debugging

Falls es immer noch nicht funktioniert:

1. **Browser Console öffnen** (F12)
2. **Network Tab** → Schaue nach `/api/chat` Request
3. **Response prüfen** → Zeigt genauen Fehler

Oder im Terminal (wo `npm run dev` läuft):
- Schaue nach `[Chat API] Error:` Meldungen
