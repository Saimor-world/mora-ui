# SAIMÔR Design Tokens

The canonical design language for the OS. Import from `@/lib/design/tokens`.
Color carries **meaning**; type has a real **hierarchy**. When building any new
surface, reach for these before hardcoding values.

## Type scale — named by intent, not size

| Key | Use for | Roughly |
|---|---|---|
| `hero` | the ONE big moment per surface — a score, a greeting | text-6xl bold |
| `display` | secondary large number / prominent headline | text-3xl |
| `title` | pane or section headline | 18px semibold |
| `section` | the uppercase caps-label opening a block | 10px tracked caps |
| `body` | default reading text | 13px |
| `meta` | timestamps, footnotes | 11px |

```tsx
import { typeScale } from '@/lib/design/tokens';
<h1 className={typeScale.hero}>{score}</h1>
<div className={typeScale.section}>Befunde</div>
```

Rule: at most **one** `hero` per surface. If everything is big, nothing is.

## Color = meaning

Don't pick red/amber/green ad-hoc. Resolve a *meaning*:

| Meaning | Used for |
|---|---|
| `critical` | Kritisch / high risk / errors (red) |
| `warning` | Mittel / caution (amber) |
| `safe` | Sicher / success (emerald) |
| `ai` | Mora / AI accents (violet) |
| `info` | neutral-informational highlights (cyan) |
| `neutral` | plain UI chrome (white-alpha) |

```tsx
import { semanticColor, levelToMeaning } from '@/lib/design/tokens';

const p = semanticColor(levelToMeaning(audit.level)); // audit.level = 'Kritisch'
<span style={{ color: p.accent, textShadow: glow.text(p.glow) }}>{score}</span>
<div style={{ background: p.chip, color: p.chipText, border: `1px solid ${p.border}` }}>…</div>
```

Each palette returns: `text · bg · border · glow · glowStrong · accent · chip · chipText`.

## Surface tones

```tsx
import { surfaceTone } from '@/lib/design/tokens';
<div style={{ background: surfaceTone.base }}>   {/* immersive surfaces */}
<div style={{ background: surfaceTone.raised }}> {/* cards */}
```

## Glow + elevation (atmosphere)

```tsx
import { glow, elevation } from '@/lib/design/tokens';

style={{
  background: glow.radial(p.glow, '20% 30%'),
  boxShadow: `${glow.strong(p.glow)}, ${elevation.card}`,
}}
```

- `glow.soft/strong/text/radial(color)` — the atmospheric layer
- `elevation.card/floating/glassEdge` — depth

## Why

Reference surfaces: `components/panes/AuditDossierView.tsx` and `WallPane.tsx`.
The 400-vs-500 reconciliation (glow uses the deeper 500-level, accents use
400-level) lives in `tokens.ts` so the two never drift again.
