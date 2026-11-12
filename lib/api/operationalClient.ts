import { CoreError, coreRequest } from './http';

export interface OperationalProcessDto {
  id: string;
  company_id: string;
  process_key: string;
  process_type: string;
  title: string;
  current_step: string;
  version: number;
  state: Record<string, unknown>;
  created_by_user_id: string;
  updated_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface OperationalProcessEventDto {
  id: string;
  company_id: string;
  process_id: string;
  idempotency_key: string;
  action: string;
  from_step: string | null;
  to_step: string;
  station: string;
  safety_level: 'routine' | 'buchung' | 'freigabe';
  actor_user_id: string;
  actor_name: string;
  actor_role: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface OperationalLedgerEntryDto {
  id: string;
  company_id: string;
  process_id: string | null;
  idempotency_key: string;
  kind: string;
  station: string;
  label: string;
  amount_cents: number;
  currency: string;
  safety_level: 'routine' | 'buchung' | 'freigabe';
  reference_id: string | null;
  actor_user_id: string;
  actor_name: string;
  actor_role: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface OperationalStateDto {
  company_id: string;
  company_name: string;
  is_demo: boolean;
  currency: string;
  base_till_cents: number;
  booked_revenue_cents: number;
  total_till_cents: number;
  receipts_count: number;
  processes: OperationalProcessDto[];
  events: OperationalProcessEventDto[];
  ledger_entries: OperationalLedgerEntryDto[];
}

export interface OperationalReceiptDto {
  kind: string;
  id?: string;
  process_id?: string;
  company_id: string;
  persisted: boolean;
  replayed?: boolean;
}

interface OperationalEnvelope<T> {
  data: T;
  meta: { api_version: string; generated_at: string; truth_contract?: string };
  receipt?: OperationalReceiptDto;
}

async function strictOperationalCall<T>(
  path: string,
  options: { method: 'GET' | 'POST' | 'PUT'; body?: unknown }
): Promise<OperationalEnvelope<T>> {
  const res = await coreRequest(path, {
    method: options.method,
    body: options.body,
    throwAuthErrors: true,
    preserveEnvelope: true,
  });

  if (!res || typeof res !== 'object' || !('data' in res)) {
    throw new CoreError('CORE nicht erreichbar oder ungültige Server-Antwort', 503);
  }
  return res as OperationalEnvelope<T>;
}

export async function fetchOperationalState(companyId: string): Promise<OperationalStateDto> {
  const envelope = await strictOperationalCall<OperationalStateDto>(
    `/v3/operational/state?company_id=${encodeURIComponent(companyId)}`,
    { method: 'GET' }
  );
  return envelope.data;
}

export async function ensureOperationalProcess(payload: {
  company_id: string;
  process_key: string;
  process_type: string;
  title: string;
}): Promise<{ process: OperationalProcessDto; state: OperationalStateDto; receipt: OperationalReceiptDto }> {
  const envelope = await strictOperationalCall<{ process: OperationalProcessDto; state: OperationalStateDto }>(
    '/v3/operational/processes',
    { method: 'POST', body: payload }
  );
  if (!envelope.receipt?.persisted) {
    throw new CoreError('CORE-Speicherbestätigung fehlt (Prozess)', 502);
  }
  return { ...envelope.data, receipt: envelope.receipt };
}

export async function transitionOperationalProcess(
  processId: string,
  payload: {
    company_id: string;
    action: string;
    station: string;
    expected_version: number;
    idempotency_key: string;
    amount_cents?: number;
    payload?: Record<string, unknown>;
  }
): Promise<{
  process: OperationalProcessDto;
  event: OperationalProcessEventDto;
  ledger_entry: OperationalLedgerEntryDto | null;
  state: OperationalStateDto;
  receipt: OperationalReceiptDto;
}> {
  const envelope = await strictOperationalCall<{
    process: OperationalProcessDto;
    event: OperationalProcessEventDto;
    ledger_entry: OperationalLedgerEntryDto | null;
    state: OperationalStateDto;
  }>(`/v3/operational/processes/${encodeURIComponent(processId)}/transition`, {
    method: 'POST',
    body: payload,
  });
  if (!envelope.receipt?.persisted) {
    throw new CoreError('CORE-Speicherbestätigung fehlt (Transition)', 502);
  }
  return { ...envelope.data, receipt: envelope.receipt };
}

export async function createOperationalLedgerEntry(payload: {
  company_id: string;
  idempotency_key: string;
  kind: string;
  station: string;
  label: string;
  amount_cents: number;
  safety_level: 'routine' | 'buchung' | 'freigabe';
  reference_id?: string | null;
  meta?: Record<string, unknown>;
}): Promise<{
  ledger_entry: OperationalLedgerEntryDto;
  state: OperationalStateDto;
  receipt: OperationalReceiptDto;
}> {
  const envelope = await strictOperationalCall<{
    ledger_entry: OperationalLedgerEntryDto;
    state: OperationalStateDto;
  }>('/v3/operational/ledger/entries', {
    method: 'POST',
    body: payload,
  });
  if (!envelope.receipt?.persisted) {
    throw new CoreError('CORE-Speicherbestätigung fehlt (Buchung)', 502);
  }
  return { ...envelope.data, receipt: envelope.receipt };
}
