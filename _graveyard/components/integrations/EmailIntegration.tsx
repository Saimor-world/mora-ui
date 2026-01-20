'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Check, X, RefreshCw, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { coreGet, corePost, coreDelete } from '@/lib/api/coreClient';
import { toast } from 'sonner';

interface MailIntegrationStatus {
    configured: boolean;
    enabled: boolean;
    provider?: string;
    email?: string;
    status: string;
}

const PROVIDERS = [
    { id: 'gmail', name: 'Gmail', icon: '📧' },
    { id: 'outlook', name: 'Outlook/Office 365', icon: '📬' },
    { id: 'custom', name: 'Custom IMAP', icon: '⚙️' },
];

export const EmailIntegration: React.FC = () => {
    const [status, setStatus] = useState<MailIntegrationStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form state
    const [provider, setProvider] = useState('gmail');
    const [email, setEmail] = useState('');
    const [appPassword, setAppPassword] = useState('');
    const [customHost, setCustomHost] = useState('');
    const [customPort, setCustomPort] = useState('993');

    // Load current status
    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        try {
            const data = await coreGet('/v1/integrations/mail');
            setStatus(data);
            if (data.configured) {
                setEmail(data.email || '');
                setProvider(data.provider || 'gmail');
            }
        } catch (e) {
            console.error('Failed to load mail status:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!email || !appPassword) {
            toast.error('Email und App Password sind erforderlich');
            return;
        }

        setIsSaving(true);
        try {
            await corePost('/v1/integrations/mail', {
                provider,
                email,
                app_password: appPassword,
                host: provider === 'custom' ? customHost : undefined,
                port: provider === 'custom' ? parseInt(customPort) : undefined,
            });

            toast.success('Email-Integration gespeichert!');
            setAppPassword(''); // Clear password field after save
            await loadStatus();
        } catch (e: any) {
            toast.error(e.message || 'Speichern fehlgeschlagen');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        try {
            const result = await corePost('/v1/integrations/mail/test', {});
            if (result.success) {
                toast.success(`Verbindung erfolgreich! (${result.inbox_count || 0} Nachrichten)`);
            } else {
                toast.error(`Verbindung fehlgeschlagen: ${result.message}`);
            }
        } catch (e: any) {
            toast.error('Test fehlgeschlagen');
        } finally {
            setIsTesting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Email-Integration wirklich entfernen?')) return;

        try {
            await coreDelete('/v1/integrations/mail');
            toast.success('Email-Integration entfernt');
            setEmail('');
            setAppPassword('');
            await loadStatus();
        } catch (e) {
            toast.error('Löschen fehlgeschlagen');
        }
    };

    if (isLoading) {
        return (
            <div className="animate-pulse p-6 rounded-xl bg-white/5">
                <div className="h-6 w-48 bg-white/10 rounded mb-4" />
                <div className="h-32 bg-white/5 rounded" />
            </div>
        );
    }

    // Check if user is not allowed (demo/member)
    if (status?.status === 'forbidden_demo' || status?.status === 'owner_only') {
        return (
            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 text-white/60">
                    <AlertCircle size={20} />
                    <span>Email-Integration ist nur für Owner verfügbar.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Mail className="text-emerald-400" size={20} />
                    </div>
                    <div>
                        <h4 className="text-white font-medium">Email Integration</h4>
                        <p className="text-xs text-white/40">Verbinde deinen Email-Account</p>
                    </div>
                </div>

                {status?.configured && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
                            <Check size={12} /> Verbunden
                        </span>
                    </div>
                )}
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-5">
                {/* Provider Selection */}
                <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-white/40">Provider</label>
                    <div className="flex gap-3">
                        {PROVIDERS.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setProvider(p.id)}
                                className={`flex-1 p-3 rounded-lg border text-sm transition-all ${provider === p.id
                                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                    }`}
                            >
                                <span className="text-lg mr-2">{p.icon}</span>
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom IMAP Fields */}
                {provider === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-white/40">IMAP Host</label>
                            <input
                                type="text"
                                value={customHost}
                                onChange={(e) => setCustomHost(e.target.value)}
                                placeholder="imap.example.com"
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-white/40">Port</label>
                            <input
                                type="text"
                                value={customPort}
                                onChange={(e) => setCustomPort(e.target.value)}
                                placeholder="993"
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none"
                            />
                        </div>
                    </div>
                )}

                {/* Email Address */}
                <div className="space-y-1">
                    <label className="text-xs text-white/40">Email Adresse</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="deine@email.com"
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none"
                    />
                </div>

                {/* App Password */}
                <div className="space-y-1">
                    <label className="text-xs text-white/40 flex items-center gap-2">
                        App Password
                        <a
                            href="https://myaccount.google.com/apppasswords"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline"
                        >
                            (Gmail App Password erstellen)
                        </a>
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={appPassword}
                            onChange={(e) => setAppPassword(e.target.value)}
                            placeholder={status?.configured ? '••••••••••••••••' : 'App Password eingeben'}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    <p className="text-[10px] text-white/30 mt-1">
                        Dein Passwort wird verschlüsselt gespeichert und niemals im Klartext übertragen.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !email || !appPassword}
                        className="flex-1 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                        Speichern
                    </button>

                    {status?.configured && (
                        <>
                            <button
                                onClick={handleTest}
                                disabled={isTesting}
                                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                Testen
                            </button>

                            <button
                                onClick={handleDelete}
                                className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors flex items-center gap-2"
                            >
                                <X size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
