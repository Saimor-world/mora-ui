'use client';
import { AppLoader } from '@/lib/apps/AppLoader';

// Re-export utility functions so existing test imports stay stable.
export { splitAtPlannedSteps, groupStepsBySegment } from '@/apps/work-session';

interface Props { id: string; data?: Record<string, unknown>; }

export function WorkSessionPane({ id, data }: Props) {
  return <AppLoader appId="work-session" paneId={id} initialData={data ?? {}} />;
}

export default WorkSessionPane;
