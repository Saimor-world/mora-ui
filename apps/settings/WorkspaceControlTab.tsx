'use client';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useWorkspaceAccess, useWorkspaceCatalog } from '@/lib/queries/useWorkspaceAccess';
import { createWorkspaceCheckoutIntent, type WorkspacePlan } from '@/lib/api/workspaceClient';
import { isPaddleCheckoutConfigured, openWorkspaceCheckout } from '@/lib/billing/paddleCheckout';
import { ESTATE } from '@/lib/estate';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';

export function WorkspaceControlTab({ onOpenIntegrations }: { onOpenIntegrations: () => void }) {
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const access = useWorkspaceAccess();
  const catalog = useWorkspaceCatalog();
  const communication = useCommunicationSurface();
  const snapshot = access.data;
  const products = snapshot?.access.products ?? [];
  const subscription = snapshot?.billing.subscriptions[0];
  const onboarding = snapshot?.onboarding;
  const osPlan = catalog.data?.plans.find((plan) => plan.product === 'os' && plan.interval === 'month');
  const osPrice = osPlan ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: osPlan.price.currency }).format(osPlan.price.amount_minor / 100) : null;
  const connections = getWorkspaceConnections(communication.summary, communication.overview);
  const readyConnections = connections.filter((item) => item.ready).length;
  const nextMissing = connections.find((item) => !item.ready);
  const launchSteps = [
    { label: 'Produktzugang', detail: products.length ? products.map((item) => item.label).join(' ? ') : 'Produkt in Saim?r Desk w?hlen', ready: products.length > 0, action: () => window.open(ESTATE.desk + '/plans', '_blank', 'noopener,noreferrer') },
    { label: 'Organisation', detail: onboarding?.state === 'complete' ? 'Workspace-Struktur best?tigt' : 'Unternehmen und Abteilungen abschlie?en', ready: onboarding?.state === 'complete', action: undefined },
    { label: 'Arbeitsquellen', detail: readyConnections + '/' + connections.length + ' Quellen bereit', ready: readyConnections >= 4, action: onOpenIntegrations },
    { label: 'Arbeitsbetrieb', detail: communication.overview?.runtime?.local_truth?.services?.core?.reachable ? 'CORE und Assistant verf?gbar' : 'Runtime-Status in Integrationen pr?fen', ready: Boolean(communication.overview?.runtime?.local_truth?.services?.core?.reachable), action: onOpenIntegrations },
  ];
  const readyLaunchSteps = launchSteps.filter((step) => step.ready).length;
  const nextLaunchStep = launchSteps.find((step) => !step.ready);
  const purchasablePlans = (catalog.data?.plans ?? []).filter((plan) => plan.interval === 'month');
  const startCheckout = async (plan: WorkspacePlan) => {
    if (!plan.checkout_ready || !isPaddleCheckoutConfigured()) {
      toast.info('Checkout wird gerade freigeschaltet. Tarif und Preis kommen bereits live aus CORE.');
      return;
    }
    setCheckoutPlan(plan.key);
    try {
      const intent = await createWorkspaceCheckoutIntent({ plan_key: plan.key, seats: plan.included_seats });
      if (!await openWorkspaceCheckout(intent)) throw new Error('Paddle ist in diesem Build nicht konfiguriert.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Checkout konnte nicht ge?ffnet werden.');
    } finally {
      setCheckoutPlan(null);
    }
  };
  return <div className="space-y-6" data-testid="workspace-control-tab">
    <header className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.22em] text-emerald-300/60">Workspace-Wahrheit</p><h3 className="mt-1 text-xl font-light text-white">Dein Saim?r im ?berblick</h3><p className="mt-2 text-sm text-white/48">Produkte, Einrichtung und Abrechnung direkt aus CORE.</p></div><button type="button" onClick={() => access.refetch()} disabled={access.isFetching} aria-label="Workspace aktualisieren" className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/45 hover:bg-white/[0.08] disabled:opacity-40"><RefreshCw size={15} className={access.isFetching ? 'animate-spin' : ''} /></button></header>
    {!snapshot && !access.isLoading && <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.05] p-4 text-sm text-amber-100/70">CORE konnte den Status nicht best?tigen. Das OS zeigt keine erfundenen Werte.</div>}
    <section className="relative overflow-hidden rounded-[26px] border border-emerald-300/15 bg-[radial-gradient(circle_at_85%_15%,rgba(34,211,238,0.10),transparent_38%),linear-gradient(145deg,rgba(4,30,24,0.48),rgba(2,10,11,0.35))] p-5">
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-[10px] uppercase tracking-[0.22em] text-emerald-200/50">Launch Center</p><h4 className="mt-2 text-2xl font-light text-white">{readyLaunchSteps === launchSteps.length ? 'Dein System ist startklar.' : readyLaunchSteps + ' von ' + launchSteps.length + ' Ebenen bereit'}</h4><p className="mt-2 max-w-xl text-sm leading-relaxed text-white/48">{nextLaunchStep ? 'N?chster sinnvoller Schritt: ' + nextLaunchStep.label + '. ' + nextLaunchStep.detail + '.' : 'Zugang, Organisation, Quellen und Betrieb sind best?tigt.'}</p></div>
        {nextLaunchStep?.action && <button type="button" onClick={nextLaunchStep.action} className="rounded-2xl border border-emerald-200/20 bg-emerald-300/[0.10] px-5 py-3 text-sm font-medium text-emerald-50 hover:bg-emerald-300/[0.16]">{nextLaunchStep.label} ?ffnen</button>}
      </div>
      <div className="relative mt-5 grid gap-2 md:grid-cols-4">{launchSteps.map((step, index) => <button type="button" key={step.label} onClick={step.action} disabled={!step.action} className="rounded-2xl border border-white/[0.07] bg-black/15 p-3 text-left disabled:cursor-default"><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-[0.14em] text-white/45">0{index + 1}</span><span className={'h-2 w-2 rounded-full ' + (step.ready ? 'bg-emerald-400' : 'bg-amber-300/60')} /></div><strong className="mt-3 block text-sm font-medium text-white/78">{step.label}</strong><span className="mt-1 block text-[10px] leading-relaxed text-white/34">{step.detail}</span></button>)}</div>
    </section>
    <div className="grid gap-3 md:grid-cols-3"><Metric label="Zugang" value={String(products.length)} detail="aktive Produkte" /><Metric label="Setup" value={onboarding?.state === 'complete' ? 'Bereit' : onboarding?.state === 'in_progress' ? 'In Arbeit' : 'Offen'} detail={(onboarding?.completed_steps.length ?? 0) + ' Schritte best?tigt'} /><Metric label="Abrechnung" value={subscription?.status ?? 'Kein Abo'} detail={subscription ? subscription.seats + ' Pl?tze' : osPrice ? 'OS ab ' + osPrice : 'Katalog wird geladen'} /></div>
    <section className="rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.025] p-4">
      <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.16em] text-cyan-200/55">Arbeitsquellen</p><h4 className="mt-1 text-sm font-medium text-white/82">{readyConnections}/{connections.length} verbunden</h4></div>{nextMissing && <button type="button" onClick={onOpenIntegrations} className="rounded-xl border border-cyan-200/15 bg-cyan-300/[0.07] px-3 py-2 text-xs text-cyan-50/80 hover:bg-cyan-300/[0.12]">{nextMissing.label} einrichten</button>}</div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{connections.map((item) => <div key={item.label} className="rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2"><div className="flex items-center gap-2"><span className={'h-1.5 w-1.5 rounded-full ' + (item.ready ? 'bg-emerald-400' : 'bg-white/20')} /><span className="text-xs text-white/65">{item.label}</span></div><div className="mt-1 text-[9px] uppercase tracking-wider text-white/28">{item.ready ? 'bereit' : 'offen'}</div></div>)}</div>
    </section>
    <section className="rounded-2xl border border-white/[0.08] bg-black/20 p-4"><h4 className="text-sm font-medium text-white/82">Produkte und Rechte</h4><div className="mt-3 space-y-2">{products.length ? products.map((product) => <div key={product.key} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5"><div><div className="text-sm text-white/80">{product.label}</div><div className="text-[10px] text-white/35">{product.access === 'included' ? 'im Paket enthalten' : 'direkt gebucht'}</div></div><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-200/70">aktiv</span></div>) : <p className="py-2 text-sm text-white/42">Noch kein aktiver Produktzugang in CORE.</p>}</div></section>
    <section className="rounded-2xl border border-amber-200/10 bg-amber-200/[0.025] p-4">
      <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.16em] text-amber-200/55">Echte Tarife</p><h4 className="mt-1 text-sm font-medium text-white/82">Vom Einstieg zum vollst?ndigen System</h4></div><span className="text-[10px] text-white/30">14 Tage testen</span></div>
      <div className="mt-4 grid gap-2 md:grid-cols-3">{purchasablePlans.map((plan) => {
        const active = products.some((product) => product.key === plan.product);
        const price = new Intl.NumberFormat('de-DE', { style: 'currency', currency: plan.price.currency }).format(plan.price.amount_minor / 100);
        return <article key={plan.key} className={'rounded-2xl border p-4 ' + (active ? 'border-emerald-300/20 bg-emerald-300/[0.05]' : 'border-white/[0.07] bg-black/15')}>
          <div className="text-xs text-white/52">{plan.label}</div><strong className="mt-2 block text-xl font-light text-white">{price}<span className="text-xs text-white/35"> / Monat</span></strong><p className="mt-1 text-[10px] text-white/32">{plan.included_seats} {plan.included_seats === 1 ? 'Platz' : 'Pl?tze'} inklusive</p>
          <button type="button" onClick={() => startCheckout(plan)} disabled={active || checkoutPlan === plan.key} className="mt-4 w-full rounded-xl border border-amber-200/15 bg-amber-200/[0.07] px-3 py-2 text-xs text-amber-50/80 hover:bg-amber-200/[0.12] disabled:cursor-default disabled:opacity-45">{active ? 'Aktiv' : checkoutPlan === plan.key ? 'Wird vorbereitet?' : plan.checkout_ready ? 'Ausw?hlen' : 'Vormerken'}</button>
        </article>;
      })}</div>
      {!purchasablePlans.length && <p className="mt-4 text-sm text-white/38">Der Tarifkatalog ist gerade nicht erreichbar.</p>}
      <p className="mt-3 text-[10px] leading-relaxed text-white/28">Das OS bereitet nur den Kauf vor. Produktrechte werden ausschlie?lich nach einem signierten Zahlungsereignis in CORE aktiviert.</p>
    </section>
    <div className="grid gap-3 md:grid-cols-2"><Action title="Dienste verbinden" text="Mail, Kalender, Cloud, Feeds und Assistenten." onClick={onOpenIntegrations} /><Action title="Abo und Kosten verwalten" text="Tarife, Pl?tze und Checkout in Saim?r Desk." onClick={() => window.open(ESTATE.desk + '/plans', '_blank', 'noopener,noreferrer')} external /></div>
  </div>;
}

export function getWorkspaceConnections(
  summary: { mailConfigured: boolean; mailLocalMode: boolean; calendarConfigured: boolean },
  overview?: { cloud_storage?: { configured?: boolean }; rss?: { configured?: boolean }; capabilities?: { assistant_available?: boolean } } | null,
) {
  return [
    { label: 'Mail', ready: summary.mailConfigured || summary.mailLocalMode },
    { label: 'Kalender', ready: summary.calendarConfigured },
    { label: 'Cloud', ready: Boolean(overview?.cloud_storage?.configured) },
    { label: 'Feeds', ready: Boolean(overview?.rss?.configured) },
    { label: 'Assistant', ready: Boolean(overview?.capabilities?.assistant_available) },
  ];
}
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"><span className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/60">{label}</span><strong className="mt-3 block text-lg font-light text-white">{value}</strong><span className="text-xs text-white/40">{detail}</span></section>; }
function Action({ title, text, onClick, external }: { title: string; text: string; onClick: () => void; external?: boolean }) { return <button type="button" onClick={onClick} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-left hover:bg-white/[0.06]"><strong className="flex items-center gap-2 text-sm text-white/82">{title}{external && <ExternalLink size={13} />}</strong><span className="mt-1 block text-xs text-white/40">{text}</span></button>; }
