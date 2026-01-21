'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, Check, AlertCircle, RefreshCw, Link2 } from 'lucide-react';
import { coreGet, corePost } from '@/lib/api/coreClient';
import { toast } from 'sonner';

interface CalendarIntegrationStatus {
    configured: boolean;
    status: string;
    provider?: string;
    email?: string;
    calendar_id?: string;
}

export const CalendarIntegration: React.FC = () => {
    const [status, setStatus] = useState<CalendarIntegrationStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);

    const loadStatus = async () => {
        try {
            const data = await coreGet('/v1/integrations/calendar');
            setStatus(data);
        } catch (e) {
            console.error('Failed to load calendar status:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadStatus();
    }, []);

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const res = await corePost('/v1/integrations/calendar/connect', {});
            if (res?.auth_url) {
                window.open(res.auth_url, '_blank', 'noopener,noreferrer');
            } else {
                toast.error('Missing Google auth URL');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Calendar connect failed');
        } finally {
            setIsConnecting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="animate-pulse p-6 rounded-xl bg-white/5">
                <div className="h-6 w-48 bg-white/10 rounded mb-4" />
                <div className="h-20 bg-white/5 rounded" />
            </div>
        );
    }

    if (status?.status === 'owner_only') {
        return (
            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 text-white/60">
                    <AlertCircle size={20} />
                    <span>Calendar integration is available for owners only.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Calendar className="text-emerald-400" size={20} />
                    </div>
                    <div>
                        <h4 className="text-white font-medium">Google Calendar</h4>
                        <p className="text-xs text-white/40">Connect your calendar</p>
                    </div>
                </div>
                {status?.configured && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
                            <Check size={12} /> Connected
                        </span>
                    </div>
                )}
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-4">
                <div className="text-xs text-white/60">
                    Provider: <span className="text-white/80">{status?.provider || 'google'}</span>
                </div>
                {status?.email && (
                    <div className="text-xs text-white/60">
                        Account: <span className="text-white/80">{status.email}</span>
                    </div>
                )}
                {status?.calendar_id && (
                    <div className="text-xs text-white/60">
                        Calendar: <span className="text-white/80">{status.calendar_id}</span>
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                    >
                        <Link2 size={14} />
                        {status?.configured ? 'Reconnect' : 'Connect'}
                    </button>
                    <button
                        onClick={loadStatus}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs hover:bg-white/10 transition-all"
                    >
                        <RefreshCw size={14} />
                        Refresh
                    </button>
                </div>
            </div>
        </div>
    );
};
