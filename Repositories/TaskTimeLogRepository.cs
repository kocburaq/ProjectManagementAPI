using ProjectManagementAPI.Data;
using ProjectManagementAPI.Entities;

namespace ProjectManagementAPI.Repositories;

public class TaskTimeLogRepository : GenericRepository<TaskTimeLog>, ITaskTimeLogRepository
{
    public TaskTimeLogRepository(AppDbContext context) : base(context) { }
}
