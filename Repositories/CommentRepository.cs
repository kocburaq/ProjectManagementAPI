using ProjectManagementAPI.Data;
using ProjectManagementAPI.Entities;

namespace ProjectManagementAPI.Repositories;

public class CommentRepository : GenericRepository<Comment>, ICommentRepository
{
    public CommentRepository(AppDbContext context) : base(context) { }
}
