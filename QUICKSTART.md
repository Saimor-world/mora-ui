# 🚀 Môra UI - Quick Start Guide

**Last Updated:** 2025-11-26  
**Phase:** G - Ready for Demo

---

## ⚡ Fast Setup (5 Minuten)

### 1. ENV Configuration

```bash
# Copy example
cp .env.local.example .env.local
```

**Edit `.env.local`** mit diesen minimal requirements:

```env
# === CORE API ===
NEXT_PUBLIC_CORE_API_URL=http://localhost:8081
NEXT_PUBLIC_JWT_TOKEN=your_jwt_token_here

# === AI CHAT ===
NEXT_PUBLIC_AI_PROVIDER=gemini
NEXT_PUBLIC_AI_API_KEY=your_gemini_key_here
NEXT_PUBLIC_AI_MODEL=gemini-2.0-flash-exp
```

**Gemini API Key holen:**
- https://aistudio.google.com/apikey
- Free tier: 15 requests/minute

---

### 2. Start Backend

```bash
# Terminal 1: Saimor Core
cd c:\saimor\saimor-core\core
python run.py
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8081
```

---

### 3. Start UI

```bash
# Terminal 2: Mora UI
cd c:\saimor\mora-ui
npm run dev
```

**Expected Output:**
```
✓ Ready in 2.3s
○ Local:        http://localhost:3000
```

---

### 4. Open Browser

```
http://localhost:3000
```

**You should see:**
- ✅ "CORE SYSTEM ONLINE" (if backend running)
- ✅ Mycelium particle network animating
- ✅ "Môra AI" button bottom-center
- ✅ SynthesisPanel top-right (if backend has data)

---

## 🧪 Test Features

### A. Test ChatDock (AI Integration)

1. **Click** "Môra AI" button
2. **Type:** "Hallo, wer bist du?"
3. **Expected:** Gemini antwortet als "Môra"

**Context-Aware Test:**
1. Navigate to a Department/Space
2. Ask: "Was kann ich hier machen?"
3. **Expected:** Môra kennt den aktuellen Kontext

---

### B. Test SynthesisPanel (Intelligence)

**If Backend is running:**
1. **Look** top-right corner
2. **See:** Intelligence panel with risk level
3. **Click** panel to expand
4. **Expected:** Nodes count, Events, Top Risks

**If no data:**
- Panel shows "Loading Intelligence..."
- Add some test data via TreeSidebar:
  - Create Space
  - Create Folder  
  - Add some Nodes
- Refresh → Panel updates

---

### C. Test Mycelium Interactivity

**V3 Features (if enabled):**
1. **Move mouse** → Parallax effect
2. **Hover cluster orbs** → Label appears
3. **Click cluster** → Console log (navigate coming soon)

**To enable V3:**
```typescript
// In components/layout/MoraShell.tsx
// Replace line 16:
import { MyceliumOverlay } from '@/components/organic/MyceliumOverlayV3';
```

---

## 🔧 Troubleshooting

### "CONNECTION ERROR" in UI

**Problem:** Core API nicht erreichbar

**Fix:**
1. Check Backend: `Test-NetConnection localhost -Port 8081`
2. If failed: Start Backend (`python run.py`)
3. Check JWT: Generate new token if expired

```bash
cd c:\saimor\saimor-core\core
python scripts/generate_token.py
# Copy new token to .env.local
```

---

### ChatDock: "Failed to get AI response"

**Problem:** AI Provider config fehlt

**Fix:**
1. Check `.env.local`:
   ```env
   NEXT_PUBLIC_AI_PROVIDER=gemini
   NEXT_PUBLIC_AI_API_KEY=PLACEHOLDER  # ← REPLACE!
   ```
2. Get API Key: https://aistudio.google.com/apikey
3. Restart dev server: `Ctrl+C` dann `npm run dev`

---

### SynthesisPanel not showing

**Problem:** Backend läuft, aber keine Daten

**Solution:** Daten generieren

```bash
# Option 1: Via UI
- Create Departments/Spaces/Nodes über TreeSidebar
- Panel updates automatisch alle 30s

# Option 2: Via Backend seed
cd c:\saimor\saimor-core\core
python scripts/seed_data.py
```

---

### Mycelium V3 clusters not showing

**Problem:** Noch keine Clusters im Backend

**Expected:** Clusters entstehen automatisch wenn:
- Mindestens 10+ Nodes existieren
- Backend "Awareness Clustering" läuft (Phase F Feature)

**Check Backend logs:**
```
INFO: Awareness Clustering: 3 clusters detected
```

---

## 📊 Feature Checklist

Use this to verify everything works:

### Core Features
- [  ] App starts on :3000
- [ ] Mycelium animiert im Hintergrund
- [ ] TreeSidebar zeigt Departments
- [ ] Navigation: Kann Spaces/Folders öffnen

### Phase G Features
- [ ] ChatDock öffnet
- [ ] ChatDock sendet Message
- [ ] Gemini antwortet
- [ ] Context Bar zeigt Pfad
- [ ] SynthesisPanel erscheint (top-right)
- [ ] Synthesis zeigt Risk Level
- [ ] Synthesis zeigt Node Count

### Advanced
- [ ] Mycelium V3: Cluster Orbs sichtbar
- [ ] Mycelium V3: Hover zeigt Label
- [ ] Mycelium V3: Parallax funktioniert
- [ ] Create new Space/Folder works
- [ ] Node Detail Panel öffnet

---

## 🎯 Demo Flow (KI Garage)

**Empfohlene Demo-Sequenz:**

1. **Start (0:00)**
   - Zeige Startscreen mit Mycelium
   - "Das ist Môra - ein organisches Wissenssystem"

2. **Navigation (0:30)**
   - Klick Department → Space → Folder
   - TreeSidebar hervorheben
   - "Hierarchische Struktur, aber organisch visualisiert"

3. **ChatDock (1:00)**
   - Öffne Chat
   - Frage: "Zeige mir alle Departments"
   - "AI-Assistentin kennt den Kontext"

4. **Intelligence (1:30)**
   - Zeige SynthesisPanel
   - Expand → Risks/Events
   - "Automatische Risk Detection aus Phase F"

5. **Mycelium (2:00)**
   - Enable V3 vorher!
   - Mouse bewegen → Parallax
   - Hover Cluster
   - "Semantic Clustering visualisiert"

6. **Finale (2:30)**
   - Zurück zum Root
   - "Alles connected - wie ein echtes Myzel"

---

## 🚢 Production Build

**Vor Demo:**

```bash
# Build checken
npm run build

# Expected:
#   ✓ Compiled successfully
#   ✓ No ESLint warnings
```

**If build fails:**
1. Check TypeScript errors: `npx tsc --noEmit`
2. Fix errors
3. Re-run build

---

## 📦 Project Structure

```
mora-ui/
├── app/
│   ├── page.tsx              # Entry point
│   └── home/page.tsx         # → MoraShell
├── components/
│   ├── layout/
│   │   ├── MoraShell.tsx     # Main layout
│   │   └── ViewPort.tsx      # 3D layer container
│   ├── organic/
│   │   ├── MyceliumOverlay.tsx    # V2 (current)
│   │   ├── MyceliumOverlayV3.tsx  # V3 (interactive)
│   │   └── NodeDetailPanel.tsx
│   ├── ui/
│   │   └── ChatDock.tsx      # AI Chat
│   └── intelligence/
│       └── SynthesisPanel.tsx # Intelligence Dashboard
├── lib/
│   ├── api/
│   │   ├── aiClient.ts       # Multi-Provider AI
│   │   ├── coreClient.ts     # Backend API
│   │   └── mindloopClient.ts # Intelligence API
│   ├── store/
│   │   └── moraState.ts      # Global state
│   └── types/
│       └── mindloop.ts       # Type definitions
└── .env.local                # CONFIG (create this!)
```

---

## 🎓 Next Phase (H - Optional)

**Planned Features:**
- Three.js 3D Force Graph
- Real-time collaboration
- Vector search in Chat
- Cluster navigation

---

**Questions?** Check:
- `PHASE_G_STATUS.md` - Implementation details
- `INTEGRATION_STATUS.md` - Backend API docs
- `.env.local.example` - All config options

**Issues?** See console:
- Browser: `F12` → Console tab
- Backend: Check terminal logs

---

**Status:** ✅ Ready for Demo  
**Last Test:** 2025-11-26  
**Demo Date:** Januar 2026 @ KI Garage Heilbronn

