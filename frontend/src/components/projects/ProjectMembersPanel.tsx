import { zodResolver } from '@hookform/resolvers/zod';
import { Crown, Info, UserMinus, UserPlus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ListSkeleton } from '@/components/common/Skeletons';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAddProjectMember,
  useRemoveProjectMember,
} from '@/hooks/mutations/useProjectMemberMutations';
import { useProjectMembers } from '@/hooks/queries/useProjects';
import { useUserDirectory } from '@/hooks/queries/useUsers';
import { useAuth } from '@/hooks/useAuth';
import {
  PROJECT_MEMBER_FORM_FIELDS,
  projectMemberFormSchema,
  type ProjectMemberFormValues,
} from '@/schemas/user';
import { PROJECT_MEMBER_ROLE_LABELS, ProjectMemberRole } from '@/types/enums';
import type { Project, ProjectMember } from '@/types/models';
import { formatDate } from '@/utils/date';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { canViewUsers } from '@/utils/permissions';

export interface ProjectMembersPanelProps {
  project: Project;
  canManage: boolean;
}

/**
 * Proje ekip üyeleri.
 *
 * Uçlar: `GET/POST /api/projects/{id}/members`, `DELETE .../members/{memberId}`.
 * Üye çıkarma backend'de kalıcı silme değil, üyeliği pasifleştirmedir — arayüz de
 * bunu "Pasif" rozetiyle dürüstçe gösterir.
 *
 * Üye ekleme formu kullanıcı listesi gerektirir; `GET /api/users` yalnızca Admin ve
 * ProjectManager rollerine açık olduğu için diğer rollerde form hiç gösterilmez.
 */
export function ProjectMembersPanel({ project, canManage }: ProjectMembersPanelProps) {
  const { user } = useAuth();
  const membersQuery = useProjectMembers(project.id);
  const addMember = useAddProjectMember(project.id);
  const removeMember = useRemoveProjectMember(project.id);

  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ProjectMember | null>(null);

  const canPickUsers = canViewUsers(user);
  const usersQuery = useUserDirectory(canPickUsers && addOpen ? user : null);

  const members = membersQuery.data?.items ?? [];
  const activeMembers = members.filter((member) => member.isActive);
  const inactiveMembers = members.filter((member) => !member.isActive);

  // Zaten aktif üye olanlar ve proje sahibi seçeneklerden çıkarılır.
  const candidates = useMemo(() => {
    const takenUserIds = new Set(activeMembers.map((member) => member.userId));
    takenUserIds.add(project.ownerId);

    return (usersQuery.data ?? []).filter(
      (candidate) => candidate.isActive && !takenUserIds.has(candidate.id),
    );
  }, [usersQuery.data, activeMembers, project.ownerId]);

  const form = useForm<ProjectMemberFormValues>({
    resolver: zodResolver(projectMemberFormSchema),
    defaultValues: { userId: '', role: String(ProjectMemberRole.Member) },
  });

  async function onSubmit(values: ProjectMemberFormValues) {
    try {
      await addMember.mutateAsync({
        userId: Number(values.userId),
        role: Number(values.role) as ProjectMemberRole,
      });
      form.reset({ userId: '', role: String(ProjectMemberRole.Member) });
      setAddOpen(false);
    } catch (error) {
      applyApiFieldErrors(error, form.setError, [...PROJECT_MEMBER_FORM_FIELDS]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {activeMembers.length} aktif üye
          {inactiveMembers.length > 0 ? ` · ${inactiveMembers.length} pasif` : ''}
        </p>
        {canManage ? (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus aria-hidden="true" />
            Üye ekle
          </Button>
        ) : null}
      </div>

      {/* Proje sahibi ayrı gösterilir: üyelik kaydı olmadan da tam yetkilidir. */}
      <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3">
        <Avatar name={project.ownerName} seed={project.ownerId} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{project.ownerName}</p>
          <p className="text-xs text-muted-foreground">Proje sahibi</p>
        </div>
        <Badge variant="default">
          <Crown className="size-3" aria-hidden="true" />
          Sahip
        </Badge>
      </div>

      {membersQuery.isLoading ? (
        <ListSkeleton rows={3} />
      ) : membersQuery.isError ? (
        <ErrorState error={membersQuery.error} onRetry={() => void membersQuery.refetch()} bare />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Henüz ekip üyesi yok"
          description={
            canManage
              ? 'Projeye üye ekleyerek görev atayabilirsiniz.'
              : 'Proje sahibi ekip üyesi eklediğinde burada görünecek.'
          }
          bare
          className="py-8"
        />
      ) : (
        <ul className="divide-y divide-border">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 py-3">
              <Avatar name={member.userName} seed={member.userId} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{member.userName}</p>
                <p className="truncate text-xs text-muted-foreground">{member.userEmail}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={member.isActive ? 'neutral' : 'outline'}>
                  {PROJECT_MEMBER_ROLE_LABELS[member.role]}
                </Badge>
                {member.isActive ? (
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {formatDate(member.joinedAt)}
                  </span>
                ) : (
                  <Badge variant="outline">Pasif</Badge>
                )}

                {canManage && member.isActive ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-danger"
                    onClick={() => setRemoveTarget(member)}
                    aria-label={`${member.userName} üyeliğini kaldır`}
                  >
                    <UserMinus aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && !canPickUsers ? (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          Kullanıcı listesine erişim yetkiniz olmadığı için üye ekleme formu gösterilemiyor.
        </p>
      ) : null}

      {/* Üye ekleme diyaloğu */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ekibe üye ekle</DialogTitle>
            <DialogDescription>
              Yalnızca projeye üye olan kullanıcılara görev atanabilir.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Kullanıcı</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Kullanıcı seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {candidates.map((candidate) => (
                          <SelectItem key={candidate.id} value={String(candidate.id)}>
                            {candidate.firstName} {candidate.lastName} · {candidate.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {candidates.length === 0 && !usersQuery.isLoading ? (
                      <FormDescription>Eklenebilecek başka kullanıcı yok.</FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Proje rolü</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(ProjectMemberRole).map((role) => (
                          <SelectItem key={role} value={String(role)}>
                            {PROJECT_MEMBER_ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      "İzleyici" rolündeki üyeler salt okunurdur: yorum yazamaz, zaman kaydı
                      giremez, görev durumunu değiştiremez.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Vazgeç
                </Button>
                <Button type="submit" loading={form.formState.isSubmitting}>
                  Ekle
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => (open ? undefined : setRemoveTarget(null))}
        title="Üyelik kaldırılsın mı?"
        description={
          <>
            <strong>{removeTarget?.userName}</strong> projeden çıkarılacak. Üyelik kaydı silinmez,
            pasif duruma alınır; daha sonra tekrar eklenebilir.
          </>
        }
        confirmLabel="Kaldır"
        destructive
        loading={removeMember.isPending}
        onConfirm={() => {
          if (!removeTarget) return;
          removeMember.mutate(removeTarget.id, { onSettled: () => setRemoveTarget(null) });
        }}
      />
    </div>
  );
}
