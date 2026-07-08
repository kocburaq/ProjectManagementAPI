using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.Comments;
using ProjectManagementAPI.Services;

namespace ProjectManagementAPI.Controllers;

[ApiController]
[Authorize]
public class CommentsController : ControllerBase
{
    private readonly ICommentService _commentService;

    public CommentsController(ICommentService commentService)
    {
        _commentService = commentService;
    }

    [HttpGet("api/tasks/{taskId:int}/comments")]
    public async Task<ActionResult<PagedResult<CommentResponseDto>>> GetByTask(int taskId, [FromQuery] PaginationQuery query)
    {
        return Ok(await _commentService.GetByTaskAsync(taskId, query, this.GetCurrentUser()));
    }

    [HttpPost("api/tasks/{taskId:int}/comments")]
    public async Task<ActionResult<CommentResponseDto>> Create(int taskId, CreateCommentDto dto)
    {
        var result = await _commentService.CreateAsync(taskId, dto, this.GetCurrentUser());
        return CreatedAtAction(nameof(GetByTask), new { taskId }, result);
    }

    [HttpPut("api/comments/{commentId:int}")]
    public async Task<ActionResult<CommentResponseDto>> Update(int commentId, UpdateCommentDto dto)
    {
        return Ok(await _commentService.UpdateAsync(commentId, dto, this.GetCurrentUser()));
    }

    [HttpDelete("api/comments/{commentId:int}")]
    public async Task<IActionResult> Delete(int commentId)
    {
        await _commentService.DeleteAsync(commentId, this.GetCurrentUser());
        return NoContent();
    }
}
