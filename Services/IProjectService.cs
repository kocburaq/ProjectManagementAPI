using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.Projects;

namespace ProjectManagementAPI.Services;

public interface IProjectService
{
    Task<PagedResult<ProjectResponseDto>> GetAllAsync(ProjectQueryParameters query, CurrentUser currentUser);
    Task<ProjectResponseDto> GetByIdAsync(int id, CurrentUser currentUser);
    Task<ProjectResponseDto> CreateAsync(CreateProjectDto dto, CurrentUser currentUser);
    Task<ProjectResponseDto> UpdateAsync(int id, UpdateProjectDto dto, CurrentUser currentUser);
    Task ArchiveAsync(int id, CurrentUser currentUser);
    Task DeleteAsync(int id, CurrentUser currentUser);
}
