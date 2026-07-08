using ProjectManagementAPI.Common;
using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Dtos.Projects;

public class ProjectQueryParameters : PaginationQuery
{
    public ProjectStatus? Status { get; set; }
    public int? OwnerId { get; set; }
}
