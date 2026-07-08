using FluentValidation;
using ProjectManagementAPI.Dtos.Users;

namespace ProjectManagementAPI.Validators;

public class UpdateUserDtoValidator : AbstractValidator<UpdateUserDto>
{
    public UpdateUserDtoValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Department).MaximumLength(100);
        RuleFor(x => x.Role).IsInEnum();
    }
}
