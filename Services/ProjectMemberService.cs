using Microsoft.EntityFrameworkCore;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.ProjectMembers;
using ProjectManagementAPI.Entities;
using ProjectManagementAPI.Enums;
using ProjectManagementAPI.Repositories;

namespace ProjectManagementAPI.Services;

public class ProjectMemberService : IProjectMemberService
{
    private readonly IUnitOfWork _unitOfWork;

    public ProjectMemberService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<PagedResult<ProjectMemberResponseDto>> GetMembersAsync(int projectId, PaginationQuery query, CurrentUser currentUser)
    {
        var project = await GetAccessibleProjectAsync(projectId, currentUser);

        var members = _unitOfWork.ProjectMembers.Query()
            .Include(m => m.User)
            .Where(m => m.ProjectId == project.Id)
            .OrderBy(m => m.JoinedAt);

        var totalCount = await members.CountAsync();
        var items = await members
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(m => MapToDto(m))
            .ToListAsync();

        return new PagedResult<ProjectMemberResponseDto>
        {
            Items = items,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<ProjectMemberResponseDto> AddMemberAsync(int projectId, AddProjectMemberDto dto, CurrentUser currentUser)
    {
        var project = await GetAccessibleProjectAsync(projectId, currentUser);
        EnsureCanManage(project, currentUser);

        var user = await _unitOfWork.Users.GetByIdAsync(dto.UserId)
            ?? throw new NotFoundException($"User {dto.UserId} was not found.");

        if (!user.IsActive)
        {
            throw new BusinessRuleException("Cannot add an inactive user to a project.");
        }

        var existing = await _unitOfWork.ProjectMembers.GetMembershipAsync(projectId, dto.UserId);
        if (existing != null)
        {
            if (existing.IsActive)
            {
                throw new ConflictException("This user is already a member of the project.");
            }

            existing.IsActive = true;
            existing.Role = dto.Role;
            existing.JoinedAt = DateTime.UtcNow;

            _unitOfWork.ProjectMembers.Update(existing);
            await _unitOfWork.SaveChangesAsync();

            existing.User = user;
            return MapToDto(existing);
        }

        var member = new ProjectMember
        {
            ProjectId = projectId,
            UserId = dto.UserId,
            Role = dto.Role
        };

        await _unitOfWork.ProjectMembers.AddAsync(member);
        await _unitOfWork.SaveChangesAsync();

        member.User = user;
        return MapToDto(member);
    }

    public async Task RemoveMemberAsync(int projectId, int memberId, CurrentUser currentUser)
    {
        var project = await GetAccessibleProjectAsync(projectId, currentUser);
        EnsureCanManage(project, currentUser);

        var member = await _unitOfWork.ProjectMembers.Query()
            .FirstOrDefaultAsync(m => m.Id == memberId && m.ProjectId == projectId)
            ?? throw new NotFoundException($"Project member {memberId} was not found.");

        member.IsActive = false;

        _unitOfWork.ProjectMembers.Update(member);
        await _unitOfWork.SaveChangesAsync();
    }

    private async Task<Project> GetAccessibleProjectAsync(int projectId, CurrentUser currentUser)
    {
        var project = await _unitOfWork.Projects.Query()
            .Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new NotFoundException($"Project {projectId} was not found.");

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
            throw new ForbiddenException("Only the project owner or an Admin can manage project membership.");
        }
    }

    private static ProjectMemberResponseDto MapToDto(ProjectMember member) => new()
    {
        Id = member.Id,
        ProjectId = member.ProjectId,
        UserId = member.UserId,
        UserName = member.User != null ? $"{member.User.FirstName} {member.User.LastName}" : string.Empty,
        UserEmail = member.User?.Email ?? string.Empty,
        Role = member.Role,
        JoinedAt = member.JoinedAt,
        IsActive = member.IsActive
    };
}
