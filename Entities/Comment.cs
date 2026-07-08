using System.Text.Json.Serialization;

namespace ProjectManagementAPI.Entities;

public class Comment
{
    public int Id { get; set; }

    public string Content { get; set; } = string.Empty;

    public int TaskId { get; set; }

    [JsonIgnore]
    public ProjectTask Task { get; set; } = null!;

    public int UserId { get; set; }

    [JsonIgnore]
    public User User { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public bool IsDeleted { get; set; } = false;
}
