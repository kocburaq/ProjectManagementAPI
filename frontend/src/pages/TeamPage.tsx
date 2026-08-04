import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Pencil, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Paginator } from '@/components/common/Paginator';
import { TableSkeleton } from '@/components/common/Skeletons';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from '@/components/ui/table';
import { useUpdateUser } from '@/hooks/mutations/useUserMutations';
import { useAllProjects } from '@/hooks/queries/useProjects';
import { useAllTasks } from '@/hooks/queries/useTasks';
import { useTimeLogAggregate } from '@/hooks/queries/useTimeLogs';
import { useUsers } from '@/hooks/queries/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { USER_FORM_FIELDS, userFormSchema, type UserFormValues } from '@/schemas/user';
import { TaskStatus, USER_ROLE_LABELS, UserRole } from '@/types/enums';
import type { User } from '@/types/models';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { formatHours } from '@/utils/format';
import { canManageUsers } from '@/utils/permissions';

/**
 * Ekip sayfası.
 *
 * Uçlar: `GET /api/users` (Admin + ProjectManager) ve `PUT /api/users/{id}` (yalnızca Admin).
 *
 * Kullanıcı başına istatistikler (aktif/tamamlanan görev, kaydedilen süre) backend'de
 * HAZIR SUNULMUYOR (FRONTEND_API_GAPS.md #12); erişilebilir görev ve zaman kayıtları
 * üzerinden istemcide hesaplanır. Kapsam bu yüzden "sizin görebildiğiniz projeler"
 * ile sınırlıdır ve tabloda bu not edilir.
 *
 * Kullanıcı EKLEME ve SİLME uçları yok → arayüzde bu işlemler gösterilmez.
 */
export function TeamPage() {
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editing, setEditing] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const usersQuery = useUsers(page, pageSize);
  const tasksQuery = useAllTasks({});
  const timeLogsQuery = useTimeLogAggregate({ pageSize: 100 });
  const projectsQuery = useAllProjects();

  const updateUser = useUpdateUser();
  const canEdit = canManageUsers(currentUser);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      department: '',
      role: String(UserRole.TeamMember),
      isActive: true,
    },
  });

  useEffect(() => {
    if (!editing) return;
    form.reset({
      firstName: editing.firstName,
      lastName: editing.lastName,
      department: editing.department ?? '',
      role: String(editing.role),
      isActive: editing.isActive,
    });
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);

  // Kullanıcı bazlı türetilmiş istatistikler.
  const statsByUser = useMemo(() => {
    const map = new Map<number, { open: number; completed: number; hours: number; projects: Set<number> }>();

    function ensure(userId: number) {
      let entry = map.get(userId);
      if (!entry) {
        entry = { open: 0, completed: 0, hours: 0, projects: new Set<number>() };
        map.set(userId, entry);
      }
      return entry;
    }

    for (const task of tasksQuery.data?.items ?? []) {
      if (task.assignedToUserId === null) continue;
      const entry = ensure(task.assignedToUserId);
      if (task.status === TaskStatus.Done) entry.completed += 1;
      else entry.open += 1;
      entry.projects.add(task.projectId);
    }

    for (const log of timeLogsQuery.data?.items ?? []) {
      ensure(log.userId).hours += Number(log.hours);
    }

    // Proje sahipliği de "dahil olunan proje" sayılır.
    for (const project of projectsQuery.data ?? []) {
      ensure(project.ownerId).projects.add(project.id);
    }

    return map;
  }, [tasksQuery.data, timeLogsQuery.data, projectsQuery.data]);

  const statsLoading = tasksQuery.isLoading || timeLogsQuery.isLoading;

  async function onSubmit(values: UserFormValues) {
    if (!editing) return;
    setFormError(null);

    try {
      await updateUser.mutateAsync({
        userId: editing.id,
        payload: {
          firstName: values.firstName,
          lastName: values.lastName,
          department: values.department.trim() === '' ? null : values.department.trim(),
          role: Number(values.role) as UserRole,
          isActive: values.isActive,
        },
      });
      setEditing(null);
    } catch (error) {
      const message = applyApiFieldErrors(error, form.setError, [...USER_FORM_FIELDS]);
      if (message) setFormError(message);
    }
  }

  const users = usersQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ekip"
        description="Sistemdeki kullanıcılar ve iş yükleri."
        breadcrumbs={[{ label: 'Panel', to: '/dashboard' }, { label: 'Ekip' }]}
      />

      <Alert variant="info">
        Kullanıcı ekleme ve silme için API'de uç bulunmuyor. Yeni kullanıcılar yalnızca kayıt
        ekranından (<code className="rounded bg-muted px-1">POST /api/auth/register</code>) Ekip Üyesi
        rolüyle oluşturulabiliyor; rol yükseltme ve hesap pasifleştirme yöneticiye açık.
      </Alert>

      {usersQuery.isLoading ? (
        <TableSkeleton columns={7} />
      ) : usersQuery.isError ? (
        <ErrorState error={usersQuery.error} onRetry={() => void usersQuery.refetch()} />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="Kullanıcı bulunamadı" />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Departman</TableHead>
                  <TableHead className="text-right">Açık görev</TableHead>
                  <TableHead className="text-right">Tamamlanan</TableHead>
                  <TableHead className="text-right">Projeler</TableHead>
                  <TableHead className="text-right">Süre</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">İşlemler</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((person) => {
                  const stats = statsByUser.get(person.id);

                  return (
                    <TableRow key={person.id}>
                      <TableCell>
                        <span className="flex items-center gap-2.5">
                          <Avatar
                            name={`${person.firstName} ${person.lastName}`}
                            seed={person.id}
                            size="sm"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {person.firstName} {person.lastName}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {person.email}
                            </span>
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={person.role === UserRole.Admin ? 'default' : 'neutral'}>
                          {USER_ROLE_LABELS[person.role]}
                        </Badge>
                        {person.isActive ? null : (
                          <Badge variant="outline" className="ml-1.5">
                            Pasif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {person.department ?? '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {statsLoading ? '…' : (stats?.open ?? 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {statsLoading ? '…' : (stats?.completed ?? 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {statsLoading ? '…' : (stats?.projects.size ?? 0)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm">
                        {statsLoading ? '…' : formatHours(stats?.hours ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditing(person)}
                            aria-label={`${person.firstName} ${person.lastName} kullanıcısını düzenle`}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableWrapper>

          {usersQuery.data ? (
            <Paginator
              page={usersQuery.data.page}
              pageSize={usersQuery.data.pageSize}
              totalCount={usersQuery.data.totalCount}
              totalPages={usersQuery.data.totalPages}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          ) : null}
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
        Görev, proje ve süre sayıları API'de kullanıcı bazlı bir istatistik ucu bulunmadığı için
        sizin erişebildiğiniz kayıtlardan hesaplanır; başka projelerdeki iş yükünü içermeyebilir.
      </p>

      {/* Kullanıcı düzenleme (yalnızca Admin) */}
      <Dialog open={editing !== null} onOpenChange={(open) => (open ? undefined : setEditing(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcıyı düzenle</DialogTitle>
            <DialogDescription>
              {editing?.email} · rol ve hesap durumu yalnızca yöneticiler tarafından değiştirilebilir.
            </DialogDescription>
          </DialogHeader>

          {formError ? (
            <Alert variant="danger" className="mb-4">
              {formError}
            </Alert>
          ) : null}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Ad</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Soyad</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departman</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Rol</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(UserRole).map((role) => (
                          <SelectItem key={role} value={String(role)}>
                            {USER_ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Proje sahibi olabilmek için Yönetici veya Proje Yöneticisi rolü gerekir.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex-row items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Hesap aktif</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Vazgeç
                </Button>
                <Button type="submit" loading={form.formState.isSubmitting}>
                  Kaydet
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
