# SAIMOR Master Vision Plan 2026
**Erstellt**: 2026-02-04
**Aktualisiert**: 2026-02-05 (Verifiziert mit Codex)
**Version**: 1.1
**Autor**: Claude Code Agent + Codex
**Branch**: stabilize/beta-1.5

---

## EXECUTIVE SUMMARY

SAIMOR ist zu **60% produktionsbereit**. Architektur steht, aber viele UI-Features sind Platzhalter oder haben Bugs. Ehrliche Einschätzung nach Cross-Verification mit Codex.

### Status Heute (VERIFIZIERT):
- **Backend**: 7/10 - Funktional, multi-tenant, aber objects Tabelle leer, auth_sessions unbenutzt
- **Frontend**: 5/10 - Universe UI sieht gut aus, aber Finder/Upload/Search kaputt, viele Fake-Daten
- **Security**: 6/10 - Funktional, aber Hardening nötig
- **Deployment**: 4/10 - Server läuft, aber DNS falsch, 3 DB-Dateien, keine Backups
- **Documentation**: 7/10 - MASTERBIBLE gut, aber verstreut

---

## PHASE A: IMMEDIATE FIXES (Diese Woche)

### P0 - SECURITY CRITICAL

| Task | Datei | Status |
|------|-------|--------|
| `team_member` kann Companies löschen | `companies.py:739` | FIX NEEDED |
| Fehlende Permission-Check Department-Create | `departments.py:85` | FIX NEEDED |
| Keine Tenant-Validierung für company_id | `nodes.py:60-67` | FIX NEEDED |
| AGENTIC_EXECUTION aktiviert | `config.py:148` | DONE |

### P1 - CRASH PREVENTION

| Task | Datei | Status |
|------|-------|--------|
| `companies[0]` ohne Null-Check | `useAuthBootstrapper.ts:66` | FIX NEEDED |
| `companies[0]` ohne Null-Check | `ContextRail.tsx:66` | FIX NEEDED |
| `dept.name.toLowerCase()` ohne Null-Check | `UniverseView.tsx:386` | FIX NEEDED |

### P2 - HARDCODING CLEANUP

| Wert | Vorkommen | Lösung |
|------|-----------|--------|
| `'tenant-demo'` | 5+ Dateien | `constants.py` / `tenants.ts` |
| `'tenant-saimor-hq'` | 3+ Dateien | Zentralisieren |
| Authorized Emails | `auth.py:27-28` | Nach config.py verschieben |

---

## PHASE B: BETA POLISH (Nächste 2 Wochen)

### Frontend Refinements

1. **Planet.tsx** - Antigravity Feedback:
   - Hover-Effekte verfeinern
   - Glow-Intensity anpassen
   - Touch-Support verbessern

2. **Star.tsx** - Space-Darstellung:
   - Größen-Variationen für Content-Menge
   - Semantic Clustering visualisieren
   - Animation-Performance

3. **MindLoopTimeline** - Event-Feed:
   - Event-Diversität erhöhen (nicht nur "awareness")
   - Meaningful Events generieren
   - Scroll-Performance optimieren

4. **WebSocket Stability**:
   - Reconnect-Logic härten
   - Exponential Backoff implementieren
   - Connection-State visualisieren

### Backend Improvements

1. **MindLoop Events**:
   - Mehr Event-Typen aktiv nutzen
   - Spam-Prevention einbauen
   - Event-Retention Policy

2. **AI Provider Fallback**:
   - Health-Check Cache verbessern
   - Graceful Degradation testen
   - Response-Time Monitoring

3. **Database Performance**:
   - Weitere Indices erstellen
   - Query-Optimization für große Tenants
   - Connection Pooling für PostgreSQL

---

## PHASE C: PRODUCTION READINESS (Q1 2026)

### Infrastructure

1. **Backup Strategy**:
   - Automated SQLite snapshots
   - Off-site backup (S3/Hetzner Storage Box)
   - Point-in-time recovery testen

2. **Monitoring Stack**:
   - Prometheus + Grafana aktivieren
   - Alert-Rules definieren
   - Uptime-Monitoring (UptimeRobot/BetterStack)

3. **Secrets Management**:
   - .env durch Vault/Hetzner Secrets ersetzen
   - API Key Rotation Policy
   - Audit-Log für Secret-Access

4. **SSL/HTTPS**:
   - Caddy Let's Encrypt validieren
   - Certificate-Expiry Monitoring
   - HSTS Headers prüfen

### Security Hardening

1. **Rate Limiting**:
   - Per-User Limits
   - Per-Endpoint Limits
   - Abuse Detection

2. **Input Validation**:
   - All API Endpoints auditieren
   - SQL Injection Tests
   - XSS Prevention

3. **Audit Logging**:
   - Alle Write-Operations loggen
   - Login/Logout Events
   - Sensitive Operations (Delete, Share)

---

## PHASE D: KI GARAGE PITCH (Januar 2026)

### Demo-Flow Optimierung

```
1. WelcomeScreen → "Demo erkunden"
2. Universe Loading (3-5 Sek)
3. Simple Coffee Group Universe
   - 5 Planeten sichtbar
   - Mycelium-Linien aktiv
   - Orb pulsiert (Demo-State)
4. Navigation Demo:
   - Click auf "Operations" Planet
   - Zoom in auf Spaces (Moons)
   - Star (Folder) öffnen
5. MindLoop Showcase:
   - "3 untagged critical documents"
   - "Context Shift detected"
   - "Semantic cluster found"
6. Mora Chat:
   - "Was sind die Risiken in Finance?"
   - Tool-Execution live zeigen
7. Semantic Search:
   - "Kaffee Lieferanten" suchen
   - Resonance Engine zeigen
```

### Pitch-Material

- [ ] KI_GARAGE_PITCH_2026.md finalisieren
- [ ] Video-Demo aufnehmen (2-3 Min)
- [ ] Slide-Deck erstellen
- [ ] Competitive Analysis aktualisieren

---

## TECHNICAL DEBT REDUCTION

### Code Quality

| Bereich | Issue | Lösung |
|---------|-------|--------|
| Password Hashing | SHA256 statt bcrypt | Migration zu argon2 |
| Legacy Tables | `objects` vs `nodes` | Unified zu `nodes` |
| Duplicate Data | `semantic_events` | Merge zu `mindloop_events` |
| Race Conditions | `setTimeout` in UniverseView | Proper async/await |

### Architecture

| Bereich | Issue | Lösung |
|---------|-------|--------|
| WebSocket | Keine proper Reconnect-Logic | ReconnectingWebSocket |
| Caching | Inconsistent Cache Keys | Unified Cache Strategy |
| Error Handling | Uneinheitlich | Global Error Handler |

---

## METRICS & SUCCESS CRITERIA

### Beta Launch Criteria

- [ ] Zero P0 Security Issues
- [ ] <1% Crash Rate im Frontend
- [ ] <500ms API Response (95th percentile)
- [ ] 10 Pilot-User ohne Critical Bugs
- [ ] Demo-Flow funktioniert fehlerfrei

### Production Launch Criteria

- [ ] Automated Backups aktiv
- [ ] Monitoring mit Alerts
- [ ] <0.1% Error Rate
- [ ] 100+ concurrent Users getestet
- [ ] Security Audit bestanden

---

## RESOURCE REQUIREMENTS

### Q1 2026

| Ressource | Aktuell | Benötigt |
|-----------|---------|----------|
| Entwickler | 1 (Solo) | 2-3 |
| Designer | 0 | 1 (Part-time) |
| DevOps | 0 | 1 (Part-time) |
| Cloud Budget | ~50€/Monat | ~200€/Monat |

### KI Garage Ziele

1. **Mentoring**: Product-Market-Fit, Go-to-Market
2. **Netzwerk**: 10 Pilot-Kunden, Seed-Investoren
3. **Technisch**: ML-Expertise, Security Review
4. **Funding**: 100k€ Seed für Team-Aufbau

---

## APPENDIX: VERIFIZIERTE FAKTEN

### UI Status (Verifiziert 2026-02-05)

| Feature | Status | Details |
|---------|--------|---------|
| Finder Search | ❌ BUG → ✅ GEFIXT | War client-side auf leerem Tree, jetzt auto-load |
| Finder Upload | ❌ BUG → ✅ GEFIXT | Fehlendes `<input>` Element, jetzt wired zu API |
| Logo Upload | ⚠️ STUB → ✅ GEFIXT | War nur DataURL, jetzt echter Upload |
| Planet Stats (Volt/%) | ⚠️ FAKE | Seed-basierte Pseudowerte, kein Backend |
| System Insight (1.2TB) | ❌ FAKE → ✅ GEFIXT | War hardcoded, jetzt echte Store-Daten |
| Settings > Design | ✅ FUNKTIONIERT | Standard/Immersive Toggle mit localStorage |
| Settings > Team | ❌ PLACEHOLDER | "Coming in Phase 8" - leere Shell |
| Cursor-Arm aktiv | ❓ NICHT IM CODE | Text existiert nicht in Codebase |

### Backend Status
- **28 Tabellen** in saimor_universe.db (verifiziert)
- **objects Tabelle**: 0 Rows (legacy, leer)
- **nodes Tabelle**: 22 Rows (aktive Daten)
- **auth_sessions**: Schema da, 0 Rows (unbenutzt)
- **AGENTIC_EXECUTION**: `True` lokal, `False` auf Server (uncommitted)

### DNS Status (Verifiziert 2026-02-05)
| Domain | Zeigt auf | Korrekt? |
|--------|-----------|----------|
| api.saimor.world | 49.12.195.166 (Hetzner) | ✅ |
| saimor.world | 76.76.21.21 (Vercel) | ❌ |
| www.saimor.world | Vercel CNAME | ❌ |
| dashboard.saimor.world | Nicht aufgelöst | ❌ |

---

## DATABASE STATUS (Verifiziert 2026-02-05)

### Cleanup Performed (2026-02-04)
| Cleanup | Before | After | Verifiziert |
|---------|--------|-------|-------------|
| Orphan auth sessions | 3 | 0 | ✅ |
| tenant-default events | 735 | 0 | ✅ |
| Awareness spam events | 10,278 | 100 (kept) | ✅ (158 mit neuen) |
| Orphan spaces | 7 | Fixed | ✅ |
| Orphan files | 7 | Fixed | ✅ |
| **Total events** | **~11,013** | **158** (136 awareness + neue) | ✅ |

### KRITISCH: 3 DB-Dateien existieren!
| Datei | Größe | Companies | Nodes | Events | Status |
|-------|-------|-----------|-------|--------|--------|
| `data/saimor_universe.db` | 5.8 MB | 2 | 22 | 158 | **AKTIV** |
| `data/saimor.db` | 1.2 MB | 3 | 31 | 1970 | LEGACY - LÖSCHEN |
| `./saimor.db` (Root) | 1.2 MB | 3 | 103 | 1970 | LEGACY - LÖSCHEN |

### auth_sessions
- Tabelle existiert mit 12 Spalten
- **0 Einträge** - Modern Auth ist angelegt aber nicht aktiv
- System nutzt weiterhin JWT-only

---

## IMMEDIATE NEXT STEPS

1. **Heute**: Security Fixes (P0) in Backend
2. **Morgen**: Crash Fixes (P1) in Frontend
3. **Diese Woche**: Demo-Flow testen und polieren
4. **Nächste Woche**: Monitoring Stack aktivieren
5. **KI Garage**: Pitch-Material finalisieren

---

*Dieser Plan wird kontinuierlich aktualisiert. Letzte Änderung: 2026-02-04*
