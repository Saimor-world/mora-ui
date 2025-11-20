/**
 * Space Header Component
 *
 * Shows space branding (logo, name) and breadcrumb navigation
 * Displayed at the top of space-aware views
 */

'use client';

import { useSpaceStore } from '@/store/spaces';
import { useRouter } from 'next/navigation';

interface SpaceHeaderProps {
  spaceId: string;
}

export default function SpaceHeader({ spaceId }: SpaceHeaderProps) {
  const router = useRouter();
  const { spaces } = useSpaceStore();
  const space = spaces.find(s => s.id === spaceId);

  if (!space) return null;

  const primaryColor = space.branding?.primaryColor || '#10b981'; // Default emerald
  const hasLogo = space.branding?.logo;

  return (
    <div className="absolute top-6 left-6 z-20 flex items-center gap-3 animate-in fade-in slide-in-from-left duration-700">
      {/* Space Branding */}
      <div
        className="rounded-2xl border backdrop-blur-xl px-4 py-2.5 flex items-center gap-3 mora-transition hover:scale-105 cursor-pointer"
        style={{
          borderColor: `${primaryColor}40`,
          background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10, transparent)`,
        }}
        onClick={() => router.push('/home')}
      >
        {/* Logo or Icon */}
        {hasLogo ? (
          <img
            src={space.branding!.logo!}
            alt={space.name}
            className="h-8 w-8 rounded-lg object-cover"
          />
        ) : (
          <div className="text-2xl">{space.icon}</div>
        )}

        {/* Space Name */}
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">
            {space.name}
          </span>
          <span className="text-xs text-muted-foreground leading-tight">
            {space.sources?.length || 0} Quellen · {space.stats?.objectCount || 0} Objekte
          </span>
        </div>
      </div>

      {/* Breadcrumb Separator */}
      <div className="text-muted-foreground/50 text-lg">›</div>

      {/* Current View Badge */}
      <div className="rounded-2xl border border-border/10 bg-background/60 backdrop-blur-xl px-3 py-2 text-xs text-muted-foreground font-medium">
        {getCurrentViewLabel()}
      </div>
    </div>
  );
}

function getCurrentViewLabel(): string {
  if (typeof window === 'undefined') return '';

  const path = window.location.pathname;
  if (path.includes('/field')) return '🍄 Myzelium';
  if (path.includes('/folder')) return '📁 Ordner';
  if (path.includes('/insights')) return '💡 Insights';
  return 'View';
}
