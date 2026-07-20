using Microsoft.EntityFrameworkCore;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.Tasks;
using ProjectManagementAPI.Entities;
using ProjectManagementAPI.Enums;
using ProjectManagementAPI.Repositories;
using ProjectTaskEntity = ProjectManagementAPI.Entities.ProjectTask;

namespace ProjectManagementAPI.Services;

public class TaskService : ITaskService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITaskHistoryService _taskHistoryService;

    public TaskService(IUnitOfWork unitOfWork, ITaskHistoryService taskHistoryService)
    {
        _unitOfWork = unitOfWork;
        _taskHistoryService = taskHistoryService;
    }

    public async Task<PagedResult<TaskResponseDto>> GetAllAsync(TaskQueryParameters query, CurrentUser currentUser)
    {
        var tasks = _unitOfWork.Tasks.Query()
            .Include(t => t.Project)
            .ThenInclude(p => p.Members)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .Include(t => t.TimeLogs)
            .AsQueryable();

        if (currentUser.Role != UserRole.Admin)
        {
            tasks = tasks.Where(t => t.Project.OwnerId == currentUser.Id
                || t.Project.Members.Any(m => m.UserId == currentUser.Id && m.IsActive));
        }

        if (query.ProjectId.HasValue)
        {
            tasks = tasks.Where(t => t.ProjectId == query.ProjectId.Value);
        }

        if (query.AssignedToUserId.HasValue)
        {
            tasks = tasks.Where(t => t.AssignedToUserId == query.AssignedToUserId.Value);
        }

        if (query.Status.HasValue)
        {
            tasks = tasks.Where(t => t.Status == query.Status.Value);
        }

        if (query.Priority.HasValue)
        {
            tasks = tasks.Where(t => t.Priority == query.Priority.Value);
        }

        if (query.DueBefore.HasValue)
        {
            tasks = tasks.Where(t => t.DueDate != null && t.DueDate <= query.DueBefore.Value);
        }

        if (query.DueAfter.HasValue)
        {
            tasks = tasks.Where(t => t.DueDate != null && t.DueDate >= query.DueAfter.Value);
        }

        tasks = ApplySort(tasks, query.SortBy, query.SortDirection);

        var totalCount = await tasks.CountAsync();
        var items = await tasks
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        return new PagedResult<TaskResponseDto>
        {
            Items = items.Select(MapToDto).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<TaskResponseDto> GetByIdAsync(int id, CurrentUser currentUser)
    {
        var task = await GetAccessibleTaskAsync(id, currentUser);
        return MapToDto(task);
    }

    public async Task<TaskResponseDto> CreateAsync(CreateTaskDto dto, CurrentUser currentUser)
    {
        var project = await _unitOfWork.Projects.Query()
            .Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.Id == dto.ProjectId)
            ?? throw new NotFoundException($"Project {dto.ProjectId} was not found.");

        EnsureCanManageProject(project, currentUser);

        if (dto.DueDate.HasValue && dto.DueDate.Value < project.StartDate)
        {
            throw new BusinessRuleException("DueDate cannot be earlier than the project's start date.");
        }

        if (dto.EstimatedHours.HasValue && dto.EstimatedHours.Value < 0)
        {
            throw new BusinessRuleException("EstimatedHours cannot be negative.");
        }

        if (dto.AssignedToUserId.HasValue)
        {
            await EnsureActiveMemberAsync(project, dto.AssignedToUserId.Value);
        }

        var task = new ProjectTaskEntity
        {
            Title = dto.Title,
            Description = dto.Description,
            ProjectId = dto.ProjectId,
            AssignedToUserId = dto.AssignedToUserId,
            CreatedByUserId = currentUser.Id,
            Priority = dto.Priority,
            Status = ProjectTaskStatus.Todo,
            DueDate = dto.DueDate,
            EstimatedHours = dto.EstimatedHours
        };

        await _unitOfWork.Tasks.AddAsync(task);
        await _unitOfWork.SaveChangesAsync();

        return await GetByIdAsync(task.Id, currentUser);
    }

    public async Task<TaskResponseDto> UpdateAsync(int id, UpdateTaskDto dto, CurrentUser currentUser)
    {
        var task = await _unitOfWork.Tasks.Query()
            .Include(t => t.Project)
            .ThenInclude(p => p.Members)
            .FirstOrDefaultAsync(t => t.Id == id)
            ?? throw new NotFoundException($"Task {id} was not found.");

        EnsureCanManageProject(task.Project, currentUser);

        if (dto.DueDate.HasValue && dto.DueDate.Value < task.Project.StartDate)
        {
            throw new BusinessRuleException("DueDate cannot be earlier than the project's start date.");
        }

        if (dto.EstimatedHours.HasValue && dto.EstimatedHours.Value < 0)
        {
            throw new BusinessRuleException("EstimatedHours cannot be negative.");
        }

        if (dto.AssignedToUserId.HasValue)
        {
            await EnsureActiveMemberAsync(task.Project, dto.AssignedToUserId.Value);
        }

        if (dto.AssignedToUserId != task.AssignedToUserId)
        {
            await _taskHistoryService.LogAsync(task.Id, currentUser.Id, TaskChangeType.AssignedUserChanged,
                task.AssignedToUserId?.ToString(), dto.AssignedToUserId?.ToString());
        }

        if (dto.Priority != task.Priority)
        {
            await _taskHistoryService.LogAsync(task.Id, currentUser.Id, TaskChangeType.PriorityChanged,
                task.Priority.ToString(), dto.Priority.ToString());
        }

        task.Title = dto.Title;
        task.Description = dto.Description;
        task.AssignedToUserId = dto.AssignedToUserId;
        task.Priority = dto.Priority;
        task.DueDate = dto.DueDate;
        task.EstimatedHours = dto.EstimatedHours;
        task.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Tasks.Update(task);
        await _unitOfWork.SaveChangesAsync();

        return await GetByIdAsync(task.Id, currentUser);
    }

    public async Task<TaskResponseDto> ChangeStatusAsync(int id, ChangeTaskStatusDto dto, CurrentUser currentUser)
    {
        var task = await _unitOfWork.Tasks.Query()
            .Include(t => t.Project)
            .ThenInclude(p => p.Members)
            .FirstOrDefaultAsync(t => t.Id == id)
            ?? throw new NotFoundException($"Task {id} was not found.");

        var isPrivileged = currentUser.Role == UserRole.Admin || task.Project.OwnerId == currentUser.Id;
        var isAssignee = task.AssignedToUserId == currentUser.Id;

        if (!isPrivileged && !isAssignee)
        {
            throw new ForbiddenException("Only the project owner, an Admin, or the assignee can change this task's status.");
        }

        if (!isPrivileged && isAssignee)
        {
            var membership = task.Project.Members.FirstOrDefault(m => m.UserId == currentUser.Id && m.IsActive);
            if (membership?.Role == ProjectMemberRole.Viewer)
            {
                throw new ForbiddenException("Viewers are not allowed to update task status.");
            }
        }

        if (dto.Status == task.Status)
        {
            throw new BusinessRuleException("The task is already in this status.");
        }

        var oldStatus = task.Status;
        task.Status = dto.Status;
        task.UpdatedAt = DateTime.UtcNow;

        if (dto.Status == ProjectTaskStatus.Done)
        {
            task.CompletedAt = DateTime.UtcNow;
        }
        else if (oldStatus == ProjectTaskStatus.Done)
        {
            task.CompletedAt = null;
        }

        await _taskHistoryService.LogAsync(task.Id, currentUser.Id, TaskChangeType.StatusChanged,
            oldStatus.ToString(), dto.Status.ToString());

        _unitOfWork.Tasks.Update(task);
        await _unitOfWork.SaveChangesAsync();

        return await GetByIdAsync(task.Id, currentUser);
    }

    public async Task DeleteAsync(int id, CurrentUser currentUser)
    {
        var task = await _unitOfWork.Tasks.Query()
            .Include(t => t.Project)
            .FirstOrDefaultAsync(t => t.Id == id)
            ?? throw new NotFoundException($"Task {id} was not found.");

        EnsureCanManageProject(task.Project, currentUser);

        task.IsDeleted = true;
        task.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Tasks.Update(task);
        await _unitOfWork.SaveChangesAsync();
    }

    private async Task<ProjectTaskEntity> GetAccessibleTaskAsync(int id, CurrentUser currentUser)
    {
        var task = await _unitOfWork.Tasks.Query()
            .Include(t => t.Project)
            .ThenInclude(p => p.Members)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .Include(t => t.TimeLogs)
            .FirstOrDefaultAsync(t => t.Id == id)
            ?? throw new NotFoundException($"Task {id} was not found.");

        var hasAccess = currentUser.Role == UserRole.Admin
            || task.Project.OwnerId == currentUser.Id
            || task.Project.Members.Any(m => m.UserId == currentUser.Id && m.IsActive)
            || task.AssignedToUserId == currentUser.Id;

        if (!hasAccess)
        {
            throw new ForbiddenException("You do not have access to this task.");
        }

        return task;
    }

    private static void EnsureCanManageProject(Project project, CurrentUser currentUser)
    {
        if (currentUser.Role != UserRole.Admin && project.OwnerId != currentUser.Id)
        {
            throw new ForbiddenException("Only the project owner or an Admin can manage tasks in this project.");
        }
    }

    private async Task EnsureActiveMemberAsync(Project project, int userId)
    {
        if (userId == project.OwnerId)
        {
            return;
        }

        var isMember = project.Members.Any(m => m.UserId == userId && m.IsActive);
        if (!isMember)
        {
            throw new BusinessRuleException("The assigned user must be an active member of the project.");
        }
    }

    private static IQueryable<ProjectTaskEntity> ApplySort(IQueryable<ProjectTaskEntity> query, string? sortBy, string? sortDirection)
    {
        var descending = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);

        return sortBy?.ToLower() switch
        {
            "duedate" => descending ? query.OrderByDescending(t => t.DueDate) : query.OrderBy(t => t.DueDate),
            "priority" => descending ? query.OrderByDescending(t => t.Priority) : query.OrderBy(t => t.Priority),
            "status" => descending ? query.OrderByDescending(t => t.Status) : query.OrderBy(t => t.Status),
            "title" => descending ? query.OrderByDescending(t => t.Title) : query.OrderBy(t => t.Title),
            _ => descending ? query.OrderByDescending(t => t.CreatedAt) : query.OrderBy(t => t.CreatedAt)
        };
    }

    private static TaskResponseDto MapToDto(ProjectTaskEntity task) => new()
    {
        Id = task.Id,
        Title = task.Title,
        Description = task.Description,
        ProjectId = task.ProjectId,
        AssignedToUserId = task.AssignedToUserId,
        AssignedToUserName = task.AssignedToUser != null ? $"{task.AssignedToUser.FirstName} {task.AssignedToUser.LastName}" : null,
        CreatedByUserId = task.CreatedByUserId,
        CreatedByUserName = task.CreatedByUser != null ? $"{task.CreatedByUser.FirstName} {task.CreatedByUser.LastName}" : string.Empty,
        Status = task.Status,
        Priority = task.Priority,
        DueDate = task.DueDate,
        EstimatedHours = task.EstimatedHours,
        ActualHours = task.TimeLogs?.Sum(l => l.Hours) ?? 0,
        CreatedAt = task.CreatedAt,
        UpdatedAt = task.UpdatedAt,
        CompletedAt = task.CompletedAt
    };
}
