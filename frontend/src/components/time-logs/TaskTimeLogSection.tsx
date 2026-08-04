import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ListSkeleton } from '@/components/common/Skeletons';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTimeLog } from '@/hooks/mutations/useTimeLogMutations';
import { useTaskTimeLogs } from '@/hooks/queries/useTimeLogs';
import { TIME_LOG_FORM_FIELDS, timeLogFormSchema, type TimeLogFormValues } from '@/schemas/timeLog';
import { dateInputToApi, formatDate, todayInputValue } from '@/utils/date';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { formatHours } from '@/utils/format';
import { sumHours } from '@/services/timeLogService';

export interface TaskTimeLogSectionProps {
  taskId: number;
  /** Viewer rolündeki üyeler zaman kaydı giremez. */
  canLogTime: boolean;
}

/**
 * Görev zaman kayıtları.
 *
 * Backend: `GET /api/time-logs?taskId=` + `POST /api/tasks/{taskId}/time-logs`.
 * Düzenleme/silme ucu OLMADIĞI için satırlarda işlem menüsü yoktur
 * (FRONTEND_API_GAPS.md #3) — çalışmayan buton gösterilmez.
 */
export function TaskTimeLogSection({ taskId, canLogTime }: TaskTimeLogSectionProps) {
  const logsQuery = useTaskTimeLogs(taskId);
  const createTimeLog = useCreateTimeLog(taskId);

  const form = useForm<TimeLogFormValues>({
    resolver: zodResolver(timeLogFormSchema),
    defaultValues: { hours: '', workDate: todayInputValue(), description: '' },
  });

  async function onSubmit(values: TimeLogFormValues) {
    try {
      await createTimeLog.mutateAsync({
        hours: Number(values.hours),
        workDate: dateInputToApi(values.workDate) as string,
        description: values.description.trim() === '' ? null : values.description.trim(),
      });
      form.reset({ hours: '', workDate: todayInputValue(), description: '' });
    } catch (error) {
      applyApiFieldErrors(error, form.setError, [...TIME_LOG_FORM_FIELDS]);
    }
  }

  const logs = logsQuery.data?.items ?? [];
  const total = sumHours(logs);

  return (
    <section className="space-y-4" aria-label="Zaman kayıtları">
      {canLogTime ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-3 rounded-md border border-border bg-muted/40 p-3"
            noValidate
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Süre (saat)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0.25" step="0.25" placeholder="Örn. 2.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="workDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Çalışma günü</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Textarea rows={2} maxLength={500} placeholder="Ne üzerinde çalıştınız?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={form.formState.isSubmitting}>
                Zaman kaydı ekle
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          Bu görevde zaman kaydı ekleme yetkiniz yok.
        </p>
      )}

      {logsQuery.isLoading ? (
        <ListSkeleton rows={3} />
      ) : logsQuery.isError ? (
        <ErrorState error={logsQuery.error} onRetry={() => void logsQuery.refetch()} bare />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Henüz zaman kaydı yok"
          description="Bu göreve harcanan süreyi kaydedin."
          bare
          className="py-8"
        />
      ) : (
        <>
          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Toplam kaydedilen süre</span>
            <span className="text-sm font-semibold text-foreground">{formatHours(total)}</span>
          </div>

          <ul className="divide-y divide-border">
            {logs.map((log) => (
              <li key={log.id} className="flex items-start gap-3 py-3">
                <Avatar name={log.userName} seed={log.userId} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium text-foreground">{log.userName}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(log.workDate)}</span>
                  </div>
                  {log.description ? (
                    <p className="mt-0.5 break-words text-sm text-muted-foreground">
                      {log.description}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-sm font-semibold text-foreground">
                  {formatHours(log.hours)}
                </span>
              </li>
            ))}
          </ul>

          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            API'de zaman kaydı güncelleme/silme ucu bulunmadığı için kayıtlar eklendikten sonra
            arayüzden değiştirilemez.
          </p>
        </>
      )}
    </section>
  );
}
