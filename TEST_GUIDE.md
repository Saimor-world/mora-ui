# 🧪 Môra UI - Test Guide

**Status:** Core API ✅ | mora-ui ✅ | URL: http://localhost:3001

---

## ✅ Was FUNKTIONIERT (Bestätigt)

### 1. **API Connection**
- Core API auf Port 8081 läuft
- CORS konfiguriert für Port 3001
- JWT Token validiert
- Endpoints antworten:
  - `/v1/objects` → 7 mock objects
  - `/v1/snapshots` → 3 timeline snapshots (t0, t1, t2)
  - `/v1/relations` → Relational data

**Test:**
```bash
curl http://localhost:8081/v1/health
# Sollte zurückgeben: {"status":"ok","service":"mora-core"}
```

### 2. **Folder Mode - Tree View**
- ✅ Hierarchische Struktur sichtbar
- ✅ Expand/Collapse funktioniert
- ✅ Click auf Item zeigt Details im Context Panel

**Wie testen:**
1. Öffne http://localhost:3001
2. Links Panel: Stelle sicher "Folder Mode" ausgewählt ist
3. Im Canvas: Klicke auf "Tree View" Tab
4. Klicke auf Folder Icons zum Expand/Collapse
5. Klicke auf ein Item → Context Panel rechts sollte Details zeigen

### 3. **Folder Mode - List View**
- ✅ Flache Liste mit allen Objects
- ✅ Metadata (Type, Tags, Timestamp) sichtbar
- ✅ Click zeigt Details

**Wie testen:**
1. Im Canvas: Klicke auf "List View" Tab
2. Scroll durch die Liste
3. Klicke auf ein Item → Details rechts

### 4. **Insights Panel**
- ✅ Stats werden angezeigt
- ✅ Connection count
- ✅ Live/Offline Status Indicator

**Wie testen:**
1. Rechtes Panel sollte automatisch Statistiken zeigen
2. "7 Objects", "X Connections", etc.

---

## ⚠️ Was NICHT FUNKTIONIERT (Zu debuggen)

### **Field Mode - 3D Scene**
- ❌ 3D Szene lädt nicht / zeigt nicht
- Mögliche Ursachen:
  1. WebGL nicht aktiviert im Browser
  2. React Three Fiber Rendering-Error
  3. Canvas Component Mount-Problem
  4. GPU-Treiber Issue

**Debug Steps:**

#### 1. Browser Console checken
```
1. F12 drücken (DevTools öffnen)
2. "Console" Tab anklicken
3. Nach ROTEN Errors suchen, besonders:
   - "WebGL not supported"
   - "THREE" errors
   - "Canvas" errors
   - "Failed to compile shader"
```

#### 2. WebGL Support prüfen
```
1. Gehe zu: https://get.webgl.org/
2. Sollte einen rotierenden Würfel zeigen
3. Wenn nicht → GPU/Browser Problem
```

#### 3. React DevTools
```
1. Im DevTools: "Components" Tab
2. Suche nach "FieldMode3D" oder "Canvas" Component
3. Prüfe ob es "mounted" ist (grün)
4. Prüfe Props/State
```

---

## ⌨️ Keyboard Shortcuts

### **Aktuell implementiert:**
- Keine spezifischen Shortcuts definiert (noch)

### **3D Controls (wenn 3D funktioniert):**
- **Left Mouse Drag** → Rotate camera
- **Mouse Wheel** → Zoom in/out
- **Right Mouse Drag** → Pan camera (OrbitControls)

### **Geplante Shortcuts:**
- `Ctrl+F` → Search/Filter
- `Space` → Toggle Mode (Folder ↔ Field)
- `T` → Toggle Timeline (in Field Mode)
- `Escape` → Clear Selection

---

## 🔍 Detaillierte Test-Szenarien

### **Szenario 1: API Data Flow**
```
1. DevTools → Network Tab öffnen
2. Refresh Page (F5)
3. Filter auf "Fetch/XHR"
4. Sollte sehen:
   - GET /v1/objects (Status 200)
   - GET /v1/snapshots (Status 200)
5. Click auf Request → "Preview" Tab
   - Sollte JSON mit 7 objects zeigen
```

### **Szenario 2: Context Panel**
```
1. Folder Mode → Tree View
2. Click auf "docs" folder
3. Click auf "roadmap.md" item
4. Rechts Panel sollte zeigen:
   - Title: "roadmap.md"
   - Type: document
   - Path: /docs/roadmap.md
   - Tags: ["planning", "future"]
   - Timestamps
```

### **Szenario 3: Timeline (im 3D Mode - wenn funktioniert)**
```
1. Switch zu "Field Mode"
2. Unten sollte Timeline Slider sein
3. Drag Slider von t0 → t1 → t2
4. Nodes sollten erscheinen/verschwinden
5. Connections sollten animieren
```

---

## 🐛 Bekannte Issues & Workarounds

### Issue 1: "Port 3000 is in use"
- **Status:** ✅ Gelöst
- **Workaround:** Next.js nutzt automatisch Port 3001

### Issue 2: "Failed to fetch" / CORS Errors
- **Status:** ✅ Gelöst
- **Fix:** Port 3001 zu CORS allowed_origins hinzugefügt

### Issue 3: 3D Scene lädt nicht
- **Status:** ❌ Aktuelles Problem
- **Next Steps:**
  1. Browser Console Output posten
  2. WebGL Support prüfen (https://get.webgl.org/)
  3. Anderen Browser testen (Chrome/Edge bevorzugt)
  4. GPU-Treiber aktualisieren

### Issue 4: "Next.js 15.5.6 is outdated"
- **Status:** ⚠️ Warning (nicht kritisch)
- **Fix:** Später updaten mit `npm update next@latest`

---

## 📋 Quick Test Checklist

Teste in dieser Reihenfolge:

- [ ] **Core API läuft** (`curl http://localhost:8081/v1/health`)
- [ ] **mora-ui läuft** (http://localhost:3001 öffnet sich)
- [ ] **Home Page lädt** (kein "Failed to fetch")
- [ ] **Folder Mode → Tree View** funktioniert
- [ ] **Folder Mode → List View** funktioniert
- [ ] **Context Panel** zeigt Details bei Click
- [ ] **Insights Panel** zeigt Stats
- [ ] **Field Mode** Switch funktioniert (Button clickbar)
- [ ] **3D Scene** rendered (❌ aktuell nicht)
- [ ] **Timeline Slider** sichtbar (in Field Mode)

---

## 📊 Expected Data (Mock Data)

### Objects (7 total):
1. `obj_home` - root folder
2. `obj_docs` - docs folder
3. `obj_roadmap` - document (roadmap.md)
4. `obj_meeting_notes` - document (meeting.md)
5. `obj_projects` - projects folder
6. `obj_proj_alpha` - document (alpha.md)
7. `obj_external_link` - weblink (example.com)

### Snapshots (3 total):
- **t0**: 3 nodes, 2 connections (Initial State)
- **t1**: 5 nodes, 4 connections (Growth)
- **t2**: 7 nodes, 6 connections (Full Expansion)

### Relations:
- Type: "references", "derives_from", "related_to"
- Color-coded in 3D: Blue, Green, Orange

---

## 💡 Was als Nächstes testen?

### Priorität 1: 3D Debug
```
1. Öffne Browser DevTools (F12)
2. Gehe zu Console Tab
3. Switch zu "Field Mode"
4. Kopiere ALLE roten Errors
5. Poste hier für Diagnose
```

### Priorität 2: Workflow Runner
```
1. Rechts Panel → "Workflows" Tab
2. Sollte 3 Workflows zeigen:
   - Email Digest
   - Broadcast Doc
   - Duplicate Hunter
3. Click "Run" (wird nicht funktionieren ohne n8n Setup)
4. Sollte schöne Animation zeigen
```

### Priorität 3: Semantic Intelligence
```
# Noch nicht implementiert in UI
# Aber API Endpoints existieren:
curl -X POST http://localhost:8081/v1/semantic/suggest-broadcasts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sourceId": "obj_roadmap", "topN": 5}'
```

---

## 🆘 Troubleshooting Commands

### Check Processes
```bash
# Check if ports are in use
netstat -ano | findstr :3001
netstat -ano | findstr :8081

# Kill process if needed
taskkill /F /PID <PID>
```

### Restart Everything
```bash
# Terminal 1: Core API
cd C:/Users/mf4hr/saimor-core/core
python run.py

# Terminal 2: mora-ui
cd C:/mora-ui
npm run dev
```

### Clear Cache
```bash
# In mora-ui directory
rm -rf .next
npm run dev
```

---

**Last Updated:** 2025-11-05 19:45 CET
**Next Action:** Debug 3D Scene - Console Output benötigt!
