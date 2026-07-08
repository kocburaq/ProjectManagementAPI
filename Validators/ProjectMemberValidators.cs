using FluentValidation;
using ProjectManagementAPI.Dtos.ProjectMembers;

namespace ProjectManagementAPI.Validators;

public class AddProjectMemberDtoValidator : AbstractValidator<AddProjectMemberDto>
{
    public AddProjectMemberDtoValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.Role).IsInEnum();
    }
}
