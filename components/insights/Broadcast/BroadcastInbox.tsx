'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useBroadcastStore } from '@/lib/broadcastStore';

const typeConfig = {
  share: { icon: '📤', color: '#60A5FA', label: 'Shared' },
  reference: { icon: '🔗', color: '#F5B800', label: 'Referenced' },
  insight: { icon: '💡', color: '#F472B6', label: 'Insight' },
};

const statusConfig = {
  pending: { icon: '⏳', color: '#9CA3AF' },
  sent: { icon: '✓', color: '#34D399' },
  received: { icon: '📥', color: '#60A5FA' },
};

export default function BroadcastInbox() {
  const { messages } = useBroadcastStore();

  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        Broadcast Inbox
      </h3>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-muted-foreground text-center py-4"
            >
              No broadcast messages
            </motion.div>
          ) : (
            messages.map((msg, i) => {
              const typeInfo = typeConfig[msg.type];
              const statusInfo = statusConfig[msg.status];

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="relative overflow-hidden rounded-lg border border-border bg-card p-3 cursor-pointer group"
                >
                  {/* Background gradient */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: `linear-gradient(135deg, ${typeInfo.color}10 0%, transparent 100%)`,
                    }}
                  />

                  {/* Content */}
                  <div className="relative space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <motion.span
                          className="text-xl"
                          animate={{
                            scale: [1, 1.2, 1],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 2,
                            ease: 'easeInOut',
                          }}
                        >
                          {typeInfo.icon}
                        </motion.span>
                        <div>
                          <div className="font-medium text-sm">{msg.sourceTitle}</div>
                          <div className="text-xs" style={{ color: typeInfo.color }}>
                            {typeInfo.label}
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div
                        className="text-xs flex items-center gap-1"
                        style={{ color: statusInfo.color }}
                      >
                        <span>{statusInfo.icon}</span>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="text-sm text-muted-foreground">
                      {msg.message}
                    </div>

                    {/* Target spaces */}
                    <div className="flex flex-wrap gap-1">
                      {msg.targetSpaces.map((space) => (
                        <span
                          key={space}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-xs"
                        >
                          {space}
                        </span>
                      ))}
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-muted-foreground">
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Hover indicator */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: typeInfo.color }}
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
