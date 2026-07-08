using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Common;

public static class ControllerExtensions
{
    public static CurrentUser GetCurrentUser(this ControllerBase controller)
    {
        var idClaim = controller.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("Token is missing the user id claim.");
        var roleClaim = controller.User.FindFirstValue(ClaimTypes.Role)
            ?? throw new UnauthorizedAccessException("Token is missing the role claim.");

        return new CurrentUser(int.Parse(idClaim), Enum.Parse<UserRole>(roleClaim));
    }
}
