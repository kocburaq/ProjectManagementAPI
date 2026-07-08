namespace ProjectManagementAPI.Dtos.Auth;

// Public self-registration always creates a TeamMember. Promoting a user to
// ProjectManager/Admin is an Admin-only action via PUT /api/users/{id}.
public class RegisterRequestDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Department { get; set; }
}
