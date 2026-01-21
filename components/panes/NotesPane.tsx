import React, { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { corePost, corePut, coreDelete, fetchNodesByCompany } from '@/lib/api/coreClient';
import { Search, Plus, Trash2, Save, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

const NOTES_STORAGE_KEY = 'saimor_notes';

export const NotesPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const { activeCompanyId } = useMoraStore();
    const pane = getPane(id);

    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [notesFolderId, setNotesFolderId] = useState<string | null>(null);

    // Initialize Notes Folder
    useEffect(() => {
        const init = async () => {
            if (!activeCompanyId) return;
            try {
                // Find or Create 'Notes' folder
                const folders = await import('@/lib/api/coreClient').then(m => m.coreGet(`/v1/folders?company_id=${activeCompanyId}`));
                let targetId = null;
                if (folders && Array.isArray(folders)) {
                    const existing = folders.find((f: any) => f.name === 'Notes');
                    if (existing) targetId = existing.id;
                }

                if (!targetId) {
                const spaces = await import('@/lib/api/coreClient').then(m => m.coreGet(`/v1/spaces?company_id=${activeCompanyId}`));
                    if (spaces && spaces.length > 0) {
                        const newFolder = await import('@/lib/api/coreClient').then(m => m.corePost('/v1/folders', {
                            name: 'Notes', space_id: spaces[0].id, description: 'Personal Notes', icon: 'file-text'
                        }));
                        if (newFolder) targetId = newFolder.id;
                    }
                }
                setNotesFolderId(targetId);
            } catch (e) {
                console.error("Notes init failed", e);
            }
        };
        init();
    }, [activeCompanyId]);

    // Load Notes
    useEffect(() => {
        const load = async () => {
            if (!activeCompanyId) return;
            setIsLoading(true);
            try {
                const fetched = await fetchNodesByCompany(activeCompanyId);
                if (fetched) {
                    const myNotes = fetched
                        .filter(n => n.type === 'note')
                        .map(n => ({
                            id: n.id,
                            title: n.name ?? "Untitled",
                            content: n.content ?? "",
                            createdAt: n.created_at ?? new Date().toISOString(),
                            updatedAt: n.updated_at || n.created_at || new Date().toISOString()
                        }))
                        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                    setNotes(myNotes);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [activeCompanyId]);

    // Auto-save debouncer
    useEffect(() => {
        if (!selectedNote) return;

        const timer = setTimeout(async () => {
            if (!selectedNote.id.startsWith('temp-')) {
                setIsSaving(true);
                try {
                    await corePut(`/v1/nodes/${selectedNote.id}`, {
                        name: selectedNote.title,
                        content: selectedNote.content
                    });
                } catch (e) { console.error("Save failed", e); }
                finally { setIsSaving(false); }
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [selectedNote?.title, selectedNote?.content]);

    const createNote = async () => {
        if (!notesFolderId || !activeCompanyId) return;

        try {
            const newNodeInfo = {
                name: 'Untitled Note',
                type: 'note',
                folder_id: notesFolderId,
                content: ''
            };

            const created = await corePost('/v1/nodes', newNodeInfo);
            if (created) {
                const newNote: Note = {
                    id: created.id,
                    title: created.name,
                    content: created.content,
                    createdAt: created.created_at,
                    updatedAt: created.created_at
                };
                setNotes([newNote, ...notes]);
                setSelectedNote(newNote);
            }
        } catch (e) {
            console.error("Create failed", e);
        }
    };

    const updateNote = (field: 'title' | 'content', value: string) => {
        if (!selectedNote) return;

        // Immediate UI update
        const updated = { ...selectedNote, [field]: value, updatedAt: new Date().toISOString() };
        setSelectedNote(updated);

        setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    };

    const deleteNote = async (noteId: string) => {
        try {
            await coreDelete(`/v1/nodes/${noteId}`);
            const updated = notes.filter(n => n.id !== noteId);
            setNotes(updated);
            if (selectedNote?.id === noteId) {
                setSelectedNote(updated.length > 0 ? updated[0] : null);
            }
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    const filteredNotes = notes.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Hook for isActive must be called before any returns
    const isActive = usePaneStore(state => state.activePaneId === id);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Notes"
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            onResize={(w, h) => updatePaneSize(id, w, h)}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={true}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="flex h-full">
                {/* Sidebar */}
                <div className="w-64 border-r border-white/5 flex flex-col">
                    {/* Search */}
                    <div className="p-3 border-b border-white/5">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                                type="text"
                                placeholder="Search notes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/20 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/30"
                            />
                        </div>
                    </div>

                    {/* New Note Button */}
                    <button
                        onClick={createNote}
                        className="m-3 flex items-center justify-center gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                    >
                        <Plus size={16} />
                        <span className="text-sm">New Note</span>
                    </button>

                    {/* Notes List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        <AnimatePresence>
                            {filteredNotes.map(note => (
                                <motion.div
                                    key={note.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    onClick={() => { setSelectedNote(note); }}
                                    className={`p-3 rounded-lg cursor-pointer group transition-colors ${selectedNote?.id === note.id
                                        ? 'bg-yellow-500/10 border border-yellow-500/20'
                                        : 'bg-black/10 border border-transparent hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-white/80 truncate">{note.title}</div>
                                            <div className="text-xs text-white/30 mt-1 truncate">
                                                {note.content.slice(0, 50) || 'No content'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                                        >
                                            <Trash2 size={12} className="text-red-400" />
                                        </button>
                                    </div>
                                    <div className="text-[10px] text-white/20 mt-2">
                                        {new Date(note.updatedAt).toLocaleDateString()}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filteredNotes.length === 0 && (
                            <div className="text-center text-white/30 text-sm py-8">
                                {notes.length === 0 ? 'No notes yet' : 'No matching notes'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Editor */}
                <div className="flex-1 flex flex-col">
                    {selectedNote ? (
                        <>
                            {/* Title */}
                            <div className="p-4 border-b border-white/5">
                                <input
                                    type="text"
                                    value={selectedNote.title}
                                    onChange={(e) => updateNote('title', e.target.value)}
                                    className="w-full bg-transparent text-xl font-light text-white placeholder-white/30 focus:outline-none"
                                    placeholder="Note title..."
                                />
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-4">
                                <textarea
                                    value={selectedNote.content}
                                    onChange={(e) => updateNote('content', e.target.value)}
                                    placeholder="Start typing your note..."
                                    className="w-full h-full bg-transparent text-white/80 text-sm leading-relaxed resize-none focus:outline-none placeholder-white/20"
                                />
                            </div>

                            {/* Footer */}
                            <div className="p-3 border-t border-white/5 flex items-center justify-between text-xs text-white/30">
                                <span>Last updated: {new Date(selectedNote.updatedAt).toLocaleString()}</span>
                                <div className={`flex items-center gap-1 ${isSaving ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                    <Save size={12} className={isSaving ? 'animate-pulse' : ''} />
                                    <span>{isSaving ? 'Saving...' : 'Saved'}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                            <div className="p-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                                <FileText size={48} className="text-yellow-400" />
                            </div>
                            <p className="text-sm text-white/40 text-center">
                                Select a note or create a new one
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </GlassPanel>
    );
};
