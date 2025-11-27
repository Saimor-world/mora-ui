# PROMPT: Core-Agent für saimor-core (Phase G → H)

**Datum:** 2025-11-25  
**Phase:** G → H Vorbereitung (Chat/Inference Endpoints)

---

## 🎯 Deine Rolle

Du bist der **Core-Agent** für saimor-core (FastAPI Backend).

**WICHTIG:** Du arbeitest **NUR** in `c:\saimor\saimor-core\`

---

## 📊 IST-STAND (Phase F Complete)

### Was bereits funktioniert ✅
- **Core läuft:** `cd core && python run.py` → localhost:8081
- **Health:** `/health` → healthy
- **Multi-Tenant:** JWT Auth, Tenant-Isolation
- **Intelligence:** Mindloop Synthesis (Events, Aggregation, Scoring)
- **API:** `/v1/tree`, `/v1/departments`, `/v1/spaces`, `/v1/folders`, `/v1/nodes`
- **Mindloop:** `/v1/mindloop/synthesis`, `/v1/mindloop/events`, `/v1/mindloop/clusters`
- **Relations:** `/v1/relations/preview`

### Was FEHLT ❌
- **Chat/Inference Endpoints:** Noch nicht vorhanden (erst Phase G/H)
- **LLM-Provider:** Keine Ollama/Gemini Integration

---

## 📋 Deine Phase G → H Aufgaben

### H-01: Chat-Endpoint für Môra KI vorbereiten 🤖 MEDIUM PRIORITY

**Ziel:** `/v1/chat` Endpoint mit Mindloop-Context vorbereiten

**Hintergrund:**
- UI wird direkt mit LLM-Provider kommunizieren (Frontend-Integration)
- Core kann **optional** eigenen Chat-Endpoint bereitstellen (für spätere Server-seitige AI)
- Mindloop-Context soll integrierbar sein

**Tasks:**

1. **Chat-Endpoint-Struktur erstellen** (optional, für später)
   - Datei: `core/api/v1/chat.py` (NEU)
   - Router registrieren in `core/app.py`
   
2. **Endpoint-Schema**
   ```python
   # core/api/v1/chat.py
   from fastapi import APIRouter, Depends
   from pydantic import BaseModel
   from core.mindloop.intelligence import get_synthesis
   from core.auth import get_current_user
   
   router = APIRouter(prefix="/v1/chat", tags=["chat"])
   
   class ChatRequest(BaseModel):
       message: str
       context: dict | None = None  # {department_id, space_id, folder_id}
   
   class ChatResponse(BaseModel):
       reply: str
       context_used: dict
       synthesis_summary: dict | None = None
   
   @router.post("", response_model=ChatResponse)
   async def chat(
       req: ChatRequest,
       user = Depends(get_current_user)
   ):
       # Load Mindloop-Context
       synthesis = get_synthesis(user.tenant_id)
       
       # Mock-Response (für jetzt)
       reply = f"Môra (Mock): Du bist in {req.context}. Synthesis: {synthesis.get('summary', 'N/A')}"
       
       return ChatResponse(
           reply=reply,
           context_used=req.context or {},
           synthesis_summary=synthesis
       )
   ```

3. **Mindloop-Context Endpoint** (wichtiger!)
   - **BEREITS VORHANDEN:** `GET /v1/mindloop/synthesis`
   - UI kann das direkt nutzen für Context-Aware Prompts
   - Keine Änderung nötig

4. **ENV-Variablen** (für spätere LLM-Integration)
   - `.env.example`:
     ```env
     # LLM Provider (Phase H, optional)
     LLM_PROVIDER=none  # später: ollama, openai, anthropic
     LLM_API_KEY=
     LLM_MODEL=
     ```

**Erwartetes Ergebnis (jetzt):**
- **OPTIONAL:** `/v1/chat` Endpoint vorbereitet (Mock-Response)
- **WICHTIGER:** UI nutzt `/v1/mindloop/synthesis` für Context
- Struktur bereit für spätere Server-seitige AI

**Hinweis:** UI macht AI-Calls direkt (Frontend → Anthropic/Google/etc.)

---

### H-02: Relations → Field Preview Enhancement 🔗 LOW PRIORITY

**Ziel:** Relations-Endpoint optimieren (falls UI braucht)

**Aktuell:** `GET /v1/relations/preview` funktioniert

**Tasks:**
1. Performance-Checks
2. Mehr Relationstypen (falls nötig)

---

### H-03: Real-Revenue Aktivierung 💰 BLOCKED (niedriger)

**Status:** PostgreSQL Auth-Problem (md5 vs scram-sha-256)

**Nur falls User will:**
- PostgreSQL Auth klären
- `USE_REAL_REVENUE=true`

---

## 🔧 Development Workflow

### Start
```bash
cd c:\saimor\saimor-core\core
python run.py  # Port 8081
```

### Test
```bash
# Health
curl http://localhost:8081/health

# Synthesis
curl http://localhost:8081/v1/mindloop/synthesis \
  -H "Authorization: Bearer YOUR_JWT"

# Chat (nach Implementation)
curl -X POST http://localhost:8081/v1/chat \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hallo", "context": {"space_id": "..."}}'
```

---

## ✅ Erfolgs-Kriterien

Phase H Vorbereitung erfolgreich wenn:
- [ ] `/v1/chat` Endpoint existiert
- [ ] Mindloop-Context wird geladen
- [ ] Provider-Struktur vorbereitet (Ollama + Gemini Fallback)
- [ ] Smoke-Tests grün
- [ ] CORE_MASTER.md updated

---

## 📊 Output

Nach Abschluss:
1. **Code:** Committed (`feat(core): Chat endpoint + LLM provider structure`)
2. **Docs:** Update `CORE_MASTER.md` (Phase H Status)
3. **Test:** Smoke-Tests aktualisiert

---

**Phase:** G → H (Chat/Inference Vorbereitung)  
**LLM-Provider:** Ollama (lokal) + Gemini Fallback  
**Bereit für:** KI Garage Demo (Januar 2026)
