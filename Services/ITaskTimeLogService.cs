using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.TaskTimeLogs;

namespace ProjectManagementAPI.Services;

public interface ITaskTimeLogService
{
    Task<PagedResult<TaskTimeLogResponseDto>> GetAllAsync(TaskTimeLogQueryParameters query, CurrentUser currentUser);
    Task<TaskTimeLogResponseDto> CreateAsync(int taskId, CreateTaskTimeLogDto dto, CurrentUser currentUser);
}
