using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.Comments;

namespace ProjectManagementAPI.Services;

public interface ICommentService
{
    Task<PagedResult<CommentResponseDto>> GetByTaskAsync(int taskId, PaginationQuery query, CurrentUser currentUser);
    Task<CommentResponseDto> CreateAsync(int taskId, CreateCommentDto dto, CurrentUser currentUser);
    Task<CommentResponseDto> UpdateAsync(int commentId, UpdateCommentDto dto, CurrentUser currentUser);
    Task DeleteAsync(int commentId, CurrentUser currentUser);
}
