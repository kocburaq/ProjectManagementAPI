using System.Text.Json.Serialization;
using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Entities;

public class TaskHistory
{
    public int Id { get; set; }

    public int TaskId { get; set; }

    [JsonIgnore]
    public ProjectTask Task { get; set; } = null!;

    public int ChangedByUserId { get; set; }

    [JsonIgnore]
    public User ChangedByUser { get; set; } = null!;

    public TaskChangeType ChangeType { get; set; }

    public string? OldValue { get; set; }

    public string? NewValue { get; set; }

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
