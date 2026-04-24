import {
    AppWindow,
    Bell,
    Bot,
    Calendar,
    FileText,
    FolderHeart,
    FolderOpen,
    Globe,
    Grid3X3,
    Mail,
    MessageCircle,
    Monitor,
    NotebookText,
    Palette,
    Search,
    Settings,
    ShieldCheck,
    Terminal,
    Users,
} from 'lucide-react';

export interface DockItem {
    icon: React.ComponentType<any>;
    label: string;
    shortcut: string | null;
    action: string;
    description: string;
    disabled?: boolean;
    badge?: number;
    hidden?: boolean;
}

export const MINIMIZED_ICON_MAP: Record<string, React.ComponentType<any>> = {
    apps: Grid3X3,
    browser: Globe,
    calendar: Calendar,
    canvas: Palette,
    document: FileText,
    finder: FolderOpen,
    grid: Grid3X3,
    chat: MessageCircle,
    integrations: ShieldCheck,
    mail: Mail,
    'meine-dateien': FolderHeart,
    'mora-hub': Bot,
    scanner: Bell,
    team: Users,
    search: Search,
    notes: NotebookText,
    settings: Settings,
    tasks: AppWindow,
    terminal: Terminal,
    timeline: Monitor,
    users: Users,
};
