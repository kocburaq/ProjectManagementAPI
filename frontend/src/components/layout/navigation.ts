import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  Clock,
  FolderKanban,
  LayoutDashboard,
  Settings,
  UserRound,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { User } from '@/types/models';
import { canViewUsers } from '@/utils/permissions';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Yalnızca belirli rollerin görebileceği bağlantılar için. */
  isVisible?: (user: User | null) => boolean;
  /** Alt yolları da aktif saymak için (ör. /projects/12). */
  matchPrefix?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ label: 'Panel', to: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Çalışma',
    items: [
      { label: 'Projeler', to: '/projects', icon: FolderKanban, matchPrefix: true },
      { label: 'Görevler', to: '/tasks', icon: CheckSquare },
      { label: 'Görevlerim', to: '/my-tasks', icon: UserRound },
      { label: 'Takvim', to: '/calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Ekip & Analiz',
    items: [
      // GET /api/users yalnızca Admin ve ProjectManager'a açık; TeamMember 403 alır.
      { label: 'Ekip', to: '/team', icon: Users, isVisible: canViewUsers },
      { label: 'Zaman Kayıtları', to: '/time-logs', icon: Clock },
      { label: 'Raporlar', to: '/reports', icon: BarChart3 },
    ],
  },
  {
    items: [{ label: 'Ayarlar', to: '/settings', icon: Settings }],
  },
];

/** Kullanıcının rolüne göre görünür bağlantıları süzer. */
export function getVisibleNavGroups(user: User | null): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => (item.isVisible ? item.isVisible(user) : true)),
  })).filter((group) => group.items.length > 0);
}
