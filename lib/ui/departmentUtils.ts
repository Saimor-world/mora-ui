import { LucideIcon, Compass, DollarSign, Users, Code, ArrowRight, TrendingUp, Briefcase, Activity, Brain, PenTool, ShoppingBag, FlaskConical } from 'lucide-react';

export interface DepartmentVisuals {
    glow: string;
    border: string;
    core: string;
    icon: LucideIcon;
}

/**
 * Determines the visual style (colors and icon) for a department based on its name.
 * 
 * DESIGN PHILOSOPHY:
 * 1. Semantic Icon match is PRIORITY #1 (Name -> Icon).
 * 2. Database Color is PRIORITY #1 for colors (DB Color -> Color).
 * 3. Semantic Color is fallback for colors (Name -> Color).
 * 
 * This ensures "Technology" (Red in DB) shows as Red but keeps the "Code" icon.
 */
export const getDepartmentVisuals = (name: string, customColor?: string | null): DepartmentVisuals => {
    const lowerName = name.trim().toLowerCase();

    // Default Style (Slate/Grey)
    let style: DepartmentVisuals = {
        glow: '#64748B',
        border: '#94A3B8',
        core: '#475569',
        icon: Compass
    };

    // 1. Semantic Keyword Matching
    // Note: Order matters slightly for overlapping terms, but specific usually beats generic.

    // FINANCE / GROWTH / MONEY
    if (matches(lowerName, ['finance', 'finanz', 'money', 'invest', 'budget', 'fiscal', 'accounting'])) {
        style = { glow: '#F59E0B', border: '#FBBF24', core: '#D97706', icon: DollarSign }; // Gold
    }
    // R&D / LABS / RESEARCH (Science/Experiment)
    else if (matches(lowerName, ['r&d', 'research', 'lab', 'experiment', 'science'])) {
        style = { glow: '#A855F7', border: '#D8B4FE', core: '#9333EA', icon: FlaskConical }; // Purple/Lavender
    }
    // INTELLIGENCE / STRATEGY / AI / BRAIN
    else if (matches(lowerName, ['intelligence', 'strategy', 'vision', 'future', 'ai', 'brain', 'logic'])) {
        style = { glow: '#8B5CF6', border: '#A78BFA', core: '#7C3AED', icon: Brain }; // Violet
    }
    // HR / PEOPLE / CULTURE
    else if (matches(lowerName, ['hr', 'human', 'culture', 'people', 'personal', 'team', 'staff', 'talent'])) {
        style = { glow: '#EC4899', border: '#F472B6', core: '#DB2777', icon: Users }; // Pink
    }
    // PRODUCT / DESIGN
    else if (matches(lowerName, ['product', 'design', 'creative', 'ux', 'ui', 'art'])) {
        style = { glow: '#DB2777', border: '#F472B6', core: '#BE185D', icon: PenTool }; // Deep Pink
    }
    // TECH / ENGINEERING
    else if (matches(lowerName, ['tech', 'it ', 'dev', 'code', 'software', 'engineering', 'systems'])) {
        style = { glow: '#06B6D4', border: '#22D3EE', core: '#0891B2', icon: Code }; // Cyan
    }
    // STORES / SALES
    else if (matches(lowerName, ['sales', 'store', 'shop', 'retail', 'commerce', 'pos'])) {
        style = { glow: '#F97316', border: '#FB923C', core: '#EA580C', icon: ShoppingBag }; // Orange
    }
    // MARKETING / GROWTH (Alternative)
    else if (matches(lowerName, ['marketing', 'brand', 'pr', 'media', 'social', 'growth'])) {
        style = { glow: '#A855F7', border: '#C084FC', core: '#9333EA', icon: TrendingUp }; // Purple
    }
    // MANAGEMENT / HQ / LEGAL
    else if (matches(lowerName, ['management', 'legal', 'admin', 'hq', 'office', 'ceo', 'operations', 'ops'])) {
        style = { glow: '#10B981', border: '#34D399', core: '#059669', icon: Briefcase }; // Emerald
    }
    // LOGISTICS / SUPPLY
    else if (matches(lowerName, ['logis', 'supply', 'infrastructure', 'inventory', 'warehouse'])) {
        style = { glow: '#6366F1', border: '#818CF8', core: '#4F46E5', icon: Activity }; // Indigo
    }

    // 2. Custom Color Override (from Database)
    // We apply this AFTER determining the icon, so the semantic Icon remains.
    if (customColor && isValidColor(customColor)) {
        return {
            ...style, // Keep semantic icon
            glow: customColor,
            border: `${customColor}80`, // Add transparency for border
            core: customColor
        };
    }

    return style;
};

// Helper to check multiple keywords
function matches(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
}

// Basic hex validation to avoid breaking CSS
function isValidColor(color: string): boolean {
    return color.startsWith('#') || color.startsWith('rgb') || color.startsWith('hsl');
}
