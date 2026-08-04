import { Archive, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ProjectStatusBadge } from '@/components/common/StatusBadge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from '@/components/ui/table';
import type { Project, ProjectTaskStats } from '@/types/models';
import { formatDate } from '@/utils/date';
import { formatPercent } from '@/utils/format';

export interface ProjectTableProps {
  projects: Project[];
  statsByProject: Map<number, ProjectTaskStats>;
  canManage: (project: Project) => boolean;
  onEdit: (project: Project) => void;
  onArchive: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectTable({
  projects,
  statsByProject,
  canManage,
  onEdit,
  onArchive,
  onDelete,
}: ProjectTableProps) {
  return (
    <TableWrapper>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Proje</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead className="min-w-40">İlerleme</TableHead>
            <TableHead>Sahip</TableHead>
            <TableHead>Başlangıç</TableHead>
            <TableHead>Bitiş</TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">İşlemler</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const stats = statsByProject.get(project.id);
            const manageable = canManage(project);

            return (
              <TableRow key={project.id}>
                <TableCell className="max-w-64">
                  <Link
                    to={`/projects/${project.id}`}
                    className="block truncate font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {project.name}
                  </Link>
                  {project.isArchived ? (
                    <span className="text-xs text-muted-foreground">Arşivlendi</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <ProjectStatusBadge status={project.status} />
                </TableCell>
                <TableCell>
                  {stats ? (
                    <div className="space-y-1">
                      <Progress value={stats.progress} aria-label={`${project.name} ilerlemesi`} />
                      <span className="text-xs text-muted-foreground">
                        {stats.completedTasks}/{stats.totalTasks} · {formatPercent(stats.progress)}
                      </span>
                    </div>
                  ) : (
                    <Skeleton className="h-4 w-24" />
                  )}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <Avatar name={project.ownerName} seed={project.ownerId} size="xs" />
                    <span className="truncate text-sm">{project.ownerName}</span>
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(project.startDate)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(project.endDate)}
                </TableCell>
                <TableCell className="text-right">
                  {manageable ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${project.name} için işlemler`}
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}
