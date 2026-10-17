"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight,
  CircleAlert, CircleDot, Copy, ExternalLink, Fingerprint,
  LockKeyhole, Play, RefreshCcw, ShieldCheck, Wallet, XCircle, Zap,
} from "lucide-react";
import { COMMERCE_SCENARIOS, simulateCommerceOutcome, type CommerceScenario } from "@/lib/xrplCommerceLab";

type Phase = "prepared" | "reviewed";
const INVOICE = "A7C9E201DEMO44B73F8E092BC7D1A6E3";
const DEMO_QUOTE = "QT-DEMO-017";
const DEMO_DESTINATION = "rTESTNET_DEMO_NO_ACTUAL_WALLET";
const INVOICE_VISUAL = "A7C9 · E201 · ... · A6E3";

function Indicator({ tone = "muted", label }: { tone?: "green" | "amber" | "red" | "muted"; label: string }) {
  const colors = {
    green: "border-emerald-300/20 bg-emerald-300/[.08] text-emerald-200",
    amber: "border-amber-300/20 bg-amber-300/[.07] text-amber-200",
    red: "border-rose-300/20 bg-rose-300/[.07] text-rose-200",
    muted: "border-white/10 bg-white/[.04] text-white/50",
  };
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-[.13em] uppercase ${colors[tone]}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${tone === "green" ? "bg-emerald-300" : tone === "amber" ? "bg-amber-300" : tone === "red" ? "bg-rose-300" : "bg-white/40"}`} />
    {label}
  </span>;
}

function Field({ title, value, mono = false }: { title: string; value: string; mono?: boolean }) {
  return <div className="flex items-center justify-between gap-4 border-b border-white/[.055] py-4 last:border-none">
    <span className="text-xs text-white/35">{title}</span>
    <span className={`max-w-[62%] text-right text-xs text-white/80 ${mono ? "font-mono tracking-[.025em]" : ""}`}>{value}</span>
  </div>;
}

export default function XRPLCommerceLabPage() {
  const [scenario, setScenario] = useState<CommerceScenario>("valid");
  const [phase, setPhase] = useState<Phase>("prepared");
  const [run, setRun] = useState(1);
  const [copied, setCopied] = useState(false);
  const outcome = useMemo(() => simulateCommerceOutcome(scenario), [scenario]);
  const complete = phase === "reviewed";

  const selectScenario = (next: CommerceScenario) => {
    setScenario(next);
    setPhase("prepared");
  };
  const copyInvoice = async () => {
    // Preview uses a clearly non-transactional demo marker instead of an
    // executable XRP InvoiceID, avoiding accidental real-wallet use.
    try {
      await navigator.clipboard.writeText("SAIMOR-SIMULATION-NO-REAL-INVOICE");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main data-testid="xrpl-commerce-lab" className="relative min-h-screen overflow-hidden bg-[#060a0b] text-[#ecf2eb] selection:bg-emerald-200/20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{
        background: "radial-gradient(ellipse 42% 48% at 78% 11%,rgba(35,91,69,.18),transparent 80%),radial-gradient(ellipse 40% 35% at 5% 85%,rgba(85,66,45,.09),transparent 85%),linear-gradient(155deg,#070b0d 0%,#070c0b 62%,#06080b 100%)",
      }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.23]" style={{
        backgroundImage: "radial-gradient(circle at 15% 19%,#d6ffe7 0 1px,transparent 1.7px),radial-gradient(circle at 80% 33%,#b7ffc4 0 1px,transparent 1.7px),radial-gradient(circle at 63% 84%,#e2fff0 0 1px,transparent 1.7px)",
        backgroundSize: "260px 270px,360px 310px,420px 380px",
      }} />
      <div className="relative mx-auto max-w-[1376px] px-5 pb-24 pt-7 sm:px-10 lg:px-14">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[.08] pb-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/home" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-emerald-300/30 hover:text-white" aria-label="Zurück zu SAIMÔR OS">
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="relative grid h-10 w-10 place-items-center rounded-2xl border border-emerald-100/[.16] bg-emerald-100/[.035]">
                <div className="absolute inset-2 rounded-full border border-emerald-100/[.26]" />
                <div className="h-2 w-2 rounded-full bg-emerald-200 shadow-[0_0_18px_rgba(167,243,208,.48)]" />
              </div>
              <div>
                <div className="text-[12px] font-semibold tracking-[.21em]">SAIMÔR</div>
                <div className="mt-0.5 text-[9px] uppercase tracking-[.22em] text-white/35">OS / Finance / Protocol Lab</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Indicator label="Nur Simulation" tone="amber" />
            <span className="hidden text-[11px] text-white/30 md:block">Keine Wallet · Kein Mainnet · Kein Zugriff</span>
          </div>
        </header>

        <section className="grid gap-8 pb-10 pt-14 lg:grid-cols-[1.08fr_.92fr] lg:items-end lg:gap-14">
          <div>
            <div className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.3em] text-emerald-200/70">
              <span className="h-px w-8 bg-emerald-200/40" /> Commerce Infrastructure · Experiment 01
            </div>
            <h1 className="max-w-[650px] text-[clamp(2.5rem,5.4vw,5.65rem)] font-light leading-[.98] tracking-[-.068em]">
              Vertrauen beginnt<br /><span className="text-emerald-200/80">nach der Zahlung.</span>
            </h1>
            <p className="mt-6 max-w-[570px] text-sm leading-[1.9] text-white/48 sm:text-[15px]">
              Was passiert, wenn ein KI-System oder Kunde mit XRP bezahlt? Wir machen den Weg von der Rechnung zum überprüften Nachweis sichtbar – ohne Zugriffsrechte zu erfinden.
            </p>
          </div>
          <div className="relative hidden min-h-[196px] items-center justify-end lg:flex">
            <div aria-hidden="true" className="absolute right-[66px] top-[-20px] h-64 w-64 rounded-full border border-emerald-100/[.07]" />
            <div aria-hidden="true" className="absolute right-[99px] top-[13px] h-48 w-48 rounded-full border border-emerald-100/[.12]" />
            <div aria-hidden="true" className="absolute right-[128px] top-[42px] h-32 w-32 rounded-full border border-emerald-100/[.18]" />
            <div aria-hidden="true" className="absolute right-[179px] top-[94px] h-[26px] w-[26px] rounded-full bg-emerald-100/[.75] shadow-[0_0_48px_16px_rgba(84,190,142,.16)]" />
            <div className="absolute right-0 top-0 rounded-2xl border border-white/[.09] bg-[#0c1514]/90 px-5 py-4 backdrop-blur-xl">
              <span className="block text-[10px] uppercase tracking-[.2em] text-white/35">Proof model</span>
              <span className="mt-2 flex items-center gap-2 font-mono text-xs text-emerald-100/80"><ShieldCheck size={13} /> PAYMENT ≠ ACCESS</span>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.53fr)_minmax(340px,.85fr)]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-[26px] border border-white/[.085] bg-[#101717]/90 shadow-[0_30px_100px_rgba(0,0,0,.20)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.065] px-6 py-5 sm:px-8">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100/[.07] text-emerald-200"><Wallet size={16} /></div>
                  <div>
                    <h2 className="text-sm font-medium tracking-[.015em]">Testauftrag</h2>
                    <p className="mt-1 text-[11px] text-white/35">Fiktive Produktbestellung · keine Abbuchung</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] tracking-[.14em] text-white/35">#{String(run).padStart(4, "0")} · {DEMO_QUOTE}</span>
              </div>

              <div className="grid gap-6 px-6 py-7 sm:grid-cols-[1.1fr_.9fr] sm:px-8">
                <div>
                  <div className="text-[10px] uppercase tracking-[.22em] text-white/30">Software</div>
                  <h3 className="mt-3 text-[26px] font-light tracking-[-.05em]">YORI <span className="text-white/40">Creator</span></h3>
                  <p className="mt-2 text-xs leading-6 text-white/45">Demo-Lizenz · Einmaliger Testvorgang</p>
                  <div className="mt-8 flex items-end gap-3">
                    <span className="text-[45px] font-light leading-none tracking-[-.07em] text-emerald-100">0.001</span>
                    <span className="mb-1.5 font-mono text-[13px] text-emerald-100/55">XRP</span>
                  </div>
                  <p className="mt-3 text-[10px] uppercase tracking-[.15em] text-white/30">1.000 Drops · Reiner Demo-Wert</p>
                </div>
                <div className="rounded-2xl border border-white/[.07] bg-[#0a1011] px-5 py-3">
                  <Field title="Netzwerk" value="XRPL Testnet (simuliert)" />
                  <Field title="Rechnung" value={INVOICE_VISUAL} mono />
                  <Field title="Empfänger" value="Testadresse · Demo" />
                  <Field title="Gültigkeit" value="15 Minuten · simuliert" />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[.065] bg-white/[.012] px-6 py-4 sm:px-8">
                <div className="flex items-center gap-2 text-[11px] text-white/40"><LockKeyhole size={13} className="text-emerald-200/65" /> Testdaten bleiben von CORE getrennt</div>
                <button type="button" onClick={() => {setRun(v => v + 1);setPhase("prepared");setCopied(false);}} className="flex items-center gap-2 text-[11px] font-medium text-emerald-100/80 hover:text-emerald-50">
                  <RefreshCcw size={13} /> Neuen Demo-Auftrag
                </button>
              </div>
            </section>

            <section className="rounded-[26px] border border-white/[.08] bg-[#0e1515]/90 px-6 pb-6 pt-6 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[.2em] text-white/32">02 / Transaktionsprüfung</div>
                  <h2 className="mt-2 text-lg font-light tracking-[-.025em]">Wie reagiert CORE?</h2>
                </div>
                <Indicator label={complete ? (outcome.accepted ? "Review erforderlich" : "Abgewiesen") : "Bereit zur Simulation"} tone={complete ? (outcome.accepted ? "amber" : "red") : "muted"} />
              </div>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {COMMERCE_SCENARIOS.map(({ key, label, hint }) => (
                  <button key={key} type="button" onClick={() => selectScenario(key)} aria-pressed={scenario === key}
                    className={`group flex min-h-[66px] items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${scenario === key ? "border-emerald-200/25 bg-emerald-200/[.065]" : "border-white/[.06] bg-white/[.013] hover:border-white/[.15]"}`}>
                    <span className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${scenario === key ? "border-emerald-200/60 text-emerald-200" : "border-white/20 text-transparent"}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </span>
                    <span><span className="block text-xs font-medium text-white/85">{label}</span><span className="mt-1 block text-[10px] leading-4 text-white/35">{hint}</span></span>
                  </button>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button type="button" onClick={() => setPhase("reviewed")} className="inline-flex min-h-[48px] items-center justify-center gap-3 rounded-full bg-[#b8e8cf] px-6 text-xs font-semibold tracking-[.025em] text-[#0b241a] transition hover:bg-[#d2fbe2]">
                  <Play size={15} fill="currentColor" /> Zahlungsprüfung simulieren <ArrowRight size={15} />
                </button>
                <span className="text-[10px] text-white/30">Keine Verbindung zur Blockchain · kein Geldfluss</span>
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="overflow-hidden rounded-[26px] border border-emerald-100/[.11] bg-[#101918]/95">
              <div className="flex items-center justify-between border-b border-white/[.065] px-6 py-5">
                <div className="flex items-center gap-2"><Activity size={16} className="text-emerald-200/70" /><span className="text-xs font-medium">Evidence stream</span></div>
                <span className="font-mono text-[10px] text-white/30">CORE / V0.1</span>
              </div>
              <div className="relative px-6 py-7">
                <div aria-hidden="true" className="absolute bottom-14 left-[38px] top-11 w-px bg-gradient-to-b from-emerald-200/40 via-white/10 to-transparent" />
                {[
                  { icon: Fingerprint, label: "01", title: "Rechnung erstellt", detail: "Quote & InvoiceID", active: true },
                  { icon: Zap, label: "02", title: "Zahlung eingegangen", detail: complete ? "Simulierte Transaktion" : "Noch kein Zahlungsnachweis", active: complete },
                  { icon: ShieldCheck, label: "03", title: "Ledger verifiziert", detail: complete ? (outcome.accepted ? "Validiert · Simulation" : "Prüfung fehlgeschlagen") : "Nachweis ausstehend", active: complete && outcome.accepted },
                  { icon: LockKeyhole, label: "04", title: "Berechtigung", detail: complete && outcome.accepted ? "Nur zur menschlichen Prüfung" : "Nicht freigegeben", active: false },
                ].map((step, i) => {
                  const Icon = step.icon;
                  return <div key={step.label} className={`relative mb-8 flex items-start gap-4 last:mb-0 ${!step.active && "opacity-55"}`}>
                    <div className={`z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${step.active ? "border-emerald-100/25 bg-[#17382d] text-emerald-200" : "border-white/10 bg-[#121a19] text-white/40"}`}>
                      <Icon size={14} />
                    </div>
                    <div className="pt-0.5"><div className="flex items-center gap-2"><span className="font-mono text-[10px] text-white/30">{step.label}</span><span className="text-xs font-medium">{step.title}</span></div><p className="mt-1.5 text-[11px] leading-5 text-white/42">{step.detail}</p></div>
                    {i === 0 && <span className="ml-auto mt-1 text-emerald-200/65"><Check size={14} /></span>}
                  </div>;
                })}
              </div>
              <div className={`mx-5 mb-5 rounded-2xl border p-4 ${complete ? outcome.accepted ? "border-amber-200/20 bg-amber-200/[.06]" : "border-rose-200/20 bg-rose-200/[.045]" : "border-white/[.075] bg-white/[.02]"}`} aria-live="polite">
                <div className="flex items-center gap-2">
                  {complete ? outcome.accepted ? <CircleAlert size={16} className="text-amber-200" /> : <XCircle size={16} className="text-rose-200" /> : <CircleDot size={16} className="text-white/40" />}
                  <span className="text-[12px] font-medium">{complete ? outcome.title : "Bereit für die Überprüfung"}</span>
                </div>
                <p className="mt-2 text-[11px] leading-[1.7] text-white/50">{complete ? outcome.detail : "Wähle einen Fall und starte die Simulation, um den vollständigen Prüfpfad zu sehen."}</p>
                {complete && <div className="mt-3 font-mono text-[10px] tracking-[.08em] text-white/40">{outcome.code}</div>}
              </div>
            </section>

            <section className="rounded-[24px] border border-white/[.075] bg-[#0d1213] px-6 py-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-medium">Nachweisprotokoll</h2>
                <Indicator label="synthetisch" />
              </div>
              <div className="mt-4 space-y-3 font-mono text-[10px] leading-6 text-white/45">
                {(complete ? outcome.events : ["Testauftrag vorbereitet", "Noch keine simulierte Transaktion"]).map((event, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="text-emerald-200/50">{String(idx + 1).padStart(2, "0")}</span>
                    <span>{event}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-white/[.06] pt-4 text-[10px] leading-[1.7] text-white/35">
                <div className="flex items-center gap-2"><ShieldCheck size={13} className="text-emerald-200/55" /> Keine Schlüssel oder echten Transaktionsdaten</div>
                <p className="mt-2">Echte Ledger-Prüfung und Mandantenzuordnung werden separat im CORE-Draft entwickelt.</p>
              </div>
            </section>
          </aside>
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.075] pt-5 text-[10px] text-white/28">
          <span>SAIMÔR SYSTEMS / COMMERCE LAB · EXPERIENCE PREVIEW</span>
          <span className="flex items-center gap-2"><LockKeyhole size={12} /> LIVE SETTLEMENT: DEAKTIVIERT</span>
        </footer>
      </div>
    </main>
  );
}
