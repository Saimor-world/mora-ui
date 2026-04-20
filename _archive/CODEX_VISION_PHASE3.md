# SAIMOR OS - Vision Document for Phase 3+
> **Status**: Nach DB-Konsolidierung (Block 2)
> **Ziel**: Production-Ready Admin & Management System
> **Kontext**: SAIMOR OS soll wie ein echtes Betriebssystem funktionieren

---

## 1. KERNPRINZIP: PERSISTENTE DATEN

### Was NICHT passieren darf:
```
FALSCH: Scripts bei jedem Start ausführen (seed_full_demo.py, create_hq.py)
FALSCH: Hardcoded Demo-Daten die bei jedem Neustart erscheinen
FALSCH: Daten die nur im Speicher existieren
```

### Was passieren MUSS:
```
RICHTIG: Daten werden EINMAL erstellt und existieren dann permanent
RICHTIG: Owner kann ALLES über die UI verwalten (wie macOS/Windows/Linux)
RICHTIG: Scripts sind NUR für initiale Dev-Setup gedacht, NICHT Production
```

### Datenfluss (Production):
```
[Initial Setup] → [DB: saimor_universe.db] → [API Endpoints] → [Frontend UI]
       ↑                    ↓                        ↓
   nur 1x!            Persistiert           CRUD via Settings
```

---

## 2. BESTANDSAUFNAHME: WAS EXISTIERT BEREITS

### Settings Pane (SettingsPane.tsx) - 800 Zeilen
| Tab | Status | Features |
|-----|--------|----------|
| **Profil** | Vorhanden | Avatar, Name, Email, Rolle anzeigen |
| **Design** | Vorhanden | Theme Switcher, Branding (Logo, Company Name), Interface Scale, Reduced Motion |
| **Mitteilungen** | Vorhanden | Auto-Execute Toggle, Desktop Notifications, Sound Effects |
| **Workspace** | Vorhanden | Department/Space rename & delete, Tree-View expandable |
| **Team** | Placeholder | Button zu TeamPane |
| **System** | Vorhanden | Environment, Version, Stats, Reset Button |

### Team Pane (TeamPane.tsx) - 864 Zeilen
| Feature | Status |
|---------|--------|
| Member List | Vorhanden mit Search & Filter |
| Presence/Status | Vorhanden (online/offline/away) |
| Direct Messages | Vorhanden (Realtime) |
| Team Room Chat | Vorhanden |
| Activity Feed | Vorhanden |
| Invite | Vorhanden (Email + Rolle) |

### Role-Based Access (bereits implementiert):
```typescript
canManageTeam = user.role in ['owner', 'admin', 'demo']
canViewSystem = user.role in ['owner', 'admin', 'demo']
canEditWorkspace = user.role in ['owner', 'admin', 'demo']
canEditBranding = user.role in ['owner', 'admin', 'system_owner']
```

---

## 3. WAS FEHLT (Gap Analysis)

### A) Companies Management
**Aktuell**: Company-Wechsel nur über Dock, kein Create/Delete/Edit
**Benötigt**:
- [ ] Companies Tab in Settings ODER separates Admin Panel
- [ ] Create Company (Name, Slug, Tenant-ID)
- [ ] Delete Company (mit Confirmation + Cascade-Delete)
- [ ] Edit Company (Name, Logo, Description)
- [ ] Company-Zuordnung zu Tenants

### B) User/Role Management
**Aktuell**: TeamPane zeigt User, aber keine Rolle-Änderung
**Benötigt**:
- [ ] Rolle eines Users ändern (member → admin → owner)
- [ ] User deaktivieren/entfernen
- [ ] Custom Roles definieren (optional Phase 4)
- [ ] Permissions Matrix anzeigen

### C) Departments/Spaces CRUD
**Aktuell**: Rename & Delete vorhanden
**Benötigt**:
- [ ] CREATE Department (fehlt komplett)
- [ ] CREATE Space (fehlt komplett)
- [ ] Farben/Icons zuweisen
- [ ] Drag & Drop Sortierung
- [ ] Visibility pro Rolle

### D) System Owner Features
**Aktuell**: Nur Reset-Button
**Benötigt**:
- [ ] Tenant Management (für Multi-Tenant)
- [ ] Audit Logs viewer
- [ ] System Health Dashboard
- [ ] Backup/Restore UI

---

## 4. ARCHITEKTUR-VISION

### Frontend Struktur:
```
SettingsPane.tsx
├── Profil Tab (existiert)
├── Design Tab (existiert)
├── Mitteilungen Tab (existiert)
├── Workspace Tab (erweitern)
│   ├── Departments verwalten
│   │   ├── Create Department [NEU]
│   │   ├── Edit (existiert)
│   │   └── Delete (existiert)
│   └── Spaces verwalten
│       ├── Create Space [NEU]
│       ├── Edit (existiert)
│       └── Delete (existiert)
├── Team Tab → TeamPane (existiert)
├── System Tab (erweitern für Owner)
│   ├── Stats (existiert)
│   ├── Companies [NEU - nur Owner]
│   │   ├── List all companies
│   │   ├── Create company
│   │   └── Delete company
│   └── Audit Logs [NEU - nur Owner]
└── About Tab (existiert)
```

### Backend Endpoints (prüfen/erstellen):
```
POST   /v1/departments          → Create Department
POST   /v1/spaces               → Create Space
GET    /v1/companies            → List (already exists)
POST   /v1/companies            → Create (check if exists)
DELETE /v1/companies/{id}       → Delete (check permissions)
PUT    /v1/users/{id}/role      → Change Role
GET    /v1/audit/logs           → Audit Trail
```

---

## 5. UI/UX PRINZIPIEN (wie echtes OS)

### macOS System Preferences Style:
- Sidebar mit Kategorien
- Hauptbereich rechts
- Confirmation Dialogs für destruktive Aktionen
- Undo wo möglich

### Windows Settings Style:
- Search Bar oben
- Breadcrumb Navigation
- "Advanced Settings" für Power User

### Linux (GNOME Settings):
- Klare Hierarchie
- Toggle Switches
- Keine versteckten Optionen

### SAIMOR-Spezifisch:
- Immersive Space Ästhetik beibehalten
- Emerald/Gold Farbschema
- Glassmorphism Panels
- Deutsche Sprache als Default

---

## 6. IMPLEMENTIERUNGS-REIHENFOLGE

### Phase 3A: Department/Space Create
```
1. Button "+" neben Department-Liste
2. Modal/Inline-Form für Name eingeben
3. API Call POST /v1/departments
4. Tree Refresh
```

### Phase 3B: Companies Tab (nur Owner)
```
1. Neuer Tab "Unternehmen" in Settings (nur für Owner sichtbar)
2. Liste aller Companies mit Edit/Delete
3. Create Company Form
4. Backend-Check: Existiert POST /v1/companies?
```

### Phase 3C: Role Management
```
1. TeamPane erweitern: Dropdown bei jedem User
2. Rolle wählbar: Member, Admin, Owner
3. API: PUT /v1/users/{id}/role
4. Confirmation für Owner-Downgrade
```

### Phase 3D: Audit & Logs
```
1. System Tab erweitern
2. Collapsible "Activity Log" Section
3. Backend: GET /v1/audit/logs?limit=50
4. Filter nach Action Type
```

---

## 7. BACKEND-CHECKLIST

### Vor Phase 3 sicherstellen:

| Endpoint | Status | Aktion |
|----------|--------|--------|
| POST /v1/departments | ? | Implementieren falls fehlt |
| POST /v1/spaces | ? | Implementieren falls fehlt |
| POST /v1/companies | ? | Check ob existiert |
| DELETE /v1/companies/{id} | Existiert | Permission-Check korrigiert in Phase 2 |
| PUT /v1/users/{id}/role | ? | Implementieren |
| GET /v1/audit/logs | ? | Implementieren |

### DB Schema Check:
```sql
-- Muss existieren:
companies (id, name, slug, tenant_id, logo_url, created_at)
departments (id, name, company_id, color, icon, sort_order)
spaces (id, name, department_id, sort_order)
users (id, email, name, role, tenant_id)
audit_logs (id, user_id, action, target_type, target_id, timestamp)
```

---

## 8. NICHT VERGESSEN

### Security:
- Jeder Endpoint prüft Tenant-Zugehörigkeit
- Owner-Actions nur für Owner
- Keine hardcoded Demo-Bypasses in Production

### UX:
- Loading States für alle Async-Actions
- Error Toasts mit klaren Meldungen
- Optimistic Updates wo sinnvoll
- Keyboard Shortcuts (Escape = Cancel, Enter = Confirm)

### Persistenz:
- Nach jeder CRUD-Action: DB-Write
- Kein State nur im Frontend halten
- Tree/List Refresh nach Änderungen

---

## 9. ZUSAMMENFASSUNG FÜR CODEX

**Nach Block 2 (DB-Konsolidierung) ist das Ziel:**

1. **Frontend erweitern**: Create Department/Space Buttons
2. **Companies verwalten**: Neuer Settings-Tab für Owner
3. **Rollen managen**: User-Rolle änderbar machen
4. **Scripts eliminieren**: Keine seed/create Scripts in Production
5. **Alles über UI**: Owner kann komplettes System via Settings steuern

**Das Endprodukt soll sich anfühlen wie:**
- macOS System Preferences
- Windows 11 Settings
- GNOME Control Center

**Nur halt schöner, weil SAIMOR.**

---

## 10. DATEIEN DIE GEÄNDERT WERDEN

### Frontend (mora-ui/):
- `components/panes/SettingsPane.tsx` - Erweitern mit Create-Buttons, Companies-Tab
- `components/panes/TeamPane.tsx` - Role-Dropdown hinzufügen
- `lib/api/coreClient.ts` - Neue API-Calls (createDepartment, createSpace, updateUserRole)

### Backend (saimor-core/):
- `core/api/v1/endpoints/departments.py` - POST implementieren
- `core/api/v1/endpoints/spaces.py` - POST implementieren (falls fehlt)
- `core/api/v1/endpoints/users.py` - PUT /role implementieren
- `core/api/v1/endpoints/audit.py` - GET /logs implementieren (optional)

---

*Dokument erstellt: 2026-02-06*
*Für: Server-Claude (Codex)*
*Von: Local-Claude (Vision)*
