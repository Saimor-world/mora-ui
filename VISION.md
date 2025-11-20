# Môra Vision: Multi-Space Platform

**Datum:** 2025-01-18
**Status:** 🎯 Core Vision for Platform Architecture

---

## 🌳 Die große Vision

**Môra nicht als Single-User-App, sondern als White-Label Platform für beliebige Spaces/Kunden/Projekte.**

---

## 💡 Konzept: Isolierte Spaces

### Aktuell (Single Space):
```
Môra UI
└── Ein Myzelium mit allen Daten gemischt
```

### Vision (Multi-Space):
```
Môra UI
├── Space: Acme Corp 🏢
│   ├── Source: /Documents/Acme
│   ├── Source: Notion (Acme Workspace)
│   ├── Logo: acme-logo.png
│   ├── Brand Colors: #FF6B35, #004E89
│   ├── Field View → nur Acme Myzelium
│   └── 42 Dateien, 15 Notion Pages, 8 GitHub Repos
│
├── Space: StartupX 🚀
│   ├── Source: /Projects/StartupX
│   ├── Source: GitHub (StartupX Org)
│   ├── Logo: startupx.svg
│   ├── Brand Colors: #00D9FF, #7B2CBF
│   ├── Field View → nur StartupX Myzelium
│   └── 128 Dateien, 42 Issues, 12 PRs
│
└── Space: Personal 👤
    ├── Source: /Documents/Personal
    ├── Source: Gmail (personal@)
    ├── Field View → meine privaten Notizen
    └── 89 Dateien, 156 Emails
```

---

## 🎯 User Flow

### 1. Home → Space Selection
```
┌─────────────────────────────────────┐
│  Môra Home                          │
├─────────────────────────────────────┤
│                                     │
│  Deine Spaces:                      │
│                                     │
│  🏢 Acme Corp          [Öffnen]     │
│     42 Objekte · zuletzt: vor 2h    │
│                                     │
│  🚀 StartupX           [Öffnen]     │
│     128 Objekte · zuletzt: vor 5m   │
│                                     │
│  👤 Personal           [Öffnen]     │
│     89 Objekte · zuletzt: gestern   │
│                                     │
│  [+ Neuen Space erstellen]          │
│                                     │
└─────────────────────────────────────┘
```

### 2. Space Creation
```
┌─────────────────────────────────────┐
│  Neuen Space erstellen              │
├─────────────────────────────────────┤
│                                     │
│  Name: [Acme Corp               ]   │
│  Icon: [🏢] oder [Logo upload...]   │
│                                     │
│  Datenquellen verbinden:            │
│  ☑ Filesystem   → /Documents/Acme   │
│  ☑ Notion       → Acme Workspace    │
│  ☑ GitHub       → acme-org          │
│  ☐ Gmail                            │
│  ☐ Slack                            │
│                                     │
│  Brand Anpassung (optional):        │
│  Primary Color: [#FF6B35]           │
│  Logo: [acme-logo.png]              │
│                                     │
│  [Space erstellen]                  │
│                                     │
└─────────────────────────────────────┘
```

### 3. Field View (Space-Isolated)
```
┌─────────────────────────────────────┐
│  🏢 Acme Corp                        │
│  ← Zurück zu Spaces                 │
├─────────────────────────────────────┤
│                                     │
│  Field Mode (nur Acme Daten)        │
│                                     │
│    ◉ ─── ◉                          │
│   /│\   /│\                         │
│  ◉─◉─◉─◉─◉                          │
│     │   │                           │
│     ◉   ◉                           │
│                                     │
│  42 Objekte · 3 Quellen             │
│  Zuletzt: vor 2h                    │
│                                     │
└─────────────────────────────────────┘
```

---

## 🏗️ Technische Architektur

### Space Object Schema
```typescript
interface Space {
  id: string; // "space_acme_corp"
  name: string; // "Acme Corp"
  icon: string; // "🏢" or URL to logo

  // Branding (optional)
  branding?: {
    logo?: string; // URL or data URI
    primaryColor?: string; // #FF6B35
    secondaryColor?: string;
    theme?: 'light' | 'dark' | 'auto';
  };

  // Connected Sources
  sources: SpaceSource[];

  // Metadata
  created: Date;
  updated: Date;
  objectCount: number;
  lastSync: Date | null;

  // Settings
  settings: {
    autoSync: boolean;
    syncInterval?: number; // minutes
    notifications: boolean;
  };
}

interface SpaceSource {
  id: string;
  type: 'filesystem' | 'notion' | 'github' | 'gmail' | 'slack';
  name: string; // "Acme Documents"
  config: Record<string, unknown>; // Source-specific config
  enabled: boolean;
  lastSync: Date | null;
  objectCount: number;
}
```

### Space Isolation in Core API
```typescript
// Alle Core API Calls werden space-scoped:
GET /v1/spaces/{space_id}/objects
GET /v1/spaces/{space_id}/mindloop/events
GET /v1/spaces/{space_id}/mindloop/synthesis
POST /v1/spaces/{space_id}/objects/batch

// Cross-space search (optional, für Power Users):
GET /v1/search?query=...&spaces=acme,startupx
```

### UI Routing
```
/                    → Space Selection (Home)
/spaces              → Space Management
/spaces/new          → Create Space
/spaces/{id}         → Space Dashboard
/spaces/{id}/field   → Field Mode (space-isolated)
/spaces/{id}/folder  → Folder Mode (space-isolated)
/spaces/{id}/insights → Insights (space-isolated)
/spaces/{id}/chat    → Chat (space-isolated)
```

---

## 🎨 Branding Pro Space

### Logo Integration
```typescript
// Space kann Logo aus verschiedenen Quellen haben:

1. **Upload:** User uploaded logo.png
2. **Aus Source:** Wenn Filesystem hat "logo.png" im Root
3. **Notion:** Workspace Icon aus Notion API
4. **GitHub:** Org Avatar von GitHub API
5. **Default:** Emoji Icon (🏢)
```

### Color Themes
```typescript
// Jeder Space kann eigene Farben haben:

interface SpaceBranding {
  primaryColor: string; // Acme: #FF6B35
  secondaryColor: string; // Acme: #004E89

  // UI übernimmt diese Farben:
  // - Buttons
  // - Node Colors im Field
  // - Headers
  // - Status Badges
}
```

### Custom Background (optional)
```typescript
// Für Enterprise Kunden:
interface SpaceBranding {
  background?: {
    type: 'gradient' | 'image';
    value: string; // CSS gradient oder image URL
  };
}
```

---

## 🚀 Use Cases

### 1. Freelancer/Consultant
```
Spaces:
- Client A (🏢)
- Client B (🏭)
- Client C (🏪)
- Personal (👤)

→ Jeder Client komplett isoliert
→ Keine Datenvermischung
→ Professionell branded pro Client
```

### 2. Startup/Team
```
Spaces:
- Product (🚀)
- Marketing (📢)
- Engineering (⚙️)
- Operations (📊)

→ Teams arbeiten in eigenen Spaces
→ Optional: Cross-space search für Leadership
```

### 3. Enterprise
```
Spaces:
- Project Alpha (🔐)
- Project Beta (🔒)
- Company Docs (📚)
- HR (👥)

→ Strikte Isolation nach Projekt
→ Permissions & Access Control
→ Audit Logs pro Space
```

### 4. Personal Knowledge Base
```
Spaces:
- Work (💼)
- Personal (🏠)
- Hobbies (🎨)
- Learning (📖)

→ Saubere Trennung
→ Different search contexts
```

---

## 🔐 Security & Permissions (Future)

### Space-Level Permissions
```typescript
interface SpacePermission {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';

  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
    invite: boolean;
    manageSettings: boolean;
  };
}

// Multi-user Spaces:
Space "Acme Corp"
├── User A (owner)
├── User B (admin)
├── User C (member)
└── User D (viewer)
```

---

## 📋 Implementation Roadmap

### Phase 1: Foundation (diese Woche)
- [x] Single Space (aktueller Zustand)
- [ ] Space TypeScript Interfaces definieren
- [ ] Space Store (Zustand/localStorage)
- [ ] Space Selection UI (Home)

### Phase 2: Multi-Space Core (nächste Woche)
- [ ] Create/Delete Spaces
- [ ] Space-isolated Field View
- [ ] Space-isolated Data Sources
- [ ] Core API: Space-scoped endpoints

### Phase 3: Branding (Woche 3)
- [ ] Logo Upload/Detection
- [ ] Custom Colors pro Space
- [ ] Theme Switcher
- [ ] Space Settings Page

### Phase 4: Advanced (Woche 4+)
- [ ] Cross-space Search
- [ ] Space Templates
- [ ] Import/Export Spaces
- [ ] Multi-user/Permissions
- [ ] Space Analytics Dashboard

---

## 🎯 Immediate Next Steps

1. **Create Space Interfaces** (`lib/spaces/types.ts`)
2. **Space Store** (`store/spaces.ts`)
3. **Space Selection UI** (Home Page)
4. **Update Routing** (Space-aware URLs)
5. **Isolate Data Sources** (Filesystem, Notion per Space)

---

## 💭 Offene Fragen

1. **Storage:**
   - Spaces in localStorage? (Frontend-only)
   - Spaces in Core DB? (Server-sync)
   - Hybrid?

2. **Default Space:**
   - Immer "Personal" Space erstellen?
   - Oder User wählt beim ersten Start?

3. **Migration:**
   - Bestehende Daten → Default "Personal" Space?
   - Oder User fragt beim Upgrade?

4. **Naming:**
   - "Space" vs "Workspace" vs "Project" vs "Vault"?

---

**Status:** 🎯 Vision dokumentiert
**Next:** TypeScript Interfaces implementieren

🌳 **Môra wächst zu einer Platform!**
