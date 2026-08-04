import { OPEN_TASK_STATUSES, ProjectStatus, TaskStatus } from '@/types/enums';
import type { ProjectTaskStats, WorkspaceStats } from '@/types/models';
import { toApiDate } from '@/utils/date';
import { toPercent } from '@/utils/format';

import { projectService } from './projectService';
import { taskService } from './taskService';

/**
 * Dashboard ve rapor sayaçları.
 *
 * Backend hazır bir istatistik ucu SUNMUYOR (FRONTEND_API_GAPS.md #5). Buradaki tüm
 * değerler, mevcut listeleme uçlarına `pageSize=1` ile gidip **yalnızca `totalCount`**
 * okunarak hesaplanır. Yani sayaçlar için tek bir görev kaydı bile indirilmez —
 * "tüm kayıtları indirip saymak" gibi ölçeklenmeyen bir yaklaşım kullanılmadı.
 *
 * Yetki filtresi backend'de uygulandığı için sayaçlar da otomatik olarak kullanıcının
 * eriştiği projelerle sınırlıdır.
 */
export const statsService = {
  async getWorkspaceStats(): Promise<WorkspaceStats> {
    const now = toApiDate(new Date());

    const [
      totalProjects,
      activeProjects,
      totalTasks,
      todoTasks,
      inProgressTasks,
      inReviewTasks,
      completedTasks,
      ...overdueByStatus
    ] = await Promise.all([
      projectService.list({ page: 1, pageSize: 1 }).then((r) => r.totalCount),
      projectService.list({ page: 1, pageSize: 1, status: ProjectStatus.Active }).then((r) => r.totalCount),
      taskService.count(),
      taskService.count({ status: TaskStatus.Todo }),
      taskService.count({ status: TaskStatus.InProgress }),
      taskService.count({ status: TaskStatus.InReview }),
      taskService.count({ status: TaskStatus.Done }),
      // "Geciken" = teslim tarihi geçmiş VE tamamlanmamış.
      // Backend tek istekte "status != Done" filtresi sunmadığı için açık durumlar
      // ayrı ayrı sayılıp toplanır (yine yalnızca totalCount okunur).
      ...OPEN_TASK_STATUSES.map((status) => taskService.count({ status, dueBefore: now })),
    ]);

    return {
      totalProjects,
      activeProjects,
      totalTasks,
      todoTasks,
      inProgressTasks,
      inReviewTasks,
      completedTasks,
      overdueTasks: overdueByStatus.reduce((sum, value) => sum + value, 0),
    };
  },

  /** Tek bir projenin görev sayısı / tamamlanan / ilerleme yüzdesi. İki sayım isteği yapar. */
  async getProjectStats(projectId: number): Promise<ProjectTaskStats> {
    const [totalTasks, completedTasks] = await Promise.all([
      taskService.count({ projectId }),
      taskService.count({ projectId, status: TaskStatus.Done }),
    ]);

    return {
      projectId,
      totalTasks,
      completedTasks,
      progress: toPercent(completedTasks, totalTasks),
    };
  },

  /** Belirli bir kullanıcıya atanmış görevlerin durum kırılımı (My Tasks / Team için). */
  async getUserTaskStats(userId: number): Promise<{ open: number; completed: number }> {
    const [completed, ...open] = await Promise.all([
      taskService.count({ assignedToUserId: userId, status: TaskStatus.Done }),
      ...OPEN_TASK_STATUSES.map((status) => taskService.count({ assignedToUserId: userId, status })),
    ]);

    return { completed, open: open.reduce((sum, value) => sum + value, 0) };
  },
};
