import type { Snapshot } from './types';

// Mock snapshots for Timeline (t0, t1, t2) — multi-orb demo
// IDs remain stable so selections from Mind Loop can focus nodes across views.
export const mockSnapshots: Snapshot[] = [
  {
    ts: 't0',
    nodes: [
      { id: 'cafe_root', type: 'project', title: 'Cafe Aurora', spaceId: 'space_cafe', tags: ['cafe', 'operations'], path: '/spaces/cafe' },
      { id: 'cafe_daily', type: 'document', title: 'Daily Revenue Log', spaceId: 'space_cafe', tags: ['finance'], path: '/spaces/cafe/revenue/daily-log.md' },
      { id: 'cafe_customers', type: 'note', title: 'Top Stammgäste', spaceId: 'space_cafe', tags: ['customer'], path: '/spaces/cafe/customers/top.md' },

      { id: 'marketing_root', type: 'project', title: 'Marketing Core', spaceId: 'space_marketing', tags: ['campaigns'], path: '/spaces/marketing' },
      { id: 'marketing_campaign', type: 'document', title: 'Autumn Launch Plan', spaceId: 'space_marketing', tags: ['campaign'], path: '/spaces/marketing/campaigns/autumn.plan' },

      { id: 'finance_root', type: 'project', title: 'Finance Vault', spaceId: 'space_finance', tags: ['reporting'], path: '/spaces/finance' },
      { id: 'finance_forecast', type: 'document', title: 'Q4 Forecast Lite', spaceId: 'space_finance', tags: ['forecast'], path: '/spaces/finance/forecasts/Q4-lite.xlsx' },

      { id: 'lab_root', type: 'project', title: 'Field Research Lab', spaceId: 'space_lab', tags: ['r+d'], path: '/spaces/lab' },
      { id: 'lab_protocol', type: 'document', title: 'Mycelium Sensor Protocol', spaceId: 'space_lab', tags: ['hardware'], path: '/spaces/lab/protocols/sensor.md' },

      { id: 'archive_root', type: 'project', title: 'Archive Orchard', spaceId: 'space_archive', tags: ['knowledge'], path: '/spaces/archive' },
      { id: 'archive_manifest', type: 'document', title: 'Legacy Manifest', spaceId: 'space_archive', tags: ['history'], path: '/spaces/archive/manifest.md' },
    ],
    edges: [
      { sourceId: 'cafe_root', targetId: 'cafe_daily', kind: 'contains', weight: 1 },
      { sourceId: 'cafe_root', targetId: 'cafe_customers', kind: 'contains', weight: 1 },

      { sourceId: 'marketing_root', targetId: 'marketing_campaign', kind: 'contains', weight: 1 },
      { sourceId: 'finance_root', targetId: 'finance_forecast', kind: 'contains', weight: 1 },
      { sourceId: 'lab_root', targetId: 'lab_protocol', kind: 'contains', weight: 1 },
      { sourceId: 'archive_root', targetId: 'archive_manifest', kind: 'contains', weight: 1 },

      { sourceId: 'marketing_campaign', targetId: 'cafe_root', kind: 'supports', weight: 0.6 },
      { sourceId: 'finance_forecast', targetId: 'cafe_daily', kind: 'informs', weight: 0.7 },
    ],
  },
  {
    ts: 't1',
    nodes: [
      { id: 'cafe_root', type: 'project', title: 'Cafe Aurora', spaceId: 'space_cafe', tags: ['cafe', 'operations'], path: '/spaces/cafe' },
      { id: 'cafe_daily', type: 'document', title: 'Daily Revenue Log', spaceId: 'space_cafe', tags: ['finance'], path: '/spaces/cafe/revenue/daily-log.md' },
      { id: 'cafe_customers', type: 'note', title: 'Top Stammgäste', spaceId: 'space_cafe', tags: ['customer'], path: '/spaces/cafe/customers/top.md' },
      { id: 'cafe_queue', type: 'insight', title: 'Queue Heatmap', spaceId: 'space_cafe', tags: ['insight'], path: '/spaces/cafe/insights/queue' },

      { id: 'marketing_root', type: 'project', title: 'Marketing Core', spaceId: 'space_marketing', tags: ['campaigns'], path: '/spaces/marketing' },
      { id: 'marketing_campaign', type: 'document', title: 'Autumn Launch Plan', spaceId: 'space_marketing', tags: ['campaign'], path: '/spaces/marketing/campaigns/autumn.plan' },
      { id: 'marketing_assets', type: 'folder', title: 'Asset Library', spaceId: 'space_marketing', tags: ['assets'], path: '/spaces/marketing/assets' },

      { id: 'finance_root', type: 'project', title: 'Finance Vault', spaceId: 'space_finance', tags: ['reporting'], path: '/spaces/finance' },
      { id: 'finance_forecast', type: 'document', title: 'Q4 Forecast Lite', spaceId: 'space_finance', tags: ['forecast'], path: '/spaces/finance/forecasts/Q4-lite.xlsx' },
      { id: 'finance_payables', type: 'document', title: 'Vendor Payables', spaceId: 'space_finance', tags: ['payables'], path: '/spaces/finance/payables/vendors.xlsx' },

      { id: 'lab_root', type: 'project', title: 'Field Research Lab', spaceId: 'space_lab', tags: ['r+d'], path: '/spaces/lab' },
      { id: 'lab_protocol', type: 'document', title: 'Mycelium Sensor Protocol', spaceId: 'space_lab', tags: ['hardware'], path: '/spaces/lab/protocols/sensor.md' },
      { id: 'lab_trials', type: 'document', title: 'Trial Dataset #12', spaceId: 'space_lab', tags: ['dataset'], path: '/spaces/lab/trials/12.json' },

      { id: 'archive_root', type: 'project', title: 'Archive Orchard', spaceId: 'space_archive', tags: ['knowledge'], path: '/spaces/archive' },
      { id: 'archive_manifest', type: 'document', title: 'Legacy Manifest', spaceId: 'space_archive', tags: ['history'], path: '/spaces/archive/manifest.md' },
      { id: 'archive_minutes', type: 'document', title: 'Founders Notes', spaceId: 'space_archive', tags: ['notes'], path: '/spaces/archive/founders/meeting-notes.md' },
    ],
    edges: [
      { sourceId: 'cafe_root', targetId: 'cafe_daily', kind: 'contains', weight: 1 },
      { sourceId: 'cafe_root', targetId: 'cafe_customers', kind: 'contains', weight: 1 },
      { sourceId: 'cafe_root', targetId: 'cafe_queue', kind: 'contains', weight: 1 },
      { sourceId: 'cafe_queue', targetId: 'lab_trials', kind: 'uses', weight: 0.6 },

      { sourceId: 'marketing_root', targetId: 'marketing_campaign', kind: 'contains', weight: 1 },
      { sourceId: 'marketing_root', targetId: 'marketing_assets', kind: 'contains', weight: 1 },
      { sourceId: 'marketing_campaign', targetId: 'marketing_assets', kind: 'references', weight: 0.8 },

      { sourceId: 'finance_root', targetId: 'finance_forecast', kind: 'contains', weight: 1 },
      { sourceId: 'finance_root', targetId: 'finance_payables', kind: 'contains', weight: 1 },
      { sourceId: 'finance_payables', targetId: 'cafe_root', kind: 'funds', weight: 0.7 },

      { sourceId: 'lab_root', targetId: 'lab_protocol', kind: 'contains', weight: 1 },
      { sourceId: 'lab_root', targetId: 'lab_trials', kind: 'contains', weight: 1 },

      { sourceId: 'archive_root', targetId: 'archive_manifest', kind: 'contains', weight: 1 },
      { sourceId: 'archive_root', targetId: 'archive_minutes', kind: 'contains', weight: 1 },

      { sourceId: 'archive_minutes', targetId: 'marketing_campaign', kind: 'inspires', weight: 0.4 },
      { sourceId: 'lab_protocol', targetId: 'marketing_assets', kind: 'supplies', weight: 0.5 },
    ],
  },
  {
    ts: 't2',
    nodes: [
      { id: 'cafe_root', type: 'project', title: 'Cafe Aurora', spaceId: 'space_cafe', tags: ['cafe', 'operations'], path: '/spaces/cafe' },
      { id: 'cafe_daily', type: 'document', title: 'Daily Revenue Log', spaceId: 'space_cafe', tags: ['finance'], path: '/spaces/cafe/revenue/daily-log.md' },
      { id: 'cafe_customers', type: 'note', title: 'Top Stammgäste', spaceId: 'space_cafe', tags: ['customer'], path: '/spaces/cafe/customers/top.md' },
      { id: 'cafe_queue', type: 'insight', title: 'Queue Heatmap', spaceId: 'space_cafe', tags: ['insight'], path: '/spaces/cafe/insights/queue' },
      { id: 'cafe_menu', type: 'document', title: 'Menu Refresh', spaceId: 'space_cafe', tags: ['menu'], path: '/spaces/cafe/menu/refresh.md' },
      { id: 'cafe_training', type: 'task', title: 'Barista Training Wave', spaceId: 'space_cafe', tags: ['training'], path: '/spaces/cafe/training/barista-wave' },

      { id: 'marketing_root', type: 'project', title: 'Marketing Core', spaceId: 'space_marketing', tags: ['campaigns'], path: '/spaces/marketing' },
      { id: 'marketing_campaign', type: 'document', title: 'Autumn Launch Plan', spaceId: 'space_marketing', tags: ['campaign'], path: '/spaces/marketing/campaigns/autumn.plan' },
      { id: 'marketing_assets', type: 'folder', title: 'Asset Library', spaceId: 'space_marketing', tags: ['assets'], path: '/spaces/marketing/assets' },
      { id: 'marketing_report', type: 'document', title: 'Engagement Pulse', spaceId: 'space_marketing', tags: ['report'], path: '/spaces/marketing/reports/engagement.md' },

      { id: 'finance_root', type: 'project', title: 'Finance Vault', spaceId: 'space_finance', tags: ['reporting'], path: '/spaces/finance' },
      { id: 'finance_forecast', type: 'document', title: 'Q4 Forecast Lite', spaceId: 'space_finance', tags: ['forecast'], path: '/spaces/finance/forecasts/Q4-lite.xlsx' },
      { id: 'finance_payables', type: 'document', title: 'Vendor Payables', spaceId: 'space_finance', tags: ['payables'], path: '/spaces/finance/payables/vendors.xlsx' },
      { id: 'finance_dashboard', type: 'document', title: 'Liquidity Dashboard', spaceId: 'space_finance', tags: ['dashboard'], path: '/spaces/finance/dashboards/liquidity' },

      { id: 'lab_root', type: 'project', title: 'Field Research Lab', spaceId: 'space_lab', tags: ['r+d'], path: '/spaces/lab' },
      { id: 'lab_protocol', type: 'document', title: 'Mycelium Sensor Protocol', spaceId: 'space_lab', tags: ['hardware'], path: '/spaces/lab/protocols/sensor.md' },
      { id: 'lab_trials', type: 'document', title: 'Trial Dataset #12', spaceId: 'space_lab', tags: ['dataset'], path: '/spaces/lab/trials/12.json' },
      { id: 'lab_blueprint', type: 'insight', title: 'Spore Blueprint', spaceId: 'space_lab', tags: ['blueprint'], path: '/spaces/lab/blueprints/spore' },

      { id: 'archive_root', type: 'project', title: 'Archive Orchard', spaceId: 'space_archive', tags: ['knowledge'], path: '/spaces/archive' },
      { id: 'archive_manifest', type: 'document', title: 'Legacy Manifest', spaceId: 'space_archive', tags: ['history'], path: '/spaces/archive/manifest.md' },
      { id: 'archive_minutes', type: 'document', title: 'Founders Notes', spaceId: 'space_archive', tags: ['notes'], path: '/spaces/archive/founders/meeting-notes.md' },
      { id: 'archive_map', type: 'link', title: 'Knowledge Map', spaceId: 'space_archive', tags: ['graph'], path: 'https://mora.local/archive/map' },
    ],
    edges: [
      { sourceId: 'cafe_root', targetId: 'cafe_daily', kind: 'contains', weight: 1 },
      { sourceId: 'cafe_root', targetId: 'cafe_customers', kind: 'contains', weight: 1 },
      { sourceId: 'cafe_root', targetId: 'cafe_queue', kind: 'contains', weight: 1 },
      { sourceId: 'cafe_root', targetId: 'cafe_menu', kind: 'contains', weight: 1 },
      { sourceId: 'cafe_root', targetId: 'cafe_training', kind: 'contains', weight: 1 },
      { sourceId: 'cafe_training', targetId: 'lab_blueprint', kind: 'inspired_by', weight: 0.7 },

      { sourceId: 'marketing_root', targetId: 'marketing_campaign', kind: 'contains', weight: 1 },
      { sourceId: 'marketing_root', targetId: 'marketing_assets', kind: 'contains', weight: 1 },
      { sourceId: 'marketing_root', targetId: 'marketing_report', kind: 'contains', weight: 1 },
      { sourceId: 'marketing_report', targetId: 'cafe_queue', kind: 'analyzes', weight: 0.8 },

      { sourceId: 'finance_root', targetId: 'finance_forecast', kind: 'contains', weight: 1 },
      { sourceId: 'finance_root', targetId: 'finance_payables', kind: 'contains', weight: 1 },
      { sourceId: 'finance_root', targetId: 'finance_dashboard', kind: 'contains', weight: 1 },
      { sourceId: 'finance_dashboard', targetId: 'cafe_daily', kind: 'aggregates', weight: 0.9 },

      { sourceId: 'lab_root', targetId: 'lab_protocol', kind: 'contains', weight: 1 },
      { sourceId: 'lab_root', targetId: 'lab_trials', kind: 'contains', weight: 1 },
      { sourceId: 'lab_root', targetId: 'lab_blueprint', kind: 'contains', weight: 1 },
      { sourceId: 'lab_trials', targetId: 'archive_map', kind: 'publishes', weight: 0.6 },

      { sourceId: 'archive_root', targetId: 'archive_manifest', kind: 'contains', weight: 1 },
      { sourceId: 'archive_root', targetId: 'archive_minutes', kind: 'contains', weight: 1 },
      { sourceId: 'archive_root', targetId: 'archive_map', kind: 'contains', weight: 1 },

      { sourceId: 'archive_map', targetId: 'marketing_assets', kind: 'references', weight: 0.5 },
      { sourceId: 'finance_payables', targetId: 'archive_manifest', kind: 'audits', weight: 0.4 },
      { sourceId: 'marketing_campaign', targetId: 'cafe_menu', kind: 'influences', weight: 0.7 },
    ],
  },
];
