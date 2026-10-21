import { useUniverseFieldStore } from '@/lib/store/universeFieldStore';

describe('universeFieldStore writes only on real change', () => {
  it('keeps state identity for equal anchors/rect and for repeated clear', () => {
    const before = useUniverseFieldStore.getState();
    useUniverseFieldStore.getState().clearField();
    expect(useUniverseFieldStore.getState()).toBe(before);
    const anchors = [{ id: 'a', x: 1, y: 2 }] as any;
    useUniverseFieldStore.getState().setField(anchors, { left: 0, top: 0, width: 10, height: 10 });
    const s1 = useUniverseFieldStore.getState();
    useUniverseFieldStore.getState().setField([{ id: 'a', x: 1, y: 2 }] as any, { left: 0, top: 0, width: 10, height: 10 });
    expect(useUniverseFieldStore.getState()).toBe(s1);
    useUniverseFieldStore.getState().setField(anchors, { left: 0, top: 0, width: 11, height: 10 });
    expect(useUniverseFieldStore.getState()).not.toBe(s1);
  });
});
