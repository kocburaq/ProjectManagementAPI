using System.Text.Json.Serialization;
using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Entities;

public class User
{
    public int Id { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.TeamMember;

    public string? Department { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; } = false;

    // ---- Eşzamanlı oturum kontrolü ----
    // Aktif oturumun kimliği. Token'daki "sid" claim'i ile eşleşmeyen istekler reddedilir.
    // null ise kullanıcının açık oturumu yoktur.
    [JsonIgnore]
    public string? SessionId { get; set; }

    [JsonIgnore]
    public DateTime? SessionStartedAt { get; set; }

    // Her doğrulanmış istekte (kısıtlı sıklıkta) güncellenir; boşta kalan oturumu tespit etmek için.
    [JsonIgnore]
    public DateTime? SessionLastSeenAt { get; set; }

    [JsonIgnore]
    public ICollection<Project> OwnedProjects { get; set; } = new List<Project>();

    [JsonIgnore]
    public ICollection<ProjectMember> ProjectMemberships { get; set; } = new List<ProjectMember>();

    [JsonIgnore]
    public ICollection<ProjectTask> AssignedTasks { get; set; } = new List<ProjectTask>();

    [JsonIgnore]
    public ICollection<ProjectTask> CreatedTasks { get; set; } = new List<ProjectTask>();

    [JsonIgnore]
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();

    [JsonIgnore]
    public ICollection<TaskTimeLog> TimeLogs { get; set; } = new List<TaskTimeLog>();

    [JsonIgnore]
    public ICollection<TaskHistory> TaskHistories { get; set; } = new List<TaskHistory>();
}
