using ProjectManagementAPI.Common;
using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Dtos.Tasks;

public class TaskQueryParameters : PaginationQuery
{
    public int? ProjectId { get; set; }
    public int? AssignedToUserId { get; set; }
    public ProjectTaskStatus? Status { get; set; }
    public ProjectTaskPriority? Priority { get; set; }
    public DateTime? DueBefore { get; set; }
    public DateTime? DueAfter { get; set; }
}
