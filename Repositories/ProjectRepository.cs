using ProjectManagementAPI.Data;
using ProjectManagementAPI.Entities;

namespace ProjectManagementAPI.Repositories;

public class ProjectRepository : GenericRepository<Project>, IProjectRepository
{
    public ProjectRepository(AppDbContext context) : base(context) { }
}
