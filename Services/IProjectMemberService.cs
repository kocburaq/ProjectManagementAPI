using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.ProjectMembers;

namespace ProjectManagementAPI.Services;

public interface IProjectMemberService
{
    Task<PagedResult<ProjectMemberResponseDto>> GetMembersAsync(int projectId, PaginationQuery query, CurrentUser currentUser);
    Task<ProjectMemberResponseDto> AddMemberAsync(int projectId, AddProjectMemberDto dto, CurrentUser currentUser);
    Task RemoveMemberAsync(int projectId, int memberId, CurrentUser currentUser);
}
