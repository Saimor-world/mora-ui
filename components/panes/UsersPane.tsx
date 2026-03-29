"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Shield, Crown, User, Mail, Search, RefreshCw, Settings, Copy, Check } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { coreGet, corePost, fetchAdminUsers, patchAdminUser, patchUserCompanyBinding, AdminUser, AdminUserPatch } from '@/lib/api/coreClient';
import { createInvite } from '@/lib/api/inviteClient';
import { toast } from 'sonner';
import { isAdmin as checkIsAdmin } from '@/lib/auth/roles';

/**
 * UsersPane - Team & Users Management
 * 
 * Features:
 * - View all team members
 * - Role management (Owner, Manager, Member)
 * - Invite new users
 * - Activity status
 */

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: 'owner' | 'manager' | 'member' | 'admin';
    status: 'active' | 'invited' | 'inactive';
    defaultCompanyId?: string | null;
    companyOptions?: Array<{ id: string; name: string }>;
    avatar?: string;
    lastActive?: string;
}

const ROLE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    system_owner: { icon: Crown, color: 'text-mora-gold', bg: 'bg-mora-gold/20', label: 'System Owner' },
    owner: { icon: Crown, color: 'text-mora-gold', bg: 'bg-mora-gold/20', label: 'Owner' },
    admin: { icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Admin' },
    manager: { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Manager' },
    member: { icon: User, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Member' },
    demo: { icon: User, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Demo' }
};

const DEFAULT_ROLE_CONFIG = { icon: User, color: 'text-white/60', bg: 'bg-white/10', label: 'User' };

export const UsersPane: React.FC<{ id?: string }> = ({ id = 'users-main' }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(id);

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invites, setInvites] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'invited'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'member' | 'manager'>('member');

    const [inviteDepartmentIds, setInviteDepartmentIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);

    const { viewMode } = useMoraStore();
    const currentUser = useMoraStore(s => s.user);
    const departments = useMoraStore(s => s.departments);
    const isAdmin = checkIsAdmin(currentUser?.role);

    // Load team members
    useEffect(() => {
        const loadMembers = async () => {
            setIsLoading(true);
            try {
                if (isAdmin) {
                    // v3 admin path: includes inactive users, richer data
                    const adminUsers = await fetchAdminUsers(true);
                    setMembers(adminUsers.map((u: AdminUser) => ({
                        id: u.user_id || u.id || u.email,
                        name: u.name || u.full_name || (u.email ? u.email.split('@')[0] : 'User'),
                        email: u.email,
                        role: u.role,
                        status: u.is_active ? 'active' : 'inactive',
                        defaultCompanyId: u.default_company_id || null,
                        companyOptions: u.company_context?.effective_companies || [],
                        lastActive: u.created_at
                    })));
                    setInvites([]);
                } else {
                    // v1 member path: active members + pending invites
                    const [membersRes, invitesRes] = await Promise.all([
                        coreGet("/v3/team/members?include_inactive=false", { isOptional: true }),
                        coreGet("/v3/team/invites", { isOptional: true })
                    ]);

                    if (Array.isArray(membersRes)) {
                        setMembers(membersRes.map((u: any) => ({
                            id: u.id,
                            name: u.name || u.full_name || (u.email ? u.email.split('@')[0] : 'User'),
                            email: u.email,
                            role: u.role,
                            status: 'active',
                            lastActive: u.last_seen
                        })));
                    } else {
                        setMembers([]);
                    }

                    if (Array.isArray(invitesRes)) {
                        setInvites(invitesRes.map((invite: any) => ({
                            id: invite.id,
                            name: invite.email.split('@')[0],
                            email: invite.email,
                            role: invite.role,
                            status: 'invited',
                            lastActive: undefined
                        })));
                    } else {
                        setInvites([]);
                    }
                }
            } catch (error) {
                console.error('Failed to load team members', error);
                setMembers([]);
                setInvites([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadMembers();
    }, [isAdmin]);

    const combinedMembers = [...members, ...invites];

    // Filter members
    const filteredMembers = combinedMembers.filter(m => {
        if (filter === 'active' && m.status !== 'active') return false;
        if (filter === 'invited' && m.status !== 'invited') return false;
        if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !m.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const handleInviteSubmit = async () => {
        if (!inviteEmail) return;
        setIsSubmitting(true);
        const result = await createInvite({
            email: inviteEmail,
            role: inviteRole as 'member' | 'manager' | 'admin',
            department_ids: inviteDepartmentIds,
        });
        setIsSubmitting(false);
        if (result) {
            setInviteLink(result.invite_link ?? null);
            // Optimistically add the pending invite so it appears immediately
            setInvites(prev => [...prev, {
                id: result.token ?? inviteEmail,
                name: inviteEmail.split('@')[0],
                email: inviteEmail,
                role: inviteRole,
                status: 'invited' as const,
            }]);
        } else {
            toast.error('Einladung fehlgeschlagen. Bitte erneut versuchen.');
        }
    };

    const handleRoleChange = async (memberId: string, newRole: AdminUserPatch['role']) => {
        if (!newRole) return;
        const updated = await patchAdminUser(memberId, { role: newRole });
        if (updated) {
            setMembers(prev => prev.map(m =>
                m.id === memberId ? { ...m, role: updated.role } : m
            ));
            toast.success('Role updated');
        }
    };

    const handleActiveToggle = async (memberId: string, currentlyActive: boolean) => {
        const updated = await patchAdminUser(memberId, { is_active: !currentlyActive });
        if (updated) {
            setMembers(prev => prev.map(m =>
                m.id === memberId ? { ...m, status: updated.is_active ? 'active' : 'inactive' } : m
            ));
            toast.success(updated.is_active ? 'User activated' : 'User deactivated');
        }
    };

    const closeInviteModal = () => {
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteDepartmentIds([]);
        setInviteLink(null);
        setLinkCopied(false);
    };

    const handleCopyInviteLink = () => {
        if (!inviteLink) return;
        navigator.clipboard.writeText(inviteLink).then(() => {
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        });
    };

    const handleCompanyBindingChange = async (memberId: string, companyId: string) => {
        const selectedCompanyId = companyId || null;
        const updated = await patchUserCompanyBinding(memberId, selectedCompanyId);
        if (!updated) return;
        setMembers(prev => prev.map(m =>
            m.id === memberId ? { ...m, defaultCompanyId: updated.default_company_id || null } : m
        ));
        toast.success(selectedCompanyId ? 'Default company updated' : 'Default company cleared');
    };

    if (!pane) return null;

    return (
        <GlassPanel
            title="Team & Users"
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            onResize={(w, h) => updatePaneSize(id, w, h)}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={true}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            showBackButton={false}
            draggable
            resizable
        >
            <div className="h-full flex flex-col relative">
                {/* Header */}
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="text-emerald-400" size={20} />
                            <h2 className="text-lg font-medium">Team Members</h2>
                            <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                                {combinedMembers.length} members
                            </span>
                        </div>
                        {isAdmin && (
                            <button
                                data-testid="invite-button"
                                onClick={() => setShowInviteModal(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm transition-all"
                            >
                                <UserPlus size={16} />
                                Invite
                            </button>
                        )}
                    </div>

                    {/* Search & Filter */}
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search members..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                            />
                        </div>
                        <div className="flex bg-white/5 rounded-lg p-1">
                            {(['all', 'active', 'invited'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1 text-xs rounded transition-all ${filter === f
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'text-white/40 hover:text-white/60'
                                        }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Members List */}
                <div className="flex-1 overflow-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="text-emerald-400 animate-spin" size={24} />
                        </div>
                    ) : filteredMembers.length === 0 ? (
                        <div className="text-center py-8 text-white/40">
                            <Users size={32} className="mx-auto mb-2 opacity-50" />
                            <p>No members found</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <AnimatePresence>
                                {filteredMembers.map((member, index) => {
                                    const roleConfig = ROLE_CONFIG[member.role] || DEFAULT_ROLE_CONFIG;
                                    const RoleIcon = roleConfig.icon;

                                    return (
                                        <motion.div
                                            key={`${member.status}:${member.id}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
                                        >
                                            {/* Avatar */}
                                            <div className={`w-10 h-10 rounded-full ${roleConfig.bg} flex items-center justify-center`}>
                                                {member.avatar ? (
                                                    <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    <span className={`text-sm font-medium ${roleConfig.color}`}>
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-white/90 truncate">{member.name}</span>
                                                    {member.status === 'invited' && (
                                                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                                                            Pending
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-white/40">
                                                    <Mail size={10} />
                                                    <span className="truncate">{member.email}</span>
                                                </div>
                                            </div>

                                            {/* Role Badge / Admin Role Select */}
                                            {isAdmin && member.status !== 'invited' ? (
                                                <select
                                                    value={member.role}
                                                    onChange={(e) => handleRoleChange(member.id, e.target.value as AdminUserPatch['role'])}
                                                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="member">Member</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="owner">Owner</option>
                                                </select>
                                            ) : (
                                                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${roleConfig.bg}`}>
                                                    <RoleIcon size={12} className={roleConfig.color} />
                                                    <span className={`text-xs ${roleConfig.color}`}>{roleConfig.label}</span>
                                                </div>
                                            )}

                                            {isAdmin && member.status !== 'invited' && Array.isArray(member.companyOptions) && member.companyOptions.length > 0 && (
                                                <select
                                                    value={member.defaultCompanyId || ''}
                                                    onChange={(e) => handleCompanyBindingChange(member.id, e.target.value)}
                                                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    title="Default company"
                                                >
                                                    <option value="">No default company</option>
                                                    {member.companyOptions.map(company => (
                                                        <option key={company.id} value={company.id}>{company.name}</option>
                                                    ))}
                                                </select>
                                            )}

                                            {/* Admin Active Toggle */}
                                            {isAdmin && member.status !== 'invited' && (
                                                <button
                                                    onClick={() => handleActiveToggle(member.id, member.status === 'active')}
                                                    className={`w-8 h-4 rounded-full transition-all flex-shrink-0 relative ${member.status === 'active' ? 'bg-emerald-500/60' : 'bg-white/10'}`}
                                                    title={member.status === 'active' ? 'Deactivate user' : 'Activate user'}
                                                >
                                                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${member.status === 'active' ? 'left-4' : 'left-0.5'}`} />
                                                </button>
                                            )}

                                            {/* Last Active */}
                                            {member.lastActive && (
                                                <div className="text-xs text-white/30 hidden group-hover:block">
                                                    {member.lastActive}
                                                </div>
                                            )}

                                            {/* Actions: reserved for future row menu */}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/10 flex items-center justify-between">
                    <div className="text-xs text-white/30">
                        {viewMode === 'demo' ? 'Demo mode: limited integrations' : 'Invites are tenant-scoped'}
                    </div>
                    <button className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                        <Settings size={12} />
                        Roles & Permissions
                    </button>
                </div>

                {/* Invite Modal */}
                <AnimatePresence>
                    {showInviteModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl"
                            onClick={closeInviteModal}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-black/90 border border-white/20 rounded-2xl p-6 w-80"
                            >
                                {inviteLink ? (
                                    /* ── Success view: show link with copy button ── */
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Check size={18} className="text-emerald-400" />
                                            <h3 className="text-lg font-medium">Einladung gesendet</h3>
                                        </div>
                                        <p className="text-xs text-white/40 mb-4">
                                            Teile diesen Link mit <span className="text-white/60">{inviteEmail}</span>.
                                            Er ist einmalig verwendbar.
                                        </p>
                                        <div
                                            data-testid="invite-link-display"
                                            className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 mb-4"
                                        >
                                            <span className="flex-1 text-xs text-emerald-300 font-mono truncate">
                                                {inviteLink}
                                            </span>
                                            <button
                                                data-testid="copy-invite-link"
                                                onClick={handleCopyInviteLink}
                                                className="shrink-0 p-1 rounded hover:bg-white/10 text-white/50 hover:text-emerald-400 transition-all"
                                                title="Link kopieren"
                                            >
                                                {linkCopied
                                                    ? <Check size={14} className="text-emerald-400" />
                                                    : <Copy size={14} />
                                                }
                                            </button>
                                        </div>
                                        <button
                                            onClick={closeInviteModal}
                                            className="w-full py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white/80 transition-all"
                                        >
                                            Fertig
                                        </button>
                                    </>
                                ) : (
                                    /* ── Invite form ── */
                                    <>
                                        <h3 className="text-lg font-medium mb-4">Invite Team Member</h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs text-white/40 mb-1 block">Email Address</label>
                                                <input
                                                    type="email"
                                                    value={inviteEmail}
                                                    onChange={(e) => setInviteEmail(e.target.value)}
                                                    placeholder="colleague@company.com"
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs text-white/40 mb-1 block">Role</label>
                                                <div className="flex gap-2">
                                                    {(['member', 'manager'] as const).map(role => (
                                                        <button
                                                            key={role}
                                                            onClick={() => setInviteRole(role)}
                                                            className={`flex-1 py-2 rounded-lg text-sm transition-all ${inviteRole === role
                                                                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                                                                : 'bg-white/5 border border-white/10 text-white/60 hover:text-white/80'
                                                                }`}
                                                        >
                                                            {role.charAt(0).toUpperCase() + role.slice(1)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {departments && departments.length > 0 && (
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-xs text-white/40">Abteilungen</label>
                                                    {departments.map((dept) => (
                                                        <label key={dept.id} className="flex items-center gap-2 text-sm text-white/60">
                                                            <input
                                                                type="checkbox"
                                                                checked={inviteDepartmentIds.includes(dept.id)}
                                                                onChange={(e) => {
                                                                    setInviteDepartmentIds((prev) =>
                                                                        e.target.checked
                                                                            ? [...prev, dept.id]
                                                                            : prev.filter((id) => id !== dept.id)
                                                                    );
                                                                }}
                                                            />
                                                            {dept.name}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 mt-6">
                                            <button
                                                onClick={closeInviteModal}
                                                className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white/80 transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleInviteSubmit}
                                                disabled={!inviteEmail || isSubmitting}
                                                className="flex-1 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                                            >
                                                {isSubmitting ? 'Sending...' : 'Send Invite'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </GlassPanel>
    );
};

export default UsersPane;
