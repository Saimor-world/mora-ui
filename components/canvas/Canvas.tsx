'use client';

import { useAppContext } from '@/lib/contexts';
import FolderMode from './FolderMode';
import FieldMode from './FieldMode';

export default function Canvas() {
  const { mode, setSelectedObject } = useAppContext();

  return (
    <main className="flex-1 bg-background overflow-auto">
      {mode === 'folder' ? (
        <FolderMode />
      ) : (
        <FieldMode onNodeSelect={setSelectedObject} />
      )}
    </main>
  );
}
