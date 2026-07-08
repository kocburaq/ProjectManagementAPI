using System.Text.Json.Serialization;
using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Entities;

public class Project
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime StartDate { get; set; } = DateTime.UtcNow;

    public DateTime? EndDate { get; set; }

    public ProjectStatus Status { get; set; } = ProjectStatus.Planning;

    public int OwnerId { get; set; }

    [JsonIgnore]
    public User Owner { get; set; } = null!;

    public bool IsArchived { get; set; } = false;

    public DateTime? ArchivedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public bool IsDeleted { get; set; } = false;

    [JsonIgnore]
    public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();

    [JsonIgnore]
    public ICollection<ProjectTask> Tasks { get; set; } = new List<ProjectTask>();
}
