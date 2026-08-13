'use client';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useWorkspaceAccess, useWorkspaceCatalog } from '@/lib/queries/useWorkspaceAccess';
import { ESTATE } from '@/lib/estate';

export function WorkspaceControlTab({ onOpenIntegrations }: { onOpenIntegrations: () => void }) {
  const access = useWorkspaceAccess();
  const catalog = useWorkspaceCatalog();
  const snapshot = access.data;
  const products = snapshot?.access.products ?? [];
  const subscription = snapshot?.billing.subscriptions[0];
  const onboarding = snapshot?.onboarding;
  const osPlan = catalog.data?.plans.find((plan) => plan.product === 'os' && plan.interval === 'month');
  const osPrice = osPlan ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: osPlan.price.currency }).format(osPlan.price.amount_minor / 100) : null;
  return <div className="space-y-6" data-testid="workspace-control-tab">
    <header className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.22em] text-emerald-300/60">Workspace-Wahrheit</p><h3 className="mt-1 text-xl font-light text-white">Dein Saim?r im ?berblick</h3><p className="mt-2 text-sm text-white/48">Produkte, Einrichtung und Abrechnung direkt aus CORE.</p></div><button type="button" onClick={() => access.refetch()} disabled={access.isFetching} aria-label="Workspace aktualisieren" className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/45 hover:bg-white/[0.08] disabled:opacity-40"><RefreshCw size={15} className={access.isFetching ? 'animate-spin' : ''} /></button></header>
    {!snapshot && !access.isLoading && <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.05] p-4 text-sm text-amber-100/70">CORE konnte den Status nicht best?tigen. Das OS zeigt keine erfundenen Werte.</div>}
    <div className="grid gap-3 md:grid-cols-3"><Metric label="Zugang" value={String(products.length)} detail="aktive Produkte" /><Metric label="Setup" value={onboarding?.state === 'complete' ? 'Bereit' : onboarding?.state === 'in_progress' ? 'In Arbeit' : 'Offen'} detail={(onboarding?.completed_steps.length ?? 0) + ' Schritte best?tigt'} /><Metric label="Abrechnung" value={subscription?.status ?? 'Kein Abo'} detail={subscription ? subscription.seats + ' Pl?tze' : osPrice ? 'OS ab ' + osPrice : 'Katalog wird geladen'} /></div>
    <section className="rounded-2xl border border-white/[0.08] bg-black/20 p-4"><h4 className="text-sm font-medium text-white/82">Produkte und Rechte</h4><div className="mt-3 space-y-2">{products.length ? products.map((product) => <div key={product.key} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5"><div><div className="text-sm text-white/80">{product.label}</div><div className="text-[10px] text-white/35">{product.access === 'included' ? 'im Paket enthalten' : 'direkt gebucht'}</div></div><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-200/70">aktiv</span></div>) : <p className="py-2 text-sm text-white/42">Noch kein aktiver Produktzugang in CORE.</p>}</div></section>
    <div className="grid gap-3 md:grid-cols-2"><Action title="Dienste verbinden" text="Mail, Kalender, Cloud, Feeds und Assistenten." onClick={onOpenIntegrations} /><Action title="Abo und Kosten verwalten" text="Tarife, Pl?tze und Checkout in Saim?r Desk." onClick={() => window.open(ESTATE.desk + '/plans', '_blank', 'noopener,noreferrer')} external /></div>
  </div>;
}
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"><span className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/60">{label}</span><strong className="mt-3 block text-lg font-light text-white">{value}</strong><span className="text-xs text-white/40">{detail}</span></section>; }
function Action({ title, text, onClick, external }: { title: string; text: string; onClick: () => void; external?: boolean }) { return <button type="button" onClick={onClick} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-left hover:bg-white/[0.06]"><strong className="flex items-center gap-2 text-sm text-white/82">{title}{external && <ExternalLink size={13} />}</strong><span className="mt-1 block text-xs text-white/40">{text}</span></button>; }
