export interface UniverseSignal {
    id: string;
    title: string;
    subtitle: string;
    targetId: string;
    kind: 'rss' | 'mail' | 'calendar' | 'nightwatch';
    href?: string;
    severity?: string;
}