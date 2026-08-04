import {
  Archive,
  CalendarRange,
  Clock,
  KanbanSquare,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SectionCard } from '@/components/common/SectionCard';
import { ListSkeleton, StatCardsSkeleton, TableSkeleton } from '@/components/common/Skeletons';
import { ProjectStatusBadge } from '@/components/common/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectActivity } from '@/components/projects/ProjectActivity';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { ProjectMembersPanel } from '@/components/projects/ProjectMembersPanel';
import { TaskStatusChart } from '@/components/reports/TaskStatusChart';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { TaskTable } from '@/components/tasks/TaskTable';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useArchiveProject, useDeleteProject } from '@/hooks/mutations/useProjectMutations';
import { useDeleteTask } from '@/hooks/mutations/useTaskMutations';
import { useProject, useProjectStats } from '@/hooks/queries/useProjects';
import { useAllTasks } from '@/hooks/queries/useTasks';
import { useTimeLogAggregate } from '@/hooks/queries/useTimeLogs';
import { useAuth } from '@/hooks/useAuth';
import { sumHours } from '@/services/timeLogService';
import { TaskStatus } from '@/types/enums';
import type { Project, Task } from '@/types/models';
import { formatDate, formatDateRange, formatDateTime } from '@/utils/date';
import { formatHours, formatPercent, truncate } from '@/utils/format';
import { canManageMembers, canManageProject, canManageTasks } from '@/utils/permissions';

/** Küçük özet kutusu. */
function StatBox({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function ProjectDetailPage() {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const projectId = Number(projectIdParam);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<Task | null>(null);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  const isValidId = Number.isFinite(projectId) && projectId > 0;

  const projectQuery = useProject(isValidId ? projectId : undefined);
  const statsQuery = useProjectStats(isValidId ? projectId : undefined);
  const tasksQuery = useAllTasks({ projectId }, isValidId);
  const timeLogsQuery = useTimeLogAggregate({ pageSize: 100 }, isValidId);

  const archiveProject = useArchiveProject();
  const deleteProject = useDeleteProject();
  const deleteTask = useDeleteTask();

  const project = projectQuery.data;
  const tasks = useMemo(() => tasksQuery.data?.items ?? [], [tasksQuery.data]);

  const projectsById = useMemo(() => {
    const map = new Map<number, Project>();
    if (project) map.set(project.id, project);
    return map;
  }, [project]);

  // Durum dağılımı — yüklü görevlerden.
  const statusCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<TaskStatus, number>;
    for (const task of tasks) counts[task.status] += 1;
    return counts;
  }, [tasks]);

  // Yaklaşan görevler: tamamlanmamış ve teslim tarihi olan, tarihe göre sıralı.
  const upcomingTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== TaskStatus.Done && task.dueDate)
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
        .slice(0, 6),
    [tasks],
  );

  // Bu projeye ait zaman kayıtları — /api/time-logs proje filtresi sunmadığı için
  // (yalnızca taskId/userId/tarih) görev id'lerine göre istemcide süzülür.
  const projectTimeLogs = useMemo(() => {
    const taskIds = new Set(tasks.map((task) => task.id));
    return (timeLogsQuery.data?.items ?? []).filter((log) => taskIds.has(log.taskId));
  }, [timeLogsQuery.data, tasks]);

  if (!isValidId) return <Navigate to="/projects" replace />;

  if (projectQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Proje"
          breadcrumbs={[
            { label: 'Panel', to: '/dashboard' },
            { label: 'Projeler', to: '/projects' },
            { label: `#${projectId}` },
          ]}
        />
        <ErrorState error={projectQuery.error} onRetry={() => void projectQuery.refetch()} />
      </div>
    );
  }

  const canManage = canManageProject(user, project);
  const canCreateTask = canManageTasks(user, project);

  return (
    <div className="space-y-6">
      <PageHeader
        title={project?.name ?? 'Yükleniyor…'}
        description={project?.description ? truncate(project.description, 180) : undefined}
        breadcrumbs={[
          { label: 'Panel', to: '/dashboard' },
          { label: 'Projeler', to: '/projects' },
          { label: project?.name ?? `#${projectId}` },
        ]}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/projects/${projectId}/board`}>
                <KanbanSquare aria-hidden="true" />
                Pano
              </Link>
            </Button>
            {canCreateTask ? (
              <Button
                onClick={() => {
                  setEditingTask(null);
                  setTaskFormOpen(true);
                }}
              >
                <Plus aria-hidden="true" />
                Yeni görev
              </Button>
            ) : null}
            {canManage ? (
              <>
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil aria-hidden="true" />
                  Düzenle
                </Button>
                {project && !project.isArchived ? (
                  <Button variant="ghost" onClick={() => setArchiveOpen(true)}>
                    <Archive aria-hidden="true" />
                    Arşivle
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  className="text-danger hover:bg-danger-subtle"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 aria-hidden="true" />
                  Sil
                </Button>
              </>
            ) : null}
          </>
        }
      />

      {project ? (
        <div className="flex flex-wrap items-center gap-2">
          <ProjectStatusBadge status={project.status} />
          {project.isArchived ? (
            <Badge variant="neutral">
              <Archive className="size-3" aria-hidden="true" />
              Arşivlendi · {formatDate(project.archivedAt)}
            </Badge>
          ) : null}
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarRange className="size-3.5" aria-hidden="true" />
            {formatDateRange(project.startDate, project.endDate)}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserRound className="size-3.5" aria-hidden="true" />
            {project.ownerName}
          </span>
        </div>
      ) : (
        <Skeleton className="h-6 w-72" />
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Genel bakış</TabsTrigger>
          <TabsTrigger value="tasks">Görevler</TabsTrigger>
          <TabsTrigger value="team">Ekip</TabsTrigger>
          <TabsTrigger value="time">Zaman</TabsTrigger>
          <TabsTrigger value="activity">Aktivite</TabsTrigger>
        </TabsList>

        {/* ------------------------------ Genel bakış ----------------------------- */}
        <TabsContent value="overview" className="space-y-5">
          {statsQuery.isLoading || projectQuery.isLoading ? (
            <StatCardsSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <StatBox
                label="Toplam görev"
                value={String(statsQuery.data?.totalTasks ?? 0)}
                hint={`${statsQuery.data?.completedTasks ?? 0} tamamlandı`}
              />
              <StatBox
                label="İlerleme"
                value={formatPercent(statsQuery.data?.progress ?? 0)}
                hint="Tamamlanan / toplam görev"
              />
              <StatBox
                label="Kaydedilen süre"
                value={formatHours(sumHours(projectTimeLogs))}
                hint={`${projectTimeLogs.length} kayıt`}
              />
              <StatBox
                label="Açık görev"
                value={String(
                  (statsQuery.data?.totalTasks ?? 0) - (statsQuery.data?.completedTasks ?? 0),
                )}
                hint="Tamamlanmamış görevler"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Proje ilerlemesi</span>
              <span className="font-medium text-foreground">
                {formatPercent(statsQuery.data?.progress ?? 0)}
              </span>
            </div>
            <Progress
              value={statsQuery.data?.progress ?? 0}
              className="h-2"
              aria-label="Proje ilerlemesi"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="Görev durumu dağılımı">
              {tasksQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <TaskStatusChart counts={statusCounts} />
              )}
            </SectionCard>

            <SectionCard title="Yaklaşan teslimler" icon={CalendarRange}>
              {tasksQuery.isLoading ? (
                <ListSkeleton rows={4} />
              ) : upcomingTasks.length === 0 ? (
                <EmptyState
                  title="Yaklaşan teslim yok"
                  description="Teslim tarihi olan açık görev bulunmuyor."
                  bare
                  className="py-8"
                />
              ) : (
                <ul className="divide-y divide-border">
                  {upcomingTasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                      <button
                        type="button"
                        onClick={() => setOpenTaskId(task.id)}
                        className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {task.title}
                      </button>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(task.dueDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          {project ? (
            <SectionCard title="Proje bilgileri">
              <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Proje sahibi</dt>
                  <dd className="mt-0.5 flex items-center gap-2 text-sm text-foreground">
                    <Avatar name={project.ownerName} seed={project.ownerId} size="xs" />
                    {project.ownerName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Oluşturulma</dt>
                  <dd className="mt-0.5 text-sm text-foreground">
                    {formatDateTime(project.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Başlangıç</dt>
                  <dd className="mt-0.5 text-sm text-foreground">{formatDate(project.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Bitiş</dt>
                  <dd className="mt-0.5 text-sm text-foreground">{formatDate(project.endDate)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Açıklama</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">
                    {project.description || '—'}
                  </dd>
                </div>
              </dl>
            </SectionCard>
          ) : null}
        </TabsContent>

        {/* -------------------------------- Görevler ------------------------------ */}
        <TabsContent value="tasks">
          {tasksQuery.isLoading ? (
            <TableSkeleton columns={7} />
          ) : tasksQuery.isError ? (
            <ErrorState error={tasksQuery.error} onRetry={() => void tasksQuery.refetch()} />
          ) : tasks.length === 0 ? (
            <EmptyState
              title="Bu projede görev yok"
              description={
                canCreateTask ? 'İlk görevi oluşturun.' : 'Görev eklendiğinde burada listelenecek.'
              }
              action={
                canCreateTask ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingTask(null);
                      setTaskFormOpen(true);
                    }}
                  >
                    <Plus aria-hidden="true" />
                    Yeni görev
                  </Button>
                ) : null
              }
            />
          ) : (
            <div className="rounded-lg border border-border bg-card">
              <TaskTable
                tasks={tasks}
                projectsById={projectsById}
                hideProjectColumn
                onOpen={setOpenTaskId}
                onEdit={(task) => {
                  setEditingTask(task);
                  setTaskFormOpen(true);
                }}
                onDelete={setDeleteTaskTarget}
                canManage={() => canCreateTask}
              />
            </div>
          )}
        </TabsContent>

        {/* ---------------------------------- Ekip -------------------------------- */}
        <TabsContent value="team">
          {project ? (
            <SectionCard title="Ekip üyeleri">
              <ProjectMembersPanel project={project} canManage={canManageMembers(user, project)} />
            </SectionCard>
          ) : (
            <ListSkeleton rows={4} />
          )}
        </TabsContent>

        {/* --------------------------------- Zaman -------------------------------- */}
        <TabsContent value="time">
          <SectionCard
            title="Zaman kayıtları"
            icon={Clock}
            description={`Toplam ${formatHours(sumHours(projectTimeLogs))} · ${projectTimeLogs.length} kayıt`}
          >
            {timeLogsQuery.isLoading || tasksQuery.isLoading ? (
              <ListSkeleton rows={4} />
            ) : projectTimeLogs.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Zaman kaydı yok"
                description="Bir görevin detayını açıp zaman kaydı ekleyebilirsiniz."
                bare
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-border">
                {projectTimeLogs.slice(0, 20).map((log) => {
                  const task = tasks.find((item) => item.id === log.taskId);

                  return (
                    <li key={log.id} className="flex items-start gap-3 py-3 first:pt-0">
                      <Avatar name={log.userName} seed={log.userId} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {task?.title ?? `Görev #${log.taskId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.userName} · {formatDate(log.workDate)}
                        </p>
                        {log.description ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{log.description}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-foreground">
                        {formatHours(log.hours)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        {/* -------------------------------- Aktivite ------------------------------ */}
        <TabsContent value="activity">
          <SectionCard title="Aktivite" icon={MessageSquare}>
            {tasksQuery.isLoading ? <ListSkeleton rows={5} /> : <ProjectActivity tasks={tasks} />}
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Diyaloglar */}
      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />

      <TaskFormDialog
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        task={editingTask}
        defaultProjectId={projectId}
        lockProject
      />

      <TaskDetailDrawer
        taskId={openTaskId}
        onOpenChange={(open) => (open ? undefined : setOpenTaskId(null))}
      />

      <ConfirmDialog
        open={deleteTaskTarget !== null}
        onOpenChange={(open) => (open ? undefined : setDeleteTaskTarget(null))}
        title="Görev silinsin mi?"
        description={
          <>
            <strong>{deleteTaskTarget?.title}</strong> silinecek. Bu işlem arayüzden geri alınamaz.
          </>
        }
        confirmLabel="Sil"
        destructive
        loading={deleteTask.isPending}
        onConfirm={() => {
          if (!deleteTaskTarget) return;
          deleteTask.mutate(deleteTaskTarget.id, { onSettled: () => setDeleteTaskTarget(null) });
        }}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Proje arşivlensin mi?"
        description="Arşivlenen proje listede kalır ancak arşiv rozetiyle işaretlenir."
        confirmLabel="Arşivle"
        loading={archiveProject.isPending}
        onConfirm={() =>
          archiveProject.mutate(projectId, { onSettled: () => setArchiveOpen(false) })
        }
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Proje silinsin mi?"
        description={
          <>
            <strong>{project?.name}</strong> ve altındaki tüm görevler silinecek. Bu işlem
            arayüzden geri alınamaz.
          </>
        }
        confirmLabel="Sil"
        destructive
        loading={deleteProject.isPending}
        onConfirm={() =>
          deleteProject.mutate(projectId, {
            onSuccess: () => navigate('/projects', { replace: true }),
            onError: () => setDeleteOpen(false),
          })
        }
      />
    </div>
  );
}
