'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Folder, Lock } from 'lucide-react';
import { usePersonalHomeNote, useSavePersonalHomeNote } from '@/lib/queries/usePersonalHomeNote';

export interface PersonalHomeZoneProps {
    privateLabel?: string | null;
    folderCount?: number;
    documentCount?: number;
    fileCount?: number;
    onOpenPrivateArea?: () => void;
}

/**
 * PersonalHomeZone — visible personal scope on Home (server-backed note + private content counts).
 */
export function PersonalHomeZone({
    privateLabel,
    folderCount = 0,
    documentCount = 0,
    fileCount = 0,
    onOpenPrivateArea,
}: PersonalHomeZoneProps) {
    const { data: homeNote } = usePersonalHomeNote();
    const saveMutation = useSavePersonalHomeNote();
    const [draft, setDraft] = useState('');
    const [dirty, setDirty] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!dirty && homeNote) {
            setDraft(homeNote.content ?? '');
        }
    }, [homeNote, dirty]);

    const scheduleSave = useCallback((nextContent: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            saveMutation.mutate(nextContent, {
                onSuccess: () => setDirty(false),
            });
        }, 700);
    }, [saveMutation]);

    useEffect(() => () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
    }, []);

    const contentTotal = documentCount + fileCount;
    const label = privateLabel?.trim() || 'Privater Bereich';

    return (
        <section
            data-testid="personal-home-zone"
            className="relative flex flex-col overflow-hidden rounded-2xl border border-cyan-300/16 backdrop-blur-3xl shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]"
            style={{ backgroundColor: 'rgba(6, 10, 24, 0.74)' }}
        >
            <div className="pointer-events-none absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-cyan-400/55 via-sky-300/35 to-transparent" />
            <div className="relative z-[1] flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.26em] text-cyan-100/52">
                            <Lock size={10} className="opacity-70" aria-hidden />
                            Mein Bereich
                        </div>
                        <div className="mt-1 text-[13px] text-white/72">{label}</div>
                    </div>
                    {onOpenPrivateArea && (
                        <button
                            type="button"
                            onClick={onOpenPrivateArea}
                            className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-400/[0.10] px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-cyan-50/78 transition-colors hover:border-cyan-200/32 hover:bg-cyan-400/[0.16]"
                        >
                            Öffnen
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {folderCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/52">
                            <Folder size={10} className="opacity-60" />
                            {folderCount} Ordner
                        </span>
                    )}
                    {contentTotal > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/52">
                            <FileText size={10} className="opacity-60" />
                            {contentTotal} Inhalte
                        </span>
                    )}
                    {folderCount === 0 && contentTotal === 0 && (
                        <span className="text-[11px] text-white/38">Noch leer — Notizen und Dateien erscheinen hier.</span>
                    )}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="personal-home-note" className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-white/30">
                        Persönliche Notiz
                    </label>
                    <textarea
                        id="personal-home-note"
                        data-testid="personal-home-note-input"
                        value={draft}
                        onChange={(event) => {
                            const next = event.target.value;
                            setDraft(next);
                            setDirty(true);
                            scheduleSave(next);
                        }}
                        placeholder="Kurznotiz für dich — wird serverseitig gespeichert…"
                        rows={3}
                        className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5 text-[12px] leading-relaxed text-white/78 placeholder:text-white/24 focus:border-cyan-300/28 focus:outline-none"
                    />
                    {saveMutation.isPending && (
                        <span className="text-[10px] text-cyan-200/45">Speichert…</span>
                    )}
                </div>
            </div>
        </section>
    );
}
