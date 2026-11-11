using System;

namespace HMS.DTOs;

public class AuditLogDto
{
    public long LogId { get; set; }
    public long? UserId { get; set; }
    public string Username { get; set; } = "System";
    public string Action { get; set; } = string.Empty; // e.g. CREATE_ORDER, SETTLE_ORDER, CANCEL_ORDER, ADJUST_STOCK, APPLY_DISCOUNT, SALARY_PAYMENT, JOURNAL_ENTRY
    public string TableName { get; set; } = string.Empty;
    public string? RecordId { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? IpAddress { get; set; }
    public string? Severity { get; set; } = "INFO"; // INFO, WARNING, CRITICAL
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CreateAuditLogRequestDto
{
    public long? UserId { get; set; }
    public string? Username { get; set; }
    public string Action { get; set; } = string.Empty;
    public string TableName { get; set; } = string.Empty;
    public string? RecordId { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? IpAddress { get; set; }
    public string? Severity { get; set; } = "INFO";
}

public class AuditSummaryDto
{
    public int TotalEvents { get; set; }
    public int OrdersCreatedCount { get; set; }
    public int OrdersCancelledCount { get; set; }
    public int SettlementsCount { get; set; }
    public int InventoryAdjustmentsCount { get; set; }
    public int FinancialAuditsCount { get; set; }
    public int SecurityLoginsCount { get; set; }
    public DateTime? LastEventTimestamp { get; set; }
}
