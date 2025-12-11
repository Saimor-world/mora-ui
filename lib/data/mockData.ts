/**
 * MOCK DATA SYSTEM
 * 
 * Provides logical fallback data for:
 * 1. Demo Mode (Simple Coffee Group)
 * 2. Solo Founder Mode (Saimôr HQ)
 * 
 * Used when backend returns empty data or for offline demos.
 */

export const MOCK_DATA = {
    // 1. SIMPLE COFFEE GROUP (Demo Company)
    demo: {
        departments: [
            { id: 'dept-eng', tenant_id: 'tenant-default', name: 'Engineering', slug: 'engineering', description: 'Tech & Development', color: '#3B82F6', order: 0 },
            { id: 'dept-mkt', tenant_id: 'tenant-default', name: 'Marketing', slug: 'marketing', description: 'Growth & Brand', color: '#D946EF', order: 1 },
            { id: 'dept-fin', tenant_id: 'tenant-default', name: 'Finance', slug: 'finance', description: 'Financial Planning', color: '#F59E0B', order: 2 },
            { id: 'dept-hr', tenant_id: 'tenant-default', name: 'HR', slug: 'hr', description: 'People & Culture', color: '#F43F5E', order: 3 },
            { id: 'dept-design', tenant_id: 'tenant-default', name: 'Design', slug: 'design', description: 'Product Design', color: '#8B5CF6', order: 4 }
        ],
        spaces: {
            'dept-eng': [
                { id: 'space-web', name: 'Web Platform', description: 'Next.js Frontend', departmentId: 'dept-eng' },
                { id: 'space-mobile', name: 'Mobile App', description: 'React Native', departmentId: 'dept-eng' },
                { id: 'space-api', name: 'Backend API', description: 'Node.js Services', departmentId: 'dept-eng' },
                { id: 'space-devops', name: 'DevOps', description: 'CI/CD & Infra', departmentId: 'dept-eng' }
            ],
            'dept-mkt': [
                { id: 'space-campaigns', name: 'Q4 Campaigns', description: 'Holiday Season', departmentId: 'dept-mkt' },
                { id: 'space-social', name: 'Social Media', description: 'Instagram & LinkedIn', departmentId: 'dept-mkt' },
                { id: 'space-brand', name: 'Brand Assets', description: 'Logos & Guidelines', departmentId: 'dept-mkt' }
            ],
            'dept-fin': [
                { id: 'space-q4', name: 'Q4 Report', description: 'Revenue Analysis', departmentId: 'dept-fin' },
                { id: 'space-budget', name: 'Budget 2025', description: 'Planning', departmentId: 'dept-fin' }
            ],
            'dept-hr': [
                { id: 'space-recruiting', name: 'Recruiting', description: 'Open Positions', departmentId: 'dept-hr' },
                { id: 'space-onboarding', name: 'Onboarding', description: 'New Hires', departmentId: 'dept-hr' }
            ],
            'dept-design': [
                { id: 'space-system', name: 'Design System', description: 'Figma Components', departmentId: 'dept-design' },
                { id: 'space-ui', name: 'UI Kit', description: 'Web & Mobile', departmentId: 'dept-design' }
            ]
        },

        // ═══════════════════════════════════════════════════════════════════════════
        // NODES - For Semantic Hierarchy (Moons need 5+ connections via tags/metadata)
        // ═══════════════════════════════════════════════════════════════════════════
        nodes: [
            // HIGH IMPORTANCE NODES (Will become MOONS - many tags = many connections)
            {
                id: 'node-architecture',
                space_id: 'space-web',
                title: 'System Architecture',
                type: 'document',
                content: 'Core architecture documentation',
                metadata: { tags: ['architecture', 'core', 'important', 'shared', 'security', 'performance'], weight: 0.9 },
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-12-01T10:00:00Z'
            },
            {
                id: 'node-brand-guide',
                space_id: 'space-brand',
                title: 'Brand Guidelines',
                type: 'document',
                content: 'Official brand standards',
                metadata: { tags: ['brand', 'design', 'visual', 'important', 'shared', 'marketing'], weight: 0.85 },
                created_at: '2024-02-10T10:00:00Z',
                updated_at: '2024-11-28T10:00:00Z'
            },
            {
                id: 'node-q4-strategy',
                space_id: 'space-campaigns',
                title: 'Q4 Strategy',
                type: 'document',
                content: 'Holiday season marketing plan',
                metadata: { tags: ['strategy', 'marketing', 'q4', 'revenue', 'important', 'growth'], weight: 0.8 },
                created_at: '2024-09-01T10:00:00Z',
                updated_at: '2024-12-05T10:00:00Z'
            },
            {
                id: 'node-budget-master',
                space_id: 'space-budget',
                title: 'Master Budget 2025',
                type: 'document',
                content: 'Annual budget allocation',
                metadata: { tags: ['budget', 'finance', 'planning', 'important', 'shared', 'operations'], weight: 0.9 },
                created_at: '2024-10-01T10:00:00Z',
                updated_at: '2024-12-08T10:00:00Z'
            },
            {
                id: 'node-hiring-plan',
                space_id: 'space-recruiting',
                title: 'Hiring Plan 2025',
                type: 'document',
                content: 'Recruitment roadmap',
                metadata: { tags: ['hiring', 'hr', 'growth', 'team', 'important', 'planning'], weight: 0.75 },
                created_at: '2024-11-01T10:00:00Z',
                updated_at: '2024-12-10T10:00:00Z'
            },

            // MEDIUM IMPORTANCE NODES (Regular stars)
            {
                id: 'node-api-docs',
                space_id: 'space-api',
                title: 'API Documentation',
                type: 'document',
                content: 'REST API reference',
                metadata: { tags: ['api', 'docs', 'technical'], weight: 0.5 },
                created_at: '2024-03-15T10:00:00Z',
                updated_at: '2024-11-20T10:00:00Z'
            },
            {
                id: 'node-social-calendar',
                space_id: 'space-social',
                title: 'Social Calendar',
                type: 'document',
                content: 'Content schedule',
                metadata: { tags: ['social', 'calendar', 'marketing'], weight: 0.4 },
                created_at: '2024-06-01T10:00:00Z',
                updated_at: '2024-11-25T10:00:00Z'
            },
            {
                id: 'node-design-tokens',
                space_id: 'space-system',
                title: 'Design Tokens',
                type: 'document',
                content: 'Colors and typography',
                metadata: { tags: ['design', 'tokens'], weight: 0.5 },
                created_at: '2024-04-01T10:00:00Z',
                updated_at: '2024-10-15T10:00:00Z'
            },

            // LOW IMPORTANCE NODES (Small stars)
            {
                id: 'node-meeting-notes',
                space_id: 'space-web',
                title: 'Weekly Standup Notes',
                type: 'note',
                content: 'Team sync notes',
                metadata: { tags: ['meeting'], weight: 0.2 },
                created_at: '2024-12-09T10:00:00Z',
                updated_at: '2024-12-09T10:00:00Z'
            },
            {
                id: 'node-expense-report',
                space_id: 'space-q4',
                title: 'Travel Expenses',
                type: 'document',
                content: 'Q4 expense tracking',
                metadata: { tags: ['expense'], weight: 0.2 },
                created_at: '2024-12-01T10:00:00Z',
                updated_at: '2024-12-03T10:00:00Z'
            }
        ],

        // Relations for constellations (Parent-Child)
        relations: [
            // Operations department relations
            { id: 'rel-1', source_id: 'folder-einkauf', target_id: 'node-budget-2025', type: 'parent_child', weight: 1.0 },
            { id: 'rel-2', source_id: 'folder-einkauf', target_id: 'node-lieferanten', type: 'parent_child', weight: 1.0 },
            { id: 'rel-3', source_id: 'folder-verkauf', target_id: 'node-sales-report', type: 'parent_child', weight: 1.0 },
            // Marketing department relations
            { id: 'rel-4', source_id: 'folder-q4-2025', target_id: 'node-campaign-brief', type: 'parent_child', weight: 1.0 },
            { id: 'rel-5', source_id: 'folder-q4-2025', target_id: 'node-creative-assets', type: 'parent_child', weight: 1.0 },
            // Finance department relations
            { id: 'rel-6', source_id: 'folder-2024-loans', target_id: 'node-loan-docs', type: 'parent_child', weight: 1.0 },
            // Product department relations
            { id: 'rel-7', source_id: 'folder-v2-features', target_id: 'node-feature-spec', type: 'parent_child', weight: 1.0 },
            // Semantic connections between important nodes (for nervous system visual)
            { id: 'rel-8', source_id: 'node-architecture', target_id: 'node-api-docs', type: 'semantic', weight: 0.8 },
            { id: 'rel-9', source_id: 'node-brand-guide', target_id: 'node-design-tokens', type: 'semantic', weight: 0.7 },
            { id: 'rel-10', source_id: 'node-q4-strategy', target_id: 'node-budget-master', type: 'semantic', weight: 0.9 },
            { id: 'rel-11', source_id: 'node-hiring-plan', target_id: 'node-budget-master', type: 'semantic', weight: 0.6 }
        ]
    },

    // 2. SAIMÔR HQ (Solo Founder)
    solo: {
        departments: [
            { id: 'dept-prod', tenant_id: 'tenant-default', name: 'Product', slug: 'product', description: 'Core Product Development', color: '#10B981', order: 0 },
            { id: 'dept-growth', tenant_id: 'tenant-default', name: 'Growth', slug: 'growth', description: 'Marketing & Sales', color: '#3B82F6', order: 1 },
            { id: 'dept-ops', tenant_id: 'tenant-default', name: 'Operations', slug: 'operations', description: 'Legal, Admin, Finance', color: '#64748B', order: 2 },
            { id: 'dept-strat', tenant_id: 'tenant-default', name: 'Strategy', slug: 'strategy', description: 'Vision & Planning', color: '#F59E0B', order: 3 }
        ],
        spaces: {
            'dept-prod': [
                { id: 'space-roadmap', name: 'Roadmap', description: 'Q1 2026 Goals', departmentId: 'dept-prod' },
                { id: 'space-features', name: 'Features', description: 'Backlog & Specs', departmentId: 'dept-prod' },
                { id: 'space-bugs', name: 'Bugs', description: 'Issue Tracker', departmentId: 'dept-prod' }
            ],
            'dept-growth': [
                { id: 'space-outreach', name: 'Outreach', description: 'Cold Emailing', departmentId: 'dept-growth' },
                { id: 'space-content', name: 'Content Plan', description: 'Blog & Socials', departmentId: 'dept-growth' },
                { id: 'space-analytics', name: 'Analytics', description: 'Metrics & KPIs', departmentId: 'dept-growth' }
            ],
            'dept-ops': [
                { id: 'space-legal', name: 'Legal', description: 'Contracts & IP', departmentId: 'dept-ops' },
                { id: 'space-finance', name: 'Finance', description: 'Invoices & Taxes', departmentId: 'dept-ops' },
                { id: 'space-tools', name: 'Tools', description: 'SaaS Subscriptions', departmentId: 'dept-ops' }
            ],
            'dept-strat': [
                { id: 'space-vision', name: 'Vision', description: 'Long-term Goals', departmentId: 'dept-strat' },
                { id: 'space-pitch', name: 'Pitch Deck', description: 'Investor Slides', departmentId: 'dept-strat' }
            ]
        },
        nodes: []
    }
};
