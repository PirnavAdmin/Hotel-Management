using System.Security.Claims;
using HMS.DTOs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/auth")]
[Route("api/Auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly LoginManagementService _loginManagementService;

    public AuthController(AuthService authService, LoginManagementService loginManagementService)
    {
        _authService = authService;
        _loginManagementService = loginManagementService;
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
}