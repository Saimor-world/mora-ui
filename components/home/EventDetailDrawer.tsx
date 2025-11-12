'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { MoraEvent } from '@/lib/mora/listener';
import SideDrawer from '@/components/ui/SideDrawer';
import { showToast } from '@/lib/toast';

interface EventDetailDrawerProps {
  event: MoraEvent | null;
  open: boolean;
  onClose: () => void;
}

export default function EventDetailDrawer({ event, open, onClose }: EventDetailDrawerProps) {
  const router = useRouter();
  const meta = useMemo(() => (event ? createMeta(event) : null), [event]);

  const handleCopyPath = async () => {
    if (!meta?.path) return;
    try {
      await navigator.clipboard.writeText(meta.path);
      showToast({ message: 'Pfad kopiert', variant: 'info' });
    } catch {
      showToast({ message: 'Kopieren fehlgeschlagen', variant: 'error' });
    }
  };

  const handleNavigate = () => {
    if (!meta) return;
    router.push(meta.href ?? '/folder');
    onClose();
  };

  const handleChipClick = (type: 'tag' | 'orb', value: string) => {
    const params = new URLSearchParams();
    if (type === 'tag') {
      params.set('tag', value);
    } else {
      params.set('orb', value);
    }
    router.push(`/folder?${params.toString()}`);
    onClose();
  };

  return (
    <SideDrawer
      open={open && Boolean(meta)}
      title={meta?.title ?? 'Event'}
      description={meta?.subtitle}
      onClose={onClose}
    >
      {meta && (
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{meta.icon}</span>
            <span>{meta.typeLabel}</span>
          </div>

          {meta.path && (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Pfad</div>
              <code className="text-xs break-all bg-muted/40 px-2 py-1 rounded">{meta.path}</code>
            </div>
          )}

          {meta.tags.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Tags</div>
              <div className="flex flex-wrap gap-2">
                {meta.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleChipClick('tag', tag)}
                    className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {meta.orb && (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Orb</div>
              <button
                type="button"
                onClick={() => handleChipClick('orb', meta.orb!)}
                className="px-2 py-1 rounded-full bg-secondary/50 text-secondary-foreground text-xs"
              >
                {meta.orb}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleNavigate}
              className="px-3 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs"
            >
              Öffnen
            </button>
            <button
              type="button"
              onClick={handleCopyPath}
              className="px-3 py-2 rounded-xl border border-border text-xs"
              disabled={!meta.path}
            >
              Pfad kopieren
            </button>
          </div>
        </div>
      )}
    </SideDrawer>
  );
}

interface EventMeta {
  icon: string;
  title: string;
  subtitle?: string;
  typeLabel: string;
  path?: string;
  tags: string[];
  orb?: string;
  href?: string;
}

function createMeta(event: MoraEvent): EventMeta {
  const payload = event.payload ?? {};
  switch (event.action) {
    case 'node_click':
      return {
        icon: '🕸️',
        title: typeof payload.title === 'string' ? payload.title : 'Node',
        subtitle: 'Knoten geöffnet',
        typeLabel: 'Node Click',
        path: typeof payload.path === 'string' ? payload.path : undefined,
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        href: '/field',
      };
    case 'filter_change':
      const tag = typeof payload.tag === 'string' ? payload.tag : null;
      return {
        icon: '🏷️',
        title: payload.tag ? `Filter #${payload.tag}` : `Orb ${payload.orb ?? 'all'}`,
        subtitle: 'Filter angepasst',
        typeLabel: 'Filter Change',
        tags: tag ? [tag] : [],
        orb: typeof payload.orb === 'string' ? payload.orb : undefined,
        href: '/folder',
      };
    case 'connector_action':
      return {
        icon: '🔌',
        title: typeof payload.message === 'string' ? payload.message : `Connector ${payload.id ?? ''}`,
        subtitle: `Status: ${payload.status ?? 'unknown'}`,
        typeLabel: 'Connector',
        tags: [],
        href: '/home',
      };
    case 'open_document':
      return {
        icon: '📄',
        title: typeof payload.title === 'string' ? payload.title : 'Dokument',
        subtitle: 'Dokument geöffnet',
        typeLabel: 'Document',
        path: typeof payload.path === 'string' ? payload.path : undefined,
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        href: '/folder',
      };
    default:
      return {
        icon: '🌿',
        title: 'Event',
        typeLabel: event.action,
        tags: [],
      };
  }
}
