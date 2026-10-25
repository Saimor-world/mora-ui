# Validation — MÔRA Alive v03

## Layered light revision

V03 replaces the flat outer veil and rotated duplicate torso with six cambered light membranes. It adds damped eye aperture, larger glossy dark-green eyes, warped cellular jade veins, and an articulated night-rest pose with a curled crest, rotated tail and a smaller jade orbit. Night stays warm; offline/error use the dim violet palette. Engine/event mapping remains unchanged.

Source `b1b8e720` passed full CI (40213278858) and six desktop/iPhone Chromium/WebKit browser checks (40213278749). Actual idle, working and night-rest captures were reviewed. This visual review found bright square artifacts at membrane tips despite passing tests: an unclamped `pow(sin(...), 2.)` could receive a tiny negative value at a zero-opacity edge. Clamping power domains alone did not remove those artifacts. The next correction discards near-zero-coverage edge fragments, bounds their HDR output and safely normalizes the interpolated vectors. It reconnects the night-rest head/tail and fades the upright crest threads during curling.

Source `f8e08637` passed full CI 40233824628 and all six browser checks 40233824561. The corrected actual idle and night-rest frames were reviewed: the white squares are absent. CI also reads the half-float source and both blur targets and asserts zero non-finite components on desktop Chromium, iPhone Chromium and iPhone WebKit. The final night-light correction preserves the rounded forehead, dims all light layers continuously during curling, and limits fully resting rendering to at most 20 draws per second (not a measured physical-device FPS claim). Current checks are linked on draft PR #163. Fidelity remains a work in progress: this is a custom procedural 3D reconstruction, not a claimed 1:1 finished character asset. Physical iPhone GPU/FPS/thermal testing remains outstanding. No production release or merge.

## Reference correction (2026-10-25)

The supplied turnaround sheet is the binding target; V01 was rejected visually. The implementation remains PREPARED, not accepted as a finished 1:1 asset.

- Geometry: continuous flame head, outer translucent crest veil, leaf torso layers, small idle smile/curved eyes, separate dark veined jade, spatial orbital light threads. Actual procedural 3D, no character bitmap.
- First V02 render (`8c597faf`) passed full CI and all six browser checks, but visual review found flat material and insufficient luminous depth. It was revised rather than accepted on test results alone.
- Second render (`0f61ab8d`) passed full CI (40150344825) and six desktop/iPhone Chromium/WebKit checks (40150344518). Visual review found face overexposure and orbit crossing the face, leading to another material/compositing correction.
- Last captured body: `7ec5eb68d0fe0a7b6453ce258b1ecf46beef7cfe`, followed by a corrected jade orbit (front half descends below the face, rear half rises behind it). Local TypeScript and focused ESLint pass. Full CI 40151099772 passed 1,842 unit tests, 53 smoke tests and the build. Browser run 40151099758 passed all six checks. Actual idle and working captures were reviewed at desktop 1440px and iPhone WebKit 390 CSS px / DPR 3. Latest orbit correction results remain linked on draft PR #163.
- `characterGlow.ts` preserves HDR gradients when supported, falls back to byte targets otherwise, uses two half-resolution separable blurs, antialiases the scene target, protects opaque face details from bloom, and disposes all render targets. Physical iPhone thermal/FPS measurement is still outstanding.
- The 13 state/adapter regression tests pass; these visual edits do not alter the event engine. Full earlier CI includes existing tests, smoke and builds, not a newly verified authenticated live CORE journey.
- Website export includes the same form, material and glow modules. V02 distribution is held because visual fidelity remains incomplete; the Website draft's previously pinned source is not silently presented as the corrected body.

## Remaining visual differences

The reconstruction is closer to the supplied silhouette and face, but it is not a 1:1 match. The sheet has more finely layered, curved luminous membranes, richer local scattering and a natural jade microstructure. The current procedural surface and vein pattern are visibly simpler. V03 adds a procedural curled night-rest pose; it is not the sheet's final artist-authored rig. Do not mark the character asset as finished or accepted. The Website draft retains its prior pinned version while the canonical OS preview is revised.

## Earlier integration checks


Status: PREPARED for review. Body and isolated signal adapter tests verified; authenticated live CORE journey and physical iPhone performance remain unverified. No production release.

- Typecheck (`npm run verify:types`): PASS.
- Lint (`npm run lint`): PASS, pre-existing warnings outside Alive.
- Critical-flow gate: PASS against repository's existing historical baseline; not a fresh live-system audit.
- New tests: 13/13 PASS using ts-jest in an isolated jsdom configuration. Standard Next/Jest SWC transform crashes in this sandbox (`stacker` assertion); not a test assertion failure.
- Local Next build/dev: blocked by sandbox runtime (`uv_resident_set_memory` / missing proc interfaces). Remote build is the authoritative full-build check.
- Local Chromium install: blocked by truncated browser archive download. First remote browser check caught R3F React runtime incompatibility; fixed by native Three renderer. The corrected renderer passed the full remote browser matrix. Cloud-browser rendering itself is unavailable because that browser has WebGL disabled; its fallback, loaded sigil and controls were checked.
- Initial Vercel preview build READY in 82 seconds; only preview environment (`target: null`), no production release.
- Automated browser workflow added for desktop Chromium, iPhone Chromium and iPhone WebKit: actual canvas, loaded sigil, expression provenance, pause, reduced-motion stable canvas, scrolling and page-error checks. The first complete run passed 6/6 tests on source `43ba455a` (PR merge checkout `fddcf210`), run 40146379072. Screenshots were downloaded and visually reviewed at 1440px desktop and iPhone WebKit 390 CSS px / DPR 3.
- Existing full suite, OS smoke and production build: PASS in initial GitHub CI runs (40145913265 and 40145929604). Final feature-head checks are linked on draft PR #163.
- Explicit logout is also sampled from the existing socket status once per second, because the existing disconnect suppresses onclose. A regression test verifies clearing stale work without a disconnect event.
- Website reuse implemented in separate draft PR Saimor-world/Website#122 using immutable source export and hash verification. Preview only, no production release.
