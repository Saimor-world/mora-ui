# Môra Field Phase C Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `POST /v3/mora/field` and `POST /v3/mora/field/execute` to CORE so the frontend `useAmbientMora` hook can replace its current `moraAgentClient.chat + cursorBridge` Phase A implementation with a structured backend that uses Anthropic tool_use to resolve and execute OS actions.

**Architecture:** Two-phase flow: `/field` sends the user's voice message to Anthropic with tool schemas and returns a plan (no side effects); `/field/execute` takes the user-confirmed plan, executes data tools server-side, and returns results + UI actions for the frontend to handle. Frontend `useAmbientMora.ts` is the only file that changes — `AmbientRoom` and `AmbientIntentCard` stay untouched.

**Tech Stack:** FastAPI, Pydantic v2, `anthropic` SDK (already installed), `pytest` + `TestClient`. Frontend: TypeScript, `corePost` from `lib/api/http.ts`.

---

## File Map

**CORE (backend) — `C:/saimor/CORE/`:**
| File | Action | Responsibility |
|---|---|---|
| `core/services/field_tools.py` | Create | Tool schemas for Anthropic + execution handlers |
| `core/services/field_service.py` | Create | LLM orchestration + data-tool execution |
| `core/api/v3/mora.py` | Modify | Add `/field` + `/field/execute` routes |
| `tests/test_field_endpoint.py` | Create | HTTP integration tests |

**INTERFACE (frontend) — `C:/saimor/INTERFACE/`:**
| File | Action | Responsibility |
|---|---|---|
| `lib/hooks/useAmbientMora.ts` | Modify | Phase C: call `/v3/mora/field` instead of moraAgentClient |
| `__tests__/lib/hooks/useAmbientMora.test.ts` | Modify | Add Phase C test variants |

---

## Task 1: FieldToolRegistry

**Files:**
- Create: `C:/saimor/CORE/core/services/field_tools.py`
- Test: `C:/saimor/CORE/tests/test_field_tools.py`

- [ ] **Step 1: Write the failing test**

```python
# C:/saimor/CORE/tests/test_field_tools.py
import pytest
from services.field_tools import FieldToolRegistry, CATEGORY_DATA, CATEGORY_UI


def test_registry_contains_create_node():
    reg = FieldToolRegistry()
    names = [t["name"] for t in reg.schemas()]
    assert "createNode" in names


def test_registry_contains_ui_tools():
    reg = FieldToolRegistry()
    names = [t["name"] for t in reg.schemas()]
    assert "openPane" in names
    assert "navigateToDepartment" in names


def test_create_node_schema_has_required_fields():
    reg = FieldToolRegistry()
    schema = next(t for t in reg.schemas() if t["name"] == "createNode")
    required = schema["input_schema"]["required"]
    assert "title"     in required
    assert "folder_id" in required


def test_category_of_create_node_is_data():
    reg = FieldToolRegistry()
    assert reg.category("createNode") == CATEGORY_DATA


def test_category_of_open_pane_is_ui():
    reg = FieldToolRegistry()
    assert reg.category("openPane") == CATEGORY_UI


def test_category_of_unknown_tool_is_data():
    reg = FieldToolRegistry()
    assert reg.category("unknownTool") == CATEGORY_DATA
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd C:/saimor/CORE
python -m pytest tests/test_field_tools.py -v
```

Expected: `ModuleNotFoundError: No module named 'services.field_tools'`

- [ ] **Step 3: Implement `field_tools.py`**

```python
# C:/saimor/CORE/core/services/field_tools.py
"""
FieldToolRegistry — tool schemas for Anthropic tool_use + execution category mapping.

Data tools:  executed server-side by FieldService.execute()
UI tools:    returned as UiAction for the frontend to handle
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional

CATEGORY_DATA = "data"
CATEGORY_UI   = "ui"

# ── Tool schemas (Anthropic tool_use format) ─────────────────────────────────

_SCHEMAS: List[Dict[str, Any]] = [
    # ── Data tools ────────────────────────────────────────────────────────────
    {
        "name": "createNode",
        "description": "Erstellt einen neuen Node (Notiz, Dokument, Draft) in einem Ordner.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title":     {"type": "string",  "description": "Titel des neuen Nodes"},
                "content":   {"type": "string",  "description": "Inhalt des Nodes"},
                "folder_id": {"type": "string",  "description": "ID des Zielordners"},
                "type":      {"type": "string",  "enum": ["note", "document", "draft"],
                              "description": "Node-Typ (Standard: note)"},
            },
            "required": ["title", "content", "folder_id"],
        },
        "_category": CATEGORY_DATA,
    },
    {
        "name": "searchSemantic",
        "description": "Semantische Suche über alle Nodes im Workspace.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query":   {"type": "string",  "description": "Suchanfrage"},
                "top_k":   {"type": "integer", "description": "Max Ergebnisse (Standard: 5)"},
            },
            "required": ["query"],
        },
        "_category": CATEGORY_DATA,
    },
    {
        "name": "searchByName",
        "description": "Suche nach Nodes, Ordnern oder Spaces anhand ihres Namens.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Name oder Teilname"},
            },
            "required": ["name"],
        },
        "_category": CATEGORY_DATA,
    },
    {
        "name": "readNode",
        "description": "Liest den Inhalt eines Nodes.",
        "input_schema": {
            "type": "object",
            "properties": {
                "node_id": {"type": "string", "description": "Node-ID"},
            },
            "required": ["node_id"],
        },
        "_category": CATEGORY_DATA,
    },
    {
        "name": "readFolder",
        "description": "Listet alle Nodes in einem Ordner auf.",
        "input_schema": {
            "type": "object",
            "properties": {
                "folder_id": {"type": "string", "description": "Ordner-ID"},
            },
            "required": ["folder_id"],
        },
        "_category": CATEGORY_DATA,
    },
    {
        "name": "createFolder",
        "description": "Erstellt einen neuen Ordner in einem Space.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name":     {"type": "string", "description": "Ordner-Name"},
                "space_id": {"type": "string", "description": "ID des übergeordneten Space"},
            },
            "required": ["name", "space_id"],
        },
        "_category": CATEGORY_DATA,
    },
    {
        "name": "updateNode",
        "description": "Aktualisiert Titel oder Inhalt eines vorhandenen Nodes.",
        "input_schema": {
            "type": "object",
            "properties": {
                "node_id": {"type": "string", "description": "Node-ID"},
                "title":   {"type": "string", "description": "Neuer Titel (optional)"},
                "content": {"type": "string", "description": "Neuer Inhalt (optional)"},
            },
            "required": ["node_id"],
        },
        "_category": CATEGORY_DATA,
    },
    # ── UI tools (frontend handles these) ─────────────────────────────────────
    {
        "name": "openPane",
        "description": "Öffnet ein Pane im Saimôr OS (Finder, Dokument, Suche, Chat, …).",
        "input_schema": {
            "type": "object",
            "properties": {
                "pane_type": {"type": "string",
                              "enum": ["finder", "document", "search", "chat",
                                       "terminal", "settings", "calendar"],
                              "description": "Typ des Panes"},
                "title":     {"type": "string", "description": "Anzeigename (optional)"},
                "data":      {"type": "object", "description": "Pane-spezifische Daten (optional)"},
            },
            "required": ["pane_type"],
        },
        "_category": CATEGORY_UI,
    },
    {
        "name": "navigateToDepartment",
        "description": "Navigiert zu einem Department im Saimôr OS.",
        "input_schema": {
            "type": "object",
            "properties": {
                "department_id": {"type": "string", "description": "Department-ID"},
            },
            "required": ["department_id"],
        },
        "_category": CATEGORY_UI,
    },
]

# ── Registry ──────────────────────────────────────────────────────────────────

class FieldToolRegistry:
    """Provides Anthropic-compatible tool schemas and category lookup."""

    def schemas(self) -> List[Dict[str, Any]]:
        """Return schemas without internal _category key (Anthropic format)."""
        return [
            {k: v for k, v in tool.items() if k != "_category"}
            for tool in _SCHEMAS
        ]

    def category(self, tool_name: str) -> str:
        """Return CATEGORY_DATA or CATEGORY_UI for a given tool name."""
        for tool in _SCHEMAS:
            if tool["name"] == tool_name:
                return tool["_category"]
        return CATEGORY_DATA  # default: unknown tools are treated as data
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/saimor/CORE
python -m pytest tests/test_field_tools.py -v
```

Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
cd C:/saimor/CORE
git add core/services/field_tools.py tests/test_field_tools.py
git commit -m "feat(field): FieldToolRegistry — Anthropic tool schemas + category map"
```

---

## Task 2: FieldService — plan() and execute()

**Files:**
- Create: `C:/saimor/CORE/core/services/field_service.py`
- Test: `C:/saimor/CORE/tests/test_field_service.py`

- [ ] **Step 1: Write the failing tests**

```python
# C:/saimor/CORE/tests/test_field_service.py
"""
Tests for FieldService.plan() and FieldService.execute().

Strategy: mock the Anthropic client and NodeService/SearchService
so tests run without external deps.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from services.field_service import FieldService, FieldContext


# ── plan() tests ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_plan_returns_text_when_llm_returns_text_only():
    """LLM returns text block only → pending_tools is empty."""
    service = FieldService()

    mock_block = MagicMock()
    mock_block.type = "text"
    mock_block.text = "Verstanden."

    mock_response = MagicMock()
    mock_response.content = [mock_block]
    mock_response.stop_reason = "end_turn"

    with patch.object(service, "_call_llm", new=AsyncMock(return_value=mock_response)):
        result = await service.plan(
            message="Hallo",
            context=FieldContext(),
            tenant_id="t-1",
            user_id="u-1",
        )

    assert result.text == "Verstanden."
    assert result.pending_tools == []


@pytest.mark.asyncio
async def test_plan_extracts_tool_use_block():
    """LLM returns tool_use block → pending_tools contains one entry."""
    service = FieldService()

    text_block = MagicMock()
    text_block.type = "text"
    text_block.text = "Ich erstelle die Note."

    tool_block = MagicMock()
    tool_block.type = "tool_use"
    tool_block.name = "createNode"
    tool_block.input = {
        "title": "Sprint-Notiz",
        "content": "Ideen für Sprint 12",
        "folder_id": "f-abc",
    }

    mock_response = MagicMock()
    mock_response.content = [text_block, tool_block]
    mock_response.stop_reason = "tool_use"

    with patch.object(service, "_call_llm", new=AsyncMock(return_value=mock_response)):
        result = await service.plan(
            message="Erstelle eine Note über Sprint 12",
            context=FieldContext(active_folder_id="f-abc"),
            tenant_id="t-1",
            user_id="u-1",
        )

    assert result.text == "Ich erstelle die Note."
    assert len(result.pending_tools) == 1
    assert result.pending_tools[0].tool == "createNode"
    assert result.pending_tools[0].input["title"] == "Sprint-Notiz"
    assert result.pending_tools[0].preview != ""


@pytest.mark.asyncio
async def test_plan_empty_message_returns_empty():
    """Empty message → returns empty result without calling LLM."""
    service = FieldService()
    with patch.object(service, "_call_llm", new=AsyncMock()) as mock_llm:
        result = await service.plan(
            message="",
            context=FieldContext(),
            tenant_id="t-1",
            user_id="u-1",
        )
    mock_llm.assert_not_called()
    assert result.text == ""
    assert result.pending_tools == []


# ── execute() tests ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_execute_data_tool_calls_handler():
    """Data tool in pending_tools → execution handler is called."""
    from services.field_service import PendingTool
    service = FieldService()

    tool = PendingTool(
        tool="createNode",
        input={"title": "Test", "content": "Inhalt", "folder_id": "f-1"},
        preview="Node erstellen: Test",
    )

    mock_result = {"id": "n-123", "title": "Test", "status": "created"}
    with patch.object(service, "_execute_data_tool", new=AsyncMock(return_value=mock_result)):
        result = await service.execute(
            tools=[tool],
            context=FieldContext(),
            tenant_id="t-1",
            user_id="u-1",
        )

    assert len(result.results) == 1
    assert result.results[0].ok is True
    assert result.results[0].tool == "createNode"


@pytest.mark.asyncio
async def test_execute_ui_tool_becomes_ui_action():
    """UI tool in pending_tools → ends up in ui_actions, not results."""
    from services.field_service import PendingTool
    service = FieldService()

    tool = PendingTool(
        tool="openPane",
        input={"pane_type": "finder"},
        preview="Finder öffnen",
    )

    result = await service.execute(
        tools=[tool],
        context=FieldContext(),
        tenant_id="t-1",
        user_id="u-1",
    )

    assert len(result.ui_actions) == 1
    assert result.ui_actions[0].type == "openPane"
    assert result.results == []


@pytest.mark.asyncio
async def test_execute_data_tool_failure_returns_ok_false():
    """Handler raises → result.ok is False, no exception propagated."""
    from services.field_service import PendingTool
    service = FieldService()

    tool = PendingTool(
        tool="createNode",
        input={"title": "Test", "content": "X", "folder_id": "f-1"},
        preview="Node erstellen",
    )

    with patch.object(service, "_execute_data_tool",
                      new=AsyncMock(side_effect=Exception("DB error"))):
        result = await service.execute(
            tools=[tool],
            context=FieldContext(),
            tenant_id="t-1",
            user_id="u-1",
        )

    assert result.results[0].ok is False
    assert "DB error" in (result.results[0].error or "")
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd C:/saimor/CORE
python -m pytest tests/test_field_service.py -v
```

Expected: `ModuleNotFoundError: No module named 'services.field_service'`

- [ ] **Step 3: Implement `field_service.py`**

```python
# C:/saimor/CORE/core/services/field_service.py
"""
FieldService — orchestrates Môra Field LLM interaction and data-tool execution.

plan():    Call Anthropic with tool schemas → return PendingTool list (no side effects)
execute(): Execute data tools server-side → return results + UI actions for frontend
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from config import config
from services.field_tools import FieldToolRegistry, CATEGORY_DATA, CATEGORY_UI

logger = logging.getLogger("saimor.services.field_service")

# Anthropic availability guard (same pattern as ai_provider_service.py)
try:
    from anthropic import AsyncAnthropic
    _ANTHROPIC_AVAILABLE = True
except ImportError:
    AsyncAnthropic = None  # type: ignore
    _ANTHROPIC_AVAILABLE = False

_FIELD_MODEL = "claude-3-5-haiku-20241022"
_MAX_TOKENS  = 1024

_SYSTEM_PROMPT = (
    "Du bist Môra, die OS-Intelligenz von Saimôr. "
    "Der Nutzer spricht per Spracheingabe. "
    "Antworte knapp auf Deutsch. "
    "Wenn eine OS-Aktion sinnvoll ist, nutze die verfügbaren Tools. "
    "Führe nur Tools aus, die der Nutzer klar intendiert hat. "
    "Wenn keine Aktion nötig ist, antworte nur mit Text."
)

_registry = FieldToolRegistry()


# ── Pydantic models ───────────────────────────────────────────────────────────

class FieldContext(BaseModel):
    active_department_id: Optional[str] = None
    active_folder_id:     Optional[str] = None
    company_id:           Optional[str] = None


class PendingTool(BaseModel):
    tool:    str
    input:   Dict[str, Any]
    preview: str


class FieldResponse(BaseModel):
    text:          str
    intent:        str
    pending_tools: List[PendingTool] = []


class ExecutionResult(BaseModel):
    tool:   str
    ok:     bool
    output: Optional[Dict[str, Any]] = None
    error:  Optional[str]            = None


class UiAction(BaseModel):
    type:  str
    input: Dict[str, Any]


class FieldExecuteResponse(BaseModel):
    results:    List[ExecutionResult] = []
    ui_actions: List[UiAction]        = []
    summary:    str                   = ""


# ── Service ───────────────────────────────────────────────────────────────────

class FieldService:

    def __init__(self) -> None:
        self._client: Optional[Any] = None
        if _ANTHROPIC_AVAILABLE:
            api_key = getattr(config, "ANTHROPIC_API_KEY", None)
            if api_key:
                self._client = AsyncAnthropic(api_key=api_key)

    # ── plan ─────────────────────────────────────────────────────────────────

    async def plan(
        self,
        message: str,
        context: FieldContext,
        tenant_id: str,
        user_id: str,
    ) -> FieldResponse:
        if not message.strip():
            return FieldResponse(text="", intent="", pending_tools=[])

        # Add context hints to message
        ctx_parts: List[str] = []
        if context.active_folder_id:
            ctx_parts.append(f"[Aktiver Ordner: {context.active_folder_id}]")
        if context.active_department_id:
            ctx_parts.append(f"[Aktives Department: {context.active_department_id}]")
        full_message = " ".join(ctx_parts + [message]) if ctx_parts else message

        if not self._client:
            logger.warning("Anthropic client not available; returning text-only response")
            return FieldResponse(text=message, intent=message[:80], pending_tools=[])

        response = await self._call_llm(full_message)
        return self._parse_response(response)

    async def _call_llm(self, message: str) -> Any:
        """Call Anthropic messages.create. Extracted for easy mocking in tests."""
        return await self._client.messages.create(
            model=_FIELD_MODEL,
            max_tokens=_MAX_TOKENS,
            system=_SYSTEM_PROMPT,
            tools=_registry.schemas(),
            messages=[{"role": "user", "content": message}],
        )

    def _parse_response(self, response: Any) -> FieldResponse:
        text          = ""
        pending_tools: List[PendingTool] = []

        for block in response.content:
            if block.type == "text":
                text = block.text
            elif block.type == "tool_use":
                preview = _build_preview(block.name, block.input)
                pending_tools.append(PendingTool(
                    tool=block.name,
                    input=dict(block.input),
                    preview=preview,
                ))

        intent = _build_intent(pending_tools, text)
        return FieldResponse(text=text, intent=intent, pending_tools=pending_tools)

    # ── execute ───────────────────────────────────────────────────────────────

    async def execute(
        self,
        tools: List[PendingTool],
        context: FieldContext,
        tenant_id: str,
        user_id: str,
    ) -> FieldExecuteResponse:
        results:    List[ExecutionResult] = []
        ui_actions: List[UiAction]        = []

        for tool in tools:
            category = _registry.category(tool.tool)

            if category == CATEGORY_UI:
                ui_actions.append(UiAction(type=tool.tool, input=tool.input))
                continue

            # Data tool — execute server-side
            try:
                output = await self._execute_data_tool(
                    tool_name=tool.tool,
                    tool_input=tool.input,
                    context=context,
                    tenant_id=tenant_id,
                    user_id=user_id,
                )
                results.append(ExecutionResult(
                    tool=tool.tool, ok=True, output=output,
                ))
            except Exception as exc:
                logger.exception("field tool %s failed: %s", tool.tool, exc)
                results.append(ExecutionResult(
                    tool=tool.tool, ok=False, error=str(exc),
                ))

        summary = _build_summary(results, ui_actions)
        return FieldExecuteResponse(
            results=results, ui_actions=ui_actions, summary=summary,
        )

    async def _execute_data_tool(
        self,
        tool_name: str,
        tool_input: Dict[str, Any],
        context: FieldContext,
        tenant_id: str,
        user_id: str,
    ) -> Dict[str, Any]:
        """Dispatch to the correct service handler."""
        if tool_name == "createNode":
            return await self._create_node(tool_input, tenant_id)
        if tool_name == "searchSemantic":
            return await self._search_semantic(tool_input, tenant_id, user_id, context)
        if tool_name == "searchByName":
            return await self._search_by_name(tool_input, tenant_id)
        if tool_name == "readNode":
            return await self._read_node(tool_input, tenant_id)
        if tool_name == "readFolder":
            return await self._read_folder(tool_input, tenant_id)
        if tool_name == "createFolder":
            return await self._create_folder(tool_input, tenant_id, context)
        if tool_name == "updateNode":
            return await self._update_node(tool_input, tenant_id)
        raise ValueError(f"Unknown data tool: {tool_name}")

    # ── Individual data-tool handlers ─────────────────────────────────────────

    async def _create_node(
        self, inp: Dict[str, Any], tenant_id: str,
    ) -> Dict[str, Any]:
        from services.node_service import NodeService
        node = NodeService().create(tenant_id, {
            "title":     inp["title"],
            "content":   inp.get("content", ""),
            "folder_id": inp["folder_id"],
            "type":      inp.get("type", "note"),
        })
        return {"id": node.id, "title": node.title, "status": "created"}

    async def _search_semantic(
        self,
        inp: Dict[str, Any],
        tenant_id: str,
        user_id: str,
        context: FieldContext,
    ) -> Dict[str, Any]:
        from services.search_service import SearchService
        results = await SearchService().semantic_search(
            tenant_id=tenant_id,
            query=inp["query"],
            top_k=int(inp.get("top_k", 5)),
            user_id=user_id,
            company_id=context.company_id,
        )
        return {"results": results or [], "count": len(results or [])}

    async def _search_by_name(
        self, inp: Dict[str, Any], tenant_id: str,
    ) -> Dict[str, Any]:
        from services.node_service import NodeService
        nodes = NodeService().search_by_name(
            tenant_id=tenant_id, name=inp["name"], limit=10,
        )
        return {"results": [{"id": n.id, "title": n.title} for n in (nodes or [])]}

    async def _read_node(
        self, inp: Dict[str, Any], tenant_id: str,
    ) -> Dict[str, Any]:
        from services.node_service import NodeService
        node = NodeService().get(tenant_id, inp["node_id"])
        if not node:
            raise ValueError(f"Node {inp['node_id']} not found")
        return {"id": node.id, "title": node.title, "content": node.content or ""}

    async def _read_folder(
        self, inp: Dict[str, Any], tenant_id: str,
    ) -> Dict[str, Any]:
        from services.node_service import NodeService
        nodes = NodeService().get_by_folder(
            tenant_id=tenant_id, folder_id=inp["folder_id"],
        )
        return {"nodes": [{"id": n.id, "title": n.title} for n in (nodes or [])]}

    async def _create_folder(
        self, inp: Dict[str, Any], tenant_id: str, context: FieldContext,
    ) -> Dict[str, Any]:
        from services.folder_service import FolderService
        folder = FolderService().create(tenant_id, {
            "name":       inp["name"],
            "space_id":   inp["space_id"],
            "company_id": context.company_id or "",
        })
        return {"id": folder.id, "name": folder.name, "status": "created"}

    async def _update_node(
        self, inp: Dict[str, Any], tenant_id: str,
    ) -> Dict[str, Any]:
        from services.node_service import NodeService
        patch: Dict[str, Any] = {}
        if "title"   in inp: patch["title"]   = inp["title"]
        if "content" in inp: patch["content"] = inp["content"]
        NodeService().update(tenant_id, inp["node_id"], patch)
        return {"id": inp["node_id"], "status": "updated"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_preview(tool_name: str, inp: Dict[str, Any]) -> str:
    if tool_name == "createNode":
        return f"Node erstellen: „{inp.get('title', '?')}""
    if tool_name == "searchSemantic":
        return f"Suche: „{inp.get('query', '?')}""
    if tool_name == "searchByName":
        return f"Suche nach Name: „{inp.get('name', '?')}""
    if tool_name == "readNode":
        return f"Node lesen: {inp.get('node_id', '?')}"
    if tool_name == "readFolder":
        return f"Ordner öffnen: {inp.get('folder_id', '?')}"
    if tool_name == "createFolder":
        return f"Ordner erstellen: „{inp.get('name', '?')}""
    if tool_name == "updateNode":
        return f"Node aktualisieren: {inp.get('node_id', '?')}"
    if tool_name == "openPane":
        return f"{inp.get('pane_type', '?')} öffnen"
    if tool_name == "navigateToDepartment":
        return f"Department aufrufen: {inp.get('department_id', '?')}"
    return tool_name


def _build_intent(pending_tools: List[PendingTool], text: str) -> str:
    if not pending_tools:
        return text[:80]
    return pending_tools[0].preview


def _build_summary(
    results: List[ExecutionResult], ui_actions: List[UiAction],
) -> str:
    parts: List[str] = []
    for r in results:
        if r.ok:
            parts.append(f"{r.tool} erfolgreich.")
        else:
            parts.append(f"{r.tool} fehlgeschlagen: {r.error}")
    for a in ui_actions:
        parts.append(f"{a.type} wird geöffnet.")
    return " ".join(parts) or "Erledigt."
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/saimor/CORE
python -m pytest tests/test_field_service.py -v
```

Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
cd C:/saimor/CORE
git add core/services/field_service.py tests/test_field_service.py
git commit -m "feat(field): FieldService — LLM plan + data-tool execution"
```

---

## Task 3: Backend Endpoints

**Files:**
- Modify: `C:/saimor/CORE/core/api/v3/mora.py` (add two routes at end of file)
- Create: `C:/saimor/CORE/tests/test_field_endpoint.py`

- [ ] **Step 1: Write the failing tests**

```python
# C:/saimor/CORE/tests/test_field_endpoint.py
"""
HTTP integration tests for POST /v3/mora/field and /v3/mora/field/execute.
"""
import pytest
import uuid
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from app import app
from security import generate_test_token
from services.field_service import FieldResponse, PendingTool, FieldExecuteResponse, UiAction


def _headers(tenant_id: str, sub: str = "field-test-user") -> dict:
    token = generate_test_token(sub=sub, role="owner", tenant=tenant_id)
    return {"Authorization": f"Bearer {token}"}


TENANT = "field-test-tenant"
HEADERS = _headers(TENANT)
CLIENT = TestClient(app)


# ── /field (plan) ─────────────────────────────────────────────────────────────

def test_field_plan_returns_200_with_text_only():
    mock_result = FieldResponse(text="Verstanden.", intent="Verstanden.", pending_tools=[])
    with patch("api.v3.mora._field_service.plan", new=AsyncMock(return_value=mock_result)):
        resp = CLIENT.post("/v3/mora/field",
                           json={"message": "Hallo"},
                           headers=HEADERS)
    assert resp.status_code == 200
    body = resp.json()
    assert body["text"] == "Verstanden."
    assert body["pending_tools"] == []


def test_field_plan_returns_pending_tools():
    tool = PendingTool(
        tool="createNode",
        input={"title": "Notiz", "content": "X", "folder_id": "f-1"},
        preview="Node erstellen: „Notiz"",
    )
    mock_result = FieldResponse(
        text="Ich erstelle die Note.",
        intent="Node erstellen: „Notiz"",
        pending_tools=[tool],
    )
    with patch("api.v3.mora._field_service.plan", new=AsyncMock(return_value=mock_result)):
        resp = CLIENT.post(
            "/v3/mora/field",
            json={"message": "Erstelle eine Notiz", "context": {"active_folder_id": "f-1"}},
            headers=HEADERS,
        )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["pending_tools"]) == 1
    assert body["pending_tools"][0]["tool"] == "createNode"


def test_field_plan_requires_auth():
    resp = CLIENT.post("/v3/mora/field", json={"message": "test"})
    assert resp.status_code in (401, 403)


def test_field_plan_rejects_empty_message():
    resp = CLIENT.post("/v3/mora/field", json={"message": ""}, headers=HEADERS)
    assert resp.status_code == 400


# ── /field/execute ────────────────────────────────────────────────────────────

def test_field_execute_returns_200():
    mock_result = FieldExecuteResponse(
        results=[],
        ui_actions=[UiAction(type="openPane", input={"pane_type": "finder"})],
        summary="Finder wird geöffnet.",
    )
    with patch("api.v3.mora._field_service.execute", new=AsyncMock(return_value=mock_result)):
        resp = CLIENT.post(
            "/v3/mora/field/execute",
            json={"tools": [{"tool": "openPane",
                             "input": {"pane_type": "finder"},
                             "preview": "Finder öffnen"}]},
            headers=HEADERS,
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["ui_actions"][0]["type"] == "openPane"
    assert body["summary"] == "Finder wird geöffnet."


def test_field_execute_requires_auth():
    resp = CLIENT.post("/v3/mora/field/execute", json={"tools": []})
    assert resp.status_code in (401, 403)
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd C:/saimor/CORE
python -m pytest tests/test_field_endpoint.py -v
```

Expected: `FAILED — 404 Not Found` (routes don't exist yet)

- [ ] **Step 3: Add routes to `mora.py`**

Append to the end of `C:/saimor/CORE/core/api/v3/mora.py`:

```python
# ── Môra Field (Phase C) ──────────────────────────────────────────────────────

from services.field_service import (
    FieldService,
    FieldContext,
    FieldRequest as _FieldRequest,
    FieldResponse,
    FieldExecuteRequest as _FieldExecRequest,
    FieldExecuteResponse,
    PendingTool,
)

_field_service = FieldService()


class FieldRequest(BaseModel):
    message: str
    context: Optional[FieldContext] = None


class FieldExecuteRequest(BaseModel):
    tools: list[PendingTool]


@router.post("/field", response_model=FieldResponse)
async def field_plan(
    body: FieldRequest,
    ctx: AuthContext = Depends(get_auth_context),
) -> FieldResponse:
    """
    Phase C — Môra Field: LLM processes voice input, returns tool plan.
    No side effects. User must confirm via /field/execute.
    """
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    try:
        return await _field_service.plan(
            message=body.message,
            context=body.context or FieldContext(),
            tenant_id=ctx.tenant_id,
            user_id=ctx.user_id,
        )
    except Exception as exc:
        logger.exception("field plan failed for user=%s: %s", ctx.user_id, exc)
        raise HTTPException(status_code=500, detail="field plan failed")


@router.post("/field/execute", response_model=FieldExecuteResponse)
async def field_execute(
    body: FieldExecuteRequest,
    ctx: AuthContext = Depends(get_auth_context),
) -> FieldExecuteResponse:
    """
    Phase C — Môra Field: User confirmed. Execute data tools server-side.
    Returns results + UI actions for the frontend.
    """
    try:
        return await _field_service.execute(
            tools=body.tools,
            context=FieldContext(),
            tenant_id=ctx.tenant_id,
            user_id=ctx.user_id,
        )
    except Exception as exc:
        logger.exception("field execute failed for user=%s: %s", ctx.user_id, exc)
        raise HTTPException(status_code=500, detail="field execute failed")
```

Note: also add `Optional` to imports at top of `mora.py` if not already there:
```python
from typing import Optional, Dict, Any, List
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/saimor/CORE
python -m pytest tests/test_field_endpoint.py -v
```

Expected: `7 passed`

- [ ] **Step 5: Run full backend test suite**

```bash
cd C:/saimor/CORE
python -m pytest tests/ -v --tb=short 2>&1 | tail -20
```

Expected: no new failures.

- [ ] **Step 6: Commit**

```bash
cd C:/saimor/CORE
git add core/api/v3/mora.py tests/test_field_endpoint.py
git commit -m "feat(field): POST /v3/mora/field + /field/execute endpoints"
```

---

## Task 4: Frontend — useAmbientMora Phase C

**Files:**
- Modify: `C:/saimor/INTERFACE/lib/hooks/useAmbientMora.ts`
- Modify: `C:/saimor/INTERFACE/__tests__/lib/hooks/useAmbientMora.test.ts`

- [ ] **Step 1: Add Phase C failing tests to existing test file**

Open `C:/saimor/INTERFACE/__tests__/lib/hooks/useAmbientMora.test.ts`.

Add this import block at the top after the existing mocks:

```typescript
import { corePost } from '@/lib/api/http';

jest.mock('@/lib/api/http', () => ({
    corePost: jest.fn(),
}));

const mockCorePost = corePost as jest.MockedFunction<typeof corePost>;
```

Add this new `describe` block at the end of the file (after the existing tests):

```typescript
describe('useAmbientMora — Phase C (backend)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('sendToMora calls POST /v3/mora/field with transcript', async () => {
        mockCorePost.mockResolvedValue({
            text: 'Verstanden.',
            intent: 'Antwort',
            pending_tools: [],
        });
        const { result } = renderHook(() => useAmbientMora({ phase: 'c' }));
        await act(async () => {
            await result.current.sendToMora('Hallo Môra');
        });
        expect(mockCorePost).toHaveBeenCalledWith(
            '/v3/mora/field',
            expect.objectContaining({ message: 'Hallo Môra' }),
        );
    });

    it('sendToMora maps pending_tools to AmbientToolCall[]', async () => {
        mockCorePost.mockResolvedValue({
            text: 'Ich öffne den Finder.',
            intent: 'Finder öffnen',
            pending_tools: [{
                tool: 'openPane',
                input: { pane_type: 'finder' },
                preview: 'Finder öffnen',
            }],
        });
        const { result } = renderHook(() => useAmbientMora({ phase: 'c' }));
        let res: any;
        await act(async () => {
            res = await result.current.sendToMora('Öffne den Finder');
        });
        expect(res.toolCalls).toHaveLength(1);
        expect(res.toolCalls[0]).toMatchObject({ tool: 'openPane' });
    });

    it('executeMoraTools posts to /v3/mora/field/execute for data tools', async () => {
        mockCorePost.mockResolvedValue({
            results: [{ tool: 'createNode', ok: true, output: { id: 'n-1' } }],
            ui_actions: [],
            summary: 'Node erstellt.',
        });
        const { result } = renderHook(() => useAmbientMora({ phase: 'c' }));
        await act(async () => {
            await result.current.executeMoraTools([{
                tool: 'createNode',
                input: { title: 'T', content: 'C', folder_id: 'f-1' },
            }]);
        });
        expect(mockCorePost).toHaveBeenCalledWith(
            '/v3/mora/field/execute',
            expect.objectContaining({ tools: expect.any(Array) }),
        );
    });

    it('executeMoraTools handles ui_actions from execute response', async () => {
        mockCorePost.mockResolvedValue({
            results: [],
            ui_actions: [{ type: 'openPane', input: { pane_type: 'finder' } }],
            summary: 'Finder öffnen.',
        });
        const { result } = renderHook(() => useAmbientMora({ phase: 'c' }));
        await act(async () => {
            await result.current.executeMoraTools([{
                tool: 'openPane',
                input: { type: 'finder' },
            }]);
        });
        expect(mockOpenPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'finder' }),
        );
    });
});
```

- [ ] **Step 2: Run to verify new tests fail**

```bash
cd C:/saimor/INTERFACE
npx jest --no-coverage --testPathPattern="useAmbientMora" --runInBand 2>&1 | tail -15
```

Expected: Phase C tests fail with type errors (no `phase` param yet).

- [ ] **Step 3: Update `useAmbientMora.ts` with Phase C support**

Replace the entire content of `C:/saimor/INTERFACE/lib/hooks/useAmbientMora.ts`:

```typescript
"use client";

/**
 * useAmbientMora — supports Phase A and Phase C.
 *
 * Phase A (default):  moraAgentClient.chat + cursorBridge.parseAIResponse
 * Phase C:            POST /v3/mora/field + POST /v3/mora/field/execute
 *
 * Migration: pass { phase: 'c' } to switch to the backend.
 * AmbientRoom and AmbientIntentCard never change — the hook is the seam.
 */

import { useCallback, useState } from 'react';
import { corePost } from '@/lib/api/http';
import { moraAgentClient, buildChatContext } from '@/lib/api/moraAgentClient';
import { parseAIResponse } from '@/lib/ai/cursorBridge';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { useNavStore } from '@/lib/store/navStore';

// ─── Public types ─────────────────────────────────────────────────────────────

export type AmbientToolCall =
    | { tool: 'createNode';            input: { title: string; content: string; folder_id: string } }
    | { tool: 'openPane';              input: { type: string; title?: string; data?: Record<string, unknown> } }
    | { tool: 'navigateToDepartment';  input: { departmentId: string } }
    | { tool: 'searchGlobal';          input: { query: string } }
    | { tool: string;                  input: Record<string, unknown> };  // Phase C passthrough

export interface AmbientMoraResult {
    text: string;
    toolCalls: AmbientToolCall[];
    intent: string;
}

export interface UseAmbientMoraOptions {
    phase?: 'a' | 'c';
}

export interface UseAmbientMoraReturn {
    sendToMora: (transcript: string, defaultFolderId?: string | null) => Promise<AmbientMoraResult>;
    executeMoraTools: (calls: AmbientToolCall[]) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAmbientMora(
    options: UseAmbientMoraOptions = {},
): UseAmbientMoraReturn {
    const { phase = 'a' } = options;
    const [isLoading, setIsLoading] = useState(false);
    const [error,     setError]     = useState<string | null>(null);

    // ── sendToMora ────────────────────────────────────────────────────────────
    const sendToMora = useCallback(
        async (transcript: string, defaultFolderId?: string | null): Promise<AmbientMoraResult> => {
            if (!transcript.trim()) {
                return { text: '', toolCalls: [], intent: '' };
            }

            setIsLoading(true);
            setError(null);

            try {
                if (phase === 'c') {
                    return await _sendPhaseC(transcript, defaultFolderId);
                }
                return await _sendPhaseA(transcript, defaultFolderId);
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
                setError(msg);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [phase],
    );

    // ── executeMoraTools ──────────────────────────────────────────────────────
    const executeMoraTools = useCallback(
        async (calls: AmbientToolCall[]): Promise<void> => {
            if (phase === 'c') {
                await _executePhaseC(calls);
                return;
            }
            await _executePhaseA(calls);
        },
        [phase],
    );

    return { sendToMora, executeMoraTools, isLoading, error };
}

// ─── Phase A implementation ────────────────────────────────────────────────

async function _sendPhaseA(
    transcript: string,
    defaultFolderId?: string | null,
): Promise<AmbientMoraResult> {
    const response = await moraAgentClient.chat({
        message: transcript,
        context: buildChatContext(),
    });

    const rawText = response.response ?? '';
    const { cleanContent, commands } = parseAIResponse(rawText);

    const toolCalls: AmbientToolCall[] = [];
    for (const cmd of commands) {
        if (cmd.type === 'navigate' && cmd.target) {
            toolCalls.push({ tool: 'navigateToDepartment', input: { departmentId: cmd.target } });
        } else if (cmd.type === 'pane' && cmd.paneType) {
            toolCalls.push({ tool: 'openPane', input: { type: cmd.paneType, data: cmd.data ?? {} } });
        }
    }

    if (toolCalls.length === 0 && defaultFolderId) {
        toolCalls.push({
            tool:  'createNode',
            input: { title: transcript.trim().slice(0, 100), content: transcript.trim(), folder_id: defaultFolderId },
        });
    }

    return {
        text:      cleanContent || rawText,
        toolCalls,
        intent:    _buildIntentA(toolCalls, transcript),
    };
}

async function _executePhaseA(calls: AmbientToolCall[]): Promise<void> {
    for (const call of calls) {
        switch (call.tool) {
            case 'createNode': {
                await useMoraStore.getState().addNode({
                    title: (call.input as any).title, content: (call.input as any).content,
                    folder_id: (call.input as any).folder_id, type: 'note',
                });
                break;
            }
            case 'openPane': {
                usePaneStore.getState().openPane({
                    id: `ambient-${(call.input as any).type}-${Date.now()}`,
                    type: (call.input as any).type as any,
                    title: (call.input as any).title ?? (call.input as any).type,
                    size: { width: 900, height: 650 },
                    data: (call.input as any).data ?? {},
                });
                break;
            }
            case 'navigateToDepartment': {
                useNavStore.getState().navigateToDepartment((call.input as any).departmentId);
                break;
            }
            case 'searchGlobal': {
                usePaneStore.getState().openPane({
                    id: `ambient-search-${Date.now()}`, type: 'search' as any,
                    title: 'Suche', size: { width: 860, height: 620 },
                    data: { query: (call.input as any).query },
                });
                break;
            }
        }
    }
}

// ─── Phase C implementation ────────────────────────────────────────────────

async function _sendPhaseC(
    transcript: string,
    defaultFolderId?: string | null,
): Promise<AmbientMoraResult> {
    const body: Record<string, unknown> = { message: transcript };
    if (defaultFolderId) body.context = { active_folder_id: defaultFolderId };

    const resp = await corePost('/v3/mora/field', body) as any;

    // Map pending_tools → AmbientToolCall[]
    const toolCalls: AmbientToolCall[] = (resp.pending_tools ?? []).map((pt: any) => ({
        tool:  pt.tool,
        input: _remapInput(pt.tool, pt.input),
    }));

    return {
        text:      resp.text      ?? '',
        intent:    resp.intent    ?? '',
        toolCalls,
    };
}

async function _executePhaseC(calls: AmbientToolCall[]): Promise<void> {
    const tools = calls.map(c => ({
        tool:    c.tool,
        input:   c.input,
        preview: '',
    }));

    const resp = await corePost('/v3/mora/field/execute', { tools }) as any;

    // Handle UI actions returned from backend
    for (const action of (resp.ui_actions ?? [])) {
        if (action.type === 'openPane') {
            const inp = action.input as any;
            usePaneStore.getState().openPane({
                id:    `ambient-${inp.pane_type}-${Date.now()}`,
                type:  inp.pane_type as any,
                title: inp.title ?? inp.pane_type,
                size:  { width: 900, height: 650 },
                data:  inp.data ?? {},
            });
        } else if (action.type === 'navigateToDepartment') {
            useNavStore.getState().navigateToDepartment(action.input.department_id);
        }
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise backend tool input keys to match AmbientToolCall shapes. */
function _remapInput(tool: string, input: Record<string, unknown>): Record<string, unknown> {
    if (tool === 'openPane' && input.pane_type) {
        return { ...input, type: input.pane_type };
    }
    if (tool === 'navigateToDepartment' && input.department_id) {
        return { ...input, departmentId: input.department_id };
    }
    return input;
}

function _buildIntentA(calls: AmbientToolCall[], transcript: string): string {
    if (!calls.length) return transcript.slice(0, 80);
    const first = calls[0];
    switch (first.tool) {
        case 'createNode':          return `Node erstellen: „${(first.input as any).title}"`;
        case 'openPane':            return `${(first.input as any).type} öffnen`;
        case 'navigateToDepartment': return `Navigiere zu Department`;
        case 'searchGlobal':        return `Suche nach „${(first.input as any).query}"`;
        default:                    return transcript.slice(0, 80);
    }
}
```

- [ ] **Step 4: Run all useAmbientMora tests**

```bash
cd C:/saimor/INTERFACE
npx jest --no-coverage --testPathPattern="useAmbientMora" --runInBand 2>&1 | tail -20
```

Expected: all tests pass (Phase A + Phase C).

- [ ] **Step 5: Run full test suite**

```bash
cd C:/saimor/INTERFACE
npx jest --no-coverage --runInBand 2>&1 | tail -10
```

Expected: 667+ passing, 0 new failures.

- [ ] **Step 6: Type check**

```bash
cd C:/saimor/INTERFACE
npm run verify:types 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd C:/saimor/INTERFACE
git add lib/hooks/useAmbientMora.ts __tests__/lib/hooks/useAmbientMora.test.ts
git commit -m "feat(field): useAmbientMora Phase C — /v3/mora/field backend integration

Adds phase option ('a' | 'c'). Phase A unchanged. Phase C calls
POST /v3/mora/field for planning and /v3/mora/field/execute for execution.
AmbientRoom and AmbientIntentCard untouched.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```

---

## Final: Switch AmbientRoom to Phase C

Once backend is deployed and verified:

In `C:/saimor/INTERFACE/components/ambient/AmbientRoom.tsx`, change:

```typescript
// Before
const { sendToMora, executeMoraTools, isLoading } = useAmbientMora();

// After
const { sendToMora, executeMoraTools, isLoading } = useAmbientMora({ phase: 'c' });
```

Run tests, commit, push. Done.

---

## Self-Review

**Spec coverage:**
- ✅ `POST /v3/mora/field` — Task 3
- ✅ `POST /v3/mora/field/execute` — Task 3
- ✅ `FieldToolRegistry` with all tools — Task 1
- ✅ `FieldService.plan()` — Task 2
- ✅ `FieldService.execute()` — Task 2
- ✅ Data tools backend-executed — Task 2 (`_execute_data_tool`)
- ✅ UI tools passed through as `UiAction` — Task 2 + Task 3
- ✅ Frontend Phase C — Task 4
- ✅ Error handling — Task 2 (try/except per tool), Task 3 (400 + 500), Task 4 (error state)
- ✅ Tests for all layers — Tasks 1, 2, 3, 4
- ✅ Fallback (no Anthropic) — Task 2 (`if not self._client`)

**Placeholder scan:** None found.

**Type consistency:**
- `PendingTool` defined in Task 2, used in Tasks 3 and 4 ✓
- `FieldContext` consistent across plan() and execute() ✓
- `AmbientToolCall` extended in Task 4 with `| { tool: string; input: ... }` passthrough ✓
