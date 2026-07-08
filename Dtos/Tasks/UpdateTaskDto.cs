using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Dtos.Tasks;

public class UpdateTaskDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? AssignedToUserId { get; set; }
    public ProjectTaskPriority Priority { get; set; }
    public DateTime? DueDate { get; set; }
    public decimal? EstimatedHours { get; set; }
}
