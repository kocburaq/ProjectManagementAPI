using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagementAPI.Dtos.Auth;
using ProjectManagementAPI.Security;
using ProjectManagementAPI.Services;

namespace ProjectManagementAPI.Controllers;

[ApiController]
[Route("api/auth")]
// NOT: [AllowAnonymous] bilerek sınıf seviyesinde DEĞİL. Sınıfta olsaydı,
// action üzerindeki [Authorize] ezilir ve logout kimlik doğrulaması yapılmadan çalışırdı.
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Register(RegisterRequestDto dto)
    {
        var result = await _authService.RegisterAsync(dto);
        return Ok(result);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginRequestDto dto)
    {
        var result = await _authService.LoginAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Aktif oturumu kapatır. Eşzamanlı oturum kuralı gereği, bu çağrı yapılmadan
    /// aynı hesapla başka bir cihazdan giriş yapılamaz (boşta kalma süresi dolana kadar).
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var sessionId = User.FindFirst(SessionClaims.SessionId)?.Value;

        if (int.TryParse(userIdClaim, out var userId))
        {
            await _authService.LogoutAsync(userId, sessionId);
        }

        return NoContent();
    }
}
