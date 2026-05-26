"use client";

/**
 * AmbientRoom — Môra Field v0.1
 *
 * A voice-driven, reactive workspace inside Saimôr OS.
 * Accessed via Alt+A from anywhere in the OS.
 *
 * Interaction model:
 *   • Hold SPACEBAR   → start listening  (release → trigger card generation)
 *   • Click Orb       → toggle listening
 *   • Text fallback   → if Web Speech API unavailable or denied
 *
 * Card flow:
 *   idle → listening → thinking → cards spawned (Capture / Context / Action / Next)
 *   Save action → confirmation overlay (waldgrün/gold) → addNode → back to core
 */

import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Mic, MicOff, Save, X } from 'lucide-react';

import { MoraOrb } from '@/components/mora/MoraOrb';
import { AmbientDust } from '@/components/organic/AmbientDust';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useMoraStore } from '@/lib/store/moraState';
import { useTree } from '@/lib/queries/useTree';

// ─── Types ────────────────────────────────────────────────────────────────────

type AmbientState = 'idle' | 'listening' | 'thinking' | 'cards';

interface FlatFolder { id: string; name: string; spaceName: string; deptName: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Walk the CoreTreeNode tree and collect all folders as a flat list. */
function flattenFolders(tree: any[]): FlatFolder[] {
    const result: FlatFolder[] = [];
    for (const dept of tree) {
        for (const space of dept.children ?? []) {
            for (const folder of space.children ?? []) {
                result.push({
                    id: folder.id,
                    name: folder.name ?? folder.title ?? '',
                    spaceName: space.name ?? space.title ?? '',
                    deptName: dept.name ?? dept.title ?? '',
                });
            }
        }
    }
    return result;
}

/** Try to auto-select a folder whose name appears in the transcript. */
function matchFolder(transcript: string, folders: FlatFolder[]): string | null {
    const lower = transcript.toLowerCase();
    const match = folders.find(f => lower.includes(f.name.toLowerCase()) && f.name.length > 2);
    return match?.id ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AmbientRoom: React.FC = () => {
    const navigateToCore    = useNavStore(s => s.navigateToCore);
    const user              = useSessionStore(s => s.user);
    const activeCompanyId   = useNavStore(s => s.activeCompanyId);
    const addNode           = useMoraStore(s => s.addNode);

    const { data: tree = [] } = useTree(activeCompanyId);
    const folders = flattenFolders(tree);

    // ── UI state ──────────────────────────────────────────────────────────────
    const [ambientState, setAmbientState] = useState<AmbientState>('idle');
    const [transcript, setTranscript]     = useState('');
    const [liveText, setLiveText]         = useState('');       // interim speech text
    const [editedText, setEditedText]     = useState('');       // editable in Capture card
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [showConfirm, setShowConfirm]   = useState(false);
    const [isSaving, setIsSaving]         = useState(false);
    const [speechSupported, setSpeechSupported] = useState(true);
    const [fallbackMode, setFallbackMode] = useState(false);
    const [fallbackInput, setFallbackInput] = useState('');

    const recognitionRef = useRef<any>(null);
    const spaceHeldRef   = useRef(false);

    // ── Speech init ───────────────────────────────────────────────────────────
    const SpeechAPI = typeof window !== 'undefined'
        ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition)
        : null;

    useEffect(() => {
        if (!SpeechAPI) {
            setSpeechSupported(false);
            setFallbackMode(true);
        }
    }, [SpeechAPI]);

    // ── Start / Stop listening ─────────────────────────────────────────────────
    const startListening = useCallback(() => {
        if (!SpeechAPI || ambientState === 'listening') return;
        const recognition = new SpeechAPI();
        recognition.lang              = 'de-DE';
        recognition.continuous        = true;
        recognition.interimResults    = true;

        recognition.onresult = (e: any) => {
            let interim = '';
            let final   = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) final += t;
                else interim += t;
            }
            setLiveText(interim);
            if (final) setTranscript(prev => prev + final);
        };

        recognition.onerror = (e: any) => {
            if (e.error === 'not-allowed') {
                setFallbackMode(true);
                setSpeechSupported(false);
            }
            stopListening(true);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setAmbientState('listening');
        setTranscript('');
        setLiveText('');
    }, [SpeechAPI, ambientState]); // eslint-disable-line react-hooks/exhaustive-deps

    const stopListening = useCallback((abort = false) => {
        recognitionRef.current?.stop();
        recognitionRef.current = null;
        spaceHeldRef.current = false;
        if (!abort) {
            setAmbientState('thinking');
            setLiveText('');
        } else {
            setAmbientState('idle');
            setLiveText('');
        }
    }, []);

    // Transition thinking → cards after a brief delay (simulate processing)
    useEffect(() => {
        if (ambientState !== 'thinking') return;
        const t = setTimeout(() => {
            const finalText = (transcript + ' ' + liveText).trim();
            if (!finalText) { setAmbientState('idle'); return; }
            setEditedText(finalText);
            const autoFolder = matchFolder(finalText, folders);
            setSelectedFolderId(autoFolder ?? (folders[0]?.id ?? null));
            setAmbientState('cards');
        }, 900);
        return () => clearTimeout(t);
    }, [ambientState]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Spacebar global binding ────────────────────────────────────────────────
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
            if (e.code === 'Space' && !spaceHeldRef.current) {
                e.preventDefault();
                spaceHeldRef.current = true;
                startListening();
            }
            if (e.code === 'Escape') {
                e.preventDefault();
                if (ambientState === 'listening') stopListening(true);
                else if (ambientState === 'cards') setAmbientState('idle');
                else navigateToCore();
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space' && spaceHeldRef.current) {
                e.preventDefault();
                spaceHeldRef.current = false;
                if (ambientState === 'listening') stopListening();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup',   onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup',   onKeyUp);
        };
    }, [ambientState, startListening, stopListening, navigateToCore]);

    // ── Orb click toggle ──────────────────────────────────────────────────────
    const handleOrbClick = () => {
        if (fallbackMode) return;
        if (ambientState === 'listening') stopListening();
        else if (ambientState === 'idle')  startListening();
    };

    // ── Fallback submit ───────────────────────────────────────────────────────
    const handleFallbackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fallbackInput.trim()) return;
        setTranscript(fallbackInput.trim());
        setFallbackInput('');
        setAmbientState('thinking');
    };

    // ── Save node ─────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!selectedFolderId || !editedText.trim()) return;
        setIsSaving(true);
        try {
            await addNode({
                title:     editedText.trim().slice(0, 100),
                content:   editedText.trim(),
                folder_id: selectedFolderId,
                type:      'note',
            });
            setShowConfirm(false);
            navigateToCore();
        } catch {
            // toast handled by addNode
        } finally {
            setIsSaving(false);
        }
    };

    // ── Orb state mapping ─────────────────────────────────────────────────────
    const orbState = ambientState === 'listening' ? 'listening'
        : ambientState === 'thinking' ? 'thinking'
        : 'idle';

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-start overflow-hidden select-none"
             style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 30%, rgba(109,40,217,0.22) 0%, transparent 70%), #0a0618' }}>

            {/* Ambient particle layer */}
            <AmbientDust count={35} color="rgba(124,58,237,0.12)" durationRange={[18, 38]} />

            {/* Back button */}
            <button
                onClick={navigateToCore}
                className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all text-xs tracking-widest uppercase"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Zurück</span>
            </button>

            {/* Header label */}
            <div className="mt-16 mb-2 text-[10px] tracking-[0.35em] uppercase text-violet-300/40 font-medium">
                Môra Field
            </div>

            {/* Central orb section */}
            <div className="flex flex-col items-center gap-6 mt-6 z-10">

                {/* Ripple rings when listening */}
                <div className="relative flex items-center justify-center">
                    <AnimatePresence>
                        {ambientState === 'listening' && [0, 1, 2].map(i => (
                            <motion.div
                                key={i}
                                className="absolute rounded-full border border-emerald-400/20"
                                style={{ width: 220 + i * 60, height: 220 + i * 60 }}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: [0, 0.35, 0], scale: [0.85, 1.1, 1.2] }}
                                transition={{ duration: 2.4, delay: i * 0.6, repeat: Infinity, ease: 'easeOut' }}
                            />
                        ))}
                    </AnimatePresence>

                    <MoraOrb
                        state={orbState}
                        size="lg"
                        onClick={handleOrbClick}
                        interactive
                    />
                </div>

                {/* Push-to-talk Mic Button */}
                <AnimatePresence mode="wait">
                    {ambientState !== 'cards' && !fallbackMode && (
                        <motion.button
                            key="mic-btn"
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.25 }}
                            onPointerDown={(e) => { e.preventDefault(); startListening(); }}
                            onPointerUp={(e)   => { e.preventDefault(); if (ambientState === 'listening') stopListening(); }}
                            onPointerLeave={(e) => { e.preventDefault(); if (ambientState === 'listening') stopListening(); }}
                            className="relative flex items-center justify-center rounded-full transition-all focus:outline-none"
                            style={{
                                width: 64, height: 64,
                                background: ambientState === 'listening'
                                    ? 'radial-gradient(circle, rgba(16,185,129,0.35) 0%, rgba(16,185,129,0.12) 100%)'
                                    : 'rgba(124,58,237,0.18)',
                                border: ambientState === 'listening'
                                    ? '2px solid rgba(52,211,153,0.55)'
                                    : '2px solid rgba(139,92,246,0.3)',
                                boxShadow: ambientState === 'listening'
                                    ? '0 0 32px rgba(16,185,129,0.4)'
                                    : '0 0 16px rgba(109,40,217,0.2)',
                            }}
                        >
                            {ambientState === 'listening'
                                ? <MicOff className="w-6 h-6 text-emerald-300" />
                                : <Mic    className="w-6 h-6 text-violet-300" />
                            }
                            {ambientState === 'listening' && (
                                <motion.div
                                    className="absolute inset-[-6px] rounded-full border border-emerald-400/30"
                                    animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ duration: 1.2, repeat: Infinity }}
                                />
                            )}
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Status hint */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={ambientState}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.25 }}
                        className="text-[11px] tracking-[0.25em] uppercase text-white/30 font-medium h-5 text-center"
                    >
                        {ambientState === 'idle' && !fallbackMode   && 'Drücken & halten · oder Leertaste'}
                        {ambientState === 'idle' && fallbackMode    && 'Eingabe unten'}
                        {ambientState === 'listening'               && 'Hört zu … loslassen zum Beenden'}
                        {ambientState === 'thinking'                && 'Verarbeitet …'}
                        {ambientState === 'cards'                   && 'Bereit zum Speichern'}
                    </motion.div>
                </AnimatePresence>

                {/* Live transcript bubble */}
                <AnimatePresence>
                    {ambientState === 'listening' && (liveText || transcript) && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="max-w-lg px-5 py-3 rounded-2xl text-sm text-white/70 leading-relaxed text-center"
                            style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}
                        >
                            {transcript && <span className="text-white/90">{transcript}</span>}
                            {liveText   && <span className="text-violet-300/60 italic"> {liveText}</span>}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Fallback text input */}
                {fallbackMode && ambientState !== 'cards' && (
                    <form onSubmit={handleFallbackSubmit} className="flex gap-2 mt-2">
                        <input
                            type="text"
                            value={fallbackInput}
                            onChange={e => setFallbackInput(e.target.value)}
                            placeholder="Gedanken eingeben …"
                            autoFocus
                            className="w-72 px-4 py-2 rounded-full text-sm text-white/80 placeholder-white/25 outline-none"
                            style={{ background: 'rgba(124,58,237,0.14)', border: '1px solid rgba(139,92,246,0.25)' }}
                        />
                        <button
                            type="submit"
                            disabled={!fallbackInput.trim()}
                            className="px-4 py-2 rounded-full text-xs font-medium text-violet-200 disabled:opacity-30 transition-opacity"
                            style={{ background: 'rgba(109,40,217,0.5)', border: '1px solid rgba(139,92,246,0.3)' }}
                        >
                            ↵
                        </button>
                    </form>
                )}
            </div>

            {/* ── CARDS ──────────────────────────────────────────────────────── */}
            <AnimatePresence>
                {ambientState === 'cards' && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                        className="grid grid-cols-2 gap-3 mt-8 px-8 w-full max-w-3xl z-10"
                    >
                        {/* Capture Card */}
                        <AmbientCard delay={0} title="Aufnahme" icon="🎙">
                            <textarea
                                value={editedText}
                                onChange={e => setEditedText(e.target.value)}
                                rows={3}
                                className="w-full resize-none bg-transparent text-sm text-white/80 leading-relaxed outline-none placeholder-white/20"
                                placeholder="Transkript …"
                            />
                            <div className="text-[10px] text-white/20 mt-1 tracking-widest">
                                {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </AmbientCard>

                        {/* Context Card */}
                        <AmbientCard delay={0.08} title="Kontext" icon="🌐">
                            <div className="text-[11px] text-white/40 space-y-1.5">
                                <div>
                                    <span className="text-violet-300/60">Erkannte Entitäten: </span>
                                    {folders.filter(f => editedText.toLowerCase().includes(f.name.toLowerCase()) && f.name.length > 2)
                                        .slice(0, 3)
                                        .map(f => (
                                            <span key={f.id} className="mr-1.5 px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-200/60 text-[10px]">
                                                {f.name}
                                            </span>
                                        ))}
                                    {folders.filter(f => editedText.toLowerCase().includes(f.name.toLowerCase()) && f.name.length > 2).length === 0 && (
                                        <span className="text-white/20">–</span>
                                    )}
                                </div>
                                <div>
                                    <span className="text-violet-300/60">Zeichen: </span>
                                    <span>{editedText.length}</span>
                                </div>
                            </div>
                        </AmbientCard>

                        {/* Action Card */}
                        <AmbientCard delay={0.16} title="Aktion" icon="📁">
                            <div className="text-[11px] text-white/40 mb-2">Ordner auswählen:</div>
                            <select
                                value={selectedFolderId ?? ''}
                                onChange={e => setSelectedFolderId(e.target.value || null)}
                                className="w-full text-sm text-white/70 bg-transparent outline-none rounded-lg px-2 py-1.5 cursor-pointer"
                                style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}
                            >
                                <option value="" style={{ background: '#1a0a3a' }}>— kein Ordner —</option>
                                {folders.map(f => (
                                    <option key={f.id} value={f.id} style={{ background: '#1a0a3a' }}>
                                        {f.deptName} / {f.spaceName} / {f.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => setShowConfirm(true)}
                                disabled={!selectedFolderId || !editedText.trim()}
                                className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold tracking-wider transition-all disabled:opacity-30"
                                style={{ background: 'rgba(109,40,217,0.55)', border: '1px solid rgba(167,139,250,0.25)', color: '#e9d5ff' }}
                            >
                                <Save className="w-3.5 h-3.5" />
                                Als Node speichern
                            </button>
                        </AmbientCard>

                        {/* Next Step Card */}
                        <AmbientCard delay={0.24} title="Nächster Schritt" icon="✨">
                            <div className="text-[11px] text-white/40 leading-relaxed">
                                {editedText.length > 20
                                    ? `Môra kann diesen Gedanken mit bestehenden Nodes verknüpfen. Öffne den Finder nach dem Speichern.`
                                    : `Noch wenig Kontext. Kannst du noch mehr hinzufügen?`
                                }
                            </div>
                        </AmbientCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── CONFIRMATION OVERLAY (waldgrün / gold) ──────────────────────── */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center"
                        style={{ background: 'rgba(0, 20, 8, 0.85)', backdropFilter: 'blur(16px)' }}
                        onClick={() => setShowConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
                            onClick={e => e.stopPropagation()}
                            className="relative max-w-sm w-full mx-6 rounded-3xl p-7 flex flex-col gap-5"
                            style={{
                                background: 'linear-gradient(145deg, #0f2010 0%, #0a1a0c 100%)',
                                border: '1px solid rgba(134,179,85,0.30)',
                                boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(40,100,20,0.18)',
                            }}
                        >
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="absolute top-4 right-4 text-white/20 hover:text-white/50 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                     style={{ background: 'rgba(134,179,85,0.12)', border: '1px solid rgba(134,179,85,0.2)' }}>
                                    🌿
                                </div>
                                <div>
                                    <div className="text-sm font-semibold" style={{ color: '#d4e8a0' }}>Als Node speichern</div>
                                    <div className="text-[11px] text-white/30">Neuer Node wird erstellt</div>
                                </div>
                            </div>

                            <div className="rounded-xl px-4 py-3 text-[12px] text-white/50 leading-relaxed line-clamp-3"
                                 style={{ background: 'rgba(134,179,85,0.06)', border: '1px solid rgba(134,179,85,0.12)' }}>
                                {editedText.slice(0, 160)}{editedText.length > 160 ? '…' : ''}
                            </div>

                            {selectedFolderId && (
                                <div className="text-[11px]" style={{ color: '#b5cc80' }}>
                                    Ziel: <span className="font-medium">
                                        {folders.find(f => f.id === selectedFolderId)?.name ?? selectedFolderId}
                                    </span>
                                </div>
                            )}

                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 py-2.5 rounded-xl text-xs text-white/30 hover:text-white/50 transition-colors"
                                    style={{ background: 'rgba(255,255,255,0.04)' }}
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all disabled:opacity-50"
                                    style={{
                                        background: isSaving
                                            ? 'rgba(134,179,85,0.25)'
                                            : 'linear-gradient(135deg, rgba(134,179,85,0.45) 0%, rgba(180,134,40,0.35) 100%)',
                                        border: '1px solid rgba(180,160,60,0.35)',
                                        color: '#e8d990',
                                    }}
                                >
                                    {isSaving ? 'Speichert …' : 'Ja, als Node speichern'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Sub-component: AmbientCard ─────────────────────────────────────────────────

interface AmbientCardProps {
    title: string;
    icon: string;
    delay?: number;
    children: React.ReactNode;
}

const AmbientCard: React.FC<AmbientCardProps> = ({ title, icon, delay = 0, children }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] }}
        className="rounded-2xl p-4 flex flex-col gap-2.5"
        style={{
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(139,92,246,0.18)',
            backdropFilter: 'blur(12px)',
        }}
    >
        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-violet-300/50">
            <span>{icon}</span>
            <span>{title}</span>
        </div>
        {children}
    </motion.div>
);
