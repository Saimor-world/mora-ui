/**
 * XRPL Provider - Read-only mainnet access
 *
 * HARD RULES:
 * - Read-only: account_info, account_lines, account_tx, account_nfts, account_objects, server_info
 * - NO signing, NO transactions, NO Payment, NO NFTokenMint/Burn/Modify, NO offers, NO AccountSet, NO TrustSet
 * - NO seeds, NO private keys in any form
 * - Configurable endpoint with fallback
 * - All values must have evidence tracking
 */

import type {
  XrplAccountSnapshot,
  XrplReserve,
  XrplTrustLine,
  XrplTransaction,
  XrplAccountSecurity,
  XrplAccountRole,
  FinanceOwner,
  FinanceEvidence,
  OriginNftStatus,
} from './types';
import { KNOWN_ACCOUNTS, ORIGIN_NFT } from './types';

const XRPL_ENDPOINTS = [
  process.env.XRPL_RPC_URL || 'https://xrplcluster.com',
  'https://s1.ripple.com:51234',
  'https://s2.ripple.com:51234',
];

const XRPL_ADDRESS_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

interface XrplRpcResponse<T> {
  result: T;
  error?: string;
  error_message?: string;
}

async function xrplRpc<T>(
  method: string,
  params: Record<string, unknown>,
  endpointIndex = 0,
  retryCount = 0,
): Promise<T> {
  const endpoint = XRPL_ENDPOINTS[endpointIndex] || XRPL_ENDPOINTS[0];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method, params: [{ ...params, api_version: 2 }] }),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`XRPL RPC returned ${response.status}`);
    }

    const payload: XrplRpcResponse<T> = await response.json();
    const result = payload?.result;
    if (result && typeof result === 'object' && 'status' in result && (result as Record<string, unknown>).status === 'error') {
      const resultObj = result as Record<string, unknown>;
      const errorMsg = String(resultObj.error_message || resultObj.error || 'XRPL RPC error');
      throw new Error(errorMsg);
    }
    if (payload?.error) {
      throw new Error(payload.error_message || payload.error);
    }

    return payload.result;
  } catch (error) {
    clearTimeout(timeout);

    const isNetworkError = error instanceof Error && (
      error.name === 'AbortError' ||
      error.message.includes('fetch') ||
      error.message.includes('network')
    );

    if (isNetworkError && endpointIndex < XRPL_ENDPOINTS.length - 1) {
      return xrplRpc(method, params, endpointIndex + 1, 0);
    }

    if (retryCount < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return xrplRpc(method, params, endpointIndex, retryCount + 1);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function getKnownAccountRole(address: string): { role: XrplAccountRole; owner: FinanceOwner } | null {
  if (address === KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY.address) {
    return {
      role: KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY.role,
      owner: KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY.owner,
    };
  }
  if (address === KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.address) {
    return {
      role: KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.role,
      owner: KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.owner,
    };
  }
  return null;
}

function parseDeliveredAmount(entry: any, tx: any): unknown {
  const metaDelivered = entry?.meta?.delivered_amount ?? entry?.meta?.DeliveredAmount;
  if (metaDelivered && metaDelivered !== 'unavailable') return metaDelivered;
  return tx?.DeliverMax ?? tx?.Amount ?? null;
}

function normalizeTransaction(entry: any, address: string): XrplTransaction {
  const tx = entry?.tx_json || entry?.tx || {};
  const destinationTag = Number.isInteger(tx?.DestinationTag) ? Number(tx.DestinationTag) : null;
  const SAIMOR_COMMERCE_TAG_MIN = 0x53000000;
  const SAIMOR_COMMERCE_TAG_MAX = 0x53ffffff;
  const commerce = destinationTag !== null
    && destinationTag >= SAIMOR_COMMERCE_TAG_MIN
    && destinationTag <= SAIMOR_COMMERCE_TAG_MAX;

  return {
    hash: String(entry?.hash || tx?.hash || ''),
    ledgerIndex: Number(entry?.ledger_index || 0) || null,
    closeTimeIso: entry?.close_time_iso || null,
    type: String(tx?.TransactionType || 'Unknown'),
    direction: tx?.Account === address ? 'out' : 'in',
    account: String(tx?.Account || ''),
    destination: tx?.Destination ? String(tx.Destination) : null,
    destinationTag,
    invoiceId: tx?.InvoiceID ? String(tx.InvoiceID) : null,
    amount: parseDeliveredAmount(entry, tx),
    result: String(entry?.meta?.TransactionResult || entry?.meta?.transaction_result || ''),
    validated: entry?.validated !== false,
    commerce,
  };
}

export async function fetchServerInfo(): Promise<{
  reserveBaseXrp: number;
  reserveIncrementXrp: number;
  validatedLedger: number;
  closeTimeIso: string | null;
}> {
  const result = await xrplRpc<any>('server_info', {});
  const validatedLedger = result?.info?.validated_ledger || result?.info?.closed_ledger || {};

  return {
    reserveBaseXrp: Number(validatedLedger?.reserve_base_xrp || 1),
    reserveIncrementXrp: Number(validatedLedger?.reserve_inc_xrp || 0.2),
    validatedLedger: Number(validatedLedger?.seq || 0),
    closeTimeIso: validatedLedger?.close_time_iso || null,
  };
}

export async function fetchAccountSnapshot(
  address: string,
  ownerOverride?: FinanceOwner,
  roleOverride?: XrplAccountRole,
): Promise<XrplAccountSnapshot> {
  if (!XRPL_ADDRESS_RE.test(address)) {
    throw new Error('Invalid XRPL address format');
  }

  const known = getKnownAccountRole(address);
  const owner = ownerOverride ?? known?.owner ?? 'personal';
  const role = roleOverride ?? known?.role ?? {
    type: 'UNKNOWN' as const,
    label: 'Unknown Account',
    description: 'Account role not configured',
  };

  const fetchedAt = new Date().toISOString();

  try {
    const [accountInfo, lines, server, history] = await Promise.all([
      xrplRpc<any>('account_info', { account: address, ledger_index: 'validated', signer_lists: true }),
      xrplRpc<any>('account_lines', { account: address, ledger_index: 'validated', limit: 400 }),
      xrplRpc<any>('server_info', {}),
      xrplRpc<any>('account_tx', {
        account: address,
        ledger_index_min: -1,
        ledger_index_max: -1,
        binary: false,
        limit: 50,
        forward: false,
      }),
    ]);

    const accountData = accountInfo?.account_data || {};
    const drops = BigInt(accountData?.Balance || '0');
    const xrp = Number(drops) / 1_000_000;
    const ownerCount = Number(accountData?.OwnerCount || 0);
    const accountFlags = Number(accountData?.Flags || 0);

    const validatedLedger = server?.info?.validated_ledger || server?.info?.closed_ledger || {};
    const reserveBaseXrp = Number(validatedLedger?.reserve_base_xrp || 1);
    const reserveIncrementXrp = Number(validatedLedger?.reserve_inc_xrp || 0.2);
    const reserveRequiredXrp = reserveBaseXrp + ownerCount * reserveIncrementXrp;
    const availableXrp = Math.max(0, xrp - reserveRequiredXrp);

    const LSF_DISABLE_MASTER = 0x00100000;
    const security: XrplAccountSecurity = {
      accountFlags,
      masterKeyDisabled: (accountFlags & LSF_DISABLE_MASTER) !== 0,
      regularKey: accountData?.RegularKey ? String(accountData.RegularKey) : null,
      signerListCount: Array.isArray(accountInfo?.signer_lists) ? accountInfo.signer_lists.length : 0,
    };

    const reserve: XrplReserve = {
      baseXrp: reserveBaseXrp,
      incrementXrp: reserveIncrementXrp,
      requiredXrp: reserveRequiredXrp,
      ownerCount,
    };

    const trustLines: XrplTrustLine[] = Array.isArray(lines?.lines)
      ? lines.lines.map((line: any) => ({
          currency: String(line.currency || ''),
          balance: String(line.balance || '0'),
          issuer: String(line.account || ''),
          limit: String(line.limit || '0'),
          noRipple: Boolean(line.no_ripple),
          freeze: Boolean(line.freeze),
          authorized: line.authorized === undefined ? null : Boolean(line.authorized),
        }))
      : [];

    const transactions: XrplTransaction[] = Array.isArray(history?.transactions)
      ? history.transactions.map((entry: any) => normalizeTransaction(entry, address))
      : [];

    const evidence: FinanceEvidence = {
      source: 'xrpl_mainnet',
      fetchedAt,
      ledgerIndex: accountInfo?.ledger_index ?? lines?.ledger_index ?? null,
      validatedLedger: validatedLedger?.seq ?? null,
      confidence: 'live',
    };

    return {
      address,
      owner,
      role,
      network: 'mainnet',
      mode: 'read-only',
      xrp,
      drops: drops.toString(),
      availableXrp,
      reserve,
      sequence: Number(accountData?.Sequence || 0),
      security,
      trustLines,
      transactions,
      evidence,
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'XRPL request failed';
    const isUnfunded = errorMessage.includes('actNotFound') || errorMessage.includes('Account not found');

    return {
      address,
      owner,
      role,
      network: 'mainnet',
      mode: 'read-only',
      xrp: 0,
      drops: '0',
      availableXrp: 0,
      reserve: { baseXrp: 1, incrementXrp: 0.2, requiredXrp: 1, ownerCount: 0 },
      sequence: 0,
      security: { accountFlags: 0, masterKeyDisabled: false, regularKey: null, signerListCount: 0 },
      trustLines: [],
      transactions: [],
      evidence: {
        source: 'xrpl_mainnet',
        fetchedAt,
        ledgerIndex: null,
        validatedLedger: null,
        confidence: isUnfunded ? 'live' : 'stale',
      },
      error: isUnfunded ? 'Account not funded on mainnet' : errorMessage,
    };
  }
}

export async function fetchAccountNfts(address: string): Promise<any[]> {
  if (!XRPL_ADDRESS_RE.test(address)) {
    return [];
  }

  try {
    const result = await xrplRpc<any>('account_nfts', { account: address, ledger_index: 'validated' });
    return Array.isArray(result?.account_nfts) ? result.account_nfts : [];
  } catch {
    return [];
  }
}

export async function fetchOriginNftStatus(): Promise<OriginNftStatus> {
  const fetchedAt = new Date().toISOString();

  try {
    const nfts = await fetchAccountNfts(ORIGIN_NFT.issuer);
    const found = nfts.find((nft: any) => nft.NFTokenID === ORIGIN_NFT.nftokenId);

    if (found) {
      return {
        nftokenId: ORIGIN_NFT.nftokenId,
        issuer: ORIGIN_NFT.issuer,
        owner: found.Owner || null,
        flags: found.Flags ?? ORIGIN_NFT.flags,
        transferFee: found.TransferFee ?? ORIGIN_NFT.transferFee,
        taxon: found.NFTokenTaxon ?? 0,
        uri: found.URI ? Buffer.from(found.URI, 'hex').toString('utf8') : null,
        status: 'LIVE_GENESIS_MAINNET_PROOF',
        artIpfs: ORIGIN_NFT.artIpfs,
        metadataIpfs: ORIGIN_NFT.metadataIpfs,
        verified: true,
        evidence: {
          source: 'xrpl_mainnet_nft_lookup',
          fetchedAt,
          ledgerIndex: null,
          validatedLedger: null,
          confidence: 'live',
        },
      };
    }

    return {
      nftokenId: ORIGIN_NFT.nftokenId,
      issuer: ORIGIN_NFT.issuer,
      owner: null,
      flags: ORIGIN_NFT.flags,
      transferFee: ORIGIN_NFT.transferFee,
      taxon: 0,
      uri: null,
      status: 'UNKNOWN',
      artIpfs: ORIGIN_NFT.artIpfs,
      metadataIpfs: ORIGIN_NFT.metadataIpfs,
      verified: false,
      evidence: {
        source: 'xrpl_mainnet_nft_lookup',
        fetchedAt,
        ledgerIndex: null,
        validatedLedger: null,
        confidence: 'stale',
      },
    };
  } catch (error) {
    return {
      nftokenId: ORIGIN_NFT.nftokenId,
      issuer: ORIGIN_NFT.issuer,
      owner: null,
      flags: ORIGIN_NFT.flags,
      transferFee: ORIGIN_NFT.transferFee,
      taxon: 0,
      uri: null,
      status: 'UNKNOWN',
      artIpfs: ORIGIN_NFT.artIpfs,
      metadataIpfs: ORIGIN_NFT.metadataIpfs,
      verified: false,
      evidence: {
        source: 'xrpl_mainnet_nft_lookup',
        fetchedAt,
        ledgerIndex: null,
        validatedLedger: null,
        confidence: 'stale',
      },
    };
  }
}

export async function fetchCompanyAccounts(): Promise<XrplAccountSnapshot[]> {
  const [treasury, hotMinter] = await Promise.all([
    fetchAccountSnapshot(KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY.address),
    fetchAccountSnapshot(KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.address),
  ]);

  return [treasury, hotMinter];
}
