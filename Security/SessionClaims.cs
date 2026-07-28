namespace ProjectManagementAPI.Security;

/// <summary>
/// Eşzamanlı oturum kontrolünde kullanılan sabitler.
/// </summary>
public static class SessionClaims
{
    /// <summary>JWT içindeki oturum kimliği claim'i.</summary>
    public const string SessionId = "sid";

    /// <summary>
    /// Oturum çakışması nedeniyle reddedilen isteklerde istemciye dönen kod.
    /// Frontend bunu görünce kullanıcıyı özel bir mesajla login ekranına düşürür.
    /// </summary>
    public const string SessionRevokedCode = "SESSION_REVOKED";

    /// <summary>Aktif oturum varken yeni giriş denendiğinde dönen kod.</summary>
    public const string SessionActiveCode = "SESSION_ALREADY_ACTIVE";
}
