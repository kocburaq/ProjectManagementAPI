import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { CommentSection } from '@/components/comments/CommentSection';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { ListSkeleton } from '@/components/common/Skeletons';
import { OverdueBadge, PriorityBadge, TaskStatusBadge } from '@/components/common/StatusBadge';
import { TaskTimeLogSection } from '@/components/time-logs/TaskTimeLogSection';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChangeTaskStatus, useDeleteTask } from '@/hooks/mutations/useTaskMutations';
import { useProject, useProjectMembers } from '@/hooks/queries/useProjects';
import { useTask } from '@/hooks/queries/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER, TaskStatus } from '@/types/enums';
import { formatDate, formatDateTime, formatDueLabel, isPastDue } from '@/utils/date';
import { formatHours } from '@/utils/format';
import { canChangeTaskStatus, canContribute, canManageTasks } from '@/utils/permissions';

import { TaskFormDialog } from './TaskFormDialog';
import { TaskHistoryList } from './TaskHistoryList';

export interface TaskDetailDrawerProps {
  taskId: number | null;
  onOpenChange: (open: boolean) => void;
}

/** Etiket + değer satırı. */
function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-start gap-3 py-2">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Görev detay çekmecesi.
 *
 * Mobilde tam ekran, geniş ekranda sağdan açılan panel. Sekmeler:
 * Detay · Yorumlar · Zaman · Geçmiş — hepsi gerçek uçlardan beslenir.
 *
 * NOT: Backend'de görev için "başlangıç tarihi" alanı YOK (`ProjectTask` yalnızca
 * `DueDate` tutuyor), bu yüzden böyle bir alan gösterilmiyor
 * (bkz. FRONTEND_API_GAPS.md #11).
 */
export function TaskDetailDrawer({ taskId, onOpenChange }: TaskDetailDrawerProps) {
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const taskQuery = useTask(taskId ?? undefined);
  const task = taskQuery.data;

  const projectQuery = useProject(task?.projectId);
  const membersQuery = useProjectMembers(task?.projectId);

  const membership = (membersQuery.data?.items ?? []).find(
    (member) => member.userId === user?.id && member.isActive,
  );

  const changeStatus = useChangeTaskStatus();
  const deleteTask = useDeleteTask();

  const canEdit = canManageTasks(user, projectQuery.data);
  const canStatus = canChangeTaskStatus(user, task, projectQuery.data, membership);
  const canWrite = canContribute(user, projectQuery.data, membership);

  const overdue = task ? isPastDue(task.dueDate) && task.status !== TaskStatus.Done : false;

  return (
    <>
      <Sheet open={taskId !== null} onOpenChange={onOpenChange}>
        <SheetContent side="right" aria-describedby={undefined}>
          {taskQuery.isLoading ? (
            <SheetBody>
              <SheetTitle className="sr-only">Görev yükleniyor</SheetTitle>
              <ListSkeleton rows={5} />
            </SheetBody>
          ) : taskQuery.isError || !task ? (
            <SheetBody>
              <SheetTitle className="sr-only">Görev yüklenemedi</SheetTitle>
              <ErrorState error={taskQuery.error} onRetry={() => void taskQuery.refetch()} bare />
            </SheetBody>
          ) : (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-1.5">
                  <TaskStatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                  {overdue ? <OverdueBadge label={formatDueLabel(task.dueDate) ?? 'Gecikti'} /> : null}
                </div>
                <SheetTitle className="mt-2 text-lg leading-snug">{task.title}</SheetTitle>
                <SheetDescription className="mt-1">
                  {projectQuery.data ? (
                    <Link
                      to={`/projects/${task.projectId}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {projectQuery.data.name}
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </Link>
                  ) : (
                    `Proje #${task.projectId}`
                  )}
                </SheetDescription>

                {canEdit ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                      <Pencil aria-hidden="true" />
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-danger-subtle"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 aria-hidden="true" />
                      Sil
                    </Button>
                  </div>
                ) : null}
              </SheetHeader>

              <SheetBody className="pt-0">
                <Tabs defaultValue="details" className="pt-4">
                  <TabsList>
                    <TabsTrigger value="details">Detay</TabsTrigger>
                    <TabsTrigger value="comments">Yorumlar</TabsTrigger>
                    <TabsTrigger value="time">Zaman</TabsTrigger>
                    <TabsTrigger value="history">Geçmiş</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details">
                    {/* Durum değiştirici — PATCH /api/tasks/{id}/status */}
                    <div className="mb-4 rounded-md border border-border bg-muted/40 p-3">
                      <label
                        className="mb-1.5 block text-xs font-medium text-muted-foreground"
                        htmlFor="task-status-select"
                      >
                        Durum
                      </label>
                      <Select
                        value={String(task.status)}
                        disabled={!canStatus || changeStatus.isPending}
                        onValueChange={(value) => {
                          const next = Number(value) as TaskStatus;
                          // Backend aynı duruma geçişi 400 ile reddediyor.
                          if (next === task.status) return;
                          changeStatus.mutate({ taskId: task.id, status: next });
                        }}
                      >
                        <SelectTrigger id="task-status-select" className="bg-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_STATUS_ORDER.map((status) => (
                            <SelectItem key={status} value={String(status)}>
                              {TASK_STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!canStatus ? (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Durumu yalnızca yönetici, proje sahibi veya görevin atandığı kişi
                          değiştirebilir.
                        </p>
                      ) : null}
                    </div>

                    {task.description ? (
                      <div className="mb-4">
                        <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">Açıklama</h3>
                        <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                          {task.description}
                        </p>
                      </div>
                    ) : null}

                    <Separator className="my-4" />

                    <dl className="divide-y divide-border">
                      <DetailRow label="Atanan">
                        {task.assignedToUserName ? (
                          <span className="flex items-center gap-2">
                            <Avatar
                              name={task.assignedToUserName}
                              seed={task.assignedToUserId ?? undefined}
                              size="xs"
                            />
                            {task.assignedToUserName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Atanmadı</span>
                        )}
                      </DetailRow>

                      <DetailRow label="Oluşturan">{task.createdByUserName}</DetailRow>

                      <DetailRow label="Teslim tarihi">
                        {task.dueDate ? (
                          <span className={overdue ? 'text-danger' : undefined}>
                            {formatDate(task.dueDate)}
                            {formatDueLabel(task.dueDate) ? (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                ({formatDueLabel(task.dueDate)})
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Belirlenmedi</span>
                        )}
                      </DetailRow>

                      <DetailRow label="Tahmini süre">
                        {task.estimatedHours != null ? (
                          formatHours(task.estimatedHours)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </DetailRow>

                      <DetailRow label="Harcanan süre">{formatHours(task.actualHours)}</DetailRow>

                      <DetailRow label="Oluşturulma">{formatDateTime(task.createdAt)}</DetailRow>

                      <DetailRow label="Güncellenme">
                        {task.updatedAt ? (
                          formatDateTime(task.updatedAt)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </DetailRow>

                      {task.completedAt ? (
                        <DetailRow label="Tamamlanma">{formatDateTime(task.completedAt)}</DetailRow>
                      ) : null}
                    </dl>
                  </TabsContent>

                  <TabsContent value="comments">
                    <CommentSection taskId={task.id} canComment={canWrite} />
                  </TabsContent>

                  <TabsContent value="time">
                    <TaskTimeLogSection taskId={task.id} canLogTime={canWrite} />
                  </TabsContent>

                  <TabsContent value="history">
                    <TaskHistoryList taskId={task.id} />
                  </TabsContent>
                </Tabs>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>

      {task ? (
        <>
          <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} task={task} lockProject />

          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Görev silinsin mi?"
            description={
              <>
                <strong>{task.title}</strong> silinecek. Bu işlem arayüzden geri alınamaz.
              </>
            }
            confirmLabel="Sil"
            destructive
            loading={deleteTask.isPending}
            onConfirm={() => {
              deleteTask.mutate(task.id, {
                onSuccess: () => {
                  setDeleteOpen(false);
                  onOpenChange(false);
                },
                onError: () => setDeleteOpen(false),
              });
            }}
          />
        </>
      ) : null}
    </>
  );
}
