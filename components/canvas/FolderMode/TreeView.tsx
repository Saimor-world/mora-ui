'use client';

import { useState } from 'react';
import type { MoraObject } from '@/lib/types';

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

export default function TreeView() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['s1', 'd1', 'p1']));
  const [selected, setSelected] = useState<string | null>(null);

  const toggle = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
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
                                {project.objects.map((obj) => (
                                  <button
                                    key={obj.id}
                                    onClick={() => setSelected(obj.id)}
                                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded transition-colors text-left text-sm ${
                                      selected === obj.id
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-muted-foreground hover:bg-secondary'
                                    }`}
                                  >
                                    <span>📄</span>
                                    <span>{obj.title}</span>
                                  </button>
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
