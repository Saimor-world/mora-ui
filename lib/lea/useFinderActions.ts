'use client';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { corePost } from '@/lib/api/http';
import { uploadCompanyFile } from '@/lib/api/filesClient';
import type { FPlanet } from './finder';

/**
 * Anlegen im Finder über die bestehenden CORE-Endpunkte (wie apps/finder):
 * POST /v3/spaces, POST /v3/folders, POST /v3/nodes, POST /v3/files/upload.
 * Hat eine Abteilung noch keinen Bereich, wird zuerst „<Abteilung> Ablage“ angelegt.
 */
export function useFinderActions(companyId: string | null) {
  const qc = useQueryClient();
  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['lea-world'] });
  }, [qc]);

  const createFolder = useCallback(async (planet: FPlanet, name: string) => {
    let spaceId = planet.spaces[0]?.id;
    if (!spaceId) {
      if (planet.kind !== 'department') throw new Error('Kein Bereich');
      // CORE lehnt Bereichsnamen ab, die dem Abteilungsnamen gleichen (name_conflict).
      const space = await corePost('/v3/spaces', { department_id: planet.id, name: `${planet.name} Ablage`, company_id: companyId ?? undefined });
      spaceId = space?.data?.id ?? space?.id;
      if (!spaceId) throw new Error('Bereich nicht angelegt');
    }
    const folder = await corePost('/v3/folders', { space_id: spaceId, name, company_id: companyId ?? undefined });
    refresh();
    return folder?.data ?? folder;
  }, [companyId, refresh]);

  const createNote = useCallback(async (folderId: string, title: string) => {
    const node = await corePost('/v3/nodes', { folder_id: folderId, name: title, type: 'note', content: '', company_id: companyId ?? undefined });
    refresh();
    return node?.data ?? node;
  }, [companyId, refresh]);

  const upload = useCallback(async (folderId: string, file: File) => {
    if (!companyId) throw new Error('Keine Firma');
    const rec = await uploadCompanyFile(file, companyId, 'private', folderId);
    refresh();
    return rec;
  }, [companyId, refresh]);

  return { createFolder, createNote, upload, refresh };
}
