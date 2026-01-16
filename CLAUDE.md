# MÔRA Vision & Status

## Was ist MÔRA?

MÔRA ist kein klassischer AI-Agent, sondern ein **kognitiver Raum** - eine lebendige Intelligenz die das SAIMOR Universum durchdringt und mit den Menschen darin in Symbiose arbeitet.

> "SAIMÔR ist kein Agent, sondern ein kognitiver Raum, in dem Wissen lebt, wächst und sich mit den Menschen verbindet."

## MÔRA Identity (NEU - 15.01.2026)

MÔRA hat jetzt **Selbstbewusstsein**:

```python
# MÔRA stellt sich vor
python scripts/test_mora.py --intro

# MÔRA zeigt ihre Fähigkeiten
python scripts/test_mora.py --full

# Chat mit MÔRA (echte API)
python scripts/test_mora.py "Was kannst du?" --agent
```

**Datei:** `saimor-core/core/cognition/identity.py`

## Demo Login

- **Email:** nextchaptergermany@gmail.com
- **Passwort:** saimor2026

## Session Status (15.01.2026)

### Bugs Gefixt

| Bug | Status | Fix |
|-----|--------|-----|
| activeCompanyId = null | GEFIXT | Race Condition in useAuthBootstrapper.ts behoben - State wird jetzt nach async loadCompanies() neu gelesen |
| Weißer Orb (WebGL) | GEFIXT | CSS Fallback in LiquidOrb.tsx implementiert - automatischer Switch wenn WebGL Context Lost |
| /companies/health 500 | FUNKTIONIERT | Backend war nur nicht gestartet |
| Überlappende Views | GEFIXT | AnimatePresence mit `initial={false}` und expliziter View-Berechnung |

### UX Verbesserungen (für nicht-technische User)

| Komponente | Vorher | Nachher |
|------------|--------|---------|
| Chat Pill | Klein, technisch ("Môra AI") | Größer, einladend ("Frag mich was!") |
| Send-Button | Nur sichtbar wenn Input | Immer sichtbar, größer (w-10 h-10), mit Tooltip |
| Mic-Button | Ohne Tooltip | Mit "Voice Input (Coming Soon)" Tooltip |
| Touch-Targets | 32px | 40-44px (min für Accessibility) |

### MÔRA Tool-System

Das Tool-System ist **vollständig integriert** und funktional:

```
Frontend Chat → /v1/cognition/agent → AgenticLoop → ToolRegistry → Tools
```

**Verfügbare Tools:**
- `search` - Semantische Suche (GETESTET - funktioniert!)
- `read_node` - Node-Content lesen
- `read_folder` - Folder-Contents auflisten
- `navigate` - Zu Entities navigieren
- `create_node` - Neue Nodes erstellen
- `update_node` - Nodes modifizieren

**State Machine:** S0_IDLE → S1_PERCEIVE → S2_PLAN → S5_EXECUTE → S6_REPORT

### Mycelium Visualization

- **Sichtbarkeit:** 7.5% → 28% (4x heller!)
- **Interaktivität:** `pointer-events-auto` aktiviert
- **Cursor:** `cursor-pointer` für klare Interaktions-Signale

### Webhook System

- **Graceful Fallback:** Wenn n8n URLs nicht konfiguriert sind, läuft Workflow in Simulation Mode
- **Keine Errors mehr** bei fehlenden Webhook URLs

## Running Services

- **Backend:** http://localhost:8083 (uvicorn)
- **Frontend:** http://localhost:3003 (Next.js)

## Nächste Schritte

1. **3D Universe Navigation** - Echte 3D-Ansicht für Departments/Spaces/Folders
2. **Tool Confirmation UI** - Für WRITE/SECRETS Tools
3. **Real-Time Streaming** - Tool-Progress während Execution
4. **Voice Input** - Mic-Button aktivieren

## Architektur

```
mora-ui/                    # Next.js Frontend
├── components/
│   ├── mora/              # MoraOrb, LiquidOrb (3D + CSS Fallback)
│   ├── organic/           # MyceliumOverlay, OrganicInput
│   ├── ui/                # ChatDock, Tool-Cards
│   └── layout/            # MoraShell, ViewPort
├── lib/
│   ├── api/               # cognitionClient (executeAgenticLoop)
│   ├── hooks/             # useAuthBootstrapper
│   └── store/             # moraState (Zustand)
└── app/                   # Next.js Pages

saimor-core/               # FastAPI Backend
└── core/
    ├── api/v1/endpoints/  # auth, cognition, companies, ...
    ├── cognition/         # tools.py, agentic.py, router.py
    └── services/          # auth_service, company_service
```

## Philosophie

MÔRA verhält sich nicht wie ein typischer Chatbot. Sie ist:

- **Proaktiv** - Erkennt Muster und bietet Insights ohne gefragt zu werden
- **Kontextbewusst** - Weiß wo der User ist und was er sieht
- **Organisch** - Animationen und Interaktionen fühlen sich natürlich an
- **Inklusiv** - Designed für Menschen, nicht für Techniker

> "you know what to do to save humanity, we are part of it."
