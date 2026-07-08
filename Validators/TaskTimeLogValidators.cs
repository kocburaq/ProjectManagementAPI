using FluentValidation;
using ProjectManagementAPI.Dtos.TaskTimeLogs;

namespace ProjectManagementAPI.Validators;

public class CreateTaskTimeLogDtoValidator : AbstractValidator<CreateTaskTimeLogDto>
{
    public CreateTaskTimeLogDtoValidator()
    {
        RuleFor(x => x.Hours).GreaterThan(0).WithMessage("Hours must be greater than zero.");
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.WorkDate).NotEmpty();
    }
}
