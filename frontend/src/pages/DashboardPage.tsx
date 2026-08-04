import {
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock,
  FolderKanban,
  ListTodo,
  TriangleAlert,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { StatCard } from '@/components/dashboard/StatCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SectionCard } from '@/components/common/SectionCard';
import { ChartSkeleton, ListSkeleton, StatCardsSkeleton } from '@/components/common/Skeletons';
import { OverdueBadge, PriorityBadge } from '@/components/common/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { TaskStatusChart } from '@/components/reports/TaskStatusChart';
import { WeeklyCompletionChart } from '@/components/reports/WeeklyCompletionChart';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAllProjects, useProjectStatsList } from '@/hooks/queries/useProjects';
import { useAllTasks } from '@/hooks/queries/useTasks';
import { useTimeLogAggregate } from '@/hooks/queries/useTimeLogs';
import { useWorkspaceStats } from '@/hooks/queries/useWorkspaceStats';
import { useAuth } from '@/hooks/useAuth';
import { sumHours } from '@/services/timeLogService';
import { ProjectStatus, TaskStatus } from '@/types/enums';
import type { Project, ProjectTaskStats, Task } from '@/types/models';
import { currentWeekRange, daysUntil, formatDate, formatDueLabel } from '@/utils/date';
import { formatHours, formatPercent } from '@/utils/format';

export function DashboardPage() {
  const { user } = useAuth();
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  const statsQuery = useWorkspaceStats();
  const projectsQuery = useAllProjects();

  // Kullanıcıya atanmış görevler (grafikler ve "görevlerim" listesi için).
  const myTasksQuery = useAllTasks(
    { assignedToUserId: user?.id, sortBy: 'dueDate', sortDirection: 'asc' },
    Boolean(user),
  );

  // Yaklaşan teslimler için erişilebilir tüm açık görevler.
  const upcomingQuery = useAllTasks({ sortBy: 'dueDate', sortDirection: 'asc' });

  // Bu hafta kaydedilen süre — /api/time-logs `from`/`to` filtrelerini destekliyor.
  const week = useMemo(() => currentWeekRange(), []);
  const weeklyLogsQuery = useTimeLogAggregate({ from: week.from, to: week.to });

  const activeProjects = useMemo(
    () =>
      (projectsQuery.data ?? [])
        .filter((project) => !project.isArchived && project.status === ProjectStatus.Active)
        .slice(0, 5),
    [projectsQuery.data],
  );

  const projectStats = useProjectStatsList(activeProjects.map((project) => project.id));
  const statsByProject = useMemo(() => {
    const map = new Map<number, ProjectTaskStats>();
    for (const result of projectStats) {
      if (result.data) map.set(result.data.projectId, result.data);
    }
    return map;
  }, [projectStats]);

  const upcomingTasks = useMemo(() => {
    return (upcomingQuery.data?.items ?? [])
      .filter((task) => {
        if (task.status === TaskStatus.Done || !task.dueDate) return false;
        const remaining = daysUntil(task.dueDate);
        return remaining !== null && remaining >= 0 && remaining <= 14;
      })
      .slice(0, 6);
  }, [upcomingQuery.data]);

  const myOpenTasks = useMemo(
    () => (myTasksQuery.data?.items ?? []).filter((task) => task.status !== TaskStatus.Done).slice(0, 6),
    [myTasksQuery.data],
  );

  // Durum dağılımı grafiği için sayaçlar — workspace istatistiklerinden (totalCount).
  const statusCounts = useMemo(() => {
    const stats = statsQuery.data;
    return {
      [TaskStatus.Todo]: stats?.todoTasks ?? 0,
      [TaskStatus.InProgress]: stats?.inProgressTasks ?? 0,
      [TaskStatus.InReview]: stats?.inReviewTasks ?? 0,
      [TaskStatus.Done]: stats?.completedTasks ?? 0,
    } as Record<TaskStatus, number>;
  }, [statsQuery.data]);

  const weeklyHours = sumHours(weeklyLogsQuery.data?.items ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={user ? `Merhaba, ${user.firstName}` : 'Panel'}
        description="Çalışma alanınızın güncel durumu."
        breadcrumbs={[{ label: 'Panel' }]}
        actions={
          <Button variant="outline" asChild>
            <Link to="/my-tasks">
              <ListTodo aria-hidden="true" />
              Görevlerim
            </Link>
          </Button>
        }
      />

      {/* İstatistik kartları — hepsi ilgili filtreli sayfaya bağlı */}
      {statsQuery.isLoading ? (
        <StatCardsSkeleton />
      ) : statsQuery.isError ? (
        <ErrorState error={statsQuery.error} onRetry={() => void statsQuery.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Toplam proje"
              value={statsQuery.data?.totalProjects ?? 0}
              hint={`${statsQuery.data?.activeProjects ?? 0} tanesi aktif`}
              icon={FolderKanban}
              to="/projects"
              accent="primary"
            />
            <StatCard
              label="Aktif proje"
              value={statsQuery.data?.activeProjects ?? 0}
              hint="Durumu 'Aktif' olan projeler"
              icon={CircleDot}
              to={`/projects?status=${ProjectStatus.Active}`}
              accent="neutral"
            />
            <StatCard
              label="Toplam görev"
              value={statsQuery.data?.totalTasks ?? 0}
              hint={`${statsQuery.data?.completedTasks ?? 0} tamamlandı`}
              icon={ListTodo}
              to="/tasks"
              accent="neutral"
            />
            <StatCard
              label="Geciken görev"
              value={statsQuery.data?.overdueTasks ?? 0}
              hint="Teslim tarihi geçmiş ve açık"
              icon={TriangleAlert}
              to="/tasks?overdue=1"
              accent="danger"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Devam eden görev"
              value={statsQuery.data?.inProgressTasks ?? 0}
              hint="Durumu 'Devam Ediyor'"
              icon={CircleDot}
              to={`/tasks?status=${TaskStatus.InProgress}`}
              accent="primary"
            />
            <StatCard
              label="İncelemede"
              value={statsQuery.data?.inReviewTasks ?? 0}
              hint="Durumu 'İncelemede'"
              icon={Clock}
              to={`/tasks?status=${TaskStatus.InReview}`}
              accent="warning"
            />
            <StatCard
              label="Tamamlanan görev"
              value={statsQuery.data?.completedTasks ?? 0}
              hint="Durumu 'Tamamlandı'"
              icon={CheckCircle2}
              to={`/tasks?status=${TaskStatus.Done}`}
              accent="success"
            />
            <StatCard
              label="Bu hafta kaydedilen"
              value={Math.round(weeklyHours)}
              hint={`${formatHours(weeklyHours)} · ${weeklyLogsQuery.data?.items.length ?? 0} kayıt`}
              icon={Clock}
              to="/time-logs"
              accent="neutral"
            />
          </div>
        </>
      )}

      {/* Grafikler */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Görev durumu dağılımı"
          description="Erişebildiğiniz tüm görevler üzerinden."
        >
          {statsQuery.isLoading ? <ChartSkeleton /> : <TaskStatusChart counts={statusCounts} />}
        </SectionCard>

        <SectionCard
          title="Son 14 günde tamamlananlar"
          description="Size atanmış görevlerin tamamlanma tarihlerine göre."
        >
          {myTasksQuery.isLoading ? (
            <ChartSkeleton />
          ) : (
            <WeeklyCompletionChart tasks={myTasksQuery.data?.items ?? []} />
          )}
        </SectionCard>
      </div>

      {/* Listeler */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Aktif proje ilerlemesi"
          icon={FolderKanban}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/projects">Tümü</Link>
            </Button>
          }
        >
          {projectsQuery.isLoading ? (
            <ListSkeleton rows={4} />
          ) : activeProjects.length === 0 ? (
            <EmptyState
              title="Aktif proje yok"
              description="Durumu 'Aktif' olan bir proje bulunmuyor."
              bare
              className="py-8"
            />
          ) : (
            <ul className="space-y-4">
              {activeProjects.map((project: Project) => {
                const stats = statsByProject.get(project.id);

                return (
                  <li key={project.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <Link
                        to={`/projects/${project.id}`}
                        className="min-w-0 truncate text-sm font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {project.name}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {stats ? formatPercent(stats.progress) : '…'}
                      </span>
                    </div>
                    <Progress
                      value={stats?.progress ?? 0}
                      className="mt-1.5"
                      aria-label={`${project.name} ilerlemesi`}
                    />
                    {stats ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {stats.completedTasks}/{stats.totalTasks} görev tamamlandı
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Yaklaşan teslimler"
          icon={CalendarClock}
          description="Önümüzdeki 14 gün"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/calendar">Takvim</Link>
            </Button>
          }
        >
          {upcomingQuery.isLoading ? (
            <ListSkeleton rows={4} />
          ) : upcomingTasks.length === 0 ? (
            <EmptyState
              title="Yaklaşan teslim yok"
              description="Önümüzdeki iki hafta içinde teslim edilecek görev bulunmuyor."
              bare
              className="py-8"
            />
          ) : (
            <ul className="divide-y divide-border">
              {upcomingTasks.map((task: Task) => (
                <li key={task.id} className="py-2.5 first:pt-0">
                  <button
                    type="button"
                    onClick={() => setOpenTaskId(task.id)}
                    className="block w-full truncate text-left text-sm font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {task.title}
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(task.dueDate)} · {formatDueLabel(task.dueDate)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Size atanan görevler"
          icon={ListTodo}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/my-tasks">Tümü</Link>
            </Button>
          }
        >
          {myTasksQuery.isLoading ? (
            <ListSkeleton rows={4} />
          ) : myOpenTasks.length === 0 ? (
            <EmptyState
              title="Açık göreviniz yok"
              description="Size atanmış tamamlanmamış görev bulunmuyor."
              bare
              className="py-8"
            />
          ) : (
            <ul className="divide-y divide-border">
              {myOpenTasks.map((task: Task) => {
                const overdue =
                  task.dueDate && (daysUntil(task.dueDate) ?? 0) < 0 && task.status !== TaskStatus.Done;

                return (
                  <li key={task.id} className="py-2.5 first:pt-0">
                    <button
                      type="button"
                      onClick={() => setOpenTaskId(task.id)}
                      className="block w-full truncate text-left text-sm font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {task.title}
                    </button>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <PriorityBadge priority={task.priority} />
                      {overdue ? (
                        <OverdueBadge label={formatDueLabel(task.dueDate) ?? 'Gecikti'} />
                      ) : task.dueDate ? (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(task.dueDate)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Tarihsiz</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <TaskDetailDrawer
        taskId={openTaskId}
        onOpenChange={(open) => (open ? undefined : setOpenTaskId(null))}
      />
    </div>
  );
}
