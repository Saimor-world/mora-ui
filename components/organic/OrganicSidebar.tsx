"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Hexagon,
  Layers,
  FolderOpen,
  Lightbulb,
  Home
} from 'lucide-react';

interface OrganicSidebarProps {
  spaceId?: string;
}

interface NavItem {
  icon: typeof Hexagon;
  label: string;
  route: string;
  activePattern: RegExp;
}

export const OrganicSidebar: React.FC<OrganicSidebarProps> = ({ spaceId }) => {
  const router = useRouter();
  const pathname = usePathname();

  // Navigation items - adapt based on space context
  const navItems: NavItem[] = spaceId
    ? [
        { icon: Home, label: 'Home', route: '/home', activePattern: /^\/home/ },
        { icon: Hexagon, label: 'Field', route: `/spaces/${spaceId}/field`, activePattern: /\/field/ },
        { icon: FolderOpen, label: 'Folder', route: `/spaces/${spaceId}/folder`, activePattern: /\/folder/ },
        { icon: Lightbulb, label: 'Insights', route: `/spaces/${spaceId}/insights`, activePattern: /\/insights/ },
      ]
    : [
        { icon: Home, label: 'Home', route: '/home', activePattern: /^\/home/ },
        { icon: Hexagon, label: 'Field', route: '/field', activePattern: /\/field/ },
        { icon: FolderOpen, label: 'Folder', route: '/folder', activePattern: /\/folder/ },
        { icon: Lightbulb, label: 'Insights', route: '/insights', activePattern: /\/insights/ },
      ];

  const isActive = (item: NavItem) => item.activePattern.test(pathname);

  return (
    <nav className="w-20 h-full flex flex-col items-center py-8 gap-8 relative z-30 bg-mora-forest/30 backdrop-blur-md border-r border-white/5">
      {/* Logo / Orb Symbol */}
      <div className="w-10 h-10 rounded-full bg-emerald-900/50 border border-mora-gold/50 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(206,182,118,0.2)] cursor-pointer hover:scale-110 transition-transform duration-700">
        <div className="w-2 h-2 bg-mora-gold rounded-full animate-pulse"></div>
      </div>

      {/* Navigation Icons */}
      <div className="flex flex-col gap-6 w-full items-center">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <div
              key={idx}
              onClick={() => router.push(item.route)}
              className="group relative flex items-center justify-center w-12 h-12 cursor-pointer transition-all duration-300"
            >
              {/* Active Indicator */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-mora-gold rounded-r-full shadow-[0_0_10px_#CEB676]"></div>
              )}

              {/* Icon */}
              <Icon
                className={`w-5 h-5 transition-colors duration-300 ${
                  active
                    ? 'text-mora-gold'
                    : 'text-emerald-500/50 group-hover:text-emerald-100'
                }`}
              />

              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-3 py-1 bg-mora-forest/90 border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 text-xs tracking-wider text-emerald-100 backdrop-blur-md">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom: User Avatar or Settings */}
      <div className="mt-auto mb-8">
        <div className="w-8 h-8 rounded-full bg-emerald-800/50 border border-white/10 hover:border-mora-gold/50 transition-colors cursor-pointer"></div>
      </div>
    </nav>
  );
};
