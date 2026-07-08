using FluentValidation;
using ProjectManagementAPI.Dtos.Tasks;

namespace ProjectManagementAPI.Validators;

public class CreateTaskDtoValidator : AbstractValidator<CreateTaskDto>
{
    public CreateTaskDtoValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ProjectId).GreaterThan(0);
        RuleFor(x => x.Priority).IsInEnum();
        RuleFor(x => x.EstimatedHours).GreaterThanOrEqualTo(0).When(x => x.EstimatedHours.HasValue);
    }
}

public class UpdateTaskDtoValidator : AbstractValidator<UpdateTaskDto>
{
    public UpdateTaskDtoValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Priority).IsInEnum();
        RuleFor(x => x.EstimatedHours).GreaterThanOrEqualTo(0).When(x => x.EstimatedHours.HasValue);
    }
}

public class ChangeTaskStatusDtoValidator : AbstractValidator<ChangeTaskStatusDto>
{
    public ChangeTaskStatusDtoValidator()
    {
        RuleFor(x => x.Status).IsInEnum();
    }
}
