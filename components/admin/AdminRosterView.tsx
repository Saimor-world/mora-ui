// components/admin/AdminRosterView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchUserRoster, type AdminRosterUser } from '@/lib/api/coreClient';
import { AdminUserRow } from './AdminUserRow';
import { MembershipEditor } from './MembershipEditor';

/**
 * AdminRosterView -- all company users with roles, status, department memberships.
 *
 * Spec (Section 2, Surface C -- "Roster view"):
 * All users, status (active/invited/inactive), roles, department memberships.
 * Includes inline membership editing trigger.
 *
 * Degrades gracefully if fetchUserRoster returns null (endpoint not yet available).
 */
export const AdminRosterView: React.FC = () => {
    const [users, setUsers] = useState<AdminRosterUser[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<AdminRosterUser | null>(null);

    useEffect(() => {
        fetchUserRoster().then((result) => {
            setUsers(result);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-white/30 text-sm py-8" data-testid="roster-loading">
                <Loader2 size={14} className="animate-spin" />
                Benutzer werden geladen...
            </div>
        );
    }

    if (users === null) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/55">
                Die Benutzerliste ist im HQ noch nicht vollständig verfügbar. Für Instanz- und Owner-Verwaltung nutze bitte die externe Owner Console.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-white/70">Benutzer ({users.length})</h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="px-4 py-2 text-xs text-white/30 font-normal">Name</th>
                            <th className="px-4 py-2 text-xs text-white/30 font-normal">Rolle</th>
                            <th className="px-4 py-2 text-xs text-white/30 font-normal">Status</th>
                            <th className="px-4 py-2 text-xs text-white/30 font-normal">Abteilungen</th>
                            <th className="px-4 py-2 text-xs text-white/30 font-normal"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <AdminUserRow
                                key={user.id}
                                user={user}
                                onEditMemberships={setEditingUser}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {editingUser && (
                <MembershipEditor
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSaved={(updatedUser) => {
                        setUsers((prev) => prev?.map((u) => u.id === updatedUser.id ? updatedUser : u) ?? prev);
                        setEditingUser(null);
                    }}
                />
            )}
        </div>
    );
};
