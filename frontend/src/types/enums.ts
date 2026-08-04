/**
 * Backend enum'larının birebir karşılıkları.
 *
 * ÖNEMLİ: API'de `JsonStringEnumConverter` kayıtlı DEĞİL (bkz. Program.cs), bu yüzden
 * enum'lar JSON'da **sayı** olarak taşınır (`"role": 2`). Sabitler burada backend'deki
 * `Enums/*.cs` dosyalarındaki değerlerle aynı tutulmalıdır.
 */

/** Enums/UserRole.cs */
export const UserRole = {
  Admin: 1,
  ProjectManager: 2,
  TeamMember: 3,
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Enums/ProjectStatus.cs */
export const ProjectStatus = {
  Planning: 1,
  Active: 2,
  OnHold: 3,
  Completed: 4,
  Cancelled: 5,
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

/** Enums/ProjectTaskStatus.cs — Kanban kolonları bu değerlerden üretilir. */
export const TaskStatus = {
  Todo: 1,
  InProgress: 2,
  InReview: 3,
  Done: 4,
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

/** Enums/ProjectTaskPriority.cs */
export const TaskPriority = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

/** Enums/ProjectMemberRole.cs — `Viewer` salt okunurdur (yorum/zaman kaydı yapamaz). */
export const ProjectMemberRole = {
  Member: 1,
  Contributor: 2,
  Viewer: 3,
} as const;
export type ProjectMemberRole = (typeof ProjectMemberRole)[keyof typeof ProjectMemberRole];

/** Enums/TaskChangeType.cs */
export const TaskChangeType = {
  StatusChanged: 1,
  AssignedUserChanged: 2,
  PriorityChanged: 3,
  Updated: 4,
} as const;
export type TaskChangeType = (typeof TaskChangeType)[keyof typeof TaskChangeType];

/* ------------------------------------------------------------------ */
/* Görüntüleme yardımcıları                                            */
/* ------------------------------------------------------------------ */

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Admin]: 'Yönetici',
  [UserRole.ProjectManager]: 'Proje Yöneticisi',
  [UserRole.TeamMember]: 'Ekip Üyesi',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.Planning]: 'Planlama',
  [ProjectStatus.Active]: 'Aktif',
  [ProjectStatus.OnHold]: 'Beklemede',
  [ProjectStatus.Completed]: 'Tamamlandı',
  [ProjectStatus.Cancelled]: 'İptal',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.Todo]: 'Yapılacak',
  [TaskStatus.InProgress]: 'Devam Ediyor',
  [TaskStatus.InReview]: 'İncelemede',
  [TaskStatus.Done]: 'Tamamlandı',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.Low]: 'Düşük',
  [TaskPriority.Medium]: 'Orta',
  [TaskPriority.High]: 'Yüksek',
  [TaskPriority.Critical]: 'Kritik',
};

export const PROJECT_MEMBER_ROLE_LABELS: Record<ProjectMemberRole, string> = {
  [ProjectMemberRole.Member]: 'Üye',
  [ProjectMemberRole.Contributor]: 'Katkıda Bulunan',
  [ProjectMemberRole.Viewer]: 'İzleyici (salt okunur)',
};

export const TASK_CHANGE_TYPE_LABELS: Record<TaskChangeType, string> = {
  [TaskChangeType.StatusChanged]: 'Durum değişti',
  [TaskChangeType.AssignedUserChanged]: 'Atanan kişi değişti',
  [TaskChangeType.PriorityChanged]: 'Öncelik değişti',
  [TaskChangeType.Updated]: 'Güncellendi',
};

/** Kanban kolon sırası — backend'deki gerçek status enum'una göre. */
export const TASK_STATUS_ORDER: TaskStatus[] = [
  TaskStatus.Todo,
  TaskStatus.InProgress,
  TaskStatus.InReview,
  TaskStatus.Done,
];

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  ProjectStatus.Planning,
  ProjectStatus.Active,
  ProjectStatus.OnHold,
  ProjectStatus.Completed,
  ProjectStatus.Cancelled,
];

export const TASK_PRIORITY_ORDER: TaskPriority[] = [
  TaskPriority.Critical,
  TaskPriority.High,
  TaskPriority.Medium,
  TaskPriority.Low,
];

/** "Kapanmamış" görev durumları — gecikme ve devam eden iş hesaplarında kullanılır. */
export const OPEN_TASK_STATUSES: TaskStatus[] = [
  TaskStatus.Todo,
  TaskStatus.InProgress,
  TaskStatus.InReview,
];
