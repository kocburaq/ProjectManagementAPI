using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Dtos.Tasks;

public class CreateTaskDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int ProjectId { get; set; }
    public int? AssignedToUserId { get; set; }
    public ProjectTaskPriority Priority { get; set; } = ProjectTaskPriority.Medium;
    public DateTime? DueDate { get; set; }
    public decimal? EstimatedHours { get; set; }
}
