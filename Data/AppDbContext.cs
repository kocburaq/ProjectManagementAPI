using Microsoft.EntityFrameworkCore;
using ProjectManagementAPI.Entities;

namespace ProjectManagementAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }

    public DbSet<Project> Projects { get; set; }

    public DbSet<ProjectMember> ProjectMembers { get; set; }

    public DbSet<ProjectTask> Tasks { get; set; }

    public DbSet<Comment> Comments { get; set; }

    public DbSet<TaskTimeLog> TaskTimeLogs { get; set; }

    public DbSet<TaskHistory> TaskHistories { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(u => u.FirstName).IsRequired().HasMaxLength(50);
            entity.Property(u => u.LastName).IsRequired().HasMaxLength(50);
            entity.Property(u => u.Email).IsRequired().HasMaxLength(256);
            entity.Property(u => u.Department).HasMaxLength(100);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasQueryFilter(u => !u.IsDeleted);
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.Property(p => p.Name).IsRequired().HasMaxLength(200);
            entity.HasQueryFilter(p => !p.IsDeleted);

            entity.HasOne(p => p.Owner)
                .WithMany(u => u.OwnedProjects)
                .HasForeignKey(p => p.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProjectMember>(entity =>
        {
            entity.HasIndex(pm => new { pm.ProjectId, pm.UserId }).IsUnique();

            entity.HasOne(pm => pm.Project)
                .WithMany(p => p.Members)
                .HasForeignKey(pm => pm.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(pm => pm.User)
                .WithMany(u => u.ProjectMemberships)
                .HasForeignKey(pm => pm.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProjectTask>(entity =>
        {
            entity.Property(t => t.Title).IsRequired().HasMaxLength(200);
            entity.HasQueryFilter(t => !t.IsDeleted);

            entity.HasOne(t => t.Project)
                .WithMany(p => p.Tasks)
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(t => t.AssignedToUser)
                .WithMany(u => u.AssignedTasks)
                .HasForeignKey(t => t.AssignedToUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(t => t.CreatedByUser)
                .WithMany(u => u.CreatedTasks)
                .HasForeignKey(t => t.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Comment>(entity =>
        {
            entity.Property(c => c.Content).IsRequired();
            entity.HasQueryFilter(c => !c.IsDeleted);

            entity.HasOne(c => c.Task)
                .WithMany(t => t.Comments)
                .HasForeignKey(c => c.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.User)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TaskTimeLog>(entity =>
        {
            entity.Property(tl => tl.Description).HasMaxLength(500);
            entity.Property(tl => tl.Hours).HasColumnType("decimal(9,2)");

            entity.HasOne(tl => tl.Task)
                .WithMany(t => t.TimeLogs)
                .HasForeignKey(tl => tl.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(tl => tl.User)
                .WithMany(u => u.TimeLogs)
                .HasForeignKey(tl => tl.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TaskHistory>(entity =>
        {
            entity.HasOne(th => th.Task)
                .WithMany(t => t.Histories)
                .HasForeignKey(th => th.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(th => th.ChangedByUser)
                .WithMany(u => u.TaskHistories)
                .HasForeignKey(th => th.ChangedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
