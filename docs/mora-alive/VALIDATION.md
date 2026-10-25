# Validation — MÔRA Alive v01

Status: PREPARED for review. Body and isolated signal adapter tests verified; authenticated live CORE journey and physical iPhone performance remain unverified. No production release.

- Typecheck (`npm run verify:types`): PASS.
- Lint (`npm run lint`): PASS, pre-existing warnings outside Alive.
- Critical-flow gate: PASS against repository's existing historical baseline; not a fresh live-system audit.
- New tests: 12/12 PASS using ts-jest in an isolated jsdom configuration. Standard Next/Jest SWC transform crashes in this sandbox (`stacker` assertion); not a test assertion failure.
- Local Next build/dev: blocked by sandbox runtime (`uv_resident_set_memory` / missing proc interfaces). Remote build is the authoritative full-build check.
- Local Chromium install: blocked by truncated browser archive download. First remote browser check caught R3F React runtime incompatibility; fixed by native Three renderer. The corrected renderer passed the full remote browser matrix. Cloud-browser rendering itself is unavailable because that browser has WebGL disabled; its fallback, loaded sigil and controls were checked.
- Initial Vercel preview build READY in 82 seconds; only preview environment (`target: null`), no production release.
- Automated browser workflow added for desktop Chromium, iPhone Chromium and iPhone WebKit: actual canvas, loaded sigil, expression provenance, pause, reduced-motion stable canvas, scrolling and page-error checks. The first complete run passed 6/6 tests on source `43ba455a` (PR merge checkout `fddcf210`), run 40146379072. Screenshots were downloaded and visually reviewed at 1440px desktop and iPhone WebKit 390 CSS px / DPR 3.
- Existing full suite, OS smoke and production build: PASS in initial GitHub CI runs (40145913265 and 40145929604). Final feature-head checks are linked on draft PR #163.
- Website reuse implemented in separate draft PR Saimor-world/Website#122 using immutable source export and hash verification. Preview only, no production release.
