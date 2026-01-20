'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Users, FolderOpen, Sparkles,
    ArrowRight, ArrowLeft, Check, Loader2,
    Plus, X, Zap
} from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { corePost } from '@/lib/api/coreClient';
import { toast } from 'sonner';

/**
 * ONBOARDING WIZARD
 * 
 * Multi-step setup flow for new users after registration.
 * Creates the initial "brain" for Môra based on user input.
 * 
 * Steps:
 * 1. Welcome - Introduction
 * 2. Company - Basic company info
 * 3. Departments - Create first departments
 * 4. Complete - Môra initialization
 */

interface OnboardingWizardProps {
    companyName: string;
    userEmail: string;
    onComplete: () => void;
}

interface DepartmentInput {
    id: string;
    name: string;
    color: string;
    description: string;
}

const STEP_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];
const DEPARTMENT_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
    companyName: initialCompanyName,
    userEmail,
    onComplete
}) => {
    const [step, setStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Step 2: Company Info
    const [companyName, setCompanyName] = useState(initialCompanyName || '');
    const [companyDescription, setCompanyDescription] = useState('');
    const [industry, setIndustry] = useState('');

    // Step 3: Departments
    const [departments, setDepartments] = useState<DepartmentInput[]>([
        { id: '1', name: '', color: DEPARTMENT_COLORS[0], description: '' }
    ]);

    const { loadCompanies, setActiveCompany, loadDepartments, activeCompanyId } = useMoraStore();

    const steps = [
        { title: 'Willkommen', icon: Sparkles },
        { title: 'Unternehmen', icon: Building2 },
        { title: 'Abteilungen', icon: Users },
        { title: 'Fertig', icon: Zap }
    ];

    const addDepartment = () => {
        if (departments.length >= 6) return;
        const colorIndex = departments.length % DEPARTMENT_COLORS.length;
        setDepartments([
            ...departments,
            {
                id: String(Date.now()),
                name: '',
                color: DEPARTMENT_COLORS[colorIndex],
                description: ''
            }
        ]);
    };

    const removeDepartment = (id: string) => {
        if (departments.length <= 1) return;
        setDepartments(departments.filter(d => d.id !== id));
    };

    const updateDepartment = (id: string, field: keyof DepartmentInput, value: string) => {
        setDepartments(departments.map(d =>
            d.id === id ? { ...d, [field]: value } : d
        ));
    };

    const canProceed = () => {
        switch (step) {
            case 0: return true; // Welcome
            case 1: return companyName.trim().length >= 2; // Company
            case 2: return true; // Departments (Optional)
            case 3: return true; // Complete
            default: return false;
        }
    };

    const handleComplete = async () => {
        setIsLoading(true);
        const toastId = toast.loading('Môra wird initialisiert...');

        try {
            // 1. Get/Create Company
            // Company was already created during registration. We need to find its ID.
            await loadCompanies();
            const companies = useMoraStore.getState().companies;

            // Find the user's company
            let myCompany = companies.find(c => c.name === companyName && !c.is_demo);
            // Fallback: Match by initial name
            if (!myCompany && initialCompanyName) {
                myCompany = companies.find(c => c.name === initialCompanyName && !c.is_demo);
            }
            // Fallback: Most recent non-demo
            if (!myCompany) {
                const nonDemo = companies.filter(c => !c.is_demo);
                if (nonDemo.length > 0) {
                    myCompany = nonDemo[nonDemo.length - 1];
                }
            }

            if (myCompany) {
                setActiveCompany(myCompany.id);
                console.log('[Onboarding] Active company set:', myCompany.name);
            } else {
                console.warn('[Onboarding] Could not find created company - departments will be orphan');
            }

            // 2. Create Departments
            const validDepartments = departments.filter(d => d.name.trim());
            for (const dept of validDepartments) {
                try {
                    await corePost('/v1/departments', {
                        name: dept.name.trim(),
                        slug: dept.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        color: dept.color,
                        description: dept.description || `${dept.name} department`,
                        company_id: myCompany?.id // BIND TO COMPANY
                    });
                    console.log(`[Onboarding] Created department: ${dept.name}`);
                } catch (err) {
                    console.warn(`Could not create department ${dept.name}:`, err);
                    // Continue with other departments
                }
            }

            // 3. Finalize
            if (myCompany) {
                // Ensure active company is set (redundant but safe)
                setActiveCompany(myCompany.id);
                await loadDepartments(myCompany.id);
                console.log('[Onboarding] Active company set:', myCompany.name);
            } else {
                console.warn('[Onboarding] Could not find created company - proceeding anyway');
            }

            // 4. Mark onboarding as complete
            localStorage.setItem('onboarding_complete', 'true');
            localStorage.setItem('last_workspace', myCompany?.name || companyName);

            // Explicitly reload departments one last time to ensure UI is in sync
            if (myCompany?.id) {
                await loadDepartments(myCompany.id);
            }

            toast.success('Môra ist bereit! Willkommen in Ihrem Arbeitsbereich.', { id: toastId });

        } catch (error: any) {
            console.error('Onboarding Fehler:', error);
            toast.error('Setup hatte Probleme, aber wir fahren fort. Bitte laden Sie die Seite ggf. neu.', { id: toastId });
            // Mark as complete anyway so user isn't stuck
            localStorage.setItem('onboarding_complete', 'true');
        } finally {
            setIsLoading(false);
            // ALWAYS call onComplete to prevent black screen
            onComplete();
        }
    };

    const nextStep = () => {
        if (step === steps.length - 1) {
            handleComplete();
        } else {
            setStep(s => Math.min(s + 1, steps.length - 1));
        }
    };

    const prevStep = () => {
        setStep(s => Math.max(s - 1, 0));
    };

    return (
        <motion.div
            className="fixed inset-0 bg-[#030806] z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)',
                    backgroundSize: '100% 100%'
                }} />
            </div>

            {/* Main Container */}
            <motion.div
                className="relative w-full max-w-2xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                {/* Progress Bar */}
                <div className="h-1 bg-black/50">
                    <motion.div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                {/* Step Indicators */}
                <div className="flex justify-center gap-8 py-6 border-b border-white/5">
                    {steps.map((s, i) => {
                        const Icon = s.icon;
                        const isActive = i === step;
                        const isComplete = i < step;

                        return (
                            <div
                                key={i}
                                className={`flex flex-col items-center gap-2 transition-all ${isActive ? 'opacity-100' : isComplete ? 'opacity-60' : 'opacity-30'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isActive
                                    ? 'border-emerald-400 bg-emerald-400/20 text-emerald-400'
                                    : isComplete
                                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500'
                                        : 'border-white/20 text-white/40'
                                    }`}>
                                    {isComplete ? <Check size={18} /> : <Icon size={18} />}
                                </div>
                                <span className={`text-xs tracking-wide ${isActive ? 'text-emerald-400' : 'text-white/50'}`}>
                                    {isActive ? s.title : ''}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="p-8 min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {/* Step 0: Welcome */}
                        {step === 0 && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="text-center"
                            >
                                <motion.div
                                    className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 flex items-center justify-center border border-emerald-400/30"
                                    animate={{
                                        boxShadow: ['0 0 20px rgba(16, 185, 129, 0.2)', '0 0 40px rgba(16, 185, 129, 0.4)', '0 0 20px rgba(16, 185, 129, 0.2)']
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <Sparkles className="w-10 h-10 text-emerald-400" />
                                </motion.div>

                                <h2 className="text-3xl font-light tracking-wide text-white mb-4">
                                    Willkommen bei <span className="text-emerald-400">SAIMÔR</span>
                                </h2>

                                <p className="text-white/60 max-w-md mx-auto leading-relaxed mb-8">
                                    Richten wir Ihren Arbeitsbereich ein. Dies erstellt Môras erstes Verständnis Ihrer Organisation.
                                </p>

                                <div className="flex items-center justify-center gap-4 text-sm text-white/40">
                                    <span className="flex items-center gap-2">
                                        <Check size={14} className="text-emerald-500" />
                                        Unternehmen definieren
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Check size={14} className="text-emerald-500" />
                                        Abteilungen erstellen
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Check size={14} className="text-emerald-500" />
                                        Arbeit beginnen
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 1: Company */}
                        {step === 1 && (
                            <motion.div
                                key="company"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h2 className="text-2xl font-light text-white mb-2">Ihr Unternehmen</h2>
                                <p className="text-white/50 mb-8">Erzählen Sie Môra von Ihrer Organisation.</p>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs text-emerald-400/70 mb-2 uppercase tracking-wider">
                                            Unternehmensname *
                                        </label>
                                        <input
                                            type="text"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            placeholder="Geben Sie Ihren Unternehmensnamen ein"
                                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">
                                            Beschreibung (Optional)
                                        </label>
                                        <textarea
                                            value={companyDescription}
                                            onChange={(e) => setCompanyDescription(e.target.value)}
                                            placeholder="Was macht Ihr Unternehmen?"
                                            rows={3}
                                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">
                                            Branche (Optional)
                                        </label>
                                        <select
                                            value={industry}
                                            onChange={(e) => setIndustry(e.target.value)}
                                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                                        >
                                            <option value="">Branche wählen...</option>
                                            <option value="technology">Technologie</option>
                                            <option value="consulting">Beratung</option>
                                            <option value="retail">Einzelhandel</option>
                                            <option value="hospitality">Gastronomie/Hotellerie</option>
                                            <option value="healthcare">Gesundheitswesen</option>
                                            <option value="finance">Finanzen</option>
                                            <option value="education">Bildung</option>
                                            <option value="other">Andere</option>
                                        </select>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Departments */}
                        {step === 2 && (
                            <motion.div
                                key="departments"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h2 className="text-2xl font-light text-white mb-2">Abteilungen</h2>
                                <p className="text-white/50 mb-6">Erstellen Sie Ihre ersten Abteilungen. Diese erscheinen als Planeten in Ihrem Arbeitsbereich.</p>

                                <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2">
                                    {departments.map((dept, index) => (
                                        <motion.div
                                            key={dept.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-start gap-3 p-4 bg-black/20 rounded-xl border border-white/5"
                                        >
                                            {/* Color Picker */}
                                            <div className="flex flex-col gap-1">
                                                {DEPARTMENT_COLORS.map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => updateDepartment(dept.id, 'color', color)}
                                                        className={`w-4 h-4 rounded-full transition-transform ${dept.color === color ? 'scale-125 ring-2 ring-white/50' : 'opacity-50 hover:opacity-100'
                                                            }`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>

                                            {/* Input */}
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={dept.name}
                                                    onChange={(e) => updateDepartment(dept.id, 'name', e.target.value)}
                                                    placeholder={`Name der Abteilung ${index + 1}...`}
                                                    className="w-full bg-transparent border-b border-white/10 pb-2 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                                                />
                                                <input
                                                    type="text"
                                                    value={dept.description}
                                                    onChange={(e) => updateDepartment(dept.id, 'description', e.target.value)}
                                                    placeholder="Kurzbeschreibung (optional)"
                                                    className="w-full bg-transparent text-sm text-white/50 placeholder-white/20 focus:outline-none mt-2"
                                                />
                                            </div>

                                            {/* Remove */}
                                            {departments.length > 1 && (
                                                <button
                                                    onClick={() => removeDepartment(dept.id)}
                                                    className="p-1 text-white/30 hover:text-red-400 transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>

                                {departments.length < 6 && (
                                    <button
                                        onClick={addDepartment}
                                        className="mt-4 flex items-center gap-2 text-sm text-emerald-400/70 hover:text-emerald-400 transition-colors"
                                    >
                                        <Plus size={16} />
                                        Abteilung hinzufügen
                                    </button>
                                )}
                            </motion.div>
                        )}

                        {/* Step 3: Complete */}
                        {step === 3 && (
                            <motion.div
                                key="complete"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="text-center"
                            >
                                <motion.div
                                    className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500/30 to-blue-500/20 flex items-center justify-center border border-emerald-400/30"
                                    animate={{
                                        rotate: [0, 360],
                                        scale: [1, 1.05, 1]
                                    }}
                                    transition={{
                                        rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
                                        scale: { duration: 2, repeat: Infinity }
                                    }}
                                >
                                    <Zap className="w-12 h-12 text-emerald-400" />
                                </motion.div>

                                <h2 className="text-3xl font-light tracking-wide text-white mb-4">
                                    Startklar
                                </h2>

                                <p className="text-white/60 max-w-md mx-auto leading-relaxed mb-8">
                                    Môra erstellt nun Ihren Arbeitsbereich mit:
                                </p>

                                <div className="flex flex-col gap-3 max-w-sm mx-auto text-left">
                                    <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-white/5">
                                        <Building2 className="w-5 h-5 text-emerald-400" />
                                        <span className="text-white">{companyName || 'Your Company'}</span>
                                    </div>

                                    {departments.filter(d => d.name.trim()).map(dept => (
                                        <div
                                            key={dept.id}
                                            className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-white/5"
                                        >
                                            <div
                                                className="w-5 h-5 rounded-full"
                                                style={{ backgroundColor: dept.color }}
                                            />
                                            <span className="text-white/80">{dept.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-8 py-6 border-t border-white/5">
                    <button
                        onClick={prevStep}
                        disabled={step === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${step === 0
                            ? 'opacity-0 pointer-events-none'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <ArrowLeft size={18} />
                        Zurück
                    </button>

                    <button
                        onClick={nextStep}
                        disabled={!canProceed() || isLoading}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${canProceed() && !isLoading
                            ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                            : 'bg-white/10 text-white/30 cursor-not-allowed'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Initialisierung...
                            </>
                        ) : step === steps.length - 1 ? (
                            <>
                                Môra starten
                                <Sparkles size={18} />
                            </>
                        ) : (
                            <>
                                Weiter
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default OnboardingWizard;
