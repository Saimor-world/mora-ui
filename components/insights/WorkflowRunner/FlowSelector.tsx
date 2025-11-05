'use client';

import { motion } from 'framer-motion';
import type { WorkflowDef } from '@/lib/workflowStore';

interface FlowSelectorProps {
  workflows: WorkflowDef[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function FlowSelector({ workflows, selected, onSelect }: FlowSelectorProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        Select Workflow
      </h3>

      <div className="grid gap-2">
        {workflows.map((workflow, i) => (
          <motion.button
            key={workflow.id}
            onClick={() => onSelect(workflow.id)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            className={`relative overflow-hidden rounded-lg p-3 text-left transition-all ${
              selected === workflow.id
                ? 'bg-primary/10 border-2 border-primary shadow-lg shadow-primary/20'
                : 'bg-card border border-border hover:border-primary/50'
            }`}
          >
            {/* Background gradient */}
            <motion.div
              className="absolute inset-0 opacity-0"
              style={{ background: `linear-gradient(135deg, ${workflow.color}20 0%, transparent 100%)` }}
              animate={{ opacity: selected === workflow.id ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            />

            {/* Content */}
            <div className="relative flex items-start gap-3">
              <div className="text-2xl" style={{ filter: selected === workflow.id ? 'drop-shadow(0 0 8px currentColor)' : 'none' }}>
                {workflow.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm mb-0.5">{workflow.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {workflow.description}
                </div>
              </div>

              {/* Selection indicator */}
              {selected === workflow.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50"
                />
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
