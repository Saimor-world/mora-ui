import { useNavStore } from '@/lib/store/navStore';

/** Opens Môra voice overlay above the current surface (Home, Universe, panes). */
export function openVoiceOverlay() {
  useNavStore.getState().setVoiceOverlayOpen(true);
}

export function closeVoiceOverlay() {
  useNavStore.getState().setVoiceOverlayOpen(false);
}

export function toggleVoiceOverlay() {
  useNavStore.getState().toggleVoiceOverlay();
}

export function isVoiceOverlayOpen() {
  return useNavStore.getState().voiceOverlayOpen;
}
