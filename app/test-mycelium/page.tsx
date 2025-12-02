"use client";

import React, { useEffect } from 'react';
import { Mycelium25D } from '@/components/organic/Mycelium25D';
import { MyceliumNode } from '@/lib/utils/myceliumDataMapper';
import { useMoraStore } from '@/lib/store/moraState';

// --- TEST DATA ---
const TEST_NODES: MyceliumNode[] = [
    {
        id: 'folder-einkauf',
        title: 'Einkauf',
        type: 'folder',
        position: [-0.8, -0.4, 0.8], // Left
        color: '#8B5CF6',
        size: 0.6,
        connections: ['folder-produktion', 'folder-verkauf']
    },
    {
        id: 'folder-produktion',
        title: 'Produktion',
        type: 'folder',
        position: [0, 0.6, 1.0], // Center Bottom, Closer
        color: '#8B5CF6',
        size: 0.7,
        connections: ['folder-einkauf', 'folder-verkauf']
    },
    {
        id: 'folder-verkauf',
        title: 'Verkauf',
        type: 'folder',
        position: [0.8, -0.4, 0.8], // Right
        color: '#8B5CF6',
        size: 0.6,
        connections: ['folder-einkauf', 'folder-produktion']
    }
];

export default function TestMyceliumPage() {
    const { activeFolderId, setActiveFolder } = useMoraStore();

    // Simulate having dummy nodes in the store for testing
    useEffect(() => {
        // This is just for the FolderRoom to have data to display
        // In real usage, data would come from the backend
        const store = useMoraStore.getState();

        // Add dummy nodes for "Einkauf" folder
        if (activeFolderId === 'folder-einkauf') {
            store.nodesByFolder['folder-einkauf'] = [
                { id: 'doc-1', title: 'Budget 2025', type: 'document', folder_id: 'folder-einkauf', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: 'doc-2', title: 'Lieferantenliste', type: 'document', folder_id: 'folder-einkauf', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: 'link-1', title: 'SAP Portal', type: 'link', folder_id: 'folder-einkauf', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: 'task-1', title: 'Rechnungen prüfen', type: 'task', folder_id: 'folder-einkauf', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: 'img-1', title: 'Büroplan.png', type: 'image', folder_id: 'folder-einkauf', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: 'doc-3', title: 'Vertrag Müller', type: 'document', folder_id: 'folder-einkauf', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: 'other-1', title: 'Archiv 2024', type: 'other', folder_id: 'folder-einkauf', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            ] as any;
        }
    }, [activeFolderId]);

    return (
        <div className="w-screen h-screen bg-[#050505] overflow-hidden relative font-sans">
            {/* MYCELIUM LAYER */}
            <div className="absolute inset-0 z-0">
                <Mycelium25D
                    nodes={TEST_NODES}
                    onNodeClick={(nodeId) => {
                        console.log('[Test Page] Folder clicked:', nodeId);
                        // Set active folder in global store
                        setActiveFolder(nodeId);
                    }}
                    activeNodeId={activeFolderId}
                    variant="folder"
                />
            </div>

            {/* NOTE: FolderRoom is now global in layout.tsx, no need to render it here */}

            {/* HEADER / STATUS */}
            <div className="absolute top-6 left-8 z-20 pointer-events-none">
                <h1 className="text-white/30 font-mono text-xs tracking-[0.2em]">SAIMÔR // GLOBAL FOLDERROOM TEST</h1>
                {activeFolderId && (
                    <p className="text-mora-gold/50 font-mono text-[10px] mt-1">Active: {activeFolderId}</p>
                )}
            </div>
        </div>
    );
}
