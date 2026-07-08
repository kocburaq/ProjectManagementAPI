using ProjectManagementAPI.Entities;

namespace ProjectManagementAPI.Repositories;

public interface IProjectMemberRepository : IGenericRepository<ProjectMember>
{
    Task<ProjectMember?> GetMembershipAsync(int projectId, int userId);
    Task<bool> IsActiveMemberAsync(int projectId, int userId);
}
