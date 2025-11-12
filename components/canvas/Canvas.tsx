'use client';

import { useAppContext } from '@/lib/contexts';
import { useHealthCheck } from '@/lib/hooks/useApi';
import FolderMode from './FolderMode';
import FieldMode from './FieldMode';
import CoreOfflineMessage from '@/components/errors/CoreOfflineMessage';

const OFFLINE_STATUSES = new Set(['unreachable', 'error', 'unauthorized']);

export default function Canvas() {
  const { mode, setSelectedObject } = useAppContext();
  const { data: health, refetch: refetchHealth } = useHealthCheck();
  const healthStatus = (health?.status || '').toString().toLowerCase();
  const isOffline = OFFLINE_STATUSES.has(healthStatus);

  return (
    <main className="flex-1 bg-background overflow-auto">
      {isOffline ? (
        <CoreOfflineMessage
          error={new Error('Core API nicht erreichbar')}
          onRetry={() => refetchHealth()}
        />
      ) : mode === 'folder' ? (
        <FolderMode />
      ) : (
        <FieldMode onNodeSelect={setSelectedObject} />
      )}
    </main>
  );
}
