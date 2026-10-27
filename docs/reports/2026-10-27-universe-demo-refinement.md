# Universe refinement — 27 October 2026

## Source and scope

Marius supplied `chatty-universe.zip`, including a Git bundle at
`a73ac75a2074693ec5db3f5d32a8a6265f789a26`, based on main `b2f2a991`.
The bundle was SHA-256 verified and imported with its original history to
`handoff/mora-alive-jade-20261027`. The import staging branch only transports the
bundle; its files/workflow are not ancestors of the product feature branch.
This revision continues the selected Jade MÔRA direction (#187), not the earlier
light-body/mascot studies. No merge, production change or deployment.

## Problem and resulting behavior

The overview still reserved a hole for an in-scene MÔRA while she was actually in
the dock. With `moraInScene=false`, the real department with the largest existing
weight now anchors the visible field, and remaining departments balance around
it. Collision resolution preserves the anchor. One/two-department and in-scene
MÔRA layouts retain explicit handling. No department, count or activity is added.

Overview planets use the existing deterministic named glass materials instead
of one shared bluegrey bitmap with tiny hue shifts. These colors are identity,
not a new signal of activity or importance. Data-driven sizing, existing
selection/hover rings, drilldown and access filtering are retained.

The existing scarf SVGs gain subdued woven detail and curved light/shadow instead
of bold flat stripes. The existing pearl necklace gains contact shading and a
quieter string. MÔRA's decorative gold veins and rim glow are reduced. Existing
trait IDs, persisted outfits, founder rules, slots and accessory adapter remain.
This is a material refinement of independent SVG layers, not new 3D garment assets
or NFTs. No minting, wallet action, ownership or server-key implementation.

## Verification and product truth

Local targeted checks: 17 layout/material/accessory adapter tests passed; targeted
lint passed. TypeScript and targeted lint pass.
Remote full CI and actual browser captures provide final build/visual evidence.

The browser suite loads the actual `/os#universe`, selects R&D, opens Roadmap and
returns to the same overview at 1440x900, 1280x720 and 390x844. All CORE reads are
controlled UI fixtures, every write is aborted, and unknown reads return 503.
Screenshots carry `UI-Testdaten · kein Live-CORE`. This verifies the real frontend
with controlled data, not a live CORE session or model/agent success.

Normal phone OS remains PhoneCompanion. As explicitly requested in the handoff,
only the isolated CI checkout temporarily removes that early return to inspect
the responsive Universe. Source is restored after the test build; that local
build is never deployed. The 390px images therefore document the Universe layout,
not a claim that the normal phone entry has changed. Auth/middleware remain intact.

Risk A: reversible presentation and QA-only changes. Rollback this refinement
commit to restore the exact supplied bundle. Visual acceptance by Marius remains
required; no physical iPhone FPS, authenticated CORE or final garment fidelity
is claimed. Status: PREPARED until current CI/captures are reviewed.

## Follow-up from first actual captures

Initial full CI passed 2,064 unit tests and all three browser journeys. The actual
captures exposed a hard bottom edge of the supplied half-planet raster; a static
alpha mask now dissolves it into the background. A large unassigned collection
keeps its true size but cannot displace a real department from the focal position;
it has a quiet dashed collection outline. The wardrobe now passes its actual
reduced-motion preference to the existing JadeMoraStage, preventing its JS blink
loop from running in still mode. Two added browser journeys capture the existing
base/sunglasses/scarf/pearls and verify single-neck-slot, undo/redo and persistence.
No additional wardrobe, state engine or outfit store is introduced.

The first wardrobe browser runs exposed an incomplete test session: its synthetic
cookie lacked the existing opaque-session `sess_` format and was intentionally
removed by the HTTP client. Reload correctly returned to the access screen.
The fixture now uses the same opaque-session shape as the existing CORE logic QA,
provides a fresh activity timestamp, waits for the intended user before editing,
and checks both per-user storage and cookie survival before reload. No production
auth behavior is changed. A touch-enabled 390px journey and reduced-motion image
stability beyond the first blink are also included.

Actual accessory captures also showed that the scarf still read as a flat band.
Its existing SVG now has a more curved cowl around the stone and a softly curved
hanging end; both standard and founder versions keep the same adapter anchors,
variants and IDs. This remains a layered illustration material, not a new 3D
cloth simulation. Final screenshots are checked on the exact resulting commit.

## Live motion preference follow-up

Switching reduced motion on during a blink previously cancelled its reopening
timer but left `data-blink` and the last pointer gaze on the element. Both the
scene and existing wardrobe renderer now reset blink/gaze/pose, skip motion
listeners in still mode, and clean up on preference changes and unmount.
Universe and wardrobe reuse the existing `usePrefersReducedMotion` subscription;
the installed Framer hook only snapshots the preference at mount. No new motion
system or character design is introduced.

Two focused regression tests failed on the old renderer and pass after the fix;
they cover an interrupted blink, neutral gaze, prolonged stillness, resuming
motion and timer cleanup. A seventh browser journey switches the real wardrobe
preference both ways without reloading. Validation for this follow-up is recorded
on the draft PR; earlier 2,065-test / six-journey evidence belongs to 25aea752.
