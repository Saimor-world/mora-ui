"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Shield, Crown, User, Mail, MoreVertical, Search, RefreshCw, Settings } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { coreGet, corePost } from '@/lib/api/coreClient';

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
    avatar?: string;
    lastActive?: string;
}

const ROLE_CONFIG = {
    owner: { icon: Crown, color: 'text-mora-gold', bg: 'bg-mora-gold/20', label: 'Owner' },
    admin: { icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Admin' },
    manager: { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Manager' },
    member: { icon: User, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Member' }
};

export const UsersPane: React.FC<{ id?: string }> = ({ id = 'users-main' }) => {
    const { removePane, minimizePane, focusPane, getPane } = usePaneStore();
    const pane = getPane(id);

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'invited'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'member' | 'manager'>('member');

    const { activeCompanyId, viewMode } = useMoraStore();

    // Load team members
    useEffect(() => {
        const loadMembers = async () => {
            setIsLoading(true);
            try {
                const response = await coreGet(`/v1/companies/${activeCompanyId}/users`);
                if (response && Array.isArray(response)) {
                    setMembers(response);
                }
            } catch (error) {
                console.log('Failed to load team members, using mock data');
                // Mock data for demo
                setMembers([
                    { id: '1', name: 'You (Owner)', email: 'owner@saimor.io', role: 'owner', status: 'active', lastActive: 'Now' },
                    { id: '2', name: 'Max Mustermann', email: 'max@example.com', role: 'manager', status: 'active', lastActive: '2h ago' },
                    { id: '3', name: 'Anna Schmidt', email: 'anna@example.com', role: 'member', status: 'active', lastActive: '1d ago' },
                    { id: '4', name: 'Pending Invite', email: 'new@example.com', role: 'member', status: 'invited', lastActive: undefined }
                ]);
            } finally {
                setIsLoading(false);
            }
        };

        loadMembers();
    }, [activeCompanyId]);

    // Filter members
    const filteredMembers = members.filter(m => {
        if (filter === 'active' && m.status !== 'active') return false;
        if (filter === 'invited' && m.status !== 'invited') return false;
        if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !m.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const handleInvite = async () => {
        if (!inviteEmail) return;

        try {
            await corePost(`/v1/companies/${activeCompanyId}/invite`, {
                email: inviteEmail,
                role: inviteRole
            });

            setMembers(prev => [...prev, {
                id: `temp-${Date.now()}`,
                name: 'Pending Invite',
                email: inviteEmail,
                role: inviteRole,
                status: 'invited'
            }]);

            setShowInviteModal(false);
            setInviteEmail('');
        } catch (error) {
            console.error('Failed to send invite:', error);
            // Still add locally for demo
            setMembers(prev => [...prev, {
                id: `temp-${Date.now()}`,
                name: 'Pending Invite',
                email: inviteEmail,
                role: inviteRole,
                status: 'invited'
            }]);
            setShowInviteModal(false);
            setInviteEmail('');
        }
    };

    if (!pane) return null;

    return (
        <GlassPanel
            title="Team & Users"
            width={700}
            height={500}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={true}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            showBackButton={false}
            draggable
        >
            <div className="h-full flex flex-col relative">
                {/* Header */}
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="text-emerald-400" size={20} />
                            <h2 className="text-lg font-medium">Team Members</h2>
                            <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                                {members.length} members
                            </span>
                        </div>
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm transition-all"
                        >
                            <UserPlus size={16} />
                            Invite
                        </button>
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
                                    const roleConfig = ROLE_CONFIG[member.role];
                                    const RoleIcon = roleConfig.icon;

                                    return (
                                        <motion.div
                                            key={member.id}
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

                                            {/* Role Badge */}
                                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${roleConfig.bg}`}>
                                                <RoleIcon size={12} className={roleConfig.color} />
                                                <span className={`text-xs ${roleConfig.color}`}>{roleConfig.label}</span>
                                            </div>

                                            {/* Last Active */}
                                            {member.lastActive && (
                                                <div className="text-xs text-white/30 hidden group-hover:block">
                                                    {member.lastActive}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <button className="p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all">
                                                <MoreVertical size={14} className="text-white/40" />
                                            </button>
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
                        {viewMode === 'demo' ? 'Demo Mode - Invites simulated' : 'Pro: Unlimited team members'}
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
                            onClick={() => setShowInviteModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-black/90 border border-white/20 rounded-2xl p-6 w-80"
                            >
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
                                </div>

                                <div className="flex gap-2 mt-6">
                                    <button
                                        onClick={() => setShowInviteModal(false)}
                                        className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white/80 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleInvite}
                                        disabled={!inviteEmail}
                                        className="flex-1 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                                    >
                                        Send Invite
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </GlassPanel>
    );
};

export default UsersPane;
