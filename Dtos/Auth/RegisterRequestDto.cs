namespace ProjectManagementAPI.Dtos.Auth;

// register her zaman TeamMember üretir, rol yükseltme PUT /api/users/{id} ile Admin'de kalıyor
public class RegisterRequestDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Department { get; set; }
}
