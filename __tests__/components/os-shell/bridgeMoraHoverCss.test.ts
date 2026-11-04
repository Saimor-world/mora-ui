import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(process.cwd(), 'components/os-shell/bridge-concept.css'), 'utf8');

describe('Jade MÔRA hover hitbox CSS contract', () => {
  it('does not animate the clickable dock button itself', () => {
    const hitboxStyle = css.match(/\.bridge__mora\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(hitboxStyle).toContain('transition:transform');
    expect(hitboxStyle).not.toMatch(/\banimation\s*:/);
  });

  it('animates the inert visual child and freezes it during flight', () => {
    expect(css).toMatch(/\.bridge__mora\s*>\s*\.bridge__mora-visual\s*\{[^}]*pointer-events:none;[^}]*animation:bridge-float/);
    expect(css).toMatch(/\.bridge__mora:has\(\.jade-mora\)\s*>\s*\.bridge__mora-visual\s*\{\s*animation:jade-fly/);
    expect(css).toMatch(/\.bridge__mora\[data-flying='true'\]\s*>\s*\.bridge__mora-visual\s*\{\s*animation:none;/);
  });

  it('honors reduced motion for the visual child', () => {
    expect(css).toContain('.bridge__mora > .bridge__mora-visual, .jade-mora__glow');
    expect(css).toContain('animation:none !important;');
  });
});
