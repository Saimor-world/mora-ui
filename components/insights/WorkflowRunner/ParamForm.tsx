'use client';

import { motion } from 'framer-motion';
import type { WorkflowDef } from '@/lib/workflowStore';

interface ParamFormProps {
  workflow: WorkflowDef;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onSubmit: () => void;
  isRunning: boolean;
}

export default function ParamForm({ workflow, values, onChange, onSubmit, isRunning }: ParamFormProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Parameters
      </h3>

      <div className="space-y-3">
        {workflow.params.map((param, i) => (
          <motion.div
            key={param.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="space-y-1.5"
          >
            <label className="text-sm font-medium flex items-center gap-1.5">
              {param.label}
              {param.required && <span className="text-destructive">*</span>}
            </label>

            {param.type === 'select' ? (
              <select
                value={values[param.name] || ''}
                onChange={(e) => onChange(param.name, e.target.value)}
                disabled={isRunning}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 transition-all"
              >
                <option value="">Select...</option>
                {param.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={param.type === 'date' ? 'date' : 'text'}
                value={values[param.name] || ''}
                onChange={(e) => onChange(param.name, e.target.value)}
                disabled={isRunning}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 transition-all"
                placeholder={param.required ? 'Required' : 'Optional'}
              />
            )}
          </motion.div>
        ))}
      </div>

      <motion.button
        onClick={onSubmit}
        disabled={isRunning}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full px-4 py-3 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] text-primary-foreground rounded-lg font-medium shadow-lg shadow-primary/30 hover:shadow-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all disabled:hover:scale-100"
        style={{
          animation: isRunning ? 'none' : 'shimmer 3s ease-in-out infinite',
        }}
      >
        <div className="flex items-center justify-center gap-2">
          {isRunning ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              />
              <span>Running...</span>
            </>
          ) : (
            <>
              <span>▶</span>
              <span>Execute Workflow</span>
            </>
          )}
        </div>
      </motion.button>

      <style jsx>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </motion.div>
  );
}
