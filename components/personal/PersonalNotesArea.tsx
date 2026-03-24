'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Loader2, Check, AlertCircle } from 'lucide-react';
import { fetchPersonalHomeNote, savePersonalHomeNote } from '@/lib/api/coreClient';

interface PersonalNotesAreaProps {
    personalSpaceId?: string | null;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export const PersonalNotesArea: React.FC<PersonalNotesAreaProps> = ({ personalSpaceId }) => {
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const isServerBacked = Boolean(personalSpaceId);

    // Load existing note from server when personalSpaceId is available
    useEffect(() => {
        if (!isServerBacked) return;
        setLoading(true);
        fetchPersonalHomeNote().then((result) => {
            setLoading(false);
            if (result) setNote(result.content);
        });
    }, [isServerBacked]);

    const handleBlur = async () => {
        if (!isServerBacked) return; // local-only: nothing to save
        setSaveState('saving');
        const result = await savePersonalHomeNote(note);
        setSaveState(result ? 'saved' : 'error');
        if (result) {
            setTimeout(() => setSaveState('idle'), 2000);
        }
    };

    return (
        <div data-testid="personal-notes-area" className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-white/40 text-xs">
                <FileText size={12} />
                <span>Meine Notizen</span>
                {isServerBacked && (
                    <span className="ml-auto flex items-center gap-1">
                        {saveState === 'saving' && <Loader2 size={10} className="animate-spin" />}
                        {saveState === 'saved' && <Check size={10} className="text-emerald-400" />}
                        {saveState === 'error' && <AlertCircle size={10} className="text-red-400" />}
                    </span>
                )}
            </div>
            {loading ? (
                <div className="flex items-center gap-1.5 text-white/20 text-xs py-2">
                    <Loader2 size={10} className="animate-spin" />
                    Notiz wird geladen...
                </div>
            ) : (
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={handleBlur}
                    placeholder={isServerBacked ? 'Persönliche Notiz...' : 'Persönliche Notizen (lokal -- kein Server verfügbar)...'}
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
                />
            )}
            {!isServerBacked && (
                <p className="text-[10px] text-white/20">
                    Kein persönlicher Bereich verfügbar -- Notizen werden nicht gespeichert.
                </p>
            )}
        </div>
    );
};
