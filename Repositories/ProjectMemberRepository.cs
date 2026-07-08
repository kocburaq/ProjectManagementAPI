using Microsoft.EntityFrameworkCore;
using ProjectManagementAPI.Data;
using ProjectManagementAPI.Entities;

namespace ProjectManagementAPI.Repositories;

public class ProjectMemberRepository : GenericRepository<ProjectMember>, IProjectMemberRepository
{
    public ProjectMemberRepository(AppDbContext context) : base(context) { }

    public async Task<ProjectMember?> GetMembershipAsync(int projectId, int userId) =>
        await DbSet.FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

    public async Task<bool> IsActiveMemberAsync(int projectId, int userId) =>
        await DbSet.AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.IsActive);
}
