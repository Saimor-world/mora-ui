'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useThoughtBubbles } from '@/lib/contexts/ThoughtBubbleContext';

export default function ThoughtBubble() {
  const { bubbles, dismissBubble } = useThoughtBubbles();

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2 max-w-md">
      <AnimatePresence mode="popLayout">
        {bubbles.map((bubble, index) => (
          <motion.div
            key={bubble.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.8 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
            }}
            className="relative"
          >
            <div className="px-4 py-2.5 rounded-2xl bg-card/95 border border-primary/30 shadow-lg mora-breathe text-sm text-foreground backdrop-blur-sm">
              <div className="flex items-start gap-2">
                <span className="text-base" aria-hidden="true">
                  {bubble.source === 'mindloop'
                    ? '🧠'
                    : bubble.source === 'semantic'
                    ? '✨'
                    : bubble.source === 'awareness'
                    ? '👁️'
                    : '💡'}
                </span>
                <div className="flex-1 min-w-0">
                  {bubble.title && (
                    <div className="text-xs font-semibold text-primary mb-0.5">
                      {bubble.title}
                    </div>
                  )}
                  <div className="text-foreground">{bubble.message}</div>
                </div>
                <button
                  onClick={() => dismissBubble(bubble.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs px-1.5 py-0.5 rounded-full hover:bg-secondary/50"
                  aria-label="Hinweis schließen"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
