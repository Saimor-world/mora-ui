'use client';

import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { useSpaceStore } from '@/store/spaces';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Space-Aware Field View
 *
 * Shows the mycelium graph filtered to a specific space
 */
export default function SpaceFieldPage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;
  const { spaces, setCurrentSpace } = useSpaceStore();

  // Find the space
  const space = spaces.find(s => s.id === spaceId);

  useEffect(() => {
    if (!space) {
      // Space doesn't exist, redirect to home
      router.push('/home');
      return;
    }

    // Set as current space
    setCurrentSpace(spaceId);
  }, [space, spaceId, setCurrentSpace, router]);

  if (!space) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-[#08120e] via-[#0a1612] to-[#06100c]">
        <div className="text-center">
          <div className="text-6xl mb-4">🍄</div>
          <p className="text-muted-foreground">Space lädt...</p>
        </div>
      </div>
    );
  }

  return <WorkspaceShell initialMode="field" spaceId={spaceId} />;
}
