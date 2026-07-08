using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.Tasks;

namespace ProjectManagementAPI.Services;

public interface ITaskService
{
    Task<PagedResult<TaskResponseDto>> GetAllAsync(TaskQueryParameters query, CurrentUser currentUser);
    Task<TaskResponseDto> GetByIdAsync(int id, CurrentUser currentUser);
    Task<TaskResponseDto> CreateAsync(CreateTaskDto dto, CurrentUser currentUser);
    Task<TaskResponseDto> UpdateAsync(int id, UpdateTaskDto dto, CurrentUser currentUser);
    Task<TaskResponseDto> ChangeStatusAsync(int id, ChangeTaskStatusDto dto, CurrentUser currentUser);
    Task DeleteAsync(int id, CurrentUser currentUser);
}
