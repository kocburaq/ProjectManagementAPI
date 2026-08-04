import { Info } from 'lucide-react';
import { useMemo } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { SectionCard } from '@/components/common/SectionCard';
import { ChartSkeleton } from '@/components/common/Skeletons';
import { PageHeader } from '@/components/layout/PageHeader';
import { SimpleBarChart, type BarDatum } from '@/components/reports/SimpleBarChart';
import { TaskStatusChart } from '@/components/reports/TaskStatusChart';
import { WeeklyCompletionChart } from '@/components/reports/WeeklyCompletionChart';
import { useChartTheme } from '@/components/reports/chartTheme';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { useAllProjects } from '@/hooks/queries/useProjects';
import { useAllTasks } from '@/hooks/queries/useTasks';
import { useTimeLogAggregate } from '@/hooks/queries/useTimeLogs';
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_ORDER,
  TaskStatus,
  type TaskPriority,
} from '@/types/enums';
import { isPastDue } from '@/utils/date';
import { formatHours, formatNumber, toPercent, truncate } from '@/utils/format';

/**
 * Raporlar.
 *
 * TÜM grafikler gerçek API verisinden üretilir. Backend'de toplu istatistik ucu
 * bulunmadığı için (FRONTEND_API_GAPS.md #5, #8) hesaplamalar, listeleme uçlarından
 * sayfalı olarak indirilen kayıtlar üzerinde yapılır. İndirme miktarı sınırlıdır;
 * sınıra ulaşıldığında sayfanın üstünde "kısmi veri" uyarısı gösterilir.
 */
export function ReportsPage() {
  const theme = useChartTheme();

  const tasksQuery = useAllTasks({});
  const projectsQuery = useAllProjects();
  const timeLogsQuery = useTimeLogAggregate({ pageSize: 100 });

  const tasks = useMemo(() => tasksQuery.data?.items ?? [], [tasksQuery.data]);
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const timeLogs = useMemo(() => timeLogsQuery.data?.items ?? [], [timeLogsQuery.data]);

  /* --------------------------- Durum dağılımı ---------------------------- */
  const statusCounts = useMemo(() => {
    const counts = {
      [TaskStatus.Todo]: 0,
      [TaskStatus.InProgress]: 0,
      [TaskStatus.InReview]: 0,
      [TaskStatus.Done]: 0,
    } as Record<TaskStatus, number>;

    for (const task of tasks) counts[task.status] += 1;
    return counts;
  }, [tasks]);

  /* --------------------------- Öncelik dağılımı -------------------------- */
  const priorityData = useMemo<BarDatum[]>(() => {
    const counts = new Map<TaskPriority, number>();
    for (const task of tasks) counts.set(task.priority, (counts.get(task.priority) ?? 0) + 1);

    return TASK_PRIORITY_ORDER.map((priority) => ({
      name: TASK_PRIORITY_LABELS[priority],
      value: counts.get(priority) ?? 0,
      color: theme.priority[priority],
    })).filter((entry) => entry.value > 0);
  }, [tasks, theme]);

  /* -------------------------- Proje ilerlemesi --------------------------- */
  const projectProgressData = useMemo<BarDatum[]>(() => {
    const totals = new Map<number, { total: number; done: number }>();

    for (const task of tasks) {
      const entry = totals.get(task.projectId) ?? { total: 0, done: 0 };
      entry.total += 1;
      if (task.status === TaskStatus.Done) entry.done += 1;
      totals.set(task.projectId, entry);
    }

    return projects
      .map((project) => {
        const entry = totals.get(project.id);
        return {
          name: truncate(project.name, 22),
          value: entry ? toPercent(entry.done, entry.total) : 0,
          color: theme.primary,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [tasks, projects, theme]);

  /* ---------------------- Proje bazında harcanan süre -------------------- */
  const projectHoursData = useMemo<BarDatum[]>(() => {
    const taskProject = new Map<number, number>();
    for (const task of tasks) taskProject.set(task.id, task.projectId);

    const totals = new Map<number, number>();
    for (const log of timeLogs) {
      const projectId = taskProject.get(log.taskId);
      if (projectId === undefined) continue;
      totals.set(projectId, (totals.get(projectId) ?? 0) + Number(log.hours));
    }

    return [...totals.entries()]
      .map(([projectId, hours]) => ({
        name: truncate(projects.find((project) => project.id === projectId)?.name ?? `#${projectId}`, 22),
        value: Number(hours.toFixed(2)),
        color: theme.series[1],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [timeLogs, tasks, projects, theme]);

  /* --------------------- Kullanıcı bazında harcanan süre ----------------- */
  const userHoursData = useMemo<BarDatum[]>(() => {
    const totals = new Map<string, number>();
    for (const log of timeLogs) {
      totals.set(log.userName, (totals.get(log.userName) ?? 0) + Number(log.hours));
    }

    return [...totals.entries()]
      .map(([name, hours]) => ({
        name: truncate(name, 22),
        value: Number(hours.toFixed(2)),
        color: theme.series[2],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [timeLogs, theme]);

  /* ------------------------------- Özetler -------------------------------- */
  const overdueCount = useMemo(
    () => tasks.filter((task) => task.status !== TaskStatus.Done && isPastDue(task.dueDate)).length,
    [tasks],
  );

  const totalHours = useMemo(
    () => timeLogs.reduce((sum, log) => sum + Number(log.hours), 0),
    [timeLogs],
  );

  const isLoading = tasksQuery.isLoading || projectsQuery.isLoading || timeLogsQuery.isLoading;
  const isTruncated = Boolean(tasksQuery.data?.truncated || timeLogsQuery.data?.truncated);

  if (tasksQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Raporlar" breadcrumbs={[{ label: 'Panel', to: '/dashboard' }, { label: 'Raporlar' }]} />
        <ErrorState error={tasksQuery.error} onRetry={() => void tasksQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raporlar"
        description="Görev, proje ve zaman verilerinin özeti."
        breadcrumbs={[{ label: 'Panel', to: '/dashboard' }, { label: 'Raporlar' }]}
      />

      {isTruncated ? (
        <Alert variant="warning" title="Kısmi veri">
          API toplu istatistik ucu sunmadığı için raporlar indirilen kayıtlardan hesaplanır ve
          indirme miktarı sınırlıdır. Görüntülenen değerler tüm veri kümesini yansıtmayabilir.
        </Alert>
      ) : null}

      {/* Özet kutuları */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Toplam görev</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{formatNumber(tasks.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Tamamlanan</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-success">
              {formatNumber(statusCounts[TaskStatus.Done])}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Geciken görev</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-danger">
              {formatNumber(overdueCount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Kaydedilen süre</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{formatHours(totalHours)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Grafikler */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Görev durumu dağılımı">
          {isLoading ? <ChartSkeleton /> : <TaskStatusChart counts={statusCounts} />}
        </SectionCard>

        <SectionCard title="Öncelik dağılımı">
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <SimpleBarChart data={priorityData} unit="görev" emptyTitle="Görev bulunmuyor" />
          )}
        </SectionCard>

        <SectionCard title="Proje ilerleme oranları" description="Tamamlanan görev yüzdesi">
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <SimpleBarChart
              data={projectProgressData}
              layout="vertical"
              unit="%"
              emptyTitle="Proje bulunmuyor"
            />
          )}
        </SectionCard>

        <SectionCard title="Son 14 günde tamamlanan görevler">
          {isLoading ? <ChartSkeleton /> : <WeeklyCompletionChart tasks={tasks} />}
        </SectionCard>

        <SectionCard title="Proje bazında harcanan süre">
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <SimpleBarChart
              data={projectHoursData}
              layout="vertical"
              unit="saat"
              emptyTitle="Zaman kaydı yok"
              emptyDescription="Görevlere zaman kaydı eklendiğinde burada görünecek."
            />
          )}
        </SectionCard>

        <SectionCard title="Kullanıcı bazında harcanan süre">
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <SimpleBarChart
              data={userHoursData}
              layout="vertical"
              unit="saat"
              emptyTitle="Zaman kaydı yok"
            />
          )}
        </SectionCard>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
        Raporlar yalnızca sizin erişebildiğiniz proje ve görevleri kapsar; yetki filtresi backend
        tarafından uygulanır.
      </p>
    </div>
  );
}
