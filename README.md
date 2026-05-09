# SAIMOR INTERFACE

Next.js 15 frontend for SAIMOR — the cognitive operating system. This repo is the OS shell: panes, dock, ambient atmosphere, and the surface where Mora lives.

For the canonical architectural contract, read [`../ARCHITECTURE.md`](../ARCHITECTURE.md) at the workspace root.

## Quick Start

```bash
# Install
npm install

# Configure
cp .env.local.example .env.local
# Edit .env.local — at minimum set NEXT_PUBLIC_CORE_URL

# Run
npm run dev
# Open http://localhost:3000
```

## Workspace Context

This repository (`@saimor/mora-ui`) lives inside the SAIMOR workspace at `C:/saimor/INTERFACE/` and pairs with:

- `CORE/` — FastAPI backend on port 8081
- `BRIDGE/` — MCP server bridge for tools
- `OPERATIONS/` — gateway, deploy scripts

To run the full stack locally:

```bash
# from C:/saimor/
bash scripts/start-local-truth.sh
```

## Tests

```bash
# Unit tests (Jest)
npx jest --no-coverage --testPathPattern="__tests__"

# Production smoke test (Playwright)
SMOKE_BASE_URL=http://localhost:3000 \
  SMOKE_EMAIL=demo@saimor.io \
  SMOKE_PASSWORD=... \
  npx playwright test e2e/production-smoke.spec.ts
```

The smoke test asserts the critical user path (login → home → notes → mora → logout). It gates production deploys.

## Documentation

- **Architectural contract:** [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- **Frontend conventions:** [`./CLAUDE.md`](./CLAUDE.md)
- **Active specs and plans:** [`./docs/superpowers/`](./docs/superpowers/)
- **Local-truth boot doc:** [`./docs/PRE_ALPHA_1.0_LOCALTRUTH.md`](./docs/PRE_ALPHA_1.0_LOCALTRUTH.md)
- **Content vocabulary:** [`./docs/architecture/content-model.md`](./docs/architecture/content-model.md)

## License

MIT — see workspace `ARCHITECTURE.md §7` for the open-core posture.
