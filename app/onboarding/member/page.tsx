"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { corePost, fetchDemoInstance, forceResetDemo } from "@/lib/api/coreClient";
import { motion } from "framer-motion";
import { ArrowRight, Users } from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";
import { useMoraStore } from "@/lib/store/moraState";

type Department = { id: string; name: string };
type Member = { name: string; role: string; department_id: string | null };

export default function MemberOnboardingPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const { role, isLoading: isUserLoading } = useUser();
  const loadTree = useMoraStore((state) => state.loadTree);

  useEffect(() => {
    if (isUserLoading) return;
    if (role !== "member") {
      router.replace("/login");
      return;
    }
    const loadDeps = async () => {
      setError(null);
      try {
        let snapshot = await fetchDemoInstance();
        if (!snapshot?.departments || snapshot.departments.length === 0) {
          await forceResetDemo();
          snapshot = await fetchDemoInstance();
        }
        setDepartments((snapshot?.departments as Department[]) || []);
        setMembers((snapshot?.members as Member[]) || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load departments");
      } finally {
        setIsInitializing(false);
      }
    };
    loadDeps();
  }, [router, role, isUserLoading]);

  const handleJoin = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      await corePost("/v1/demo/join-department", { department_id: selected });
      await corePost("/v1/private/init", {});
      await loadTree();
      router.replace("/home");
    } catch (e: any) {
      setError(e?.message || "Failed to join department");
      setLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#030806] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030806] text-emerald-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-emerald-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[800px] h-[800px] bg-teal-900/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-light tracking-tight mb-2">Welcome to SAIMÔR</h1>
            <p className="text-emerald-400/60 text-sm">Select your department to synchronize your workspace.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest text-emerald-500/50 uppercase ml-1">Department</label>
              <div className="relative">
                <select
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-sm appearance-none focus:outline-none focus:border-emerald-500/50 transition-colors text-emerald-100"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="" className="bg-gray-900 text-gray-500">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id} className="bg-gray-900">{d.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-emerald-500/50" />
                </div>
              </div>
            </div>

            {/* Team preview */}
            {selected && (
              <div className="p-4 rounded-xl bg-black/30 border border-white/10 text-sm text-emerald-100 space-y-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-500/50">Team</div>
                {members.filter(m => !m.department_id || m.department_id === selected).length === 0 && (
                  <div className="text-emerald-400/60 text-xs">No team members listed.</div>
                )}
                {members.filter(m => !m.department_id || m.department_id === selected).map((m, idx) => (
                  <div key={`${m.name}-${idx}`} className="flex items-center justify-between text-xs">
                    <span>{m.name}</span>
                    <span className="text-emerald-500/70 uppercase tracking-[0.15em]">{m.role}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              className="w-full group relative overflow-hidden rounded-xl bg-emerald-600/20 border border-emerald-500/30 p-4 transition-all hover:bg-emerald-600/30 hover:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleJoin}
              disabled={loading || !selected}
            >
              <div className="relative z-10 flex items-center justify-center gap-2 font-medium tracking-wide">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-emerald-200/30 border-t-emerald-200 rounded-full animate-spin" />
                    <span>SYNCHRONIZING...</span>
                  </>
                ) : (
                  <>
                    <span>ENTER WORKSPACE</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-emerald-500/20 font-mono tracking-[0.2em] uppercase">
            MÔRA INTELLIGENCE SYSTEM v2.5
          </p>
        </div>
      </motion.div>
    </div>
  );
}
