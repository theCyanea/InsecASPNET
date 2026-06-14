using InsecASPNET.Data;
using InsecASPNET.Services;
using InsecASPNET.Services.Notifications;
using InsecASPNET.Services.Payment;
using InsecASPNET.Services.Pdf;
using InsecASPNET.Services.Pricing;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using QuestPDF.Infrastructure;
using System.Text;

QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<InsecDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// CORS — frontend'in backend'e erişmesine izin veriyoruz
builder.Services.AddCors(options =>
{
    options.AddPolicy("InsecPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:3000")  // Next.js adresi
              .AllowAnyHeader()                       // her türlü header'a izin ver
              .AllowAnyMethod()                      // GET, POST, PUT, DELETE hepsine izin ver
              .AllowCredentials(); 
    });
});

var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey!))
        };

        // Cookie'den token oku
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                context.Token = context.Request.Cookies["insec_token"];
                return Task.CompletedTask;
            }
        };
    });



builder.Services.AddSingleton<IOtpService, OtpService>();
builder.Services.AddTransient<IEmailService, EmailService>();

builder.Services.AddSingleton<DefaultPricingStrategy>();
builder.Services.AddSingleton<IPricingStrategy, KaskoPricingStrategy>();
builder.Services.AddSingleton<IPricingStrategy, KonutPricingStrategy>();
builder.Services.AddSingleton<IPricingStrategy, SaglikPricingStrategy>();
builder.Services.AddSingleton<IPricingStrategy, SeyahatPricingStrategy>();

builder.Services.AddSingleton<IPaymentService, MockPaymentService>();

builder.Services.AddSingleton<IPolicePdfService, PolicePdfService>();

builder.Services.AddScoped<INotificationService, NotificationService>();

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<InsecDbContext>();
    SeedData.Initialize(context);
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

app.UseStaticFiles();

// Sıralama burada da kritik
app.UseCors("InsecPolicy");        // CORS en önce
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();