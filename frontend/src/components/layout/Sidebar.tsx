import { LogOut } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { env } from '@/config/env';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { USER_ROLE_LABELS } from '@/types/enums';
import { getFullName } from '@/utils/format';

import { getVisibleNavGroups } from './navigation';

export interface SidebarProps {
  /** Mobil çekmecede bağlantıya tıklanınca paneli kapatmak için. */
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({ onNavigate, className }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const groups = getVisibleNavGroups(user);

  return (
    <div className={cn('flex h-full flex-col bg-sidebar text-sidebar-foreground', className)}>
      {/* Marka */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
        <span
          className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
          aria-hidden="true"
        >
          N
        </span>
        <span className="text-sm font-semibold tracking-tight">{env.appName}</span>
      </div>

      {/* Gezinme */}
      <nav className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-3 py-4" aria-label="Ana gezinme">
        {groups.map((group, groupIndex) => (
          <div key={group.label ?? `group-${groupIndex}`} className={cn(groupIndex > 0 && 'mt-6')}>
            {group.label ? (
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.matchPrefix
                  ? location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
                  : location.pathname === item.to;

                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onNavigate}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-subtle text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Kullanıcı + çıkış */}
      {user ? (
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <NavLink
            to="/profile"
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-md p-2 transition-colors hover:bg-accent"
          >
            <Avatar name={getFullName(user)} seed={user.id} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {getFullName(user)}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {USER_ROLE_LABELS[user.role]}
              </span>
            </span>
          </NavLink>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start text-muted-foreground"
            onClick={() => {
              onNavigate?.();
              void logout();
            }}
          >
            <LogOut aria-hidden="true" />
            Çıkış yap
          </Button>
        </div>
      ) : null}
    </div>
  );
}
