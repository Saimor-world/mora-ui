// Widget system — shared types.
//
// Built on react-grid-layout: a surface (Home, Department) owns a list of
// widget instances, each carrying its grid geometry (x/y/w/h in grid units).
// react-grid-layout handles free drag, resize, collision and compaction; we
// persist the geometry per surface so a user's desktop arrangement sticks.

export type WidgetSurface = 'home' | 'department';

/** A placed widget. `i` is the react-grid-layout item key (instance id). */
export interface WidgetInstance {
    i: string;
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

/** Handlers a widget may call. All optional — a widget degrades gracefully. */
export interface WidgetContext {
    surface: WidgetSurface;
    departmentId?: string | null;
    openMora?: () => void;
    openFinder?: () => void;
    openCalendar?: () => void;
    openMail?: () => void;
    openTeam?: () => void;
    openIntegrations?: () => void;
    openNightwatch?: () => void;
    goExplore?: () => void;
}

export interface WidgetDefinition {
    type: string;
    label: string;
    /** One-line description shown in the add palette. */
    hint: string;
    icon: React.ReactNode;
    defaultW: number;
    defaultH: number;
    minW: number;
    minH: number;
    surfaces: WidgetSurface[];
    /** The widget body. Receives the live context. */
    render: (props: { context: WidgetContext }) => React.ReactNode;
}

/** Grid column counts per react-grid-layout breakpoint. */
export const WIDGET_GRID_COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 } as const;
export const WIDGET_GRID_BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as const;
export const WIDGET_ROW_HEIGHT = 58;
