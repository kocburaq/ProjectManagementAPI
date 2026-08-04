import { CalendarClock, CheckCircle2, ListTodo, Sun, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ListSkeleton } from '@/components/common/Skeletons';
import { OverdueBadge, PriorityBadge, TaskStatusBadge } from '@/components/common/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAllProjects } from '@/hooks/queries/useProjects';
import { useAllTasks } from '@/hooks/queries/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { TaskStatus } from '@/types/enums';
import type { Project, Task } from '@/types/models';
import { daysUntil, formatDate, formatDueLabel } from '@/utils/date';
import { formatHours } from '@/utils/format';

interface Section {
  key: string;
  title: string;
  icon: LucideIcon;
  iconClassName: string;
  description: string;
  tasks: Task[];
}

/**
 * Görevlerim.
 *
 * Backend'de "bana atananlar" için ayrı bir uç yok, ancak `GET /api/tasks`
 * `assignedToUserId` filtresini destekliyor ve oturum sahibinin id'si login
 * yanıtından biliniyor — bu yüzden gerçek API ile güvenli biçimde filtrelenebiliyor.
 * Bugün / yaklaşan / geciken ayrımı teslim tarihine göre istemcide yapılır.
 */
export function MyTasksPage() {
  const { user } = useAuth();
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  const tasksQuery = useAllTasks(
    { assignedToUserId: user?.id, sortBy: 'dueDate', sortDirection: 'asc' },
    Boolean(user),
  );
  const projectsQuery = useAllProjects();

  const projectsById = useMemo(() => {
    const map = new Map<number, Project>();
    for (const project of projectsQuery.data ?? []) map.set(project.id, project);
    return map;
  }, [projectsQuery.data]);

  const sections = useMemo<Section[]>(() => {
    const tasks = tasksQuery.data?.items ?? [];

    const open = tasks.filter((task) => task.status !== TaskStatus.Done);
    const completed = tasks.filter((task) => task.status === TaskStatus.Done);

    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];

    for (const task of open) {
      const remaining = daysUntil(task.dueDate);

      if (remaining === null) {
        // Teslim tarihi olmayan görevler "yaklaşan" bölümünde toplanır.
        upcoming.push(task);
      } else if (remaining < 0) {
        overdue.push(task);
      } else if (remaining === 0) {
        today.push(task);
      } else {
        upcoming.push(task);
      }
    }

    return [
      {
        key: 'overdue',
        title: 'Geciken',
        icon: TriangleAlert,
        iconClassName: 'size-4 text-danger',
        description: 'Teslim tarihi geçmiş ve hâlâ tamamlanmamış görevler.',
        tasks: overdue,
      },
      {
        key: 'today',
        title: 'Bugün',
        icon: Sun,
        iconClassName: 'size-4 text-warning',
        description: 'Bugün teslim edilmesi gereken görevler.',
        tasks: today,
      },
      {
        key: 'upcoming',
        title: 'Yaklaşan',
        icon: CalendarClock,
        iconClassName: 'size-4 text-muted-foreground',
        description: 'İleri tarihli ve tarihi belirlenmemiş görevler.',
        tasks: upcoming,
      },
      {
        key: 'completed',
        title: 'Tamamlanan',
        icon: CheckCircle2,
        iconClassName: 'size-4 text-success',
        description: 'Tamamlandı olarak işaretlenen görevler.',
        tasks: completed,
      },
    ];
  }, [tasksQuery.data]);

  const totalOpen = sections
    .filter((section) => section.key !== 'completed')
    .reduce((sum, section) => sum + section.tasks.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Görevlerim"
        description={user ? `${user.firstName} ${user.lastName} üzerine atanmış görevler.` : undefined}
        breadcrumbs={[{ label: 'Panel', to: '/dashboard' }, { label: 'Görevlerim' }]}
        actions={totalOpen > 0 ? <Badge variant="neutral">{totalOpen} açık görev</Badge> : null}
      />

      {tasksQuery.data?.truncated ? (
        <Alert variant="warning" title="Kısmi liste">
          Size atanmış {tasksQuery.data.totalCount} görevden ilk {tasksQuery.data.items.length} tanesi
          yüklendi. API sayfa başına en fazla 100 kayıt döndürdüğü ve toplu indirme bilinçli olarak
          sınırlandığı için liste kırpıldı.
        </Alert>
      ) : null}

      {tasksQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index}>
              <CardContent className="p-5">
                <ListSkeleton rows={3} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tasksQuery.isError ? (
        <ErrorState error={tasksQuery.error} onRetry={() => void tasksQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <Card key={section.key} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Icon className={section.iconClassName} aria-hidden="true" />
                    {section.title}
                    <Badge variant="neutral" className="ml-auto">
                      {section.tasks.length}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </CardHeader>
                <CardContent className="flex-1">
                  {section.tasks.length === 0 ? (
                    <EmptyState icon={ListTodo} title="Bu bölümde görev yok" bare className="py-6" />
                  ) : (
                    <ul className="divide-y divide-border">
                      {section.tasks.slice(0, 8).map((task) => {
                        const project = projectsById.get(task.projectId);

                        return (
                          <li key={task.id} className="py-2.5 first:pt-0">
                            <button
                              type="button"
                              onClick={() => setOpenTaskId(task.id)}
                              className="block w-full text-left"
                            >
                              <span className="block truncate text-sm font-medium text-foreground transition-colors hover:text-primary">
                                {task.title}
                              </span>
                            </button>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {project ? (
                                <Link
                                  to={`/projects/${project.id}`}
                                  className="max-w-40 truncate text-xs text-muted-foreground hover:text-primary"
                                >
                                  {project.name}
                                </Link>
                              ) : null}
                              <PriorityBadge priority={task.priority} />
                              {section.key === 'completed' ? (
                                <TaskStatusBadge status={task.status} />
                              ) : section.key === 'overdue' ? (
                                <OverdueBadge label={formatDueLabel(task.dueDate) ?? 'Gecikti'} />
                              ) : task.dueDate ? (
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(task.dueDate)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Tarihsiz</span>
                              )}
                              {task.actualHours > 0 ? (
                                <span className="text-xs text-muted-foreground">
                                  · {formatHours(task.actualHours)}
                                </span>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {section.tasks.length > 8 ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      +{section.tasks.length - 8} görev daha.{' '}
                      <Link to="/tasks" className="text-primary hover:underline">
                        Tümünü gör
                      </Link>
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TaskDetailDrawer
        taskId={openTaskId}
        onOpenChange={(open) => (open ? undefined : setOpenTaskId(null))}
      />
    </div>
  );
}
