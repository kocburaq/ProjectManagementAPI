using ProjectManagementAPI.Entities;

namespace ProjectManagementAPI.Repositories;

public interface IUserRepository : IGenericRepository<User>
{
    Task<User?> GetByEmailAsync(string email);
}
