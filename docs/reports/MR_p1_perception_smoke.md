# P1 Perception Layer — Smoke Test Report

**Date:** 2026-04-26
**Branches:** `mora-real/p1-perception` (CORE + INTERFACE)
**Spec:** [docs/superpowers/specs/2026-04-25-real-mora-design.md §2 + §7-P1](../../../../saimor/docs/superpowers/specs/2026-04-25-real-mora-design.md)

## Environment

- CORE: `python -m uvicorn app:app --host 127.0.0.1 --port 8081`
- INTERFACE: `node ./scripts/start-next-local-dev.cjs` with `NEXT_PUBLIC_MORA_PERCEIVE_V1=true`
- Ollama: `gemma4:e2b` available on `127.0.0.1:11434`
- Provider routing: privacy profile (ollama → anthropic → openai → gemini)

## Server-side verification (automated)

### `POST /v3/mora/perceive` — empty body

**Result:** HTTP 200, valid `v1` PerceptionBundle.

```json
{
  "version": "v1",
  "issued_at": "2026-04-26T10:21:07.412542+00:00",
  "identity": {
    "user_id": "smoke",
    "name": "smoke",
    "role": "owner",
    "tenant_id": "tenant-saimor-hq",
    "active_company": {
      "id": "238ac625-cf49-4bdd-a777-f648d3b9f5e6",
      "name": "SaimÃ´r HQ"
    }
  },
  "scope": {
    "company": { "id": "238ac625-...", "name": "SaimÃ´r HQ" },
    "department": null,
    "space": null,
    "folder": null
  },
  "active_object": null,
  "recent_activity": { "navigations": [], "edits": [], "open_panes": [], "drafts": [] },
  "relevant_memory": [],
  "recent_tool_runs": [],
  "capabilities": {
    "tools_available": ["search", "read_node", "read_folder", "navigate", "create_node", "update_node"],
    "tools_degraded": [],
    "providers_active": [],
    "memory_writable": true
  }
}
```

### `POST /v3/mora/perceive` — with `query` + `active_pane`

**Request:**
```json
{
  "query": "what is here",
  "active_pane": {
    "type": "finder",
    "data": {
      "folder_id": "f_test",
      "title": "Q3 Plans",
      "department_id": "d_marketing",
      "department_name": "Marketing"
    }
  }
}
```

**Result:** HTTP 200. `scope.department` and `scope.folder` populated from `active_pane.data`. `active_object` is `{id:"f_test", type:"folder", title:"Q3 Plans", path:"Q3 Plans"}`. ✅

### Latency + size budget (5 cold-warm runs, empty body)

| Metric | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Spec target |
|--------|-------|-------|-------|-------|-------|-------------|
| Size (bytes) | 685 | 685 | 685 | 685 | 685 | ≤ 30 720 (30 KB) |
| Time (s) | 0.0229 | 0.0227 | 0.0239 | 0.0206 | 0.0516 | ≤ 0.150 |

- **p50 latency: ~23 ms** — 6.5× under target.
- **Size: 685 B** — 2.2 % of budget. Massive headroom for richer bundles in later phases.

### Tests at HEAD of `mora-real/p1-perception`

| Suite | Result |
|---|---|
| CORE `test_perception_schemas.py` | 6/6 PASS |
| CORE `test_perception_assembler.py` | 8/8 PASS |
| CORE `test_perception_endpoint.py` | 6/6 PASS |
| INTERFACE `perceptionClient.test.ts` | 4/4 PASS |
| INTERFACE `featureFlags.test.ts` | 4/4 PASS |
| INTERFACE `useMoraPerception.test.tsx` | 3/3 PASS |
| INTERFACE `useMoraContext.test.ts` | 13/13 PASS (10 existing + 3 new bundle-branch) |
| INTERFACE ChatPane regression | 15/15 PASS |
| INTERFACE `__tests__/lib` total | 307 PASS / 0 FAIL |

## Known caveats

1. **UTF-8 double-encoding in company name** (`SaimÃ´r HQ` instead of `Saimôr HQ`) — pre-existing data corruption in the `companies` table. Not P1's job; flag for a future fix.
2. **`providers_active` is empty** — `ai_provider_service.get_health()` either doesn't exist or returns nothing for the running config. The bundle still validates (the field is `[]`, not missing). Worth a follow-up so Mora knows which providers are actually live.
3. **`recent_tool_runs` is empty** — expected for P1 (no tool runs in the dev DB). Will populate from the journal in P5a per spec §2.5.

## What's NOT yet verified (needs you)

The full acceptance scenario from the plan requires an interactive UI flow that I can't drive end-to-end:

1. Log in to the OS UI at `http://localhost:3000/login` (demo creds: `nextchaptergermany@gmail.com` / `saimor2026`).
2. Navigate Marketing → Space → Folder. Confirm the Finder pane shows the folder.
3. Open the chat pane. Type: **"was ist hier?"** (or "what's here?").
4. Confirm Mora's reply references the folder by name.
5. Open DevTools → Network. Confirm:
   - A `POST /v3/mora/perceive` request fires when chat opens.
   - The `POST /v3/chat/stream` request body includes `context.perception` with the bundle.

If those four points pass, P1 is fully verified end-to-end. The server-side and code-side guarantees are already in place — this is the "feels real" smell test.

## Services currently running

- CORE on :8081 — log at `C:/saimor/logs/core.log`
- INTERFACE on :3000 — log at `C:/saimor/logs/ui.log`
- Ollama on :11434 with gemma4:e2b, llama3:8b, llama3.2:latest

To stop them:
```powershell
Get-Process | Where-Object { $_.Name -in @('python','node') } | Where-Object { $_.StartTime -gt (Get-Date).AddMinutes(-30) } | Stop-Process -Force
```

## Verdict

**P1 server-side: VERIFIED.** Bundle shape, endpoint contract, latency, size, and unit-test coverage all clear the bar. The flag-gated INTERFACE wiring is in place and tested. Acceptance scenario UX is the only piece left, and it's a 60-second click-through.
