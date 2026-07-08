using Microsoft.EntityFrameworkCore;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.Projects;
using ProjectManagementAPI.Entities;
using ProjectManagementAPI.Enums;
using ProjectManagementAPI.Repositories;

namespace ProjectManagementAPI.Services;

public class ProjectService : IProjectService
{
    private readonly IUnitOfWork _unitOfWork;

    public ProjectService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<PagedResult<ProjectResponseDto>> GetAllAsync(ProjectQueryParameters query, CurrentUser currentUser)
    {
        var projects = _unitOfWork.Projects.Query()
            .Include(p => p.Owner)
            .Include(p => p.Members)
            .AsQueryable();

        if (currentUser.Role != UserRole.Admin)
        {
            projects = projects.Where(p => p.OwnerId == currentUser.Id
                || p.Members.Any(m => m.UserId == currentUser.Id && m.IsActive));
        }

        if (query.Status.HasValue)
        {
            projects = projects.Where(p => p.Status == query.Status.Value);
        }

        if (query.OwnerId.HasValue)
        {
            projects = projects.Where(p => p.OwnerId == query.OwnerId.Value);
        }

        projects = ApplySort(projects, query.SortBy, query.SortDirection);

        var totalCount = await projects.CountAsync();
        var items = await projects
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(p => MapToDto(p))
            .ToListAsync();

        return new PagedResult<ProjectResponseDto>
        {
            Items = items,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<ProjectResponseDto> GetByIdAsync(int id, CurrentUser currentUser)
    {
        var project = await GetAccessibleProjectAsync(id, currentUser);
        return MapToDto(project);
    }

    public async Task<ProjectResponseDto> CreateAsync(CreateProjectDto dto, CurrentUser currentUser)
    {
        if (dto.EndDate.HasValue && dto.EndDate.Value < dto.StartDate)
        {
            throw new BusinessRuleException("EndDate cannot be earlier than StartDate.");
        }

        var ownerId = dto.OwnerId ?? currentUser.Id;

        if (currentUser.Role != UserRole.Admin && ownerId != currentUser.Id)
        {
            throw new ForbiddenException("You can only create a project owned by yourself.");
        }

        var owner = await _unitOfWork.Users.GetByIdAsync(ownerId)
            ?? throw new NotFoundException($"User {ownerId} was not found.");

        if (owner.Role != UserRole.Admin && owner.Role != UserRole.ProjectManager)
        {
            throw new BusinessRuleException("Project owner must be an Admin or ProjectManager.");
        }

        var project = new Project
        {
            Name = dto.Name,
            Description = dto.Description,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            OwnerId = ownerId,
            Status = ProjectStatus.Planning
        };

        await _unitOfWork.Projects.AddAsync(project);
        await _unitOfWork.SaveChangesAsync();

        project.Owner = owner;
        return MapToDto(project);
    }

    public async Task<ProjectResponseDto> UpdateAsync(int id, UpdateProjectDto dto, CurrentUser currentUser)
    {
        var project = await GetAccessibleProjectAsync(id, currentUser);
        EnsureCanManage(project, currentUser);

        if (dto.EndDate.HasValue && dto.EndDate.Value < dto.StartDate)
        {
            throw new BusinessRuleException("EndDate cannot be earlier than StartDate.");
        }

        project.Name = dto.Name;
        project.Description = dto.Description;
        project.StartDate = dto.StartDate;
        project.EndDate = dto.EndDate;
        project.Status = dto.Status;
        project.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Projects.Update(project);
        await _unitOfWork.SaveChangesAsync();

        return MapToDto(project);
    }

    public async Task ArchiveAsync(int id, CurrentUser currentUser)
    {
        var project = await GetAccessibleProjectAsync(id, currentUser);
        EnsureCanManage(project, currentUser);

        project.IsArchived = true;
        project.ArchivedAt = DateTime.UtcNow;
        project.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Projects.Update(project);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id, CurrentUser currentUser)
    {
        var project = await GetAccessibleProjectAsync(id, currentUser);
        EnsureCanManage(project, currentUser);

        project.IsDeleted = true;
        project.UpdatedAt = DateTime.UtcNow;

        var tasks = await _unitOfWork.Tasks.Query().Where(t => t.ProjectId == id).ToListAsync();
        foreach (var task in tasks)
        {
            task.IsDeleted = true;
        }

        _unitOfWork.Projects.Update(project);
        await _unitOfWork.SaveChangesAsync();
    }

    private async Task<Project> GetAccessibleProjectAsync(int id, CurrentUser currentUser)
    {
        var project = await _unitOfWork.Projects.Query()
            .Include(p => p.Owner)
            .Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new NotFoundException($"Project {id} was not found.");

        var hasAccess = currentUser.Role == UserRole.Admin
            || project.OwnerId == currentUser.Id
            || project.Members.Any(m => m.UserId == currentUser.Id && m.IsActive);

        if (!hasAccess)
        {
            throw new ForbiddenException("You do not have access to this project.");
        }

        return project;
    }

    private static void EnsureCanManage(Project project, CurrentUser currentUser)
    {
        if (currentUser.Role != UserRole.Admin && project.OwnerId != currentUser.Id)
        {
            throw new ForbiddenException("Only the project owner or an Admin can manage this project.");
        }
    }

    private static IQueryable<Project> ApplySort(IQueryable<Project> query, string? sortBy, string? sortDirection)
    {
        var descending = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);

        return sortBy?.ToLower() switch
        {
            "name" => descending ? query.OrderByDescending(p => p.Name) : query.OrderBy(p => p.Name),
            "startdate" => descending ? query.OrderByDescending(p => p.StartDate) : query.OrderBy(p => p.StartDate),
            "status" => descending ? query.OrderByDescending(p => p.Status) : query.OrderBy(p => p.Status),
            _ => descending ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt)
        };
    }

    private static ProjectResponseDto MapToDto(Project project) => new()
    {
        Id = project.Id,
        Name = project.Name,
        Description = project.Description,
        StartDate = project.StartDate,
        EndDate = project.EndDate,
        Status = project.Status,
        OwnerId = project.OwnerId,
        OwnerName = project.Owner != null ? $"{project.Owner.FirstName} {project.Owner.LastName}" : string.Empty,
        IsArchived = project.IsArchived,
        ArchivedAt = project.ArchivedAt,
        CreatedAt = project.CreatedAt,
        UpdatedAt = project.UpdatedAt
    };
}
