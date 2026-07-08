using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.TaskHistories;
using ProjectManagementAPI.Services;

namespace ProjectManagementAPI.Controllers;

[ApiController]
[Authorize]
public class TaskHistoriesController : ControllerBase
{
    private readonly ITaskHistoryService _taskHistoryService;

    public TaskHistoriesController(ITaskHistoryService taskHistoryService)
    {
        _taskHistoryService = taskHistoryService;
    }

    [HttpGet("api/tasks/{taskId:int}/histories")]
    public async Task<ActionResult<PagedResult<TaskHistoryResponseDto>>> GetByTask(int taskId, [FromQuery] PaginationQuery query)
    {
        return Ok(await _taskHistoryService.GetByTaskAsync(taskId, query, this.GetCurrentUser()));
    }
}
