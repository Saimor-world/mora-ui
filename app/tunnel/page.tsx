import { TunnelPageClient } from '@/components/tunnel/TunnelPageClient';
import MoraAlive from '@/components/mora/alive/MoraAlive';

export default async function TunnelPage({ searchParams }: { searchParams: Promise<{ mora?: string }> }) {
  const params = await searchParams;
  return params.mora === 'alive' ? <MoraAlive /> : <TunnelPageClient />;
}
