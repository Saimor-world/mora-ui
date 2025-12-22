import React, { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { FileText, Plus, Trash2, Save, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

const NOTES_STORAGE_KEY = 'saimor_notes';

export const NotesPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane } = usePaneStore();
    const pane = getPane(id);

    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Load notes from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(NOTES_STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored).map((n: any) => ({
                    ...n,
                    createdAt: new Date(n.createdAt),
                    updatedAt: new Date(n.updatedAt)
                }));
                setNotes(parsed);
                if (parsed.length > 0 && !selectedNote) {
                    setSelectedNote(parsed[0]);
                }
            } catch (e) {
                console.warn('Failed to parse notes', e);
            }
        }
    }, []);

    // Save notes to localStorage
    const saveNotes = (updatedNotes: Note[]) => {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
        setNotes(updatedNotes);
    };

    const createNote = () => {
        const newNote: Note = {
            id: `note-${Date.now()}`,
            title: 'Untitled Note',
            content: '',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const updated = [newNote, ...notes];
        saveNotes(updated);
        setSelectedNote(newNote);
        setIsEditing(true);
    };

    const updateNote = (field: 'title' | 'content', value: string) => {
        if (!selectedNote) return;
        const updated = notes.map(n =>
            n.id === selectedNote.id
                ? { ...n, [field]: value, updatedAt: new Date() }
                : n
        );
        saveNotes(updated);
        setSelectedNote({ ...selectedNote, [field]: value, updatedAt: new Date() });
    };

    const deleteNote = (noteId: string) => {
        const updated = notes.filter(n => n.id !== noteId);
        saveNotes(updated);
        if (selectedNote?.id === noteId) {
            setSelectedNote(updated.length > 0 ? updated[0] : null);
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
            width={900}
            height={600}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
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
                                    onClick={() => { setSelectedNote(note); setIsEditing(false); }}
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
                                        {note.updatedAt.toLocaleDateString()}
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
                                <span>Last updated: {selectedNote.updatedAt.toLocaleString()}</span>
                                <div className="flex items-center gap-1 text-emerald-400">
                                    <Save size={12} />
                                    <span>Auto-saved</span>
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
