"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, CheckCircle, ArrowRight, Terminal } from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";
import { useDemoFlow } from "@/lib/hooks/useDemoFlow";
import { fetchDemoInstance } from "@/lib/api/coreClient";
import { useMoraStore } from "@/lib/store/moraState";

type Seed = { id: string; name?: string; label?: string };

export default function AdminOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { role, isLoading: isUserLoading, tenantId } = useUser();
  const { runDemoFlow } = useDemoFlow();
  const loadTree = useMoraStore((state) => state.loadTree);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (isUserLoading) return;
    if (!["admin", "owner", "manager", "demo"].includes(role)) {
      router.replace("/login");
      return;
    }
    if (hasRunRef.current) return;

    hasRunRef.current = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        setStep(1);
        const instance = await runDemoFlow(tenantId || undefined);
        setStep(3);
        const snapshot = instance || await fetchDemoInstance();
        setSeeds((snapshot?.departments as Seed[]) || []);
        await loadTree(snapshot?.tenant_id || tenantId || undefined);
        setStep(4);
        router.replace("/home");
      } catch (e: any) {
        setError(e?.message || "Failed to initialize demo");
        hasRunRef.current = false;
      } finally {
        setLoading(false);
      }
    })();
  }, [isUserLoading, role, router, tenantId, runDemoFlow, loadTree]);

  return (
    <div className="min-h-screen bg-[#030806] text-emerald-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-20%] w-[800px] h-[800px] bg-emerald-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[800px] h-[800px] bg-teal-900/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl relative z-10"
      >
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-light tracking-tight">System Initialization</h1>
              <p className="text-emerald-400/60 text-xs font-mono uppercase tracking-wider">
                Admin Protocol v2.5
              </p>
            </div>
          </div>

          {error && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm flex flex-col gap-2"
              >
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span>{error}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Steps */}
          <div className="space-y-6">
            {/* STEP 1: RESET + SEED */}
            <div className={`transition-opacity duration-500 ${step >= 1 ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step > 1 ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white'}`}>
                    {step > 1 ? <CheckCircle className="w-4 h-4" /> : '1'}
                  </div>
                  <span className="text-sm font-medium">Force Reset & Seed</span>
                </div>
                <div className="text-xs text-emerald-400/70 uppercase tracking-[0.2em]">
                  {loading ? 'RUNNING' : 'READY'}
                </div>
              </div>
              {step === 1 && (
                <div className="ml-11 p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-emerald-500/50">
                  <p>{'>'} Resetting demo tenant...</p>
                  <p>{'>'} Seeding Simple Coffee...</p>
                </div>
              )}
            </div>

            {/* STEP 2: DATA */}
            <div className={`transition-opacity duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step > 2 ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white'}`}>
                    {step > 2 ? <CheckCircle className="w-4 h-4" /> : '2'}
                  </div>
                  <span className="text-sm font-medium">Connect Data Source</span>
                </div>
                <div className="text-xs text-emerald-400/70 uppercase tracking-[0.2em]">
                  {loading ? 'ACTIVE' : 'IDLE'}
                </div>
              </div>
            </div>

            {/* STEP 3: VERIFY */}
            <div className={`transition-opacity duration-500 ${step >= 3 ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step > 3 ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white'}`}>
                    {step > 3 ? <CheckCircle className="w-4 h-4" /> : '3'}
                  </div>
                  <span className="text-sm font-medium">Verify Seeds</span>
                </div>
              </div>
              {step >= 3 && seeds.length > 0 && (
                <div className="ml-11 p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-emerald-500/70">
                  {seeds.map((s, idx) => (
                    <div key={`${s.id}-${idx}`} className="flex items-center gap-2">
                      <Terminal className="w-3 h-3" />
                      <span>{s.name || s.label || s.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* STEP 4: COMPLETE */}
            {step >= 4 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-6 border-t border-white/5"
              >
                <div className="w-full group relative overflow-hidden rounded-xl bg-emerald-600/20 border border-emerald-500/30 p-4">
                  <div className="relative z-10 flex items-center justify-center gap-2 font-medium tracking-wide text-emerald-100">
                    <span>Launching Workspace</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
