using System.Text.Json.Serialization;
using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Entities;

public class ProjectMember
{
    public int Id { get; set; }

    public int ProjectId { get; set; }

    [JsonIgnore]
    public Project Project { get; set; } = null!;

    public int UserId { get; set; }

    [JsonIgnore]
    public User User { get; set; } = null!;

    public ProjectMemberRole Role { get; set; } = ProjectMemberRole.Member;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public bool IsActive { get; set; } = true;
}
