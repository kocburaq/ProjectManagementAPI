using System.Net;
using System.Text.Json;
using ProjectManagementAPI.Common;

namespace ProjectManagementAPI.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message) = exception switch
        {
            NotFoundException => (HttpStatusCode.NotFound, exception.Message),
            ForbiddenException => (HttpStatusCode.Forbidden, exception.Message),
            ConflictException => (HttpStatusCode.Conflict, exception.Message),
            BusinessRuleException => (HttpStatusCode.BadRequest, exception.Message),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, exception.Message),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred.")
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception occurred");
        }

        var response = new ApiErrorResponse
        {
            Message = message,
            StatusCode = (int)statusCode,
            Code = (exception as ConflictException)?.Code
        };

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;
        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}
