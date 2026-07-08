using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Dtos.Tasks;

public class ChangeTaskStatusDto
{
    public ProjectTaskStatus Status { get; set; }
}
