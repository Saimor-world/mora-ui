"use client";

import { showToast } from "@/lib/toast";

export const HEALTHY_STATUSES = new Set(["ok", "online", "healthy"]);
export const WARNING_STATUSES = new Set(["warning"]);
export const AUTH_STATUSES = new Set(["unauthorized", "forbidden"]);
export const OFFLINE_STATUSES = new Set(["unreachable", "error", "offline", "timeout"]);

export type NormalizedHealthState = "loading" | "healthy" | "warning" | "offline" | "auth";

let lastToastState: NormalizedHealthState = "loading";

export function normalizeHealthStatus(rawStatus?: string | null): NormalizedHealthState {
  if (!rawStatus) return "loading";
  const status = rawStatus.toLowerCase();
  if (HEALTHY_STATUSES.has(status)) return "healthy";
  if (WARNING_STATUSES.has(status)) return "warning";
  if (AUTH_STATUSES.has(status)) return "auth";
  if (OFFLINE_STATUSES.has(status)) return "offline";
  if (status === "loading") return "loading";
  return "offline";
}

export function getHealthFlags(status?: string | null) {
  const normalizedStatus = normalizeHealthStatus(status);
  return {
    normalizedStatus,
    isOnline: normalizedStatus === "healthy" || normalizedStatus === "warning",
    isWarning: normalizedStatus === "warning",
    isOffline: normalizedStatus === "offline",
    isAuthError: normalizedStatus === "auth",
  };
}

export function describeHealthState(state: NormalizedHealthState): string {
  switch (state) {
    case "healthy":
      return "Connected to Core";
    case "warning":
      return "Core reachable · limited data";
    case "auth":
      return "Core erreichbar · kein gültiger Token";
    case "offline":
      return "Core offline";
    default:
      return "Checking status…";
  }
}

export function getHealthColorClass(state: NormalizedHealthState): string {
  switch (state) {
    case "healthy":
      return "text-green-500";
    case "warning":
      return "text-amber-500";
    case "auth":
      return "text-red-500";
    case "offline":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
}

export function getHealthIcon(state: NormalizedHealthState): string {
  switch (state) {
    case "healthy":
      return "✓";
    case "warning":
      return "⚠️";
    case "auth":
      return "🔑";
    case "offline":
      return "✕";
    default:
      return "⏳";
  }
}

export function announceHealthTransition(status?: string | null) {
  const next = normalizeHealthStatus(status);
  if (typeof window === "undefined" || next === lastToastState) {
    lastToastState = next;
    return;
  }

  if (next === "offline") {
    showToast({
      message: "Core API offline – bitte Verbindung prüfen.",
      variant: "error",
    });
  } else if (next === "auth") {
    showToast({
      message: "Core erreichbar, aber ohne gültigen Zugangstoken – Demo-Modus aktiv.",
      variant: "warning",
    });
  } else if (lastToastState === "offline" || lastToastState === "auth") {
    showToast({
      message: "Core API wieder erreichbar.",
      variant: "info",
    });
  }

  lastToastState = next;
}
