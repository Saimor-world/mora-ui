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
    if (viewLevel === 'company') return 'Portfolio';
    if (viewLevel === 'department') return 'Department';
    if (viewLevel === 'space') return 'Space';
    if (viewLevel === 'folder') return 'Folder';
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
}: BuildShellContextSnapshotArgs): ShellContextSnapshot => {
    const scopeLabel = getShellScopeLabel(viewLevel);
    const workspaceTitle = activeCompany?.name || userCompanyName || 'Firmenkontext';
    const leadingSpace = pickLeadingSpace(activeSpaces, foldersBySpace);
    const leadingFolder = pickLeadingFolder(activeFolders);

    if (activeFolder && activeSpace) {
        return {
            scopeLabel,
            contextLabel: 'Folder',
            title: activeFolder.name,
            subtitle: activeSpace.name,
            description: 'Du bist in einem konkreten Ordner. Von hier aus solltest du Dokumente oeffnen, zurueck in den Bereich springen oder den Finder fuer diesen Ordner nutzen.',
            signalA: formatCount(activeFolder.node_count || 0, 'Dokument', 'Dokumente'),
            signalB: formatCount(activeFolders.length, 'Ordner', 'Ordner im Bereich'),
            accent: activeFolder.color || activeSpace.color || activeDepartment?.color || accent,
            nextMoveLabel: `Zurueck zu ${activeSpace.name}`,
            nextMoveHint: 'Oeffne wieder den Bereich und halte diesen Ordner als aktuellen Fokus.',
            nextTarget: { kind: 'space', id: activeSpace.id },
        };
    }

    if (activeSpace) {
        const docCount = activeFolders.reduce((sum, folder) => sum + (folder.node_count || 0), 0);
        return {
            scopeLabel,
            contextLabel: 'Space',
            title: activeSpace.name,
            subtitle: activeDepartment?.name || workspaceTitle,
            description: 'Das ist der aktuelle Arbeitsbereich dieses Departments. Hier sollten echte Ordner, Dokumente und der naechste sinnvolle Einstieg sichtbar sein.',
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
            contextLabel: 'Department',
            title: activeDepartment.name,
            subtitle: workspaceTitle,
            description: 'Das Department zeigt seine Bereiche, Ordner und Dokumente als Struktur. Von hier aus solltest du in den passenden Bereich hineinzoomen, nicht Apps wechseln.',
            signalA: formatCount(activeSpaces.length, 'Bereich', 'Bereiche'),
            signalB: `${formatCount(folderCount, 'Ordner')} / ${formatCount(docCount, 'Dokument', 'Dokumente')}`,
            accent: activeDepartment.color || accent,
            nextMoveLabel: leadingSpace ? `In ${leadingSpace.name} zoomen` : 'Department im Finder oeffnen',
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
        contextLabel: 'Universe',
        title: workspaceTitle,
        subtitle: isPublicDemoSurface ? 'Oeffentliche Demo-Instanz' : 'Live-Struktur',
        description: isPublicDemoSurface
            ? 'Das Universe zeigt eine kuratierte Demo-Instanz. Hier solltest du direkt die passende Abteilung fuer den Showcase waehlen.'
            : 'Das Universe zeigt den Gesamtzuschnitt der aktuellen Instanz. Hier sollte klar sein, in welches Department du als Naechstes hineingehst.',
        signalA: formatCount(departmentCount, 'Abteilung', 'Abteilungen'),
        signalB: isPublicDemoSurface ? 'Oeffentliche Demo' : formatCount(companyCount, 'Firmenkontext', 'Firmenkontexte'),
        accent,
        nextMoveLabel: isPublicDemoSurface ? 'Demo-Abteilung waehlen' : companyCount > 1 ? 'Kontext oeffnen' : 'Abteilung waehlen',
        nextMoveHint: isPublicDemoSurface
            ? 'Diese Instanz ist ein Showcase. Waehle die passende Abteilung und gehe dann in die Beispielstruktur.'
            : companyCount > 1
            ? 'Diese Instanz hat mehrere Firmenkontexte. Waehle zuerst den richtigen Kontext und springe dann tiefer.'
            : 'Waehle zuerst die passende Abteilung und geh dann in die operative Struktur.',
        nextTarget: { kind: 'company', id: activeCompany?.id },
    };
};
