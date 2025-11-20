'use client';

import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { useSpaceStore } from '@/store/spaces';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Space-Aware Insights View
 *
 * Shows workflows and insights filtered to a specific space
 */
export default function SpaceInsightsPage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;
  const { spaces, setCurrentSpace } = useSpaceStore();

  const space = spaces.find(s => s.id === spaceId);

  useEffect(() => {
    if (!space) {
      router.push('/home');
      return;
    }
    setCurrentSpace(spaceId);
  }, [space, spaceId, setCurrentSpace, router]);

  if (!space) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-[#08120e] via-[#0a1612] to-[#06100c]">
        <div className="text-center">
          <div className="text-6xl mb-4">💡</div>
          <p className="text-muted-foreground">Space lädt...</p>
        </div>
      </div>
    );
  }

  return <WorkspaceShell initialMode="field" standaloneInsights spaceId={spaceId} />;
}
