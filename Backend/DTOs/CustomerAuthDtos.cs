using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace HMS.DTOs;

#region Customer Authentication Request DTOs

public class CustomerRegisterRequestDto
{
    public string? FullName { get; set; }
    public string? Name { get; set; }

    public string? MobileNumber { get; set; }
    public string? Phone { get; set; }
    public string? Mobile { get; set; }
    public string? CustomerPhone { get; set; }

    public string? Email { get; set; }
    public string? EmailAddress { get; set; }

    public string? Password { get; set; }
    public string? ConfirmPassword { get; set; }
    public string? ConfirmNewPassword { get; set; }

    public long? BranchId { get; set; }
    public long? RegisteredBranchId { get; set; }

    public string GetEffectiveFullName() =>
        (!string.IsNullOrWhiteSpace(FullName) ? FullName : Name)?.Trim() ?? string.Empty;

    public string GetEffectivePhone() =>
        (!string.IsNullOrWhiteSpace(MobileNumber) ? MobileNumber :
         !string.IsNullOrWhiteSpace(Phone) ? Phone :
         !string.IsNullOrWhiteSpace(Mobile) ? Mobile : CustomerPhone)?.Trim() ?? string.Empty;

    public string GetEffectiveEmail() =>
        (!string.IsNullOrWhiteSpace(Email) ? Email : EmailAddress)?.Trim() ?? string.Empty;

    public string GetEffectiveConfirmPassword() =>
        !string.IsNullOrEmpty(ConfirmPassword) ? ConfirmPassword : (ConfirmNewPassword ?? string.Empty);

    public long? GetEffectiveBranchId() =>
        BranchId ?? RegisteredBranchId;
}

public class CustomerLoginRequestDto
{
    public string? EmailOrMobile { get; set; }
    public string? Identifier { get; set; }
    public string? EmailOrPhone { get; set; }
    public string? UsernameOrEmail { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? MobileNumber { get; set; }
    public string? Mobile { get; set; }

    public string? Password { get; set; }
    public bool RememberMe { get; set; } = false;

    public string GetEffectiveIdentifier() =>
        (!string.IsNullOrWhiteSpace(EmailOrMobile) ? EmailOrMobile :
         !string.IsNullOrWhiteSpace(Identifier) ? Identifier :
         !string.IsNullOrWhiteSpace(EmailOrPhone) ? EmailOrPhone :
         !string.IsNullOrWhiteSpace(UsernameOrEmail) ? UsernameOrEmail :
         !string.IsNullOrWhiteSpace(Email) ? Email :
         !string.IsNullOrWhiteSpace(Phone) ? Phone :
         !string.IsNullOrWhiteSpace(MobileNumber) ? MobileNumber : Mobile)?.Trim() ?? string.Empty;
}

public class CustomerVerifyOtpRequestDto
{
    public string? EmailOrMobile { get; set; }
    public string? Identifier { get; set; }
    public string? EmailOrPhone { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? MobileNumber { get; set; }
    public string? Mobile { get; set; }

    public string? Otp { get; set; }
    public string? OtpCode { get; set; }
    public string? Code { get; set; }

    public string? Purpose { get; set; }
    public bool RememberMe { get; set; } = false;

    public string GetEffectiveIdentifier() =>
        (!string.IsNullOrWhiteSpace(EmailOrMobile) ? EmailOrMobile :
         !string.IsNullOrWhiteSpace(Identifier) ? Identifier :
         !string.IsNullOrWhiteSpace(EmailOrPhone) ? EmailOrPhone :
         !string.IsNullOrWhiteSpace(Email) ? Email :
         !string.IsNullOrWhiteSpace(Phone) ? Phone :
         !string.IsNullOrWhiteSpace(MobileNumber) ? MobileNumber : Mobile)?.Trim() ?? string.Empty;

    public string GetEffectiveOtp() =>
        (!string.IsNullOrWhiteSpace(Otp) ? Otp :
         !string.IsNullOrWhiteSpace(OtpCode) ? OtpCode : Code)?.Trim() ?? string.Empty;
}

public class CustomerResendOtpRequestDto
{
    public string? EmailOrMobile { get; set; }
    public string? Identifier { get; set; }
    public string? EmailOrPhone { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? MobileNumber { get; set; }
    public string? Mobile { get; set; }

    public string? Purpose { get; set; }

    public string GetEffectiveIdentifier() =>
        (!string.IsNullOrWhiteSpace(EmailOrMobile) ? EmailOrMobile :
         !string.IsNullOrWhiteSpace(Identifier) ? Identifier :
         !string.IsNullOrWhiteSpace(EmailOrPhone) ? EmailOrPhone :
         !string.IsNullOrWhiteSpace(Email) ? Email :
         !string.IsNullOrWhiteSpace(Phone) ? Phone :
         !string.IsNullOrWhiteSpace(MobileNumber) ? MobileNumber : Mobile)?.Trim() ?? string.Empty;
}

public class CustomerForgotPasswordRequestDto
{
    public string? EmailOrMobile { get; set; }
    public string? Identifier { get; set; }
    public string? EmailOrPhone { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? MobileNumber { get; set; }
    public string? Mobile { get; set; }

    public string? Channel { get; set; }

    public string GetEffectiveIdentifier() =>
        (!string.IsNullOrWhiteSpace(EmailOrMobile) ? EmailOrMobile :
         !string.IsNullOrWhiteSpace(Identifier) ? Identifier :
         !string.IsNullOrWhiteSpace(EmailOrPhone) ? EmailOrPhone :
         !string.IsNullOrWhiteSpace(Email) ? Email :
         !string.IsNullOrWhiteSpace(Phone) ? Phone :
         !string.IsNullOrWhiteSpace(MobileNumber) ? MobileNumber : Mobile)?.Trim() ?? string.Empty;
}

public class CustomerResetPasswordRequestDto
{
    public string? EmailOrMobile { get; set; }
    public string? Identifier { get; set; }
    public string? EmailOrPhone { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? MobileNumber { get; set; }
    public string? Mobile { get; set; }

    public string? Otp { get; set; }
    public string? OtpCode { get; set; }
    public string? Code { get; set; }

    public string? Token { get; set; }
    public string? ResetToken { get; set; }

    public string? NewPassword { get; set; }
    public string? Password { get; set; }
    public string? ConfirmPassword { get; set; }
    public string? ConfirmNewPassword { get; set; }

    public string GetEffectiveIdentifier() =>
        (!string.IsNullOrWhiteSpace(EmailOrMobile) ? EmailOrMobile :
         !string.IsNullOrWhiteSpace(Identifier) ? Identifier :
         !string.IsNullOrWhiteSpace(EmailOrPhone) ? EmailOrPhone :
         !string.IsNullOrWhiteSpace(Email) ? Email :
         !string.IsNullOrWhiteSpace(Phone) ? Phone :
         !string.IsNullOrWhiteSpace(MobileNumber) ? MobileNumber : Mobile)?.Trim() ?? string.Empty;

    public string GetEffectiveOtp() =>
        (!string.IsNullOrWhiteSpace(Otp) ? Otp :
         !string.IsNullOrWhiteSpace(OtpCode) ? OtpCode : Code)?.Trim() ?? string.Empty;

    public string GetEffectiveResetToken() =>
        (!string.IsNullOrWhiteSpace(Token) ? Token : ResetToken)?.Trim() ?? string.Empty;

    public string GetEffectiveNewPassword() =>
        !string.IsNullOrEmpty(NewPassword) ? NewPassword : (Password ?? string.Empty);

    public string GetEffectiveConfirmPassword() =>
        !string.IsNullOrEmpty(ConfirmPassword) ? ConfirmPassword : (ConfirmNewPassword ?? string.Empty);
}

public class CustomerRefreshTokenRequestDto
{
    public string? RefreshToken { get; set; }
    public string? Token { get; set; }

    public string GetEffectiveRefreshToken() =>
        (!string.IsNullOrWhiteSpace(RefreshToken) ? RefreshToken : Token)?.Trim() ?? string.Empty;
}

public class CustomerLogoutRequestDto
{
    public string? RefreshToken { get; set; }
    public string? Token { get; set; }
    public bool LogoutAllSessions { get; set; } = false;

    public string GetEffectiveRefreshToken() =>
        (!string.IsNullOrWhiteSpace(RefreshToken) ? RefreshToken : Token)?.Trim() ?? string.Empty;
}

#endregion

#region Customer Authentication Response DTOs

public class CustomerProfileDto
{
    public long CustomerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Role { get; set; } = "Customer";
    public bool IsActive { get; set; }
    public bool IsVerified { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime? LastLogin { get; set; }
    public int LoyaltyPoints { get; set; }
    public long? RegisteredBranchId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CustomerRegisterResponseDto
{
    public bool Success { get; set; } = true;
    public string Message { get; set; } = string.Empty;
    public bool RequiresVerification { get; set; } = true;
    public string? VerificationTarget { get; set; }
    public int OtpExpiresInMinutes { get; set; }
    public CustomerProfileDto? Customer { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DevOtp { get; set; }
}

public class CustomerAuthResponseDto
{
    public bool Success { get; set; } = true;
    public string Message { get; set; } = string.Empty;
    public string? Token { get; set; }
    public string? AccessToken { get; set; }
    public string TokenType { get; set; } = "Bearer";
    public DateTime? ExpiresAt { get; set; }
    public int? ExpiresInSeconds { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }
    public bool RememberMe { get; set; }
    public bool RequiresVerification { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? VerificationTarget { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Purpose { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? OtpExpiresInMinutes { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? ResendAfterSeconds { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DevOtp { get; set; }

    public CustomerProfileDto? Customer { get; set; }
}

public class CustomerOtpResponseDto
{
    public bool Success { get; set; } = true;
    public string Message { get; set; } = string.Empty;
    public string Purpose { get; set; } = "ACCOUNT_VERIFY";
    public bool Verified { get; set; }
    public bool RequiresVerification { get; set; }
    public int? ExpiresInMinutes { get; set; }
    public int? ResendAfterSeconds { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Token { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? AccessToken { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? TokenType { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTime? ExpiresAt { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? ExpiresInSeconds { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? RefreshToken { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTime? RefreshTokenExpiresAt { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? RememberMe { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ResetToken { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public CustomerProfileDto? Customer { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DevOtp { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DevResetToken { get; set; }
}

public class CustomerActionResultDto
{
    public bool Success { get; set; } = true;
    public string Message { get; set; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? RetryAfterSeconds { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? RequiresVerification { get; set; }
}

#endregion
