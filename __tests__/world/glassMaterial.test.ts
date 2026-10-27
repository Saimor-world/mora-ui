import { glassMaterialFor, glassVariantFor } from '@/components/world/GlassOrb';

describe('glassMaterialFor', () => {
  it('maps only the three named departments', () => {
    expect(glassMaterialFor('R&D')).toBe('rnd');
    expect(glassMaterialFor(' roadmap ')).toBe('roadmap');
    expect(glassMaterialFor('Research')).toBe('research');
    expect(glassMaterialFor('Growth')).toBeNull();
    expect(glassMaterialFor('Product Roadmap Q4')).toBeNull();
  });
  it('keeps the stable hash variant for everything else', () => {
    expect(glassVariantFor('Growth')).toBe(glassVariantFor('Growth'));
    expect(glassVariantFor('R&D')).toBe('paleblue');
  });
});
