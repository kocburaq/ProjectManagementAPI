using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using ProjectManagementAPI.Common;
using ProjectManagementAPI.Data;
using ProjectManagementAPI.Entities;
using ProjectManagementAPI.Middleware;
using ProjectManagementAPI.Repositories;
using ProjectManagementAPI.Security;
using ProjectManagementAPI.Services;
using SharpGrip.FluentValidation.AutoValidation.Mvc.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
    ?? throw new InvalidOperationException("Jwt configuration section is missing.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key)),
        ClockSkew = TimeSpan.FromMinutes(1)
    };

    // ---- Eşzamanlı oturum kontrolü ----
    // JWT stateless olduğu için, "aynı kullanıcı tek yerden" kuralını uygulamanın tek yolu
    // her istekte token'daki oturum kimliğini veritabanındakiyle karşılaştırmaktır.
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var principal = context.Principal;
            var userIdClaim = principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var sessionId = principal?.FindFirst(SessionClaims.SessionId)?.Value;

            if (!int.TryParse(userIdClaim, out var userId))
            {
                context.Fail("Geçersiz token.");
                return;
            }

            var validator = context.HttpContext.RequestServices.GetRequiredService<SessionValidator>();
            var isValid = await validator.ValidateAsync(userId, sessionId, context.HttpContext.RequestAborted);

            if (!isValid)
            {
                context.HttpContext.Items["SessionRevoked"] = true;
                context.Fail("Oturum geçersiz.");
            }
        },

        // Oturum devralındığında istemciye anlaşılır bir gövde döndür.
        OnChallenge = async context =>
        {
            if (context.Response.HasStarted) return;

            var revoked = context.HttpContext.Items.ContainsKey("SessionRevoked");
            context.HandleResponse();
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";

            var payload = new ApiErrorResponse
            {
                Message = revoked
                    ? "Oturumunuz sonlandırıldı. Bu hesapla başka bir cihazdan giriş yapılmış olabilir."
                    : "Bu işlem için giriş yapmanız gerekiyor.",
                StatusCode = StatusCodes.Status401Unauthorized,
                Code = revoked ? SessionClaims.SessionRevokedCode : null
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
        }
    };
});

builder.Services.AddAuthorization();

// ---- CORS ----
// Frontend (wwwroot) bu uygulamanın kendisi tarafından servis ediliyor, yani tarayıcı
// açısından API ile AYNI ORIGIN'de. Dolayısıyla telefondan erişim için CORS'a aslında
// gerek yok; bu politika yalnızca harici araçlar (Postman, ayrı bir SPA vb.) içindir.
//
// Geliştirmede serbest bırakıyoruz. Üretimde ise yalnızca yapılandırmada tanımlı
// origin'lere izin veriyoruz - uygulama yanlışlıkla internete açılırsa her siteden
// tarayıcı isteği kabul edilmesin.
builder.Services.AddCors(options =>
{
    options.AddPolicy("Default", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
        else
        {
            var allowed = builder.Configuration
                .GetSection("Cors:AllowedOrigins")
                .Get<string[]>() ?? Array.Empty<string>();

            if (allowed.Length > 0)
            {
                policy.WithOrigins(allowed).AllowAnyHeader().AllowAnyMethod();
            }
            // Liste boşsa hiçbir cross-origin isteğe izin verilmez (aynı origin çalışmaya devam eder).
        }
    });
});

builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<SessionValidator>();

builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<IProjectMemberService, ProjectMemberService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddScoped<ITaskHistoryService, TaskHistoryService>();
builder.Services.AddScoped<ITaskTimeLogService, TaskTimeLogService>();

builder.Services.AddValidatorsFromAssemblyContaining<Program>();
builder.Services.AddFluentValidationAutoValidation();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Project Management API", Version = "v1" });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter the JWT access token returned by /api/auth/login."
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer", document),
            new List<string>()
        }
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
    await DataSeeder.SeedAsync(context, hasher);
}

app.UseDefaultFiles();

// Geliştirmede tarayıcı önbelleği kapalı: aksi halde güncellenen js/css dosyalarının
// eski sürümü sunulmaya devam ediyor ve tarayıcılar arasında tutarsız davranış oluşuyor.
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        if (app.Environment.IsDevelopment())
        {
            ctx.Context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            ctx.Context.Response.Headers.Pragma = "no-cache";
            ctx.Context.Response.Headers.Expires = "0";
        }
    }
});

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// HTTPS yönlendirmesi bilerek kapalı.
// Yerel ağda telefondan erişimde HTTPS kullanmak, geliştirme sertifikası telefonda
// güvenilir olmadığı için sürekli sertifika uyarısı üretir. Yerel ağ kullanımı için
// düz HTTP yeterli ve sorunsuz.
// app.UseHttpsRedirection();

app.UseCors("Default");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Uygulama açıldığında telefondan girilecek adresleri konsola yaz.
LogReachableUrls(app);

app.Run();


// ---- Yardımcı: erişilebilir adresleri konsola bas ----
static void LogReachableUrls(WebApplication app)
{
    app.Lifetime.ApplicationStarted.Register(() =>
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Network");

        // Bu yalnızca bilgilendirme amaçlı; hiçbir koşulda uygulamayı düşürmemeli.
        try
        {
            // Kestrel'in gerçekten bağlandığı port(lar)
            var ports = app.Urls
                .Select(u => Uri.TryCreate(u, UriKind.Absolute, out var uri) ? uri.Port : 0)
                .Where(p => p > 0)
                .Distinct()
                .ToArray();

            if (ports.Length == 0) return;

            var lines = new List<string>();
            foreach (var port in ports)
            {
                lines.Add($"  Bu bilgisayardan : http://localhost:{port}");

                foreach (var ip in GetLocalIPv4Addresses())
                {
                    lines.Add($"  Yerel ağdan      : http://{ip}:{port}   (Swagger: http://{ip}:{port}/swagger)");
                }
            }

            logger.LogInformation("Uygulamaya erişilebilecek adresler:\n{Urls}", string.Join("\n", lines));
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Erişim adresleri listelenemedi.");
        }
    });
}

static IEnumerable<string> GetLocalIPv4Addresses()
{
    // Yalnızca çalışan, loopback olmayan arayüzlerdeki özel (private) IPv4 adresleri.
    foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
    {
        if (nic.OperationalStatus != OperationalStatus.Up) continue;
        if (nic.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;

        foreach (var addr in nic.GetIPProperties().UnicastAddresses)
        {
            if (addr.Address.AddressFamily != AddressFamily.InterNetwork) continue;
            if (IPAddress.IsLoopback(addr.Address)) continue;

            var bytes = addr.Address.GetAddressBytes();
            var isPrivate =
                bytes[0] == 10 ||
                (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) ||
                (bytes[0] == 192 && bytes[1] == 168);

            if (isPrivate) yield return addr.Address.ToString();
        }
    }
}
