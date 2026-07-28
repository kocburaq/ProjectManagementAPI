using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ProjectManagementAPI.Data;

namespace ProjectManagementAPI.Security;

/// <summary>
/// Her doğrulanmış istekte token'daki "sid" claim'ini veritabanındaki User.SessionId ile
/// karşılaştırır. Kullanıcı başka bir cihazdan giriş yaptığında ya da çıkış yaptığında
/// eski token'lar bu kontrolde elenir (JWT stateless olduğu için tek yol budur).
/// </summary>
public class SessionValidator
{
    private readonly AppDbContext _db;
    private readonly JwtSettings _settings;

    public SessionValidator(AppDbContext db, IOptions<JwtSettings> settings)
    {
        _db = db;
        _settings = settings.Value;
    }

    /// <returns>Oturum geçerliyse true.</returns>
    public async Task<bool> ValidateAsync(int userId, string? sessionId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return false;
        }

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user == null || !user.IsActive)
        {
            return false;
        }

        // Oturum kapatılmış ya da başka bir girişle devralınmış
        if (!string.Equals(user.SessionId, sessionId, StringComparison.Ordinal))
        {
            return false;
        }

        // "Son görülme" damgasını çok sık yazmamak için eşik koyuyoruz.
        var now = DateTime.UtcNow;
        if (user.SessionLastSeenAt == null ||
            (now - user.SessionLastSeenAt.Value) > TimeSpan.FromSeconds(_settings.SessionTouchSeconds))
        {
            user.SessionLastSeenAt = now;
            await _db.SaveChangesAsync(ct);
        }

        return true;
    }
}
