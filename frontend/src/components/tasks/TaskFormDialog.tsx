import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

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
import { useCreateTask, useUpdateTask } from '@/hooks/mutations/useTaskMutations';
import { useAllProjects } from '@/hooks/queries/useProjects';
import { buildTaskFormSchema, TASK_FORM_FIELDS, type TaskFormValues } from '@/schemas/task';
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_ORDER, TaskPriority } from '@/types/enums';
import type { CreateTaskRequest, Task, UpdateTaskRequest } from '@/types/models';
import { apiDateToInput, dateInputToApi } from '@/utils/date';
import { applyApiFieldErrors } from '@/utils/formErrors';

import { useAssigneeOptions } from './useAssigneeOptions';

const UNASSIGNED = 'none';

export interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Verilirse düzenleme, verilmezse oluşturma modu. */
  task?: Task | null;
  /** Oluşturma modunda ön seçili proje. */
  defaultProjectId?: number;
  /** Proje detayından açıldığında proje seçimi kilitlenir. */
  lockProject?: boolean;
}

/**
 * Görev oluşturma ve düzenleme formu (tek bileşen, iki mod).
 *
 * Backend farkları:
 * - Oluşturmada `projectId` gönderilir; güncellemede DEĞİŞTİRİLEMEZ (UpdateTaskDto'da yok).
 * - `status` hiçbir modda bu formdan gönderilmez; durum yalnızca
 *   `PATCH /api/tasks/{id}/status` ile değişir.
 */
export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultProjectId,
  lockProject = false,
}: TaskFormDialogProps) {
  const isEdit = Boolean(task);
  const [formError, setFormError] = useState<string | null>(null);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  // Oluşturma modunda proje seçilebilmeli; düzenlemede proje sabit.
  const projectsQuery = useAllProjects(open && !isEdit && !lockProject);

  const initialProjectId = task?.projectId ?? defaultProjectId;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(buildTaskFormSchema()),
    defaultValues: {
      title: '',
      description: '',
      projectId: initialProjectId ? String(initialProjectId) : '',
      assignedToUserId: UNASSIGNED,
      priority: String(TaskPriority.Medium),
      dueDate: '',
      estimatedHours: '',
    },
  });

  const selectedProjectId = Number(form.watch('projectId')) || undefined;
  const {
    options: assigneeOptions,
    project: selectedProject,
    isLoading: assigneesLoading,
  } = useAssigneeOptions(selectedProjectId);

  // Seçili projenin başlangıç tarihi, "teslim tarihi daha önce olamaz" kuralı için gerekli.
  // `useAssigneeOptions` projeyi zaten çektiği için ek istek atılmıyor.
  const projectStartInput = useMemo(
    () => (selectedProject ? apiDateToInput(selectedProject.startDate) : undefined),
    [selectedProject],
  );

  // Şema proje başlangıcına bağlı olduğu için resolver'ı güncel tut.
  useEffect(() => {
    form.clearErrors('dueDate');
  }, [projectStartInput, form]);

  // Diyalog her açıldığında formu ilgili göreve göre sıfırla.
  useEffect(() => {
    if (!open) return;

    form.reset({
      title: task?.title ?? '',
      description: task?.description ?? '',
      projectId: task?.projectId ? String(task.projectId) : defaultProjectId ? String(defaultProjectId) : '',
      assignedToUserId: task?.assignedToUserId ? String(task.assignedToUserId) : UNASSIGNED,
      priority: String(task?.priority ?? TaskPriority.Medium),
      dueDate: apiDateToInput(task?.dueDate),
      estimatedHours: task?.estimatedHours != null ? String(task.estimatedHours) : '',
    });
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id, defaultProjectId]);

  async function onSubmit(values: TaskFormValues) {
    setFormError(null);

    // Backend kuralı: DueDate, projenin StartDate'inden önce olamaz. Şema proje
    // bağlamını bilmediği için bu kontrol gönderim anında yapılır; böylece kullanıcı
    // 400 beklemeden anında geri bildirim alır.
    if (projectStartInput && values.dueDate !== '' && values.dueDate < projectStartInput) {
      form.setError('dueDate', {
        type: 'validate',
        message: `Teslim tarihi, projenin başlangıcından (${projectStartInput}) önce olamaz.`,
      });
      return;
    }

    const assignedToUserId =
      values.assignedToUserId === UNASSIGNED || values.assignedToUserId === ''
        ? null
        : Number(values.assignedToUserId);

    const estimatedHours =
      values.estimatedHours.trim() === '' ? null : Number(values.estimatedHours);

    try {
      if (task) {
        const payload: UpdateTaskRequest = {
          title: values.title,
          description: values.description.trim() === '' ? null : values.description,
          assignedToUserId,
          priority: Number(values.priority) as TaskPriority,
          dueDate: dateInputToApi(values.dueDate),
          estimatedHours,
        };
        await updateTask.mutateAsync({ taskId: task.id, payload });
      } else {
        const payload: CreateTaskRequest = {
          title: values.title,
          description: values.description.trim() === '' ? null : values.description,
          projectId: Number(values.projectId),
          assignedToUserId,
          priority: Number(values.priority) as TaskPriority,
          dueDate: dateInputToApi(values.dueDate),
          estimatedHours,
        };
        await createTask.mutateAsync(payload);
      }

      onOpenChange(false);
    } catch (error) {
      const message = applyApiFieldErrors(error, form.setError, [...TASK_FORM_FIELDS]);
      if (message) setFormError(message);
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Görevi düzenle' : 'Yeni görev'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Görev bilgilerini güncelleyin. Durum değişikliği için görev detayındaki durum seçicisini kullanın.'
              : 'Görev oluşturulduğunda durumu otomatik olarak "Yapılacak" olur.'}
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
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Başlık</FormLabel>
                  <FormControl>
                    <Input placeholder="Örn. Ödeme ekranını tasarla" maxLength={200} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Görevin kapsamı, kabul kriterleri…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {isEdit || lockProject ? null : (
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
                          // Proje değişince eski atama geçersiz olabilir.
                          form.setValue('assignedToUserId', UNASSIGNED);
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
              )}

              <FormField
                control={form.control}
                name="assignedToUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Atanan kişi</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!selectedProjectId || assigneesLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Atanmadı" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED}>Atanmadı</SelectItem>
                        {assigneeOptions.map((option) => (
                          <SelectItem key={option.userId} value={String(option.userId)}>
                            {option.name}
                            {option.hint ? ` · ${option.hint}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Yalnızca projenin aktif üyeleri ve proje sahibi atanabilir.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Öncelik</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_PRIORITY_ORDER.map((priority) => (
                          <SelectItem key={priority} value={String(priority)}>
                            {TASK_PRIORITY_LABELS[priority]}
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
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teslim tarihi</FormLabel>
                    <FormControl>
                      <Input type="date" min={projectStartInput} {...field} />
                    </FormControl>
                    {projectStartInput ? (
                      <FormDescription>
                        Projenin başlangıcından ({projectStartInput}) önce olamaz.
                      </FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tahmini süre (saat)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.5" placeholder="Örn. 8" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {isEdit ? 'Değişiklikleri kaydet' : 'Görevi oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
