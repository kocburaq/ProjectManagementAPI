namespace ProjectManagementAPI.Common;

public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
}

public class ForbiddenException : Exception
{
    public ForbiddenException(string message) : base(message) { }
}

public class ConflictException : Exception
{
    public ConflictException(string message) : base(message) { }

    /// <summary>İstemcinin ayırt edebilmesi için opsiyonel makine-okunur kod.</summary>
    public string? Code { get; init; }
}

public class BusinessRuleException : Exception
{
    public BusinessRuleException(string message) : base(message) { }
}
