import { readFileSync } from 'fs';
import { join } from 'path';
import { stylebook, stylebookVar } from '@/lib/design/tokens';

const css = readFileSync(join(__dirname, '../../app/stylebook-tokens.css'), 'utf-8');

function cssVar(name: string): string | undefined {
  return css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();
}

describe('Stylebook tokens: one source', () => {
  it('mirrors every stylebook color as a CSS variable with the same value', () => {
    for (const [name, value] of Object.entries(stylebook.color)) {
      const variable = stylebookVar(name as keyof typeof stylebook.color).slice(4, -1).replace(/^--/, '');
      expect({ name, value: cssVar(variable) }).toEqual({ name, value });
    }
  });

  it('uses only the four type steps', () => {
    const sizes = Array.from(css.matchAll(/font-size:\s*([^;]+);/g)).map((m) => m[1].trim());
    const allowed = new Set(['12px', '15px', '20px', 'var(--sb-display-size)']);
    expect(sizes.filter((size) => !allowed.has(size))).toEqual([]);
    expect(cssVar('sb-display-size')).toBe(`${stylebook.type.display.desktop.size}px`);
    expect(css).toContain(`--sb-display-size: ${stylebook.type.display.phone.size}px`);
  });

  it('declares spacing only on the 8-px grid', () => {
    const spaces = Array.from(css.matchAll(/--sb-space-\d+:\s*(\d+)px/g)).map((m) => Number(m[1]));
    expect(spaces).toEqual([...stylebook.space]);
    const paddings = Array.from(css.matchAll(/(?:padding|gap|margin):\s*([^;]+);/g))
      .flatMap((m) => m[1].split(/\s+/))
      .filter((part) => /^\d+px$/.test(part))
      .map((part) => Number(part.replace('px', '')));
    expect(paddings.filter((px) => px !== 0 && !stylebook.space.includes(px as never))).toEqual([]);
  });

  it('keeps radii, touch target and motion in sync', () => {
    expect(cssVar('sb-radius-card')).toBe(`${stylebook.radius.card}px`);
    expect(cssVar('sb-radius-focus')).toBe(`${stylebook.radius.focus}px`);
    expect(cssVar('sb-touch')).toBe(`${stylebook.touch}px`);
    expect(cssVar('sb-fast')).toBe(`${stylebook.motion.fast}ms`);
    expect(cssVar('sb-panel')).toBe(`${stylebook.motion.panel}ms`);
    expect(cssVar('sb-ease')).toBe(stylebook.motion.easing);
  });

  it('switches motion off for reduced motion and uses no blur or glow', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).not.toMatch(/backdrop-filter|blur\(|box-shadow/);
  });
});
