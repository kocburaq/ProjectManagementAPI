using ProjectManagementAPI.Dtos.Users;

namespace ProjectManagementAPI.Dtos.Auth;

public class AuthResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserResponseDto User { get; set; } = null!;
}
