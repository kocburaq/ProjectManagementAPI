/**
 * Backend'de GERÇEKTEN var olan tüm uçların tek listesi.
 *
 * Buradaki her satır `Controllers/*.cs` içindeki bir route ile birebir eşleşir.
 * Listede olmayan bir yol frontend'de kullanılmaz — eksikler
 * `FRONTEND_API_GAPS.md` dosyasında raporlanmıştır.
 *
 * Yollar `env.apiBaseUrl` (varsayılan `http://localhost:5044/api`) ile birleştirilir,
 * bu yüzden başında `/api` yoktur.
 */
export const endpoints = {
  auth: {
    /** POST — AuthController.Register */
    register: '/auth/register',
    /** POST — AuthController.Login */
    login: '/auth/login',
    /** POST — AuthController.Logout ([Authorize]) */
    logout: '/auth/logout',
  },

  users: {
    /** GET — UsersController.GetAll (Admin, ProjectManager) */
    list: '/users',
    /** GET — UsersController.GetById (Admin, ProjectManager) */
    detail: (userId: number) => `/users/${userId}`,
    /** PUT — UsersController.Update (yalnızca Admin) */
    update: (userId: number) => `/users/${userId}`,
  },

  projects: {
    /** GET | POST — ProjectsController */
    list: '/projects',
    /** GET | PUT | DELETE — ProjectsController */
    detail: (projectId: number) => `/projects/${projectId}`,
    /** PATCH — ProjectsController.Archive */
    archive: (projectId: number) => `/projects/${projectId}/archive`,
    /** GET | POST — ProjectMembersController */
    members: (projectId: number) => `/projects/${projectId}/members`,
    /** DELETE — ProjectMembersController.RemoveMember */
    member: (projectId: number, memberId: number) => `/projects/${projectId}/members/${memberId}`,
  },

  tasks: {
    /** GET | POST — TasksController */
    list: '/tasks',
    /** GET | PUT | DELETE — TasksController */
    detail: (taskId: number) => `/tasks/${taskId}`,
    /** PATCH — TasksController.ChangeStatus */
    status: (taskId: number) => `/tasks/${taskId}/status`,
    /** GET | POST — CommentsController */
    comments: (taskId: number) => `/tasks/${taskId}/comments`,
    /** GET — TaskHistoriesController.GetByTask */
    histories: (taskId: number) => `/tasks/${taskId}/histories`,
    /** POST — TaskTimeLogsController.Create */
    timeLogs: (taskId: number) => `/tasks/${taskId}/time-logs`,
  },

  comments: {
    /** PUT | DELETE — CommentsController */
    detail: (commentId: number) => `/comments/${commentId}`,
  },

  timeLogs: {
    /** GET — TaskTimeLogsController.GetAll */
    list: '/time-logs',
  },
} as const;
