import { useNavStore } from '@/lib/store/navStore';

/** Opens the global Môra voice overlay (AmbientRoom), separate from the Lagefeld board. */
export function openVoiceOverlay() {
  useNavStore.getState().navigateToAmbient();
}

export function closeVoiceOverlay() {
  useNavStore.getState().navigateToCore();
}

export function isVoiceOverlayOpen() {
  return useNavStore.getState().viewLevel === 'ambient';
}
