using Microsoft.EntityFrameworkCore;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.Comments;
using ProjectManagementAPI.Entities;
using ProjectManagementAPI.Enums;
using ProjectManagementAPI.Repositories;

namespace ProjectManagementAPI.Services;

public class CommentService : ICommentService
{
    private readonly IUnitOfWork _unitOfWork;

    public CommentService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<PagedResult<CommentResponseDto>> GetByTaskAsync(int taskId, PaginationQuery query, CurrentUser currentUser)
    {
        await EnsureTaskAccessibleAsync(taskId, currentUser);

        var comments = _unitOfWork.Comments.Query()
            .Include(c => c.User)
            .Where(c => c.TaskId == taskId)
            .OrderBy(c => c.CreatedAt);

        var totalCount = await comments.CountAsync();
        var items = await comments
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(c => MapToDto(c))
            .ToListAsync();

        return new PagedResult<CommentResponseDto>
        {
            Items = items,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<CommentResponseDto> CreateAsync(int taskId, CreateCommentDto dto, CurrentUser currentUser)
    {
        await EnsureCanCommentAsync(taskId, currentUser);

        var comment = new Comment
        {
            TaskId = taskId,
            UserId = currentUser.Id,
            Content = dto.Content
        };

        await _unitOfWork.Comments.AddAsync(comment);
        await _unitOfWork.SaveChangesAsync();

        var user = await _unitOfWork.Users.GetByIdAsync(currentUser.Id);
        comment.User = user!;
        return MapToDto(comment);
    }

    public async Task<CommentResponseDto> UpdateAsync(int commentId, UpdateCommentDto dto, CurrentUser currentUser)
    {
        var comment = await _unitOfWork.Comments.Query()
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == commentId)
            ?? throw new NotFoundException($"Comment {commentId} was not found.");

        EnsureCanModify(comment, currentUser);

        comment.Content = dto.Content;
        comment.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Comments.Update(comment);
        await _unitOfWork.SaveChangesAsync();

        return MapToDto(comment);
    }

    public async Task DeleteAsync(int commentId, CurrentUser currentUser)
    {
        var comment = await _unitOfWork.Comments.GetByIdAsync(commentId)
            ?? throw new NotFoundException($"Comment {commentId} was not found.");

        EnsureCanModify(comment, currentUser);

        comment.IsDeleted = true;
        _unitOfWork.Comments.Update(comment);
        await _unitOfWork.SaveChangesAsync();
    }

    private async Task EnsureTaskAccessibleAsync(int taskId, CurrentUser currentUser)
    {
        var task = await _unitOfWork.Tasks.Query()
            .Include(t => t.Project)
            .ThenInclude(p => p.Members)
            .FirstOrDefaultAsync(t => t.Id == taskId)
            ?? throw new NotFoundException($"Task {taskId} was not found.");

        var hasAccess = currentUser.Role == UserRole.Admin
            || task.Project.OwnerId == currentUser.Id
            || task.Project.Members.Any(m => m.UserId == currentUser.Id && m.IsActive);

        if (!hasAccess)
        {
            throw new ForbiddenException("Only a project member or the project owner can comment on this task.");
        }
    }

    private async Task EnsureCanCommentAsync(int taskId, CurrentUser currentUser)
    {
        var task = await _unitOfWork.Tasks.Query()
            .Include(t => t.Project)
            .ThenInclude(p => p.Members)
            .FirstOrDefaultAsync(t => t.Id == taskId)
            ?? throw new NotFoundException($"Task {taskId} was not found.");

        if (currentUser.Role == UserRole.Admin || task.Project.OwnerId == currentUser.Id)
        {
            return;
        }

        var membership = task.Project.Members.FirstOrDefault(m => m.UserId == currentUser.Id && m.IsActive);
        if (membership == null)
        {
            throw new ForbiddenException("Only a project member or the project owner can comment on this task.");
        }

        if (membership.Role == ProjectMemberRole.Viewer)
        {
            throw new ForbiddenException("Viewers are not allowed to comment on tasks.");
        }
    }

    private static void EnsureCanModify(Comment comment, CurrentUser currentUser)
    {
        if (currentUser.Role != UserRole.Admin && comment.UserId != currentUser.Id)
        {
            throw new ForbiddenException("Only the comment author or an Admin can modify this comment.");
        }
    }

    private static CommentResponseDto MapToDto(Comment comment) => new()
    {
        Id = comment.Id,
        Content = comment.Content,
        TaskId = comment.TaskId,
        UserId = comment.UserId,
        UserName = comment.User != null ? $"{comment.User.FirstName} {comment.User.LastName}" : string.Empty,
        CreatedAt = comment.CreatedAt,
        UpdatedAt = comment.UpdatedAt
    };
}
