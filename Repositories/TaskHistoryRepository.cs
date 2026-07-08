using ProjectManagementAPI.Data;
using ProjectManagementAPI.Entities;

namespace ProjectManagementAPI.Repositories;

public class TaskHistoryRepository : GenericRepository<TaskHistory>, ITaskHistoryRepository
{
    public TaskHistoryRepository(AppDbContext context) : base(context) { }
}
