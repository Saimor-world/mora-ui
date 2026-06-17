import {
  buildOpenIntentReceipt,
  extractDirectOpenTarget,
  findDepartmentIntentMatch,
  toChatOpenableResult,
} from '@/lib/chat/openIntent';

describe('direct open intent matching', () => {
  const departments = [
    { id: 'product', name: 'Product' },
    { id: 'intelligence', name: 'Intelligence' },
    { id: 'growth', name: 'Growth' },
  ];

  it('extracts a target even when command and target are joined', () => {
    expect(extractDirectOpenTarget('öffneintellgence')).toBe('intellgence');
  });

  it('resolves a small department typo without opening search', () => {
    expect(findDepartmentIntentMatch('intellgence', departments)?.id).toBe('intelligence');
  });

  it('does not guess an unrelated short or distant target', () => {
    expect(findDepartmentIntentMatch('plan', departments)).toBeNull();
    expect(findDepartmentIntentMatch('quartalsbericht', departments)).toBeNull();
  });
});

describe('buildOpenIntentReceipt', () => {
  it('builds chips from query, destination and next step', () => {
    const receipt = buildOpenIntentReceipt({
      headline: 'Treffer gefunden',
      resolution: 'act',
      destination: { path: 'Vertrieb/Angebote' },
      next: { label: 'Öffnen', message: 'Wird geöffnet' },
      open_explanation: { headline: 'Bestes Ergebnis', reason: 'Hohe Relevanz' },
    } as any, 'angebot kunde x');

    expect(receipt.label).toBe('Treffer gefunden');
    expect(receipt.title).toBe('Bestes Ergebnis');
    expect(receipt.body).toBe('Hohe Relevanz');
    expect(receipt.footer).toBe('Wird geöffnet');
    expect(receipt.chips.map((c) => c.label)).toEqual(['"angebot kunde x"', 'Vertrieb/Angebote', 'Öffnen']);
    expect(receipt.chips[2].tone).toBe('cyan');
  });

  it('falls back to a generated title when no explanation is present', () => {
    const receipt = buildOpenIntentReceipt({ resolution: 'open' } as any, 'foo');
    expect(receipt.label).toBe('Treffer');
    expect(receipt.title).toBe('Suche für "foo"');
  });
});

describe('toChatOpenableResult', () => {
  it('keeps a known entity type and maps ids', () => {
    const out = toChatOpenableResult({
      id: 'f1', title: 'Angebote', type: 'folder', scope_path: 'V/A',
      company_id: 'c1', department_id: 'd1', space_id: 's1', folder_id: 'f1',
    } as any);
    expect(out.type).toBe('folder');
    expect(out.id).toBe('f1');
    expect(out.subtitle).toBe('V/A');
    expect(out.companyId).toBe('c1');
    expect(out.folderId).toBe('f1');
  });

  it('normalizes an unknown type to node', () => {
    expect(toChatOpenableResult({ id: 'x', title: 'X', type: 'weird' } as any).type).toBe('node');
  });
});
