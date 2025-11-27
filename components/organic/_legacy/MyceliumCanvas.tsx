'use client';

import React, { useState, useMemo } from 'react';
import { OrganicNode } from './OrganicNode';
import type { Snapshot } from '@/lib/types';

interface MyceliumCanvasProps {
  snapshot: Snapshot;
  onNodeSelect: (nodeId: string) => void;
  activeNodeId: string | null;
}

export function MyceliumCanvas({ snapshot, onNodeSelect, activeNodeId }: MyceliumCanvasProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Parallax Effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  // Layout nodes in a circle (simple force-like layout)
  const layoutedNodes = useMemo(() => {
    const centerX = 50;
    const centerY = 50;
    const radius = 35; // percentage

    return snapshot.nodes.map((node, index) => {
      const angle = (index / snapshot.nodes.length) * Math.PI * 2;
      const variance = 0.7 + (Math.random() * 0.6); // Add some organic variance

      return {
        ...node,
        x: centerX + Math.cos(angle) * radius * variance,
        y: centerY + Math.sin(angle) * radius * variance,
        size: node.type === 'project' ? 90 : 70,
        breathingDelay: index * 0.3,
      };
    });
  }, [snapshot.nodes]);

  // Build edge map for rendering connections
  const connections = useMemo(() => {
    return snapshot.edges.map(edge => {
      const source = layoutedNodes.find(n => n.id === edge.sourceId);
      const target = layoutedNodes.find(n => n.id === edge.targetId);
      return { edge, source, target };
    }).filter(c => c.source && c.target);
  }, [snapshot.edges, layoutedNodes]);

  return (
    <div
      onMouseMove={handleMouseMove}
      className="absolute inset-0 overflow-hidden"
    >
      {/* Parallax Background Layers */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden transition-transform duration-100 ease-out"
        style={{ transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)` }}
      >
        {/* Large Blur Circles */}
        <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-[#1F4D43] rounded-full blur-[150px] opacity-10" />
        <div className="absolute bottom-[-20%] left-[10%] w-[600px] h-[600px] bg-[#0A2A25] rounded-full blur-[120px] opacity-30" />

        {/* Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWx0ZXI9InVybCgjYSkiIGmpYWNpdHk9IjAuMDUiLz48L3N2Zz4=')] brightness-50 contrast-150 mix-blend-overlay" />

        {/* Tiny Stars */}
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white opacity-20 rounded-full animate-pulse" />
        <div className="absolute top-3/4 left-2/3 w-1 h-1 bg-white opacity-10 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-mora-gold opacity-20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-emerald-400 opacity-30 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Connection Lines Layer */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-5"
        style={{ transform: `translate(${mousePos.x * -10}px, ${mousePos.y * -10}px)` }}
      >
        {connections.map(({ edge, source, target }, i) => {
          if (!source || !target) return null;

          const isActive = activeNodeId === source.id || activeNodeId === target.id;
          const isContains = edge.kind === 'contains';

          return (
            <line
              key={i}
              x1={`${source.x}%`}
              y1={`${source.y}%`}
              x2={`${target.x}%`}
              y2={`${target.y}%`}
              stroke={isActive ? '#CEB676' : isContains ? '#6B8E9E' : '#1F4D43'}
              strokeWidth={isActive ? 2 : isContains ? 1.5 : 1}
              strokeDasharray={isActive ? '4,4' : '0'}
              opacity={isActive ? 0.6 : 0.2}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>

      {/* Nodes Layer - With Parallax */}
      <div
        className="absolute inset-0 animate-in fade-in duration-1000"
        style={{ transform: `translate(${mousePos.x * -10}px, ${mousePos.y * -10}px)` }}
      >
        {layoutedNodes.map((node, index) => (
          <OrganicNode
            key={node.id}
            x={node.x}
            y={node.y}
            size={node.size}
            label={node.title}
            type={node.type === 'project' ? 'project' : node.type === 'insight' ? 'insight' : 'default'}
            active={activeNodeId === node.id}
            onClick={() => onNodeSelect(node.id)}
            delay={index * 200}
            breathingDelay={node.breathingDelay}
          />
        ))}
      </div>
    </div>
  );
}
