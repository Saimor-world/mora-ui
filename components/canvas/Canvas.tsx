'use client';

import { useAppContext } from '@/lib/contexts';
import { useHealthCheck } from '@/lib/hooks/useApi';
import { getHealthFlags } from '@/lib/health';
import { useSearchParams } from 'next/navigation';
import FolderMode from './FolderMode';
import FieldMode from './FieldMode';
import CoreStatusBanner from '@/components/status/CoreStatusBanner';

export default function Canvas() {
  const { mode, setSelectedObject, spaceId } = useAppContext();
  const { data: health, refetch: refetchHealth } = useHealthCheck();
  const { isOffline, isAuthError } = getHealthFlags(health?.status);
  const searchParams = useSearchParams();

  // Parse ?focus=node1,node2 for deep-linking
  const focusParam = searchParams.get('focus');
  const initialFocusIds = focusParam ? focusParam.split(',').map((id) => id.trim()).filter(Boolean) : undefined;

  return (
    <main className="flex-1 bg-background overflow-auto">
      {isOffline || isAuthError ? (
        <div className="flex items-center justify-center min-h-[420px] p-6">
          <CoreStatusBanner
            state={isAuthError ? 'auth' : 'offline'}
            lastChecked={health?.timestamp}
            onRetry={() => refetchHealth()}
          />
        </div>
      ) : mode === 'folder' ? (
        <FolderMode initialFocusId={initialFocusIds?.[0]} spaceId={spaceId} />
      ) : (
        <FieldMode onNodeSelect={setSelectedObject} initialFocusIds={initialFocusIds} spaceId={spaceId} />
      )}
    </main>
  );
}
