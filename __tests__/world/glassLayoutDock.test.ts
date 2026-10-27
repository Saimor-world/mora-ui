import { glassLayout } from '@/lib/universe/glassLayout';

const weights = [3, 88, 0, 7, 0];
const labels = ['Growth', 'R&D', 'Intelligence', 'Product', 'Ohne Abteilung']
  .map(name => ({ name, meta: '', moons: 0, stars: 0 }));
describe('glass composition with MÔRA in the dock', () => {
  it.each([[1440, 610, false], [768, 500, false], [390, 420, true]])(
    'uses the real largest department as the focal point at %i × %i', (width, height, phone) => {
      const options = { width: Number(width), height: Number(height), phone: Boolean(phone),
        weights, labels, reserveMora: false };
      const l = glassLayout(options);
      const central = l.slots[1];
      expect(Math.abs(central.pos!.x - l.cx)).toBeLessThan(1);
      expect(Math.abs(central.pos!.y - l.cy)).toBeLessThan(1);
      expect(l.slots).toHaveLength(weights.length);
      expect(l.slots.every(s => Number.isFinite(s.pos!.x) && Number.isFinite(s.pos!.y))).toBe(true);
      expect(glassLayout(options)).toEqual(l);
    },
  );
  it('keeps a single real department centered rather than orbiting an absent character', () => {
    const options = { width: 390, height: 420, phone: true, weights: [0], reserveMora: false };
    const l = glassLayout(options);
    expect(l.slots[0].pos).toEqual({ x: l.cx, y: l.cy });
  });
  it('still reserves the original central character position when she is in the scene', () => {
    const l = glassLayout({ width: 1440, height: 610, phone: false, weights, labels });
    expect(l.slots.every(s => Math.hypot(s.pos!.x - l.cx, s.pos!.y - l.cy) > l.mora / 2)).toBe(true);
  });
});
