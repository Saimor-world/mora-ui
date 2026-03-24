'use client';

import React, { useEffect, useState } from 'react';
import { User, Building2, Loader2 } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { useContextStore } from '@/lib/store/contextStore';
import { fetchPersonalSpace, type PersonalSpace } from '@/lib/api/coreClient';
import { PersonalNotesArea } from './PersonalNotesArea';

export const PersonalHome: React.FC = () => {
    const user = useMoraStore((s) => s.user);
    const setOsContext = useContextStore((s) => s.setOsContext);
    const personalSpaceId = useContextStore((s) => s.personalSpaceId);
    const [space, setSpace] = useState<PersonalSpace | null | 'loading'>('loading');

    useEffect(() => {
        fetchPersonalSpace().then((result) => {
            setSpace(result); // null = unavailable, PersonalSpace = confirmed
        });
    }, []);

    return (
        <div className="flex flex-col h-full bg-[#060810] text-white p-8 gap-8 overflow-y-auto">
            {/* Identity anchor */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <User size={24} className="text-white/60" />
                </div>
                <div>
                    <div className="text-lg font-medium text-white">{user?.name ?? 'Mein Bereich'}</div>
                    <div className="text-sm text-white/40">{user?.email}</div>
                </div>
            </div>

            {/* Server anchor status */}
            <div className="inline-flex items-center gap-1.5 text-xs">
                {space === 'loading' ? (
                    <span className="flex items-center gap-1.5 text-white/30">
                        <Loader2 size={10} className="animate-spin" />
                        Persönlicher Bereich wird geladen...
                    </span>
                ) : space !== null ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        persönlicher Bereich
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-white/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                        persönlicher Bereich (kein Server)
                    </span>
                )}
            </div>

            {/* Notes -- real server persistence when personalSpaceId present */}
            <PersonalNotesArea personalSpaceId={personalSpaceId} />

            {/* Return to Universe */}
            <button
                onClick={() => setOsContext('company')}
                className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors w-fit"
            >
                <Building2 size={14} />
                Unternehmen
            </button>
        </div>
    );
};
