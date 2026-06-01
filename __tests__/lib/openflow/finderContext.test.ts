import { deriveFolderInitiatives } from '@/lib/openflow/finderContext';

describe('deriveFolderInitiatives', () => {
  it('derives an initiative from the titles of items in the current folder', () => {
    const initiatives = deriveFolderInitiatives([
      { id: 'n1', title: 'Website Relaunch Briefing' },
      { id: 'n2', name: 'Launch Plan v2' },
    ]);
    expect(initiatives).toEqual([
      expect.objectContaining({
        id: 'initiative-website-relaunch',
        title: 'Website Relaunch',
        signalCount: 2,
      }),
    ]);
  });

  it('returns an empty list when no items match a known initiative', () => {
    expect(deriveFolderInitiatives([{ id: 'n1', name: 'Urlaubsfotos' }])).toEqual([]);
  });

  it('returns an empty list for an empty folder', () => {
    expect(deriveFolderInitiatives([])).toEqual([]);
  });
});
