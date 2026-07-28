using ProjectManagementAPI.Entities;

namespace ProjectManagementAPI.Security;

public interface IJwtTokenService
{
    /// <param name="sessionId">
    /// Aktif oturumun kimliği. Token'a "sid" claim'i olarak yazılır ve her istekte
    /// veritabanındaki User.SessionId ile karşılaştırılır.
    /// </param>
    string GenerateToken(User user, string sessionId, out DateTime expiresAt);
}
