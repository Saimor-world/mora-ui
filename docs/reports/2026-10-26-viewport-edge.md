# OS frame and interface scale

Status: PREPARED. Risk A: bounded layout correction; no data, permission or server changes.

## Reported failure and scope

Marius' 1917 × 975 Chrome screenshot shows the OS scroll edge near x=1720,
leaving a large strip of background to its right. The live shell uses `100vw`
inside a body with configurable CSS zoom. The geometry is consistent with a
90% interface scale, but the screenshot alone does not prove that setting.

This patch is based on main `1bdff0b0` (#176). It extracts the small frame fix
from draft #172 so account/demo changes do not gate its review. It retains
Grok's phone companion, navigation, centered content width and existing theme.

## Change and acceptance criteria

- The shell follows its available percentage width, rather than scaling a
  viewport length a second time.
- The viewport-based shell height is compensated for the app's interface scale;
  the desktop MÔRA panel follows its parent height. The existing mobile panel
  height rule still wins at its breakpoint.
- The local preview uses the same height compensation, preserving its banner.
- Invalid persisted scale falls back to 1 instead of propagating NaN into CSS.
- At 80%, 90%, 100%, 110% and 120%, both Heute and Universe must reach the
  viewport's right edge. Scrollable content stays inside that frame.

CSS rationale: the CSS Viewport Module Level 1 working draft specifies that
zoom multiplies length values, but not `auto` or percentage values:
https://drafts.csswg.org/css-viewport/#zoom-property

## Verification

The new Playwright regression checks actual rendered geometry at 1920 × 1080,
including invalid local scale. It is restricted to a localhost-only preview;
it must never change a signed-in user's preference. It has not been executed.

An isolated local HTML inspection was rejected by browser safety because local
file URLs are disallowed. No alternate transport or browser workaround was used.
Per Marius' earlier instruction, no additional preview server was started.
The existing HQ session was measured read-only at scale 1, where shell/main
already reach their right edge; that is not evidence of this patch at scale 0.9.
No post-fix screenshot or measured 60fps claim is available. Head's visual check
at reduced scale and the phone companion check remain open before release.

Lint (existing warnings), typecheck, critical-flow baseline gate, all 346 unit
test suites / 1983 tests, and the OS-enabled production build passed locally.
Playwright discovery lists all six new regression cases successfully; execution
is still pending. OS smoke result is recorded in the PR. React review: no new hooks, listeners,
network requests, animation loops or dependencies; render structure preserved.

## Rollback

Revert this isolated commit. No migration, cache reset or user preference reset
is needed. No merge or deployment was performed.
