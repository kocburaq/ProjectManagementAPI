import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTimeLog } from '@/hooks/mutations/useTimeLogMutations';
import { useAllProjects } from '@/hooks/queries/useProjects';
import { useAllTasks } from '@/hooks/queries/useTasks';
import { positiveNumberString, requiredDateString } from '@/schemas/common';
import { dateInputToApi, todayInputValue } from '@/utils/date';
import { applyApiFieldErrors } from '@/utils/formErrors';

/**
 * Zaman kaydı, backend'de göreve bağlıdır (`POST /api/tasks/{taskId}/time-logs`),
 * bu yüzden formda önce proje, sonra o projenin görevi seçilir.
 */
const manualTimeLogSchema = z.object({
  projectId: z.string().min(1, 'Proje seçilmelidir.'),
  taskId: z.string().min(1, 'Görev seçilmelidir.'),
  hours: positiveNumberString('Süre sıfırdan büyük olmalıdır.'),
  workDate: requiredDateString,
  description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir.'),
});

type ManualTimeLogValues = z.infer<typeof manualTimeLogSchema>;

const FIELDS = ['projectId', 'taskId', 'hours', 'workDate', 'description'] as const;

export interface TimeLogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimeLogFormDialog({ open, onOpenChange }: TimeLogFormDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ManualTimeLogValues>({
    resolver: zodResolver(manualTimeLogSchema),
    defaultValues: {
      projectId: '',
      taskId: '',
      hours: '',
      workDate: todayInputValue(),
      description: '',
    },
  });

  const projectsQuery = useAllProjects(open);
  const selectedProjectId = Number(form.watch('projectId')) || undefined;
  const tasksQuery = useAllTasks({ projectId: selectedProjectId }, open && Boolean(selectedProjectId));

  // Mutation göreve bağlı olduğu için seçili görev id'si ile oluşturulur.
  const selectedTaskId = Number(form.watch('taskId')) || 0;
  const createTimeLog = useCreateTimeLog(selectedTaskId);

  useEffect(() => {
    if (!open) return;
    form.reset({
      projectId: '',
      taskId: '',
      hours: '',
      workDate: todayInputValue(),
      description: '',
    });
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: ManualTimeLogValues) {
    setFormError(null);

    try {
      await createTimeLog.mutateAsync({
        hours: Number(values.hours),
        workDate: dateInputToApi(values.workDate) as string,
        description: values.description.trim() === '' ? null : values.description.trim(),
      });
      onOpenChange(false);
    } catch (error) {
      const message = applyApiFieldErrors(error, form.setError, [...FIELDS]);
      if (message) setFormError(message);
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zaman kaydı ekle</DialogTitle>
          <DialogDescription>
            Süre, ondalıklı saat olarak kaydedilir (örn. 1.5 = 1 saat 30 dakika).
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <Alert variant="danger" className="mb-4">
            {formError}
          </Alert>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Proje</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('taskId', '');
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Proje seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(projectsQuery.data ?? []).map((project) => (
                        <SelectItem key={project.id} value={String(project.id)}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taskId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Görev</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!selectedProjectId || tasksQuery.isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Görev seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(tasksQuery.data?.items ?? []).map((task) => (
                        <SelectItem key={task.id} value={String(task.id)}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Zaman kayıtları her zaman bir göreve bağlanır.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <Textarea rows={3} maxLength={500} placeholder="Ne üzerinde çalıştınız?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Vazgeç
              </Button>
              <Button type="submit" loading={submitting}>
                Kaydet
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
