import {
  aggregateCompanyState,
  fetchCompanyAccounts,
  fetchOriginNftStatus,
} from "@/lib/finance";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function n(value: number | null | undefined, max = 5) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: max }).format(value);
}

function short(value: string | null | undefined) {
  if (!value) return "—";
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-7)}` : value;
}

export default async function MobileFinancePreview() {
  let data: ReturnType<typeof aggregateCompanyState> | null = null;
  let error: string | null = null;

  try {
    const [accounts, origin] = await Promise.all([
      fetchCompanyAccounts(),
      fetchOriginNftStatus(),
    ]);
    data = aggregateCompanyState(accounts, origin);
  } catch (err) {
    error = err instanceof Error ? err.message : "Live-Daten konnten nicht geladen werden.";
  }

  const treasury = data?.accounts.find((a) => a.role.type === "SAIMOR_SOVEREIGN_TREASURY") ?? null;
  const hotMinter = data?.accounts.find((a) => a.role.type === "SAIMOR_ORIGIN_HOT_MINTER") ?? null;
  const origin = data?.originNft ?? null;
  const listing = data?.openListings?.[0] ?? null;

  return (
    <main className="min-h-screen bg-[#090714] px-4 py-6 text-white">
      <div className="mx-auto w-full max-w-md space-y-4">
        <header className="rounded-[28px] border border-emerald-300/10 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_35%),rgba(255,255,255,0.025)] p-5 shadow-2xl">
          <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-200/50">SAIMÔR · Finance</div>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-medium tracking-[-0.04em]">Live Company State</h1>
              <p className="mt-1 text-xs leading-relaxed text-white/40">Read-only · XRPL mainnet · mobile preview</p>
            </div>
            <div className="rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-[10px] text-emerald-100/70">
              LIVE
            </div>
          </div>
        </header>

        {error ? (
          <section className="rounded-2xl border border-red-300/15 bg-red-400/5 p-4 text-sm text-red-100/70">
            {error}
          </section>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="text-[9px] uppercase tracking-[0.16em] text-white/30">Treasury</div>
                <div className="mt-2 text-xl font-medium">{n(treasury?.xrp)} XRP</div>
                <div className="mt-1 text-[11px] text-white/35">{n(treasury?.availableXrp)} available</div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="text-[9px] uppercase tracking-[0.16em] text-white/30">Hot Minter</div>
                <div className="mt-2 text-xl font-medium">{n(hotMinter?.xrp)} XRP</div>
                <div className="mt-1 text-[11px] text-white/35">{n(hotMinter?.availableXrp)} available</div>
              </div>
            </section>

            <section className="rounded-[24px] border border-cyan-300/10 bg-cyan-400/[0.025] p-4">
              <div className="text-[9px] uppercase tracking-[0.18em] text-cyan-100/40">Company</div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[9px] text-white/28">Cash</div>
                  <div className="mt-1 text-sm font-medium">{n(data?.cashTotalXrp)} XRP</div>
                </div>
                <div>
                  <div className="text-[9px] text-white/28">Available</div>
                  <div className="mt-1 text-sm font-medium">{n(data?.availableTotalXrp)} XRP</div>
                </div>
                <div>
                  <div className="text-[9px] text-white/28">Reserved</div>
                  <div className="mt-1 text-sm font-medium">{n(data?.reservedTotalXrp)} XRP</div>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-violet-300/10 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.10),transparent_40%),rgba(255,255,255,0.02)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-violet-100/40">ORIGIN #111</div>
                  <div className="mt-1 text-lg font-medium">{origin?.verified ? "Verified on mainnet" : "Not verified"}</div>
                </div>
                <div className={`rounded-full border px-3 py-1 text-[10px] ${origin?.verified ? "border-emerald-300/15 bg-emerald-400/10 text-emerald-100/70" : "border-amber-300/15 bg-amber-400/10 text-amber-100/70"}`}>
                  {origin?.verified ? "VERIFIED" : "CHECK"}
                </div>
              </div>
              <div className="mt-3 space-y-1 text-[11px] text-white/35">
                <div>Issuer · {short(origin?.issuer)}</div>
                <div>Owner · {short(origin?.owner)}</div>
                <div>Token · {short(origin?.nftokenId)}</div>
              </div>
            </section>

            <section className="rounded-[24px] border border-amber-300/10 bg-amber-400/[0.025] p-4">
              <div className="text-[9px] uppercase tracking-[0.18em] text-amber-100/40">Open listing</div>
              {listing ? (
                <>
                  <div className="mt-2 flex items-baseline justify-between gap-3">
                    <div className="text-base font-medium">{listing.nftName}</div>
                    <div className="text-xl font-medium text-amber-100/80">{n(listing.askingPriceXrp)} XRP</div>
                  </div>
                  <div className="mt-2 text-[10px] leading-relaxed text-amber-100/35">Asking price is not counted as an asset. Only realized sales count.</div>
                </>
              ) : (
                <div className="mt-2 text-sm text-white/45">No open listing detected.</div>
              )}
            </section>

            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4 text-[10px] text-white/30">
              <div>Source: XRPL mainnet · read-only</div>
              <div className="mt-1">Generated: {new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}</div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
