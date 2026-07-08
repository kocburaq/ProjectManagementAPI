using System.Text.Json.Serialization;
using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Entities;

public class ProjectTask
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int ProjectId { get; set; }

    [JsonIgnore]
    public Project Project { get; set; } = null!;

    public int? AssignedToUserId { get; set; }

    [JsonIgnore]
    public User? AssignedToUser { get; set; }

    public int CreatedByUserId { get; set; }

    [JsonIgnore]
    public User CreatedByUser { get; set; } = null!;

    public ProjectTaskStatus Status { get; set; } = ProjectTaskStatus.Todo;

    public ProjectTaskPriority Priority { get; set; } = ProjectTaskPriority.Medium;

    public DateTime? DueDate { get; set; }

    public decimal? EstimatedHours { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public bool IsDeleted { get; set; } = false;

    [JsonIgnore]
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();

    [JsonIgnore]
    public ICollection<TaskTimeLog> TimeLogs { get; set; } = new List<TaskTimeLog>();

    [JsonIgnore]
    public ICollection<TaskHistory> Histories { get; set; } = new List<TaskHistory>();
}
