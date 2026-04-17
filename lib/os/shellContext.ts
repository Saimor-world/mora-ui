export type ShellViewLevel = 'company' | 'core' | 'department' | 'space' | 'folder' | string;

export interface ShellCompanyLike {
    id: string;
    name: string;
}

export interface ShellDepartmentLike {
    id: string;
    name: string;
    color?: string | null;
    company_id?: string | null;
}

export interface ShellSpaceLike {
    id: string;
    name: string;
    color?: string | null;
    folder_count?: number | null;
}

export interface ShellFolderLike {
    id: string;
    name: string;
    color?: string | null;
    node_count?: number | null;
    updated_at?: string | null;
    created_at?: string | null;
}

export type ShellContextTargetKind = 'company' | 'department' | 'space' | 'folder' | 'settings';

export interface ShellContextTarget {
    kind: ShellContextTargetKind;
    id?: string;
}

export interface ShellContextSnapshot {
    scopeLabel: string;
    contextLabel: string;
    title: string;
    subtitle: string;
    description: string;
    signalA: string;
    signalB: string;
    accent: string;
    nextMoveLabel: string;
    nextMoveHint: string;
    nextTarget: ShellContextTarget;
}

interface BuildShellContextSnapshotArgs {
    viewLevel?: ShellViewLevel;
    activeCompany?: ShellCompanyLike | null;
    activeDepartment?: ShellDepartmentLike | null;
    activeSpace?: ShellSpaceLike | null;
    activeFolder?: ShellFolderLike | null;
    activeSpaces?: ShellSpaceLike[];
    activeFolders?: ShellFolderLike[];
    foldersBySpace?: Record<string, ShellFolderLike[]>;
    companyCount?: number;
    departmentCount?: number;
    userCompanyName?: string | null;
    accent?: string;
    isPublicDemoSurface?: boolean;
    isLocalTruthSurface?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatCount = (value: number, singular: string, plural?: string) => {
    const resolvedPlural = plural || `${singular}e`;
    return `${value} ${value === 1 ? singular : resolvedPlural}`;
};

const getFreshnessWeight = (value?: string | null) => {
    if (!value) return 0.32;
    const days = (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24);
    return clamp(1 - days / 28, 0.18, 1);
};

export const getShellScopeLabel = (viewLevel?: ShellViewLevel) => {
    if (viewLevel === 'company') return 'Kontext';
    if (viewLevel === 'department') return 'Abteilung';
    if (viewLevel === 'space') return 'Bereich';
    if (viewLevel === 'folder') return 'Ordner';
    return 'Universe';
};

const pickLeadingSpace = (
    spaces: ShellSpaceLike[],
    foldersBySpace: Record<string, ShellFolderLike[]>
) => {
    if (!spaces.length) return null;

    return [...spaces].sort((left, right) => {
        const leftFolders = foldersBySpace[left.id] || [];
        const rightFolders = foldersBySpace[right.id] || [];
        const leftSignal = Math.max(left.folder_count ?? 0, leftFolders.length) + leftFolders.reduce((sum, folder) => sum + (folder.node_count || 0), 0) * 0.35;
        const rightSignal = Math.max(right.folder_count ?? 0, rightFolders.length) + rightFolders.reduce((sum, folder) => sum + (folder.node_count || 0), 0) * 0.35;
        return rightSignal - leftSignal;
    })[0] ?? null;
};

const pickLeadingFolder = (folders: ShellFolderLike[]) => {
    if (!folders.length) return null;

    return [...folders].sort((left, right) => {
        const leftSignal = (left.node_count || 0) * 0.82 + getFreshnessWeight(left.updated_at || left.created_at) * 5.2;
        const rightSignal = (right.node_count || 0) * 0.82 + getFreshnessWeight(right.updated_at || right.created_at) * 5.2;
        return rightSignal - leftSignal;
    })[0] ?? null;
};

export const buildShellContextSnapshot = ({
    viewLevel,
    activeCompany,
    activeDepartment,
    activeSpace,
    activeFolder,
    activeSpaces = [],
    activeFolders = [],
    foldersBySpace = {},
    companyCount = 0,
    departmentCount = 0,
    userCompanyName,
    accent = '#10B981',
    isPublicDemoSurface = false,
    isLocalTruthSurface = false,
}: BuildShellContextSnapshotArgs): ShellContextSnapshot => {
    const scopeLabel = getShellScopeLabel(viewLevel);
    const companyTitle = activeCompany?.name || userCompanyName || 'Organisation';
    const leadingSpace = pickLeadingSpace(activeSpaces, foldersBySpace);
    const leadingFolder = pickLeadingFolder(activeFolders);

    if (activeFolder && activeSpace) {
        return {
            scopeLabel,
            contextLabel: 'Ordner',
            title: activeFolder.name,
            subtitle: activeSpace.name,
            description: 'Du bist in einem konkreten Ordner. Von hier aus oeffnest du Inhalte, gehst in den Bereich zurueck oder springst in den Finder.',
            signalA: formatCount(activeFolder.node_count || 0, 'Dokument', 'Dokumente'),
            signalB: `${activeFolders.length} Ordner im Bereich`,
            accent: activeFolder.color || activeSpace.color || activeDepartment?.color || accent,
            nextMoveLabel: `Zurueck in ${activeSpace.name}`,
            nextMoveHint: 'Der Bereich bleibt dein Arbeitskontext. Der Ordner ist hier der aktuelle Fokus.',
            nextTarget: { kind: 'space', id: activeSpace.id },
        };
    }

    if (activeSpace) {
        const docCount = activeFolders.reduce((sum, folder) => sum + (folder.node_count || 0), 0);
        return {
            scopeLabel,
            contextLabel: 'Bereich',
            title: activeSpace.name,
            subtitle: activeDepartment?.name || companyTitle,
            description: 'Hier siehst du die echte Struktur dieses Bereichs. Ordner, Dokumente und der naechste sinnvolle Einstieg sollen direkt sichtbar sein.',
            signalA: formatCount(activeFolders.length, 'Ordner'),
            signalB: formatCount(docCount, 'Dokument', 'Dokumente'),
            accent: activeSpace.color || activeDepartment?.color || accent,
            nextMoveLabel: leadingFolder ? `Fokus auf ${leadingFolder.name}` : 'Finder fuer diesen Space',
            nextMoveHint: leadingFolder
                ? 'Der sichtbar staerkste Ordner ist hier der sinnvollste naechste Schritt.'
                : 'Wenn noch kein klarer Lead-Ordner sichtbar ist, oeffne die Struktur im Finder.',
            nextTarget: leadingFolder
                ? { kind: 'folder', id: leadingFolder.id }
                : { kind: 'space', id: activeSpace.id },
        };
    }

    if (activeDepartment) {
        const folderCount = activeSpaces.reduce((sum, space) => sum + Math.max(space.folder_count ?? 0, (foldersBySpace[space.id] || []).length), 0);
        const docCount = activeSpaces.reduce((sum, space) => sum + (foldersBySpace[space.id] || []).reduce((folderSum, folder) => folderSum + (folder.node_count || 0), 0), 0);
        return {
            scopeLabel,
            contextLabel: 'Abteilung',
            title: activeDepartment.name,
            subtitle: companyTitle,
            description: 'Die Abteilung zeigt ihre Bereiche und Schwerpunkte. Von hier aus gehst du in den passenden Bereich, nicht in eine App.',
            signalA: formatCount(activeSpaces.length, 'Bereich', 'Bereiche'),
            signalB: `${formatCount(folderCount, 'Ordner')} / ${formatCount(docCount, 'Dokument', 'Dokumente')}`,
            accent: activeDepartment.color || accent,
            nextMoveLabel: leadingSpace ? `In ${leadingSpace.name} zoomen` : 'Abteilung im Finder oeffnen',
            nextMoveHint: leadingSpace
                ? 'Der staerkste Bereich ist der beste naechste Einstieg.'
                : 'Wenn noch kein klarer Bereich vorne liegt, oeffne die Struktur im Finder.',
            nextTarget: leadingSpace
                ? { kind: 'space', id: leadingSpace.id }
                : { kind: 'department', id: activeDepartment.id },
        };
    }

    return {
        scopeLabel,
        contextLabel: isPublicDemoSurface ? 'Demo' : 'Organisation',
        title: companyTitle,
        subtitle: isPublicDemoSurface
            ? 'Kuratiertes Beispielsystem'
            : isLocalTruthSurface
                ? 'Single-Company-Instanz'
            : companyCount > 1
                ? `${companyCount} Organisationen aktiv`
                : 'Single-Company-Instanz',
        description: isPublicDemoSurface
            ? 'Simple Coffee Group zeigt die kuratierte Beispielstruktur von SAIMOR. Wähle eine Abteilung und gehe dann in die sichtbare Arbeitsstruktur.'
            : isLocalTruthSurface
                ? 'Diese lokale Instanz arbeitet mit genau einer aktiven Organisation. Von hier aus gehst du direkt in Abteilungen und Struktur.'
            : companyCount > 1
                ? 'Diese Instanz zeigt mehrere Organisationen. Waehle zuerst den richtigen Kontext und gehe dann tiefer.'
                : 'Diese Instanz ist auf eine Organisation zugeschnitten. Waehle die passende Abteilung und gehe dann in die Struktur.',
        signalA: formatCount(departmentCount, 'Abteilung', 'Abteilungen'),
        signalB: isPublicDemoSurface
            ? 'Beispielstruktur'
            : isLocalTruthSurface
                ? '1 Organisation'
            : companyCount > 1
                ? `${companyCount} Organisationen`
                : '1 Organisation',
        accent,
        nextMoveLabel: isPublicDemoSurface ? 'Abteilung oeffnen' : isLocalTruthSurface ? 'Abteilung waehlen' : companyCount > 1 ? 'Organisation waehlen' : 'Abteilung waehlen',
        nextMoveHint: isPublicDemoSurface
            ? 'Öffne die passende Abteilung und gehe von dort in die sichtbare Beispielstruktur.'
            : isLocalTruthSurface
            ? 'Die lokale Instanz hat nur einen aktiven Organisationskontext. Waehle direkt die passende Abteilung.'
            : companyCount > 1
            ? 'Diese Instanz hat mehrere Organisationen. Waehle zuerst den richtigen Kontext und springe dann tiefer.'
            : 'Waehle zuerst die passende Abteilung und geh dann in die operative Struktur.',
        nextTarget: { kind: 'company', id: activeCompany?.id },
    };
};
