"use client";

import React, { useState } from 'react';
import { X, Building2, Tags, Sparkles, Link as LinkIcon } from 'lucide-react';
import { createSmartDepartment, type RelatedDepartment } from '@/lib/api/smartDepartments';
import { motion, AnimatePresence } from 'framer-motion';

interface SmartDepartmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const SmartDepartmentDialog: React.FC<SmartDepartmentDialogProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [relatedDepartments, setRelatedDepartments] = useState<RelatedDepartment[]>([]);
    const [showResults, setShowResults] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            const result = await createSmartDepartment({
                name: name.trim(),
                description: description.trim() || undefined,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            });

            setRelatedDepartments(result.related_departments);
            setShowResults(true);

            // Auto-close after showing results
            setTimeout(() => {
                onSuccess();
                handleReset();
            }, 3000);
        } catch (e: any) {
            console.error('Failed to create department:', e);
            alert(e?.message || 'Failed to create department');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setName('');
        setDescription('');
        setTags('');
        setRelatedDepartments([]);
        setShowResults(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-[#0a1712] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-emerald-100">Smart Department</h2>
                            <p className="text-xs text-emerald-500/50">Semantic auto-connection</p>
                        </div>
                    </div>
                    <button
                        onClick={handleReset}
                        className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors"
                    >
                        <X size={16} className="text-emerald-500/50" />
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {!showResults ? (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-6 space-y-4"
                        >
                            {/* Name */}
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-emerald-500/50 mb-2">
                                    Department Name *
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/30" />
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Product Design"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm text-emerald-100 placeholder-emerald-500/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-emerald-500/50 mb-2">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What does this department do?"
                                    rows={2}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-emerald-100 placeholder-emerald-500/30 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                                />
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-emerald-500/50 mb-2">
                                    Semantic Tags (comma-separated)
                                </label>
                                <div className="relative">
                                    <Tags className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/30" />
                                    <input
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                        placeholder="design, product, UX, creative"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm text-emerald-100 placeholder-emerald-500/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                    />
                                </div>
                                <p className="mt-1 text-[10px] text-emerald-500/40">
                                    Tags help Môra find semantically related departments automatically.
                                </p>
                            </div>

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={!name.trim() || isLoading}
                                className="w-full py-3 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-100 font-medium tracking-wide hover:bg-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? 'Creating...' : 'Create Department'}
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-6 space-y-4"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <Building2 className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h3 className="text-lg text-emerald-100 font-medium mb-1">{name} Created!</h3>
                                <p className="text-xs text-emerald-500/50">Semantically connected to {relatedDepartments.length} departments</p>
                            </div>

                            {/* Related Departments */}
                            {relatedDepartments.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-emerald-500/50 uppercase tracking-wider">
                                        <LinkIcon size={12} />
                                        <span>Auto-Connected</span>
                                    </div>
                                    {relatedDepartments.map((dept) => (
                                        <div
                                            key={dept.id}
                                            className="p-3 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between"
                                        >
                                            <div>
                                                <div className="text-sm text-emerald-100">{dept.name}</div>
                                                <div className="text-[10px] text-emerald-500/50">
                                                    Match: {dept.matched_tags.join(', ')}
                                                </div>
                                            </div>
                                            <div className="text-xs text-emerald-400 font-mono">
                                                score: {dept.match_score}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
