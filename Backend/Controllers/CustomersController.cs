using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Threading.Tasks;
using HMS.Data;
using HMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Controllers;

[ApiController]
[Route("api/v1/customers")]
public class CustomersController : ControllerBase
{
    private readonly SpService _spService;

    public CustomersController(SpService spService)
    {
        _spService = spService;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetCustomers([FromQuery] string? search)
    {
        var parameters = new Dictionary<string, object?> { { "p_search", search } };
        var customers = await _spService.ExecuteQueryAsync("sp_GetCustomers", MapCustomerFromReader, parameters);

        return Ok(new
        {
            success = true,
            message = "Customers retrieved successfully.",
            count = customers.Count,
            data = customers
        });
    }

    [AllowAnonymous]
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetCustomerById(long id)
    {
        var parameters = new Dictionary<string, object?> { { "p_customer_id", id } };
        var customers = await _spService.ExecuteQueryAsync("sp_GetCustomerById", MapCustomerFromReader, parameters);

        if (customers.Count == 0)
        {
            return NotFound(new { success = false, message = $"Customer with ID {id} not found." });
        }

        return Ok(new { success = true, data = customers[0] });
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> CreateCustomer([FromBody] CustomerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Phone))
        {
            return BadRequest(new { success = false, message = "Full Name and Phone are required." });
        }

        try
        {
            var parameters = new Dictionary<string, object?>
            {
                { "p_full_name", request.FullName.Trim() },
                { "p_phone", request.Phone.Trim() },
                { "p_email", request.Email?.Trim() },
                { "p_loyalty_points", request.LoyaltyPoints }
            };

            long customerId = await _spService.ExecuteScalarAsync<long>("sp_CreateCustomer", parameters);
            var customer = (await GetCustomerByIdObject(customerId))!;

            return CreatedAtAction(nameof(GetCustomerById), new { id = customerId }, new
            {
                success = true,
                message = "Customer created successfully.",
                data = customer
            });
        }
        catch (Exception ex) when (ex.Message.Contains("Duplicate entry") || ex.Message.Contains("uq_customer_phone"))
        {
            return BadRequest(new { success = false, message = $"A customer with phone number '{request.Phone}' already exists." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Failed to create customer: {ex.Message}" });
        }
    }

    [AllowAnonymous]
    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdateCustomer(long id, [FromBody] CustomerRequest request)
    {
        var existing = await GetCustomerByIdObject(id);
        if (existing == null)
        {
            return NotFound(new { success = false, message = $"Customer with ID {id} not found." });
        }

        var fullName = !string.IsNullOrWhiteSpace(request.FullName) ? request.FullName.Trim() : existing.FullName;
        var phone = !string.IsNullOrWhiteSpace(request.Phone) ? request.Phone.Trim() : existing.Phone;
        var email = request.Email != null ? request.Email.Trim() : existing.Email;

        var parameters = new Dictionary<string, object?>
        {
            { "p_customer_id", id },
            { "p_full_name", fullName },
            { "p_phone", phone },
            { "p_email", email },
            { "p_loyalty_points", request.LoyaltyPoints }
        };

        await _spService.ExecuteNonQueryAsync("sp_UpdateCustomer", parameters);
        var updated = await GetCustomerByIdObject(id);

        return Ok(new
        {
            success = true,
            message = "Customer details updated successfully.",
            data = updated
        });
    }

    private async Task<Customer?> GetCustomerByIdObject(long id)
    {
        var parameters = new Dictionary<string, object?> { { "p_customer_id", id } };
        var list = await _spService.ExecuteQueryAsync("sp_GetCustomerById", MapCustomerFromReader, parameters);
        return list.Count > 0 ? list[0] : null;
    }

    private static Customer MapCustomerFromReader(DbDataReader reader)
    {
        var emailOrd = reader.GetOrdinal("email");

        return new Customer
        {
            CustomerId = reader.GetInt64(reader.GetOrdinal("customer_id")),
            FullName = reader.GetString(reader.GetOrdinal("full_name")),
            Phone = reader.GetString(reader.GetOrdinal("phone")),
            Email = reader.IsDBNull(emailOrd) ? null : reader.GetString(emailOrd),
            LoyaltyPoints = reader.GetInt32(reader.GetOrdinal("loyalty_points")),
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at")),
            UpdatedAt = reader.GetDateTime(reader.GetOrdinal("updated_at"))
        };
    }
}

public class CustomerRequest
{
    private string _fullName = string.Empty;
    public string FullName
    {
        get => !string.IsNullOrWhiteSpace(_fullName) ? _fullName : (Name ?? string.Empty);
        set => _fullName = value;
    }
    public string? Name { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public int LoyaltyPoints { get; set; } = 0;
}
