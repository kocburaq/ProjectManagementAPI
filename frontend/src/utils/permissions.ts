import { ProjectMemberRole, UserRole } from '@/types/enums';
import type { Comment, Project, ProjectMember, Task, User } from '@/types/models';

/**
 * Backend'deki yetki kurallarının arayüz karşılığı.
 *
 * Bunlar SADECE UX içindir (yetkisiz butonu göstermemek). Gerçek kontrol her zaman
 * backend'dedir; buradaki bir hata güvenlik açığı yaratmaz, yalnızca kullanıcı
 * 403 hatası alır. Kurallar Services/*.cs içindeki `EnsureCanManage*` metotlarından
 * birebir çıkarılmıştır.
 */

export function isAdmin(user: User | null): boolean {
  return user?.role === UserRole.Admin;
}

export function isProjectManager(user: User | null): boolean {
  return user?.role === UserRole.ProjectManager;
}

/** `POST /api/projects` → [Authorize(Roles = "Admin,ProjectManager")] */
export function canCreateProject(user: User | null): boolean {
  return user?.role === UserRole.Admin || user?.role === UserRole.ProjectManager;
}

/** ProjectService.EnsureCanManage: Admin ya da projenin sahibi. */
export function canManageProject(user: User | null, project: Project | null | undefined): boolean {
  if (!user || !project) return false;
  return user.role === UserRole.Admin || project.ownerId === user.id;
}

/** TaskService.EnsureCanManageProject — görev oluşturma/güncelleme/silme aynı kurala tabi. */
export function canManageTasks(user: User | null, project: Project | null | undefined): boolean {
  return canManageProject(user, project);
}

/**
 * TaskService.ChangeStatusAsync: Admin, proje sahibi ya da görevin atanan kişisi.
 * Atanan kişi `Viewer` rolündeyse durum değiştiremez.
 */
export function canChangeTaskStatus(
  user: User | null,
  task: Task | null | undefined,
  project: Project | null | undefined,
  membership?: ProjectMember | null,
): boolean {
  if (!user || !task) return false;
  if (user.role === UserRole.Admin) return true;
  if (project && project.ownerId === user.id) return true;
  if (task.assignedToUserId !== user.id) return false;
  return membership?.role !== ProjectMemberRole.Viewer;
}

/**
 * CommentService.EnsureCanCommentAsync / TaskTimeLogService.CreateAsync:
 * Admin ve proje sahibi her zaman; üye ise `Viewer` olmamalı.
 */
export function canContribute(
  user: User | null,
  project: Project | null | undefined,
  membership?: ProjectMember | null,
): boolean {
  if (!user) return false;
  if (user.role === UserRole.Admin) return true;
  if (project && project.ownerId === user.id) return true;
  if (!membership || !membership.isActive) return false;
  return membership.role !== ProjectMemberRole.Viewer;
}

/** CommentService.EnsureCanModify: yalnızca yorumun sahibi ya da Admin. */
export function canModifyComment(user: User | null, comment: Comment): boolean {
  if (!user) return false;
  return user.role === UserRole.Admin || comment.userId === user.id;
}

/** `GET /api/users` → [Authorize(Roles = "Admin,ProjectManager")]. TeamMember 403 alır. */
export function canViewUsers(user: User | null): boolean {
  return user?.role === UserRole.Admin || user?.role === UserRole.ProjectManager;
}

/** `PUT /api/users/{id}` → [Authorize(Roles = "Admin")] */
export function canManageUsers(user: User | null): boolean {
  return user?.role === UserRole.Admin;
}

/** Ekip üyeliği ekleme/çıkarma → [Authorize(Roles = "Admin,ProjectManager")] + proje sahipliği. */
export function canManageMembers(user: User | null, project: Project | null | undefined): boolean {
  if (!canCreateProject(user)) return false;
  return canManageProject(user, project);
}
