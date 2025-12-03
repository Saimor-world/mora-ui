"use client";

import React, { useEffect, useState } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { AlertTriangle } from 'lucide-react';
import { CreateModal } from '@/components/ui/CreateModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { SpaceTileGrid } from '@/components/spaces/SpaceTileGrid';
import { IntelligenceContextBar } from '@/components/layers/IntelligenceContextBar';

export const DepartmentLayer: React.FC = () => {
    const {
        activeDepartmentId,
        departments,
        spacesByDepartment,
        isLoadingSpaces,
        coreError,
        loadSpacesForDepartment,
        navigateToCore,
        navigateToSpace,
        addSpace
    } = useMoraStore();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const spaces = activeDepartmentId ? (spacesByDepartment[activeDepartmentId] || []) : [];
    const currentDepartment = departments.find(d => d.id === activeDepartmentId);

    useEffect(() => {
        if (activeDepartmentId && !spacesByDepartment[activeDepartmentId]) {
            loadSpacesForDepartment(activeDepartmentId);
        }
    }, [activeDepartmentId, spacesByDepartment, loadSpacesForDepartment]);

    const handleCreateSpace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeDepartmentId || !formData.name.trim()) return;

        setIsSubmitting(true);
        try {
            await addSpace({
                department_id: activeDepartmentId,
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
            });
            setFormData({ name: '', description: '' });
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('Failed to create space:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!activeDepartmentId) return null;

    // Breadcrumb for context bar
    const breadcrumb = [
        { label: 'Home', onClick: navigateToCore },
        { label: currentDepartment?.name || 'Department' }
    ];

    return (
        <div className="relative w-full h-full flex items-center justify-center p-8">

            {/* Context Bar (Top Layer) */}
            <IntelligenceContextBar
                breadcrumb={breadcrumb}
                activeCount={spaces.length}
                riskLevel="none"
            />

            {/* Glass Panel Container */}
            <GlassPanel
                title={currentDepartment?.name || 'Department'}
                showBackButton
                onBack={navigateToCore}
                width="full"
                height="full"
                blurIntensity={20}
                opacity={0.85}
            >
                <div className="w-full h-full overflow-y-auto custom-scrollbar p-4">

                    {/* Loading State */}
                    {isLoadingSpaces && (
                        <div className="h-full flex items-center justify-center">
                            <LoadingState message="Scanning sector..." />
                        </div>
                    )}

                    {/* Error State */}
                    {!isLoadingSpaces && coreError && (
                        <div className="h-full flex flex-col items-center justify-center text-red-400/80 gap-2">
                            <AlertTriangle size={24} />
                            <p>{coreError}</p>
                        </div>
                    )}

                    {/* Space Tiles Grid */}
                    {!isLoadingSpaces && !coreError && (
                        <SpaceTileGrid
                            spaces={spaces}
                            onSpaceClick={navigateToSpace}
                            onCreateSpace={() => setIsCreateModalOpen(true)}
                        />
                    )}
                </div>
            </GlassPanel>

            {/* Create Space Modal */}
            <CreateModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setFormData({ name: '', description: '' });
                }}
                title="Create New Space"
            >
                <form onSubmit={handleCreateSpace} className="space-y-6">
                    <div>
                        <label className="block text-sm text-emerald-400/70 mb-2 tracking-wider">
                            NAME *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-emerald-100 placeholder-emerald-500/30 focus:border-mora-gold/50 focus:outline-none transition-colors"
                            placeholder="Enter space name"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-emerald-400/70 mb-2 tracking-wider">
                            DESCRIPTION
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-emerald-100 placeholder-emerald-500/30 focus:border-mora-gold/50 focus:outline-none transition-colors resize-none"
                            placeholder="Optional description"
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setIsCreateModalOpen(false);
                                setFormData({ name: '', description: '' });
                            }}
                            className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-emerald-400 hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.name.trim()}
                            className="flex-1 px-4 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-600/30 hover:border-mora-gold/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Space'}
                        </button>
                    </div>
                </form>
            </CreateModal>
        </div>
    );
};
