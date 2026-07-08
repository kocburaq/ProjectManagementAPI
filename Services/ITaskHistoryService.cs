using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.TaskHistories;
using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Services;

public interface ITaskHistoryService
{
    Task LogAsync(int taskId, int changedByUserId, TaskChangeType changeType, string? oldValue, string? newValue, string? description = null);
    Task<PagedResult<TaskHistoryResponseDto>> GetByTaskAsync(int taskId, PaginationQuery query, CurrentUser currentUser);
}
