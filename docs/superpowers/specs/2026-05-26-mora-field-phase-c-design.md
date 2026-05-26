# Môra Field Phase C — Design Spec

> **Status:** Approved  
> **Date:** 2026-05-26  
> **Context:** Môra Field v0.2 is live (Phase A: moraAgentClient.chat + cursorBridge). Phase C replaces the frontend AI call with a structured backend endpoint that owns LLM interaction and data-tool execution. The frontend hook interface stays identical — AmbientRoom never changes.

---

## Goal

Replace `useAmbientMora.sendToMora` (Phase A) with `POST /v3/mora/field`. The backend processes the user's voice message via LLM function calling, executes data tools server-side, and returns structured results. The frontend only handles pure UI actions (openPane, navigateToDepartment).

---

## Architecture

Two-phase flow preserves the confirmation UX from v0.2:

```
User speaks
    │
    ▼
POST /v3/mora/field   { message, context }
    │
    ├── FieldService:
    │   1. Load FieldToolRegistry (all tool schemas)
    │   2. Call LLM with message + tool schemas (Anthropic tool_use)
    │   3. LLM returns text OR tool_use blocks
    │   4. NO execution — plan only
    │
    └── { text, intent, pending_tools: [{tool, input, preview}] }
         │
         ▼
    AmbientIntentCard shows plan → user clicks Ausführen
         │
         ▼
POST /v3/mora/field/execute   { tools: [...] }
    │
    ├── FieldService:
    │   1. Execute data tools server-side
    │   2. Collect results
    │   3. Extract UI actions (openPane, navigate) → pass through
    │
    └── { results, ui_actions, summary }
         │
         ▼
    Frontend handles ui_actions (paneStore, navStore)
    Môra speaks summary
```

**Key rule:** `AmbientRoom.tsx` and `AmbientIntentCard.tsx` are never touched. Only `useAmbientMora.ts` changes.

---

## Backend Files

### New: `core/services/field_service.py`

Orchestrates LLM interaction and tool execution.

```python
class FieldService:
    async def plan(
        self,
        message: str,
        context: FieldContext,
        tenant_id: str,
        user_id: str,
    ) -> FieldResponse:
        """
        Call LLM with tool schemas. Return plan only — no side effects.
        """

    async def execute(
        self,
        tools: List[PendingTool],
        context: FieldContext,
        tenant_id: str,
        user_id: str,
    ) -> FieldExecuteResponse:
        """
        Execute data tools server-side. Pass UI actions through.
        """
```

- Uses `ModelProvider` (existing `core/engines/llm/provider.py`)
- Calls Anthropic with `tools=` parameter (function calling)
- Parses `tool_use` blocks from response

### New: `core/services/field_tools.py`

Tool registry: schemas for LLM + execution handlers.

**Tool categories:**

| Category | Tools | Execution |
|---|---|---|
| Data (backend) | `createNode`, `updateNode`, `createFolder`, `searchSemantic`, `searchByName`, `readNode`, `readFolder` | `FieldService.execute()` |
| UI (frontend) | `openPane`, `navigateToDepartment` | Returned as `ui_actions`, handled by `useAmbientMora` |

Each tool entry:
```python
{
    "name": "createNode",
    "description": "Erstellt einen neuen Node (Notiz, Dokument) in einem Ordner.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title":     {"type": "string"},
            "content":   {"type": "string"},
            "folder_id": {"type": "string"},
            "type":      {"type": "string", "enum": ["note", "document", "draft"]}
        },
        "required": ["title", "content", "folder_id"]
    },
    "category": "data"
}
```

### Modified: `core/api/v3/mora.py`

Add two routes:

```python
@router.post("/field", response_model=FieldResponse)
async def field_plan(body: FieldRequest, ctx: AuthContext):
    """LLM processes voice input, returns tool plan. No side effects."""

@router.post("/field/execute", response_model=FieldExecuteResponse)
async def field_execute(body: FieldExecuteRequest, ctx: AuthContext):
    """User confirmed — backend executes data tools, returns results + UI actions."""
```

---

## Data Contracts

### `POST /v3/mora/field`

```python
class FieldContext(BaseModel):
    active_department_id: Optional[str] = None
    active_folder_id:     Optional[str] = None
    company_id:           Optional[str] = None

class FieldRequest(BaseModel):
    message: str
    context: Optional[FieldContext] = None

class PendingTool(BaseModel):
    tool:    str   # "createNode", "openPane", …
    input:   dict  # tool-specific params
    preview: str   # "Note erstellen in R&D / Product"

class FieldResponse(BaseModel):
    text:          str                 # Môra's verbal response
    intent:        str                 # 1-sentence summary
    pending_tools: List[PendingTool]   # empty if text-only response
```

### `POST /v3/mora/field/execute`

```python
class FieldExecuteRequest(BaseModel):
    tools: List[PendingTool]

class ExecutionResult(BaseModel):
    tool:   str
    ok:     bool
    output: Optional[dict] = None
    error:  Optional[str]  = None

class UiAction(BaseModel):
    type:  str   # "openPane" | "navigateToDepartment"
    input: dict

class FieldExecuteResponse(BaseModel):
    results:    List[ExecutionResult]
    ui_actions: List[UiAction]
    summary:    str   # Môra speaks this
```

---

## Frontend Changes (useAmbientMora.ts only)

```typescript
// Phase C: sendToMora → POST /v3/mora/field
// Maps FieldResponse.pending_tools → AmbientToolCall[]
// pending_tools are passed to AmbientIntentCard as-is

// Phase C: executeMoraTools → POST /v3/mora/field/execute
// ui_actions handled locally (paneStore, navStore)
// data tool results → speak summary
// AmbientMoraResult interface unchanged
```

The `AmbientToolCall` union type stays as the internal mapping for UI actions only. Data tools are handled server-side and never appear as `AmbientToolCall`.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Empty message | 400 immediately |
| LLM returns no tool | `pending_tools: []`, text only → frontend loops to idle after 3s |
| Tool execution fails | `result.ok = false`, `summary` describes error, Môra speaks it |
| `POST /field` fails (500) | `useAmbientMora` sets `error` state → AmbientRoom shows retry |
| Unknown tool in execute | Logged, skipped, included in results with `ok: false` |
| LLM provider unavailable | 503, Môra: "Ich bin gerade nicht erreichbar." |

---

## Testing

### Backend
- `tests/test_field_service.py` — mock LLM provider, assert correct tool resolution per German intent
- `tests/test_field_endpoint.py` — HTTP integration tests: `/field` plan + `/field/execute` execution
- Key cases: createNode intent, openPane intent, mixed (data + UI), empty response, LLM error

### Frontend
- `__tests__/lib/hooks/useAmbientMora.test.ts` — existing 13 tests stay
- Add Phase C variant: mock `corePost('/v3/mora/field')` instead of `moraAgentClient.chat`
- Assert same `AmbientMoraResult` shape returned regardless of backend phase

---

## Migration Path

```
Phase A (current)
  useAmbientMora → moraAgentClient.chat + cursorBridge
  Frontend executes all tools

        ↓  only useAmbientMora.ts changes

Phase C (this spec)
  useAmbientMora → POST /v3/mora/field + /field/execute
  Backend executes data tools, frontend handles UI actions

        ↓  tool registry grows

Phase D (future)
  Streaming execution (SSE)
  Multi-turn conversation history
  Per-tool confirmation UI (RiskLevel from tool_contract.py)
```

---

## Out of Scope

- Streaming/SSE (Phase D)
- Multi-turn conversation history
- RiskLevel confirmation UI (WRITE / DESTRUCTIVE tools)
- Calendar / Mail integrations
- Tool execution journal integration (exists in backend, not surfaced in this spec)
