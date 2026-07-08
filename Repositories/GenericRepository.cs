using Microsoft.EntityFrameworkCore;
using ProjectManagementAPI.Data;

namespace ProjectManagementAPI.Repositories;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    protected readonly AppDbContext Context;
    protected readonly DbSet<T> DbSet;

    public GenericRepository(AppDbContext context)
    {
        Context = context;
        DbSet = context.Set<T>();
    }

    public IQueryable<T> Query() => DbSet.AsQueryable();

    public async Task<T?> GetByIdAsync(int id) => await DbSet.FindAsync(id);

    public async Task AddAsync(T entity) => await DbSet.AddAsync(entity);

    public void Update(T entity) => DbSet.Update(entity);

    public void Remove(T entity) => DbSet.Remove(entity);
}
