using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.Auth;
using ProjectManagementAPI.Dtos.Users;
using ProjectManagementAPI.Entities;
using ProjectManagementAPI.Enums;
using ProjectManagementAPI.Repositories;
using ProjectManagementAPI.Security;

namespace ProjectManagementAPI.Services;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly JwtSettings _jwtSettings;

    public AuthService(
        IUnitOfWork unitOfWork,
        IPasswordHasher<User> passwordHasher,
        IJwtTokenService jwtTokenService,
        IOptions<JwtSettings> jwtSettings)
    {
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _jwtSettings = jwtSettings.Value;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto)
    {
        var existing = await _unitOfWork.Users.GetByEmailAsync(dto.Email);
        if (existing != null)
        {
            throw new ConflictException("A user with this email already exists.");
        }

        var user = new User
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Department = dto.Department,
            Role = UserRole.TeamMember,
            IsActive = true
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);

        await _unitOfWork.Users.AddAsync(user);
        await _unitOfWork.SaveChangesAsync();

        // Yeni hesabın başka bir oturumu olamaz; doğrudan oturum aç.
        return await IssueSessionAsync(user);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto dto)
    {
        var user = await _unitOfWork.Users.GetByEmailAsync(dto.Email);
        if (user == null)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("This account has been deactivated.");
        }

        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        // ---- Eşzamanlı oturum kontrolü ----
        // Bu hesabın hâlâ canlı bir oturumu varsa yeni girişi reddet.
        if (HasLiveSession(user))
        {
            var idleFor = DateTime.UtcNow - (user.SessionLastSeenAt ?? user.SessionStartedAt ?? DateTime.UtcNow);
            var freeInMinutes = Math.Max(1, _jwtSettings.SessionIdleMinutes - (int)idleFor.TotalMinutes);

            throw new ConflictException(
                $"Bu hesap şu anda başka bir cihazda/tarayıcıda açık. Aynı anda tek oturum açılabilir. " +
                $"Diğer oturumdan çıkış yapın ya da yaklaşık {freeInMinutes} dakika bekleyin.")
            {
                Code = SessionClaims.SessionActiveCode
            };
        }

        return await IssueSessionAsync(user);
    }

    public async Task LogoutAsync(int userId, string? sessionId)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null)
        {
            return;
        }

        // Sadece kendi oturumunu kapatabilsin: token'daki sid ile eşleşmiyorsa dokunma.
        // (Aksi halde devralınmış eski bir token yeni oturumu düşürebilirdi.)
        if (sessionId != null && !string.Equals(user.SessionId, sessionId, StringComparison.Ordinal))
        {
            return;
        }

        user.SessionId = null;
        user.SessionStartedAt = null;
        user.SessionLastSeenAt = null;
        await _unitOfWork.SaveChangesAsync();
    }

    /// <summary>
    /// Kullanıcının hâlâ geçerli sayılan bir oturumu var mı?
    /// Boşta kalma süresi aşılmışsa oturum terk edilmiş kabul edilir; böylece tarayıcı
    /// çıkış yapılmadan kapatıldığında hesap süresiz kilitlenmez.
    /// </summary>
    private bool HasLiveSession(User user)
    {
        if (string.IsNullOrEmpty(user.SessionId))
        {
            return false;
        }

        var lastSeen = user.SessionLastSeenAt ?? user.SessionStartedAt;
        if (lastSeen == null)
        {
            return false;
        }

        // Token'ın kendi ömrü dolduysa oturum zaten ölüdür.
        var tokenDeadline = (user.SessionStartedAt ?? lastSeen.Value).AddMinutes(_jwtSettings.AccessTokenMinutes);
        if (DateTime.UtcNow >= tokenDeadline)
        {
            return false;
        }

        return (DateTime.UtcNow - lastSeen.Value) < TimeSpan.FromMinutes(_jwtSettings.SessionIdleMinutes);
    }

    /// <summary>Yeni bir oturum kimliği üretir, kullanıcıya yazar ve token döner.</summary>
    private async Task<AuthResponseDto> IssueSessionAsync(User user)
    {
        var sessionId = Guid.NewGuid().ToString("N");
        var now = DateTime.UtcNow;

        user.SessionId = sessionId;
        user.SessionStartedAt = now;
        user.SessionLastSeenAt = now;
        await _unitOfWork.SaveChangesAsync();

        return BuildAuthResponse(user, sessionId);
    }

    private AuthResponseDto BuildAuthResponse(User user, string sessionId)
    {
        var token = _jwtTokenService.GenerateToken(user, sessionId, out var expiresAt);

        return new AuthResponseDto
        {
            AccessToken = token,
            ExpiresAt = expiresAt,
            User = new UserResponseDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                Role = user.Role,
                Department = user.Department,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt
            }
        };
    }
}
