using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using HMS.DTOs;
using HMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/upload")]
[Route("api/upload")]
public class UploadController : ControllerBase
{
    private readonly MenuItemService _menuItemService;
    private readonly ILogger<UploadController> _logger;

    public UploadController(MenuItemService menuItemService, ILogger<UploadController> logger)
    {
        _menuItemService = menuItemService;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpPost]
    [HttpPost("image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload([FromForm] ImageUploadDto dto)
    {
        _logger.LogInformation("Received request to upload image via UploadController.");

        var file = dto?.File ?? dto?.Image ?? Request.Form.Files.FirstOrDefault();
        if (file == null || file.Length == 0)
        {
            _logger.LogWarning("Upload rejected: No image file provided.");
            return BadRequest(new { success = false, message = "Please select a valid image file (JPG, JPEG, PNG, or WebP)." });
        }

        try
        {
            var result = await _menuItemService.SaveUploadedImageAsync(file);

            var baseUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}";
            var fullUrl = $"{baseUrl}{result.ImageUrl}";

            _logger.LogInformation("Image uploaded successfully: {FileName}, Full URL: {Url}", result.FileName, fullUrl);

            return Ok(new
            {
                success = true,
                message = "Image uploaded successfully.",
                imageUrl = result.ImageUrl,
                url = fullUrl,
                fileName = result.FileName,
                fileSizeBytes = result.FileSizeBytes
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Image upload validation failed: {Message}", ex.Message);
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while uploading image.");
            return StatusCode(500, new { success = false, message = "An error occurred while uploading the image. Please try again." });
        }
    }
}
