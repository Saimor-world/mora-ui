"use client";

/**
 * NOTIFICATION CENTER
 *
 * macOS-style unified notification system for SAIMOR OS.
 * Features:
 * - Dock-anchored panel above the notification icon
 * - Categorized notifications (alerts, info, success, insights)
 * - Action buttons on notifications
 * - Notification history with clear-all
 * - Auto-dismiss with configurable duration
 * - Keyboard shortcut: Strg+Shift+N
 *
 * @since 2026-02-07
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    BellOff,
    X,
    CheckCircle,
    AlertTriangle,
    Info,
    Sparkles,
    Trash2,
    Clock,
    Brain,
    Mail,
    Calendar,
    Users
} from 'lucide-react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useQueryClient } from '@tanstack/react-query';
import { useRadarStore } from '@/lib/store/radarStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { useRadar } from '@/lib/queries/useRadar';
import { queryKeys } from '@/lib/queries/queryKeys';
import { corePatch, corePost } from '@/lib/api/http';
import { fetchNodeDetails, getEntityContext } from '@/lib/api/coreClient';
import { realtime } from '@/lib/api/realtimeClient';
import { usePaneStore } from '@/lib/store/paneStore';
import { openNavigationOutcome } from '@/lib/utils/searchOpen';
import { RadarCard } from '@/components/mora/RadarCard';
import { MoraRadarToast } from '@/components/mora/MoraRadarToast';
import type { RadarNotification } from '@/lib/store/radarStore';
import { useMailArrivalPrompt } from '@/lib/hooks/useMailArrivalPrompt';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'insight' | 'memory';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    timestamp: Date;
    read: boolean;
    source?: 'mora' | 'mail' | 'calendar' | 'team' | 'system';
    actions?: NotificationAction[];
    dismissable?: boolean;
    autoDismiss?: number; // ms, 0 = no auto dismiss
}

export interface NotificationAction {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION STORE
// ═══════════════════════════════════════════════════════════════════════════

interface NotificationState {
    notifications: Notification[];
    isOpen: boolean;
    focusModeEnabled: boolean;

    // Actions
    addNotification: (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => string;
    removeNotification: (id: string) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
    clearOlderThan: (hours: number) => void;
    toggleOpen: () => void;
    setOpen: (open: boolean) => void;
    setFocusMode: (enabled: boolean) => void;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            notifications: [],
            isOpen: false,
            focusModeEnabled: false,

            addNotification: (notif) => {
                const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                const notification: Notification = {
                    ...notif,
                    id,
                    timestamp: new Date(),
                    read: false,
                    dismissable: notif.dismissable ?? true,
                    autoDismiss: notif.autoDismiss ?? (notif.type === 'success' ? 5000 : 0)
                };

                // Don't add notifications in focus mode (unless it's an error)
                if (get().focusModeEnabled && notif.type !== 'error') {
                    return id;
                }

                set((state) => ({
                    notifications: [notification, ...state.notifications].slice(0, 50) // Keep max 50
                }));

                // Auto-dismiss if configured
                if (notification.autoDismiss && notification.autoDismiss > 0) {
                    setTimeout(() => {
                        get().removeNotification(id);
                    }, notification.autoDismiss);
                }

                return id;
            },

            removeNotification: (id) => {
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id)
                }));
            },

            markAsRead: (id) => {
                set((state) => ({
                    notifications: state.notifications.map((n) =>
                        n.id === id ? { ...n, read: true } : n
                    )
                }));
            },

            markAllAsRead: () => {
                set((state) => ({
                    notifications: state.notifications.map((n) => ({ ...n, read: true }))
                }));
            },

            clearAll: () => {
                set({ notifications: [] });
            },

            clearOlderThan: (hours) => {
                const cutoff = Date.now() - hours * 60 * 60 * 1000;
                set((state) => ({
                    notifications: state.notifications.filter(
                        (n) => new Date(n.timestamp).getTime() > cutoff
                    )
                }));
            },

            toggleOpen: () => {
                set((state) => ({ isOpen: !state.isOpen }));
            },

            setOpen: (open) => {
                set({ isOpen: open });
            },

            setFocusMode: (enabled) => {
                set({ focusModeEnabled: enabled });
            }
        }),
        {
            name: 'saimor-notifications',
            partialize: (state) => ({
                notifications: state.notifications.slice(0, 20), // Only persist last 20
                focusModeEnabled: state.focusModeEnabled
            })
        }
    )
);

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const getNotificationIcon = (type: NotificationType, source?: string) => {
    if (source === 'mora') return Sparkles;
    if (source === 'mail') return Mail;
    if (source === 'calendar') return Calendar;
    if (source === 'team') return Users;
    if (type === 'memory') return Brain;

    switch (type) {
        case 'success': return CheckCircle;
        case 'error': return AlertTriangle;
        case 'warning': return AlertTriangle;
        case 'insight': return Sparkles;
        default: return Info;
    }
};

const getNotificationColor = (type: NotificationType) => {
    switch (type) {
        case 'success': return 'emerald';
        case 'error': return 'red';
        case 'warning': return 'amber';
        case 'insight': return 'violet';
        case 'memory': return 'purple';
        default: return 'blue';
    }
};

const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes}m`;
    if (hours < 24) return `vor ${hours}h`;
    return `vor ${days}d`;
};

type RadarActResponse = {
    action_type?: string;
    payload?: {
        entity_id?: string | null;
        entity_type?: string | null;
    };
};

const RADAR_TOAST_HIDDEN_KEY = 'saimor.radar.toast.hidden.v1';

const buildContextPath = (ctx: Awaited<ReturnType<typeof getEntityContext>> | null): string | undefined => {
    if (!ctx?.path) return undefined;
    const parts = [
        ctx.path.company?.name,
        ctx.path.department?.name,
        ctx.path.space?.name,
        ...(ctx.path.breadcrumbs || []).map((item) => item.name),
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : undefined;
};

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const NotificationItem: React.FC<{
    notification: Notification;
    onDismiss: () => void;
    onRead: () => void;
}> = ({ notification, onDismiss, onRead }) => {
    const Icon = getNotificationIcon(notification.type, notification.source);
    const color = getNotificationColor(notification.type);

    useEffect(() => {
        // Mark as read when viewed
        if (!notification.read) {
            const timer = setTimeout(onRead, 2000);
            return () => clearTimeout(timer);
        }
    }, [notification.read, onRead]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`
                relative group p-3 rounded-xl border backdrop-blur-xl
                ${notification.read ? 'bg-white/[0.02] border-white/5' : `bg-${color}-500/5 border-${color}-500/20`}
                hover:bg-white/[0.05] transition-colors
            `}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                    bg-${color}-500/10 text-${color}-400
                `}>
                    <Icon size={16} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-medium ${notification.read ? 'text-white/70' : 'text-white/90'}`}>
                            {notification.title}
                        </h4>
                        <span className="text-[10px] text-white/30 whitespace-nowrap">
                            {formatTimestamp(notification.timestamp)}
                        </span>
                    </div>

                    {notification.message && (
                        <p className="text-xs text-white/50 mt-1 line-clamp-2">
                            {notification.message}
                        </p>
                    )}

                    {/* Actions */}
                    {notification.actions && notification.actions.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                            {notification.actions.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        action.onClick();
                                        onDismiss();
                                    }}
                                    className={`
                                        px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors
                                        ${action.variant === 'primary'
                                            ? `bg-${color}-500/20 text-${color}-300 hover:bg-${color}-500/30`
                                            : action.variant === 'danger'
                                            ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                        }
                                    `}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Dismiss Button */}
                {notification.dismissable && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDismiss();
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-all"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Unread indicator */}
            {!notification.read && (
                <div className={`absolute top-3 left-0 w-1 h-4 rounded-r-full bg-${color}-400`} />
            )}
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION CENTER PANEL
// ═══════════════════════════════════════════════════════════════════════════

export const NotificationCenter: React.FC = () => {
    useMailArrivalPrompt(true);
    const {
        notifications,
        isOpen,
        focusModeEnabled,
        setOpen,
        removeNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        setFocusMode,
        addNotification
    } = useNotificationStore();

    const unreadCount = notifications.filter((n) => !n.read).length;
    const openPane = usePaneStore((s) => s.openPane);
    const [hiddenRadarToastIds, setHiddenRadarToastIds] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const parsed = JSON.parse(window.localStorage.getItem(RADAR_TOAST_HIDDEN_KEY) || '[]');
            return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
        } catch {
            return [];
        }
    });

    // Radar (proactive Mora notifications)
    const queryClient = useQueryClient();
    useRadar(); // starts 60s polling + syncs to radarStore
    const { notifications: radarNotifications, dismiss: dismissRadar } = useRadarStore();
    const { setProactiveAlert } = useOrbStore();
    const radarUnread = radarNotifications.filter((n) => n.status === 'pending').length;
    const totalUnread = unreadCount + radarUnread;
    const radarToastNotification = !isOpen && !focusModeEnabled
        ? radarNotifications.find((n) => n.status === 'pending' && n.tier === 'suggest' && Boolean(n.entity_id) && !hiddenRadarToastIds.includes(n.id))
        : undefined;

    const hideRadarToast = useCallback((id: string) => {
        setHiddenRadarToastIds((current) => {
            const next = current.includes(id) ? current : [...current, id].slice(-80);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(RADAR_TOAST_HIDDEN_KEY, JSON.stringify(next));
            }
            return next;
        });
    }, []);

    // Sync unread radar count → orb amber glow
    useEffect(() => {
        setProactiveAlert(radarUnread > 0);
    }, [radarUnread, setProactiveAlert]);

    useEffect(() => {
        const handleRadarPush = () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.radar() });
        };

        realtime.on('mora.radar.new', handleRadarPush);
        realtime.connect();
        return () => realtime.off('mora.radar.new', handleRadarPush);
    }, [queryClient]);

    useEffect(() => {
        if (!radarToastNotification) return;
        const timeout = window.setTimeout(() => {
            hideRadarToast(radarToastNotification.id);
        }, 10000);
        return () => window.clearTimeout(timeout);
    }, [hideRadarToast, radarToastNotification]);

    const handleRadarDismiss = async (id: string) => {
        dismissRadar(id);
        try {
            await corePatch(`/v3/mora/radar/${id}`, { status: 'dismissed' });
        } catch {
            addNotification({
                type: 'warning',
                title: 'Radar konnte nicht aktualisiert werden',
                message: 'Mora synchronisiert die Hinweise erneut.',
                source: 'mora',
                autoDismiss: 6000,
            });
        } finally {
            queryClient.invalidateQueries({ queryKey: queryKeys.radar() });
        }
    };

    const openRadarTarget = useCallback(async (
        notification: RadarNotification,
        payload: NonNullable<RadarActResponse['payload']>,
    ): Promise<boolean> => {
        const entityId = payload.entity_id || notification.entity_id;
        const entityType = (payload.entity_type || notification.entity_type || '').toLowerCase();
        if (!entityId || !entityType) return false;

        if (entityType === 'node') {
            let node: any = null;
            try {
                node = await fetchNodeDetails(entityId);
            } catch {
                // The document pane can still resolve by nodeId.
            }
            const folderId = node?.folder_id || node?.folderId || node?.parent_id || node?.parentId;
            const companyId = node?.company_id || node?.companyId || node?.metadata?.company_id || node?.metadata?.companyId;
            const label = node?.title || node?.name || notification.title;
            openNavigationOutcome({
                title: 'Radar-Signal geöffnet',
                message: folderId
                    ? `${label} wurde im Finder-Kontext und als Dokument geöffnet.`
                    : `${label} wurde als Dokument geöffnet.`,
                targetType: 'node',
                label,
                companyId,
                folderId,
                nodeId: entityId,
                source: 'radar',
            }, openPane);
            return true;
        }

        if (entityType === 'folder') {
            let context: Awaited<ReturnType<typeof getEntityContext>> | null = null;
            try {
                context = await getEntityContext(entityId);
            } catch {
                context = null;
            }
            const breadcrumbs = context?.path?.breadcrumbs || [];
            const label = context?.name || breadcrumbs[breadcrumbs.length - 1]?.name || notification.title;
            openNavigationOutcome({
                title: 'Radar-Ordner geöffnet',
                message: `${label} wurde im Finder geöffnet.`,
                targetType: 'folder',
                label,
                path: buildContextPath(context),
                companyId: context?.path?.company?.id,
                departmentId: context?.path?.department?.id,
                spaceId: context?.path?.space?.id,
                folderId: entityId,
                source: 'radar',
            }, openPane);
            return true;
        }

        if (entityType === 'space') {
            let context: Awaited<ReturnType<typeof getEntityContext>> | null = null;
            try {
                context = await getEntityContext(entityId);
            } catch {
                context = null;
            }
            const label = context?.name || notification.title;
            openNavigationOutcome({
                title: 'Radar-Bereich geöffnet',
                message: `${label} wurde im Finder geöffnet.`,
                targetType: 'space',
                label,
                path: buildContextPath(context),
                companyId: context?.path?.company?.id,
                departmentId: context?.path?.department?.id,
                spaceId: entityId,
                source: 'radar',
            }, openPane);
            return true;
        }

        return false;
    }, [openPane]);

    const handleRadarAct = async (notification: RadarNotification) => {
        try {
            const response = await corePost(`/v3/mora/radar/${notification.id}/act`, {}) as RadarActResponse | null;
            const opened = response?.action_type === 'navigate' && response.payload
                ? await openRadarTarget(notification, response.payload)
                : false;
            if (!opened) {
                addNotification({
                    type: 'info',
                    title: 'Radar-Hinweis aktualisiert',
                    message: 'Der Hinweis wurde erledigt. Für dieses Ziel gibt es noch keine direkte OS-Ansicht.',
                    source: 'mora',
                    autoDismiss: 7000,
                });
            }
            dismissRadar(notification.id);
        } catch {
            addNotification({
                type: 'warning',
                title: 'Radar-Ziel nicht geöffnet',
                message: 'Mora konnte den Hinweis nicht ausführen. Die Liste wird neu synchronisiert.',
                source: 'mora',
                autoDismiss: 7000,
            });
        } finally {
            queryClient.invalidateQueries({ queryKey: queryKeys.radar() });
        }
    };

    // Keyboard shortcut: Strg+Shift+N
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                setOpen(!isOpen);
            }
            // Escape to close
            if (e.key === 'Escape' && isOpen) {
                setOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, setOpen]);

    // Group notifications by date
    const groupedNotifications = notifications.reduce((acc, notif) => {
        const date = new Date(notif.timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let group: string;
        if (date.toDateString() === today.toDateString()) {
            group = 'Heute';
        } else if (date.toDateString() === yesterday.toDateString()) {
            group = 'Gestern';
        } else {
            group = date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'short' });
        }

        if (!acc[group]) acc[group] = [];
        acc[group].push(notif);
        return acc;
    }, {} as Record<string, Notification[]>);

    return (
        <div className="relative">
            <AnimatePresence>
                {radarToastNotification && (
                    <MoraRadarToast
                        key={radarToastNotification.id}
                        notification={radarToastNotification}
                        onOpen={() => handleRadarAct(radarToastNotification)}
                        onDismiss={() => hideRadarToast(radarToastNotification.id)}
                        onShowAll={() => setOpen(true)}
                    />
                )}
            </AnimatePresence>

            {/* Trigger Button (used by Dock or TopBar) */}
            <button
                onClick={() => setOpen(!isOpen)}
                className={`
                    relative p-2 rounded-lg transition-all
                    ${isOpen
                        ? radarUnread > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'
                        : radarUnread > 0 ? 'text-amber-300 hover:text-amber-200 hover:bg-amber-500/10' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}
                `}
                title="Notifications (Strg+Shift+N)"
            >
                {focusModeEnabled ? <BellOff size={18} /> : <Bell size={18} />}

                {/* Unread Badge */}
                {totalUnread > 0 && !focusModeEnabled && (
                    <span className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ${radarUnread > 0 ? 'bg-amber-500' : 'bg-red-500'}`}>
                        {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                )}
            </button>

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Panel */}
                        <motion.div
                            initial={{ opacity: 0, x: 50, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 50, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="absolute bottom-full mb-3 right-0 z-[501] w-[380px] max-h-[70vh] bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <Bell size={18} className="text-white/60" />
                                    <div>
                                        <h3 className="text-sm font-medium text-white">Benachrichtigungen</h3>
                                        <p className="text-[10px] text-white/40">
                                            {totalUnread > 0
                                                ? `${totalUnread} offen${radarUnread > 0 ? ` · ${radarUnread} von Mora` : ''}`
                                                : 'Alles gelesen'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    {/* Focus Mode Toggle */}
                                    <button
                                        onClick={() => setFocusMode(!focusModeEnabled)}
                                        className={`
                                            p-2 rounded-lg transition-colors
                                            ${focusModeEnabled
                                                ? 'bg-amber-500/20 text-amber-400'
                                                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                                            }
                                        `}
                                        title={focusModeEnabled ? 'Focus Mode aktiv' : 'Focus Mode aktivieren'}
                                    >
                                        <BellOff size={14} />
                                    </button>

                                    {/* Mark All Read */}
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="p-2 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
                                            title="Alle als gelesen markieren"
                                        >
                                            <CheckCircle size={14} />
                                        </button>
                                    )}

                                    {/* Clear All */}
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={clearAll}
                                            className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            title="Alle löschen"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}

                                    {/* Close */}
                                    <button
                                        onClick={() => setOpen(false)}
                                        className="p-2 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Focus Mode Banner */}
                            {focusModeEnabled && (
                                <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
                                    <BellOff size={12} className="text-amber-400" />
                                    <span className="text-[10px] text-amber-300">
                                        Focus Mode aktiv - Neue Benachrichtigungen werden stummgeschaltet
                                    </span>
                                </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                                {/* Mora Radar — proactive signals */}
                                {radarNotifications.length > 0 && (
                                    <div className="rounded-xl border border-amber-400/15 bg-amber-500/[0.035] p-2 shadow-[0_18px_50px_rgba(245,158,11,0.08)]">
                                        <div className="mb-2 flex items-center justify-between gap-2 px-1">
                                            <div className="flex items-center gap-2">
                                                <Brain size={10} className="text-amber-300/80" />
                                                <span className="text-[10px] text-amber-100/55 uppercase tracking-wider">
                                                    Mora beobachtet
                                                </span>
                                            </div>
                                            {radarUnread > 0 && (
                                                <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-100/80">
                                                    {radarUnread} offen
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <AnimatePresence mode="popLayout">
                                                {radarNotifications.map((rn) => (
                                                    <RadarCard
                                                        key={rn.id}
                                                        notification={rn}
                                                        onDismiss={() => handleRadarDismiss(rn.id)}
                                                        onAct={rn.entity_id ? () => handleRadarAct(rn) : undefined}
                                                    />
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                )}

                                {notifications.length === 0 && radarNotifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Bell size={32} className="text-white/10 mb-3" />
                                        <p className="text-sm text-white/40">Keine Benachrichtigungen</p>
                                        <p className="text-[10px] text-white/20 mt-1">
                                            Neue Benachrichtigungen erscheinen hier
                                        </p>
                                    </div>
                                ) : (
                                    Object.entries(groupedNotifications).map(([group, notifs]) => (
                                        <div key={group}>
                                            <div className="flex items-center gap-2 mb-2 px-1">
                                                <Clock size={10} className="text-white/20" />
                                                <span className="text-[10px] text-white/30 uppercase tracking-wider">
                                                    {group}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                <AnimatePresence mode="popLayout">
                                                    {notifs.map((notif) => (
                                                        <NotificationItem
                                                            key={notif.id}
                                                            notification={notif}
                                                            onDismiss={() => removeNotification(notif.id)}
                                                            onRead={() => markAsRead(notif.id)}
                                                        />
                                                    ))}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-3 border-t border-white/5 flex items-center justify-between text-[10px] text-white/30">
                                <span>Strg+Shift+N zum Öffnen</span>
                                <span>{notifications.length + radarNotifications.length} Einträge</span>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS FOR ADDING NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const notify = {
    success: (title: string, message?: string) => {
        return useNotificationStore.getState().addNotification({
            type: 'success',
            title,
            message,
            source: 'system'
        });
    },

    error: (title: string, message?: string) => {
        return useNotificationStore.getState().addNotification({
            type: 'error',
            title,
            message,
            source: 'system',
            autoDismiss: 0 // Don't auto-dismiss errors
        });
    },

    warning: (title: string, message?: string) => {
        return useNotificationStore.getState().addNotification({
            type: 'warning',
            title,
            message,
            source: 'system'
        });
    },

    info: (title: string, message?: string) => {
        return useNotificationStore.getState().addNotification({
            type: 'info',
            title,
            message,
            source: 'system'
        });
    },

    mora: (title: string, message?: string, actions?: NotificationAction[]) => {
        return useNotificationStore.getState().addNotification({
            type: 'insight',
            title,
            message,
            source: 'mora',
            actions
        });
    },

    memory: (title: string, message?: string) => {
        return useNotificationStore.getState().addNotification({
            type: 'memory',
            title,
            message,
            source: 'mora'
        });
    }
};

export default NotificationCenter;
