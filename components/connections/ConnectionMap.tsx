'use client';

import { useMemo } from 'react';

export interface ConnectionNode {
  id: string;
  label: string;
  status: 'connected' | 'offline' | 'coming_soon';
}

const DEFAULT_NODES: ConnectionNode[] = [
  { id: 'core_api', label: 'Saimôr Core API', status: 'connected' },
  { id: 'n8n_webhooks', label: 'n8n Workflows', status: 'connected' },
  { id: 'mcp_bridge', label: 'MCP Bridge', status: 'coming_soon' },
];

export default function ConnectionMap({ nodes }: { nodes?: ConnectionNode[] }) {
  const provided = nodes ?? DEFAULT_NODES;
  const showPlaceholder = Array.isArray(nodes) && nodes.length === 0;
  const computed = useMemo(() => (showPlaceholder ? [] : provided), [provided, showPlaceholder]);

  if (showPlaceholder) {
    return (
      <div className="relative w-full h-64 bg-card/70 border border-border rounded-3xl flex items-center justify-center text-sm text-muted-foreground">
        Noch keine Verbindungen – sobald Core, n8n oder MCP angebunden sind, pulst die Karte hier automatisch.
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 bg-card/70 border border-border rounded-3xl overflow-hidden p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background opacity-70 pointer-events-none" />
      <svg width="100%" height="100%" viewBox="0 0 400 200" className="relative z-10">
        <defs>
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(52,211,153,0.4)" />
            <stop offset="100%" stopColor="rgba(248,191,77,0.4)" />
          </linearGradient>
        </defs>
        {computed.map((node, index) => {
          if (index === 0) return null;
          const angle = (index / computed.length) * Math.PI * 2;
          const x = 200 + Math.cos(angle) * 120;
          const y = 100 + Math.sin(angle) * 60;
          return (
            <line
              key={`link-${node.id}`}
              x1={200}
              y1={100}
              x2={x}
              y2={y}
              stroke="url(#linkGradient)"
              strokeWidth="1.5"
              strokeDasharray={node.status === 'coming_soon' ? '6 6' : 'none'}
            />
          );
        })}
        {computed.map((node, index) => {
          const angle = (index / computed.length) * Math.PI * 2;
          const x = 200 + Math.cos(angle) * (index === 0 ? 0 : 120);
          const y = 100 + Math.sin(angle) * (index === 0 ? 0 : 60);
          return (
            <g key={node.id} transform={`translate(${x}, ${y})`}>
              <circle
                r={index === 0 ? 32 : 24}
                fill={
                  node.status === 'connected'
                    ? 'rgba(52,211,153,0.25)'
                    : node.status === 'coming_soon'
                    ? 'rgba(248,191,77,0.15)'
                    : 'rgba(248,113,113,0.15)'
                }
                stroke={
                  node.status === 'connected'
                    ? 'rgba(52,211,153,0.8)'
                    : node.status === 'coming_soon'
                    ? 'rgba(248,191,77,0.8)'
                    : 'rgba(248,113,113,0.8)'
                }
                strokeWidth="2"
              />
              <text
                textAnchor="middle"
                y={4}
                className="text-xs font-medium fill-white pointer-events-none"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
