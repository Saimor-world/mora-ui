'use client';

import React, { useState } from 'react';
import { Check, Loader2, Lock } from 'lucide-react';
import { corePost } from '@/lib/api/coreClient';
import { toast } from '@/lib/toast';

/**
 * Profile settings tab: identity card + change-password form.
 * Extracted verbatim from apps/settings/index.tsx — behavior-neutral.
 */
export function ProfileTab({ user }: { user: any }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('Neue Passwörter stimmen nicht überein.');
            return;
        }
        if (newPassword.length < 8) {
            toast.error('Neues Passwort muss mindestens 8 Zeichen haben.');
            return;
        }
        setSaving(true);
        try {
            await corePost('/v3/auth/me/password', {
                current_password: currentPassword,
                new_password: newPassword,
            });
            toast.success('Passwort erfolgreich geändert.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            const msg = err?.detail || err?.message || 'Passwort konnte nicht geändert werden.';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg text-white font-light">Profil</h3>

            {/* Identity card */}
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-xl font-medium text-white">
                    {user?.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                    <div className="text-white font-medium">{user?.name}</div>
                    <div className="text-white/40 text-sm">{user?.email}</div>
                    <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-white/10 text-white/60 uppercase tracking-wider">
                        {user?.role}
                    </div>
                </div>
            </div>

            {/* Change password */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Lock size={14} className="text-white/40" />
                    <label className="text-xs uppercase tracking-wider text-white/40">Passwort ändern</label>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    <input
                        type="password"
                        placeholder="Aktuelles Passwort"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        required
                        className="w-full rounded-lg bg-white/8 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                    />
                    <input
                        type="password"
                        placeholder="Neues Passwort (min. 8 Zeichen)"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        className="w-full rounded-lg bg-white/8 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                    />
                    <input
                        type="password"
                        placeholder="Neues Passwort bestätigen"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        className="w-full rounded-lg bg-white/8 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                    />
                    <button
                        type="submit"
                        disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {saving ? 'Wird gespeichert...' : 'Passwort aktualisieren'}
                    </button>
                </form>
            </div>
        </div>
    );
}
