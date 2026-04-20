"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Sparkles, Building2, Code, Palette, Users,
    Briefcase, Megaphone, DollarSign, HeartPulse,
    Zap, Rocket, Shield, BookOpen, Cog, Globe,
    ChevronRight, Check
} from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { useCreateDepartment } from '@/lib/queries/useDepartments';
import { toast } from 'sonner';

interface DepartmentWizardProps {
    isOpen: boolean;
    onClose: () => void;
    companyId: string;
}

// Predefined department templates
const DEPARTMENT_PRESETS = [
    {
        name: 'Engineering',
        icon: Code,
        color: '#3B82F6',
        description: 'Software development and technical teams'
    },
    {
        name: 'Design',
        icon: Palette,
        color: '#8B5CF6',
        description: 'UI/UX, brand, and creative design'
    },
    {
        name: 'Marketing',
        icon: Megaphone,
        color: '#EC4899',
        description: 'Marketing campaigns and content'
    },
    {
        name: 'Sales',
        icon: Briefcase,
        color: '#10B981',
        description: 'Sales pipeline and customer acquisition'
    },
    {
        name: 'Finance',
        icon: DollarSign,
        color: '#F59E0B',
        description: 'Accounting, budgets, and financial planning'
    },
    {
        name: 'Human Resources',
        icon: Users,
        color: '#06B6D4',
        description: 'People operations and culture'
    },
    {
        name: 'Operations',
        icon: Cog,
        color: '#6366F1',
        description: 'Business processes and logistics'
    },
    {
        name: 'Customer Success',
        icon: HeartPulse,
        color: '#14B8A6',
        description: 'Customer support and satisfaction'
    },
    {
        name: 'Product',
        icon: Rocket,
        color: '#F97316',
        description: 'Product management and roadmap'
    },
    {
        name: 'Legal',
        icon: Shield,
        color: '#64748B',
        description: 'Compliance and legal affairs'
    },
    {
        name: 'Research',
        icon: BookOpen,
        color: '#A855F7',
        description: 'R&D and innovation'
    },
    {
        name: 'International',
        icon: Globe,
        color: '#0EA5E9',
        description: 'Global operations and expansion'
    },
];

// Color palette for custom selection
const COLOR_PALETTE = [
    '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B',
    '#06B6D4', '#6366F1', '#14B8A6', '#F97316', '#EF4444',
    '#84CC16', '#A855F7', '#0EA5E9', '#64748B', '#D946EF'
];

// Icons for custom selection
const ICON_OPTIONS = [
    { id: 'code', Icon: Code },
    { id: 'palette', Icon: Palette },
    { id: 'megaphone', Icon: Megaphone },
    { id: 'briefcase', Icon: Briefcase },
    { id: 'dollar', Icon: DollarSign },
    { id: 'users', Icon: Users },
    { id: 'cog', Icon: Cog },
    { id: 'heart', Icon: HeartPulse },
    { id: 'rocket', Icon: Rocket },
    { id: 'shield', Icon: Shield },
    { id: 'book', Icon: BookOpen },
    { id: 'globe', Icon: Globe },
    { id: 'zap', Icon: Zap },
    { id: 'sparkles', Icon: Sparkles },
    { id: 'building', Icon: Building2 },
];

export const DepartmentWizard: React.FC<DepartmentWizardProps> = ({ isOpen, onClose, companyId }) => {
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const createDepartmentMutation = useCreateDepartment(activeCompanyId);

    const [step, setStep] = useState<'preset' | 'custom'>('preset');
    const [selectedPreset, setSelectedPreset] = useState<typeof DEPARTMENT_PRESETS[0] | null>(null);

    // Custom form state
    const [customName, setCustomName] = useState('');
    const [customColor, setCustomColor] = useState('#3B82F6');
    const [customIcon, setCustomIcon] = useState('building');
    const [isCreating, setIsCreating] = useState(false);

    const handlePresetSelect = async (preset: typeof DEPARTMENT_PRESETS[0]) => {
        setSelectedPreset(preset);
        setIsCreating(true);

        try {
            await createDepartmentMutation.mutateAsync({
                name: preset.name,
                color: preset.color,
                company_id: companyId,
                description: preset.description
            });
            toast.success(`Created ${preset.name} department`);
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create department');
        } finally {
            setIsCreating(false);
            setSelectedPreset(null);
        }
    };

    const handleCustomCreate = async () => {
        if (!customName.trim()) {
            toast.error('Please enter a department name');
            return;
        }

        setIsCreating(true);
        try {
            await createDepartmentMutation.mutateAsync({
                name: customName,
                color: customColor,
                company_id: companyId,
                icon: customIcon
            });
            toast.success(`Created ${customName} department`);
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create department');
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center"
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Wizard Panel */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative bg-gradient-to-b from-[#0a1a14] to-[#050d09] border border-emerald-500/20 rounded-2xl shadow-2xl w-[700px] max-h-[80vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                <Sparkles className="text-emerald-400" size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-light text-white">Create Department</h2>
                                <p className="text-sm text-white/40">Add a new planet to your universe</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex border-b border-white/10">
                        <button
                            onClick={() => setStep('preset')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${step === 'preset'
                                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                                    : 'text-white/40 hover:text-white/60'
                                }`}
                        >
                            Choose Template
                        </button>
                        <button
                            onClick={() => setStep('custom')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${step === 'custom'
                                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                                    : 'text-white/40 hover:text-white/60'
                                }`}
                        >
                            Custom Department
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
                        {step === 'preset' && (
                            <div className="grid grid-cols-3 gap-3">
                                {DEPARTMENT_PRESETS.map((preset, i) => (
                                    <motion.button
                                        key={preset.name}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        onClick={() => handlePresetSelect(preset)}
                                        disabled={isCreating}
                                        className={`p-4 rounded-xl border text-left transition-all group hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${selectedPreset?.name === preset.name
                                                ? 'bg-emerald-500/20 border-emerald-500/50'
                                                : 'bg-white/5 border-white/10 hover:border-white/30'
                                            }`}
                                        style={{
                                            '--preset-color': preset.color
                                        } as React.CSSProperties}
                                    >
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                                            style={{
                                                backgroundColor: `${preset.color}20`,
                                                borderColor: `${preset.color}40`,
                                                borderWidth: 1
                                            }}
                                        >
                                            <preset.icon size={20} style={{ color: preset.color }} />
                                        </div>
                                        <div className="text-sm font-medium text-white mb-1">{preset.name}</div>
                                        <div className="text-xs text-white/40 line-clamp-2">{preset.description}</div>

                                        {selectedPreset?.name === preset.name && isCreating && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                                                <div className="animate-spin w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full" />
                                            </div>
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                        )}

                        {step === 'custom' && (
                            <div className="space-y-6">
                                {/* Name Input */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Department Name</label>
                                    <input
                                        type="text"
                                        value={customName}
                                        onChange={(e) => setCustomName(e.target.value)}
                                        placeholder="e.g. Growth Team, Innovation Lab..."
                                        className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>

                                {/* Color Selection */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Color</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLOR_PALETTE.map((color) => (
                                            <button
                                                key={color}
                                                onClick={() => setCustomColor(color)}
                                                className={`w-8 h-8 rounded-lg transition-all ${customColor === color
                                                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a1a14] scale-110'
                                                        : 'hover:scale-110'
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Icon Selection */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Icon</label>
                                    <div className="flex flex-wrap gap-2">
                                        {ICON_OPTIONS.map(({ id, Icon }) => (
                                            <button
                                                key={id}
                                                onClick={() => setCustomIcon(id)}
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${customIcon === id
                                                        ? 'bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400'
                                                        : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/30'
                                                    }`}
                                            >
                                                <Icon size={18} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                                    <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Preview</div>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                                            style={{
                                                backgroundColor: `${customColor}20`,
                                                borderColor: `${customColor}40`,
                                                borderWidth: 1
                                            }}
                                        >
                                            {ICON_OPTIONS.find(i => i.id === customIcon)?.Icon && (
                                                React.createElement(
                                                    ICON_OPTIONS.find(i => i.id === customIcon)!.Icon,
                                                    { size: 24, style: { color: customColor } }
                                                )
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-white font-medium">{customName || 'Department Name'}</div>
                                            <div className="text-xs text-white/40">New planet in your universe</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Create Button */}
                                <button
                                    onClick={handleCustomCreate}
                                    disabled={isCreating || !customName.trim()}
                                    className="w-full py-3 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {isCreating ? (
                                        <>
                                            <div className="animate-spin w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={18} />
                                            Create Department
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
