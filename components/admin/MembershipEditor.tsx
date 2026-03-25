// components/admin/MembershipEditor.tsx
'use client';

import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { updateUserMemberships, type AdminRosterUser } from '@/lib/api/coreClient';
import { useMoraStore } from '@/lib/store/moraState';

interface MembershipEditorProps {
    user: AdminRosterUser;
    onClose: () => void;
    onSaved: (updatedUser: AdminRosterUser) => void;
}

/**
 * MembershipEditor -- assign or remove department memberships for one user.
 *
 * Spec (Section 2, Surface C -- "Membership management"):
 * Which users belong to which departments, with what role.
 *
 * This is not a diff editor -- it replaces the user's full membership list.
 * The backend replaces the list atomically.
 */
export const MembershipEditor: React.FC<MembershipEditorProps> = ({
    user,
    onClose,
    onSaved,
}) => {
    const departments = useMoraStore((s) => s.departments ?? []);
    const [selected, setSelected] = useState<Set<string>>(
        new Set(user.department_memberships.map((d) => d.id))
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggle = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        const result = await updateUserMemberships(user.id, Array.from(selected));
        setSaving(false);
        if (!result) {
            setError('Speichern fehlgeschlagen. Bitte erneut versuchen.');
            return;
        }
        // Build updated user for optimistic roster update
        const updatedMemberships = departments
            .filter((d) => selected.has(d.id))
            .map((d) => ({ id: d.id, name: d.name }));
        onSaved({ ...user, department_memberships: updatedMemberships });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            role="dialog"
            aria-label={`Mitgliedschaften für ${user.name}`}
        >
            <div className="bg-[#0e1117] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-xl">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-sm font-medium text-white">{user.name}</div>
                        <div className="text-xs text-white/40">Abteilungsmitgliedschaften</div>
                    </div>
                    <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex flex-col gap-2 mb-5">
                    {departments.map((dept) => (
                        <label
                            key={dept.id}
                            className="flex items-center gap-2.5 text-sm text-white/70 cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={selected.has(dept.id)}
                                onChange={() => toggle(dept.id)}
                                className="rounded border-white/20"
                            />
                            {dept.name}
                        </label>
                    ))}
                </div>

                {error && (
                    <p className="text-xs text-red-400 mb-3">{error}</p>
                )}

                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : 'Speichern'}
                    </button>
                </div>
            </div>
        </div>
    );
};
