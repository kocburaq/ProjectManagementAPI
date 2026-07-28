namespace ProjectManagementAPI.Security;

public class JwtSettings
{
    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 60;

    /// <summary>
    /// Bir oturum bu kadar dakika boyunca hiç istek yapmazsa "terk edilmiş" sayılır ve
    /// aynı kullanıcının yeni girişine izin verilir. Tarayıcı çıkış yapılmadan kapatıldığında
    /// hesabın token süresi dolana kadar kilitli kalmasını engeller.
    /// </summary>
    public int SessionIdleMinutes { get; set; } = 10;

    /// <summary>
    /// "Son görülme" damgasının en fazla hangi sıklıkta veritabanına yazılacağı (saniye).
    /// Her istekte yazmamak için.
    /// </summary>
    public int SessionTouchSeconds { get; set; } = 30;
}
