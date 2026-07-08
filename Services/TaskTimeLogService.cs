using Microsoft.EntityFrameworkCore;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.TaskTimeLogs;
using ProjectManagementAPI.Entities;
using ProjectManagementAPI.Enums;
using ProjectManagementAPI.Repositories;

namespace ProjectManagementAPI.Services;

public class TaskTimeLogService : ITaskTimeLogService
{
    private readonly IUnitOfWork _unitOfWork;

    public TaskTimeLogService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<PagedResult<TaskTimeLogResponseDto>> GetAllAsync(TaskTimeLogQueryParameters query, CurrentUser currentUser)
    {
        var logs = _unitOfWork.TaskTimeLogs.Query()
            .Include(l => l.User)
            .Include(l => l.Task)
            .ThenInclude(t => t.Project)
            .ThenInclude(p => p.Members)
            .AsQueryable();

        if (currentUser.Role != UserRole.Admin)
        {
            logs = logs.Where(l => l.Task.Project.OwnerId == currentUser.Id
                || l.Task.Project.Members.Any(m => m.UserId == currentUser.Id && m.IsActive));
        }

        if (query.TaskId.HasValue)
        {
            logs = logs.Where(l => l.TaskId == query.TaskId.Value);
        }

        if (query.UserId.HasValue)
        {
            logs = logs.Where(l => l.UserId == query.UserId.Value);
        }

        if (query.From.HasValue)
        {
            logs = logs.Where(l => l.WorkDate >= query.From.Value);
        }

        if (query.To.HasValue)
        {
            logs = logs.Where(l => l.WorkDate <= query.To.Value);
        }

        logs = logs.OrderByDescending(l => l.WorkDate);

        var totalCount = await logs.CountAsync();
        var items = await logs
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(l => MapToDto(l))
            .ToListAsync();

        return new PagedResult<TaskTimeLogResponseDto>
        {
            Items = items,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<TaskTimeLogResponseDto> CreateAsync(int taskId, CreateTaskTimeLogDto dto, CurrentUser currentUser)
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
            throw new ForbiddenException("You are not authorized to log time on this task.");
        }

        if (dto.Hours <= 0)
        {
            throw new BusinessRuleException("Hours must be greater than zero.");
        }

        var user = await _unitOfWork.Users.GetByIdAsync(currentUser.Id)
            ?? throw new NotFoundException($"User {currentUser.Id} was not found.");

        var log = new TaskTimeLog
        {
            TaskId = taskId,
            UserId = currentUser.Id,
            Hours = dto.Hours,
            Description = dto.Description,
            WorkDate = dto.WorkDate
        };

        await _unitOfWork.TaskTimeLogs.AddAsync(log);
        await _unitOfWork.SaveChangesAsync();

        log.User = user;
        return MapToDto(log);
    }

    private static TaskTimeLogResponseDto MapToDto(TaskTimeLog log) => new()
    {
        Id = log.Id,
        TaskId = log.TaskId,
        UserId = log.UserId,
        UserName = log.User != null ? $"{log.User.FirstName} {log.User.LastName}" : string.Empty,
        Hours = log.Hours,
        Description = log.Description,
        WorkDate = log.WorkDate,
        CreatedAt = log.CreatedAt
    };
}
