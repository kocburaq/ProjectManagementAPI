using ProjectManagementAPI.Dtos.Auth;

namespace ProjectManagementAPI.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto);

    Task<AuthResponseDto> LoginAsync(LoginRequestDto dto);

    /// <summary>
    /// Kullanıcının aktif oturumunu serbest bırakır; böylece aynı hesapla
    /// başka bir cihazdan giriş yapılabilir.
    /// </summary>
    /// <param name="sessionId">Token'daki oturum kimliği. Eşleşmiyorsa işlem yapılmaz.</param>
    Task LogoutAsync(int userId, string? sessionId);
}
