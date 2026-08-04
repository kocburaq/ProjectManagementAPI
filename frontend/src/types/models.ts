/**
 * Backend DTO'larının birebir TypeScript karşılıkları.
 *
 * Her arayüzün üstünde kaynak dosya belirtilmiştir. Burada backend'de OLMAYAN
 * hiçbir alan uydurulmamıştır; frontend'de türetilen değerler (ilerleme yüzdesi,
 * görev sayıları vb.) ayrıca `Derived*` tipleriyle işaretlenir.
 *
 * Tarihler backend'den ISO-8601 string olarak gelir. DİKKAT: veritabanından okunan
 * `DateTime` alanları sonunda `Z` OLMADAN gelir (`"2026-08-04T06:47:03.011835"`),
 * fakat değerler UTC'dir. Bu yüzden asla `new Date(str)` kullanmayın —
 * `utils/date.ts` içindeki `parseApiDate` kullanılmalıdır.
 */
import type {
  ProjectMemberRole,
  ProjectStatus,
  TaskChangeType,
  TaskPriority,
  TaskStatus,
  UserRole,
} from './enums';

/** ISO-8601 tarih dizesi (UTC, sonda `Z` olmayabilir). */
export type ApiDateString = string;

/* ---------------------------------- Auth ---------------------------------- */

/** Dtos/Auth/LoginRequestDto.cs */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Dtos/Auth/RegisterRequestDto.cs — kayıt her zaman TeamMember rolü üretir. */
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  department?: string | null;
}

/** Dtos/Auth/AuthResponseDto.cs */
export interface AuthResponse {
  accessToken: string;
  expiresAt: ApiDateString;
  user: User;
}

/* ---------------------------------- User ---------------------------------- */

/** Dtos/Users/UserResponseDto.cs */
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  department: string | null;
  isActive: boolean;
  createdAt: ApiDateString;
  updatedAt: ApiDateString | null;
}

/** Dtos/Users/UpdateUserDto.cs — yalnızca Admin çağırabilir. */
export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  department?: string | null;
  role: UserRole;
  isActive: boolean;
}

/* --------------------------------- Project -------------------------------- */

/** Dtos/Projects/ProjectResponseDto.cs */
export interface Project {
  id: number;
  name: string;
  description: string | null;
  startDate: ApiDateString;
  endDate: ApiDateString | null;
  status: ProjectStatus;
  ownerId: number;
  ownerName: string;
  isArchived: boolean;
  archivedAt: ApiDateString | null;
  createdAt: ApiDateString;
  updatedAt: ApiDateString | null;
}

/** Dtos/Projects/CreateProjectDto.cs */
export interface CreateProjectRequest {
  name: string;
  description?: string | null;
  startDate: ApiDateString;
  endDate?: ApiDateString | null;
  /** Boş bırakılırsa backend oturum sahibini owner yapar. Admin dışındakiler kendi id'si dışında değer veremez. */
  ownerId?: number | null;
}

/** Dtos/Projects/UpdateProjectDto.cs — status yalnızca burada değiştirilebilir. */
export interface UpdateProjectRequest {
  name: string;
  description?: string | null;
  startDate: ApiDateString;
  endDate?: ApiDateString | null;
  status: ProjectStatus;
}

/** Dtos/Projects/ProjectQueryParameters.cs (+ PaginationQuery) */
export interface ProjectQuery {
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'startDate' | 'status';
  sortDirection?: 'asc' | 'desc';
  status?: ProjectStatus;
  ownerId?: number;
}

/* ----------------------------- Project members ---------------------------- */

/** Dtos/ProjectMembers/ProjectMemberResponseDto.cs */
export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  userName: string;
  userEmail: string;
  role: ProjectMemberRole;
  joinedAt: ApiDateString;
  isActive: boolean;
}

/** Dtos/ProjectMembers/AddProjectMemberDto.cs */
export interface AddProjectMemberRequest {
  userId: number;
  role: ProjectMemberRole;
}

/* ---------------------------------- Task ---------------------------------- */

/**
 * Dtos/Tasks/TaskResponseDto.cs
 *
 * `actualHours` backend'de kolon değil; TaskTimeLogs toplamından hesaplanır.
 * Not: DTO'da yorum sayısı YOK (bkz. FRONTEND_API_GAPS.md #6).
 */
export interface Task {
  id: number;
  title: string;
  description: string | null;
  projectId: number;
  assignedToUserId: number | null;
  assignedToUserName: string | null;
  createdByUserId: number;
  createdByUserName: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: ApiDateString | null;
  estimatedHours: number | null;
  actualHours: number;
  createdAt: ApiDateString;
  updatedAt: ApiDateString | null;
  completedAt: ApiDateString | null;
}

/** Dtos/Tasks/CreateTaskDto.cs — status verilemez, backend her zaman Todo ile açar. */
export interface CreateTaskRequest {
  title: string;
  description?: string | null;
  projectId: number;
  assignedToUserId?: number | null;
  priority: TaskPriority;
  dueDate?: ApiDateString | null;
  estimatedHours?: number | null;
}

/** Dtos/Tasks/UpdateTaskDto.cs — projectId ve status bu uçtan değiştirilemez. */
export interface UpdateTaskRequest {
  title: string;
  description?: string | null;
  assignedToUserId?: number | null;
  priority: TaskPriority;
  dueDate?: ApiDateString | null;
  estimatedHours?: number | null;
}

/** Dtos/Tasks/ChangeTaskStatusDto.cs */
export interface ChangeTaskStatusRequest {
  status: TaskStatus;
}

/** Dtos/Tasks/TaskQueryParameters.cs (+ PaginationQuery) */
export interface TaskQuery {
  page?: number;
  pageSize?: number;
  sortBy?: 'dueDate' | 'priority' | 'status' | 'title';
  sortDirection?: 'asc' | 'desc';
  projectId?: number;
  assignedToUserId?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueBefore?: ApiDateString;
  dueAfter?: ApiDateString;
}

/* --------------------------------- Comment -------------------------------- */

/** Dtos/Comments/CommentResponseDto.cs */
export interface Comment {
  id: number;
  content: string;
  taskId: number;
  userId: number;
  userName: string;
  createdAt: ApiDateString;
  updatedAt: ApiDateString | null;
}

/** Dtos/Comments/CreateCommentDto.cs */
export interface CreateCommentRequest {
  content: string;
}

/** Dtos/Comments/UpdateCommentDto.cs */
export interface UpdateCommentRequest {
  content: string;
}

/* --------------------------------- TimeLog -------------------------------- */

/** Dtos/TaskTimeLogs/TaskTimeLogResponseDto.cs */
export interface TimeLog {
  id: number;
  taskId: number;
  userId: number;
  userName: string;
  hours: number;
  description: string | null;
  workDate: ApiDateString;
  createdAt: ApiDateString;
}

/**
 * Dtos/TaskTimeLogs/CreateTaskTimeLogDto.cs
 *
 * Model saat (decimal) + iş günü tutuyor; başlangıç/bitiş saati YOK.
 * Bu yüzden arayüzde de "başlat/durdur" timer'ı bulunmuyor (bkz. FRONTEND_API_GAPS.md #3).
 */
export interface CreateTimeLogRequest {
  hours: number;
  description?: string | null;
  workDate: ApiDateString;
}

/** Dtos/TaskTimeLogs/TaskTimeLogQueryParameters.cs (+ PaginationQuery) */
export interface TimeLogQuery {
  page?: number;
  pageSize?: number;
  taskId?: number;
  userId?: number;
  from?: ApiDateString;
  to?: ApiDateString;
}

/* ------------------------------- TaskHistory ------------------------------ */

/** Dtos/TaskHistories/TaskHistoryResponseDto.cs */
export interface TaskHistory {
  id: number;
  taskId: number;
  changedByUserId: number;
  changedByUserName: string;
  changeType: TaskChangeType;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
  createdAt: ApiDateString;
}

/* ------------------------- Frontend'de türetilenler ------------------------ */

/**
 * Proje kartlarındaki ilerleme. Backend proje bazlı görev sayısı DÖNMÜYOR;
 * bu değerler `GET /api/tasks?projectId=..&status=..&pageSize=1` çağrılarının
 * `totalCount` alanından hesaplanır (kayıtlar indirilmez).
 */
export interface ProjectTaskStats {
  projectId: number;
  totalTasks: number;
  completedTasks: number;
  /** 0-100 arası tam sayı. Görev yoksa 0. */
  progress: number;
}

/** Dashboard'daki sayaçlar — hepsi `totalCount` üzerinden, kayıt indirmeden hesaplanır. */
export interface WorkspaceStats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  inReviewTasks: number;
  overdueTasks: number;
}
