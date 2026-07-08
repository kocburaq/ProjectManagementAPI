using FluentValidation;
using ProjectManagementAPI.Dtos.Comments;

namespace ProjectManagementAPI.Validators;

public class CreateCommentDtoValidator : AbstractValidator<CreateCommentDto>
{
    public CreateCommentDtoValidator()
    {
        RuleFor(x => x.Content).NotEmpty();
    }
}

public class UpdateCommentDtoValidator : AbstractValidator<UpdateCommentDto>
{
    public UpdateCommentDtoValidator()
    {
        RuleFor(x => x.Content).NotEmpty();
    }
}
