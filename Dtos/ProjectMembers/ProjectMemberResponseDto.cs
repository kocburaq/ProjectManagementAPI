using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Dtos.ProjectMembers;

public class ProjectMemberResponseDto
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public ProjectMemberRole Role { get; set; }
    public DateTime JoinedAt { get; set; }
    public bool IsActive { get; set; }
}
