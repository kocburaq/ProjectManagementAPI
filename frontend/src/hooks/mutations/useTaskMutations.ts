import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/api/queryKeys';
import { taskService } from '@/services/taskService';
import type { PagedResult } from '@/types/api';
import { TASK_STATUS_LABELS, TaskStatus } from '@/types/enums';
import type { CreateTaskRequest, Task, UpdateTaskRequest } from '@/types/models';
import { getErrorMessage } from '@/utils/errors';

/** Görev sorgularının tamamını (liste, detay, sayaç) ve bağlı istatistikleri tazeler. */
function invalidateTaskQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
  // Proje ilerleme yüzdeleri görev sayılarından hesaplanıyor.
  void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTaskRequest) => taskService.create(payload),
    onSuccess: (task) => {
      toast.success(`"${task.title}" görevi oluşturuldu.`);
      invalidateTaskQueries(queryClient);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: UpdateTaskRequest }) =>
      taskService.update(taskId, payload),
    onSuccess: (task) => {
      toast.success('Görev güncellendi.');
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
      invalidateTaskQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.histories(task.id) });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: number) => taskService.remove(taskId),
    onSuccess: () => {
      toast.success('Görev silindi.');
      invalidateTaskQueries(queryClient);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

interface ChangeStatusVariables {
  taskId: number;
  status: TaskStatus;
}

interface ChangeStatusContext {
  /** Hata durumunda geri yüklenecek önceki cache içerikleri. */
  previousLists: [readonly unknown[], PagedResult<Task> | undefined][];
  previousAllLists: [readonly unknown[], { items: Task[]; totalCount: number; truncated: boolean } | undefined][];
  previousDetail: Task | undefined;
}

/**
 * Görev durumu değişimi — Kanban sürükle-bırakının kullandığı mutasyon.
 *
 * Gerçek uç: `PATCH /api/tasks/{id}/status`.
 *
 * Optimistic update: kart bırakıldığı anda yeni kolonda görünür. İstek başarısız
 * olursa (ör. yetki yok, ya da backend "zaten bu durumda" derse) cache eski haline
 * döndürülür ve hata toast'ı gösterilir.
 */
export function useChangeTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation<Task, unknown, ChangeStatusVariables, ChangeStatusContext>({
    mutationFn: ({ taskId, status }) => taskService.changeStatus(taskId, { status }),

    onMutate: async ({ taskId, status }) => {
      // Uçuşan sorgular optimistic veriyi ezmesin.
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });

      const previousLists = queryClient.getQueriesData<PagedResult<Task>>({
        queryKey: queryKeys.tasks.lists(),
      });
      const previousAllLists = queryClient.getQueriesData<{
        items: Task[];
        totalCount: number;
        truncated: boolean;
      }>({ queryKey: [...queryKeys.tasks.lists(), 'all'] });
      const previousDetail = queryClient.getQueryData<Task>(queryKeys.tasks.detail(taskId));

      const patchTask = (task: Task): Task =>
        task.id === taskId
          ? {
              ...task,
              status,
              // Backend Done'a geçince CompletedAt yazar, geri alınca temizler.
              completedAt: status === TaskStatus.Done ? new Date().toISOString() : null,
            }
          : task;

      queryClient.setQueriesData<PagedResult<Task>>({ queryKey: queryKeys.tasks.lists() }, (old) =>
        old ? { ...old, items: old.items.map(patchTask) } : old,
      );

      queryClient.setQueriesData<{ items: Task[]; totalCount: number; truncated: boolean }>(
        { queryKey: [...queryKeys.tasks.lists(), 'all'] },
        (old) => (old ? { ...old, items: old.items.map(patchTask) } : old),
      );

      if (previousDetail) {
        queryClient.setQueryData<Task>(queryKeys.tasks.detail(taskId), patchTask(previousDetail));
      }

      return { previousLists, previousAllLists, previousDetail };
    },

    onError: (error, variables, context) => {
      // Geri al.
      context?.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      context?.previousAllLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      if (context?.previousDetail) {
        queryClient.setQueryData(queryKeys.tasks.detail(variables.taskId), context.previousDetail);
      }

      toast.error(getErrorMessage(error));
    },

    onSuccess: (task) => {
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
      toast.success(`Durum "${TASK_STATUS_LABELS[task.status]}" olarak güncellendi.`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.histories(task.id) });
    },

    onSettled: () => {
      // Sunucu gerçeği ile eşitle (ActualHours, UpdatedAt vb. alanlar da tazelenir).
      invalidateTaskQueries(queryClient);
    },
  });
}
