using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.ProjectMembers;
using ProjectManagementAPI.Services;

namespace ProjectManagementAPI.Controllers;

[ApiController]
[Route("api/projects/{projectId:int}/members")]
[Authorize]
public class ProjectMembersController : ControllerBase
{
    private readonly IProjectMemberService _projectMemberService;

    public ProjectMembersController(IProjectMemberService projectMemberService)
    {
        _projectMemberService = projectMemberService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<ProjectMemberResponseDto>>> GetMembers(int projectId, [FromQuery] PaginationQuery query)
    {
        return Ok(await _projectMemberService.GetMembersAsync(projectId, query, this.GetCurrentUser()));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<ProjectMemberResponseDto>> AddMember(int projectId, AddProjectMemberDto dto)
    {
        var result = await _projectMemberService.AddMemberAsync(projectId, dto, this.GetCurrentUser());
        return CreatedAtAction(nameof(GetMembers), new { projectId }, result);
    }

    [HttpDelete("{memberId:int}")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<IActionResult> RemoveMember(int projectId, int memberId)
    {
        await _projectMemberService.RemoveMemberAsync(projectId, memberId, this.GetCurrentUser());
        return NoContent();
    }
}
