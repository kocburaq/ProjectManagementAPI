using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Dtos.TaskHistories;

public class TaskHistoryResponseDto
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public int ChangedByUserId { get; set; }
    public string ChangedByUserName { get; set; } = string.Empty;
    public TaskChangeType ChangeType { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}
