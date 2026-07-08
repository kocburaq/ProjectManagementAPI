using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.Users;
using ProjectManagementAPI.Services;

namespace ProjectManagementAPI.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PagedResult<UserResponseDto>>> GetAll([FromQuery] PaginationQuery query)
    {
        return Ok(await _userService.GetAllAsync(query));
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<UserResponseDto>> GetById(int id)
    {
        return Ok(await _userService.GetByIdAsync(id));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<UserResponseDto>> Update(int id, UpdateUserDto dto)
    {
        return Ok(await _userService.UpdateAsync(id, dto));
    }
}
