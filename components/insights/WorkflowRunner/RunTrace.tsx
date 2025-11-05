'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { RunTrace as RunTraceType } from '@/lib/types';

interface RunTraceProps {
  trace: RunTraceType;
}

const statusColors = {
  running: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', icon: '⏳' },
  success: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400', icon: '✓' },
  error: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', icon: '✗' },
};

export default function RunTrace({ trace }: RunTraceProps) {
  const overallColor = statusColors[trace.status];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`p-4 rounded-lg border-2 ${overallColor.border} ${overallColor.bg} backdrop-blur-sm`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <motion.div
            animate={trace.status === 'running' ? {
              rotate: 360,
              scale: [1, 1.2, 1],
            } : {}}
            transition={{
              rotate: { repeat: Infinity, duration: 2, ease: 'linear' },
              scale: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' },
            }}
            className="text-xl"
          >
            {overallColor.icon}
          </motion.div>
          <div>
            <div className={`font-semibold ${overallColor.text}`}>
              {trace.status === 'running' && 'Running...'}
              {trace.status === 'success' && 'Completed'}
              {trace.status === 'error' && 'Failed'}
            </div>
            <div className="text-xs text-muted-foreground">
              Run ID: {trace.runId.slice(0, 8)}
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {(trace.durationMs / 1000).toFixed(2)}s
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {trace.steps.map((step, i) => {
            const stepColor = step.status === 'success'
              ? statusColors.success
              : step.status === 'error'
              ? statusColors.error
              : statusColors.running;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-3 p-2 rounded ${stepColor.bg} border ${stepColor.border}`}
              >
                {/* Step icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 + 0.1, type: 'spring', stiffness: 500 }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${stepColor.bg} border-2 ${stepColor.border}`}
                >
                  {step.status === 'running' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-3 h-3 border-2 border-current border-t-transparent rounded-full"
                    />
                  ) : (
                    <span className={stepColor.text}>{stepColor.icon}</span>
                  )}
                </motion.div>

                {/* Step details */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{step.step}</div>
                  <div className="text-xs text-muted-foreground">
                    {step.durationMs}ms
                  </div>
                </div>

                {/* Progress bar */}
                {step.status === 'running' && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`absolute bottom-0 left-0 h-0.5 ${stepColor.border} opacity-50`}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Overall progress bar */}
      {trace.status === 'running' && (
        <motion.div
          className="mt-3 h-1 bg-secondary rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-accent to-primary"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
