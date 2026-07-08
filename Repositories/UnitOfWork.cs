using ProjectManagementAPI.Data;

namespace ProjectManagementAPI.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
        Users = new UserRepository(_context);
        Projects = new ProjectRepository(_context);
        ProjectMembers = new ProjectMemberRepository(_context);
        Tasks = new TaskRepository(_context);
        Comments = new CommentRepository(_context);
        TaskHistories = new TaskHistoryRepository(_context);
        TaskTimeLogs = new TaskTimeLogRepository(_context);
    }

    public IUserRepository Users { get; }
    public IProjectRepository Projects { get; }
    public IProjectMemberRepository ProjectMembers { get; }
    public ITaskRepository Tasks { get; }
    public ICommentRepository Comments { get; }
    public ITaskHistoryRepository TaskHistories { get; }
    public ITaskTimeLogRepository TaskTimeLogs { get; }

    public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();
}
