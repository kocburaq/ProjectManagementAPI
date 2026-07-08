using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.Users;

namespace ProjectManagementAPI.Services;

public interface IUserService
{
    Task<PagedResult<UserResponseDto>> GetAllAsync(PaginationQuery query);
    Task<UserResponseDto> GetByIdAsync(int id);
    Task<UserResponseDto> UpdateAsync(int id, UpdateUserDto dto);
}
