namespace ProjectManagementAPI.Dtos.Projects;

public class CreateProjectDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? OwnerId { get; set; }
}
