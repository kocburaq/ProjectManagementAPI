import { Archive, CalendarRange, MoreHorizontal, Pencil, Trash2, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ProjectStatusBadge } from '@/components/common/StatusBadge';
import { Avatar, AvatarStack } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectMembers } from '@/hooks/queries/useProjects';
import type { Project, ProjectTaskStats } from '@/types/models';
import { formatDateRange } from '@/utils/date';
import { formatPercent, truncate } from '@/utils/format';

export interface ProjectCardProps {
  project: Project;
  /** `undefined` ise sayaçlar hâlâ yükleniyor demektir. */
  stats?: ProjectTaskStats;
  statsLoading?: boolean;
  canManage: boolean;
  onEdit: (project: Project) => void;
  onArchive: (project: Project) => void;
  onDelete: (project: Project) => void;
}

/**
 * Proje kartı.
 *
 * Kartta gösterilen her alan backend'de gerçekten vardır:
 *   ad, açıklama, durum, başlangıç/bitiş, sahip → ProjectResponseDto
 *   görev sayısı / tamamlanan / ilerleme    → tasks endpoint'inin totalCount'u
 *   ekip üyeleri                            → projects/{id}/members
 * Uydurma alan (bütçe, etiket, öncelik vb.) eklenmemiştir.
 */
export function ProjectCard({
  project,
  stats,
  statsLoading = false,
  canManage,
  onEdit,
  onArchive,
  onDelete,
}: ProjectCardProps) {
  const membersQuery = useProjectMembers(project.id);
  const activeMembers = (membersQuery.data?.items ?? []).filter((member) => member.isActive);

  return (
    <Card className="group flex flex-col transition-shadow hover:shadow-sm">
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/projects/${project.id}`}
              className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
            >
              {project.name}
            </Link>
            <p className="mt-1 line-clamp-2 min-h-8 text-xs text-muted-foreground">
              {project.description ? truncate(project.description, 140) : 'Açıklama eklenmemiş.'}
            </p>
          </div>

          {canManage ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${project.name} için işlemler`}
                  className="shrink-0"
                >
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(project)}>
                  <Pencil aria-hidden="true" />
                  Düzenle
                </DropdownMenuItem>
                {project.isArchived ? null : (
                  <DropdownMenuItem onSelect={() => onArchive(project)}>
                    <Archive aria-hidden="true" />
                    Arşivle
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => onDelete(project)}>
                  <Trash2 aria-hidden="true" />
                  Sil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <ProjectStatusBadge status={project.status} />
          {project.isArchived ? (
            <Badge variant="neutral">
              <Archive className="size-3" aria-hidden="true" />
              Arşivlendi
            </Badge>
          ) : null}
        </div>

        {/* İlerleme */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">İlerleme</span>
            {statsLoading || !stats ? (
              <Skeleton className="h-3 w-20" />
            ) : (
              <span className="font-medium text-foreground">
                {stats.completedTasks}/{stats.totalTasks} görev · {formatPercent(stats.progress)}
              </span>
            )}
          </div>
          <Progress
            value={stats?.progress ?? 0}
            aria-label={`${project.name} ilerlemesi`}
            indicatorClassName={stats && stats.progress === 100 ? 'bg-success' : undefined}
          />
        </div>

        <div className="mt-auto space-y-2.5 border-t border-border pt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarRange className="size-3.5 shrink-0" aria-hidden="true" />
            {formatDateRange(project.startDate, project.endDate)}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
              <Avatar name={project.ownerName} seed={project.ownerId} size="xs" />
              <span className="truncate">{project.ownerName}</span>
            </span>

            {membersQuery.isLoading ? (
              <Skeleton className="h-6 w-16 rounded-full" />
            ) : (
              <AvatarStack
                people={activeMembers.map((member) => ({ id: member.userId, name: member.userName }))}
                max={3}
                size="xs"
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
