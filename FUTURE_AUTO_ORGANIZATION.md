# 🤖 Auto-Organization Feature (Future Phase)

## User Requirement
**Problem:** System aktuell nutzt kryptische IDs für Ordner (z.B. `23121312bdfhsdn`)  
**Lösung:** Intelligente, menschenlesbare Namen + automatische Strukturerkennung

---

## Vision

### 1. Intelligente Ordnernamen
**Statt:**
```
/spaces/23121312bdfhsdn/folders/abc123def/nodes/xyz789
```

**Besser:**
```
/spaces/marketing/folders/q1-2024-kampagne/nodes/briefing-v2.md
```

**Implementierung:**
- Nutze `name` UND `slug` aus Backend
- Slug für URLs: `marketing-team-2024`
- Name für Anzeige: `Marketing Team 2024`
- ID nur intern für Datenbank

---

### 2. Auto-Organization beim Upload

**Szenario:** User lädt 100 Dateien hoch

**MÔRA analysiert:**
```
uploads/
├── budget-2024.xlsx
├── meeting-notes-jan.md
├── meeting-notes-feb.md
├── logo-draft-v1.png
├── logo-final.png
└── contract-partner-a.pdf
```

**MÔRA erstellt automatisch:**
```
/Finance/
  └── Budget 2024/
      └── budget-2024.xlsx

/Meetings/
  └── Notes/
      ├── meeting-notes-jan.md
      └── meeting-notes-feb.md

/Design/
  └── Logos/
      ├── logo-draft-v1.png
      └── logo-final.png

/Legal/
  └── Contracts/
      └── contract-partner-a.pdf
```

**Wie?**
1. **Dateinamen-Analyse:** Erkenne Muster (Datum, Kategorie, Version)
2. **Inhaltsprüfung:** Für Textdateien → Analyse wichtigster Keywords
3. **Metadata:** EXIF, Dateityp, Tags
4. **User-Feedback:** "Ist diese Struktur ok?" → Lernen

---

### 3. Relative Referenzen (wie Excel)

**Problem:** Absolute Pfade brechen beim Export/Migration

**Statt:**
```markdown
Siehe [Budget](/spaces/abc123/folders/xyz789/nodes/budget-2024)
```

**Besser:**
```markdown
Siehe [Budget](../../finance/budget-2024/budget-2024.xlsx)
```

**Vorteil:**
- ✅ Portabel (Ordner verschiebbar)
- ✅ Lesbar (klar wo es hinzeigt)
- ✅ Nachvollziehbar (andere verstehen die Struktur)

---

## Implementation Phases

### Phase A: Smart Naming (Post-Sprint)
**Backend:**
- ✅ Already exists: `name` + `slug` fields
- [ ] Auto-generate slugs from names
- [ ] Slug-Collision-Handling (`marketing` → `marketing-2`)

**Frontend:**
- [ ] Show `name` in UI, use `slug` in URLs
- [ ] Breadcrumbs with readable names
- [ ] URL: `/spaces/marketing/folders/q1-2024`

### Phase B: Auto-Organization Engine (Future Sprint)
**Intelligence Module:**
- [ ] File analyzer (name, type, content)
- [ ] Category detector (NLP/Keywords)
- [ ] Structure suggester
- [ ] User confirmation flow

**Backend:**
- [ ] Bulk-create endpoint
- [ ] Structure templates
- [ ] Auto-tagging

### Phase C: Relative References (Future Sprint)
**Backend:**
- [ ] Relative path resolver
- [ ] Link validator (broken link detection)

**Frontend:**
- [ ] Smart link editor (autocomplete relative paths)
- [ ] Link preview on hover

---

## API Design (Preview)

### POST /v1/intel/auto-organize
```json
{
  "upload_folder_id": "folder-abc",
  "nodes": [
    {"title": "budget-2024.xlsx", "type": "document"},
    {"title": "meeting-notes-jan.md", "type": "note"}
  ]
}
```

**Response:**
```json
{
  "suggested_structure": {
    "Finance": {
      "Budget 2024": ["budget-2024.xlsx"]
    },
    "Meetings": {
      "Notes": ["meeting-notes-jan.md"]
    }
  },
  "confidence": 0.85
}
```

**User confirms → System creates folders+moves nodes**

---

## Benefits

### Für User:
- 🧠 **Nachvollziehbar:** Jeder versteht die Struktur
- 🔍 **Durchsuchbar:** Semantische Namen statt IDs
- 🚀 **Schneller Setup:** Daten hochladen → Struktur fertig

### Für System:
- 📊 **Intelligence:** Lernt aus User-Feedback
- 🔗 **Robust:** Relative Links bleiben gültig
- 📈 **Skalierbar:** Struktur wächst logisch mit

---

## Next Steps

1. **Sprint Tag 1-10:** Basis-Features (Node-Access, Mindloop, Scan)
2. **Post-Sprint Review:** Auto-Organization Priorität festlegen
3. **Phase A Implementation:** Smart Naming first
4. **User Testing:** Feedback zu Auto-Suggestions
5. **Phase B+C Implementation:** Full Auto-Organization

---

**Status:** Documented for future implementation  
**Priority:** High (Post-Sprint-Phase)  
**Complexity:** Medium-High (NLP + UX Flow)
