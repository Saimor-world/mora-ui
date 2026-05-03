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
    const {
        notifications,
        isOpen,
        focusModeEnabled,
        setOpen,
        removeNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        setFocusMode
    } = useNotificationStore();

    const unreadCount = notifications.filter((n) => !n.read).length;

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
            {/* Trigger Button (used by Dock or TopBar) */}
            <button
                onClick={() => setOpen(!isOpen)}
                className={`
                    relative p-2 rounded-lg transition-all
                    ${isOpen ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}
                `}
                title="Notifications (Strg+Shift+N)"
            >
                {focusModeEnabled ? <BellOff size={18} /> : <Bell size={18} />}

                {/* Unread Badge */}
                {unreadCount > 0 && !focusModeEnabled && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
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
                                            {unreadCount > 0 ? `${unreadCount} ungelesen` : 'Alles gelesen'}
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
                                            title="Alle loeschen"
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
                                {notifications.length === 0 ? (
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
                                <span>{notifications.length} Benachrichtigungen</span>
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
