import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
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
import { useCreateProject, useUpdateProject } from '@/hooks/mutations/useProjectMutations';
import { useUserDirectory } from '@/hooks/queries/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { PROJECT_FORM_FIELDS, projectFormSchema, type ProjectFormValues } from '@/schemas/project';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_ORDER, ProjectStatus, UserRole } from '@/types/enums';
import type { CreateProjectRequest, Project, UpdateProjectRequest } from '@/types/models';
import { apiDateToInput, dateInputToApi, todayInputValue } from '@/utils/date';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { isAdmin } from '@/utils/permissions';

export interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Verilirse düzenleme modu. */
  project?: Project | null;
}

/**
 * Proje oluşturma / düzenleme formu.
 *
 * Backend farkları:
 * - Oluşturmada durum GÖNDERİLMEZ; `ProjectService` her yeni projeyi `Planning`
 *   ile açar. Durum yalnızca güncellemede değiştirilebilir.
 * - `OwnerId` yalnızca Admin tarafından başkasına verilebilir; ayrıca sahip
 *   Admin ya da ProjectManager rolünde olmak zorundadır.
 */
export function ProjectFormDialog({ open, onOpenChange, project }: ProjectFormDialogProps) {
  const isEdit = Boolean(project);
  const { user } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string>('');

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  // Sahip seçimi yalnızca Admin için anlamlı; kullanıcı listesi de sadece o zaman çekilir.
  const canPickOwner = isAdmin(user) && !isEdit;
  const usersQuery = useUserDirectory(canPickOwner && open ? user : null);
  const ownerCandidates = (usersQuery.data ?? []).filter(
    (candidate) =>
      candidate.isActive &&
      (candidate.role === UserRole.Admin || candidate.role === UserRole.ProjectManager),
  );

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      startDate: todayInputValue(),
      endDate: '',
      status: String(ProjectStatus.Planning),
    },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      name: project?.name ?? '',
      description: project?.description ?? '',
      startDate: project ? apiDateToInput(project.startDate) : todayInputValue(),
      endDate: apiDateToInput(project?.endDate),
      status: String(project?.status ?? ProjectStatus.Planning),
    });
    setOwnerId(user ? String(user.id) : '');
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id]);

  async function onSubmit(values: ProjectFormValues) {
    setFormError(null);

    try {
      if (project) {
        const payload: UpdateProjectRequest = {
          name: values.name,
          description: values.description.trim() === '' ? null : values.description,
          startDate: dateInputToApi(values.startDate) as string,
          endDate: dateInputToApi(values.endDate),
          status: Number(values.status) as ProjectStatus,
        };
        await updateProject.mutateAsync({ projectId: project.id, payload });
      } else {
        const payload: CreateProjectRequest = {
          name: values.name,
          description: values.description.trim() === '' ? null : values.description,
          startDate: dateInputToApi(values.startDate) as string,
          endDate: dateInputToApi(values.endDate),
          // Boş bırakılırsa backend oturum sahibini owner yapar.
          ownerId: canPickOwner && ownerId !== '' ? Number(ownerId) : null,
        };
        await createProject.mutateAsync(payload);
      }

      onOpenChange(false);
    } catch (error) {
      const message = applyApiFieldErrors(error, form.setError, [...PROJECT_FORM_FIELDS]);
      if (message) setFormError(message);
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Projeyi düzenle' : 'Yeni proje'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Proje bilgilerini ve durumunu güncelleyin.'
              : 'Yeni proje "Planlama" durumuyla oluşturulur.'}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Proje adı</FormLabel>
                  <FormControl>
                    <Input placeholder="Örn. Mobil uygulama v2" maxLength={200} {...field} />
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
                    <Textarea rows={3} placeholder="Projenin amacı ve kapsamı…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Başlangıç tarihi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bitiş tarihi</FormLabel>
                    <FormControl>
                      <Input type="date" min={form.watch('startDate')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isEdit ? (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Durum</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_STATUS_ORDER.map((status) => (
                          <SelectItem key={status} value={String(status)}>
                            {PROJECT_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {canPickOwner ? (
              <FormItem>
                <FormLabel>Proje sahibi</FormLabel>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kendim" />
                  </SelectTrigger>
                  <SelectContent>
                    {ownerCandidates.map((candidate) => (
                      <SelectItem key={candidate.id} value={String(candidate.id)}>
                        {candidate.firstName} {candidate.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Proje sahibi yalnızca Yönetici veya Proje Yöneticisi rolündeki bir kullanıcı olabilir.
                </FormDescription>
              </FormItem>
            ) : null}

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
                {isEdit ? 'Değişiklikleri kaydet' : 'Projeyi oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
