using System;
using System.Net;
using System.Net.Mail;
using System.Net.Mime;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using HMS.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HMS.Services;

public class CustomerEmailDeliveryException : Exception
{
    public CustomerEmailDeliveryException(string message) : base(message) { }
    public CustomerEmailDeliveryException(string message, Exception innerException) : base(message, innerException) { }
}

public interface IEmailService
{
    Task SendEmailAsync(
        string recipientEmail,
        string subject,
        string htmlBody,
        string plainTextBody,
        CancellationToken cancellationToken = default);
}

public class SmtpEmailService : IEmailService
{
    private readonly IOptionsSnapshot<SmtpSettings> _smtpOptions;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(
        IOptionsSnapshot<SmtpSettings> smtpOptions,
        IConfiguration configuration,
        ILogger<SmtpEmailService> logger)
    {
        _smtpOptions = smtpOptions;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailAsync(
        string recipientEmail,
        string subject,
        string htmlBody,
        string plainTextBody,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(recipientEmail))
        {
            throw new CustomerEmailDeliveryException("A valid recipient email address is required to deliver the verification code.");
        }

        string trimmedRecipient = recipientEmail.Trim();
        if (!MailAddress.TryCreate(trimmedRecipient, out var toAddress))
        {
            throw new CustomerEmailDeliveryException("Recipient email address format is invalid.");
        }

        SmtpSettings settings = _smtpOptions.Value ?? new SmtpSettings();
        string host = !string.IsNullOrWhiteSpace(settings.Host)
            ? settings.Host.Trim()
            : (_configuration["Smtp:Host"] ?? string.Empty).Trim();

        int port = settings.Port > 0
            ? settings.Port
            : _configuration.GetValue<int>("Smtp:Port", 587);

        string username = !string.IsNullOrWhiteSpace(settings.Username)
            ? settings.Username.Trim()
            : (_configuration["Smtp:Username"] ?? string.Empty).Trim();

        string password = !string.IsNullOrWhiteSpace(settings.Password)
            ? settings.Password.Trim()
            : (_configuration["Smtp:Password"] ?? string.Empty).Trim();

        string fromEmail = !string.IsNullOrWhiteSpace(settings.FromEmail)
            ? settings.FromEmail.Trim()
            : (!string.IsNullOrWhiteSpace(username) ? username : (_configuration["Smtp:FromEmail"] ?? string.Empty).Trim());

        string fromName = !string.IsNullOrWhiteSpace(settings.FromName)
            ? settings.FromName.Trim()
            : (_configuration["Smtp:FromName"] ?? "Bhanu Bistro").Trim();

        bool enableSsl = settings.EnableSsl;
        int timeoutMs = Math.Clamp(settings.TimeoutMs > 0 ? settings.TimeoutMs : 15000, 3000, 60000);

        if (string.IsNullOrWhiteSpace(host) || port <= 0 || port > 65535)
        {
            _logger.LogError("SMTP configuration is invalid or missing SmtpSettings:Host / SmtpSettings:Port.");
            throw new CustomerEmailDeliveryException("Email delivery service is currently unavailable. Please try again later.");
        }

        if (string.IsNullOrWhiteSpace(fromEmail) || !MailAddress.TryCreate(fromEmail, out _))
        {
            _logger.LogError("SMTP configuration is missing a valid SmtpSettings:FromEmail address.");
            throw new CustomerEmailDeliveryException("Email delivery service is currently unavailable. Please try again later.");
        }

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogError(
                "SMTP credentials are missing for {Host}:{Port}. Configure SmtpSettings:Password via .NET User Secrets or SmtpSettings__Password environment variable.",
                host,
                port);
            throw new CustomerEmailDeliveryException(
                "Email verification service is temporarily unavailable because SMTP credentials are not configured. Please try again shortly.");
        }

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName, Encoding.UTF8),
            Subject = subject,
            SubjectEncoding = Encoding.UTF8,
            Body = plainTextBody,
            BodyEncoding = Encoding.UTF8,
            IsBodyHtml = false
        };
        message.To.Add(toAddress);
        message.AlternateViews.Add(
            AlternateView.CreateAlternateViewFromString(plainTextBody, Encoding.UTF8, MediaTypeNames.Text.Plain));
        message.AlternateViews.Add(
            AlternateView.CreateAlternateViewFromString(htmlBody, Encoding.UTF8, MediaTypeNames.Text.Html));

        using var client = new SmtpClient(host, port)
        {
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false,
            EnableSsl = enableSsl,
            Timeout = timeoutMs,
            Credentials = new NetworkCredential(username, password)
        };

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(timeoutMs);

        string maskedRecipient = MaskEmail(trimmedRecipient);

        try
        {
            _logger.LogInformation(
                "Sending email via SMTP {Host}:{Port} (STARTTLS={EnableSsl}) to {MaskedRecipient}.",
                host,
                port,
                enableSsl,
                maskedRecipient);

            await client.SendMailAsync(message, timeoutCts.Token);

            _logger.LogInformation(
                "SMTP email delivered successfully to {MaskedRecipient}.",
                maskedRecipient);
        }
        catch (SmtpException ex)
        {
            _logger.LogError(
                ex,
                "SMTP delivery failed (StatusCode={StatusCode}, Host={Host}:{Port}, Recipient={MaskedRecipient}).",
                ex.StatusCode,
                host,
                port,
                maskedRecipient);

            string userMessage = ex.StatusCode == SmtpStatusCode.ClientNotPermitted ||
                                 ex.StatusCode == SmtpStatusCode.MustIssueStartTlsFirst ||
                                 ex.Message.Contains("Authentication", StringComparison.OrdinalIgnoreCase) ||
                                 ex.Message.Contains("not authenticated", StringComparison.OrdinalIgnoreCase) ||
                                 ex.Message.Contains("5.7.0", StringComparison.OrdinalIgnoreCase) ||
                                 ex.Message.Contains("5.7.8", StringComparison.OrdinalIgnoreCase)
                ? "Email service authentication failed. Please contact support or try again shortly."
                : "We could not deliver your verification email right now. Please try again in a few moments.";

            throw new CustomerEmailDeliveryException(userMessage, ex);
        }
        catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogError(
                ex,
                "SMTP delivery timed out after {TimeoutMs}ms ({Host}:{Port}, Recipient={MaskedRecipient}).",
                timeoutMs,
                host,
                port,
                maskedRecipient);

            throw new CustomerEmailDeliveryException(
                "Email delivery timed out while reaching the mail server. Please try again shortly.",
                ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Unexpected SMTP error while sending email ({Host}:{Port}, Recipient={MaskedRecipient}).",
                host,
                port,
                maskedRecipient);

            throw new CustomerEmailDeliveryException(
                "We could not deliver your verification email right now. Please try again shortly.",
                ex);
        }
    }

    public static string MaskEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@')) return "none";
        var parts = email.Trim().Split('@', 2);
        string local = parts[0];
        string visible = local.Length <= 2 ? local[..1] : local[..2];
        return $"{visible}***@{parts[1]}";
    }
}
