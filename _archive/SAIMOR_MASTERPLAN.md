# SAIMOR MASTERPLAN v1.0
## 06.02.2026 - Desktop Claude + Server Claude

---

## VISION

SAIMOR ist ein **AI-First Operating System** für Unternehmen. Mora ist die zentrale Intelligenz die:
- Dokumente versteht und einordnet
- E-Mails liest und priorisiert (nach User-Bestätigung)
- Teams verbindet in virtuellen Räumen
- Cursor/Computer bedienen kann (Agent Mode)
- Alles in einer schönen, intuitiven UI

---

## AKTUELLER STATUS

### Was funktioniert:
- [x] Login mit demo@saimor.io / demo123
- [x] Universe View mit Planeten
- [x] Basic UI Shell (Dock, ContextRail, etc.)
- [x] Premium Intelligence Layer (CognitionBadge, ThoughtStream, etc.)
- [x] Keyboard Shortcuts (Cmd+K, Cmd+J, etc.)

### Was NICHT funktioniert:
- [ ] Header zeigt "SIMPLE COFFEE GROUP" statt Firmenname
- [ ] Planet Hover zeigt 0 Docs, 0% Health
- [ ] Finder nicht responsive, verbuggt
- [ ] Daten-Upload nicht funktional
- [ ] Team-Ansicht zeigt keine Mitglieder
- [ ] Keine E-Mail Integration
- [ ] Mora kann noch nichts "tun"

---

## PHASE 1: DATA FOUNDATION (Woche 1)
**Ziel:** Saubere Datenarchitektur, keine Chaos-DBs mehr

### 1.1 Database Cleanup
- [ ] **Single Source of Truth:** Docker SQLite mit persistentem Volume
- [ ] **Schema Documentation:** Alle Tabellen dokumentieren
- [ ] **Seed Script:** Reproducible Demo-Daten
- [ ] **Backup Strategy:** Taegliche Backups

### 1.2 API Stabilization
- [ ] **Core API:** Alle Endpoints dokumentieren
- [ ] **Error Handling:** Konsistente Fehler-Responses
- [ ] **Logging:** Strukturierte Logs fuer Debugging

### 1.3 Header/Context Fix
- [ ] Header zeigt echten Firmennamen aus DB
- [ ] Context-Navigation funktioniert korrekt

---

## PHASE 2: DOCUMENT LAYER (Woche 2)
**Ziel:** Dokumente hochladen, sehen, durchsuchen

### 2.1 Upload Pipeline
- [ ] Drag & Drop Upload in Department View
- [ ] File Type Validation (PDF, DOCX, TXT, Images)
- [ ] Progress Indicator
- [ ] Storage: S3/MinIO oder lokales Volume

### 2.2 Document Viewer
- [ ] PDF Viewer in-app
- [ ] Image Preview
- [ ] Text/Code Viewer
- [ ] Download Option

### 2.3 Finder Fix
- [ ] Responsive Layout
- [ ] Search funktioniert
- [ ] Filter nach Typ/Datum/Department
- [ ] Grid/List View Toggle

### 2.4 Planet Data
- [ ] Planet Hover zeigt echte Daten:
  - Docs: Anzahl Dokumente im Department
  - Health: Berechneter Score (Aktivitaet, Vollstaendigkeit)
  - Team: Anzahl Mitglieder
  - Recent Activity

---

## PHASE 3: TEAM LAYER (Woche 3)
**Ziel:** Teams sehen, Avatare, virtueller Raum

### 3.1 Team View
- [ ] Alle Teammitglieder pro Department
- [ ] Avatar Upload/Generierung
- [ ] Online/Offline Status
- [ ] Rolle anzeigen (Owner, Admin, Member)

### 3.2 TeamSpace (Virtual Room)
- [ ] 3D oder 2D Raum mit Avataren
- [ ] Presence: Wer ist gerade da?
- [ ] Quick Actions: Nachricht senden, Dokument teilen
- [ ] Voice Chat (optional, Phase 5)

### 3.3 Notifications
- [ ] In-App Notifications
- [ ] Browser Notifications (Permission)
- [ ] Notification Center in ContextRail

---

## PHASE 4: EMAIL INTEGRATION (Woche 4)
**Ziel:** Gmail verbinden, Mails in SAIMOR sehen

### 4.1 Gmail OAuth
- [ ] Google Cloud Project Setup
- [ ] OAuth Flow fuer User
- [ ] Token Storage (encrypted)
- [ ] Account: nextchaptergermany@gmail.com

### 4.2 Email Sync
- [ ] Inbox abrufen (Read-Only erstmal)
- [ ] Email List View
- [ ] Email Detail View
- [ ] Attachments anzeigen

### 4.3 Mora Email Intelligence
- [ ] Email Classification (nach User-Bestaetigung!)
- [ ] Priority Detection
- [ ] Auto-Tagging
- [ ] Suggested Actions

### 4.4 Notifications
- [ ] Neue E-Mail -> Push Notification
- [ ] Wichtige E-Mail -> Alert in UI
- [ ] Summary: "5 neue Mails, 2 wichtig"

---

## PHASE 5: MORA AGENT MODE (Woche 5-6)
**Ziel:** Mora kann Aktionen ausfuehren

### 5.1 Cursor/Computer Control
- [ ] MCP Server fuer Desktop Control
- [ ] Screen Reading
- [ ] Mouse/Keyboard Simulation
- [ ] Sandboxed Execution

### 5.2 Workflow Automation
- [ ] "Mora, erstelle einen Report aus diesen Dokumenten"
- [ ] "Mora, antworte auf diese E-Mail mit..."
- [ ] "Mora, plane ein Meeting mit dem Team"

### 5.3 Safety & Confirmation
- [ ] IMMER User-Bestaetigung vor Aktionen
- [ ] Audit Log: Was hat Mora getan?
- [ ] Rollback-Moeglichkeit
- [ ] Rate Limiting

---

## PHASE 6: POLISH & SCALE (Woche 7-8)
**Ziel:** Production-Ready

### 6.1 Performance
- [ ] Lazy Loading fuer grosse Datenmengen
- [ ] Caching Strategy
- [ ] CDN fuer Static Assets

### 6.2 Security Hardening
- [ ] Security Audit
- [ ] Penetration Testing
- [ ] GDPR Compliance
- [ ] Data Encryption at Rest

### 6.3 Multi-Tenant
- [ ] Proper Tenant Isolation
- [ ] Billing Integration (optional)
- [ ] Admin Dashboard

---

## ARCHITEKTUR DECISION RECORDS

### ADR-001: SQLite vs Postgres
**Entscheidung:** Hybrid
- Core: SQLite (einfach, schnell, ausreichend fuer single-writer)
- Gateway/Agents: Postgres (multi-tenant, concurrent)
- **Wichtig:** Persistente Volumes, keine Datenverlust bei Rebuild!

### ADR-002: Supabase?
**Entscheidung:** Nicht jetzt
- Aktuell: Eigene SQLite/Postgres reichen
- Spaeter: Supabase fuer Auth + Realtime wenn Multi-Tenant wichtig wird
- Vorteil: Weniger selbst managen
- Nachteil: Vendor Lock-in, Kosten

### ADR-003: File Storage
**Entscheidung:** MinIO (S3-compatible)
- Self-hosted, keine Cloud-Kosten
- S3 API kompatibel
- Kann spaeter zu AWS S3 migrieren

---

## SOFORT-FIXES (Heute)

### Fix 1: Header Company Name
**Problem:** Zeigt "SIMPLE COFFEE GROUP" statt echten Namen
**Ursache:** Hardcoded oder falscher API-Call
**Fix:** Company Name aus User-Context laden

### Fix 2: Planet Data
**Problem:** Hover zeigt 0 Docs, 0% Health
**Ursache:** API gibt keine Daten oder Frontend ignoriert sie
**Fix:** API pruefen -> Frontend verbinden

### Fix 3: Middleware (DONE)
**Problem:** /api/core war blockiert
**Fix:** /api/core zu PUBLIC_PREFIXES hinzugefuegt

---

## KOMMUNIKATION

### Desktop Claude (Ich)
- Frontend (TypeScript, React, Next.js)
- UI/UX Design
- Component Development
- Git Management

### Server Claude
- Backend (Python, FastAPI)
- Docker/Deployment
- Database Management
- API Development
- Infrastructure

### Workflow
1. User beschreibt Problem/Feature
2. Desktop Claude: UI-Aenderungen -> Git Push
3. Server Claude: Backend-Aenderungen + Deploy
4. User testet -> Feedback
5. Iterate

---

## NAECHSTE SCHRITTE

1. **JETZT:** Middleware-Fix committen
2. **JETZT:** Header + Planet Data fixen (Desktop Claude)
3. **SERVER:** DB Schema dokumentieren (Server Claude)
4. **MORGEN:** Phase 2 starten (Document Layer)

---

*Dieser Plan wird kontinuierlich aktualisiert.*
*Version 1.0 - 06.02.2026*
