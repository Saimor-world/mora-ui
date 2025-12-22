/**
 * SAIMÔR MOCK DATA - CLEAN VERSION
 * 
 * Only 2 Companies:
 * 1. Simple Coffee Group (DEMO) - For showcasing
 * 2. Saimor HQ (YOUR COMPANY) - For real work
 * 
 * MASTERBIBLE HIERARCHY:
 * - Company = Root
 * - Planets = Departments  
 * - Moons = Spaces
 * - Stars = Folders
 * - Nodes = Content (background particles)
 */

export const MOCK_DATA = {
    // ═══════════════════════════════════════════════════════════════════════════
    // 1. SIMPLE COFFEE GROUP (DEMO COMPANY)
    // ═══════════════════════════════════════════════════════════════════════════
    demo: {
        company: {
            id: 'comp-simple-coffee',
            name: 'Simple Coffee Group',
            description: 'Demo Company for Showcasing SAIMÔR',
            is_demo: true,
            logo: null // Placeholder
        },
        departments: [
            { id: 'dept-cafe', tenant_id: 'comp-simple-coffee', name: 'Café Operations', slug: 'cafe', description: 'Daily café management', color: '#F59E0B', order: 0 },
            { id: 'dept-roast', tenant_id: 'comp-simple-coffee', name: 'Roastery', slug: 'roast', description: 'Coffee roasting', color: '#EF4444', order: 1 },
            { id: 'dept-retail', tenant_id: 'comp-simple-coffee', name: 'Retail', slug: 'retail', description: 'Online & store sales', color: '#10B981', order: 2 }
        ],
        spaces: {
            'dept-cafe': [
                { id: 'space-bar', name: 'Espresso Bar', description: 'Coffee service', departmentId: 'dept-cafe' },
                { id: 'space-kitchen', name: 'Kitchen', description: 'Food prep', departmentId: 'dept-cafe' }
            ],
            'dept-roast': [
                { id: 'space-beans', name: 'Bean Selection', description: 'Green coffee sourcing', departmentId: 'dept-roast' },
                { id: 'space-process', name: 'Roast Process', description: 'Roasting profiles', departmentId: 'dept-roast' }
            ],
            'dept-retail': [
                { id: 'space-shop', name: 'Online Shop', description: 'E-commerce', departmentId: 'dept-retail' },
                { id: 'space-events', name: 'Events', description: 'Tastings & workshops', departmentId: 'dept-retail' }
            ]
        },
        folders: {
            'space-bar': [
                { id: 'folder-menu', name: 'Menu', description: 'Drink recipes', space_id: 'space-bar', order: 0 },
                { id: 'folder-staff', name: 'Staff Schedule', description: 'Shifts', space_id: 'space-bar', order: 1 }
            ],
            'space-beans': [
                { id: 'folder-suppliers', name: 'Suppliers', description: 'Green bean sources', space_id: 'space-beans', order: 0 }
            ],
            'space-shop': [
                { id: 'folder-products', name: 'Products', description: 'Coffee products', space_id: 'space-shop', order: 0 },
                { id: 'folder-orders', name: 'Orders', description: 'Customer orders', space_id: 'space-shop', order: 1 }
            ]
        },
        nodes: [
            {
                id: 'node-espresso-guide',
                space_id: 'space-bar',
                title: 'Espresso Brewing Guide',
                type: 'document',
                content: 'Perfect espresso extraction...',
                metadata: { tags: ['coffee', 'guide', 'important'], weight: 0.9 },
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-12-01T10:00:00Z'
            },
            {
                id: 'node-supplier-list',
                space_id: 'space-beans',
                title: 'Approved Suppliers',
                type: 'document',
                content: 'List of coffee bean suppliers...',
                metadata: { tags: ['suppliers', 'beans'], weight: 0.7 },
                created_at: '2024-03-01T10:00:00Z',
                updated_at: '2024-11-15T10:00:00Z'
            }
        ],
        relations: []
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. SAIMOR HQ (YOUR COMPANY)
    // ═══════════════════════════════════════════════════════════════════════════
    solo: {
        company: {
            id: 'comp-saimor-hq',
            name: 'Saimôr HQ',
            description: 'Your personal workspace',
            is_demo: false,
            logo: null // Placeholder
        },
        departments: [
            { id: 'dept-product', tenant_id: 'comp-saimor-hq', name: 'Product', slug: 'product', description: 'Building SAIMÔR', color: '#10B981', order: 0 },
            { id: 'dept-growth', tenant_id: 'comp-saimor-hq', name: 'Growth', slug: 'growth', description: 'Marketing & Outreach', color: '#3B82F6', order: 1 }
        ],
        spaces: {
            'dept-product': [
                { id: 'space-roadmap', name: 'Roadmap', description: 'Product timeline', departmentId: 'dept-product' },
                { id: 'space-dev', name: 'Development', description: 'Active sprints', departmentId: 'dept-product' }
            ],
            'dept-growth': [
                { id: 'space-marketing', name: 'Marketing', description: 'Campaigns', departmentId: 'dept-growth' },
                { id: 'space-community', name: 'Community', description: 'User engagement', departmentId: 'dept-growth' }
            ]
        },
        folders: {
            'space-roadmap': [
                { id: 'folder-q1', name: 'Q1 2026', description: 'Q1 Goals', space_id: 'space-roadmap', order: 0 }
            ],
            'space-dev': [
                { id: 'folder-beta', name: 'Beta 1.5', description: 'Current sprint', space_id: 'space-dev', order: 0 }
            ],
            'space-marketing': [
                { id: 'folder-content', name: 'Content', description: 'Blog & Social', space_id: 'space-marketing', order: 0 }
            ]
        },
        nodes: [
            {
                id: 'node-vision',
                space_id: 'space-roadmap',
                title: 'SAIMÔR Vision 2026',
                type: 'document',
                content: 'Building the future of knowledge work...',
                metadata: { tags: ['vision', 'strategy', 'important'], weight: 1.0 },
                created_at: '2024-12-01T10:00:00Z',
                updated_at: '2024-12-12T10:00:00Z'
            }
        ],
        relations: []
    }
};

// Helper to get the right mock data based on mode
export const getMockData = (mode: 'demo' | 'workspace') => {
    return mode === 'demo' ? MOCK_DATA.demo : MOCK_DATA.solo;
};
