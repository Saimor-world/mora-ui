/**
 * MYCELIUM DATA MAPPER - NATURAL MYCELIUM EDITION
 * ============================================================================
 * Converts Core API data into 2.5D Mycelium visualization format
 * Uses NATURAL VOGEL SPIRAL layout (Phyllotaxis) - like real fungal mycelium!
 * ============================================================================
 *
 * DESIGN PHILOSOPHY:
 * - Natural distribution (Vogel Spiral) - NO cluster sectors
 * - Semantic connections ONLY (Tags, Author, Folder, Type)
 * - Positions: Mathematically distributed (golden angle)
 * - Connections: Semantically determined (real relationships)
 * ============================================================================
 */

import type { CoreNode, CoreFolder, CoreSpace, CoreDepartment } from '@/lib/types/core';

export interface MyceliumNode {
    id: string;
    title: string;
    type: string;
    position: [number, number, number];
    color: string;
    size: number;
    connections: string[]; // IDs of connected nodes
}

// Color mapping by node type
const TYPE_COLORS: Record<string, string> = {
    document: '#10B981',    // Emerald
    note: '#A78BFA',        // Purple
    link: '#60A5FA',        // Blue
    task: '#F59E0B',        // Amber
    intel_report: '#CEB676', // Gold - Môra generated
    other: '#6B7280',       // Gray
    department: '#10B981',
    space: '#3B82F6',
    folder: '#8B5CF6',
};

// Size mapping by importance/type
const TYPE_SIZES: Record<string, number> = {
    document: 0.4,
    note: 0.35,
    link: 0.3,
    task: 0.38,
    intel_report: 0.6,
    other: 0.28,
    department: 1.0,
    space: 0.75,
    folder: 0.5,
};

/**
 * NATURAL MYCELIUM LAYOUT (Vogel Spiral / Phyllotaxis)
 * Distributes nodes evenly across canvas using golden angle
 * Like sunflower seeds or fungal spore patterns
 */
function calculateMyceliumLayout(
    nodes: Array<{ id: string; clusterKey: string; connections: string[] }>,
    activeNodeId?: string | null
): Map<string, [number, number, number]> {
    const positions = new Map<string, [number, number, number]>();

    if (nodes.length === 0) return positions;

    // Golden Angle for Vogel's spiral (Phyllotaxis)
    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~137.5°

    // Scale factor based on number of nodes
    const SCALE_FACTOR = Math.min(0.5, Math.sqrt(nodes.length) * 0.12);

    // Place activeNodeId in center if exists
    if (activeNodeId) {
        const activeNode = nodes.find(n => n.id === activeNodeId);
        if (activeNode) {
            positions.set(activeNodeId, [0, 0, 1.2]);
        }
    }

    // Filter out active node
    const nodesToPlace = nodes.filter(n => n.id !== activeNodeId);

    // Vogel's Spiral: Natural distribution
    nodesToPlace.forEach((node, index) => {
        const theta = index * GOLDEN_ANGLE;
        const radius = SCALE_FACTOR * Math.sqrt(index + 1) + 0.8;

        const x = radius * Math.cos(theta);
        const y = radius * Math.sin(theta);
        const depth = 0.6 + ((index % 4) * 0.15);

        positions.set(node.id, [x, y, depth]);
    });

    return positions;
}

/**
 * Determine cluster key for a node (used for coloring, not positioning)
 * Priority: first tag > type > "other"
 */
function getClusterKey(node: CoreNode): string {
    const tags = (node.metadata?.tags as string[]) || [];
    if (tags.length > 0) return tags[0];
    return node.type || 'other';
}

/**
 * Convert Core Nodes to Mycelium Nodes
 * POSITIONS: Mathematical (Vogel Spiral)
 * CONNECTIONS: Semantic (Tags, Author, Folder, Type)
 */
export function mapNodesToMycelium(
    coreNodes: CoreNode[],
    options?: {
        useSemanticConnections?: boolean;
        activeNodeId?: string | null;
    }
): MyceliumNode[] {
    if (coreNodes.length === 0) return [];

    // Build SEMANTIC connections (nur wo Daten zusammengehören!)
    const nodeConnections = new Map<string, Set<string>>();

    coreNodes.forEach((node) => {
        nodeConnections.set(node.id, new Set());
    });

    // SEMANTIC CONNECTIONS ONLY
    if (options?.useSemanticConnections !== false) {
        // 1. SHARED TAGS
        coreNodes.forEach((nodeA, i) => {
            const tagsA = (nodeA.metadata?.tags as string[]) || [];

            coreNodes.slice(i + 1).forEach((nodeB) => {
                const tagsB = (nodeB.metadata?.tags as string[]) || [];
                const sharedTags = tagsA.filter((tag) => tagsB.includes(tag));

                if (sharedTags.length > 0) {
                    nodeConnections.get(nodeA.id)?.add(nodeB.id);
                    nodeConnections.get(nodeB.id)?.add(nodeA.id);
                }
            });
        });

        // 2. SAME FOLDER (sparse network)
        const folderGroups = new Map<string, CoreNode[]>();
        coreNodes.forEach((node) => {
            if (node.folder_id) {
                if (!folderGroups.has(node.folder_id)) {
                    folderGroups.set(node.folder_id, []);
                }
                folderGroups.get(node.folder_id)!.push(node);
            }
        });

        folderGroups.forEach((nodes) => {
            if (nodes.length > 1) {
                nodes.forEach((nodeA, i) => {
                    const maxConnections = Math.min(2, nodes.length - i - 1);
                    for (let j = 1; j <= maxConnections; j++) {
                        const nodeB = nodes[i + j];
                        if (nodeB) {
                            nodeConnections.get(nodeA.id)?.add(nodeB.id);
                            nodeConnections.get(nodeB.id)?.add(nodeA.id);
                        }
                    }
                });
            }
        });

        // 3. SAME AUTHOR
        const authorGroups = new Map<string, CoreNode[]>();
        coreNodes.forEach((node) => {
            const author = node.metadata?.author as string;
            if (author) {
                if (!authorGroups.has(author)) {
                    authorGroups.set(author, []);
                }
                authorGroups.get(author)!.push(node);
            }
        });

        authorGroups.forEach((nodes) => {
            if (nodes.length > 1) {
                nodes.forEach((nodeA, i) => {
                    nodes.slice(i + 1, Math.min(i + 3, nodes.length)).forEach((nodeB) => {
                        nodeConnections.get(nodeA.id)?.add(nodeB.id);
                        nodeConnections.get(nodeB.id)?.add(nodeA.id);
                    });
                });
            }
        });

        // 4. SAME TYPE (documents with shared tags)
        const typeGroups = new Map<string, CoreNode[]>();
        coreNodes.forEach((node) => {
            if (!typeGroups.has(node.type)) {
                typeGroups.set(node.type, []);
            }
            typeGroups.get(node.type)!.push(node);
        });

        typeGroups.forEach((nodes, type) => {
            if (nodes.length > 1 && type === 'document') {
                nodes.forEach((nodeA, i) => {
                    const tagsA = (nodeA.metadata?.tags as string[]) || [];
                    nodes.slice(i + 1).forEach((nodeB) => {
                        const tagsB = (nodeB.metadata?.tags as string[]) || [];
                        if (tagsA.some(tag => tagsB.includes(tag))) {
                            nodeConnections.get(nodeA.id)?.add(nodeB.id);
                            nodeConnections.get(nodeB.id)?.add(nodeA.id);
                        }
                    });
                });
            }
        });
    }

    // Calculate NATURAL MYCELIUM layout (Vogel Spiral)
    const layoutData = coreNodes.map((node) => ({
        id: node.id,
        clusterKey: getClusterKey(node),
        connections: Array.from(nodeConnections.get(node.id) || []),
    }));

    const positions = calculateMyceliumLayout(layoutData, options?.activeNodeId);

    // Map to Mycelium format
    return coreNodes.map((node) => ({
        id: node.id,
        title: node.title || node.name || 'Untitled',
        type: node.type,
        position: positions.get(node.id) || [0, 0, 0],
        color: TYPE_COLORS[node.type] || TYPE_COLORS.other,
        size: TYPE_SIZES[node.type] || 0.4,
        connections: Array.from(nodeConnections.get(node.id) || []),
    }));
}

/**
 * Convert Departments to Mycelium Nodes
 */
export function mapDepartmentsToMycelium(
    departments: CoreDepartment[],
    activeDepartmentId?: string | null
): MyceliumNode[] {
    return departments.map((dept, index) => {
        if (activeDepartmentId && dept.id === activeDepartmentId) {
            return {
                id: dept.id,
                title: dept.name,
                type: 'department',
                position: [0, 0, 1.2],
                color: dept.color || TYPE_COLORS.department,
                size: TYPE_SIZES.department,
                connections: [],
            };
        }

        const angle = (index / departments.length) * Math.PI * 2;
        const radius = 2.0;

        return {
            id: dept.id,
            title: dept.name,
            type: 'department',
            position: [
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                0.8,
            ],
            color: dept.color || TYPE_COLORS.department,
            size: TYPE_SIZES.department,
            connections: [],
        };
    });
}

/**
 * Convert Spaces to Mycelium Nodes
 */
export function mapSpacesToMycelium(
    spaces: CoreSpace[],
    activeSpaceId?: string | null
): MyceliumNode[] {
    const layoutData = spaces.map((space) => ({
        id: space.id,
        clusterKey: 'space',
        connections: [],
    }));

    const positions = calculateMyceliumLayout(layoutData, activeSpaceId);

    return spaces.map((space) => ({
        id: space.id,
        title: space.name,
        type: 'space',
        position: positions.get(space.id) || [0, 0, 0],
        color: space.color || TYPE_COLORS.space,
        size: TYPE_SIZES.space,
        connections: [],
    }));
}

/**
 * Convert Folders to Mycelium Nodes
 */
export function mapFoldersToMycelium(
    folders: CoreFolder[],
    activeFolderId?: string | null
): MyceliumNode[] {
    const connections = new Map<string, Set<string>>();

    folders.forEach((folder) => {
        if (!connections.has(folder.id)) {
            connections.set(folder.id, new Set());
        }

        if (folder.parent_id) {
            if (!connections.has(folder.parent_id)) {
                connections.set(folder.parent_id, new Set());
            }
            connections.get(folder.parent_id)?.add(folder.id);
            connections.get(folder.id)?.add(folder.parent_id);
        }
    });

    const layoutData = folders.map((folder) => ({
        id: folder.id,
        clusterKey: folder.parent_id || 'root',
        connections: Array.from(connections.get(folder.id) || []),
    }));

    const positions = calculateMyceliumLayout(layoutData, activeFolderId);

    return folders.map((folder) => ({
        id: folder.id,
        title: folder.name,
        type: 'folder',
        position: positions.get(folder.id) || [0, 0, 0],
        color: folder.color || TYPE_COLORS.folder,
        size: TYPE_SIZES.folder,
        connections: Array.from(connections.get(folder.id) || []),
    }));
}
