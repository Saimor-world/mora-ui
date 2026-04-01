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
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
}: BuildShellContextSnapshotArgs): ShellContextSnapshot => {
    const scopeLabel = getShellScopeLabel(viewLevel);
    const workspaceTitle = activeCompany?.name || userCompanyName || 'Workspace';
    const leadingSpace = pickLeadingSpace(activeSpaces, foldersBySpace);
    const leadingFolder = pickLeadingFolder(activeFolders);

    if (activeFolder && activeSpace) {
        return {
            scopeLabel,
            contextLabel: 'Folder',
            title: activeFolder.name,
            subtitle: activeSpace.name,
            description: 'Aktiver Arbeitsknoten. Hier sollte das OS Ruecksprung, Review und Notizen direkt aus dem Fokus heraus anbieten.',
            signalA: `${activeFolder.node_count || 0} docs`,
            signalB: `${activeFolders.length} folders im Space`,
            accent: activeFolder.color || activeSpace.color || activeDepartment?.color || accent,
            nextMoveLabel: `Zurueck zu ${activeSpace.name}`,
            nextMoveHint: 'Den Folder-Kontext halten, aber den Raum wieder aufziehen.',
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
            description: 'Der Space ist jetzt die operative Mitte. Das OS sollte von hier direkt in den staerksten Folder oder den Finder fuehren.',
            signalA: `${activeFolders.length} folders`,
            signalB: `${docCount} docs`,
            accent: activeSpace.color || activeDepartment?.color || accent,
            nextMoveLabel: leadingFolder ? `Fokus auf ${leadingFolder.name}` : 'Finder fuer diesen Space',
            nextMoveHint: leadingFolder
                ? 'Der staerkste Folder ist der sinnvollste naechste Arbeitsschritt.'
                : 'Wenn noch kein Lead-Folder sichtbar ist, oeffne den Space im Finder.',
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
            description: 'Hier geht es nicht um App-Wechsel, sondern um den naechsten semantisch sinnvollen Zoom in die operative Struktur.',
            signalA: `${activeSpaces.length} spaces`,
            signalB: `${folderCount} folders / ${docCount} docs`,
            accent: activeDepartment.color || accent,
            nextMoveLabel: leadingSpace ? `In ${leadingSpace.name} zoomen` : 'Department im Finder oeffnen',
            nextMoveHint: leadingSpace
                ? 'Der staerkste Space sollte als naechstes aktiv werden.'
                : 'Wenn noch kein Lead-Space erkennbar ist, oeffne die Struktur im Finder.',
            nextTarget: leadingSpace
                ? { kind: 'space', id: leadingSpace.id }
                : { kind: 'department', id: activeDepartment.id },
        };
    }

    return {
        scopeLabel,
        contextLabel: 'Universe',
        title: workspaceTitle,
        subtitle: 'Live topography',
        description: 'Das OS sollte im Universe nicht alles gleichzeitig tun, sondern klar sagen, wo der beste Einstieg in die Arbeit liegt.',
        signalA: `${departmentCount} departments`,
        signalB: `${companyCount} workspaces`,
        accent,
        nextMoveLabel: 'Control Center oeffnen',
        nextMoveHint: 'Vom Universe aus ist zuerst Kontextwahl wichtiger als direkter Tiefensprung.',
        nextTarget: { kind: 'company', id: activeCompany?.id },
    };
};
