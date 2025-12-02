"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccountStore, type AccountRole } from "@/lib/auth/useAccount";
import { authLogin } from "@/lib/api/coreClient";
import { useDemoFlow } from "@/lib/hooks/useDemoFlow";

const roles: AccountRole[] = ["admin", "owner", "manager", "member", "demo"];

export default function LoginPage() {
    const router = useRouter();
    const { currentAccount, login, logout } = useAccountStore();
    const { runDemoFlow, isRunning } = useDemoFlow();
    const [username, setUsername] = useState("");
    const [role, setRole] = useState<AccountRole>("demo");
    const [mounted, setMounted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        if (currentAccount) {
            setRole(currentAccount.role);
            if (currentAccount.email) {
                setUsername(currentAccount.email);
            }
        }
    }, [currentAccount]);

    const redirectForRole = async (selectedRole: AccountRole, tenantId?: string) => {
        if (selectedRole === "demo") {
            await runDemoFlow(tenantId);
            router.replace("/home");
            return;
        }
        if (selectedRole === "admin" || selectedRole === "owner" || selectedRole === "manager") {
            router.replace("/onboarding/admin");
        } else if (selectedRole === "member") {
            router.replace("/onboarding/member");
        } else {
            router.replace("/home");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const email = username.trim() || `${role}@demo.local`;
            const password = "demo-pass";
            const session = await authLogin({ email, password, role });
            login({
                userId: session.user_id,
                email: session.email || email,
                role: session.role,
                tenantId: session.tenant_id,
                token: session.token,
            });
            await redirectForRole(session.role, session.tenant_id);
        } catch (err: any) {
            const message = err?.message || "Core login failed (is core running on 8083?)";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedLabel = (r: AccountRole) => r.charAt(0).toUpperCase() + r.slice(1);

    return (
        <div className="min-h-screen bg-[#030806] text-emerald-50 flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-emerald-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[800px] h-[800px] bg-teal-900/10 rounded-full blur-[120px]" />
            </div>

            <form
                onSubmit={handleSubmit}
                className="relative z-10 w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-8"
            >
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-500/50 mb-2">SaimA'r / MA'ra</p>
                    <h1 className="text-2xl font-light">Welcome</h1>
                    <p className="text-sm text-emerald-400/60">Choose your role to enter the workspace.</p>
                </div>

                {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-200">
                        {error}
                    </div>
                )}

                {mounted && currentAccount && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-100">
                        Active session: {currentAccount.email || currentAccount.userId} ({currentAccount.role})
                        <div className="mt-2 flex gap-2 text-xs">
                            <button
                                type="button"
                                onClick={() => redirectForRole(currentAccount.role, currentAccount.tenantId)}
                                className="px-3 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/40"
                                disabled={isRunning}
                            >
                                Continue
                            </button>
                            <button
                                type="button"
                                onClick={() => { logout(); }}
                                className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-emerald-200/80"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    <label className="text-xs uppercase tracking-[0.2em] text-emerald-500/40">Email</label>
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="demo@example.com"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-emerald-50 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-xs uppercase tracking-[0.2em] text-emerald-500/40">Role</label>
                    <div className="grid grid-cols-2 gap-2">
                        {roles.map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setRole(r)}
                                className={`rounded-xl px-4 py-3 text-sm border transition-all ${role === r
                                        ? "border-mora-gold text-mora-gold bg-mora-gold/10"
                                        : "border-white/10 text-emerald-100/70 hover:border-emerald-500/40"
                                    }`}
                            >
                                {selectedLabel(r)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        type="submit"
                        disabled={isSubmitting || isRunning}
                        className="w-full py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-50 font-medium tracking-wide hover:bg-emerald-600/30 transition-colors disabled:opacity-60"
                    >
                        {isSubmitting ? "Entering..." : "Enter"}
                    </button>
                    {mounted && currentAccount && (
                        <button
                            type="button"
                            onClick={() => {
                                logout();
                            }}
                            className="w-full py-2 rounded-xl text-xs text-emerald-400/60 hover:text-emerald-300 underline"
                        >
                            Logout current session
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
