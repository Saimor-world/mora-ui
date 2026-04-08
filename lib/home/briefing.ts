import type { CoreDepartment } from '@/lib/types/core';
import type { CoreTreeNode } from '@/lib/types/core';

/**
 * buildBriefing — generates a 1–2 sentence ambient briefing for HomeSurface.
 *
 * treeData children states:
 *   undefined  → not yet lazy-loaded; skip this dept (not quiet, not active)
 *   []         → loaded, empty → quiet
 *   [...items] → loaded with content → active
 */
export function buildBriefing(
    departments: CoreDepartment[],
    treeData: CoreTreeNode[] | null,
): string {
    if (!departments.length || !treeData) return 'Bereit wenn du es bist.';

    const active: Array<{ name: string; count: number }> = [];
    const quiet: string[] = [];

    for (const dept of departments) {
        const node = treeData.find((n) => n.id === dept.id);
        if (!node || node.children === undefined) continue;
        if (node.children.length === 0) {
            quiet.push(dept.name);
        } else {
            active.push({ name: dept.name, count: node.children.length });
        }
    }

    if (!active.length && !quiet.length) return 'Bereit wenn du es bist.';

    const parts: string[] = [];

    if (active.length === 1) {
        const { name, count } = active[0];
        parts.push(`${name} ist aktiv — ${count} ${count === 1 ? 'Inhalt' : 'Inhalte'}.`);
    } else if (active.length > 1) {
        const names = active.map((a) => a.name).join(', ');
        const total = active.reduce((sum, a) => sum + a.count, 0);
        parts.push(`${names} sind aktiv — ${total} ${total === 1 ? 'Inhalt' : 'Inhalte'} insgesamt.`);
    }

    if (quiet.length === 1) {
        parts.push(`${quiet[0]} ist ruhig.`);
    } else if (quiet.length > 1) {
        parts.push(`${quiet.join(', ')} sind ruhig.`);
    }

    return parts.join(' ') || 'Bereit wenn du es bist.';
}
