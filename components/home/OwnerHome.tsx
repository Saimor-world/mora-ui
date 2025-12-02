"use client";

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Settings } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { CompanyOrb } from '@/components/company/CompanyOrb';
import { MoraOrb } from '@/components/mora/MoraOrb';
import { toast } from 'sonner';

export const OwnerHome: React.FC = () => {
    const {
        companies,
        loadCompanies,
        isLoadingCompanies,
        setActiveCompany,
        loadDepartments,
        setViewLevel
    } = useMoraStore();

    useEffect(() => {
        loadCompanies();
    }, []);

    const handleEnterCompany = async (companyId: string) => {
        setActiveCompany(companyId);
        await loadDepartments(companyId);
        setViewLevel('core'); // Go to core view (departments)
        toast.success("Entered workspace");
    };

    const handleCreateCompany = () => {
        toast.info("Create Company wizard coming soon");
    };

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#10b98105_0%,transparent_70%)] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-16">
                {/* Central Core */}
                <div className="flex flex-col items-center gap-6">
                    <motion.div
                        className="scale-125"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
                    >
                        <MoraOrb state="idle" />
                    </motion.div>

                    <div className="text-center">
                        <h1 className="text-3xl font-light tracking-[0.2em] text-emerald-50">YOUR WORKSPACES</h1>
                        <p className="text-sm text-emerald-500/50 tracking-widest uppercase mt-2">
                            Select a company to manage
                        </p>
                    </div>
                </div>

                {/* Company Orbs Grid */}
                {isLoadingCompanies ? (
                    <div className="text-emerald-500/50 animate-pulse">Loading workspaces...</div>
                ) : (
                    <div className="flex flex-wrap justify-center gap-8 max-w-4xl px-8">
                        {companies.map((company, idx) => (
                            <motion.div
                                key={company.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <CompanyOrb
                                    company={company}
                                    onClick={() => handleEnterCompany(company.id)}
                                />
                            </motion.div>
                        ))}

                        {/* Create New Button */}
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: companies.length * 0.1 }}
                            onClick={handleCreateCompany}
                            className="w-32 h-32 rounded-full border border-dashed border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/5 flex flex-col items-center justify-center gap-2 text-emerald-500/50 hover:text-emerald-400 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus size={24} />
                            </div>
                            <span className="text-xs font-medium tracking-wider uppercase">Create New</span>
                        </motion.button>
                    </div>
                )}
            </div>

            {/* Bottom Actions */}
            <div className="absolute bottom-12 flex gap-6">
                <button className="flex items-center gap-2 text-xs text-emerald-500/50 hover:text-emerald-400 transition-colors uppercase tracking-widest">
                    <Settings size={14} />
                    System Settings
                </button>
            </div>
        </div>
    );
};
