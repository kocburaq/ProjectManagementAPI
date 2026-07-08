using Microsoft.EntityFrameworkCore;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Dtos.Users;
using ProjectManagementAPI.Repositories;

namespace ProjectManagementAPI.Services;

public class UserService : IUserService
{
    private readonly IUnitOfWork _unitOfWork;

    public UserService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<PagedResult<UserResponseDto>> GetAllAsync(PaginationQuery query)
    {
        var baseQuery = _unitOfWork.Users.Query().OrderBy(u => u.Id);

        var totalCount = await baseQuery.CountAsync();
        var items = await baseQuery
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(u => MapToDto(u.Id, u.FirstName, u.LastName, u.Email, u.Role, u.Department, u.IsActive, u.CreatedAt, u.UpdatedAt))
            .ToListAsync();

        return new PagedResult<UserResponseDto>
        {
            Items = items,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<UserResponseDto> GetByIdAsync(int id)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(id)
            ?? throw new NotFoundException($"User {id} was not found.");

        return MapToDto(user.Id, user.FirstName, user.LastName, user.Email, user.Role, user.Department, user.IsActive, user.CreatedAt, user.UpdatedAt);
    }

    public async Task<UserResponseDto> UpdateAsync(int id, UpdateUserDto dto)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(id)
            ?? throw new NotFoundException($"User {id} was not found.");

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.Department = dto.Department;
        user.Role = dto.Role;
        user.IsActive = dto.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return MapToDto(user.Id, user.FirstName, user.LastName, user.Email, user.Role, user.Department, user.IsActive, user.CreatedAt, user.UpdatedAt);
    }

    private static UserResponseDto MapToDto(int id, string firstName, string lastName, string email,
        Enums.UserRole role, string? department, bool isActive, DateTime createdAt, DateTime? updatedAt) => new()
        {
            Id = id,
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            Role = role,
            Department = department,
            IsActive = isActive,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt
        };
}
