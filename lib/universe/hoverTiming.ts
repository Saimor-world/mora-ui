/** Planet hover must stay still this long before insight UI opens. */
export const PLANET_HOVER_ENTER_DWELL_MS = 520;

/** Grace period after pointer leaves before hover state clears. */
export const PLANET_HOVER_LEAVE_DWELL_MS = 280;

/**
 * Universe insight rail / focus release delay after pointer leaves.
 * Sized so the cursor can travel from a centred planet up to the insight rail
 * (now docked in the reserved centre band) before the focus is released.
 */
export const UNIVERSE_HOVER_RELEASE_MS = 600;

/** Home preview mode uses a shorter release window. */
export const UNIVERSE_HOVER_RELEASE_HOME_MS = 360;
