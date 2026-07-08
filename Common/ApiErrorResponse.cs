namespace ProjectManagementAPI.Common;

public class ApiErrorResponse
{
    public string Message { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public IDictionary<string, string[]>? Errors { get; set; }
}
