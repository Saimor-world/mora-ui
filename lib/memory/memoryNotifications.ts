/**
 * Memory Toast Notifications
 *
 * Toast-System für Mora Memory Events
 * Nutzt sonner für konsistente Benachrichtigungen
 */

import { toast } from 'sonner';

// Farb-Definitionen
const COLORS = {
  emerald: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#10b981',
  },
  violet: {
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    color: '#8b5cf6',
  },
  amber: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    color: '#f59e0b',
  },
};

const baseStyle = {
  backdropFilter: 'blur(12px)',
};

/**
 * Zeigt Toast wenn Mora etwas Neues gelernt hat
 * @param insight - Der gelernte Insight-Text
 * @param category - Die Kategorie des Insights (z.B. 'preference', 'fact')
 */
export function showMemoryLearnedToast(insight: string, category: string): void {
  const truncatedInsight = insight.length > 60
    ? `${insight.substring(0, 60)}...`
    : insight;

  toast.success('Mora hat gelernt', {
    description: `${truncatedInsight}`,
    duration: 4000,
    position: 'bottom-right',
    style: {
      ...COLORS.violet,
      ...baseStyle,
    },
    icon: '🧠',
  });
}

/**
 * Zeigt Toast mit Anzahl der Insights zur Prüfung
 * @param count - Anzahl der ausstehenden Reviews
 */
export function showPendingReviewToast(count: number): void {
  if (count <= 0) return;

  const message = count === 1
    ? '1 Insight zur Prüfung'
    : `${count} Insights zur Prüfung`;

  toast.info(message, {
    description: 'Tippe um zu überprüfen',
    duration: 5000,
    position: 'bottom-right',
    style: {
      ...COLORS.amber,
      ...baseStyle,
    },
    icon: '📋',
  });
}

/**
 * Zeigt Erfolgs-Toast wenn Insight bestätigt wurde
 */
export function showMemoryApprovedToast(): void {
  toast.success('Insight bestätigt', {
    description: 'Mora wird sich daran erinnern',
    duration: 3000,
    position: 'bottom-right',
    style: {
      ...COLORS.emerald,
      ...baseStyle,
    },
    icon: '✓',
  });
}

/**
 * Zeigt Toast wenn Insight abgelehnt wurde
 */
export function showMemoryRejectedToast(): void {
  toast.info('Insight abgelehnt', {
    description: 'Der Vorschlag wurde verworfen',
    duration: 3000,
    position: 'bottom-right',
    style: {
      ...COLORS.violet,
      ...baseStyle,
    },
    icon: '✗',
  });
}
