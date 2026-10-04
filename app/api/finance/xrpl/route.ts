import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAccountSnapshot,
  fetchCompanyAccounts,
  fetchOriginNftStatus,
  fetchServerInfo,
  aggregateCompanyState,
  buildFinanceFeed,
  buildMoraContext,
  createSnapshot,
  type FinanceSnapshot,
  KNOWN_ACCOUNTS,
  ORIGIN_NFT,
} from '@/lib/finance';

const XRPL_ADDRESS_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const SNAPSHOT_FILE_PATH = path.join(os.tmpdir(), 'saimor-finance-xrpl-snapshot.json');

async function loadPersistedSnapshot(): Promise<FinanceSnapshot | null> {
  try {
    const raw = await fs.readFile(SNAPSHOT_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as FinanceSnapshot;
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.latestTxHashes)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function savePersistedSnapshot(snapshot: FinanceSnapshot): Promise<void> {
  try {
    await fs.writeFile(SNAPSHOT_FILE_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
  } catch {
    // Non-fatal in read-only environments
  }
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim() || '';
  const mode = request.nextUrl.searchParams.get('mode') || 'single';

  if (mode === 'company' || mode === 'feed' || mode === 'mora') {
    try {
      const [accounts, serverInfo, originNft] = await Promise.all([
        fetchCompanyAccounts(),
        fetchServerInfo(),
        fetchOriginNftStatus(),
      ]);

      const companyState = aggregateCompanyState(accounts, originNft);
      const treasury = accounts.find(a => a.role.type === 'SAIMOR_SOVEREIGN_TREASURY');
      const hotMinter = accounts.find(a => a.role.type === 'SAIMOR_ORIGIN_HOT_MINTER');

      if (mode === 'feed') {
        const feed = buildFinanceFeed(companyState, serverInfo);
        return NextResponse.json(feed);
      }

      if (mode === 'mora') {
        const previousSnapshot = await loadPersistedSnapshot();
        const moraContext = buildMoraContext(companyState, previousSnapshot);
        const currentSnapshot = createSnapshot(companyState);
        await savePersistedSnapshot(currentSnapshot);
        return NextResponse.json(moraContext);
      }

      const openListings = companyState.openListings.map(l => ({
        type: l.type,
        offerId: l.offerId,
        nftokenId: l.nftokenId,
        nftName: l.nftName,
        askingPriceXrp: l.askingPriceXrp,
        seller: l.seller,
        destination: l.destination,
        expiration: l.expiration,
        evidence: l.evidence,
        note: 'Asking price is NOT an asset. Only realized sales count.',
      }));

      return NextResponse.json({
        mode: 'company',
        network: 'mainnet',
        accessMode: 'read-only',
        reserve: {
          baseXrp: serverInfo.reserveBaseXrp,
          incrementXrp: serverInfo.reserveIncrementXrp,
          validatedLedger: serverInfo.validatedLedger,
        },
        treasury: treasury ? {
          address: treasury.address,
          role: treasury.role,
          xrp: treasury.xrp,
          availableXrp: treasury.availableXrp,
          reserve: treasury.reserve,
          ownerCount: treasury.reserve.ownerCount,
          sequence: treasury.sequence,
          security: treasury.security,
          trustLines: treasury.trustLines,
          transactions: treasury.transactions,
          breakdown: treasury.breakdown ?? companyState.treasuryBreakdown ?? null,
          evidence: treasury.evidence,
          error: treasury.error,
        } : null,
        hotMinter: hotMinter ? {
          address: hotMinter.address,
          role: hotMinter.role,
          xrp: hotMinter.xrp,
          availableXrp: hotMinter.availableXrp,
          reserve: hotMinter.reserve,
          ownerCount: hotMinter.reserve.ownerCount,
          sequence: hotMinter.sequence,
          security: hotMinter.security,
          trustLines: hotMinter.trustLines,
          transactions: hotMinter.transactions,
          breakdown: hotMinter.breakdown ?? companyState.hotMinterBreakdown ?? null,
          evidence: hotMinter.evidence,
          error: hotMinter.error,
        } : null,
        originNft: {
          nftokenId: originNft.nftokenId,
          name: ORIGIN_NFT.name,
          issuer: originNft.issuer,
          owner: originNft.owner,
          flags: originNft.flags,
          flagsDescription: {
            onlyXrp: (originNft.flags & 0x02) !== 0,
            transferable: (originNft.flags & 0x08) !== 0,
            mutable: (originNft.flags & 0x10) !== 0,
          },
          transferFee: originNft.transferFee,
          transferFeePercent: originNft.transferFee / 1000,
          artIpfs: originNft.artIpfs,
          metadataIpfs: originNft.metadataIpfs,
          status: originNft.status,
          verified: originNft.verified,
          sellOffers: originNft.sellOffers,
          evidence: originNft.evidence,
        },
        openListings,
        aggregates: {
          cashTotalXrp: companyState.cashTotalXrp,
          availableTotalXrp: companyState.availableTotalXrp,
          reservedTotalXrp: companyState.reservedTotalXrp,
          treasuryXrp: companyState.sovereignTreasuryXrp,
          hotMinterXrp: companyState.hotMinterXrp,
          aggregateAskingPriceXrp: companyState.aggregateAskingPriceXrp,
          openListingsCount: companyState.openListingsCount,
          floorPriceXrp: companyState.floorPriceXrp,
          realizedSalesXrp: companyState.realizedSalesXrp,
          note: 'Treasury != Hot Minter. Asking prices NOT counted as assets.',
        },
        mintingStatus: {
          range: '#001-#110',
          status: 'PAUSED_AWAITING_FINAL_ART',
          note: 'No mint/list/pin code paths should be triggered',
        },
        providers: {
          xrpl: {
            status: accounts.some(a => a.evidence.confidence === 'live') ? 'connected' : 'error',
            lastSync: companyState.lastUpdated,
          },
          bank_psd2: { status: 'not_connected' },
          revolut_business: { status: 'not_connected' },
          bitvavo: { status: 'not_connected' },
          xtb: { status: 'not_connected' },
        },
        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'XRPL request failed';
      return NextResponse.json({ error: message, mode }, { status: 502 });
    }
  }

  if (!XRPL_ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: 'Invalid XRPL address' }, { status: 400 });
  }

  const known = address === KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY.address
    ? KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY
    : address === KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.address
      ? KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER
      : null;

  try {
    const snapshot = await fetchAccountSnapshot(address);

    return NextResponse.json({
      mode: 'single',
      network: snapshot.network,
      accessMode: snapshot.mode,
      address: snapshot.address,
      role: snapshot.role,
      owner: snapshot.owner,
      ledgerIndex: snapshot.evidence.ledgerIndex,
      xrp: snapshot.xrp,
      drops: snapshot.drops,
      availableXrp: snapshot.availableXrp,
      reserve: snapshot.reserve,
      ownerCount: snapshot.reserve.ownerCount,
      sequence: snapshot.sequence,
      security: snapshot.security,
      trustLines: snapshot.trustLines,
      transactions: snapshot.transactions,
      breakdown: snapshot.breakdown ?? null,
      evidence: snapshot.evidence,
      error: snapshot.error,
      fetchedAt: snapshot.evidence.fetchedAt,
      knownAccount: known ? {
        label: known.role.label,
        description: known.role.description,
        owner: known.owner,
      } : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'XRPL request failed';
    return NextResponse.json({ error: message, mode: 'single' }, { status: 502 });
  }
}
