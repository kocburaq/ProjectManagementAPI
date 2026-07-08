using System.Text.Json.Serialization;

namespace ProjectManagementAPI.Entities;

public class TaskTimeLog
{
    public int Id { get; set; }

    public int TaskId { get; set; }

    [JsonIgnore]
    public ProjectTask Task { get; set; } = null!;

    public int UserId { get; set; }

    [JsonIgnore]
    public User User { get; set; } = null!;

    public decimal Hours { get; set; }

    public string? Description { get; set; }

    public DateTime WorkDate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
