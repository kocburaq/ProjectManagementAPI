import { CheckSquare, Info, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Paginator } from '@/components/common/Paginator';
import { TableSkeleton } from '@/components/common/Skeletons';
import { PageHeader } from '@/components/layout/PageHeader';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import {
  EMPTY_TASK_FILTERS,
  FILTER_ALL,
  TaskFilters,
  type TaskFiltersValue,
} from '@/components/tasks/TaskFilters';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { TaskTable } from '@/components/tasks/TaskTable';
import { Button } from '@/components/ui/button';
import { useDeleteTask } from '@/hooks/mutations/useTaskMutations';
import { useAllProjects } from '@/hooks/queries/useProjects';
import { useTasks } from '@/hooks/queries/useTasks';
import { useUserDirectory } from '@/hooks/queries/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { TaskPriority, TaskStatus } from '@/types/enums';
import type { Project, Task, TaskQuery } from '@/types/models';
import { dateInputToApi, isPastDue } from '@/utils/date';
import { canCreateProject, canManageProject } from '@/utils/permissions';

export function TasksPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<TaskFiltersValue>(EMPTY_TASK_FILTERS);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const debouncedSearch = useDebouncedValue(filters.search, 250);
  const deleteTask = useDeleteTask();

  // Panel kartlarından gelen derin bağlantılar: /tasks?status=4, /tasks?overdue=1
  useEffect(() => {
    const status = searchParams.get('status');
    const overdue = searchParams.get('overdue');
    const projectId = searchParams.get('projectId');

    if (status || overdue || projectId) {
      setFilters((current) => ({
        ...current,
        status: status ?? current.status,
        projectId: projectId ?? current.projectId,
        onlyOverdue: overdue === '1' ? true : current.onlyOverdue,
      }));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const projectsQuery = useAllProjects();
  const usersQuery = useUserDirectory(user);

  const query: TaskQuery = useMemo(
    () => ({
      page,
      pageSize,
      projectId: filters.projectId === FILTER_ALL ? undefined : Number(filters.projectId),
      status: filters.status === FILTER_ALL ? undefined : (Number(filters.status) as TaskStatus),
      priority:
        filters.priority === FILTER_ALL ? undefined : (Number(filters.priority) as TaskPriority),
      assignedToUserId: filters.assigneeId === FILTER_ALL ? undefined : Number(filters.assigneeId),
      dueBefore: dateInputToApi(filters.dueBefore) ?? undefined,
      sortBy: 'dueDate',
      sortDirection: 'asc',
    }),
    [page, pageSize, filters],
  );

  const tasksQuery = useTasks(query);
  const tasks = tasksQuery.data?.items ?? [];

  const projectsById = useMemo(() => {
    const map = new Map<number, Project>();
    for (const project of projectsQuery.data ?? []) map.set(project.id, project);
    return map;
  }, [projectsQuery.data]);

  /*
   * İstemci tarafı ince filtreler:
   * - Metin araması: backend'de arama ucu yok (FRONTEND_API_GAPS.md #4).
   * - "Yalnızca gecikenler": backend "dueBefore + status != Done" bileşimini tek
   *   sorguda sunmuyor; sayfadaki kayıtlar üzerinde süzüyoruz.
   */
  const visibleTasks = useMemo(() => {
    const term = debouncedSearch.trim().toLocaleLowerCase('tr-TR');

    return tasks.filter((task) => {
      if (term !== '' && !task.title.toLocaleLowerCase('tr-TR').includes(term)) return false;
      if (filters.onlyOverdue && !(isPastDue(task.dueDate) && task.status !== TaskStatus.Done)) {
        return false;
      }
      return true;
    });
  }, [tasks, debouncedSearch, filters.onlyOverdue]);

  const clientFilterActive = debouncedSearch.trim() !== '' || filters.onlyOverdue;

  function canManageTask(task: Task): boolean {
    return canManageProject(user, projectsById.get(task.projectId));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Görevler"
        description="Erişebildiğiniz tüm projelerdeki görevler."
        breadcrumbs={[{ label: 'Panel', to: '/dashboard' }, { label: 'Görevler' }]}
        actions={
          canCreateProject(user) ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus aria-hidden="true" />
              Yeni görev
            </Button>
          ) : null
        }
      />

      <TaskFilters
        value={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
        projects={projectsQuery.data ?? []}
        users={usersQuery.data ?? []}
      />

      {clientFilterActive ? (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          Arama ve "yalnızca gecikenler" filtreleri API'de karşılığı olmadığı için görüntülenen
          sayfadaki {tasks.length} kayıt üzerinde uygulanır. Diğer filtreler sunucu tarafında
          çalışır.
        </p>
      ) : null}

      {tasksQuery.isLoading ? (
        <TableSkeleton columns={8} rows={8} />
      ) : tasksQuery.isError ? (
        <ErrorState error={tasksQuery.error} onRetry={() => void tasksQuery.refetch()} />
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Görev bulunamadı"
          description="Filtreleri değiştirin ya da yeni bir görev oluşturun."
          action={
            <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_TASK_FILTERS)}>
              Filtreleri sıfırla
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <TaskTable
            tasks={visibleTasks}
            projectsById={projectsById}
            onOpen={setOpenTaskId}
            onEdit={(task) => {
              setEditing(task);
              setFormOpen(true);
            }}
            onDelete={setDeleteTarget}
            canManage={canManageTask}
          />
          {tasksQuery.data ? (
            <Paginator
              page={tasksQuery.data.page}
              pageSize={tasksQuery.data.pageSize}
              totalCount={tasksQuery.data.totalCount}
              totalPages={tasksQuery.data.totalPages}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          ) : null}
        </div>
      )}

      <TaskDetailDrawer
        taskId={openTaskId}
        onOpenChange={(open) => (open ? undefined : setOpenTaskId(null))}
      />

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} task={editing} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => (open ? undefined : setDeleteTarget(null))}
        title="Görev silinsin mi?"
        description={
          <>
            <strong>{deleteTarget?.title}</strong> silinecek. Bu işlem arayüzden geri alınamaz.
          </>
        }
        confirmLabel="Sil"
        destructive
        loading={deleteTask.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteTask.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
