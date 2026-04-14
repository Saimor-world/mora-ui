'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, Loader2, AlertCircle, FileText } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useContextStore } from '@/lib/store/contextStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { fetchPersonalHomeNote, savePersonalHomeNote } from '@/lib/api/coreClient';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * NotesPane -- private personal notes, server-backed via personal_space_id.
 *
 * When personalSpaceId is available: loads from and saves to
 * GET/PUT /v3/users/me/personal-home-note.
 *
 * When personalSpaceId is null (not yet provisioned): textarea still works
 * but content is not persisted -- user sees a clear "not saved" indicator.
 *
 * Save-on-blur: saves when the textarea loses focus.
 * No debouncing (Phase 3).
 */
export const NotesPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const personalSpaceId = useContextStore((s) => s.personalSpaceId);
    const user = useSessionStore((s) => s.user);
    const pane = getPane(id);

    const [content, setContent] = useState('');
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'no-server'>('loading');
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const lastSavedRef = useRef<string>('');

    // Load note from server when pane opens
    useEffect(() => {
        if (!personalSpaceId) {
            setLoadState('no-server');
            return;
        }
        let cancelled = false;
        fetchPersonalHomeNote().then((note) => {
            if (cancelled) return;
            if (note) {
                setContent(note.content);
                lastSavedRef.current = note.content;
            }
            setLoadState('ready');
        });
        return () => { cancelled = true; };
    }, [personalSpaceId]);

    // Save on blur -- only when server-backed and content has changed
    const handleBlur = async () => {
        if (!personalSpaceId) return;
        if (content === lastSavedRef.current) return;
        setSaveState('saving');
        const result = await savePersonalHomeNote(content);
        if (result) {
            lastSavedRef.current = content;
            setSaveState('saved');
            setTimeout(() => setSaveState('idle'), 2000);
        } else {
            setSaveState('error');
        }
    };

    if (!pane) return null;

    return (
        <GlassPanel
            title="Meine Notizen"
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            paneId={id}
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
            <div className="flex flex-col h-full p-4 gap-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/40">
                        <FileText size={13} />
                        <span className="text-xs">{user?.name ?? 'Persönliche Notizen'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                        {loadState === 'no-server' ? (
                            <span className="text-white/20">nicht gespeichert</span>
                        ) : saveState === 'saving' ? (
                            <><Loader2 size={10} className="animate-spin text-white/30" /><span className="text-white/30">speichert...</span></>
                        ) : saveState === 'saved' ? (
                            <><Check size={10} className="text-emerald-400" /><span className="text-emerald-400/70">gespeichert</span></>
                        ) : saveState === 'error' ? (
                            <><AlertCircle size={10} className="text-red-400" /><span className="text-red-400/70">Fehler</span></>
                        ) : personalSpaceId ? (
                            <span className="text-white/20">Server</span>
                        ) : null}
                    </div>
                </div>

                {/* Textarea */}
                {loadState === 'loading' ? (
                    <div className="flex items-center gap-2 text-white/20 text-xs py-4">
                        <Loader2 size={12} className="animate-spin" />
                        Lade Notizen...
                    </div>
                ) : (
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onBlur={handleBlur}
                        placeholder={personalSpaceId ? 'Persönliche Notizen...' : 'Tippe hier — Notizen werden nicht gespeichert (kein persönlicher Bereich)'}
                        className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-white/80 placeholder:text-white/20 leading-relaxed"
                    />
                )}
            </div>
        </GlassPanel>
    );
};
