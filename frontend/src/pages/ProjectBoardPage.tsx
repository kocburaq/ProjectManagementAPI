import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useChangeTaskStatus } from '@/hooks/mutations/useTaskMutations';
import { useProject, useProjectMembers } from '@/hooks/queries/useProjects';
import { useAllTasks } from '@/hooks/queries/useTasks';
import { useAuth } from '@/hooks/useAuth';
import type { Project, Task } from '@/types/models';
import { canChangeTaskStatus, canManageTasks } from '@/utils/permissions';

/** Kanban kolonlarının yükleme iskeleti. */
function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" role="status" aria-live="polite">
      <span className="sr-only">Pano yükleniyor</span>
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="w-72 shrink-0 rounded-lg border border-border bg-muted/40 p-2">
          <Skeleton className="mb-3 h-6 w-full" />
          <Skeleton className="mb-2 h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Proje Kanban panosu.
 *
 * Görevler `GET /api/tasks?projectId=` ile çekilir; durum değişimi
 * `PATCH /api/tasks/{id}/status` ucuna bağlıdır.
 */
export function ProjectBoardPage() {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const projectId = Number(projectIdParam);
  const { user } = useAuth();

  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const projectQuery = useProject(Number.isFinite(projectId) ? projectId : undefined);
  const membersQuery = useProjectMembers(Number.isFinite(projectId) ? projectId : undefined);
  const tasksQuery = useAllTasks({ projectId }, Number.isFinite(projectId));
  const changeStatus = useChangeTaskStatus();

  const membership = (membersQuery.data?.items ?? []).find(
    (member) => member.userId === user?.id && member.isActive,
  );

  const projectsById = useMemo(() => {
    const map = new Map<number, Project>();
    if (projectQuery.data) map.set(projectQuery.data.id, projectQuery.data);
    return map;
  }, [projectQuery.data]);

  if (!Number.isFinite(projectId)) {
    return <Navigate to="/projects" replace />;
  }

  const canCreate = canManageTasks(user, projectQuery.data);

  function canDragTask(task: Task): boolean {
    return canChangeTaskStatus(user, task, projectQuery.data, membership);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={projectQuery.data ? `${projectQuery.data.name} · Pano` : 'Pano'}
        description="Görevleri sürükleyerek durumlarını güncelleyin."
        breadcrumbs={[
          { label: 'Panel', to: '/dashboard' },
          { label: 'Projeler', to: '/projects' },
          {
            label: projectQuery.data?.name ?? `#${projectId}`,
            to: `/projects/${projectId}`,
          },
          { label: 'Pano' },
        ]}
        actions={
          canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" />
              Yeni görev
            </Button>
          ) : null
        }
      />

      {tasksQuery.data?.truncated ? (
        <Alert variant="warning" title="Kısmi pano">
          Bu projede {tasksQuery.data.totalCount} görev var; panoda ilk{' '}
          {tasksQuery.data.items.length} tanesi gösteriliyor.
        </Alert>
      ) : null}

      {tasksQuery.isLoading ? (
        <BoardSkeleton />
      ) : tasksQuery.isError ? (
        <ErrorState error={tasksQuery.error} onRetry={() => void tasksQuery.refetch()} />
      ) : (
        <KanbanBoard
          tasks={tasksQuery.data?.items ?? []}
          projectsById={projectsById}
          onOpenTask={setOpenTaskId}
          canDragTask={canDragTask}
          onStatusChange={(taskId, status) => changeStatus.mutate({ taskId, status })}
        />
      )}

      <TaskDetailDrawer
        taskId={openTaskId}
        onOpenChange={(open) => (open ? undefined : setOpenTaskId(null))}
      />

      <TaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultProjectId={projectId}
        lockProject
      />
    </div>
  );
}
