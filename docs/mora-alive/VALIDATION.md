# Validation — MÔRA Alive v01

Status: PREPARED. No production release.

- Typecheck (`npm run verify:types`): PASS.
- Lint (`npm run lint`): PASS, pre-existing warnings outside Alive.
- Critical-flow gate: PASS against repository's existing historical baseline; not a fresh live-system audit.
- New tests: 12/12 PASS using ts-jest in an isolated jsdom configuration. Standard Next/Jest SWC transform crashes in this sandbox (`stacker` assertion); not a test assertion failure.
- Local Next build/dev: blocked by sandbox runtime (`uv_resident_set_memory` / missing proc interfaces). Remote build is the authoritative full-build check.
- Local Chromium install: blocked by truncated browser archive download. First remote browser check caught R3F React runtime incompatibility; fixed by native Three renderer. Latest visual check pending.
- Initial Vercel preview build READY in 82 seconds; only preview environment (`target: null`), no production release.
- Automated browser workflow added for desktop Chromium, iPhone Chromium and iPhone WebKit: actual canvas, loaded sigil, expression provenance, pause, reduced-motion stable canvas, scrolling and page-error checks. Results pending.
- Existing full suite, OS smoke and production build: PASS in both GitHub CI runs for initial commit `cbd59ad6` (runs 40145913265 and 40145929604). Latest renderer revision pending fresh CI.
- Website reuse contract prepared; Website integration not deployed.
