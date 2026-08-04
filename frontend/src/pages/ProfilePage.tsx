import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Clock, ListTodo, Mail, Shield } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { SectionCard } from '@/components/common/SectionCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUpdateUser } from '@/hooks/mutations/useUserMutations';
import { useAllTasks } from '@/hooks/queries/useTasks';
import { useTimeLogAggregate } from '@/hooks/queries/useTimeLogs';
import { useAuth } from '@/hooks/useAuth';
import { sumHours } from '@/services/timeLogService';
import { USER_FORM_FIELDS, userFormSchema, type UserFormValues } from '@/schemas/user';
import { TaskStatus, USER_ROLE_LABELS, UserRole } from '@/types/enums';
import { formatDateTime } from '@/utils/date';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { formatHours, getFullName } from '@/utils/format';
import { canManageUsers } from '@/utils/permissions';

/**
 * Profil.
 *
 * SINIR: Backend'de kullanıcının KENDİ profilini güncelleyebileceği bir uç YOK.
 * Var olan tek güncelleme ucu `PUT /api/users/{id}` ve o da `[Authorize(Roles = "Admin")]`
 * ile korunuyor (FRONTEND_API_GAPS.md #13). Bu yüzden:
 *   - Admin kullanıcılar kendi bilgilerini düzenleyebilir (gerçek uca bağlı).
 *   - Diğer roller için form salt okunur gösterilir; çalışmıyormuş gibi bir
 *     "Kaydet" butonu sunulmaz.
 * Şifre değiştirme ucu da bulunmadığından böyle bir bölüm eklenmemiştir.
 */
export function ProfilePage() {
  const { user, updateCurrentUser } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const updateUser = useUpdateUser();
  const canEditSelf = canManageUsers(user);

  const myTasksQuery = useAllTasks(
    { assignedToUserId: user?.id },
    Boolean(user),
  );
  const myLogsQuery = useTimeLogAggregate({ userId: user?.id }, Boolean(user));

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
    if (!user) return;
    form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      department: user.department ?? '',
      role: String(user.role),
      isActive: user.isActive,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const stats = useMemo(() => {
    const tasks = myTasksQuery.data?.items ?? [];
    return {
      open: tasks.filter((task) => task.status !== TaskStatus.Done).length,
      completed: tasks.filter((task) => task.status === TaskStatus.Done).length,
      hours: sumHours(myLogsQuery.data?.items ?? []),
    };
  }, [myTasksQuery.data, myLogsQuery.data]);

  if (!user) return null;

  async function onSubmit(values: UserFormValues) {
    if (!user) return;
    setFormError(null);

    try {
      const updated = await updateUser.mutateAsync({
        userId: user.id,
        payload: {
          firstName: values.firstName,
          lastName: values.lastName,
          department: values.department.trim() === '' ? null : values.department.trim(),
          // Rol ve aktiflik profil ekranından değiştirilmez; mevcut değerler korunur.
          role: user.role,
          isActive: user.isActive,
        },
      });
      updateCurrentUser(updated);
    } catch (error) {
      const message = applyApiFieldErrors(error, form.setError, [...USER_FORM_FIELDS]);
      if (message) setFormError(message);
    }
  }

  const fullName = getFullName(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil"
        description="Hesap bilgileriniz ve iş yükü özetiniz."
        breadcrumbs={[{ label: 'Panel', to: '/dashboard' }, { label: 'Profil' }]}
      />

      {/* Kimlik kartı */}
      <Card>
        <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
          <Avatar name={fullName} seed={user.id} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
              {fullName}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="size-3.5" aria-hidden="true" />
              {user.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="default">
                <Shield className="size-3" aria-hidden="true" />
                {USER_ROLE_LABELS[user.role]}
              </Badge>
              {user.department ? <Badge variant="neutral">{user.department}</Badge> : null}
              {user.isActive ? null : <Badge variant="danger">Pasif hesap</Badge>}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Katılım: {formatDateTime(user.createdAt)}
          </div>
        </CardContent>
      </Card>

      {/* İş yükü özeti */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary-subtle text-primary">
              <ListTodo className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Açık görev</p>
              <p className="text-xl font-semibold tracking-tight">{stats.open}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="flex size-9 items-center justify-center rounded-md bg-success-subtle text-success">
              <CheckCircle2 className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Tamamlanan görev</p>
              <p className="text-xl font-semibold tracking-tight">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Clock className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Kaydedilen süre</p>
              <p className="text-xl font-semibold tracking-tight">{formatHours(stats.hours)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hesap bilgileri */}
      <SectionCard
        title="Hesap bilgileri"
        description={
          canEditSelf
            ? 'Ad, soyad ve departman bilgilerinizi güncelleyebilirsiniz.'
            : 'Bilgilerinizi görüntüleyebilirsiniz.'
        }
      >
        {canEditSelf ? (
          <>
            {formError ? (
              <Alert variant="danger" className="mb-4">
                {formError}
              </Alert>
            ) : null}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-lg space-y-4" noValidate>
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

                <div>
                  <FormLabel className="mb-1.5 block">E-posta</FormLabel>
                  <Input value={user.email} disabled readOnly />
                  <p className="mt-1 text-xs text-muted-foreground">
                    E-posta adresi API üzerinden değiştirilemiyor.
                  </p>
                </div>

                <Button type="submit" loading={form.formState.isSubmitting}>
                  Değişiklikleri kaydet
                </Button>
              </form>
            </Form>
          </>
        ) : (
          <div className="max-w-lg space-y-4">
            <Alert variant="info">
              API'de kullanıcıların kendi profilini güncelleyebileceği bir uç bulunmuyor; tek
              güncelleme ucu (<code className="rounded bg-muted px-1">PUT /api/users/&#123;id&#125;</code>)
              yalnızca yöneticilere açık. Bilgilerinizin değişmesi için bir yöneticiye başvurun.
            </Alert>

            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Ad Soyad</dt>
                <dd className="mt-0.5 text-sm text-foreground">{fullName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">E-posta</dt>
                <dd className="mt-0.5 text-sm text-foreground">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Rol</dt>
                <dd className="mt-0.5 text-sm text-foreground">{USER_ROLE_LABELS[user.role]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Departman</dt>
                <dd className="mt-0.5 text-sm text-foreground">{user.department ?? '—'}</dd>
              </div>
            </dl>
          </div>
        )}
      </SectionCard>

      <Alert variant="info">
        Şifre değiştirme için API'de bir uç bulunmuyor, bu nedenle profilde şifre bölümü yer almıyor.
      </Alert>
    </div>
  );
}
