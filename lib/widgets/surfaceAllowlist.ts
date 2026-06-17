import type { WidgetSurface } from '@/lib/widgets/types';

/**
 * Department desktop allowlist — employees see team/dept-scoped widgets only.
 * Personal mail/calendar (meinTag) and org-wide overview (orgStats) belong on
 * Home / Universe, not on the department employee surface.
 */
export const DEPARTMENT_WIDGET_ALLOWLIST = new Set([
    'deptStats',
    'signals',
    'team',
    'quickActions',
    'clock',
    'nightwatch',
    'mora',
]);

export function isWidgetAllowedOnSurface(type: string, surface: WidgetSurface): boolean {
    if (surface !== 'department') return true;
    return DEPARTMENT_WIDGET_ALLOWLIST.has(type);
}

export function filterWidgetsForSurface<T extends { type: string }>(
    items: T[],
    surface: WidgetSurface,
): T[] {
    return items.filter((w) => isWidgetAllowedOnSurface(w.type, surface));
}
