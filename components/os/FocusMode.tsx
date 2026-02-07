"use client";

/**
 * FOCUS MODE / DND (Do Not Disturb)
 *
 * Windows 11/macOS-style focus sessions for distraction-free work.
 * Features:
 * - Pomodoro-style timer (25/5 min default)
 * - Silences notifications
 * - Optional UI hiding (minimal mode)
 * - Session history tracking
 * - Keyboard shortcut: Cmd+Shift+F
 *
 * @since 2026-02-07
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Moon,
    Sun,
    Play,
    Pause,
    RotateCcw,
    Coffee,
    Brain,
    Clock,
    Target,
    X,
    Zap,
    Volume2,
    VolumeX,
    Settings
} from 'lucide-react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useNotificationStore } from './NotificationCenter';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type FocusSessionType = 'focus' | 'break' | 'custom';

interface FocusSession {
    id: string;
    type: FocusSessionType;
    startTime: Date;
    endTime?: Date;
    duration: number; // minutes
    completed: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// FOCUS MODE STORE
// ═══════════════════════════════════════════════════════════════════════════

interface FocusModeState {
    isActive: boolean;
    isPaused: boolean;
    currentSession: FocusSession | null;
    sessionHistory: FocusSession[];
    timeRemaining: number; // seconds
    settings: {
        focusDuration: number; // minutes
        breakDuration: number; // minutes
        autoStartBreak: boolean;
        playSounds: boolean;
        hideMinimizedPanes: boolean;
    };

    // Actions
    startSession: (type: FocusSessionType, duration?: number) => void;
    pauseSession: () => void;
    resumeSession: () => void;
    endSession: (completed?: boolean) => void;
    tick: () => void;
    updateSettings: (settings: Partial<FocusModeState['settings']>) => void;
}

export const useFocusModeStore = create<FocusModeState>()(
    persist(
        (set, get) => ({
            isActive: false,
            isPaused: false,
            currentSession: null,
            sessionHistory: [],
            timeRemaining: 0,
            settings: {
                focusDuration: 25,
                breakDuration: 5,
                autoStartBreak: true,
                playSounds: false,
                hideMinimizedPanes: false
            },

            startSession: (type, duration) => {
                const state = get();
                const dur = duration ?? (type === 'focus'
                    ? state.settings.focusDuration
                    : state.settings.breakDuration);

                const session: FocusSession = {
                    id: `focus-${Date.now()}`,
                    type,
                    startTime: new Date(),
                    duration: dur,
                    completed: false
                };

                set({
                    isActive: true,
                    isPaused: false,
                    currentSession: session,
                    timeRemaining: dur * 60
                });

                // Enable focus mode in notification center
                useNotificationStore.getState().setFocusMode(true);
            },

            pauseSession: () => {
                set({ isPaused: true });
            },

            resumeSession: () => {
                set({ isPaused: false });
            },

            endSession: (completed = false) => {
                const state = get();
                if (!state.currentSession) return;

                const endedSession: FocusSession = {
                    ...state.currentSession,
                    endTime: new Date(),
                    completed
                };

                const history = [endedSession, ...state.sessionHistory].slice(0, 50);

                set({
                    isActive: false,
                    isPaused: false,
                    currentSession: null,
                    timeRemaining: 0,
                    sessionHistory: history
                });

                // Disable focus mode in notification center
                useNotificationStore.getState().setFocusMode(false);

                // Auto-start break if configured and session was completed
                if (completed && state.settings.autoStartBreak && state.currentSession.type === 'focus') {
                    setTimeout(() => {
                        get().startSession('break');
                    }, 1000);
                }
            },

            tick: () => {
                const state = get();
                if (!state.isActive || state.isPaused) return;

                const newTime = state.timeRemaining - 1;

                if (newTime <= 0) {
                    // Session complete
                    get().endSession(true);

                    // Play sound if enabled
                    if (state.settings.playSounds) {
                        try {
                            const audio = new Audio('/sounds/bell.mp3');
                            audio.volume = 0.5;
                            audio.play().catch(() => { });
                        } catch { }
                    }
                } else {
                    set({ timeRemaining: newTime });
                }
            },

            updateSettings: (newSettings) => {
                set((state) => ({
                    settings: { ...state.settings, ...newSettings }
                }));
            }
        }),
        {
            name: 'saimor-focus-mode',
            partialize: (state) => ({
                sessionHistory: state.sessionHistory.slice(0, 20),
                settings: state.settings
            })
        }
    )
);

// ═══════════════════════════════════════════════════════════════════════════
// TIMER HOOK
// ═══════════════════════════════════════════════════════════════════════════

const useTimer = () => {
    const { isActive, isPaused, tick } = useFocusModeStore();

    useEffect(() => {
        if (!isActive || isPaused) return;

        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [isActive, isPaused, tick]);
};

// ═══════════════════════════════════════════════════════════════════════════
// FORMAT TIME
// ═══════════════════════════════════════════════════════════════════════════

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// FOCUS MODE WIDGET (Compact - for Dock)
// ═══════════════════════════════════════════════════════════════════════════

export const FocusModeWidget: React.FC<{ onExpand?: () => void }> = ({ onExpand }) => {
    const { isActive, isPaused, currentSession, timeRemaining, startSession, pauseSession, resumeSession, endSession } = useFocusModeStore();
    useTimer();

    if (!isActive) {
        return (
            <button
                onClick={() => startSession('focus')}
                className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                title="Focus Mode starten (Cmd+Shift+F)"
            >
                <Target size={18} />
            </button>
        );
    }

    const progress = currentSession
        ? ((currentSession.duration * 60 - timeRemaining) / (currentSession.duration * 60)) * 100
        : 0;

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20"
        >
            {/* Progress Ring */}
            <div className="relative w-6 h-6">
                <svg className="w-6 h-6 -rotate-90">
                    <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="rgba(139, 92, 246, 0.2)"
                        strokeWidth="2"
                        fill="none"
                    />
                    <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="rgb(139, 92, 246)"
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray={`${progress * 0.628} 62.8`}
                        className="transition-all duration-1000"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    {currentSession?.type === 'break' ? (
                        <Coffee size={10} className="text-violet-400" />
                    ) : (
                        <Brain size={10} className="text-violet-400" />
                    )}
                </div>
            </div>

            {/* Time */}
            <span className="text-xs font-mono text-violet-300 w-12">
                {formatTime(timeRemaining)}
            </span>

            {/* Controls */}
            <div className="flex items-center gap-0.5">
                <button
                    onClick={isPaused ? resumeSession : pauseSession}
                    className="p-1 rounded hover:bg-violet-500/20 text-violet-400"
                >
                    {isPaused ? <Play size={12} /> : <Pause size={12} />}
                </button>
                <button
                    onClick={() => endSession(false)}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400"
                >
                    <X size={12} />
                </button>
            </div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// FOCUS MODE PANEL (Full - for Settings or Dedicated Pane)
// ═══════════════════════════════════════════════════════════════════════════

export const FocusModePanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
    const {
        isActive,
        isPaused,
        currentSession,
        timeRemaining,
        sessionHistory,
        settings,
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        updateSettings
    } = useFocusModeStore();

    useTimer();

    const [showSettings, setShowSettings] = useState(false);

    const todaySessions = sessionHistory.filter(s => {
        const today = new Date();
        const sessionDate = new Date(s.startTime);
        return sessionDate.toDateString() === today.toDateString() && s.completed;
    });

    const totalFocusToday = todaySessions
        .filter(s => s.type === 'focus')
        .reduce((acc, s) => acc + s.duration, 0);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        {isActive ? (
                            currentSession?.type === 'break' ? <Coffee className="text-violet-400" size={20} /> : <Brain className="text-violet-400" size={20} />
                        ) : (
                            <Moon className="text-violet-400" size={20} />
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg font-light text-white">Focus Mode</h2>
                        <p className="text-xs text-white/40">
                            {isActive
                                ? (currentSession?.type === 'break' ? 'Pause aktiv' : 'Focus Session aktiv')
                                : 'Bereit zum Starten'
                            }
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}
                >
                    <Settings size={16} />
                </button>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-white/80">Focus Dauer</div>
                                    <div className="text-xs text-white/40">{settings.focusDuration} Minuten</div>
                                </div>
                                <input
                                    type="range"
                                    min="15"
                                    max="60"
                                    step="5"
                                    value={settings.focusDuration}
                                    onChange={(e) => updateSettings({ focusDuration: parseInt(e.target.value) })}
                                    className="w-24 accent-violet-500"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-white/80">Pause Dauer</div>
                                    <div className="text-xs text-white/40">{settings.breakDuration} Minuten</div>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="15"
                                    step="1"
                                    value={settings.breakDuration}
                                    onChange={(e) => updateSettings({ breakDuration: parseInt(e.target.value) })}
                                    className="w-24 accent-violet-500"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-white/80">Auto-Start Pause</div>
                                    <div className="text-xs text-white/40">Nach jeder Focus Session</div>
                                </div>
                                <button
                                    onClick={() => updateSettings({ autoStartBreak: !settings.autoStartBreak })}
                                    className={`w-10 h-6 rounded-full border relative transition-all ${settings.autoStartBreak
                                        ? 'bg-violet-500/30 border-violet-500/50'
                                        : 'bg-white/10 border-white/10'
                                        }`}
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${settings.autoStartBreak
                                        ? 'left-5 bg-violet-400'
                                        : 'left-0.5 bg-white/40'
                                        }`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-white/80">Sound bei Abschluss</div>
                                    <div className="text-xs text-white/40">Benachrichtigungston</div>
                                </div>
                                <button
                                    onClick={() => updateSettings({ playSounds: !settings.playSounds })}
                                    className={`p-2 rounded-lg transition-colors ${settings.playSounds
                                        ? 'bg-violet-500/20 text-violet-400'
                                        : 'text-white/40 hover:bg-white/5'
                                        }`}
                                >
                                    {settings.playSounds ? <Volume2 size={16} /> : <VolumeX size={16} />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Timer Display */}
            {isActive ? (
                <div className="text-center py-8">
                    {/* Large Timer */}
                    <div className="relative inline-flex items-center justify-center">
                        <svg className="w-48 h-48 -rotate-90">
                            <circle
                                cx="96"
                                cy="96"
                                r="88"
                                stroke="rgba(139, 92, 246, 0.1)"
                                strokeWidth="4"
                                fill="none"
                            />
                            <circle
                                cx="96"
                                cy="96"
                                r="88"
                                stroke="rgb(139, 92, 246)"
                                strokeWidth="4"
                                fill="none"
                                strokeDasharray={`${((currentSession!.duration * 60 - timeRemaining) / (currentSession!.duration * 60)) * 552.9} 552.9`}
                                strokeLinecap="round"
                                className="transition-all duration-1000"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-light text-white font-mono">
                                {formatTime(timeRemaining)}
                            </span>
                            <span className="text-xs text-white/40 mt-2 uppercase tracking-wider">
                                {currentSession?.type === 'break' ? 'Pause' : 'Focus'}
                            </span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-3 mt-6">
                        <button
                            onClick={isPaused ? resumeSession : pauseSession}
                            className="px-6 py-3 rounded-xl bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-colors flex items-center gap-2"
                        >
                            {isPaused ? <Play size={16} /> : <Pause size={16} />}
                            {isPaused ? 'Fortsetzen' : 'Pausieren'}
                        </button>
                        <button
                            onClick={() => endSession(false)}
                            className="px-6 py-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                        >
                            <X size={16} />
                            Beenden
                        </button>
                    </div>
                </div>
            ) : (
                /* Start Options */
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => startSession('focus')}
                        className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-colors text-left group"
                    >
                        <Brain className="text-violet-400 mb-2" size={24} />
                        <div className="text-sm text-white font-medium">Focus Session</div>
                        <div className="text-xs text-white/40">{settings.focusDuration} Minuten</div>
                    </button>

                    <button
                        onClick={() => startSession('break')}
                        className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-left group"
                    >
                        <Coffee className="text-emerald-400 mb-2" size={24} />
                        <div className="text-sm text-white font-medium">Kurze Pause</div>
                        <div className="text-xs text-white/40">{settings.breakDuration} Minuten</div>
                    </button>
                </div>
            )}

            {/* Today's Stats */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className="text-amber-400" />
                    <span className="text-xs text-white/60 uppercase tracking-wider">Heute</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                        <div className="text-2xl font-light text-white">{todaySessions.filter(s => s.type === 'focus').length}</div>
                        <div className="text-[10px] text-white/40">Sessions</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-light text-violet-400">{totalFocusToday}</div>
                        <div className="text-[10px] text-white/40">Minuten</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-light text-emerald-400">{todaySessions.filter(s => s.type === 'break').length}</div>
                        <div className="text-[10px] text-white/40">Pausen</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUT HOOK
// ═══════════════════════════════════════════════════════════════════════════

export const useFocusModeShortcut = () => {
    const { isActive, startSession, endSession } = useFocusModeStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                if (isActive) {
                    endSession(false);
                } else {
                    startSession('focus');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, startSession, endSession]);
};

export default FocusModePanel;
