using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.Projects;
using ProjectManagementAPI.Services;

namespace ProjectManagementAPI.Controllers;

[ApiController]
[Route("api/projects")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;

    public ProjectsController(IProjectService projectService)
    {
        _projectService = projectService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<ProjectResponseDto>>> GetAll([FromQuery] ProjectQueryParameters query)
    {
        return Ok(await _projectService.GetAllAsync(query, this.GetCurrentUser()));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProjectResponseDto>> GetById(int id)
    {
        return Ok(await _projectService.GetByIdAsync(id, this.GetCurrentUser()));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<ProjectResponseDto>> Create(CreateProjectDto dto)
    {
        var result = await _projectService.CreateAsync(dto, this.GetCurrentUser());
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<ProjectResponseDto>> Update(int id, UpdateProjectDto dto)
    {
        return Ok(await _projectService.UpdateAsync(id, dto, this.GetCurrentUser()));
    }

    [HttpPatch("{id:int}/archive")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<IActionResult> Archive(int id)
    {
        await _projectService.ArchiveAsync(id, this.GetCurrentUser());
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<IActionResult> Delete(int id)
    {
        await _projectService.DeleteAsync(id, this.GetCurrentUser());
        return NoContent();
    }
}
