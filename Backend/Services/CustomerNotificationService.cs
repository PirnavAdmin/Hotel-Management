using System;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public interface ICustomerNotificationService
{
    Task SendOtpNotificationAsync(
        long customerId,
        string fullName,
        string? email,
        string? phone,
        string purpose,
        string otpCode,
        int expiryMinutes);

    Task SendPasswordChangedNoticeAsync(
        long customerId,
        string fullName,
        string? email,
        string? phone);
}

public class CustomerNotificationService : ICustomerNotificationService
{
    private readonly IEmailService _emailService;
    private readonly ILogger<CustomerNotificationService> _logger;

    public CustomerNotificationService(
        IEmailService emailService,
        ILogger<CustomerNotificationService> logger)
    {
        _emailService = emailService;
        _logger = logger;
    }

    public async Task SendOtpNotificationAsync(
        long customerId,
        string fullName,
        string? email,
        string? phone,
        string purpose,
        string otpCode,
        int expiryMinutes)
    {
        string safeName = string.IsNullOrWhiteSpace(fullName) ? "Valued Guest" : fullName.Trim();
        int validMinutes = Math.Max(1, expiryMinutes);

        bool isPasswordReset = string.Equals(purpose, CustomerAuthService.PurposePasswordReset, StringComparison.OrdinalIgnoreCase);
        bool isLoginVerify = string.Equals(purpose, CustomerAuthService.PurposeLoginVerify, StringComparison.OrdinalIgnoreCase);

        string subject = isPasswordReset
            ? "Bhanu Bistro - Password Reset Verification Code"
            : isLoginVerify
                ? "Bhanu Bistro - Login Verification OTP"
                : "Bhanu Bistro - Verify Your Account";

        string headline = isPasswordReset
            ? "Reset Your Password"
            : isLoginVerify
                ? "Confirm Your Sign-In"
                : "Verify Your Account";

        string intro = isPasswordReset
            ? "We received a request to reset the password for your Bhanu Bistro account. Enter the 6-digit verification code below to proceed:"
            : isLoginVerify
                ? "A sign-in attempt was made for your Bhanu Bistro account. Enter the 6-digit verification code below to complete your login:"
                : "Welcome to Bhanu Bistro! Enter the 6-digit verification code below to activate and verify your customer account:";

        string securityNote = isPasswordReset
            ? "If you did not request a password reset, please ignore this email and keep your account secure."
            : isLoginVerify
                ? "If you did not attempt to sign in, we recommend changing your password immediately."
                : "If you did not create a Bhanu Bistro account, you can safely disregard this email.";

        string minuteLabel = validMinutes == 1 ? "1 minute" : $"{validMinutes} minutes";

        string plainTextBody =
            $"Hello {safeName},\n\n" +
            $"{intro}\n\n" +
            $"Your 6-digit OTP code: {otpCode}\n" +
            $"Expires in: {minuteLabel}\n\n" +
            "Do not share this code with anyone. Bhanu Bistro staff will never ask for your OTP.\n" +
            $"{securityNote}\n\n" +
            "— Bhanu Bistro";

        string htmlBody = BuildBhanuBistroOtpHtml(
            WebUtility.HtmlEncode(safeName),
            WebUtility.HtmlEncode(headline),
            WebUtility.HtmlEncode(intro),
            WebUtility.HtmlEncode(otpCode),
            WebUtility.HtmlEncode(minuteLabel),
            WebUtility.HtmlEncode(securityNote));

        // Never log raw OTP values, email bodies, or SMTP secrets.
        _logger.LogInformation(
            "Dispatching {Purpose} email notification for customer {CustomerId} (email: {MaskedEmail}, phone: {MaskedPhone}).",
            purpose,
            customerId,
            SmtpEmailService.MaskEmail(email),
            MaskPhone(phone));

        if (string.IsNullOrWhiteSpace(email))
        {
            throw new CustomerEmailDeliveryException(
                "No email address is registered for this customer account to receive the OTP.");
        }

        await _emailService.SendEmailAsync(email.Trim(), subject, htmlBody, plainTextBody);
    }

    public async Task SendPasswordChangedNoticeAsync(
        long customerId,
        string fullName,
        string? email,
        string? phone)
    {
        string safeName = string.IsNullOrWhiteSpace(fullName) ? "Valued Guest" : fullName.Trim();

        _logger.LogInformation(
            "Dispatching password changed notice for customer {CustomerId} (email: {MaskedEmail}, phone: {MaskedPhone}).",
            customerId,
            SmtpEmailService.MaskEmail(email),
            MaskPhone(phone));

        if (string.IsNullOrWhiteSpace(email))
        {
            return;
        }

        const string subject = "Bhanu Bistro - Password Changed";
        string plainTextBody =
            $"Hello {safeName},\n\n" +
            "Your Bhanu Bistro customer account password was recently changed and all active sessions were signed out.\n" +
            "If you did not perform this change, please contact Bhanu Bistro support immediately.\n\n" +
            "— Bhanu Bistro";

        string htmlBody = BuildBhanuBistroNoticeHtml(
            WebUtility.HtmlEncode(safeName),
            "Password Updated",
            "Your Bhanu Bistro customer account password was recently changed and all active sessions have been signed out.",
            "If you did not make this change, please reset your password or contact Bhanu Bistro support immediately.");

        try
        {
            await _emailService.SendEmailAsync(email.Trim(), subject, htmlBody, plainTextBody);
        }
        catch (Exception ex)
        {
            // Password update already succeeded; treat security notice delivery failure as non-fatal.
            _logger.LogWarning(
                ex,
                "Non-fatal failure sending password-changed notice for customer {CustomerId} ({MaskedEmail}).",
                customerId,
                SmtpEmailService.MaskEmail(email));
        }
    }

    private static string BuildBhanuBistroOtpHtml(
        string encodedName,
        string encodedHeadline,
        string encodedIntro,
        string encodedOtp,
        string encodedMinuteLabel,
        string encodedSecurityNote)
    {
        int year = DateTime.UtcNow.Year;
        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""utf-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
  <title>{encodedHeadline} - Bhanu Bistro</title>
</head>
<body style=""margin:0;padding:0;background-color:#f6f3ee;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1f2937;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f6f3ee;padding:32px 16px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""max-width:540px;background-color:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #eadfd0;box-shadow:0 8px 24px rgba(31,23,18,0.08);"">
          <tr>
            <td style=""background:linear-gradient(135deg,#241711 0%,#3c2415 100%);padding:28px 32px;text-align:center;border-bottom:3px solid #d97706;"">
              <div style=""font-size:26px;font-weight:800;letter-spacing:1.2px;color:#fbbf24;text-transform:uppercase;"">Bhanu Bistro</div>
              <div style=""font-size:12px;letter-spacing:2px;color:#e5d5c3;margin-top:4px;text-transform:uppercase;"">Fine Dining &amp; Online Ordering</div>
            </td>
          </tr>
          <tr>
            <td style=""padding:32px 32px 24px 32px;"">
              <h1 style=""margin:0 0 12px 0;font-size:20px;font-weight:700;color:#1f1712;"">{encodedHeadline}</h1>
              <p style=""margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#374151;"">Hello <strong>{encodedName}</strong>,</p>
              <p style=""margin:0 0 22px 0;font-size:15px;line-height:1.6;color:#4b5563;"">{encodedIntro}</p>
              <div style=""background-color:#fffbeb;border:2px dashed #d97706;border-radius:12px;padding:20px 16px;text-align:center;margin:0 0 20px 0;"">
                <div style=""font-size:11px;font-weight:700;letter-spacing:1.6px;color:#92400e;text-transform:uppercase;margin-bottom:8px;"">One-Time Verification Code</div>
                <div style=""font-family:'Courier New',Consolas,monospace;font-size:34px;font-weight:800;letter-spacing:10px;color:#1f1712;line-height:1.2;"">{encodedOtp}</div>
              </div>
              <p style=""margin:0 0 14px 0;font-size:14px;line-height:1.5;color:#1f2937;text-align:center;"">
                This code is valid for <strong>{encodedMinuteLabel}</strong>.
              </p>
              <div style=""background-color:#f9fafb;border-radius:8px;padding:12px 14px;border-left:3px solid #d97706;font-size:12.5px;line-height:1.5;color:#4b5563;"">
                <strong>Security Notice:</strong> Never share this verification code with anyone. {encodedSecurityNote}
              </div>
            </td>
          </tr>
          <tr>
            <td style=""background-color:#faf7f2;padding:18px 32px;text-align:center;border-top:1px solid #eadfd0;font-size:12px;color:#6b7280;"">
              &copy; {year} Bhanu Bistro. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }

    private static string BuildBhanuBistroNoticeHtml(
        string encodedName,
        string encodedHeadline,
        string encodedBody,
        string encodedNote)
    {
        int year = DateTime.UtcNow.Year;
        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""utf-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
  <title>{encodedHeadline} - Bhanu Bistro</title>
</head>
<body style=""margin:0;padding:0;background-color:#f6f3ee;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1f2937;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f6f3ee;padding:32px 16px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""max-width:540px;background-color:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #eadfd0;box-shadow:0 8px 24px rgba(31,23,18,0.08);"">
          <tr>
            <td style=""background:linear-gradient(135deg,#241711 0%,#3c2415 100%);padding:28px 32px;text-align:center;border-bottom:3px solid #d97706;"">
              <div style=""font-size:26px;font-weight:800;letter-spacing:1.2px;color:#fbbf24;text-transform:uppercase;"">Bhanu Bistro</div>
              <div style=""font-size:12px;letter-spacing:2px;color:#e5d5c3;margin-top:4px;text-transform:uppercase;"">Fine Dining &amp; Online Ordering</div>
            </td>
          </tr>
          <tr>
            <td style=""padding:32px 32px 24px 32px;"">
              <h1 style=""margin:0 0 12px 0;font-size:20px;font-weight:700;color:#1f1712;"">{encodedHeadline}</h1>
              <p style=""margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#374151;"">Hello <strong>{encodedName}</strong>,</p>
              <p style=""margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#4b5563;"">{encodedBody}</p>
              <div style=""background-color:#f9fafb;border-radius:8px;padding:12px 14px;border-left:3px solid #d97706;font-size:12.5px;line-height:1.5;color:#4b5563;"">{encodedNote}</div>
            </td>
          </tr>
          <tr>
            <td style=""background-color:#faf7f2;padding:18px 32px;text-align:center;border-top:1px solid #eadfd0;font-size:12px;color:#6b7280;"">
              &copy; {year} Bhanu Bistro. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }

    private static string MaskPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return "none";
        var digits = Regex.Replace(phone, @"[^\d]", "");
        if (digits.Length <= 4) return "****";
        return $"******{digits[^4..]}";
    }
}
