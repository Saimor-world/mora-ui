'use client';

import { useState, useEffect } from 'react';
import type { MoraObject } from '@/lib/types';
import { useMyceliumSelection, mapObjectToNode } from '@/lib/mycelium/selection';

// Mock data for now
const mockTree = {
  spaces: [
    {
      id: 's1',
      name: 'Home',
      departments: [
        {
          id: 'd1',
          name: 'Personal',
          projects: [
            { id: 'p1', name: 'Notes', objects: [
              { id: 'o1', title: 'Meeting Notes.md', type: 'file' },
              { id: 'o2', title: 'Ideas.md', type: 'file' },
            ]},
          ],
        },
      ],
    },
    {
      id: 's2',
      name: 'Work',
      departments: [
        {
          id: 'd2',
          name: 'Projects',
          projects: [
            { id: 'p2', name: 'Môra UI', objects: [
              { id: 'o3', title: 'README.md', type: 'file' },
              { id: 'o4', title: 'QUICKSTART.md', type: 'file' },
            ]},
          ],
        },
      ],
    },
  ],
};

interface TreeViewProps {
  initialFocusId?: string;
}

export default function TreeView({ initialFocusId }: TreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['s1', 'd1', 'p1']));
  const [selected, setSelected] = useState<string | null>(null);
  const { selection, setSelection } = useMyceliumSelection();

  // Deep-linking: Apply initial focus from URL params
  useEffect(() => {
    if (!initialFocusId) return;

    // Search for the object in the mock tree
    for (const space of mockTree.spaces) {
      for (const dept of space.departments) {
        for (const project of dept.projects) {
          const obj = project.objects.find((o) => o.id === initialFocusId);
          if (obj) {
            // Expand parent nodes
            setExpanded(new Set([space.id, dept.id, project.id]));
            // Select the object
            handleObjectClick(obj);
            return;
          }
        }
      }
    }
    // If no match found, gracefully ignore and continue with normal flow
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFocusId]);

  const toggle = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const handleObjectClick = (obj: any) => {
    setSelected(obj.id);
    // Convert to MoraObject format and set mycelium selection
    const moraObject: MoraObject = {
      id: obj.id,
      title: obj.title,
      type: obj.type,
      spaceId: 's1',
      source: 'mock',
      tags: [],
    };
    setSelection({ kind: 'node', node: mapObjectToNode(moraObject), object: moraObject });
  };

  return (
    <div className="p-4">
      <div className="space-y-1">
        {mockTree.spaces.map((space) => (
          <div key={space.id}>
            {/* Space */}
            <button
              onClick={() => toggle(space.id)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-secondary transition-colors text-left"
            >
              <span className="text-muted-foreground">
                {expanded.has(space.id) ? '▼' : '▶'}
              </span>
              <span className="font-medium">🏠 {space.name}</span>
            </button>

            {/* Departments */}
            {expanded.has(space.id) && (
              <div className="ml-6 space-y-1 mt-1">
                {space.departments.map((dept) => (
                  <div key={dept.id}>
                    <button
                      onClick={() => toggle(dept.id)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-secondary transition-colors text-left"
                    >
                      <span className="text-muted-foreground text-sm">
                        {expanded.has(dept.id) ? '▼' : '▶'}
                      </span>
                      <span className="text-sm">📂 {dept.name}</span>
                    </button>

                    {/* Projects */}
                    {expanded.has(dept.id) && (
                      <div className="ml-6 space-y-1 mt-1">
                        {dept.projects.map((project) => (
                          <div key={project.id}>
                            <button
                              onClick={() => toggle(project.id)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-secondary transition-colors text-left"
                            >
                              <span className="text-muted-foreground text-sm">
                                {expanded.has(project.id) ? '▼' : '▶'}
                              </span>
                              <span className="text-sm">📁 {project.name}</span>
                            </button>

                            {/* Objects */}
                            {expanded.has(project.id) && (
                              <div className="ml-6 space-y-0.5 mt-1">
                                {project.objects.map((obj) => {
                                  const isMyceliumSelected =
                                    selection.kind === 'node' && selection.node.id === obj.id;
                                  return (
                                    <button
                                      key={obj.id}
                                      onClick={() => handleObjectClick(obj)}
                                      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded transition-all duration-300 text-left text-sm ${
                                        selected === obj.id
                                          ? 'bg-primary/20 text-primary'
                                          : 'text-muted-foreground hover:bg-secondary'
                                      } ${isMyceliumSelected ? 'border-l-4 border-l-primary/70 bg-gradient-to-r from-primary/10 via-background to-background shadow-[0_6px_26px_-16px_rgba(248,191,77,0.5)]' : ''}`}
                                    >
                                      <span>📄</span>
                                      {isMyceliumSelected && (
                                        <span className="text-[10px] inline-flex items-center px-1.5 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary">
                                          Myzel
                                        </span>
                                      )}
                                      <span>{obj.title}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
