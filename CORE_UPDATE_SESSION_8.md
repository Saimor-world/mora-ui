# Môra UI - Core Update (Session 8)

**Datum:** 2025-01-18
**Von:** Claude Code
**An:** Saimor Core Team
**Status:** ✅ Features Ready for Integration

---

## 🌿 Zusammenfassung

Große UI-Überarbeitung mit **Organic Design Philosophy** + zwei kritische neue Features die Core-Integration erfordern:

1. **Real-Time Event System** (fertig)
2. **Filesystem Integration** (fertig)

---

## 1. 🔄 Real-Time Event System

### Was wurde gebaut:

**Intelligenter Polling Manager** (`lib/realtime.ts`):
- Polls Mind Loop Events & Synthesis alle 3 Sekunden
- Event Deduplication (nur neue Events werden emittiert)
- Exponential Backoff bei Fehlern (3s → 30s max)
- Auto-Reconnection
- Singleton Pattern mit Subscribe/Unsubscribe

**React Hooks** (`lib/hooks/useRealtime.ts`):
```tsx
const { events, synthesis, status } = useRealtime();
const realtimeStatus = useRealtimeStatus(); // nur connection status
const events = useRealtimeMindloopEvents(); // nur events
```

**Home Page Integration**:
- Live-Status-Indikator: "✅ Aktiv" / "🔄 Verbinde..." / "⏸️ Pausiert"
- Automatisches Start/Stop beim Mount/Unmount

### Was Core eventuell braucht:

**Option A: Aktueller Polling-Ansatz funktioniert:**
- ✅ Nutzt bestehende Endpoints: `/v1/mindloop/events`, `/v1/mindloop/synthesis`
- ✅ Keine Core-Änderungen nötig
- ❌ Aber: Höhere Serverlast bei vielen Clients

**Option B: WebSocket Upgrade (empfohlen für Production):**
```typescript
// Später: Einfacher Austausch des Backends
class WebSocketRealtimeManager extends RealtimeManager {
  connect() {
    const ws = new WebSocket('wss://core.saimor/v1/events/stream');
    ws.on('message', (data) => this.emit(JSON.parse(data)));
  }
}
```

**Neuer Core-Endpoint empfohlen:**
```
GET /v1/events/stream
WebSocket endpoint for real-time event streaming

Events:
- mindloop_event: New Mind Loop event
- mindloop_synthesis: New synthesis item
- object_created: New object in graph
- object_updated: Object modified
- object_deleted: Object removed
```

---

## 2. 📁 Filesystem Integration

### Was wurde gebaut:

**Modern File System Access** (`lib/filesystem/browser.ts`):
- Nutzt native **File System Access API** (Chrome, Edge, Safari 15.2+)
- Secure, permission-based zugriff auf lokale Dateien
- Recursive directory scanning
- File metadata extraction (name, size, type, modified date, path)
- Type-safe TypeScript interfaces

**React Hook** (`lib/hooks/useFilesystem.ts`):
```tsx
const { files, openDirectory, isScanning } = useFilesystem();

// Öffnet nativen Directory-Picker
await openDirectory({ maxDepth: 10, extensions: ['.md', '.txt'] });

// files: FileMetadata[] mit allen Dateien
```

**UI Component** (`components/filesystem/FilesystemBrowser.tsx`):
- Beautiful organic design (Môra-Style)
- File type statistics & visualization
- Size formatting, date formatting
- File icons based on extension
- Sortiert nach modified date

**Home Page Integration**:
- Neue Section mit Filesystem Browser
- User kann Ordner öffnen und Files durchsuchen
- Stats: Anzahl Dateien, Ordner, Gesamt-Größe, Top File Types

### Was Core braucht:

**Neuer Endpoint: File Sync to Core**
```
POST /v1/objects/batch/from-filesystem
Content-Type: application/json

Request:
{
  "source": "filesystem",
  "root_path": "/Users/mf4hr/Documents/Projects",
  "files": [
    {
      "path": "project1/README.md",
      "name": "README.md",
      "size": 1024,
      "type": "text/markdown",
      "modified": "2025-01-18T10:30:00Z",
      "content": "# Project 1\n\n...", // optional für text files
      "metadata": {
        "extension": ".md"
      }
    }
  ]
}

Response:
{
  "created": 42,
  "updated": 5,
  "skipped": 3,
  "objects": [
    {
      "id": "obj_abc123",
      "title": "README.md",
      "path": "project1/README.md"
    }
  ]
}
```

**Object Schema Erweiterung:**
```typescript
interface MoraObject {
  // Existing fields...

  // NEW: Source tracking
  source?: {
    type: 'filesystem' | 'notion' | 'email' | 'github' | 'manual';
    path?: string; // Filesystem path
    url?: string; // External URL
    sync_enabled?: boolean; // Auto-sync changes
    last_synced?: string; // ISO timestamp
  };

  // NEW: File-specific metadata
  file?: {
    size: number; // bytes
    mime_type: string;
    extension?: string;
    content?: string; // For text files
  };
}
```

**Watcher Endpoint (für Auto-Sync):**
```
POST /v1/sync/watch
{
  "source": "filesystem",
  "path": "/Users/mf4hr/Documents/Projects",
  "polling_interval": 60 // seconds
}

→ Core polls diese Directory regelmäßig und synct Änderungen
```

---

## 3. 🎨 Organic Design Evolution

### Komplette UI-Überarbeitung:

**Field Mode Mycelium:**
- Nodes atmen (3.3s Periode, individuell variiert)
- Biolumineszenz Glow (bis 65% Opazität)
- Sanftes Schwanken (2.5px) wie Zweige im Wind
- **Particle Flow** entlang Edges (leuchtende Nährstoffe)
- Stärkerer Mondlicht-Background (4 radiale Gradienten)

**Globales Design:**
- PanelCards: Wald-Farben, Backdrop Blur, Emerald-Glow
- Alle Transitions: 0.7s (statt 0.4s)
- Buttons: Gradienten, Emojis, hover:scale-105
- Natur-Metaphern statt Tech-Sprache

**Keine Core-Änderungen nötig** - rein Frontend.

---

## 4. 📋 Nächste Schritte (Priorisiert)

### Phase 1 - Core Integration (diese Woche):

1. ✅ **Real-Time Polling** (fertig, funktioniert mit aktuellen Endpoints)
2. ✅ **Filesystem Browser** (fertig, braucht `/v1/objects/batch/from-filesystem`)
3. ⏳ **Notion Integration** (nächster Schritt)
   - Braucht: `/v1/objects/batch/from-notion`
   - OAuth Flow oder API Key Setup
   - Page & Database Sync

### Phase 2 - Intelligence (nächste Wochen):

4. **MCP Integration** - Môra als MCP Server
   - Braucht eventuell: Core MCP Interface
   - Tool Endpoints für externe Clients

5. **Semantische Suche** - Vector DB Integration
   - Braucht: `/v1/search/semantic`
   - Embedding Generation (OpenAI/local)

6. **RAG Chat** - Context-Aware Conversation
   - Braucht: `/v1/chat/completion` mit RAG context

### Phase 3 - Scale & Features:

7. **Keyboard Shortcuts** - Vim-Mode
8. **Multi-Space Support** - Teams, Projekte
9. **Export/Import** - Markdown, JSON, PDF
10. **Performance** - 10k+ Nodes virtualisiert

---

## 5. 🚀 Action Items für Core

### Sofort (diese Session):

- [ ] **Review:** Real-Time Event System Design
  - Soll ich WebSocket Endpoint bauen oder bleibt Polling?

- [ ] **Review:** Filesystem Sync API Design
  - `/v1/objects/batch/from-filesystem` Endpoint Spec OK?
  - Object Schema Erweiterungen (`source`, `file`) OK?

### Diese Woche:

- [ ] **Implement:** Filesystem Batch Import Endpoint
- [ ] **Implement:** Source Tracking in Object Schema
- [ ] **Optional:** WebSocket Event Streaming Endpoint

### Nächste Woche:

- [ ] **Implement:** Notion Integration Endpoints
- [ ] **Implement:** Semantic Search (Vector DB)

---

## 6. 📝 Technische Details

### Dependencies (bereits installiert):
- Next.js 15.5.6
- React 19
- TypeScript 5.x
- TailwindCSS 3.4.x

### Browser Requirements:
- **File System Access API:**
  - Chrome 86+
  - Edge 86+
  - Safari 15.2+
  - Firefox: ❌ Not supported (Fallback: Traditional file input)

### Performance:
- Real-Time Polling: 3s interval = ~20 requests/minute/client
- Filesystem Scan: Async, non-blocking, max depth 10
- Memory: Event deduplication keeps last 1000 IDs in memory

---

## 7. 🤝 Fragen für Core Team

1. **Real-Time:** Polling OK oder soll ich WebSocket bauen?
2. **Filesystem Sync:** Soll Core aktiv watchen oder nur UI-triggered sync?
3. **Object Schema:** `source` und `file` fields OK oder andere Struktur?
4. **Notion:** OAuth Flow über Core oder direkt in UI?
5. **Vector DB:** Welche bevorzugt? (Qdrant, Weaviate, Pinecone, pgvector)

---

**Status:** ✅ UI Ready, wartet auf Core Endpoints
**Next Session:** Notion Integration + MCP Server Design

🌿 **Das Myzelium wächst!**
