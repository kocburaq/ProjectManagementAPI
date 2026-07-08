namespace ProjectManagementAPI.Repositories;

public interface IUnitOfWork
{
    IUserRepository Users { get; }
    IProjectRepository Projects { get; }
    IProjectMemberRepository ProjectMembers { get; }
    ITaskRepository Tasks { get; }
    ICommentRepository Comments { get; }
    ITaskHistoryRepository TaskHistories { get; }
    ITaskTimeLogRepository TaskTimeLogs { get; }

    Task<int> SaveChangesAsync();
}
