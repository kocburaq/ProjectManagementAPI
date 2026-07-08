using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.Tasks;
using ProjectManagementAPI.Services;

namespace ProjectManagementAPI.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;

    public TasksController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<TaskResponseDto>>> GetAll([FromQuery] TaskQueryParameters query)
    {
        return Ok(await _taskService.GetAllAsync(query, this.GetCurrentUser()));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TaskResponseDto>> GetById(int id)
    {
        return Ok(await _taskService.GetByIdAsync(id, this.GetCurrentUser()));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<TaskResponseDto>> Create(CreateTaskDto dto)
    {
        var result = await _taskService.CreateAsync(dto, this.GetCurrentUser());
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<TaskResponseDto>> Update(int id, UpdateTaskDto dto)
    {
        return Ok(await _taskService.UpdateAsync(id, dto, this.GetCurrentUser()));
    }

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<TaskResponseDto>> ChangeStatus(int id, ChangeTaskStatusDto dto)
    {
        return Ok(await _taskService.ChangeStatusAsync(id, dto, this.GetCurrentUser()));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<IActionResult> Delete(int id)
    {
        await _taskService.DeleteAsync(id, this.GetCurrentUser());
        return NoContent();
    }
}
