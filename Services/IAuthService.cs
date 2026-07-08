using ProjectManagementAPI.Dtos.Auth;

namespace ProjectManagementAPI.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto);
    Task<AuthResponseDto> LoginAsync(LoginRequestDto dto);
}
