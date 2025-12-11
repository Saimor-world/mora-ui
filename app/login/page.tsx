"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Login Page - Redirects to root
 * 
 * All authentication is now handled by WelcomeScreen at /
 * This page exists only for backwards compatibility
 */
export default function LoginPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/");
    }, [router]);

    return (
        <div className="min-h-screen bg-[#030806] flex items-center justify-center">
            <div className="text-emerald-500/50 text-sm">Redirecting...</div>
        </div>
    );
}
