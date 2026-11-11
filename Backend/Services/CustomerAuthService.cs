using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net.Mail;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using MySqlConnector;

namespace HMS.Services;

#region Customer Auth Domain Exceptions

public class CustomerValidationException : Exception
{
    public CustomerValidationException(string message) : base(message) { }
}

public class CustomerUnauthorizedException : Exception
{
    public CustomerUnauthorizedException(string message) : base(message) { }
}

public class CustomerForbiddenException : Exception
{
    public bool RequiresVerification { get; }
    public CustomerForbiddenException(string message, bool requiresVerification = false) : base(message)
    {
        RequiresVerification = requiresVerification;
    }
}

public class CustomerNotFoundException : Exception
{
    public CustomerNotFoundException(string message) : base(message) { }
}

public class CustomerConflictException : Exception
{
    public CustomerConflictException(string message) : base(message) { }
}

public class CustomerRateLimitException : Exception
{
    public int RetryAfterSeconds { get; }
    public CustomerRateLimitException(string message, int retryAfterSeconds = 60) : base(message)
    {
        RetryAfterSeconds = Math.Max(1, retryAfterSeconds);
    }
}

#endregion

public class CustomerAuthService
{
    public const string PurposeAccountVerify = "ACCOUNT_VERIFY";
    public const string PurposeLoginVerify = "LOGIN_VERIFY";
    public const string PurposePasswordReset = "PASSWORD_RESET";
    public const string CustomerAuthScope = "customer_auth";

    private static readonly Regex BasicEmailRegex = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private readonly AppDbContext _context;
    private readonly SpService _spService;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly AuthRateLimiter _rateLimiter;
    private readonly ICustomerNotificationService _notificationService;
    private readonly ILogger<CustomerAuthService> _logger;

    public CustomerAuthService(
        AppDbContext context,
        SpService spService,
        IConfiguration configuration,
        IHostEnvironment environment,
        AuthRateLimiter rateLimiter,
        ICustomerNotificationService notificationService,
        ILogger<CustomerAuthService> logger)
    {
        _context = context;
        _spService = spService;
        _configuration = configuration;
        _environment = environment;
        _rateLimiter = rateLimiter;
        _notificationService = notificationService;
        _logger = logger;
    }

    #region Configuration Helpers

    private int AccessTokenExpiryMinutes => Math.Max(5, _configuration.GetValue<int>("CustomerAuth:AccessTokenExpiryMinutes", 30));
    private int SessionRefreshTokenExpiryHours => Math.Max(1, _configuration.GetValue<int>("CustomerAuth:SessionRefreshTokenExpiryHours", 24));
    private int RememberMeRefreshTokenExpiryDays => Math.Max(1, _configuration.GetValue<int>("CustomerAuth:RememberMeRefreshTokenExpiryDays", 30));
    private int OtpExpiryMinutes => Math.Max(1, _configuration.GetValue<int>("CustomerAuth:OtpExpiryMinutes", 5));
    private int ResetTokenExpiryMinutes => Math.Max(1, _configuration.GetValue<int>("CustomerAuth:ResetTokenExpiryMinutes", 15));
    private int MaxOtpAttempts => Math.Max(1, _configuration.GetValue<int>("CustomerAuth:MaxOtpAttempts", 5));
    private int OtpResendCooldownSeconds => Math.Max(0, _configuration.GetValue<int>("CustomerAuth:OtpResendCooldownSeconds", 30));
    private int MaxOtpResendsPer15Minutes => Math.Max(1, _configuration.GetValue<int>("CustomerAuth:MaxOtpResendsPer15Minutes", 5));
    private int MaxFailedLoginAttempts => Math.Max(1, _configuration.GetValue<int>("CustomerAuth:MaxFailedLoginAttempts", 5));
    private int LockoutMinutes => Math.Max(1, _configuration.GetValue<int>("CustomerAuth:LockoutMinutes", 15));
    private int LoginRateLimitPer15Minutes => Math.Max(1, _configuration.GetValue<int>("CustomerAuth:LoginRateLimitPer15Minutes", 20));
    private int ForgotPasswordRateLimitPer15Minutes => Math.Max(1, _configuration.GetValue<int>("CustomerAuth:ForgotPasswordRateLimitPer15Minutes", 5));

    private bool ShouldIncludeDevOtp() =>
        _environment.IsDevelopment() &&
        _configuration.GetValue<bool>("CustomerAuth:IncludeDevOtpInResponse", false);

    #endregion

    #region 1. Customer Registration

    public async Task<CustomerRegisterResponseDto> RegisterAsync(
        CustomerRegisterRequestDto? request,
        string? ipAddress,
        string? userAgent)
    {
        if (request == null)
        {
            throw new CustomerValidationException("Registration payload is required.");
        }

        string fullName = request.GetEffectiveFullName();
        string rawEmail = request.GetEffectiveEmail();
        string rawPhone = request.GetEffectivePhone();
        string password = request.Password ?? string.Empty;
        string confirmPassword = request.GetEffectiveConfirmPassword();

        ValidateFullName(fullName);
        string normalizedEmail = ValidateAndNormalizeEmail(rawEmail);
        var (canonicalPhone, phoneKey) = ValidateAndNormalizePhone(rawPhone);
        ValidatePasswordStrength(password, confirmPassword);

        var regIpRate = _rateLimiter.CheckAndConsume(
            $"register-ip:{ipAddress ?? "unknown"}",
            20,
            TimeSpan.FromMinutes(15));
        if (!regIpRate.Allowed)
        {
            throw new CustomerRateLimitException(
                "Too many registration attempts from this network. Please try again later.",
                regIpRate.RetryAfterSeconds);
        }

        // Duplicate Email check against active customers
        bool emailExists = await _context.Customers
            .AsNoTracking()
            .AnyAsync(c => c.DeletedAt == null && c.Email != null && c.Email.ToLower() == normalizedEmail);
        if (emailExists)
        {
            throw new CustomerConflictException("An account or customer profile with this email address is already registered.");
        }

        // Duplicate Normalized Mobile check against active customers
        var existingByPhone = await FindActiveCustomerByPhoneKeyAsync(phoneKey, tracked: false);
        if (existingByPhone != null)
        {
            throw new CustomerConflictException("An account or customer profile with this mobile number is already registered.");
        }

        string passwordHash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11);
        long? branchId = request.GetEffectiveBranchId() is > 0 ? request.GetEffectiveBranchId() : null;
        DateTime utcNow = DateTime.UtcNow;

        string otpCode = GenerateNumericOtp();
        string otpHash = BCrypt.Net.BCrypt.HashPassword(otpCode, workFactor: 10);

        Customer customer = null!;
        var strategy = _context.Database.CreateExecutionStrategy();
        try
        {
            await strategy.ExecuteAsync(async () =>
            {
                _context.ChangeTracker.Clear();
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    customer = new Customer
                    {
                        FullName = fullName,
                        Phone = canonicalPhone,
                        Email = normalizedEmail,
                        PasswordHash = passwordHash,
                        Role = "Customer",
                        IsActive = true,
                        IsVerified = false,
                        VerifiedAt = null,
                        LastLogin = null,
                        RegisteredBranchId = branchId,
                        BranchId = branchId,
                        OutletId = 1,
                        LoyaltyPoints = 0,
                        FailedLoginAttempts = 0,
                        LockoutUntil = null,
                        TokenVersion = 1,
                        DeletedAt = null,
                        CreatedAt = utcNow,
                        UpdatedAt = utcNow
                    };

                    _context.Customers.Add(customer);
                    await _context.SaveChangesAsync();

                    var otpToken = new CustomerOtpToken
                    {
                        CustomerId = customer.CustomerId,
                        Purpose = PurposeAccountVerify,
                        Channel = "EMAIL_AND_PHONE",
                        TargetIdentifier = normalizedEmail,
                        OtpHash = otpHash,
                        ExpiresAt = utcNow.AddMinutes(OtpExpiryMinutes),
                        Attempts = 0,
                        MaxAttempts = MaxOtpAttempts,
                        IpAddress = TrimIp(ipAddress),
                        CreatedAt = utcNow
                    };

                    _context.CustomerOtpTokens.Add(otpToken);
                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            throw new CustomerConflictException("A customer account with this email address or mobile number already exists.");
        }

        try
        {
            await _notificationService.SendOtpNotificationAsync(
                customer.CustomerId,
                customer.FullName,
                customer.Email,
                customer.Phone,
                PurposeAccountVerify,
                otpCode,
                OtpExpiryMinutes);
        }
        catch (CustomerEmailDeliveryException)
        {
            await CleanupFailedRegistrationAsync(customer.CustomerId);
            throw;
        }

        await WriteAuditLogAsync(
            customer.CustomerId,
            "CUSTOMER_REGISTERED",
            "customers",
            customer.CustomerId,
            null,
            new
            {
                customer.CustomerId,
                customer.Role,
                isVerified = false,
                registeredBranchId = customer.RegisteredBranchId,
                userAgent = TrimUserAgent(userAgent)
            },
            ipAddress);

        bool includeDevOtp = ShouldIncludeDevOtp();
        return new CustomerRegisterResponseDto
        {
            Success = true,
            Message = $"Registration successful. Please verify your account using the 6-digit OTP sent to {MaskEmail(normalizedEmail)}. It expires in {OtpExpiryMinutes} minutes.",
            RequiresVerification = true,
            VerificationTarget = normalizedEmail,
            OtpExpiresInMinutes = OtpExpiryMinutes,
            Customer = MapProfileDto(customer),
            DevOtp = includeDevOtp ? otpCode : null
        };
    }

    #endregion

    #region 2. Customer Login

    public async Task<CustomerAuthResponseDto> LoginAsync(
        CustomerLoginRequestDto? request,
        string? ipAddress,
        string? userAgent)
    {
        if (request == null)
        {
            throw new CustomerValidationException("Login payload is required.");
        }

        string identifier = request.GetEffectiveIdentifier();
        string password = request.Password ?? string.Empty;

        if (string.IsNullOrWhiteSpace(identifier))
        {
            throw new CustomerValidationException("Email address or mobile number is required.");
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            throw new CustomerValidationException("Password is required.");
        }

        string normRateKey = NormalizeRateKey(identifier);
        var accountIpRate = _rateLimiter.CheckAndConsume(
            $"login:{ipAddress ?? "unknown"}:{normRateKey}",
            LoginRateLimitPer15Minutes,
            TimeSpan.FromMinutes(15));
        if (!accountIpRate.Allowed)
        {
            throw new CustomerRateLimitException(
                "Too many login attempts. Please wait before trying again.",
                accountIpRate.RetryAfterSeconds);
        }

        var globalIpRate = _rateLimiter.CheckAndConsume(
            $"login-ip:{ipAddress ?? "unknown"}",
            LoginRateLimitPer15Minutes * 2,
            TimeSpan.FromMinutes(15));
        if (!globalIpRate.Allowed)
        {
            throw new CustomerRateLimitException(
                "Too many login attempts from this network. Please wait before trying again.",
                globalIpRate.RetryAfterSeconds);
        }

        Customer? customer = await FindActiveCustomerByIdentifierAsync(identifier, tracked: true);
        DateTime utcNow = DateTime.UtcNow;

        if (customer != null && customer.LockoutUntil.HasValue && customer.LockoutUntil.Value > utcNow)
        {
            int retrySecs = Math.Max(1, (int)Math.Ceiling((customer.LockoutUntil.Value - utcNow).TotalSeconds));
            throw new CustomerRateLimitException(
                $"Account is temporarily locked due to multiple failed login attempts. Try again in {Math.Max(1, (int)Math.Ceiling(retrySecs / 60.0))} minute(s).",
                retrySecs);
        }

        bool passwordValid = customer != null &&
                             !string.IsNullOrWhiteSpace(customer.PasswordHash) &&
                             BCryptVerifySafe(password, customer.PasswordHash);

        if (customer == null || !passwordValid)
        {
            if (customer != null)
            {
                customer.FailedLoginAttempts += 1;
                customer.UpdatedAt = utcNow;

                if (customer.FailedLoginAttempts >= MaxFailedLoginAttempts)
                {
                    customer.LockoutUntil = utcNow.AddMinutes(LockoutMinutes);
                    await _context.SaveChangesAsync();
                    await WriteAuditLogAsync(
                        customer.CustomerId,
                        "CUSTOMER_ACCOUNT_LOCKED",
                        "customers",
                        customer.CustomerId,
                        null,
                        new { failedAttempts = customer.FailedLoginAttempts, lockoutUntil = customer.LockoutUntil },
                        ipAddress);

                    throw new CustomerRateLimitException(
                        $"Too many failed login attempts. Your account is locked for {LockoutMinutes} minutes.",
                        LockoutMinutes * 60);
                }

                await _context.SaveChangesAsync();
                await WriteAuditLogAsync(
                    customer.CustomerId,
                    "CUSTOMER_LOGIN_FAILED",
                    "customers",
                    customer.CustomerId,
                    null,
                    new { failedAttempts = customer.FailedLoginAttempts },
                    ipAddress);
            }

            throw new CustomerUnauthorizedException("Invalid email/mobile number or password.");
        }

        if (!customer.IsActive)
        {
            throw new CustomerForbiddenException(
                "Your customer account has been deactivated. Please contact restaurant support.",
                requiresVerification: false);
        }

        if (string.IsNullOrWhiteSpace(customer.Email))
        {
            throw new CustomerValidationException(
                "No email address is registered for this customer account to receive the login OTP.");
        }

        string otpPurpose = customer.IsVerified ? PurposeLoginVerify : PurposeAccountVerify;

        // Clear password lockout counters; LastLogin updates once the login OTP is verified.
        customer.FailedLoginAttempts = 0;
        customer.LockoutUntil = null;
        customer.UpdatedAt = utcNow;

        var priorActiveOtps = await _context.CustomerOtpTokens
            .Where(t => t.CustomerId == customer.CustomerId &&
                        t.Purpose == otpPurpose &&
                        t.InvalidatedAt == null)
            .ToListAsync();
        foreach (var prior in priorActiveOtps)
        {
            prior.InvalidatedAt = utcNow;
        }

        string otpCode = GenerateNumericOtp();
        string otpHash = BCrypt.Net.BCrypt.HashPassword(otpCode, workFactor: 10);

        var loginOtpToken = new CustomerOtpToken
        {
            CustomerId = customer.CustomerId,
            Purpose = otpPurpose,
            Channel = "EMAIL",
            TargetIdentifier = customer.Email.Trim().ToLowerInvariant(),
            OtpHash = otpHash,
            ExpiresAt = utcNow.AddMinutes(OtpExpiryMinutes),
            Attempts = 0,
            MaxAttempts = MaxOtpAttempts,
            IpAddress = TrimIp(ipAddress),
            CreatedAt = utcNow
        };

        _context.CustomerOtpTokens.Add(loginOtpToken);
        await _context.SaveChangesAsync();

        try
        {
            await _notificationService.SendOtpNotificationAsync(
                customer.CustomerId,
                customer.FullName,
                customer.Email,
                customer.Phone,
                otpPurpose,
                otpCode,
                OtpExpiryMinutes);
        }
        catch (CustomerEmailDeliveryException)
        {
            loginOtpToken.InvalidatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            throw;
        }

        await WriteAuditLogAsync(
            customer.CustomerId,
            "CUSTOMER_LOGIN_OTP_SENT",
            "customer_otp_tokens",
            loginOtpToken.OtpId,
            null,
            new { purpose = otpPurpose, rememberMe = request.RememberMe, userAgent = TrimUserAgent(userAgent) },
            ipAddress);

        bool includeDevOtp = ShouldIncludeDevOtp();
        return new CustomerAuthResponseDto
        {
            Success = true,
            Message = $"A 6-digit verification OTP has been sent to {MaskEmail(customer.Email)}. It expires in {OtpExpiryMinutes} minutes.",
            Token = null,
            AccessToken = null,
            TokenType = "Bearer",
            ExpiresAt = null,
            ExpiresInSeconds = null,
            RefreshToken = null,
            RefreshTokenExpiresAt = null,
            RememberMe = request.RememberMe,
            RequiresVerification = true,
            VerificationTarget = customer.Email,
            Purpose = otpPurpose,
            OtpExpiresInMinutes = OtpExpiryMinutes,
            ResendAfterSeconds = OtpResendCooldownSeconds,
            DevOtp = includeDevOtp ? otpCode : null,
            Customer = MapProfileDto(customer)
        };
    }

    #endregion

    #region 3. OTP Verification & Resend

    public async Task<CustomerOtpResponseDto> VerifyOtpAsync(
        CustomerVerifyOtpRequestDto? request,
        string? ipAddress,
        string? userAgent)
    {
        if (request == null)
        {
            throw new CustomerValidationException("OTP verification payload is required.");
        }

        string identifier = request.GetEffectiveIdentifier();
        string otp = request.GetEffectiveOtp();
        string? explicitPurpose = string.IsNullOrWhiteSpace(request.Purpose)
            ? null
            : NormalizePurpose(request.Purpose);

        if (string.IsNullOrWhiteSpace(identifier))
        {
            throw new CustomerValidationException("Email address or mobile number is required.");
        }

        if (string.IsNullOrWhiteSpace(otp) || otp.Length != 6 || !otp.All(char.IsDigit))
        {
            throw new CustomerValidationException("A valid 6-digit OTP code is required.");
        }

        var verifyRate = _rateLimiter.CheckAndConsume(
            $"verify-otp:{ipAddress ?? "unknown"}:{NormalizeRateKey(identifier)}",
            25,
            TimeSpan.FromMinutes(15));
        if (!verifyRate.Allowed)
        {
            throw new CustomerRateLimitException(
                "Too many OTP verification attempts. Please try again later.",
                verifyRate.RetryAfterSeconds);
        }

        Customer? customer = await FindActiveCustomerByIdentifierAsync(identifier, tracked: true);
        string purpose = explicitPurpose
            ?? (customer != null && customer.IsVerified ? PurposeLoginVerify : PurposeAccountVerify);

        if (customer == null)
        {
            if (purpose == PurposeAccountVerify)
            {
                throw new CustomerNotFoundException("No customer account found for the provided email or mobile number.");
            }
            throw new CustomerValidationException("Invalid or expired OTP.");
        }

        if (!customer.IsActive)
        {
            throw new CustomerForbiddenException("Your customer account is inactive.");
        }

        if (purpose == PurposeAccountVerify && customer.IsVerified)
        {
            throw new CustomerValidationException("Account is already verified. Please sign in.");
        }

        DateTime utcNow = DateTime.UtcNow;

        var token = await _context.CustomerOtpTokens
            .Where(t => t.CustomerId == customer.CustomerId &&
                        t.Purpose == purpose &&
                        t.UsedAt == null &&
                        t.InvalidatedAt == null)
            .OrderByDescending(t => t.OtpId)
            .FirstOrDefaultAsync();

        if (token == null || token.VerifiedAt != null)
        {
            throw new CustomerValidationException("No active unverified OTP found or OTP has already been used. Please request a new OTP.");
        }

        if (utcNow > token.ExpiresAt)
        {
            token.InvalidatedAt = utcNow;
            await _context.SaveChangesAsync();
            throw new CustomerValidationException("OTP has expired. Please request a new OTP.");
        }

        if (token.Attempts >= token.MaxAttempts)
        {
            token.InvalidatedAt = utcNow;
            await _context.SaveChangesAsync();
            throw new CustomerRateLimitException("Maximum OTP verification attempts exceeded. Please request a new OTP.", 60);
        }

        bool validOtp = BCryptVerifySafe(otp, token.OtpHash);
        if (!validOtp)
        {
            token.Attempts += 1;
            if (token.Attempts >= token.MaxAttempts)
            {
                token.InvalidatedAt = utcNow;
            }
            await _context.SaveChangesAsync();

            await WriteAuditLogAsync(
                customer.CustomerId,
                "CUSTOMER_OTP_FAILED",
                "customer_otp_tokens",
                token.OtpId,
                null,
                new { purpose, attempts = token.Attempts },
                ipAddress);

            if (token.Attempts >= token.MaxAttempts)
            {
                throw new CustomerRateLimitException("Maximum OTP verification attempts exceeded. Please request a new OTP.", 60);
            }

            int remaining = Math.Max(0, token.MaxAttempts - token.Attempts);
            throw new CustomerValidationException($"Invalid OTP code. {remaining} attempt(s) remaining.");
        }

        if (purpose == PurposeAccountVerify || purpose == PurposeLoginVerify)
        {
            token.VerifiedAt = utcNow;
            token.UsedAt = utcNow;
            token.InvalidatedAt = utcNow;

            var siblingTokens = await _context.CustomerOtpTokens
                .Where(t => t.CustomerId == customer.CustomerId &&
                            t.Purpose == purpose &&
                            t.OtpId != token.OtpId &&
                            t.InvalidatedAt == null)
                .ToListAsync();
            foreach (var sib in siblingTokens)
            {
                sib.InvalidatedAt = utcNow;
            }

            if (purpose == PurposeAccountVerify)
            {
                customer.IsVerified = true;
                customer.VerifiedAt ??= utcNow;
            }

            customer.FailedLoginAttempts = 0;
            customer.LockoutUntil = null;
            customer.LastLogin = utcNow;
            customer.UpdatedAt = utcNow;

            var session = CreateCustomerSessionPair(customer, request.RememberMe, utcNow, ipAddress, userAgent);
            _context.CustomerRefreshTokens.Add(session.RefreshTokenEntity);
            await _context.SaveChangesAsync();

            await WriteAuditLogAsync(
                customer.CustomerId,
                purpose == PurposeLoginVerify ? "CUSTOMER_LOGIN_OTP_VERIFIED" : "CUSTOMER_ACCOUNT_VERIFIED",
                purpose == PurposeLoginVerify ? "customer_otp_tokens" : "customers",
                purpose == PurposeLoginVerify ? token.OtpId : customer.CustomerId,
                null,
                new
                {
                    purpose,
                    otpId = token.OtpId,
                    sessionId = session.FamilyId,
                    rememberMe = request.RememberMe,
                    userAgent = TrimUserAgent(userAgent)
                },
                ipAddress);

            return new CustomerOtpResponseDto
            {
                Success = true,
                Message = purpose == PurposeLoginVerify
                    ? "Login OTP verified successfully. You are now signed in."
                    : "Account verified successfully. You are now signed in.",
                Purpose = purpose,
                Verified = true,
                RequiresVerification = false,
                Token = session.AccessToken,
                AccessToken = session.AccessToken,
                TokenType = "Bearer",
                ExpiresAt = session.AccessExpiresAt,
                ExpiresInSeconds = AccessTokenExpiryMinutes * 60,
                RefreshToken = session.RawRefreshToken,
                RefreshTokenExpiresAt = session.RefreshExpiresAt,
                RememberMe = request.RememberMe,
                Customer = MapProfileDto(customer)
            };
        }
        else
        {
            string rawResetToken = GenerateSecureToken();
            token.VerifiedAt = utcNow;
            token.ResetTokenHash = ComputeSha256Hex(rawResetToken);
            token.ExpiresAt = utcNow.AddMinutes(ResetTokenExpiryMinutes);
            await _context.SaveChangesAsync();

            await WriteAuditLogAsync(
                customer.CustomerId,
                "CUSTOMER_RESET_OTP_VERIFIED",
                "customer_otp_tokens",
                token.OtpId,
                null,
                new { purpose = PurposePasswordReset },
                ipAddress);

            return new CustomerOtpResponseDto
            {
                Success = true,
                Message = "OTP verified. Use the reset token to set a new password.",
                Purpose = PurposePasswordReset,
                Verified = true,
                RequiresVerification = false,
                ExpiresInMinutes = ResetTokenExpiryMinutes,
                ResetToken = rawResetToken
            };
        }
    }

    public async Task<CustomerOtpResponseDto> ResendOtpAsync(
        CustomerResendOtpRequestDto? request,
        string? ipAddress)
    {
        if (request == null)
        {
            throw new CustomerValidationException("Resend OTP payload is required.");
        }

        string identifier = request.GetEffectiveIdentifier();
        string? explicitPurpose = string.IsNullOrWhiteSpace(request.Purpose)
            ? null
            : NormalizePurpose(request.Purpose);

        if (string.IsNullOrWhiteSpace(identifier))
        {
            throw new CustomerValidationException("Email address or mobile number is required.");
        }

        var ipRate = _rateLimiter.CheckAndConsume(
            $"resend-otp-ip:{ipAddress ?? "unknown"}",
            MaxOtpResendsPer15Minutes * 3,
            TimeSpan.FromMinutes(15));
        if (!ipRate.Allowed)
        {
            throw new CustomerRateLimitException(
                "Too many OTP requests from this network. Please try again later.",
                ipRate.RetryAfterSeconds);
        }

        Customer? customer = await FindActiveCustomerByIdentifierAsync(identifier, tracked: true);
        string purpose = explicitPurpose
            ?? (customer != null && customer.IsVerified ? PurposeLoginVerify : PurposeAccountVerify);

        if (purpose == PurposePasswordReset && (customer == null || !customer.IsActive))
        {
            // Preserve non-enumeration for password reset
            return new CustomerOtpResponseDto
            {
                Success = true,
                Message = "If an active account exists for the provided details, a new verification code has been sent.",
                Purpose = PurposePasswordReset,
                Verified = false,
                ExpiresInMinutes = OtpExpiryMinutes,
                ResendAfterSeconds = OtpResendCooldownSeconds
            };
        }

        if (customer == null)
        {
            throw new CustomerNotFoundException("No customer account found for the provided email or mobile number.");
        }

        if (!customer.IsActive)
        {
            throw new CustomerForbiddenException("Your customer account is inactive.");
        }

        if (purpose == PurposeAccountVerify && customer.IsVerified)
        {
            throw new CustomerValidationException("Account is already verified. Please sign in.");
        }

        if (string.IsNullOrWhiteSpace(customer.Email) && purpose != PurposePasswordReset)
        {
            throw new CustomerValidationException(
                "No email address is registered for this customer account to receive the OTP.");
        }

        DateTime utcNow = DateTime.UtcNow;

        var latestToken = await _context.CustomerOtpTokens
            .AsNoTracking()
            .Where(t => t.CustomerId == customer.CustomerId && t.Purpose == purpose)
            .OrderByDescending(t => t.OtpId)
            .FirstOrDefaultAsync();

        if (purpose == PurposeLoginVerify)
        {
            if (latestToken == null ||
                latestToken.UsedAt != null ||
                latestToken.CreatedAt < utcNow.AddMinutes(-15))
            {
                throw new CustomerValidationException(
                    "No active login OTP session found. Please sign in with your password first.");
            }
        }

        if (latestToken != null && OtpResendCooldownSeconds > 0)
        {
            double elapsedSeconds = (utcNow - latestToken.CreatedAt).TotalSeconds;
            if (elapsedSeconds < OtpResendCooldownSeconds)
            {
                int waitSeconds = Math.Max(1, (int)Math.Ceiling(OtpResendCooldownSeconds - elapsedSeconds));
                throw new CustomerRateLimitException(
                    $"Please wait {waitSeconds} second(s) before requesting another OTP.",
                    waitSeconds);
            }
        }

        DateTime windowStart = utcNow.AddMinutes(-15);
        int recentCount = await _context.CustomerOtpTokens
            .AsNoTracking()
            .CountAsync(t => t.CustomerId == customer.CustomerId && t.Purpose == purpose && t.CreatedAt >= windowStart);

        if (recentCount >= MaxOtpResendsPer15Minutes)
        {
            throw new CustomerRateLimitException(
                "Maximum OTP resend limit reached for this window. Please try again later.",
                300);
        }

        // Invalidate all previous uninvalidated OTPs for this customer & purpose
        var previousActive = await _context.CustomerOtpTokens
            .Where(t => t.CustomerId == customer.CustomerId && t.Purpose == purpose && t.InvalidatedAt == null)
            .ToListAsync();
        foreach (var prev in previousActive)
        {
            prev.InvalidatedAt = utcNow;
        }

        string otpCode = GenerateNumericOtp();
        string otpHash = BCrypt.Net.BCrypt.HashPassword(otpCode, workFactor: 10);
        string? rawResetToken = purpose == PurposePasswordReset ? GenerateSecureToken() : null;
        int expiryMins = OtpExpiryMinutes;

        var newToken = new CustomerOtpToken
        {
            CustomerId = customer.CustomerId,
            Purpose = purpose,
            Channel = "EMAIL",
            TargetIdentifier = (customer.Email ?? customer.Phone).Trim().ToLowerInvariant(),
            OtpHash = otpHash,
            ResetTokenHash = rawResetToken != null ? ComputeSha256Hex(rawResetToken) : null,
            ExpiresAt = utcNow.AddMinutes(expiryMins),
            Attempts = 0,
            MaxAttempts = MaxOtpAttempts,
            IpAddress = TrimIp(ipAddress),
            CreatedAt = utcNow
        };

        _context.CustomerOtpTokens.Add(newToken);
        await _context.SaveChangesAsync();

        try
        {
            await _notificationService.SendOtpNotificationAsync(
                customer.CustomerId,
                customer.FullName,
                customer.Email,
                customer.Phone,
                purpose,
                otpCode,
                expiryMins);
        }
        catch (CustomerEmailDeliveryException)
        {
            newToken.InvalidatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            throw;
        }

        await WriteAuditLogAsync(
            customer.CustomerId,
            "CUSTOMER_OTP_RESENT",
            "customer_otp_tokens",
            newToken.OtpId,
            null,
            new { purpose, resendCount15m = recentCount + 1 },
            ipAddress);

        bool includeDevOtp = ShouldIncludeDevOtp();
        return new CustomerOtpResponseDto
        {
            Success = true,
            Message = $"A new 6-digit verification OTP has been sent to {MaskEmail(customer.Email)}. It expires in {expiryMins} minutes.",
            Purpose = purpose,
            Verified = false,
            RequiresVerification = purpose == PurposeAccountVerify || purpose == PurposeLoginVerify,
            ExpiresInMinutes = expiryMins,
            ResendAfterSeconds = OtpResendCooldownSeconds,
            DevOtp = includeDevOtp ? otpCode : null,
            DevResetToken = includeDevOtp ? rawResetToken : null
        };
    }

    #endregion

    #region 4. Forgot & Reset Password

    public async Task<CustomerOtpResponseDto> ForgotPasswordAsync(
        CustomerForgotPasswordRequestDto? request,
        string? ipAddress)
    {
        if (request == null)
        {
            throw new CustomerValidationException("Forgot password payload is required.");
        }

        string identifier = request.GetEffectiveIdentifier();
        if (string.IsNullOrWhiteSpace(identifier))
        {
            throw new CustomerValidationException("Registered email address or mobile number is required.");
        }

        string normKey = NormalizeRateKey(identifier);
        var rateDecision = _rateLimiter.CheckAndConsume(
            $"forgot:{ipAddress ?? "unknown"}:{normKey}",
            ForgotPasswordRateLimitPer15Minutes,
            TimeSpan.FromMinutes(15));
        if (!rateDecision.Allowed)
        {
            throw new CustomerRateLimitException(
                "Too many password reset requests. Please try again later.",
                rateDecision.RetryAfterSeconds);
        }

        var ipWideRate = _rateLimiter.CheckAndConsume(
            $"forgot-ip:{ipAddress ?? "unknown"}",
            ForgotPasswordRateLimitPer15Minutes * 2,
            TimeSpan.FromMinutes(15));
        if (!ipWideRate.Allowed)
        {
            throw new CustomerRateLimitException(
                "Too many password reset requests from this network. Please try again later.",
                ipWideRate.RetryAfterSeconds);
        }

        const string genericMessage =
            "If an account exists for the provided email or mobile number, password reset instructions have been sent.";

        Customer? customer = await FindActiveCustomerByIdentifierAsync(identifier, tracked: true);
        if (customer == null || !customer.IsActive)
        {
            return new CustomerOtpResponseDto
            {
                Success = true,
                Message = genericMessage,
                Purpose = PurposePasswordReset,
                Verified = false,
                ExpiresInMinutes = OtpExpiryMinutes,
                ResendAfterSeconds = OtpResendCooldownSeconds
            };
        }

        DateTime utcNow = DateTime.UtcNow;

        var existingResetTokens = await _context.CustomerOtpTokens
            .Where(t => t.CustomerId == customer.CustomerId &&
                        t.Purpose == PurposePasswordReset &&
                        t.InvalidatedAt == null)
            .ToListAsync();
        foreach (var prev in existingResetTokens)
        {
            prev.InvalidatedAt = utcNow;
        }

        string otpCode = GenerateNumericOtp();
        string otpHash = BCrypt.Net.BCrypt.HashPassword(otpCode, workFactor: 10);
        string rawResetToken = GenerateSecureToken();
        string resetTokenHash = ComputeSha256Hex(rawResetToken);

        var resetRow = new CustomerOtpToken
        {
            CustomerId = customer.CustomerId,
            Purpose = PurposePasswordReset,
            Channel = string.IsNullOrWhiteSpace(request.Channel) ? "EMAIL" : request.Channel.Trim().ToUpperInvariant(),
            TargetIdentifier = (customer.Email ?? customer.Phone).Trim().ToLowerInvariant(),
            OtpHash = otpHash,
            ResetTokenHash = resetTokenHash,
            ExpiresAt = utcNow.AddMinutes(OtpExpiryMinutes),
            Attempts = 0,
            MaxAttempts = MaxOtpAttempts,
            IpAddress = TrimIp(ipAddress),
            CreatedAt = utcNow
        };

        _context.CustomerOtpTokens.Add(resetRow);
        await _context.SaveChangesAsync();

        try
        {
            await _notificationService.SendOtpNotificationAsync(
                customer.CustomerId,
                customer.FullName,
                customer.Email,
                customer.Phone,
                PurposePasswordReset,
                otpCode,
                OtpExpiryMinutes);
        }
        catch (CustomerEmailDeliveryException)
        {
            resetRow.InvalidatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            throw;
        }

        await WriteAuditLogAsync(
            customer.CustomerId,
            "CUSTOMER_FORGOT_PASSWORD_REQUESTED",
            "customer_otp_tokens",
            resetRow.OtpId,
            null,
            new { purpose = PurposePasswordReset, expiresAt = resetRow.ExpiresAt },
            ipAddress);

        bool includeDevOtp = ShouldIncludeDevOtp();
        return new CustomerOtpResponseDto
        {
            Success = true,
            Message = genericMessage,
            Purpose = PurposePasswordReset,
            Verified = false,
            ExpiresInMinutes = OtpExpiryMinutes,
            ResendAfterSeconds = OtpResendCooldownSeconds,
            DevOtp = includeDevOtp ? otpCode : null,
            DevResetToken = includeDevOtp ? rawResetToken : null
        };
    }

    public async Task<CustomerActionResultDto> ResetPasswordAsync(
        CustomerResetPasswordRequestDto? request,
        string? ipAddress)
    {
        if (request == null)
        {
            throw new CustomerValidationException("Reset password payload is required.");
        }

        string newPassword = request.GetEffectiveNewPassword();
        string confirmPassword = request.GetEffectiveConfirmPassword();
        string rawToken = request.GetEffectiveResetToken();
        string rawOtp = request.GetEffectiveOtp();
        string identifier = request.GetEffectiveIdentifier();

        ValidatePasswordStrength(newPassword, confirmPassword);

        bool usingResetToken = !string.IsNullOrWhiteSpace(rawToken);
        bool usingOtp = !string.IsNullOrWhiteSpace(identifier) && !string.IsNullOrWhiteSpace(rawOtp);
        if (!usingResetToken && !usingOtp)
        {
            throw new CustomerValidationException("Provide either a valid resetToken or both identifier (email/mobile) and 6-digit OTP.");
        }

        var resetRate = _rateLimiter.CheckAndConsume(
            $"reset-pw:{ipAddress ?? "unknown"}:{(usingResetToken ? "token" : NormalizeRateKey(identifier))}",
            15,
            TimeSpan.FromMinutes(15));
        if (!resetRate.Allowed)
        {
            throw new CustomerRateLimitException(
                "Too many password reset attempts. Please try again later.",
                resetRate.RetryAfterSeconds);
        }

        DateTime utcNow = DateTime.UtcNow;
        Customer? customer;
        CustomerOtpToken? otpRow;

        if (usingResetToken)
        {
            string tokenHash = ComputeSha256Hex(rawToken);
            otpRow = await _context.CustomerOtpTokens
                .Where(t => t.Purpose == PurposePasswordReset && t.ResetTokenHash == tokenHash)
                .OrderByDescending(t => t.OtpId)
                .FirstOrDefaultAsync();

            if (otpRow == null || otpRow.UsedAt != null || otpRow.InvalidatedAt != null)
            {
                throw new CustomerValidationException("Password reset token is invalid or has already been used.");
            }

            if (utcNow > otpRow.ExpiresAt)
            {
                otpRow.InvalidatedAt = utcNow;
                await _context.SaveChangesAsync();
                throw new CustomerValidationException("Password reset token has expired. Please request a new password reset.");
            }

            customer = await _context.Customers.FirstOrDefaultAsync(c => c.CustomerId == otpRow.CustomerId && c.DeletedAt == null);
            if (customer == null)
            {
                throw new CustomerValidationException("Invalid password reset request.");
            }

            if (!customer.IsActive)
            {
                throw new CustomerForbiddenException("Your customer account is inactive.");
            }
        }
        else
        {
            if (rawOtp.Length != 6 || !rawOtp.All(char.IsDigit))
            {
                throw new CustomerValidationException("A valid 6-digit OTP is required.");
            }

            customer = await FindActiveCustomerByIdentifierAsync(identifier, tracked: true);
            if (customer == null)
            {
                throw new CustomerValidationException("Invalid or expired password reset OTP.");
            }

            if (!customer.IsActive)
            {
                throw new CustomerForbiddenException("Your customer account is inactive.");
            }

            otpRow = await _context.CustomerOtpTokens
                .Where(t => t.CustomerId == customer.CustomerId &&
                            t.Purpose == PurposePasswordReset &&
                            t.UsedAt == null &&
                            t.InvalidatedAt == null)
                .OrderByDescending(t => t.OtpId)
                .FirstOrDefaultAsync();

            if (otpRow == null)
            {
                throw new CustomerValidationException("No active password reset request found or token has already been used.");
            }

            if (utcNow > otpRow.ExpiresAt)
            {
                otpRow.InvalidatedAt = utcNow;
                await _context.SaveChangesAsync();
                throw new CustomerValidationException("Password reset OTP has expired. Please request a new password reset.");
            }

            if (otpRow.Attempts >= otpRow.MaxAttempts)
            {
                otpRow.InvalidatedAt = utcNow;
                await _context.SaveChangesAsync();
                throw new CustomerRateLimitException("Maximum OTP verification attempts exceeded. Please request a new password reset.", 60);
            }

            if (!BCryptVerifySafe(rawOtp, otpRow.OtpHash))
            {
                otpRow.Attempts += 1;
                if (otpRow.Attempts >= otpRow.MaxAttempts)
                {
                    otpRow.InvalidatedAt = utcNow;
                }
                await _context.SaveChangesAsync();

                if (otpRow.Attempts >= otpRow.MaxAttempts)
                {
                    throw new CustomerRateLimitException("Maximum OTP verification attempts exceeded. Please request a new password reset.", 60);
                }
                throw new CustomerValidationException("Invalid password reset OTP.");
            }
        }

        long targetCustomerId = customer.CustomerId;
        long targetOtpId = otpRow.OtpId;
        string newPasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword, workFactor: 11);
        int updatedTokenVersion = customer.TokenVersion;
        string targetFullName = customer.FullName;
        string? targetEmail = customer.Email;
        string targetPhone = customer.Phone;

        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            _context.ChangeTracker.Clear();
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var custTx = await _context.Customers.FirstAsync(c => c.CustomerId == targetCustomerId);
                var otpTx = await _context.CustomerOtpTokens.FirstAsync(t => t.OtpId == targetOtpId);

                custTx.PasswordHash = newPasswordHash;
                custTx.TokenVersion += 1;
                custTx.FailedLoginAttempts = 0;
                custTx.LockoutUntil = null;
                custTx.UpdatedAt = utcNow;
                updatedTokenVersion = custTx.TokenVersion;

                otpTx.VerifiedAt ??= utcNow;
                otpTx.UsedAt = utcNow;
                otpTx.InvalidatedAt = utcNow;

                var remainingResetTokens = await _context.CustomerOtpTokens
                    .Where(t => t.CustomerId == targetCustomerId &&
                                t.Purpose == PurposePasswordReset &&
                                t.OtpId != targetOtpId &&
                                t.InvalidatedAt == null)
                    .ToListAsync();
                foreach (var rem in remainingResetTokens)
                {
                    rem.InvalidatedAt = utcNow;
                }

                var activeRefreshTokens = await _context.CustomerRefreshTokens
                    .Where(rt => rt.CustomerId == targetCustomerId && rt.RevokedAt == null)
                    .ToListAsync();
                foreach (var rt in activeRefreshTokens)
                {
                    rt.RevokedAt = utcNow;
                    rt.RevokedReason = "PasswordReset";
                    rt.RevokedByIp = TrimIp(ipAddress);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });

        await _notificationService.SendPasswordChangedNoticeAsync(
            targetCustomerId,
            targetFullName,
            targetEmail,
            targetPhone);

        await WriteAuditLogAsync(
            targetCustomerId,
            "CUSTOMER_PASSWORD_RESET",
            "customers",
            targetCustomerId,
            null,
            new { newTokenVersion = updatedTokenVersion },
            ipAddress);

        return new CustomerActionResultDto
        {
            Success = true,
            Message = "Password reset successful. All existing sessions have been signed out; please sign in with your new password."
        };
    }

    #endregion

    #region 5. Refresh Token & Logout

    public async Task<CustomerAuthResponseDto> RefreshTokenAsync(
        CustomerRefreshTokenRequestDto? request,
        string? ipAddress,
        string? userAgent)
    {
        string rawRefresh = request?.GetEffectiveRefreshToken() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(rawRefresh))
        {
            throw new CustomerUnauthorizedException("Refresh token is required.");
        }

        string tokenHash = ComputeSha256Hex(rawRefresh);
        DateTime utcNow = DateTime.UtcNow;

        var existing = await _context.CustomerRefreshTokens
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash);

        if (existing == null)
        {
            throw new CustomerUnauthorizedException("Invalid refresh token.");
        }

        if (existing.RevokedAt != null)
        {
            // Reuse/replay detection: revoke the entire token family immediately
            var familyTokens = await _context.CustomerRefreshTokens
                .Where(rt => rt.FamilyId == existing.FamilyId && rt.RevokedAt == null)
                .ToListAsync();
            foreach (var ft in familyTokens)
            {
                ft.RevokedAt = utcNow;
                ft.RevokedReason = "ReuseDetected";
                ft.RevokedByIp = TrimIp(ipAddress);
            }
            if (familyTokens.Count > 0)
            {
                await _context.SaveChangesAsync();
            }

            await WriteAuditLogAsync(
                existing.CustomerId,
                "CUSTOMER_REFRESH_REUSE_DETECTED",
                "customer_refresh_tokens",
                existing.RefreshTokenId,
                null,
                new { familyId = existing.FamilyId, originalReason = existing.RevokedReason },
                ipAddress);

            throw new CustomerUnauthorizedException("Refresh token has already been used or revoked. Session family terminated.");
        }

        if (existing.ExpiresAt <= utcNow)
        {
            existing.RevokedAt = utcNow;
            existing.RevokedReason = "Expired";
            existing.RevokedByIp = TrimIp(ipAddress);
            await _context.SaveChangesAsync();
            throw new CustomerUnauthorizedException("Refresh token has expired. Please sign in again.");
        }

        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.CustomerId == existing.CustomerId && c.DeletedAt == null);

        if (customer == null)
        {
            throw new CustomerUnauthorizedException("Customer account not found for refresh token.");
        }

        if (!customer.IsActive)
        {
            throw new CustomerForbiddenException("Your customer account is inactive.");
        }

        if (!customer.IsVerified)
        {
            throw new CustomerForbiddenException("Your customer account is not verified.", requiresVerification: true);
        }

        string newRawRefresh = GenerateSecureToken();
        string newRefreshHash = ComputeSha256Hex(newRawRefresh);
        DateTime newRefreshExpiry = ComputeRefreshExpiry(utcNow, existing.RememberMe);

        existing.RevokedAt = utcNow;
        existing.RevokedReason = "Rotated";
        existing.ReplacedByTokenHash = newRefreshHash;
        existing.RevokedByIp = TrimIp(ipAddress);

        var replacement = new CustomerRefreshToken
        {
            CustomerId = customer.CustomerId,
            TokenHash = newRefreshHash,
            FamilyId = existing.FamilyId,
            RememberMe = existing.RememberMe,
            ExpiresAt = newRefreshExpiry,
            CreatedByIp = TrimIp(ipAddress),
            UserAgent = TrimUserAgent(userAgent),
            CreatedAt = utcNow
        };
        _context.CustomerRefreshTokens.Add(replacement);
        await _context.SaveChangesAsync();

        var (accessToken, accessExpiresAt) = GenerateCustomerAccessJwt(customer, existing.FamilyId, utcNow);

        return new CustomerAuthResponseDto
        {
            Success = true,
            Message = "Access token refreshed successfully.",
            Token = accessToken,
            AccessToken = accessToken,
            TokenType = "Bearer",
            ExpiresAt = accessExpiresAt,
            ExpiresInSeconds = AccessTokenExpiryMinutes * 60,
            RefreshToken = newRawRefresh,
            RefreshTokenExpiresAt = newRefreshExpiry,
            RememberMe = existing.RememberMe,
            RequiresVerification = false,
            Customer = MapProfileDto(customer)
        };
    }

    public async Task<CustomerActionResultDto> LogoutAsync(
        CustomerLogoutRequestDto? request,
        ClaimsPrincipal? user,
        string? ipAddress)
    {
        string rawRefresh = request?.GetEffectiveRefreshToken() ?? string.Empty;
        bool logoutAll = request?.LogoutAllSessions ?? false;

        long? authCustomerId = null;
        string? authSessionId = null;
        if (IsCustomerAuthPrincipal(user) &&
            long.TryParse(user?.FindFirstValue("customerId"), out var parsedCid) &&
            parsedCid > 0)
        {
            authCustomerId = parsedCid;
            authSessionId = user?.FindFirstValue("sessionId");
        }

        DateTime utcNow = DateTime.UtcNow;
        long? targetCustomerId = authCustomerId;
        string? targetFamilyId = authSessionId;

        if (!string.IsNullOrWhiteSpace(rawRefresh))
        {
            string tokenHash = ComputeSha256Hex(rawRefresh);
            var tokenRow = await _context.CustomerRefreshTokens
                .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash);

            if (tokenRow == null)
            {
                if (!authCustomerId.HasValue)
                {
                    throw new CustomerUnauthorizedException("Invalid refresh token or unauthenticated session.");
                }
            }
            else
            {
                if (tokenRow.RevokedAt != null && !authCustomerId.HasValue)
                {
                    throw new CustomerUnauthorizedException("Session has already been logged out or revoked.");
                }

                targetCustomerId ??= tokenRow.CustomerId;
                targetFamilyId ??= tokenRow.FamilyId;

                if (authCustomerId.HasValue && tokenRow.CustomerId != authCustomerId.Value)
                {
                    throw new CustomerForbiddenException("Refresh token does not belong to the authenticated customer.");
                }
            }
        }

        if (!targetCustomerId.HasValue)
        {
            throw new CustomerUnauthorizedException("Authentication or valid refresh token is required to log out.");
        }

        List<CustomerRefreshToken> tokensToRevoke;
        if (logoutAll || string.IsNullOrWhiteSpace(targetFamilyId))
        {
            tokensToRevoke = await _context.CustomerRefreshTokens
                .Where(rt => rt.CustomerId == targetCustomerId.Value && rt.RevokedAt == null)
                .ToListAsync();
        }
        else
        {
            tokensToRevoke = await _context.CustomerRefreshTokens
                .Where(rt => rt.CustomerId == targetCustomerId.Value &&
                             rt.FamilyId == targetFamilyId &&
                             rt.RevokedAt == null)
                .ToListAsync();
        }

        foreach (var rt in tokensToRevoke)
        {
            rt.RevokedAt = utcNow;
            rt.RevokedReason = "UserLogout";
            rt.RevokedByIp = TrimIp(ipAddress);
        }

        if (tokensToRevoke.Count > 0)
        {
            await _context.SaveChangesAsync();
        }

        await WriteAuditLogAsync(
            targetCustomerId.Value,
            "CUSTOMER_LOGOUT",
            "customer_refresh_tokens",
            targetCustomerId.Value,
            null,
            new { familyId = targetFamilyId, logoutAll, revokedCount = tokensToRevoke.Count },
            ipAddress);

        return new CustomerActionResultDto
        {
            Success = true,
            Message = "Logged out successfully. Active session has been revoked."
        };
    }

    #endregion

    #region 6. Customer Profile

    public async Task<CustomerProfileDto> GetProfileAsync(long customerId)
    {
        var customer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.CustomerId == customerId && c.DeletedAt == null);

        if (customer == null)
        {
            throw new CustomerNotFoundException("Customer profile was not found.");
        }

        if (!customer.IsActive)
        {
            throw new CustomerForbiddenException("Customer account is inactive.");
        }

        if (!customer.IsVerified)
        {
            throw new CustomerForbiddenException("Customer account is not verified.", requiresVerification: true);
        }

        return MapProfileDto(customer);
    }

    public static bool IsCustomerAuthPrincipal(ClaimsPrincipal? user)
    {
        if (user == null || user.Identity?.IsAuthenticated != true) return false;
        string? scope = user.FindFirstValue("tokenScope");
        string? accountType = user.FindFirstValue("accountType");
        string? role = user.FindFirstValue(ClaimTypes.Role) ?? user.FindFirstValue("roleName");

        return string.Equals(scope, CustomerAuthScope, StringComparison.OrdinalIgnoreCase) &&
               (string.Equals(accountType, "Customer", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(role, "Customer", StringComparison.OrdinalIgnoreCase));
    }

    #endregion

    #region Private Token, Lookup, Validation & Audit Helpers

    private (
        string AccessToken,
        DateTime AccessExpiresAt,
        string RawRefreshToken,
        DateTime RefreshExpiresAt,
        string FamilyId,
        CustomerRefreshToken RefreshTokenEntity) CreateCustomerSessionPair(
        Customer customer,
        bool rememberMe,
        DateTime utcNow,
        string? ipAddress,
        string? userAgent)
    {
        string familyId = Guid.NewGuid().ToString("N");
        var (accessToken, accessExpiresAt) = GenerateCustomerAccessJwt(customer, familyId, utcNow);

        string rawRefresh = GenerateSecureToken();
        DateTime refreshExpiresAt = ComputeRefreshExpiry(utcNow, rememberMe);

        var entity = new CustomerRefreshToken
        {
            CustomerId = customer.CustomerId,
            TokenHash = ComputeSha256Hex(rawRefresh),
            FamilyId = familyId,
            RememberMe = rememberMe,
            ExpiresAt = refreshExpiresAt,
            CreatedByIp = TrimIp(ipAddress),
            UserAgent = TrimUserAgent(userAgent),
            CreatedAt = utcNow
        };

        return (accessToken, accessExpiresAt, rawRefresh, refreshExpiresAt, familyId, entity);
    }

    private (string Token, DateTime ExpiresAt) GenerateCustomerAccessJwt(
        Customer customer,
        string familyId,
        DateTime utcNow)
    {
        string? jwtKey = _configuration["Jwt:Key"];
        string? jwtIssuer = _configuration["Jwt:Issuer"];
        string? jwtAudience = _configuration["Jwt:Audience"];

        if (string.IsNullOrWhiteSpace(jwtKey))
        {
            throw new InvalidOperationException("JWT signing key is missing in configuration.");
        }

        DateTime expiresAt = utcNow.AddMinutes(AccessTokenExpiryMinutes);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, $"customer:{customer.CustomerId}"),
            new Claim(ClaimTypes.Role, "Customer"),
            new Claim("roleName", "Customer"),
            new Claim("accountType", "Customer"),
            new Claim("tokenScope", CustomerAuthScope),
            new Claim("customerId", customer.CustomerId.ToString(CultureInfo.InvariantCulture)),
            new Claim("phone", customer.Phone),
            new Claim(ClaimTypes.MobilePhone, customer.Phone),
            new Claim("fullName", customer.FullName),
            new Claim(ClaimTypes.Name, customer.FullName),
            new Claim("sessionId", familyId),
            new Claim("tokenVersion", customer.TokenVersion.ToString(CultureInfo.InvariantCulture)),
            new Claim("isVerified", customer.IsVerified ? "true" : "false"),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N"))
        };

        if (!string.IsNullOrWhiteSpace(customer.Email))
        {
            claims.Add(new Claim(JwtRegisteredClaimNames.Email, customer.Email));
            claims.Add(new Claim(ClaimTypes.Email, customer.Email));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var jwt = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            notBefore: utcNow,
            expires: expiresAt,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(jwt), expiresAt);
    }

    private DateTime ComputeRefreshExpiry(DateTime utcNow, bool rememberMe)
    {
        return rememberMe
            ? utcNow.AddDays(RememberMeRefreshTokenExpiryDays)
            : utcNow.AddHours(SessionRefreshTokenExpiryHours);
    }

    private async Task<Customer?> FindActiveCustomerByIdentifierAsync(string identifier, bool tracked)
    {
        string trimmed = identifier.Trim();
        IQueryable<Customer> query = tracked ? _context.Customers : _context.Customers.AsNoTracking();
        query = query.Where(c => c.DeletedAt == null);

        if (trimmed.Contains('@'))
        {
            string normEmail = trimmed.ToLowerInvariant();
            return await query.FirstOrDefaultAsync(c => c.Email != null && c.Email.ToLower() == normEmail);
        }

        string phoneKey = NormalizePhoneKey(trimmed);
        if (string.IsNullOrWhiteSpace(phoneKey))
        {
            return null;
        }

        return await FindActiveCustomerByPhoneKeyAsync(phoneKey, tracked);
    }

    private async Task<Customer?> FindActiveCustomerByPhoneKeyAsync(string phoneKey, bool tracked)
    {
        if (string.IsNullOrWhiteSpace(phoneKey)) return null;

        var matchingId = await _context.Customers
            .AsNoTracking()
            .Where(c => c.DeletedAt == null)
            .Select(c => new { c.CustomerId, c.Phone, c.PasswordHash })
            .ToListAsync();

        var matches = matchingId
            .Where(x => NormalizePhoneKey(x.Phone) == phoneKey)
            .OrderByDescending(x => !string.IsNullOrEmpty(x.PasswordHash))
            .ThenBy(x => x.CustomerId)
            .ToList();

        if (matches.Count == 0) return null;

        long targetId = matches[0].CustomerId;
        return tracked
            ? await _context.Customers.FirstOrDefaultAsync(c => c.CustomerId == targetId)
            : await _context.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.CustomerId == targetId);
    }

    private static CustomerProfileDto MapProfileDto(Customer c)
    {
        return new CustomerProfileDto
        {
            CustomerId = c.CustomerId,
            FullName = c.FullName,
            MobileNumber = c.Phone,
            Phone = c.Phone,
            Email = c.Email,
            Role = string.IsNullOrWhiteSpace(c.Role) ? "Customer" : c.Role,
            IsActive = c.IsActive,
            IsVerified = c.IsVerified,
            VerifiedAt = c.VerifiedAt,
            LastLogin = c.LastLogin,
            LoyaltyPoints = c.LoyaltyPoints,
            RegisteredBranchId = c.RegisteredBranchId,
            CreatedAt = c.CreatedAt
        };
    }

    private static void ValidateFullName(string fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName) || fullName.Length < 2)
        {
            throw new CustomerValidationException("Full name must be at least 2 characters.");
        }

        if (fullName.Length > 120 || fullName.Any(char.IsControl))
        {
            throw new CustomerValidationException("Full name must not exceed 120 characters or contain control characters.");
        }
    }

    private static string ValidateAndNormalizeEmail(string rawEmail)
    {
        if (string.IsNullOrWhiteSpace(rawEmail))
        {
            throw new CustomerValidationException("Email address is required.");
        }

        string email = rawEmail.Trim().ToLowerInvariant();
        if (email.Length > 120 || !BasicEmailRegex.IsMatch(email) || !MailAddress.TryCreate(email, out _))
        {
            throw new CustomerValidationException("Enter a valid email address.");
        }

        return email;
    }

    private static (string CanonicalPhone, string PhoneKey) ValidateAndNormalizePhone(string rawPhone)
    {
        if (string.IsNullOrWhiteSpace(rawPhone))
        {
            throw new CustomerValidationException("Mobile number is required.");
        }

        if (rawPhone.Any(char.IsLetter) || rawPhone.Any(char.IsControl))
        {
            throw new CustomerValidationException("Mobile number must contain only digits and optional country code prefix.");
        }

        string digits = Regex.Replace(rawPhone, @"[^\d]", "");
        if (digits.Length < 10 || digits.Length > 15)
        {
            throw new CustomerValidationException("Enter a valid mobile number (10 to 15 digits).");
        }

        string clean = Regex.Replace(rawPhone.Trim(), @"[\s\-().]+", "");
        if (clean.Length > 20)
        {
            clean = clean[..20];
        }

        string phoneKey = digits.Length > 10 ? digits[^10..] : digits;
        return (clean, phoneKey);
    }

    private static void ValidatePasswordStrength(string password, string confirmPassword)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
        {
            throw new CustomerValidationException("Password must be at least 8 characters long.");
        }

        if (password.Length > 128)
        {
            throw new CustomerValidationException("Password must not exceed 128 characters.");
        }

        if (!password.Any(char.IsLetter) || !password.Any(char.IsDigit))
        {
            throw new CustomerValidationException("Password must contain at least one letter and one number.");
        }

        if (string.IsNullOrEmpty(confirmPassword) || !string.Equals(password, confirmPassword, StringComparison.Ordinal))
        {
            throw new CustomerValidationException("Password and confirm password do not match.");
        }
    }

    public static string NormalizePhoneKey(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        string digits = Regex.Replace(phone, @"[^\d]", "");
        return digits.Length > 10 ? digits[^10..] : digits;
    }

    private static string NormalizePurpose(string? rawPurpose)
    {
        string p = (rawPurpose ?? PurposeAccountVerify).Trim().ToUpperInvariant().Replace('-', '_');
        return p switch
        {
            "" or "VERIFY" or "ACCOUNT_VERIFY" or "SIGNUP" or "REGISTRATION" => PurposeAccountVerify,
            "LOGIN" or "LOGIN_VERIFY" or "LOGIN_OTP" or "SIGNIN" or "2FA" => PurposeLoginVerify,
            "RESET" or "RESET_PASSWORD" or "PASSWORD_RESET" or "FORGOT_PASSWORD" => PurposePasswordReset,
            _ => throw new CustomerValidationException($"Unsupported OTP purpose '{rawPurpose}'. Use ACCOUNT_VERIFY, LOGIN_VERIFY, or PASSWORD_RESET.")
        };
    }

    private static string NormalizeRateKey(string identifier)
    {
        string trimmed = identifier.Trim();
        if (trimmed.Contains('@'))
        {
            return trimmed.ToLowerInvariant();
        }
        string key = NormalizePhoneKey(trimmed);
        return string.IsNullOrEmpty(key) ? trimmed.ToLowerInvariant() : key;
    }

    private static string GenerateNumericOtp()
    {
        return RandomNumberGenerator.GetInt32(100000, 1000000).ToString(CultureInfo.InvariantCulture);
    }

    private static string GenerateSecureToken()
    {
        byte[] bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    public static string ComputeSha256Hex(string input)
    {
        byte[] hash = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static bool BCryptVerifySafe(string input, string hash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(input, hash);
        }
        catch
        {
            return false;
        }
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        Exception? cur = ex;
        while (cur != null)
        {
            if (cur is MySqlException myEx && myEx.Number == 1062)
            {
                return true;
            }
            cur = cur.InnerException;
        }
        return false;
    }

    private async Task CleanupFailedRegistrationAsync(long customerId)
    {
        try
        {
            _context.ChangeTracker.Clear();
            await _context.CustomerOtpTokens
                .Where(t => t.CustomerId == customerId)
                .ExecuteDeleteAsync();
            await _context.Customers
                .Where(c => c.CustomerId == customerId && !c.IsVerified && c.LastLogin == null)
                .ExecuteDeleteAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to clean up pending registration record for customer {CustomerId} after email delivery error.",
                customerId);
        }
    }

    private async Task WriteAuditLogAsync(
        long customerId,
        string action,
        string tableName,
        long recordId,
        object? oldValue,
        object? newValue,
        string? ipAddress)
    {
        try
        {
            string? oldJson = oldValue != null ? JsonSerializer.Serialize(oldValue) : null;
            string? newJson = newValue != null ? JsonSerializer.Serialize(newValue) : null;

            const string sql = @"
                INSERT INTO audit_logs (user_id, username, action, table_name, record_id, old_value, new_value, ip_address, severity, created_at)
                VALUES (NULL, @uname, @act, @tbl, @rid, @oldv, @newv, @ip, 'INFO', UTC_TIMESTAMP());";

            await _spService.ExecuteSqlNonQueryAsync(sql, new Dictionary<string, object?>
            {
                { "@uname", $"customer:{customerId}" },
                { "@act", action },
                { "@tbl", tableName },
                { "@rid", recordId },
                { "@oldv", oldJson },
                { "@newv", newJson },
                { "@ip", TrimIp(ipAddress) }
            });
        }
        catch (Exception ex)
        {
            // Fallback in case schema has fewer columns (older audit_logs layout without username/severity)
            try
            {
                string? oldJson = oldValue != null ? JsonSerializer.Serialize(oldValue) : null;
                string? newJson = newValue != null ? JsonSerializer.Serialize(newValue) : null;
                const string fallbackSql = @"
                    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value, ip_address, created_at)
                    VALUES (NULL, @act, @tbl, @rid, @oldv, @newv, @ip, UTC_TIMESTAMP());";
                await _spService.ExecuteSqlNonQueryAsync(fallbackSql, new Dictionary<string, object?>
                {
                    { "@act", action },
                    { "@tbl", tableName },
                    { "@rid", recordId },
                    { "@oldv", oldJson },
                    { "@newv", newJson },
                    { "@ip", TrimIp(ipAddress) }
                });
            }
            catch
            {
                _logger.LogWarning(ex, "Non-fatal error writing customer auth audit log for {Action}.", action);
            }
        }
    }

    private static string? TrimIp(string? ip)
    {
        if (string.IsNullOrWhiteSpace(ip)) return null;
        string clean = ip.Trim();
        return clean.Length > 45 ? clean[..45] : clean;
    }

    private static string? TrimUserAgent(string? ua)
    {
        if (string.IsNullOrWhiteSpace(ua)) return null;
        string clean = ua.Trim();
        return clean.Length > 250 ? clean[..250] : clean;
    }

    private static string MaskEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@')) return "registered email";
        var parts = email.Trim().Split('@', 2);
        string local = parts[0];
        string visible = local.Length <= 2 ? local[..1] : local[..2];
        return $"{visible}***@{parts[1]}";
    }

    private static string MaskPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return "registered mobile";
        string digits = Regex.Replace(phone, @"[^\d]", "");
        if (digits.Length <= 4) return "****";
        return $"******{digits[^4..]}";
    }

    #endregion
}
