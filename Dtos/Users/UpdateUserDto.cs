using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Dtos.Users;

public class UpdateUserDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public UserRole Role { get; set; }
    public bool IsActive { get; set; }
}
