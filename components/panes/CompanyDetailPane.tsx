"use client";

import React, { useState } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { Building2, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { coreDelete } from '@/lib/api/coreClient';

interface CompanyDetailPaneProps {
    id: string;
    companyId?: string;
    companyName?: string;
}

/**
 * COMPANY DETAIL PANE
 *
 * Shows basic company metadata and real actions only.
 */
export const CompanyDetailPane: React.FC<CompanyDetailPaneProps> = ({ id, companyId, companyName }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const { companies, loadCompanies } = useMoraStore();
    const pane = getPane(id);
    const safeCompanies = Array.isArray(companies) ? companies : [];

    const [activeTab, setActiveTab] = useState<'overview' | 'danger'>('overview');
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState('');

    if (!pane || !companyId) return null;

    const company = safeCompanies.find(c => c.id === companyId);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Building2 },
        { id: 'danger', label: 'Danger Zone', icon: AlertCircle },
    ];

    const handleDeleteCompany = async () => {
        if (confirmDelete != company?.name) {
            toast.error('Please type the company name to confirm');
            return;
        }

        setIsDeleting(true);
        try {
            await coreDelete(`/v3/companies/${companyId}`);
            toast.success(`Deleted "${company?.name}"`);
            await loadCompanies();
            removePane(id);
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete company');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <GlassPanel
            title={companyName || company?.name || "Company"}
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
            draggable
            resizable
        >
            <div className="flex h-full">
                <div className="w-48 border-r border-white/5 p-3 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === tab.id
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                                } ${tab.id === 'danger' ? 'text-red-400 hover:text-red-300' : ''}`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                    <Building2 size={32} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-light text-white">{company?.name}</h2>
                                    <p className="text-sm text-white/40 font-mono">{company?.slug}</p>
                                </div>
                                {company?.is_demo && (
                                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs border border-blue-500/30">
                                        DEMO
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Company ID</div>
                                    <div className="text-sm text-white/70 font-mono break-all">{companyId}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-emerald-400 text-sm">
                                <CheckCircle size={16} />
                                Active
                            </div>
                        </div>
                    )}

                    {activeTab === 'danger' && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="text-red-400 mt-0.5" size={20} />
                                    <div>
                                        <h3 className="text-lg text-red-400 font-medium">Danger Zone</h3>
                                        <p className="text-sm text-red-300/60 mt-1">
                                            Actions here are irreversible. Proceed with caution.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 rounded-xl bg-white/5 border border-red-500/20 space-y-4">
                                <h4 className="text-white font-medium">Delete Company</h4>
                                <p className="text-sm text-white/50">
                                    This will permanently delete <strong className="text-white">{company?.name}</strong> and all associated data including departments, spaces, folders, and files.
                                </p>

                                <div className="space-y-3">
                                    <label className="text-sm text-white/60">
                                        Type <span className="text-red-400 font-mono">{company?.name}</span> to confirm:
                                    </label>
                                    <input
                                        type="text"
                                        value={confirmDelete}
                                        onChange={(e) => setConfirmDelete(e.target.value)}
                                        placeholder="Enter company name..."
                                        className="w-full px-4 py-3 rounded-lg bg-black/30 border border-red-500/30 text-white placeholder-white/30 focus:outline-none focus:border-red-500/60"
                                    />
                                    <button
                                        onClick={handleDeleteCompany}
                                        disabled={isDeleting || confirmDelete != company?.name}
                                        className="w-full py-3 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        {isDeleting ? 'Deleting...' : 'Delete Company Permanently'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </GlassPanel>
    );
};
