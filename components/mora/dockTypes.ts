import { FileText, FolderOpen, MessageCircle, Search, Settings, Users } from 'lucide-react';

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
    finder: FolderOpen,
    chat: MessageCircle,
    team: Users,
    search: Search,
    notes: FileText,
    settings: Settings,
};
