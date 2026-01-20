"use client";

import React, { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import {
    Building2, BarChart3, Users, Trash2, Settings,
    TrendingUp, CreditCard, Activity, FileText,
    AlertCircle, CheckCircle, X, Edit, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { coreDelete, corePatch } from '@/lib/api/coreClient';

interface CompanyDetailPaneProps {
    id: string;
    companyId: string;
    companyName: string;
}

/**
 * COMPANY DETAIL PANE
 * 
 * Opens on double-click from Client Health Dashboard.
 * Shows:
 * - Company Overview
 * - Marketing Stats
 * - Billing Information  
 * - Usage Metrics
 * - Delete Company (for debugging)
 */
export const CompanyDetailPane: React.FC<CompanyDetailPaneProps> = ({ id, companyId, companyName }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const { companies, loadCompanies } = useMoraStore();
    const pane = getPane(id);

    const [activeTab, setActiveTab] = useState<'overview' | 'marketing' | 'billing' | 'usage' | 'danger'>('overview');
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState('');

    // Get company data
    const company = companies.find(c => c.id === companyId);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Building2 },
        { id: 'marketing', label: 'Marketing', icon: TrendingUp },
        { id: 'billing', label: 'Billing', icon: CreditCard },
        { id: 'usage', label: 'Usage', icon: Activity },
        { id: 'danger', label: 'Danger Zone', icon: AlertCircle },
    ];

    const handleDeleteCompany = async () => {
        if (confirmDelete !== company?.name) {
            toast.error('Please type the company name to confirm');
            return;
        }

        setIsDeleting(true);
        try {
            await coreDelete(`/v1/companies/${companyId}`);
            toast.success(`Deleted "${company?.name}"`);
            await loadCompanies();
            removePane(id);
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete company');
        } finally {
            setIsDeleting(false);
        }
    };

    if (!pane) return null;

    return (
        <GlassPanel
            title={companyName}
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
                {/* Sidebar Tabs */}
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

                {/* Content Area */}
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Company ID</div>
                                    <div className="text-sm text-white/70 font-mono break-all">{companyId}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Status</div>
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <CheckCircle size={16} />
                                        Active
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Quick Actions</div>
                                <div className="flex gap-3">
                                    <button className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm hover:bg-emerald-500/30 transition-colors">
                                        View Universe
                                    </button>
                                    <button className="px-4 py-2 rounded-lg bg-white/5 text-white/60 border border-white/10 text-sm hover:bg-white/10 transition-colors">
                                        Edit Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'marketing' && (
                        <div className="space-y-6">
                            <h3 className="text-lg text-white font-light">Marketing Analytics</h3>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'Page Views', value: '12,847', change: '+12%' },
                                    { label: 'Conversions', value: '234', change: '+8%' },
                                    { label: 'Bounce Rate', value: '32%', change: '-5%' },
                                ].map((stat, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <div className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</div>
                                        <div className="text-2xl font-light text-white mt-1">{stat.value}</div>
                                        <div className={`text-xs mt-1 ${stat.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {stat.change} vs last month
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-8 rounded-xl bg-white/5 border border-white/5 text-center text-white/30">
                                <BarChart3 size={48} className="mx-auto mb-3 opacity-50" />
                                <p>Marketing charts coming soon</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="space-y-6">
                            <h3 className="text-lg text-white font-light">Billing & Subscription</h3>
                            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-white/40 uppercase tracking-wider">Current Plan</div>
                                        <div className="text-xl font-light text-white mt-1">Professional</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-light text-emerald-400">€99/mo</div>
                                        <div className="text-xs text-white/40">Next billing: Jan 15, 2025</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-sm text-white/60">Recent Invoices</h4>
                                {[
                                    { date: 'Dec 15, 2024', amount: '€99.00', status: 'Paid' },
                                    { date: 'Nov 15, 2024', amount: '€99.00', status: 'Paid' },
                                    { date: 'Oct 15, 2024', amount: '€99.00', status: 'Paid' },
                                ].map((invoice, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                        <span className="text-sm text-white/70">{invoice.date}</span>
                                        <span className="text-sm text-white">{invoice.amount}</span>
                                        <span className="text-xs text-emerald-400">{invoice.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'usage' && (
                        <div className="space-y-6">
                            <h3 className="text-lg text-white font-light">Usage Metrics</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Active Users', value: '24', limit: '50' },
                                    { label: 'Storage Used', value: '2.4 GB', limit: '10 GB' },
                                    { label: 'API Calls', value: '12,450', limit: '50,000' },
                                    { label: 'Departments', value: '5', limit: 'Unlimited' },
                                ].map((usage, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <div className="text-xs text-white/40 uppercase tracking-wider">{usage.label}</div>
                                        <div className="text-xl font-light text-white mt-1">{usage.value}</div>
                                        <div className="text-xs text-white/30 mt-1">Limit: {usage.limit}</div>
                                        {usage.limit !== 'Unlimited' && (
                                            <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: '48%' }} />
                                            </div>
                                        )}
                                    </div>
                                ))}
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
                                        disabled={isDeleting || confirmDelete !== company?.name}
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
