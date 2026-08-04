import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { OverdueBadge, PriorityBadge, TaskStatusBadge } from '@/components/common/StatusBadge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from '@/components/ui/table';
import { TaskStatus } from '@/types/enums';
import type { Project, Task } from '@/types/models';
import { formatDate, formatDueLabel, isPastDue } from '@/utils/date';
import { formatHours } from '@/utils/format';

export interface TaskTableProps {
  tasks: Task[];
  /** Proje adını göstermek için id → proje eşlemesi. */
  projectsById: Map<number, Project>;
  onOpen: (taskId: number) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  canManage?: (task: Task) => boolean;
  /** Proje sütunu proje detayında gereksizdir. */
  hideProjectColumn?: boolean;
}

/**
 * Görev tablosu.
 *
 * NOT: `TaskResponseDto` yorum sayısı DÖNMÜYOR (FRONTEND_API_GAPS.md #6), bu yüzden
 * "yorum sayısı" sütunu yerine yorumları açan bir eylem butonu var — sahte bir
 * sayaç gösterilmiyor.
 */
export function TaskTable({
  tasks,
  projectsById,
  onOpen,
  onEdit,
  onDelete,
  canManage,
  hideProjectColumn = false,
}: TaskTableProps) {
  return (
    <TableWrapper>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-56">Görev</TableHead>
            {hideProjectColumn ? null : <TableHead>Proje</TableHead>}
            <TableHead>Durum</TableHead>
            <TableHead>Öncelik</TableHead>
            <TableHead>Atanan</TableHead>
            <TableHead>Teslim</TableHead>
            <TableHead className="text-right">Süre</TableHead>
            <TableHead className="w-24 text-right">
              <span className="sr-only">İşlemler</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const overdue = isPastDue(task.dueDate) && task.status !== TaskStatus.Done;
            const manageable = canManage?.(task) ?? false;
            const project = projectsById.get(task.projectId);

            return (
              <TableRow key={task.id}>
                <TableCell className="max-w-80">
                  <button
                    type="button"
                    onClick={() => onOpen(task.id)}
                    className="block max-w-full truncate text-left font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {task.title}
                  </button>
                </TableCell>

                {hideProjectColumn ? null : (
                  <TableCell className="max-w-40">
                    {project ? (
                      <Link
                        to={`/projects/${project.id}`}
                        className="block truncate text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {project.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">#{task.projectId}</span>
                    )}
                  </TableCell>
                )}

                <TableCell>
                  <TaskStatusBadge status={task.status} />
                </TableCell>

                <TableCell>
                  <PriorityBadge priority={task.priority} />
                </TableCell>

                <TableCell>
                  {task.assignedToUserName ? (
                    <span className="flex items-center gap-2">
                      <Avatar
                        name={task.assignedToUserName}
                        seed={task.assignedToUserId ?? undefined}
                        size="xs"
                      />
                      <span className="max-w-32 truncate text-sm">{task.assignedToUserName}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Atanmadı</span>
                  )}
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  {task.dueDate ? (
                    overdue ? (
                      <OverdueBadge label={formatDueLabel(task.dueDate) ?? 'Gecikti'} />
                    ) : (
                      <span className="text-sm text-muted-foreground">{formatDate(task.dueDate)}</span>
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="whitespace-nowrap text-right text-sm text-muted-foreground">
                  {formatHours(task.actualHours)}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onOpen(task.id)}
                      aria-label={`${task.title} yorumlarını aç`}
                    >
                      <MessageSquare aria-hidden="true" />
                    </Button>

                    {manageable && onEdit && onDelete ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${task.title} için işlemler`}
                          >
                            <MoreHorizontal aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => onEdit(task)}>
                            <Pencil aria-hidden="true" />
                            Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive onSelect={() => onDelete(task)}>
                            <Trash2 aria-hidden="true" />
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}
