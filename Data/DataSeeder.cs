using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ProjectManagementAPI.Entities;
using ProjectManagementAPI.Enums;

namespace ProjectManagementAPI.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext context, IPasswordHasher<User> passwordHasher)
    {
        await context.Database.MigrateAsync();

        if (await context.Users.AnyAsync())
        {
            return;
        }

        var admin = new User
        {
            FirstName = "System",
            LastName = "Admin",
            Email = "admin@heweso.com",
            Role = UserRole.Admin,
            Department = "IT",
            IsActive = true
        };
        admin.PasswordHash = passwordHasher.HashPassword(admin, "Admin123!");

        var manager = new User
        {
            FirstName = "Melis",
            LastName = "Yilmaz",
            Email = "pm@heweso.com",
            Role = UserRole.ProjectManager,
            Department = "Engineering",
            IsActive = true
        };
        manager.PasswordHash = passwordHasher.HashPassword(manager, "Manager123!");

        var dev1 = new User
        {
            FirstName = "Ali",
            LastName = "Demir",
            Email = "dev1@heweso.com",
            Role = UserRole.TeamMember,
            Department = "Engineering",
            IsActive = true
        };
        dev1.PasswordHash = passwordHasher.HashPassword(dev1, "Member123!");

        var dev2 = new User
        {
            FirstName = "Zeynep",
            LastName = "Kaya",
            Email = "dev2@heweso.com",
            Role = UserRole.TeamMember,
            Department = "Engineering",
            IsActive = true
        };
        dev2.PasswordHash = passwordHasher.HashPassword(dev2, "Member123!");

        context.Users.AddRange(admin, manager, dev1, dev2);
        await context.SaveChangesAsync();

        var project = new Project
        {
            Name = "Heweso Staj Portali",
            Description = "İntörn onboarding ve görev takip portalı.",
            StartDate = DateTime.UtcNow.AddDays(-14),
            EndDate = DateTime.UtcNow.AddMonths(2),
            Status = ProjectStatus.Active,
            OwnerId = manager.Id
        };

        context.Projects.Add(project);
        await context.SaveChangesAsync();

        context.ProjectMembers.AddRange(
            new ProjectMember { ProjectId = project.Id, UserId = dev1.Id, Role = ProjectMemberRole.Contributor },
            new ProjectMember { ProjectId = project.Id, UserId = dev2.Id, Role = ProjectMemberRole.Member }
        );
        await context.SaveChangesAsync();

        var task1 = new ProjectTask
        {
            Title = "Kimlik doğrulama modülünü tasarla",
            Description = "JWT tabanlı login/register akışını uçtan uca hazırla.",
            ProjectId = project.Id,
            AssignedToUserId = dev1.Id,
            CreatedByUserId = manager.Id,
            Status = ProjectTaskStatus.InProgress,
            Priority = ProjectTaskPriority.High,
            DueDate = DateTime.UtcNow.AddDays(7),
            EstimatedHours = 16
        };

        var task2 = new ProjectTask
        {
            Title = "Görev listeleme ekranını hazırla",
            Description = "Sayfalama ve filtreleme destekli görev tablosu.",
            ProjectId = project.Id,
            AssignedToUserId = dev2.Id,
            CreatedByUserId = manager.Id,
            Status = ProjectTaskStatus.Todo,
            Priority = ProjectTaskPriority.Medium,
            DueDate = DateTime.UtcNow.AddDays(14),
            EstimatedHours = 10
        };

        context.Tasks.AddRange(task1, task2);
        await context.SaveChangesAsync();

        context.Comments.Add(new Comment
        {
            TaskId = task1.Id,
            UserId = dev1.Id,
            Content = "Login endpointi hazır, refresh token için ayrı bir görev açalım mı?"
        });

        context.TaskTimeLogs.Add(new TaskTimeLog
        {
            TaskId = task1.Id,
            UserId = dev1.Id,
            Hours = 4,
            Description = "JWT servis altyapısı kuruldu.",
            WorkDate = DateTime.UtcNow.AddDays(-1)
        });

        context.TaskHistories.Add(new TaskHistory
        {
            TaskId = task1.Id,
            ChangedByUserId = manager.Id,
            ChangeType = TaskChangeType.StatusChanged,
            OldValue = ProjectTaskStatus.Todo.ToString(),
            NewValue = ProjectTaskStatus.InProgress.ToString(),
            Description = "Seed data initial status change."
        });

        await context.SaveChangesAsync();
    }
}
