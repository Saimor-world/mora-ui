import { useNavStore } from '@/lib/store/navStore';
import {
  closeVoiceOverlay,
  isVoiceOverlayOpen,
  openVoiceOverlay,
  toggleVoiceOverlay,
} from '@/lib/os/openVoiceOverlay';

describe('openVoiceOverlay', () => {
  beforeEach(() => {
    useNavStore.setState({
      viewLevel: 'department',
      activeDepartmentId: 'dept-1',
      voiceOverlayOpen: false,
    });
  });

  it('opens voice without changing viewLevel or navigation context', () => {
    openVoiceOverlay();

    const state = useNavStore.getState();
    expect(state.voiceOverlayOpen).toBe(true);
    expect(state.viewLevel).toBe('department');
    expect(state.activeDepartmentId).toBe('dept-1');
    expect(isVoiceOverlayOpen()).toBe(true);
  });

  it('closes voice without navigating away from the active surface', () => {
    openVoiceOverlay();
    closeVoiceOverlay();

    const state = useNavStore.getState();
    expect(state.voiceOverlayOpen).toBe(false);
    expect(state.viewLevel).toBe('department');
    expect(state.activeDepartmentId).toBe('dept-1');
  });

  it('toggles voice overlay open and closed', () => {
    toggleVoiceOverlay();
    expect(isVoiceOverlayOpen()).toBe(true);

    toggleVoiceOverlay();
    expect(isVoiceOverlayOpen()).toBe(false);
  });
});
