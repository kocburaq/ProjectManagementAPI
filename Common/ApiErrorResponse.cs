namespace ProjectManagementAPI.Common;

public class ApiErrorResponse
{
    public string Message { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public IDictionary<string, string[]>? Errors { get; set; }

    /// <summary>
    /// İstemcinin özel davranış göstermesi gereken durumlar için makine-okunur kod
    /// (örn. SESSION_REVOKED, SESSION_ALREADY_ACTIVE). Diğer hatalarda null.
    /// </summary>
    public string? Code { get; set; }
}
