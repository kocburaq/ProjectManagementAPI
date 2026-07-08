using ProjectManagementAPI.Entities;

namespace ProjectManagementAPI.Security;

public interface IJwtTokenService
{
    string GenerateToken(User user, out DateTime expiresAt);
}
