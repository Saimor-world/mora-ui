'use client';
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, FailureState, Loading, Stack, Status, Surface, Text } from '@/components/os-kit';
import { ownerConsoleClient, type ManagedCompany, type ManagedUser, type OwnerRole, type UserUpdate } from '@/lib/api/ownerConsoleClient';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDemoStore } from '@/lib/demo/demoStore';
import { getDataScopeKey, useDataScopeKey } from '@/lib/store/dataScope';
import { classifyCoreFailure } from '@/lib/os-prototype/coreFailure';

const ROLES: Record<OwnerRole, string> = { system_owner: 'Systeminhaber', owner: 'Inhaber', admin: 'Administrator', manager: 'Leitung', member: 'Mitglied', demo: 'Demo' };

export default function AdministrationSurface() {
  const role = useSessionStore((s) => s.user?.role);
  const demo = useDemoStore((s) => s.demoCompanyId);
  const scope = useDataScopeKey();
  const allowed = role === 'system_owner' && !demo;
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<'users' | 'companies'>('users');
  const users = useQuery({ queryKey: ['owner-console', 'users', scope], queryFn: ownerConsoleClient.users, enabled: allowed, retry: false });
  const companies = useQuery({ queryKey: ['owner-console', 'companies', scope], queryFn: ownerConsoleClient.companies, enabled: allowed, retry: false });
  if (!allowed) return <FailureState kind="denied" compact />;
  const selectedUser = users.data?.find((u) => u.id === selected);
  const needle = filter.trim().toLocaleLowerCase('de');
  const matches = (values: Array<string | null>) => values.some((v) => v?.toLocaleLowerCase('de').includes(needle));
  return (
    <div className="flex flex-col gap-5" data-testid="feature-administration">
      <header><Text variant="eyebrow">Systemverwaltung · echte CORE-Daten</Text><Text variant="display">Accounts & Firmen</Text>
        <Text className="mt-2">Diese Übersicht umfasst die Mandanten dieser Instanz. Firmeninhalte bleiben in ihrem jeweiligen Arbeitsbereich.</Text></header>
      <div className="os-tabs" role="tablist" aria-label="Verwaltung">
        <button className="os-tab" role="tab" aria-selected={tab === 'users'} onClick={() => setTab('users')}>Accounts ({users.data?.length ?? '…'})</button>
        <button className="os-tab" role="tab" aria-selected={tab === 'companies'} onClick={() => setTab('companies')}>Firmen ({companies.data?.length ?? '…'})</button>
      </div>
      <label>Accounts und Firmen filtern<input className="os-input mt-2 w-full" type="search" value={filter} onChange={(e) => setFilter(e.target.value)} /></label>
      <Stack direction="row" gap={3} wrap><Button size="sm" variant="ghost" onClick={() => { void users.refetch(); void companies.refetch(); }}>Neu laden</Button>
        <Text variant="meta">Kein Passwort und kein Zugangsschlüssel wird hier angezeigt.</Text></Stack>
      {(users.isLoading || companies.isLoading) ? <Loading lines={4} /> : null}
      {(users.isError || companies.isError) ? <FailureState kind={classifyCoreFailure(users.error ?? companies.error)} compact /> : null}
      {users.data?.length === 250 || companies.data?.length === 200 ? <Text role="status">Die Obergrenze der Abfrage ist erreicht. Die Liste ist möglicherweise unvollständig.</Text> : null}
      {tab === 'users' && users.data ? <Surface padding={4}><div className="os-list">
        {users.data.filter((u) => matches([u.full_name, u.email, u.tenant_id])).map((u) => <button key={u.id} type="button" className="os-list-row text-left" onClick={() => setSelected(u.id)} aria-label={`Account ${u.email} verwalten`}>
          <div className="min-w-0"><Text className="break-all">{u.full_name || u.email}</Text><Text variant="meta" className="break-all">{u.email} · {u.tenant_id}</Text></div>
          <div><Text>{ROLES[u.role] ?? u.role}</Text><Status tone={u.is_active ? 'safe' : 'neutral'}>{u.is_active ? 'aktiv' : 'deaktiviert'}</Status></div>
        </button>)}
        {!users.data.length ? <Text>CORE meldet keine Accounts.</Text> : null}
      </div></Surface> : null}
      {tab === 'companies' && companies.data ? <Surface padding={4}><div className="os-list">
        {companies.data.filter((c) => matches([c.name, c.tenant_id])).map((c) => <div className="os-list-row" key={c.id}><div><Text>{c.name}</Text><Text variant="meta" className="break-all">{c.tenant_id} · {c.id}</Text></div><Status>{c.is_demo ? 'Demo' : 'Echte Firma'}</Status></div>)}
        <Text variant="meta">Gleiche Namen in verschiedenen Mandanten sind getrennte Firmen. Diese Übersicht führt keine Daten zusammen.</Text>
      </div></Surface> : null}
      {selectedUser ? <AccountEditor key={selectedUser.id} user={selectedUser} companies={companies.data ?? []} scope={scope} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function AccountEditor({ user, companies, scope, onClose }: { user: ManagedUser; companies: ManagedCompany[]; scope: string; onClose: () => void }) {
  const actor = useSessionStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [name, setName] = useState(user.full_name ?? '');
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(user.is_active);
  const [company, setCompany] = useState(user.default_company_id ?? '');
  const [review, setReview] = useState<UserUpdate | null>(null);
  const [receipt, setReceipt] = useState(false);
  const own = actor === user.id;
  const save = useMutation({
    mutationFn: async (changes: UserUpdate) => {
      if (scope !== getDataScopeKey()) throw new Error('Der Arbeitskontext hat sich geändert.');
      return ownerConsoleClient.updateUser(user.id, changes);
    },
    onSuccess: (updated) => {
      if (scope !== getDataScopeKey()) return;
      queryClient.setQueryData<ManagedUser[]>(['owner-console', 'users', scope], (old) => old?.map((u) => u.id === updated.id ? updated : u));
      setReview(null); setReceipt(true);
    },
  });
  return <Surface padding={5}>
    <Text variant="title">Account verwalten</Text><Text className="break-all">{user.email}</Text><Text variant="meta">Mandant: {user.tenant_id} · E-Mail {user.email_verified ? 'bestätigt' : 'nicht bestätigt'}</Text>
    <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setReceipt(false); save.reset(); setReview({ full_name: name.trim(), role, is_active: active, default_company_id: company }); }}>
      <label>Name<input className="os-input mt-1 w-full" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></label>
      <label>Rolle<select className="os-input mt-1 w-full" value={role} disabled={own || save.isPending} onChange={(e) => setRole(e.target.value as OwnerRole)}>{Object.entries(ROLES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label>Standardfirma<select className="os-input mt-1 w-full" value={company} onChange={(e) => setCompany(e.target.value)}><option value="">Keine festgelegt</option>{companies.filter((c) => c.tenant_id === user.tenant_id).map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_demo ? ' · Demo' : ''}</option>)}</select></label>
      <label><input type="checkbox" checked={active} disabled={own || save.isPending} onChange={(e) => setActive(e.target.checked)} /> Account aktiv</label>
      {own ? <Text variant="meta">Deinen eigenen Systemzugang kannst du hier weder deaktivieren noch herabstufen.</Text> : null}
      <Stack direction="row" gap={3}><Button type="submit" disabled={save.isPending}>Änderung prüfen</Button><Button variant="ghost" onClick={onClose} disabled={save.isPending}>Schließen</Button></Stack>
    </form>
    {review ? <div className="mt-4" role="group" aria-label="Änderung bestätigen"><Text>Für {user.email} speichern: Name „{review.full_name || 'ohne Namen'}“, Rolle {ROLES[review.role]}, {review.is_active ? 'aktiv' : 'deaktiviert'}, Standardfirma {companies.find((c) => c.id === review.default_company_id)?.name || 'keine'}.</Text><Text variant="meta">CORE prüft die Rechte und schützt den letzten aktiven Inhaber.</Text><Button className="mt-3" onClick={() => save.mutate(review)} disabled={save.isPending}>{save.isPending ? 'CORE bestätigt …' : 'Jetzt speichern'}</Button></div> : null}
    {save.isError ? <Text role="alert" className="mt-3">Änderung nicht bestätigt. Bitte neu laden, bevor du sie erneut ausführst.</Text> : null}
    {receipt ? <Text role="status" className="mt-3">Von CORE gespeichert.</Text> : null}
  </Surface>;
}
