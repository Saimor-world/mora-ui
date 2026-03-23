'use client';

import React, { useState } from 'react';
import { FileText } from 'lucide-react';

/**
 * PersonalNotesArea -- minimal personal notes in personal context.
 *
 * Phase 1 MVC: local state only. Server persistence is Phase 2+
 * when Codex ships the personal storage endpoints.
 */
export const PersonalNotesArea: React.FC = () => {
    const [note, setNote] = useState('');

    return (
        <div data-testid="personal-notes-area" className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-white/40 text-xs">
                <FileText size={12} />
                <span>Meine Notizen</span>
            </div>
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Persönliche Notizen (lokal gespeichert)..."
                className="w-full h-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
            />
        </div>
    );
};
