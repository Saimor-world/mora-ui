/** Universe appearance: dark real-space or light Frutiger-Aero. Desktop only. */

export type UniverseTheme = 'dark' | 'light';
export type UniverseThemePref = UniverseTheme | 'system';

export const UNIVERSE_THEME_KEY = 'saimor.universe.theme.v1';

export function systemUniverseTheme(): UniverseTheme {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function loadUniverseThemePref(): UniverseThemePref {
    if (typeof window === 'undefined') return 'system';
    try {
        const raw = window.localStorage.getItem(UNIVERSE_THEME_KEY);
        if (raw === 'dark' || raw === 'light' || raw === 'system') return raw;
    } catch { /* privat-modus */ }
    return 'system';
}

export function saveUniverseThemePref(pref: UniverseThemePref) {
    try { window.localStorage.setItem(UNIVERSE_THEME_KEY, pref); } catch { /* privat-modus */ }
}

export function resolveUniverseTheme(pref: UniverseThemePref = loadUniverseThemePref()): UniverseTheme {
    return pref === 'system' ? systemUniverseTheme() : pref;
}

export function applyUniverseTheme(theme: UniverseTheme) {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.uv2Theme = theme;
}

/** Boot once on Universe v2: follow the stored choice, or the OS preference. */
export function bootUniverseTheme(): UniverseTheme {
    const theme = resolveUniverseTheme();
    applyUniverseTheme(theme);
    return theme;
}

export function watchSystemUniverseTheme(onChange: (theme: UniverseTheme) => void): () => void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handle = () => {
        if (loadUniverseThemePref() !== 'system') return;
        const next = mq.matches ? 'light' : 'dark';
        applyUniverseTheme(next);
        onChange(next);
    };
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
}
