// components/admin/AdminUserRow.tsx
'use client';

import React from 'react';
import { type AdminRosterUser } from '@/lib/api/coreClient';

const ROLE_LABEL: Record<AdminRosterUser['role'], string> = {
    owner: 'Eigentümer',
    admin: 'Admin',
    manager: 'Manager',
    member: 'Mitglied',
};

const STATUS_STYLE: Record<AdminRosterUser['status'], string> = {
    active: 'text-emerald-400',
    invited: 'text-amber-400',
    inactive: 'text-white/30',
};

const STATUS_LABEL: Record<AdminRosterUser['status'], string> = {
    active: 'Aktiv',
    invited: 'Eingeladen',
    inactive: 'Inaktiv',
};

interface AdminUserRowProps {
    user: AdminRosterUser;
    onEditMemberships: (user: AdminRosterUser) => void;
}

export const AdminUserRow: React.FC<AdminUserRowProps> = ({ user, onEditMemberships }) => (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
        <td className="px-4 py-3">
            <div className="text-sm text-white">{user.name}</div>
            <div className="text-xs text-white/40">{user.email}</div>
        </td>
        <td className="px-4 py-3 text-xs text-white/60">
            {ROLE_LABEL[user.role]}
        </td>
        <td className="px-4 py-3">
            <span className={`text-xs ${STATUS_STYLE[user.status]}`}>
                {STATUS_LABEL[user.status]}
            </span>
        </td>
        <td className="px-4 py-3">
            <div className="flex flex-wrap gap-1">
                {user.department_memberships.length === 0 ? (
                    <span className="text-xs text-white/20">Keine Abteilungen</span>
                ) : (
                    user.department_memberships.map((dept) => (
                        <span key={dept.id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                            {dept.name}
                        </span>
                    ))
                )}
            </div>
        </td>
        <td className="px-4 py-3">
            <button
                onClick={() => onEditMemberships(user)}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
                Bearbeiten
            </button>
        </td>
    </tr>
);
