using ProjectManagementAPI.Data;
using ProjectManagementAPI.Entities;

namespace ProjectManagementAPI.Repositories;

public class TaskRepository : GenericRepository<ProjectTask>, ITaskRepository
{
    public TaskRepository(AppDbContext context) : base(context) { }
}
