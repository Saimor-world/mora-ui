"use client";

import React, { useEffect, useState } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { ArrowLeft, Hexagon, Layers, AlertTriangle, Plus, Network } from 'lucide-react';
import { CreateModal } from '@/components/ui/CreateModal';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Mycelium25D } from '@/components/organic/Mycelium25D';
import { mapSpacesToMycelium } from '@/lib/utils/myceliumDataMapper';

export const DepartmentLayer: React.FC = () => {
    const {
        activeDepartmentId,
        activeSpaceId,
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
    // Default to 2D orbit so Spaces sind sofort sichtbar
    const [view3D, setView3D] = useState(false);

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

    if (!activeDepartmentId) {
        return (
            <div className="flex items-center justify-center h-full text-emerald-500/50">
                No Department Selected
            </div>
        );
    }

    return (
        <div className="relative w-full h-full p-10 flex flex-col">

            {/* Header / Nav */}
            <header className="flex items-center justify-between mb-12 z-20">
                <div className="flex items-center gap-6">
                    <button
                        onClick={navigateToCore}
                        className="p-3 rounded-full glass-panel border border-white/10 hover:bg-white/5 transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 text-emerald-400 group-hover:text-mora-gold transition-colors" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-light text-emerald-50 tracking-widest uppercase">
                            {currentDepartment?.name || 'Department'}
                        </h2>
                        <Breadcrumb items={[
                            { label: 'ROOT', onClick: navigateToCore },
                            { label: currentDepartment?.name || 'Department', isActive: true }
                        ]} />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    {!isLoadingSpaces && spaces.length > 0 && (
                        <button
                            onClick={() => setView3D(!view3D)}
                            className={`p-3 rounded-full glass-panel border transition-all ${
                                view3D
                                    ? 'border-mora-gold/50 bg-mora-gold/10 text-mora-gold'
                                    : 'border-white/10 text-emerald-400 hover:border-emerald-400/50'
                            }`}
                            title={view3D ? '2D Grid View' : '2.5D Mycelium View'}
                        >
                            <Network className="w-5 h-5" />
                        </button>
                    )}

                    {/* Create Space Button */}
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-emerald-500/30 hover:border-mora-gold/50 hover:bg-white/5 transition-all group"
                    >
                        <Plus className="w-4 h-4 text-emerald-400 group-hover:text-mora-gold transition-colors" />
                        <span className="text-sm text-emerald-300 group-hover:text-mora-gold transition-colors tracking-wider">
                            CREATE SPACE
                        </span>
                    </button>
                </div>
            </header>

            {/* Loading State */}
            {isLoadingSpaces && (
                <div className="flex-1 flex items-center justify-center">
                    <LoadingState message="Loading galaxy spaces..." />
                </div>
            )}

            {/* Error State */}
            {!isLoadingSpaces && coreError && (
                <div className="flex-1 flex flex-col items-center justify-center text-red-400/80 gap-2">
                    <AlertTriangle size={24} />
                    <p>{coreError}</p>
                </div>
            )}

            {/* 2.5D Mycelium View */}
            {!isLoadingSpaces && !coreError && view3D && (
                <div className="flex-1 relative z-10">
                    <Mycelium25D
                        nodes={mapSpacesToMycelium(spaces, activeSpaceId)}
                        onNodeClick={(spaceId) => navigateToSpace(spaceId)}
                        activeNodeId={activeSpaceId}
                        variant="space"
                    />

                    {spaces.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <EmptyState
                                icon={Layers}
                                title="Empty Sector"
                                description="No spaces found in this sector. Initialize a new space to begin."
                                actionLabel="Create Space"
                                onAction={() => setIsCreateModalOpen(true)}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Spaces Grid (2D Classic) */}
            {!isLoadingSpaces && !coreError && !view3D && (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full z-20 overflow-y-auto pb-20 custom-scrollbar">
                    {spaces.map((space) => (
                        <button
                            key={space.id}
                            onClick={() => navigateToSpace(space.id)}
                            className="group relative p-8 rounded-3xl glass-panel border border-white/5 hover:border-mora-gold/30 transition-all duration-500 hover:bg-white/[0.02] text-left flex flex-col gap-4 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="w-12 h-12 rounded-2xl bg-emerald-900/30 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <Hexagon className="w-6 h-6 text-emerald-300 group-hover:text-mora-gold transition-colors" />
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-emerald-100 group-hover:text-white transition-colors">
                                    {space.name}
                                </h3>
                                <p className="text-sm text-emerald-400/60 mt-1 group-hover:text-emerald-300/70 transition-colors line-clamp-2">
                                    {space.description || 'No description available.'}
                                </p>
                            </div>

                            <div className="mt-auto flex items-center gap-2 text-xs text-emerald-500/50 uppercase tracking-widest group-hover:text-mora-gold/70 transition-colors">
                                <span>Enter Space</span>
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        </button>
                    ))}

                    {spaces.length === 0 && (
                        <div className="col-span-full">
                            <EmptyState
                                icon={Layers}
                                title="Empty Sector"
                                description="No spaces found in this sector. Initialize a new space to begin."
                                actionLabel="Create Space"
                                onAction={() => setIsCreateModalOpen(true)}
                            />
                        </div>
                    )}
                </div>
            )}

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
