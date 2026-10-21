'use client';
import React from 'react';
import { Bell } from 'lucide-react';
import { Button, Stack, Status, Surface, Text } from '@/components/os-kit';
import { useOsNotifications } from '@/lib/os-prototype/notifications';

export function NotificationButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const unread = useOsNotifications((s) => s.items.filter((i) => !i.read).length);
  return (
    <Button variant="ghost" iconOnly aria-expanded={open} aria-label={unread ? `Hinweise (${unread} neu)` : 'Hinweise'} icon={<span className="relative"><Bell size={16} />{unread ? <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full" style={{ background: 'var(--os-accent)' }} /> : null}</span>} onClick={onToggle} />
  );
}

export function NotificationTray({ onClose }: { onClose: () => void }) {
  const items = useOsNotifications((s) => s.items);
  const markAllRead = useOsNotifications((s) => s.markAllRead);
  return (
    <Surface variant="strong" padding={4} className="absolute right-4 top-14 z-40 w-[min(360px,calc(100vw-32px))]" aria-label="Hinweise" style={{ background: 'var(--os-canvas-raised)' }}>
      <Stack direction="row" justify="space-between" align="center">
        <Text variant="eyebrow">Hinweise</Text>
        <Stack direction="row" gap={1}>
          <Button size="sm" variant="ghost" onClick={markAllRead}>Gelesen</Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Schließen</Button>
        </Stack>
      </Stack>
      <div className="os-list mt-2">
        {items.length === 0 ? <Text variant="meta" className="py-3">Keine Hinweise in dieser Sitzung.</Text> : items.map((n) => (
          <div key={n.id} className="os-list-row" style={{ alignItems: 'flex-start' }}>
            <div className="min-w-0">
              <Text variant="body" tone="default">{n.title}</Text>
              {n.body ? <Text variant="meta">{n.body}</Text> : null}
            </div>
            <Status tone={n.tone === 'ai' ? 'ai' : n.tone}>{n.source}</Status>
          </div>
        ))}
      </div>
    </Surface>
  );
}
