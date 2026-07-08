using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.TaskTimeLogs;
using ProjectManagementAPI.Services;

namespace ProjectManagementAPI.Controllers;

[ApiController]
[Authorize]
public class TaskTimeLogsController : ControllerBase
{
    private readonly ITaskTimeLogService _taskTimeLogService;

    public TaskTimeLogsController(ITaskTimeLogService taskTimeLogService)
    {
        _taskTimeLogService = taskTimeLogService;
    }

    [HttpGet("api/time-logs")]
    public async Task<ActionResult<PagedResult<TaskTimeLogResponseDto>>> GetAll([FromQuery] TaskTimeLogQueryParameters query)
    {
        return Ok(await _taskTimeLogService.GetAllAsync(query, this.GetCurrentUser()));
    }

    [HttpPost("api/tasks/{taskId:int}/time-logs")]
    public async Task<ActionResult<TaskTimeLogResponseDto>> Create(int taskId, CreateTaskTimeLogDto dto)
    {
        var result = await _taskTimeLogService.CreateAsync(taskId, dto, this.GetCurrentUser());
        return CreatedAtAction(nameof(GetAll), new { taskId }, result);
    }
}
