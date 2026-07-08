using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Dtos.Projects;

public class UpdateProjectDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public ProjectStatus Status { get; set; }
}
