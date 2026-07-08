using Microsoft.EntityFrameworkCore;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.TaskHistories;
using ProjectManagementAPI.Entities;
using ProjectManagementAPI.Enums;
using ProjectManagementAPI.Repositories;

namespace ProjectManagementAPI.Services;

public class TaskHistoryService : ITaskHistoryService
{
    private readonly IUnitOfWork _unitOfWork;

    public TaskHistoryService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task LogAsync(int taskId, int changedByUserId, TaskChangeType changeType, string? oldValue, string? newValue, string? description = null)
    {
        var history = new TaskHistory
        {
            TaskId = taskId,
            ChangedByUserId = changedByUserId,
            ChangeType = changeType,
            OldValue = oldValue,
            NewValue = newValue,
            Description = description
        };

        await _unitOfWork.TaskHistories.AddAsync(history);
    }

    public async Task<PagedResult<TaskHistoryResponseDto>> GetByTaskAsync(int taskId, PaginationQuery query, CurrentUser currentUser)
    {
        await EnsureTaskAccessibleAsync(taskId, currentUser);

        var histories = _unitOfWork.TaskHistories.Query()
            .Include(h => h.ChangedByUser)
            .Where(h => h.TaskId == taskId)
            .OrderByDescending(h => h.CreatedAt);

        var totalCount = await histories.CountAsync();
        var items = await histories
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(h => new TaskHistoryResponseDto
            {
                Id = h.Id,
                TaskId = h.TaskId,
                ChangedByUserId = h.ChangedByUserId,
                ChangedByUserName = h.ChangedByUser.FirstName + " " + h.ChangedByUser.LastName,
                ChangeType = h.ChangeType,
                OldValue = h.OldValue,
                NewValue = h.NewValue,
                Description = h.Description,
                CreatedAt = h.CreatedAt
            })
            .ToListAsync();

        return new PagedResult<TaskHistoryResponseDto>
        {
            Items = items,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
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
            throw new ForbiddenException("You do not have access to this task.");
        }
    }
}
