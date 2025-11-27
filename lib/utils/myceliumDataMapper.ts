/**
 * MYCELIUM DATA MAPPER - RADIAL CONSTELLATION EDITION
 * ============================================================================
 * Converts Core API data into 2.5D Mycelium visualization format
 * Uses deterministic RADIAL CONSTELLATION layout (no random physics!)
 * ============================================================================
 *
 * DESIGN PHILOSOPHY:
 * - Strictly 2.5D (all in one plane, z only for layering/parallax)
 * - No Physics Engine (deterministic geometry only)
 * - Semantic Clustering (by tag, type, author)
 * - Concentric Circles (2-3 radii, R1=1.0, R2=1.8, R3=2.6)
 * - Angle Segments (clusters get pie slices)
 * - Center Node (activeNodeId or meta-node in middle)
 * - Reproducible Layout (same input = same output)
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
    // Department/Space/Folder
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
    intel_report: 0.6,  // Larger for Môra insights
    other: 0.28,
    department: 1.0,
    space: 0.75,
    folder: 0.5,
};

// ============================================================================
// RADIAL CONSTELLATION LAYOUT
// ============================================================================

/**
 * Simple hash function to get deterministic pseudo-random value from string
 * Used for stable positioning (same ID = same position)
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Determine cluster key for a node
 * Priority: first tag > type > "other"
 */
function getClusterKey(node: CoreNode): string {
    const tags = (node.metadata?.tags as string[]) || [];
    if (tags.length > 0) return tags[0];
    return node.type || 'other';
}

/**
 * RADIAL CONSTELLATION LAYOUT
 * Deterministic, cluster-based, concentric circle positioning
 */
function calculateRadialConstellationLayout(
    nodes: Array<{ id: string; clusterKey: string; connections: string[] }>,
    activeNodeId?: string | null
): Map<string, [number, number, number]> {
    const positions = new Map<string, [number, number, number]>();

    if (nodes.length === 0) return positions;

    // STEP 1: Group nodes by cluster
    const clusters = new Map<string, typeof nodes>();
    nodes.forEach(node => {
        if (!clusters.has(node.clusterKey)) {
            clusters.set(node.clusterKey, []);
        }
        clusters.get(node.clusterKey)!.push(node);
    });

    const clusterKeys = Array.from(clusters.keys());
    const clusterCount = clusterKeys.length;

    // STEP 2: Define concentric circles
    const RADII = [1.0, 1.8, 2.6]; // Inner, Middle, Outer

    // STEP 3: Assign angle ranges to clusters (pie slices)
    const anglePerCluster = (Math.PI * 2) / clusterCount;

    // STEP 4: Place activeNodeId in center if exists
    if (activeNodeId) {
        const activeNode = nodes.find(n => n.id === activeNodeId);
        if (activeNode) {
            positions.set(activeNodeId, [0, 0, 1.2]); // Center, elevated depth
        }
    }

    // STEP 5: Position nodes in their cluster segments
    clusterKeys.forEach((clusterKey, clusterIndex) => {
        const clusterNodes = clusters.get(clusterKey)!;
        const baseAngle = clusterIndex * anglePerCluster;

        // Filter out active node if it's already centered
        const nodesToPlace = clusterNodes.filter(n => n.id !== activeNodeId);

        if (nodesToPlace.length === 0) return;

        // Distribute nodes across radii (inner to outer as count grows)
        let radiusIndex = 0;
        let nodesOnCurrentRadius = 0;
        const maxNodesPerRadius = Math.ceil(nodesToPlace.length / RADII.length);

        nodesToPlace.forEach((node, index) => {
            // Determine which radius to use
            if (nodesOnCurrentRadius >= maxNodesPerRadius && radiusIndex < RADII.length - 1) {
                radiusIndex++;
                nodesOnCurrentRadius = 0;
            }

            const radius = RADII[radiusIndex];
            nodesOnCurrentRadius++;

            // Calculate angle within cluster segment
            // Use hash for deterministic but "natural" spread
            const angleSpread = anglePerCluster * 0.8; // Leave 20% gap between clusters
            const angleOffset = (hashString(node.id) % 1000) / 1000 * angleSpread;
            const angle = baseAngle + angleOffset;

            // Add subtle radius variation for organic feel (deterministic)
            const radiusVariation = ((hashString(node.id + 'r') % 100) / 100) * 0.15;
            const finalRadius = radius + radiusVariation;

            // Calculate 2D position
            const x = Math.cos(angle) * finalRadius;
            const y = Math.sin(angle) * finalRadius;

            // Z is for depth/layering only (subtle parallax)
            // Inner nodes slightly higher depth
            const depth = 0.5 + (1 - radiusIndex / RADII.length) * 0.4;

            positions.set(node.id, [x, y, depth]);
        });
    });

    return positions;
}

/**
 * Convert Core Nodes to Mycelium Nodes with SEMANTIC connections
 *
 * WICHTIG: Keine zufälligen Verbindungen!
 * Nur echte semantische Relationen basierend auf:
 * - Shared Tags (metadata.tags)
 * - Same Folder (folder_id)
 * - Same Author (metadata.author)
 * - Same Type mit shared tags
 *
 * FUTURE: Intelligence Layer wird via Relations-API automatisch
 * weitere semantische Verbindungen erstellen (GET /v1/nodes/{id}/relations)
 */
export function mapNodesToMycelium(
    coreNodes: CoreNode[],
    options?: {
        useSemanticConnections?: boolean;
        activeNodeId?: string | null;
    }
): MyceliumNode[] {
    if (coreNodes.length === 0) return [];

    // Build ONLY semantic connections - no random!
    const nodeConnections = new Map<string, Set<string>>();

    coreNodes.forEach((node) => {
        nodeConnections.set(node.id, new Set());
    });

    // ONLY SEMANTIC CONNECTIONS - No random!
    if (options?.useSemanticConnections !== false) {
        // 1. Connect nodes with SHARED TAGS (real semantic relationship)
        coreNodes.forEach((nodeA, i) => {
            const tagsA = (nodeA.metadata?.tags as string[]) || [];

            coreNodes.slice(i + 1).forEach((nodeB) => {
                const tagsB = (nodeB.metadata?.tags as string[]) || [];
                const sharedTags = tagsA.filter((tag) => tagsB.includes(tag));

                // Only connect if they share tags (real semantic link)
                if (sharedTags.length > 0) {
                    nodeConnections.get(nodeA.id)?.add(nodeB.id);
                    nodeConnections.get(nodeB.id)?.add(nodeA.id);
                }
            });
        });

        // 2. Connect nodes in SAME FOLDER (folder_id relationship)
        // IMPORTANT: Don't create complete graph! Limit connections per node.
        const folderGroups = new Map<string, CoreNode[]>();
        coreNodes.forEach((node) => {
            if (node.folder_id) {
                if (!folderGroups.has(node.folder_id)) {
                    folderGroups.set(node.folder_id, []);
                }
                folderGroups.get(node.folder_id)!.push(node);
            }
        });

        // Connect nodes within same folder - SPARSE network (max 3-5 connections per node)
        folderGroups.forEach((nodes) => {
            if (nodes.length > 1) {
                // Strategy: Each node connects to its 2-3 nearest neighbors (by creation order)
                // This creates a "chain" or "small clusters" instead of complete graph
                nodes.forEach((nodeA, i) => {
                    // Connect to next 1-2 nodes (creates sequential chain)
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

        // 3. Connect nodes by SAME AUTHOR (metadata.author)
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
                // Connect author's nodes to each other (limit to 2 connections per node)
                nodes.forEach((nodeA, i) => {
                    nodes.slice(i + 1, Math.min(i + 3, nodes.length)).forEach((nodeB) => {
                        nodeConnections.get(nodeA.id)?.add(nodeB.id);
                        nodeConnections.get(nodeB.id)?.add(nodeA.id);
                    });
                });
            }
        });

        // 4. Connect by TYPE (documents reference each other, but only with shared tags)
        const typeGroups = new Map<string, CoreNode[]>();
        coreNodes.forEach((node) => {
            if (!typeGroups.has(node.type)) {
                typeGroups.set(node.type, []);
            }
            typeGroups.get(node.type)!.push(node);
        });

        // Only connect within type if there are shared tags
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

    // Calculate RADIAL CONSTELLATION layout (deterministic!)
    const layoutData = coreNodes.map((node) => ({
        id: node.id,
        clusterKey: getClusterKey(node),
        connections: Array.from(nodeConnections.get(node.id) || []),
    }));

    const positions = calculateRadialConstellationLayout(layoutData, options?.activeNodeId);

    // Map to Mycelium format
    return coreNodes.map((node) => ({
        id: node.id,
        title: node.title || 'Untitled',
        type: node.type,
        position: positions.get(node.id) || [0, 0, 0],
        color: TYPE_COLORS[node.type] || TYPE_COLORS.other,
        size: TYPE_SIZES[node.type] || 0.4,
        connections: Array.from(nodeConnections.get(node.id) || []),
    }));
}

/**
 * Convert Departments to Mycelium Nodes (Simple Circle Layout)
 */
export function mapDepartmentsToMycelium(
    departments: CoreDepartment[],
    activeDepartmentId?: string | null
): MyceliumNode[] {
    return departments.map((dept, index) => {
        // If this is the active department, place it in center
        if (activeDepartmentId && dept.id === activeDepartmentId) {
            return {
                id: dept.id,
                title: dept.name,
                type: 'department',
                position: [0, 0, 1.2], // Center, elevated
                color: dept.color || TYPE_COLORS.department,
                size: TYPE_SIZES.department,
                connections: [],
            };
        }

        // Otherwise, arrange in circle
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
            connections: [], // Departments don't connect to each other (yet)
        };
    });
}

/**
 * Convert Spaces to Mycelium Nodes (Radial Layout)
 */
export function mapSpacesToMycelium(
    spaces: CoreSpace[],
    activeSpaceId?: string | null
): MyceliumNode[] {
    const layoutData = spaces.map((space) => ({
        id: space.id,
        clusterKey: 'space', // All spaces in one cluster
        connections: [], // Can be enhanced with semantic connections
    }));

    const positions = calculateRadialConstellationLayout(layoutData, activeSpaceId);

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
 * Convert Folders to Mycelium Nodes (Radial Layout with parent-child connections)
 */
export function mapFoldersToMycelium(
    folders: CoreFolder[],
    activeFolderId?: string | null
): MyceliumNode[] {
    // Connect parent-child folders
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
        clusterKey: folder.parent_id || 'root', // Cluster by parent
        connections: Array.from(connections.get(folder.id) || []),
    }));

    const positions = calculateRadialConstellationLayout(layoutData, activeFolderId);

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
