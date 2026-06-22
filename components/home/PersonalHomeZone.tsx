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

    /** Compact inline strip for Home hero row (default). */

    variant?: 'compact' | 'card';

}



/**

 * PersonalHomeZone — server-backed note + private scope counts on Home.

 * Compact variant: one-line note inline, not a dominant card.

 */

export function PersonalHomeZone({

    privateLabel,

    folderCount = 0,

    documentCount = 0,

    fileCount = 0,

    onOpenPrivateArea,

    variant = 'compact',

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



    const noteInput = (

        <input

            id="personal-home-note"

            data-testid="personal-home-note-input"

            type="text"

            value={draft}

            onChange={(event) => {

                const next = event.target.value;

                setDraft(next);

                setDirty(true);

                scheduleSave(next);

            }}

            placeholder="Kurznotiz…"

            className="min-w-0 flex-1 truncate rounded-lg border border-white/[0.07] bg-black/20 px-2.5 py-1.5 text-[12px] text-white/76 placeholder:text-white/22 focus:border-cyan-300/26 focus:outline-none"

        />

    );



    if (variant === 'card') {

        return (

            <section

                data-testid="personal-home-zone"

                className="relative flex flex-col overflow-hidden rounded-2xl border border-cyan-300/16 backdrop-blur-3xl shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]"

                style={{ backgroundColor: 'rgba(6, 10, 24, 0.74)' }}

            >

                <div className="pointer-events-none absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-cyan-400/55 via-sky-300/35 to-transparent" />

                <div className="relative z-[1] flex flex-col gap-2.5 p-3.5">

                    <div className="flex items-center justify-between gap-3">

                        <div className="flex min-w-0 items-center gap-2">

                            <Lock size={11} className="shrink-0 text-cyan-200/50" aria-hidden />

                            <span className="truncate text-[12px] font-medium text-white/72">{label}</span>

                        </div>

                        {onOpenPrivateArea && (

                            <button

                                type="button"

                                onClick={onOpenPrivateArea}

                                className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-400/[0.10] px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-cyan-50/78 transition-colors hover:border-cyan-200/32 hover:bg-cyan-400/[0.16]"

                            >

                                Öffnen

                            </button>

                        )}

                    </div>

                    {noteInput}

                    {saveMutation.isPending && (

                        <span className="text-[10px] text-cyan-200/45">Speichert…</span>

                    )}

                </div>

            </section>

        );

    }



    return (

        <section

            data-testid="personal-home-zone"

            className="relative flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded-xl border border-cyan-300/14 bg-black/20 px-3 py-2 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"

        >

            <div className="pointer-events-none absolute left-0 top-0 h-[1px] w-full bg-gradient-to-r from-cyan-400/45 via-sky-300/25 to-transparent" />

            <div className="flex shrink-0 items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-100/48">

                <Lock size={9} className="opacity-70" aria-hidden />

                <span className="hidden sm:inline">Mein Bereich</span>

            </div>

            <span className="hidden max-w-[7rem] truncate text-[11px] text-white/42 md:inline" title={label}>

                {label}

            </span>

            {(folderCount > 0 || contentTotal > 0) && (

                <div className="hidden shrink-0 items-center gap-1 lg:flex">

                    {folderCount > 0 && (

                        <span className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-white/44">

                            <Folder size={8} className="opacity-60" />

                            {folderCount}

                        </span>

                    )}

                    {contentTotal > 0 && (

                        <span className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-white/44">

                            <FileText size={8} className="opacity-60" />

                            {contentTotal}

                        </span>

                    )}

                </div>

            )}

            {noteInput}

            {onOpenPrivateArea && (

                <button

                    type="button"

                    onClick={onOpenPrivateArea}

                    className="shrink-0 rounded-full border border-cyan-300/18 bg-cyan-400/[0.08] px-2 py-1 text-[9px] uppercase tracking-[0.1em] text-cyan-50/72 transition-colors hover:border-cyan-200/28 hover:bg-cyan-400/[0.14]"

                >

                    Öffnen

                </button>

            )}

            {saveMutation.isPending && (

                <span className="sr-only">Speichert</span>

            )}

        </section>

    );

}

