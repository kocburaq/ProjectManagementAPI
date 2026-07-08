using ProjectManagementAPI.Common;

namespace ProjectManagementAPI.Dtos.TaskTimeLogs;

public class TaskTimeLogQueryParameters : PaginationQuery
{
    public int? TaskId { get; set; }
    public int? UserId { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
}
