import type { ProjectQuery, TaskQuery, TimeLogQuery } from '@/types/models';

/**
 * TanStack Query anahtar fabrikası.
 *
 * Hiyerarşik yapı sayesinde bir mutasyon sonrasında `queryKeys.tasks.all` ile
 * TÜM görev sorguları (liste, detay, sayaç) tek çağrıda invalidate edilebilir.
 */
export const queryKeys = {
  auth: {
    session: ['auth', 'session'] as const,
  },

  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (page: number, pageSize: number) => [...queryKeys.users.lists(), { page, pageSize }] as const,
    /** Atama/üye seçimi için tek seferde çekilen tüm kullanıcılar. */
    directory: () => [...queryKeys.users.all, 'directory'] as const,
    detail: (userId: number) => [...queryKeys.users.all, 'detail', userId] as const,
  },

  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (query: ProjectQuery) => [...queryKeys.projects.lists(), query] as const,
    detail: (projectId: number) => [...queryKeys.projects.all, 'detail', projectId] as const,
    members: (projectId: number) => [...queryKeys.projects.all, 'members', projectId] as const,
    /** Proje bazlı görev sayacı (tasks endpoint'inin totalCount'undan türetilir). */
    stats: (projectId: number) => [...queryKeys.projects.all, 'stats', projectId] as const,
  },

  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (query: TaskQuery) => [...queryKeys.tasks.lists(), query] as const,
    detail: (taskId: number) => [...queryKeys.tasks.all, 'detail', taskId] as const,
    histories: (taskId: number) => [...queryKeys.tasks.all, 'histories', taskId] as const,
    /** Yalnızca totalCount okunan sayım sorguları. */
    count: (query: TaskQuery) => [...queryKeys.tasks.all, 'count', query] as const,
  },

  comments: {
    all: ['comments'] as const,
    byTask: (taskId: number) => [...queryKeys.comments.all, 'task', taskId] as const,
  },

  timeLogs: {
    all: ['timeLogs'] as const,
    lists: () => [...queryKeys.timeLogs.all, 'list'] as const,
    list: (query: TimeLogQuery) => [...queryKeys.timeLogs.lists(), query] as const,
    byTask: (taskId: number) => [...queryKeys.timeLogs.all, 'task', taskId] as const,
    /** Sayfalar boyunca toplanan (bounded) kayıtlar — raporlar ve haftalık toplam için. */
    aggregate: (query: TimeLogQuery) => [...queryKeys.timeLogs.all, 'aggregate', query] as const,
  },

  stats: {
    all: ['stats'] as const,
    workspace: () => [...queryKeys.stats.all, 'workspace'] as const,
  },
} as const;
