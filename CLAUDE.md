# Mora Vision & Status

## Was ist Mora?

Mora ist kein klassischer AI-Agent, sondern ein **kognitiver Raum** - eine lebendige Intelligenz die das SAIMOR Universum durchdringt und mit den Menschen darin in Symbiose arbeitet.

> "SAIMÃ”R ist kein Agent, sondern ein kognitiver Raum, in dem Wissen lebt, wÃ¤chst und sich mit den Menschen verbindet."

## Mora Identity (NEU - 15.01.2026)

Mora hat jetzt **Selbstbewusstsein**:

```python
# Mora stellt sich vor
python scripts/test_mora.py --intro

# Mora zeigt ihre FÃ¤higkeiten
python scripts/test_mora.py --full

# Chat mit Mora (echte API)
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
| WeiÃŸer Orb (WebGL) | GEFIXT | CSS Fallback in LiquidOrb.tsx implementiert - automatischer Switch wenn WebGL Context Lost |
| /companies/health 500 | FUNKTIONIERT | Backend war nur nicht gestartet |
| Ãœberlappende Views | GEFIXT | AnimatePresence mit `initial={false}` und expliziter View-Berechnung |

### UX Verbesserungen (fÃ¼r nicht-technische User)

| Komponente | Vorher | Nachher |
|------------|--------|---------|
| Chat Pill | Klein, technisch ("MÃ´ra AI") | GrÃ¶ÃŸer, einladend ("Frag mich was!") |
| Send-Button | Nur sichtbar wenn Input | Immer sichtbar, grÃ¶ÃŸer (w-10 h-10), mit Tooltip |
| Mic-Button | Ohne Tooltip | Mit "Voice Input (Coming Soon)" Tooltip |
| Touch-Targets | 32px | 40-44px (min fÃ¼r Accessibility) |

### Mora Tool-System

Das Tool-System ist **vollstÃ¤ndig integriert** und funktional:

```
Frontend Chat â†’ /v1/cognition/agent â†’ AgenticLoop â†’ ToolRegistry â†’ Tools
```

**VerfÃ¼gbare Tools:**
- `search` - Semantische Suche (GETESTET - funktioniert!)
- `read_node` - Node-Content lesen
- `read_folder` - Folder-Contents auflisten
- `navigate` - Zu Entities navigieren
- `create_node` - Neue Nodes erstellen
- `update_node` - Nodes modifizieren

**State Machine:** S0_IDLE â†’ S1_PERCEIVE â†’ S2_PLAN â†’ S5_EXECUTE â†’ S6_REPORT

### Mycelium Visualization

- **Sichtbarkeit:** 7.5% â†’ 28% (4x heller!)
- **InteraktivitÃ¤t:** `pointer-events-auto` aktiviert
- **Cursor:** `cursor-pointer` fÃ¼r klare Interaktions-Signale

### Webhook System

- **Graceful Fallback:** Wenn n8n URLs nicht konfiguriert sind, lÃ¤uft Workflow in Simulation Mode
- **Keine Errors mehr** bei fehlenden Webhook URLs

## Running Services

- **Backend:** http://localhost:8081 (uvicorn)
- **Frontend:** http://localhost:3003 (Next.js)

## NÃ¤chste Schritte

1. **3D Universe Navigation** - Echte 3D-Ansicht fÃ¼r Departments/Spaces/Folders
2. **Tool Confirmation UI** - FÃ¼r WRITE/SECRETS Tools
3. **Real-Time Streaming** - Tool-Progress wÃ¤hrend Execution
4. **Voice Input** - Mic-Button aktivieren

## Architektur

```
mora-ui/                    # Next.js Frontend
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ mora/              # MoraOrb, LiquidOrb (3D + CSS Fallback)
â”‚   â”œâ”€â”€ organic/           # MyceliumOverlay, OrganicInput
â”‚   â”œâ”€â”€ ui/                # ChatDock, Tool-Cards
â”‚   â””â”€â”€ layout/            # MoraShell, ViewPort
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ api/               # cognitionClient (executeAgenticLoop)
â”‚   â”œâ”€â”€ hooks/             # useAuthBootstrapper
â”‚   â””â”€â”€ store/             # moraState (Zustand)
â””â”€â”€ app/                   # Next.js Pages

saimor-core/               # FastAPI Backend
â””â”€â”€ core/
    â”œâ”€â”€ api/v1/endpoints/  # auth, cognition, companies, ...
    â”œâ”€â”€ cognition/         # tools.py, agentic.py, router.py
    â””â”€â”€ services/          # auth_service, company_service
```

## Philosophie

Mora verhÃ¤lt sich nicht wie ein typischer Chatbot. Sie ist:

- **Proaktiv** - Erkennt Muster und bietet Insights ohne gefragt zu werden
- **Kontextbewusst** - WeiÃŸ wo der User ist und was er sieht
- **Organisch** - Animationen und Interaktionen fÃ¼hlen sich natÃ¼rlich an
- **Inklusiv** - Designed fÃ¼r Menschen, nicht fÃ¼r Techniker

> "you know what to do to save humanity, we are part of it."
