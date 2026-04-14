import { useOrbStore } from '@/lib/store/orbStore';

// Mock mindLoop so initializeMindLoop doesn't error in tests
jest.mock('@/lib/intelligence/mindLoop', () => ({
  mindLoop: {
    subscribe: jest.fn(() => () => {}),
    getCurrentState: jest.fn(() => 'idle'),
  },
}));

beforeEach(() => {
  useOrbStore.setState({
    orbState: 'idle',
    speculativeState: undefined,
    speculativeUntil: undefined,
    lastAnswerSource: null,
    lastAnswerSourceMode: null,
    lastAnswerScopeLabel: null,
  });
});

describe('orbStore', () => {
  it('setOrbState updates orbState', () => {
    useOrbStore.getState().setOrbState('thinking');
    expect(useOrbStore.getState().orbState).toBe('thinking');
  });

  it('setSpeculativeState sets speculative window', () => {
    const before = Date.now();
    useOrbStore.getState().setSpeculativeState('focus', 1000);
    const { orbState, speculativeState, speculativeUntil } = useOrbStore.getState();
    expect(orbState).toBe('focus');
    expect(speculativeState).toBe('focus');
    expect(speculativeUntil).toBeGreaterThan(before);
  });

  it('setOrbState is blocked during active speculative window', () => {
    useOrbStore.getState().setSpeculativeState('focus', 5000);
    useOrbStore.getState().setOrbState('idle'); // polling tries to overwrite
    expect(useOrbStore.getState().orbState).toBe('focus'); // not overwritten
  });

  it('clearSpeculativeState clears speculative fields', () => {
    useOrbStore.getState().setSpeculativeState('thinking', 5000);
    useOrbStore.getState().clearSpeculativeState();
    expect(useOrbStore.getState().speculativeState).toBeUndefined();
    expect(useOrbStore.getState().speculativeUntil).toBeUndefined();
  });

  it('setAnswerProvenance updates all provenance fields', () => {
    useOrbStore.getState().setAnswerProvenance('memory', 'retrieval', 'My Folder');
    const { lastAnswerSource, lastAnswerSourceMode, lastAnswerScopeLabel } = useOrbStore.getState();
    expect(lastAnswerSource).toBe('memory');
    expect(lastAnswerSourceMode).toBe('retrieval');
    expect(lastAnswerScopeLabel).toBe('My Folder');
  });
});
