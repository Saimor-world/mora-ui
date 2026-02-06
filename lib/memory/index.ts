/**
 * SAIMOR Memory System - Central Export
 *
 * Mora's Gedächtnis: LearningBrain Integration
 */

// Re-export types
export * from '@/lib/types/memory';

// Re-export hooks
export { useMemory } from '@/lib/hooks/useMemory';

// Re-export notifications
export {
    showMemoryLearnedToast,
    showPendingReviewToast,
    showMemoryApprovedToast,
    showMemoryRejectedToast,
} from './memoryNotifications';

// Re-export API functions (using actual coreClient names)
export {
    searchMemory,
    getMemoryPending as getPendingReviews,
    approveMemoryItem as approveReview,
    rejectMemoryItem as rejectReview,
    getMemoryMetrics,
    learnInsight,
} from '@/lib/api/coreClient';

// Constants
export const MEMORY_CATEGORIES = {
    LOW_RISK: ['preference', 'tone', 'phrasing', 'summary', 'context'] as const,
    HIGH_RISK: ['fact', 'goal', 'price', 'policy', 'team', 'technical'] as const,
};

export const MEMORY_TTL_DAYS = 75;

// Helper to check if learning should auto-commit
export const shouldAutoCommit = (category: string): boolean => {
    return MEMORY_CATEGORIES.LOW_RISK.includes(category as any);
};

// Helper to get risk level
export const getRiskLevel = (category: string): 'low' | 'high' => {
    return shouldAutoCommit(category) ? 'low' : 'high';
};

// Keywords that indicate user wants Mora to remember something
export const MEMORY_TRIGGER_KEYWORDS = [
    'merke dir',
    'merk dir',
    'speicher das',
    'speichere das',
    'vergiss nicht',
    'wichtig:',
    'remember',
    'note that',
    'keep in mind',
    'denk dran',
    'zur info:',
    'für die zukunft',
];

// Check if message contains memory trigger
export const hasMemoryTrigger = (message: string): boolean => {
    const lower = message.toLowerCase();
    return MEMORY_TRIGGER_KEYWORDS.some(kw => lower.includes(kw));
};

// Extract potential insight from message
export const extractInsight = (message: string): string => {
    // Remove common prefixes
    let insight = message;
    for (const kw of MEMORY_TRIGGER_KEYWORDS) {
        const regex = new RegExp(`^${kw}\\s*`, 'i');
        insight = insight.replace(regex, '');
    }
    return insight.trim();
};

// Categorize insight based on content
export const guessCategory = (insight: string): string => {
    const lower = insight.toLowerCase();

    // High-risk patterns
    if (/\d+\s*(€|euro|dollar|\$|chf)/.test(lower)) return 'price';
    if (/policy|regel|vorschrift|muss|darf nicht/.test(lower)) return 'policy';
    if (/team|mitarbeiter|kollege|chef|manager/.test(lower)) return 'team';
    if (/ziel|target|deadline|bis zum/.test(lower)) return 'goal';
    if (/fakt|tatsache|ist so dass|stimmt dass/.test(lower)) return 'fact';

    // Low-risk patterns
    if (/mag|bevorzug|lieber|gerne|stil/.test(lower)) return 'preference';
    if (/zusammenfass|summary|überblick|kurz gesagt/.test(lower)) return 'summary';
    if (/kontext|hintergrund|situation/.test(lower)) return 'context';

    // Default to context (low-risk)
    return 'context';
};
