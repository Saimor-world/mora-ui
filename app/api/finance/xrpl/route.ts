import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAccountSnapshot,
  fetchCompanyAccounts,
  fetchOriginNftStatus,
  fetchServerInfo,
  KNOWN_ACCOUNTS,
} from '@/lib/finance';

const XRPL_ADDRESS_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim() || '';
  const mode = request.nextUrl.searchParams.get('mode') || 'single';

  if (mode === 'company') {
    try {
      const [accounts, serverInfo, originNft] = await Promise.all([
        fetchCompanyAccounts(),
        fetchServerInfo(),
        fetchOriginNftStatus(),
      ]);

      const treasury = accounts.find(a => a.role.type === 'SAIMOR_SOVEREIGN_TREASURY');
      const hotMinter = accounts.find(a => a.role.type === 'SAIMOR_ORIGIN_HOT_MINTER');

      return NextResponse.json({
        mode: 'company',
        network: 'mainnet',
        accessMode: 'read-only',
        reserve: {
          baseXrp: serverInfo.reserveBaseXrp,
          incrementXrp: serverInfo.reserveIncrementXrp,
        },
        validatedLedger: serverInfo.validatedLedger,
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
          evidence: hotMinter.evidence,
          error: hotMinter.error,
        } : null,
        originNft: {
          nftokenId: originNft.nftokenId,
          name: 'SAIMÔR // ORIGIN #111 — Klarheit im Wandel',
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
          evidence: originNft.evidence,
        },
        mintingStatus: {
          range: '#001-#110',
          status: 'PAUSED_AWAITING_FINAL_ART',
          note: 'No mint/list/pin code paths should be triggered',
        },
        totals: {
          companyXrp: (treasury?.xrp ?? 0) + (hotMinter?.xrp ?? 0),
          treasuryXrp: treasury?.xrp ?? null,
          hotMinterXrp: hotMinter?.xrp ?? null,
          note: 'Treasury != Hot Minter. Hot Minter is operational, not treasury.',
        },
        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'XRPL request failed';
      return NextResponse.json({ error: message, mode: 'company' }, { status: 502 });
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
