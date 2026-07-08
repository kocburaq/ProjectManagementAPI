using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Dtos.ProjectMembers;

public class AddProjectMemberDto
{
    public int UserId { get; set; }
    public ProjectMemberRole Role { get; set; } = ProjectMemberRole.Member;
}
