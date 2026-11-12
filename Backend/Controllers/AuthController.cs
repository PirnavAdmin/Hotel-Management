using System.Security.Claims;
using HMS.DTOs;
using HMS.Middleware;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/auth")]
[Tags("Admin", "Auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly LoginManagementService _loginManagementService;
    private readonly CustomerAuthService _customerAuthService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AuthService authService,
        LoginManagementService loginManagementService,
        CustomerAuthService customerAuthService,
        ILogger<AuthController> logger)
    {
        _authService = authService;
        _loginManagementService = loginManagementService;
        _customerAuthService = customerAuthService;
        _logger = logger;
    }

    // ============================================================
    // REGISTER ADMIN / USER
    // ============================================================

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
    {
        try
        {
            if (request == null)
            {
                return BadRequest(new RegisterResponseDto { Success = false, Message = "Invalid registration data provided." });
            }

            var result = await _authService.RegisterAsync(request);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new RegisterResponseDto
            {
                Success = false,
                Message = $"An error occurred during registration: {ex.Message}"
            });
        }
    }

    // ============================================================
    // LOGIN (Admin, POS, KOT)
    // ============================================================

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequestDto request)
    {
        var result =
            await _authService.LoginAsync(request);

        if (!result.Success)
        {
            return Unauthorized(result);
        }

        return Ok(result);
    }

    // ============================================================
    // LOGIN MANAGEMENT
    // ============================================================

    [AllowAnonymous]
    [HttpGet("login-management")]
    public async Task<IActionResult> GetLoginManagementSummary()
    {
        var result = await _loginManagementService.GetLoginManagementSummaryAsync();
        return Ok(new
        {
            success = true,
            message = "Login management summary retrieved successfully.",
            data = result
        });
    }

    [AllowAnonymous]
    [HttpPost("create-login")]
    public async Task<IActionResult> CreateLogin([FromBody] CreateLoginDto dto)
    {
        var result = await _loginManagementService.CreateLoginAsync(dto);
        return Ok(result);
    }

    // ============================================================
    // SEND OTP (For Registration & Password Reset)
    // ============================================================

    [AllowAnonymous]
    [HttpPost("send-otp")]
    public async Task<IActionResult> SendOtp(
        [FromBody] SendOtpRequestDto request)
    {
        var result =
            await _authService.SendOtpAsync(request);

        return Ok(result);
    }

    // ============================================================
    // CURRENT USER
    // ============================================================

    [Authorize]
    [HttpGet("me")]
    public IActionResult GetCurrentUser()
    {
        if (CustomerAdminIsolationMiddleware.IsCustomerPrincipal(User))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                message = "Customer accounts must use /api/v1/customers/me."
            });
        }

        var userId =
            User.FindFirstValue("userId")
            ?? User.FindFirstValue("sub");

        var fullName =
            User.FindFirstValue("fullName");

        var userName =
            User.FindFirstValue(ClaimTypes.Name)
            ?? User.FindFirstValue("unique_name");

        var email =
            User.FindFirstValue(ClaimTypes.Email);

        var roleId =
            User.FindFirstValue("roleId");

        var roleName =
            User.FindFirstValue("roleName")
            ?? User.FindFirstValue(ClaimTypes.Role);

        var branchId =
            User.FindFirstValue("branchId");

        return Ok(new
        {
            success = true,

            message =
                "Authenticated user details retrieved successfully.",

            user = new
            {
                userId,
                fullName,
                userName,
                email,
                roleId,
                roleName,
                branchId
            }
        });
    }

    // ============================================================
    // FORGOT PASSWORD
    // ============================================================

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(
        [FromBody] ForgotPasswordRequestDto request)
    {
        var result =
            await _authService.ForgotPasswordAsync(request);

        return Ok(result);
    }

    // ============================================================
    // VERIFY OTP
    // ============================================================

    [AllowAnonymous]
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp(
        [FromBody] VerifyOtpRequestDto request)
    {
        var result =
            await _authService.VerifyOtpAsync(request);

        return Ok(result);
    }

    // ============================================================
    // RESET PASSWORD
    // ============================================================

    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(
        [FromBody] ResetPasswordRequestDto request)
    {
        var result =
            await _authService.ResetPasswordAsync(request);

        return Ok(result);
    }

    // ============================================================
    // CUSTOMER PORTAL AUTHENTICATION & REGISTRATION (BHANU BISTRO)
    // ============================================================

    [AllowAnonymous]
    [HttpPost("customer/register")]
    [Tags("Customer Auth")]
    public async Task<IActionResult> CustomerRegister([FromBody] CustomerRegisterRequestDto request)
    {
        try
        {
            var result = await _customerAuthService.RegisterAsync(request, GetClientIp(), GetUserAgent());
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (Exception ex)
        {
            return MapCustomerAuthException(ex);
        }
    }

    [AllowAnonymous]
    [HttpPost("customer/login")]
    [Tags("Customer Auth")]
    public async Task<IActionResult> CustomerLogin([FromBody] CustomerLoginRequestDto request)
    {
        try
        {
            var result = await _customerAuthService.LoginAsync(request, GetClientIp(), GetUserAgent());
            return Ok(result);
        }
        catch (Exception ex)
        {
            return MapCustomerAuthException(ex);
        }
    }

    [AllowAnonymous]
    [HttpPost("customer/verify-otp")]
    [Tags("Customer Auth")]
    public async Task<IActionResult> CustomerVerifyOtp([FromBody] CustomerVerifyOtpRequestDto request)
    {
        try
        {
            var result = await _customerAuthService.VerifyOtpAsync(request, GetClientIp(), GetUserAgent());
            return Ok(result);
        }
        catch (Exception ex)
        {
            return MapCustomerAuthException(ex);
        }
    }

    [AllowAnonymous]
    [HttpPost("customer/resend-otp")]
    [Tags("Customer Auth")]
    public async Task<IActionResult> CustomerResendOtp([FromBody] CustomerResendOtpRequestDto request)
    {
        try
        {
            var result = await _customerAuthService.ResendOtpAsync(request, GetClientIp());
            return Ok(result);
        }
        catch (Exception ex)
        {
            return MapCustomerAuthException(ex);
        }
    }

    [AllowAnonymous]
    [HttpPost("customer/forgot-password")]
    [Tags("Customer Auth")]
    public async Task<IActionResult> CustomerForgotPassword([FromBody] CustomerForgotPasswordRequestDto request)
    {
        try
        {
            var result = await _customerAuthService.ForgotPasswordAsync(request, GetClientIp());
            return Ok(result);
        }
        catch (Exception ex)
        {
            return MapCustomerAuthException(ex);
        }
    }

    [AllowAnonymous]
    [HttpPost("customer/reset-password")]
    [Tags("Customer Auth")]
    public async Task<IActionResult> CustomerResetPassword([FromBody] CustomerResetPasswordRequestDto request)
    {
        try
        {
            var result = await _customerAuthService.ResetPasswordAsync(request, GetClientIp());
            return Ok(result);
        }
        catch (Exception ex)
        {
            return MapCustomerAuthException(ex);
        }
    }

    [AllowAnonymous]
    [HttpPost("customer/refresh-token")]
    [Tags("Customer Auth")]
    public async Task<IActionResult> CustomerRefreshToken([FromBody] CustomerRefreshTokenRequestDto request)
    {
        try
        {
            var result = await _customerAuthService.RefreshTokenAsync(request, GetClientIp(), GetUserAgent());
            return Ok(result);
        }
        catch (Exception ex)
        {
            return MapCustomerAuthException(ex);
        }
    }

    [AllowAnonymous]
    [HttpPost("customer/logout")]
    [Tags("Customer Auth")]
    public async Task<IActionResult> CustomerLogout([FromBody] CustomerLogoutRequestDto? request = null)
    {
        try
        {
            var result = await _customerAuthService.LogoutAsync(request, User, GetClientIp());
            return Ok(result);
        }
        catch (Exception ex)
        {
            return MapCustomerAuthException(ex);
        }
    }

    private string? GetClientIp() => HttpContext?.Connection?.RemoteIpAddress?.ToString();
    private string? GetUserAgent() => Request?.Headers["User-Agent"].FirstOrDefault();

    private IActionResult MapCustomerAuthException(Exception ex)
    {
        switch (ex)
        {
            case CustomerValidationException:
            case ArgumentException:
                return BadRequest(new { success = false, message = ex.Message });

            case CustomerUnauthorizedException:
                return Unauthorized(new { success = false, message = ex.Message });

            case CustomerForbiddenException fex:
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = fex.Message,
                    requiresVerification = fex.RequiresVerification
                });

            case CustomerNotFoundException:
                return NotFound(new { success = false, message = ex.Message });

            case CustomerConflictException:
                return Conflict(new { success = false, message = ex.Message });

            case CustomerRateLimitException rex:
                Response.Headers["Retry-After"] = rex.RetryAfterSeconds.ToString();
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    success = false,
                    message = rex.Message,
                    retryAfterSeconds = rex.RetryAfterSeconds
                });

            case CustomerEmailDeliveryException:
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    success = false,
                    message = ex.Message
                });

            default:
                _logger.LogError(ex, "Unexpected error during customer authentication request.");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    message = "An unexpected error occurred while processing the authentication request."
                });
        }
    }
}