using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using HMS.Data;
using HMS.DTOs;
using HMS.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HMS.Services;

public class AccountingService
{
    private readonly AppDbContext _context;
    private readonly ILogger<AccountingService> _logger;

    private static readonly string[] ValidGroups = { "Assets", "Liabilities", "Equity", "Income", "Expenses" };

    public AccountingService(AppDbContext context, ILogger<AccountingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ============================================================
    // INTERNAL UNIFIED DOUBLE-ENTRY POSTING ENGINE
    // ============================================================

    private sealed class UnifiedPosting
    {
        public string PostingId { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string VoucherNo { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // JV | INVOICE | RECEIPT | PURCHASE | SALARY
        public string SourceModule { get; set; } = string.Empty;
        public long SourceId { get; set; }
        public string AccountCode { get; set; } = string.Empty;
        public string Particulars { get; set; } = string.Empty;
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
    }

    private sealed class OperationalDataSnapshot
    {
        public List<ChartOfAccount> Accounts { get; set; } = new();
        public List<JournalVoucher> PostedVouchers { get; set; } = new();
        public List<Invoice> NonVoidInvoices { get; set; } = new();
        public Dictionary<long, Invoice> InvoiceById { get; set; } = new();
        public List<InvoicePayment> ValidPayments { get; set; } = new();
        public List<(Invoice Invoice, decimal Amount)> SyntheticCashSettlements { get; set; } = new();
        public List<InventoryPurchase> Purchases { get; set; } = new();
        public List<SalaryPayment> ActiveSalaries { get; set; } = new();
        public Dictionary<long, Order> OrderById { get; set; } = new();
        public Dictionary<long, string> TableNames { get; set; } = new();
        public HashSet<long> BarMenuIds { get; set; } = new();
        public Dictionary<string, MenuItem> MenuByName { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    }

    private static bool IsPaymentSuccessful(InvoicePayment p)
    {
        if (string.IsNullOrWhiteSpace(p.PaymentStatus)) return true;
        var st = p.PaymentStatus.Trim().ToLowerInvariant();
        return st != "failed" && st != "pending" && st != "cancelled" && st != "void" && st != "refunded";
    }

    private static string ResolveCanonicalPaymentMode(InvoicePayment p)
    {
        var mode = p.PaymentMode?.Trim();
        var method = p.PaymentMethod?.Trim();

        if (!string.IsNullOrWhiteSpace(mode) && !mode.Equals("CASH", StringComparison.OrdinalIgnoreCase))
            return mode.ToUpperInvariant();

        if (!string.IsNullOrWhiteSpace(method) && !method.Equals("cash", StringComparison.OrdinalIgnoreCase))
            return method.ToUpperInvariant();

        return !string.IsNullOrWhiteSpace(mode) ? mode.ToUpperInvariant() : "CASH";
    }

    private static decimal ResolvePaymentAmount(InvoicePayment p)
    {
        return p.Amount > 0 ? p.Amount : p.AmountPaid;
    }

    private static bool IsBarMenuOrItem(OrderItem item, HashSet<long> barMenuIds, Dictionary<string, MenuItem> menuByName)
    {
        if (item.BotId.HasValue && item.BotId.Value > 0) return true;
        if (item.MenuItemId > 0 && barMenuIds.Contains(item.MenuItemId)) return true;
        if (!string.IsNullOrWhiteSpace(item.Name) && menuByName.TryGetValue(item.Name.Trim(), out var matched))
        {
            return OrderItemRouting.IsBarItem(matched.IsBarItem, matched.DrinkType, matched.Category, matched.DishName);
        }
        return OrderItemRouting.IsBarItem(false, null, null, item.Name);
    }

    private async Task<OperationalDataSnapshot> LoadOperationalSnapshotAsync()
    {
        var accounts = await _context.ChartOfAccounts.AsNoTracking()
            .OrderBy(a => a.Code)
            .ToListAsync();

        var postedVouchers = await _context.JournalVouchers
            .Include(v => v.Lines)
            .AsNoTracking()
            .Where(v => v.Status == "Posted")
            .OrderBy(v => v.VoucherDate)
            .ThenBy(v => v.VoucherId)
            .ToListAsync();

        var nonVoidInvoices = await _context.Invoices
            .AsNoTracking()
            .Where(i => i.Status.ToLower() != "void" &&
                        i.Status.ToLower() != "refunded" &&
                        i.Status.ToLower() != "cancelled")
            .OrderBy(i => i.CreatedAt)
            .ToListAsync();

        var invoiceById = nonVoidInvoices.ToDictionary(i => i.InvoiceId);

        var allPayments = await _context.InvoicePayments
            .AsNoTracking()
            .OrderBy(p => p.PaidAt)
            .ToListAsync();

        var validPayments = allPayments
            .Where(p => IsPaymentSuccessful(p) && ResolvePaymentAmount(p) > 0 && invoiceById.ContainsKey(p.InvoiceId))
            .ToList();

        var paidInvoiceIdsWithPaymentRows = validPayments.Select(p => p.InvoiceId).ToHashSet();
        var syntheticSettlements = new List<(Invoice Invoice, decimal Amount)>();
        foreach (var inv in nonVoidInvoices)
        {
            if (!paidInvoiceIdsWithPaymentRows.Contains(inv.InvoiceId))
            {
                decimal paid = inv.PaidAmount > 0 ? inv.PaidAmount : inv.AmountPaid;
                if (paid <= 0 && inv.Status.Equals("PAID", StringComparison.OrdinalIgnoreCase))
                {
                    paid = inv.TotalAmount;
                }
                if (paid > 0)
                {
                    syntheticSettlements.Add((inv, Math.Min(inv.TotalAmount > 0 ? inv.TotalAmount : paid, paid)));
                }
            }
        }

        var purchases = await _context.InventoryPurchases
            .AsNoTracking()
            .Where(p => p.TotalAmount > 0)
            .OrderBy(p => p.PurchaseDate)
            .ToListAsync();

        var activeSalaries = await _context.SalaryPayments
            .AsNoTracking()
            .Where(s => s.Amount > 0 && s.Status.ToLower() != "void" && s.Status.ToLower() != "cancelled")
            .OrderBy(s => s.PaymentDate)
            .ToListAsync();

        var orderIds = nonVoidInvoices.Select(i => i.OrderId).Where(id => id > 0).Distinct().ToList();
        var orderById = orderIds.Count > 0
            ? await _context.Orders.Include(o => o.Items).AsNoTracking()
                .Where(o => orderIds.Contains(o.Id))
                .ToDictionaryAsync(o => o.Id)
            : new Dictionary<long, Order>();

        var diningTables = await _context.DiningTables.AsNoTracking()
            .ToDictionaryAsync(t => t.Id, t => t.Name);
        var restaurantTables = await _context.RestaurantTables.AsNoTracking()
            .ToDictionaryAsync(t => t.TableId, t => !string.IsNullOrWhiteSpace(t.TableName) ? t.TableName : t.TableNumber);

        var tableNames = new Dictionary<long, string>();
        foreach (var kvp in restaurantTables) tableNames[kvp.Key] = kvp.Value;
        foreach (var kvp in diningTables) tableNames[kvp.Key] = kvp.Value;

        var menuItems = await _context.MenuItems.AsNoTracking().ToListAsync();
        var barMenuIds = new HashSet<long>();
        var menuByName = new Dictionary<string, MenuItem>(StringComparer.OrdinalIgnoreCase);
        foreach (var m in menuItems)
        {
            if (OrderItemRouting.IsBarItem(m.IsBarItem, m.DrinkType, m.Category, m.DishName))
            {
                barMenuIds.Add(m.MenuItemId);
            }
            if (!string.IsNullOrWhiteSpace(m.DishName) && !menuByName.ContainsKey(m.DishName))
            {
                menuByName[m.DishName] = m;
            }
        }

        return new OperationalDataSnapshot
        {
            Accounts = accounts,
            PostedVouchers = postedVouchers,
            NonVoidInvoices = nonVoidInvoices,
            InvoiceById = invoiceById,
            ValidPayments = validPayments,
            SyntheticCashSettlements = syntheticSettlements,
            Purchases = purchases,
            ActiveSalaries = activeSalaries,
            OrderById = orderById,
            TableNames = tableNames,
            BarMenuIds = barMenuIds,
            MenuByName = menuByName
        };
    }

    private List<UnifiedPosting> BuildUnifiedPostings(OperationalDataSnapshot snap)
    {
        var postings = new List<UnifiedPosting>();

        // 1. Manual Double-Entry Journal Vouchers (Posted)
        foreach (var v in snap.PostedVouchers)
        {
            foreach (var line in v.Lines)
            {
                if (line.DebitAmount == 0m && line.CreditAmount == 0m) continue;
                var particulars = string.IsNullOrWhiteSpace(line.Description)
                    ? v.Narration
                    : $"{v.Narration} — {line.Description}";

                postings.Add(new UnifiedPosting
                {
                    PostingId = $"JV-{v.VoucherId}-{line.LineId}",
                    Date = v.VoucherDate,
                    VoucherNo = v.VoucherNumber,
                    Type = "JV",
                    SourceModule = "JournalVoucher",
                    SourceId = v.VoucherId,
                    AccountCode = line.AccountCode,
                    Particulars = particulars,
                    Debit = line.DebitAmount,
                    Credit = line.CreditAmount
                });
            }
        }

        // 2. Customer Invoices (Receivable Debit -> Food/Bar Revenue Credits + GST Payable Credit)
        foreach (var inv in snap.NonVoidInvoices)
        {
            if (inv.TotalAmount <= 0m) continue;

            string invNo = !string.IsNullOrWhiteSpace(inv.InvoiceNumber) ? inv.InvoiceNumber : $"INV-{inv.InvoiceId}";
            snap.OrderById.TryGetValue(inv.OrderId, out var ord);
            string tableLabel = ResolveOrderLocation(ord, snap.TableNames);

            postings.Add(new UnifiedPosting
            {
                PostingId = $"INV-DR-{inv.InvoiceId}",
                Date = inv.CreatedAt,
                VoucherNo = invNo,
                Type = "INVOICE",
                SourceModule = "Invoices",
                SourceId = inv.InvoiceId,
                AccountCode = "1100",
                Particulars = $"Sales Invoice #{invNo} ({tableLabel})",
                Debit = inv.TotalAmount,
                Credit = 0m
            });

            decimal taxAmt = Math.Max(0m, Math.Min(inv.TaxAmount, inv.TotalAmount));
            decimal netRevenue = Math.Round(inv.TotalAmount - taxAmt, 2);

            if (netRevenue > 0m)
            {
                decimal barShareRatio = ComputeOrderBarRatio(ord, snap.BarMenuIds, snap.MenuByName);
                decimal barRev = Math.Round(netRevenue * barShareRatio, 2);
                decimal foodRev = netRevenue - barRev;

                if (foodRev > 0m)
                {
                    postings.Add(new UnifiedPosting
                    {
                        PostingId = $"INV-FOOD-{inv.InvoiceId}",
                        Date = inv.CreatedAt,
                        VoucherNo = invNo,
                        Type = "INVOICE",
                        SourceModule = "Invoices",
                        SourceId = inv.InvoiceId,
                        AccountCode = "4001",
                        Particulars = $"Food & Dine sales on Invoice #{invNo} ({tableLabel})",
                        Debit = 0m,
                        Credit = foodRev
                    });
                }

                if (barRev > 0m)
                {
                    postings.Add(new UnifiedPosting
                    {
                        PostingId = $"INV-BAR-{inv.InvoiceId}",
                        Date = inv.CreatedAt,
                        VoucherNo = invNo,
                        Type = "INVOICE",
                        SourceModule = "Invoices",
                        SourceId = inv.InvoiceId,
                        AccountCode = "4002",
                        Particulars = $"Bar & Beverage sales on Invoice #{invNo} ({tableLabel})",
                        Debit = 0m,
                        Credit = barRev
                    });
                }
            }

            if (taxAmt > 0m)
            {
                postings.Add(new UnifiedPosting
                {
                    PostingId = $"INV-TAX-{inv.InvoiceId}",
                    Date = inv.CreatedAt,
                    VoucherNo = invNo,
                    Type = "INVOICE",
                    SourceModule = "Invoices",
                    SourceId = inv.InvoiceId,
                    AccountCode = "2100",
                    Particulars = $"GST output tax collected on Invoice #{invNo}",
                    Debit = 0m,
                    Credit = taxAmt
                });
            }
        }

        // 3. Invoice Settlement Receipts (Cash/Bank Debit -> Accounts Receivable Credit)
        foreach (var p in snap.ValidPayments)
        {
            var inv = snap.InvoiceById[p.InvoiceId];
            string invNo = !string.IsNullOrWhiteSpace(inv.InvoiceNumber) ? inv.InvoiceNumber : $"INV-{inv.InvoiceId}";
            decimal amt = ResolvePaymentAmount(p);
            string mode = ResolveCanonicalPaymentMode(p);
            bool isCash = mode == "CASH";
            string targetAccount = isCash ? "1001" : "1002";
            string voucherRef = !string.IsNullOrWhiteSpace(p.TransactionReference ?? p.TxnReference)
                ? (p.TransactionReference ?? p.TxnReference)!
                : $"PAY-{p.PaymentId}";

            postings.Add(new UnifiedPosting
            {
                PostingId = $"RCP-DR-{p.PaymentId}",
                Date = p.PaidAt,
                VoucherNo = voucherRef,
                Type = "RECEIPT",
                SourceModule = "Payments",
                SourceId = p.PaymentId,
                AccountCode = targetAccount,
                Particulars = $"Settlement of Invoice #{invNo} via {mode}",
                Debit = amt,
                Credit = 0m
            });

            postings.Add(new UnifiedPosting
            {
                PostingId = $"RCP-CR-{p.PaymentId}",
                Date = p.PaidAt,
                VoucherNo = voucherRef,
                Type = "RECEIPT",
                SourceModule = "Payments",
                SourceId = p.PaymentId,
                AccountCode = "1100",
                Particulars = $"Receivable cleared for Invoice #{invNo} via {mode}",
                Debit = 0m,
                Credit = amt
            });
        }

        // Synthetic Cash settlement fallback for legacy PAID invoices without InvoicePayment rows
        foreach (var (inv, amt) in snap.SyntheticCashSettlements)
        {
            string invNo = !string.IsNullOrWhiteSpace(inv.InvoiceNumber) ? inv.InvoiceNumber : $"INV-{inv.InvoiceId}";
            postings.Add(new UnifiedPosting
            {
                PostingId = $"SYN-DR-{inv.InvoiceId}",
                Date = inv.UpdatedAt >= inv.CreatedAt ? inv.UpdatedAt : inv.CreatedAt,
                VoucherNo = invNo,
                Type = "RECEIPT",
                SourceModule = "Payments",
                SourceId = inv.InvoiceId,
                AccountCode = "1001",
                Particulars = $"Settlement of Invoice #{invNo} via CASH",
                Debit = amt,
                Credit = 0m
            });

            postings.Add(new UnifiedPosting
            {
                PostingId = $"SYN-CR-{inv.InvoiceId}",
                Date = inv.UpdatedAt >= inv.CreatedAt ? inv.UpdatedAt : inv.CreatedAt,
                VoucherNo = invNo,
                Type = "RECEIPT",
                SourceModule = "Payments",
                SourceId = inv.InvoiceId,
                AccountCode = "1100",
                Particulars = $"Receivable cleared for Invoice #{invNo} via CASH",
                Debit = 0m,
                Credit = amt
            });
        }

        // 4. Inventory Stock Purchases (COGS Debit -> Bank/Cash Credit)
        foreach (var pur in snap.Purchases)
        {
            bool isCash = !string.IsNullOrWhiteSpace(pur.Note) && pur.Note.Contains("cash", StringComparison.OrdinalIgnoreCase);
            string payAccount = isCash ? "1001" : "1002";
            string refNo = $"PO-{pur.PurchaseId}";

            postings.Add(new UnifiedPosting
            {
                PostingId = $"PUR-DR-{pur.PurchaseId}",
                Date = pur.PurchaseDate,
                VoucherNo = refNo,
                Type = "PURCHASE",
                SourceModule = "Inventory",
                SourceId = pur.PurchaseId,
                AccountCode = "5001",
                Particulars = $"Purchase {pur.ItemName} ({pur.Department}) from {pur.Supplier}",
                Debit = pur.TotalAmount,
                Credit = 0m
            });

            postings.Add(new UnifiedPosting
            {
                PostingId = $"PUR-CR-{pur.PurchaseId}",
                Date = pur.PurchaseDate,
                VoucherNo = refNo,
                Type = "PURCHASE",
                SourceModule = "Inventory",
                SourceId = pur.PurchaseId,
                AccountCode = payAccount,
                Particulars = $"Vendor payment for {pur.ItemName} ({pur.Supplier})",
                Debit = 0m,
                Credit = pur.TotalAmount
            });
        }

        // 5. Salary Payouts (Payroll Expense Debit -> Cash/Bank Credit)
        foreach (var sal in snap.ActiveSalaries)
        {
            bool isCash = !string.IsNullOrWhiteSpace(sal.PaymentMethod) &&
                          sal.PaymentMethod.Trim().Equals("CASH", StringComparison.OrdinalIgnoreCase);
            string payAccount = isCash ? "1001" : "1002";
            string refNo = $"SAL-{sal.PaymentId}";

            postings.Add(new UnifiedPosting
            {
                PostingId = $"SAL-DR-{sal.PaymentId}",
                Date = sal.PaymentDate,
                VoucherNo = refNo,
                Type = "SALARY",
                SourceModule = "Payroll",
                SourceId = sal.PaymentId,
                AccountCode = "5002",
                Particulars = $"Salary payout for {sal.StaffName} ({sal.RoleTitle}, {sal.PaymentMonth})",
                Debit = sal.Amount,
                Credit = 0m
            });

            postings.Add(new UnifiedPosting
            {
                PostingId = $"SAL-CR-{sal.PaymentId}",
                Date = sal.PaymentDate,
                VoucherNo = refNo,
                Type = "SALARY",
                SourceModule = "Payroll",
                SourceId = sal.PaymentId,
                AccountCode = payAccount,
                Particulars = $"Salary disbursement to {sal.StaffName} via {sal.PaymentMethod}",
                Debit = 0m,
                Credit = sal.Amount
            });
        }

        return postings
            .OrderBy(p => p.Date)
            .ThenBy(p => p.VoucherNo, StringComparer.OrdinalIgnoreCase)
            .ThenBy(p => p.PostingId, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string ResolveOrderLocation(Order? ord, Dictionary<long, string> tableNames)
    {
        if (ord == null) return "Direct / Counter";
        if (string.Equals(ord.OrderType, "Takeaway", StringComparison.OrdinalIgnoreCase)) return "Takeaway";
        if (ord.TableId.HasValue && tableNames.TryGetValue(ord.TableId.Value, out var tblName) && !string.IsNullOrWhiteSpace(tblName))
            return tblName;
        return ord.TableId.HasValue ? $"Table {ord.TableId.Value}" : "Direct / Counter";
    }

    private static decimal ComputeOrderBarRatio(Order? ord, HashSet<long> barMenuIds, Dictionary<string, MenuItem> menuByName)
    {
        if (ord == null) return 0m;
        var items = ord.Items?.Where(i => i.IsActive && !i.IsDeleted).ToList() ?? new List<OrderItem>();
        if (items.Count == 0)
        {
            return string.Equals(ord.Section, "Bar", StringComparison.OrdinalIgnoreCase) ? 1m : 0m;
        }

        decimal barTotal = 0m;
        decimal dineTotal = 0m;
        foreach (var it in items)
        {
            decimal line = it.TotalPrice > 0 ? it.TotalPrice : it.Price * it.Quantity;
            if (IsBarMenuOrItem(it, barMenuIds, menuByName)) barTotal += line;
            else dineTotal += line;
        }

        decimal total = barTotal + dineTotal;
        return total > 0m ? barTotal / total : 0m;
    }

    // ============================================================
    // SCREEN 1: DAILY BALANCES (DAILY CASH & BANK REGISTER)
    // ============================================================

    private sealed class DayCashBankMovement
    {
        public decimal CashSalesInflow { get; set; }
        public decimal UpiSalesInflow { get; set; }
        public decimal CardOtherSalesInflow { get; set; }
        public decimal JvCashInflow { get; set; }
        public decimal JvBankInflow { get; set; }
        public int SettledReceiptsCount { get; set; }

        public decimal PurchasesCashOutflow { get; set; }
        public decimal PurchasesBankOutflow { get; set; }
        public decimal SalariesCashOutflow { get; set; }
        public decimal SalariesBankOutflow { get; set; }
        public decimal JvCashOutflow { get; set; }
        public decimal JvBankOutflow { get; set; }
        public int OutflowCount { get; set; }

        public decimal CashInflow => CashSalesInflow + JvCashInflow;
        public decimal BankUpiInflow => UpiSalesInflow + CardOtherSalesInflow + JvBankInflow;
        public decimal TotalInflow => CashInflow + BankUpiInflow;

        public decimal PurchasesOutflow => PurchasesCashOutflow + PurchasesBankOutflow;
        public decimal SalariesOutflow => SalariesCashOutflow + SalariesBankOutflow;
        public decimal CashOutflow => PurchasesCashOutflow + SalariesCashOutflow + JvCashOutflow;
        public decimal BankOutflow => PurchasesBankOutflow + SalariesBankOutflow + JvBankOutflow;
        public decimal TotalOutflow => CashOutflow + BankOutflow;

        public List<DailyRegisterTransactionDto> Transactions { get; set; } = new();
    }

    private static Dictionary<DateTime, DayCashBankMovement> BuildDailyCashBankMovements(
        OperationalDataSnapshot snap,
        DateTime? detailTransactionsDate = null)
    {
        var byDay = new Dictionary<DateTime, DayCashBankMovement>();
        DayCashBankMovement GetDay(DateTime dt)
        {
            var d = dt.Date;
            if (!byDay.TryGetValue(d, out var m))
            {
                m = new DayCashBankMovement();
                byDay[d] = m;
            }
            return m;
        }

        // Track settled invoice IDs per day so "X settled receipts today" reflects settled bills/receipts accurately
        var settledInvoicesPerDay = new Dictionary<DateTime, HashSet<long>>();
        void MarkSettledInvoice(DateTime dt, long invoiceId)
        {
            var d = dt.Date;
            if (!settledInvoicesPerDay.TryGetValue(d, out var set))
            {
                set = new HashSet<long>();
                settledInvoicesPerDay[d] = set;
            }
            set.Add(invoiceId);
        }

        foreach (var p in snap.ValidPayments)
        {
            decimal amt = ResolvePaymentAmount(p);
            string mode = ResolveCanonicalPaymentMode(p);
            var m = GetDay(p.PaidAt);
            MarkSettledInvoice(p.PaidAt, p.InvoiceId);

            bool isCash = mode == "CASH";
            if (isCash) m.CashSalesInflow += amt;
            else if (mode == "UPI") m.UpiSalesInflow += amt;
            else m.CardOtherSalesInflow += amt;

            if (detailTransactionsDate.HasValue && p.PaidAt.Date == detailTransactionsDate.Value.Date)
            {
                var inv = snap.InvoiceById[p.InvoiceId];
                string invNo = !string.IsNullOrWhiteSpace(inv.InvoiceNumber) ? inv.InvoiceNumber : $"INV-{inv.InvoiceId}";
                m.Transactions.Add(new DailyRegisterTransactionDto
                {
                    Timestamp = p.PaidAt,
                    ReferenceNo = !string.IsNullOrWhiteSpace(p.TransactionReference ?? p.TxnReference)
                        ? (p.TransactionReference ?? p.TxnReference)!
                        : $"PAY-{p.PaymentId}",
                    Type = "SALE_RECEIPT",
                    Direction = "INFLOW",
                    Channel = mode,
                    Description = $"Settlement of Invoice #{invNo} ({mode})",
                    CashAmount = isCash ? amt : 0m,
                    BankAmount = isCash ? 0m : amt,
                    TotalAmount = amt
                });
            }
        }

        foreach (var (inv, amt) in snap.SyntheticCashSettlements)
        {
            var dt = inv.UpdatedAt >= inv.CreatedAt ? inv.UpdatedAt : inv.CreatedAt;
            var m = GetDay(dt);
            MarkSettledInvoice(dt, inv.InvoiceId);
            m.CashSalesInflow += amt;

            if (detailTransactionsDate.HasValue && dt.Date == detailTransactionsDate.Value.Date)
            {
                string invNo = !string.IsNullOrWhiteSpace(inv.InvoiceNumber) ? inv.InvoiceNumber : $"INV-{inv.InvoiceId}";
                m.Transactions.Add(new DailyRegisterTransactionDto
                {
                    Timestamp = dt,
                    ReferenceNo = invNo,
                    Type = "SALE_RECEIPT",
                    Direction = "INFLOW",
                    Channel = "CASH",
                    Description = $"Settlement of Invoice #{invNo} (CASH)",
                    CashAmount = amt,
                    BankAmount = 0m,
                    TotalAmount = amt
                });
            }
        }

        foreach (var kvp in settledInvoicesPerDay)
        {
            if (byDay.TryGetValue(kvp.Key, out var m))
            {
                m.SettledReceiptsCount = kvp.Value.Count;
            }
        }

        foreach (var pur in snap.Purchases)
        {
            bool isCash = !string.IsNullOrWhiteSpace(pur.Note) && pur.Note.Contains("cash", StringComparison.OrdinalIgnoreCase);
            var m = GetDay(pur.PurchaseDate);
            if (isCash) m.PurchasesCashOutflow += pur.TotalAmount;
            else m.PurchasesBankOutflow += pur.TotalAmount;
            m.OutflowCount++;

            if (detailTransactionsDate.HasValue && pur.PurchaseDate.Date == detailTransactionsDate.Value.Date)
            {
                m.Transactions.Add(new DailyRegisterTransactionDto
                {
                    Timestamp = pur.PurchaseDate,
                    ReferenceNo = $"PO-{pur.PurchaseId}",
                    Type = "PURCHASE",
                    Direction = "OUTFLOW",
                    Channel = isCash ? "CASH" : "BANK",
                    Description = $"Stock Purchase: {pur.ItemName} ({pur.Supplier})",
                    CashAmount = isCash ? pur.TotalAmount : 0m,
                    BankAmount = isCash ? 0m : pur.TotalAmount,
                    TotalAmount = pur.TotalAmount
                });
            }
        }

        foreach (var sal in snap.ActiveSalaries)
        {
            bool isCash = !string.IsNullOrWhiteSpace(sal.PaymentMethod) &&
                          sal.PaymentMethod.Trim().Equals("CASH", StringComparison.OrdinalIgnoreCase);
            var m = GetDay(sal.PaymentDate);
            if (isCash) m.SalariesCashOutflow += sal.Amount;
            else m.SalariesBankOutflow += sal.Amount;
            m.OutflowCount++;

            if (detailTransactionsDate.HasValue && sal.PaymentDate.Date == detailTransactionsDate.Value.Date)
            {
                m.Transactions.Add(new DailyRegisterTransactionDto
                {
                    Timestamp = sal.PaymentDate,
                    ReferenceNo = $"SAL-{sal.PaymentId}",
                    Type = "SALARY",
                    Direction = "OUTFLOW",
                    Channel = isCash ? "CASH" : sal.PaymentMethod.ToUpperInvariant(),
                    Description = $"Salary Payout: {sal.StaffName} ({sal.PaymentMonth})",
                    CashAmount = isCash ? sal.Amount : 0m,
                    BankAmount = isCash ? 0m : sal.Amount,
                    TotalAmount = sal.Amount
                });
            }
        }

        // Include Posted Journal Vouchers that directly move Cash (1001) or Bank (1002)
        foreach (var v in snap.PostedVouchers)
        {
            foreach (var line in v.Lines)
            {
                if (line.AccountCode != "1001" && line.AccountCode != "1002") continue;
                bool isCash = line.AccountCode == "1001";
                var m = GetDay(v.VoucherDate);

                if (line.DebitAmount > 0m)
                {
                    if (isCash) m.JvCashInflow += line.DebitAmount;
                    else m.JvBankInflow += line.DebitAmount;

                    if (detailTransactionsDate.HasValue && v.VoucherDate.Date == detailTransactionsDate.Value.Date)
                    {
                        m.Transactions.Add(new DailyRegisterTransactionDto
                        {
                            Timestamp = v.VoucherDate,
                            ReferenceNo = v.VoucherNumber,
                            Type = "JOURNAL_VOUCHER",
                            Direction = "INFLOW",
                            Channel = isCash ? "CASH" : "BANK",
                            Description = string.IsNullOrWhiteSpace(line.Description) ? v.Narration : $"{v.Narration} — {line.Description}",
                            CashAmount = isCash ? line.DebitAmount : 0m,
                            BankAmount = isCash ? 0m : line.DebitAmount,
                            TotalAmount = line.DebitAmount
                        });
                    }
                }

                if (line.CreditAmount > 0m)
                {
                    if (isCash) m.JvCashOutflow += line.CreditAmount;
                    else m.JvBankOutflow += line.CreditAmount;
                    m.OutflowCount++;

                    if (detailTransactionsDate.HasValue && v.VoucherDate.Date == detailTransactionsDate.Value.Date)
                    {
                        m.Transactions.Add(new DailyRegisterTransactionDto
                        {
                            Timestamp = v.VoucherDate,
                            ReferenceNo = v.VoucherNumber,
                            Type = "JOURNAL_VOUCHER",
                            Direction = "OUTFLOW",
                            Channel = isCash ? "CASH" : "BANK",
                            Description = string.IsNullOrWhiteSpace(line.Description) ? v.Narration : $"{v.Narration} — {line.Description}",
                            CashAmount = isCash ? line.CreditAmount : 0m,
                            BankAmount = isCash ? 0m : line.CreditAmount,
                            TotalAmount = line.CreditAmount
                        });
                    }
                }
            }
        }

        foreach (var m in byDay.Values)
        {
            if (m.Transactions.Count > 1)
            {
                m.Transactions = m.Transactions.OrderBy(t => t.Timestamp).ToList();
            }
        }

        return byDay;
    }

    private static (decimal OpeningCash, decimal OpeningBank, string CarryForwardSource) ResolveOpeningForDate(
        DateTime targetDate,
        List<DailyCashBankRegister> allRegisters,
        Dictionary<DateTime, DayCashBankMovement> movementsByDay)
    {
        var day = targetDate.Date;
        var exactReg = allRegisters.FirstOrDefault(r => r.BusinessDate.Date == day);
        if (exactReg != null)
        {
            return (exactReg.OpeningCashFloat, exactReg.OpeningBankBalance, "Saved Shift Opening Float");
        }

        var priorReg = allRegisters
            .Where(r => r.BusinessDate.Date < day)
            .OrderByDescending(r => r.BusinessDate)
            .FirstOrDefault();

        if (priorReg != null)
        {
            decimal cash = priorReg.OpeningCashFloat;
            decimal bank = priorReg.OpeningBankBalance;
            foreach (var kvp in movementsByDay.Where(k => k.Key >= priorReg.BusinessDate.Date && k.Key < day))
            {
                cash += kvp.Value.CashInflow - kvp.Value.CashOutflow;
                bank += kvp.Value.BankUpiInflow - kvp.Value.BankOutflow;
            }
            return (cash, bank, $"Carried forward from {priorReg.BusinessDate:yyyy-MM-dd}");
        }

        // Prior to first persisted shift register: aggregate cumulative movements prior to targetDate
        decimal histCash = 0m;
        decimal histBank = 0m;
        foreach (var kvp in movementsByDay.Where(k => k.Key < day))
        {
            histCash += kvp.Value.CashInflow - kvp.Value.CashOutflow;
            histBank += kvp.Value.BankUpiInflow - kvp.Value.BankOutflow;
        }
        return (histCash, histBank, histCash == 0m && histBank == 0m ? "Shift Start" : "Prior Cumulative Balance");
    }

    private static List<CashDenominationItemDto> DeserializeDenominations(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<CashDenominationItemDto>();
        try
        {
            return JsonSerializer.Deserialize<List<CashDenominationItemDto>>(json) ?? new List<CashDenominationItemDto>();
        }
        catch
        {
            return new List<CashDenominationItemDto>();
        }
    }

    public async Task<DailyCashBankRegisterResponseDto> GetDailyBalanceAsync(DateTime? date = null)
    {
        var targetDate = (date ?? DateTime.Today).Date;
        var snap = await LoadOperationalSnapshotAsync();
        var movementsByDay = BuildDailyCashBankMovements(snap, targetDate);
        var allRegisters = await _context.DailyCashBankRegisters.AsNoTracking()
            .OrderBy(r => r.BusinessDate)
            .ToListAsync();

        var exactReg = allRegisters.FirstOrDefault(r => r.BusinessDate.Date == targetDate);
        var (openingCash, openingBank, carrySource) = ResolveOpeningForDate(targetDate, allRegisters, movementsByDay);

        movementsByDay.TryGetValue(targetDate, out var dayMove);
        dayMove ??= new DayCashBankMovement();

        decimal totalOpening = openingCash + openingBank;
        decimal closingCash = openingCash + dayMove.CashInflow - dayMove.CashOutflow;
        decimal closingBank = openingBank + dayMove.BankUpiInflow - dayMove.BankOutflow;
        decimal totalClosing = closingCash + closingBank;

        string shiftStatus = exactReg?.ShiftStatus ?? "Open";
        DateTime shiftOpenedAt = exactReg?.ShiftOpenedAt ?? targetDate.AddHours(8);

        decimal? physicalCount = exactReg?.PhysicalCashCount;
        decimal? cashVariance = physicalCount.HasValue ? Math.Round(physicalCount.Value - closingCash, 2) : null;
        string reconStatus = !cashVariance.HasValue
            ? "Pending Count"
            : (Math.Abs(cashVariance.Value) < 0.01m ? "Matched" : (cashVariance.Value < 0m ? "Shortage" : "Excess"));

        return new DailyCashBankRegisterResponseDto
        {
            RegisterId = exactReg?.RegisterId,
            BusinessDate = targetDate.ToString("yyyy-MM-dd"),
            ShiftStatus = shiftStatus,
            StatusBadge = shiftStatus.Equals("Closed", StringComparison.OrdinalIgnoreCase)
                ? "Closed Shift"
                : "Live / Open Shift",
            IsPersistedShift = exactReg != null,
            ShiftOpenedAt = shiftOpenedAt,
            ShiftClosedAt = exactReg?.ShiftClosedAt,
            OpenedBy = exactReg?.OpenedBy ?? "pirnav",
            ClosedBy = exactReg?.ClosedBy,
            Notes = exactReg?.Notes,
            OpeningBalance = new DailyRegisterOpeningCardDto
            {
                TotalOpeningBalance = totalOpening,
                CashFloat = openingCash,
                BankBalance = openingBank,
                CarryForwardSource = carrySource,
                Caption = exactReg != null && !string.IsNullOrWhiteSpace(exactReg.Notes)
                    ? exactReg.Notes
                    : $"Brought forward at {shiftOpenedAt:hh:mm tt} shift start"
            },
            TotalInflow = new DailyRegisterInflowCardDto
            {
                TotalInflow = dayMove.TotalInflow,
                CashInflow = dayMove.CashInflow,
                BankUpiInflow = dayMove.BankUpiInflow,
                UpiInflow = dayMove.UpiSalesInflow,
                CardOtherInflow = dayMove.CardOtherSalesInflow,
                JvCashInflow = dayMove.JvCashInflow,
                JvBankInflow = dayMove.JvBankInflow,
                SettledReceiptsCount = dayMove.SettledReceiptsCount,
                Caption = $"{dayMove.SettledReceiptsCount} settled receipts today"
            },
            TotalOutflow = new DailyRegisterOutflowCardDto
            {
                TotalOutflow = dayMove.TotalOutflow,
                CashOutflow = dayMove.CashOutflow,
                BankOutflow = dayMove.BankOutflow,
                PurchasesOutflow = dayMove.PurchasesOutflow,
                SalariesOutflow = dayMove.SalariesOutflow,
                JvCashOutflow = dayMove.JvCashOutflow,
                JvBankOutflow = dayMove.JvBankOutflow,
                OutflowCount = dayMove.OutflowCount,
                Caption = "Purchases & petty payments"
            },
            ClosingBalance = new DailyRegisterClosingCardDto
            {
                TotalClosingBalance = totalClosing,
                CashBalance = closingCash,
                BankBalance = closingBank
            },
            Reconciliation = new DailyCashReconciliationDto
            {
                ExpectedCashInDrawer = closingCash,
                PhysicalCashCount = physicalCount,
                CashVariance = cashVariance,
                ReconciliationStatus = reconStatus,
                Denominations = DeserializeDenominations(exactReg?.DenominationsJson)
            },
            Transactions = dayMove.Transactions
        };
    }

    public async Task<(string FromDate, string ToDate, List<DailyBalanceHistoryItemDto> Items)> GetDailyBalanceHistoryAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? status = null)
    {
        var end = (toDate ?? DateTime.Today).Date;
        var start = (fromDate ?? end.AddDays(-13)).Date;
        if (start > end) (start, end) = (end, start);

        var snap = await LoadOperationalSnapshotAsync();
        var movementsByDay = BuildDailyCashBankMovements(snap);
        var allRegisters = await _context.DailyCashBankRegisters.AsNoTracking()
            .OrderBy(r => r.BusinessDate)
            .ToListAsync();

        var regByDate = allRegisters.ToDictionary(r => r.BusinessDate.Date);
        var items = new List<DailyBalanceHistoryItemDto>();

        for (var d = end; d >= start; d = d.AddDays(-1))
        {
            regByDate.TryGetValue(d, out var reg);
            movementsByDay.TryGetValue(d, out var move);
            move ??= new DayCashBankMovement();

            var (opCash, opBank, _) = ResolveOpeningForDate(d, allRegisters, movementsByDay);
            decimal clCash = opCash + move.CashInflow - move.CashOutflow;
            decimal clBank = opBank + move.BankUpiInflow - move.BankOutflow;
            string dayStatus = reg?.ShiftStatus ?? "Open";

            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                if (!dayStatus.Equals(status.Trim(), StringComparison.OrdinalIgnoreCase)) continue;
            }

            decimal? variance = reg?.PhysicalCashCount != null
                ? Math.Round(reg.PhysicalCashCount.Value - clCash, 2)
                : reg?.CashVariance;

            items.Add(new DailyBalanceHistoryItemDto
            {
                RegisterId = reg?.RegisterId,
                BusinessDate = d.ToString("yyyy-MM-dd"),
                OpeningCashFloat = opCash,
                OpeningBankBalance = opBank,
                TotalOpeningBalance = opCash + opBank,
                CashInflow = move.CashInflow,
                BankUpiInflow = move.BankUpiInflow,
                TotalInflow = move.TotalInflow,
                CashOutflow = move.CashOutflow,
                BankOutflow = move.BankOutflow,
                TotalOutflow = move.TotalOutflow,
                ClosingCashBalance = clCash,
                ClosingBankBalance = clBank,
                TotalClosingBalance = clCash + clBank,
                PhysicalCashCount = reg?.PhysicalCashCount,
                CashVariance = variance,
                ShiftStatus = dayStatus,
                TransactionCount = move.SettledReceiptsCount + move.OutflowCount,
                OpenedBy = reg?.OpenedBy,
                ClosedBy = reg?.ClosedBy
            });
        }

        return (start.ToString("yyyy-MM-dd"), end.ToString("yyyy-MM-dd"), items);
    }

    public async Task<DailyCashBankRegisterResponseDto> OpenOrUpdateDailyShiftAsync(OpenDailyRegisterRequestDto dto)
    {
        if (dto.OpeningCashFloat < 0m) throw new ArgumentException("Opening cash float cannot be negative.");
        if (dto.OpeningBankBalance < 0m) throw new ArgumentException("Opening bank balance cannot be negative.");

        var targetDate = (dto.BusinessDate ?? DateTime.Today).Date;
        var existing = await _context.DailyCashBankRegisters
            .FirstOrDefaultAsync(r => r.BusinessDate.Date == targetDate);

        var now = DateTime.UtcNow;
        if (existing == null)
        {
            existing = new DailyCashBankRegister
            {
                BusinessDate = targetDate,
                OpeningCashFloat = Math.Round(dto.OpeningCashFloat, 2),
                OpeningBankBalance = Math.Round(dto.OpeningBankBalance, 2),
                TotalOpeningBalance = Math.Round(dto.OpeningCashFloat + dto.OpeningBankBalance, 2),
                ShiftStatus = "Open",
                ShiftOpenedAt = dto.ShiftOpenedAt ?? targetDate.AddHours(8),
                OpenedBy = string.IsNullOrWhiteSpace(dto.OpenedBy) ? "admin" : dto.OpenedBy.Trim(),
                Notes = string.IsNullOrWhiteSpace(dto.Notes) ? "Brought forward at 08:00 AM shift start" : dto.Notes.Trim(),
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.DailyCashBankRegisters.Add(existing);
        }
        else
        {
            existing.OpeningCashFloat = Math.Round(dto.OpeningCashFloat, 2);
            existing.OpeningBankBalance = Math.Round(dto.OpeningBankBalance, 2);
            existing.TotalOpeningBalance = Math.Round(dto.OpeningCashFloat + dto.OpeningBankBalance, 2);
            existing.ShiftStatus = "Open";
            if (dto.ShiftOpenedAt.HasValue) existing.ShiftOpenedAt = dto.ShiftOpenedAt.Value;
            if (!string.IsNullOrWhiteSpace(dto.OpenedBy)) existing.OpenedBy = dto.OpenedBy.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Notes)) existing.Notes = dto.Notes.Trim();
            existing.UpdatedAt = now;
        }

        await _context.SaveChangesAsync();
        return await GetDailyBalanceAsync(targetDate);
    }

    public async Task<DailyCashBankRegisterResponseDto> ReconcileDailyShiftAsync(ReconcileDailyRegisterRequestDto dto)
    {
        var targetDate = (dto.BusinessDate ?? DateTime.Today).Date;

        decimal? physicalTotal = dto.PhysicalCashCount;
        if (!physicalTotal.HasValue && dto.Denominations != null && dto.Denominations.Count > 0)
        {
            physicalTotal = dto.Denominations.Sum(d => (decimal)d.Denomination * d.Count);
        }

        if (!physicalTotal.HasValue || physicalTotal.Value < 0m)
        {
            throw new ArgumentException("Valid physicalCashCount (or cash denominations) is required for reconciliation.");
        }

        // Compute current register metrics before persisting reconciliation
        var currentSnapshot = await GetDailyBalanceAsync(targetDate);
        decimal expectedCash = currentSnapshot.ClosingBalance.CashBalance;
        decimal variance = Math.Round(physicalTotal.Value - expectedCash, 2);

        var existing = await _context.DailyCashBankRegisters
            .FirstOrDefaultAsync(r => r.BusinessDate.Date == targetDate);

        var now = DateTime.UtcNow;
        string? denomJson = dto.Denominations != null && dto.Denominations.Count > 0
            ? JsonSerializer.Serialize(dto.Denominations)
            : null;

        if (existing == null)
        {
            existing = new DailyCashBankRegister
            {
                BusinessDate = targetDate,
                OpeningCashFloat = currentSnapshot.OpeningBalance.CashFloat,
                OpeningBankBalance = currentSnapshot.OpeningBalance.BankBalance,
                TotalOpeningBalance = currentSnapshot.OpeningBalance.TotalOpeningBalance,
                PhysicalCashCount = Math.Round(physicalTotal.Value, 2),
                DenominationsJson = denomJson,
                CashVariance = variance,
                ShiftStatus = dto.CloseShift ? "Closed" : "Open",
                ShiftOpenedAt = currentSnapshot.ShiftOpenedAt,
                ShiftClosedAt = dto.CloseShift ? DateTime.Now : null,
                OpenedBy = currentSnapshot.OpenedBy ?? "admin",
                ClosedBy = dto.CloseShift ? (string.IsNullOrWhiteSpace(dto.ClosedBy) ? "admin" : dto.ClosedBy.Trim()) : null,
                Notes = dto.Notes?.Trim() ?? currentSnapshot.Notes,
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.DailyCashBankRegisters.Add(existing);
        }
        else
        {
            existing.PhysicalCashCount = Math.Round(physicalTotal.Value, 2);
            if (denomJson != null) existing.DenominationsJson = denomJson;
            existing.CashVariance = variance;
            if (dto.CloseShift)
            {
                existing.ShiftStatus = "Closed";
                existing.ShiftClosedAt = DateTime.Now;
                existing.ClosedBy = string.IsNullOrWhiteSpace(dto.ClosedBy) ? "admin" : dto.ClosedBy.Trim();
            }
            if (!string.IsNullOrWhiteSpace(dto.Notes)) existing.Notes = dto.Notes.Trim();
            existing.UpdatedAt = now;
        }

        await _context.SaveChangesAsync();
        return await GetDailyBalanceAsync(targetDate);
    }

    public async Task<DailyCashBankRegisterResponseDto> ReopenDailyShiftAsync(ReopenDailyRegisterRequestDto dto)
    {
        var targetDate = (dto.BusinessDate ?? DateTime.Today).Date;
        var existing = await _context.DailyCashBankRegisters
            .FirstOrDefaultAsync(r => r.BusinessDate.Date == targetDate);

        if (existing == null)
        {
            throw new KeyNotFoundException($"No shift register record exists for {targetDate:yyyy-MM-dd}.");
        }

        existing.ShiftStatus = "Open";
        existing.ShiftClosedAt = null;
        if (!string.IsNullOrWhiteSpace(dto.ReopenedBy)) existing.OpenedBy = dto.ReopenedBy.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Notes)) existing.Notes = dto.Notes.Trim();
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await GetDailyBalanceAsync(targetDate);
    }

    public async Task<ExportDocument> GenerateDailyBalanceExportAsync(
        DateTime? date = null,
        DateTime? fromDate = null,
        DateTime? toDate = null)
    {
        if (fromDate.HasValue || toDate.HasValue)
        {
            var (startStr, endStr, items) = await GetDailyBalanceHistoryAsync(fromDate, toDate);
            var rows = items.Select((item, idx) => new List<object?>
            {
                idx + 1,
                item.BusinessDate,
                item.ShiftStatus,
                item.OpeningCashFloat,
                item.OpeningBankBalance,
                item.TotalOpeningBalance,
                item.CashInflow,
                item.BankUpiInflow,
                item.TotalInflow,
                item.CashOutflow,
                item.BankOutflow,
                item.TotalOutflow,
                item.ClosingCashBalance,
                item.ClosingBankBalance,
                item.TotalClosingBalance,
                item.PhysicalCashCount,
                item.CashVariance,
                item.TransactionCount
            }).ToList();

            var sheet = new ExportSheet
            {
                SheetName = "Daily Balances History",
                Title = "Daily Cash & Bank Register Timeline",
                Metadata = new Dictionary<string, string>
                {
                    { "Period", $"{startStr} to {endStr}" },
                    { "Business Days", items.Count.ToString() },
                    { "Total Period Inflows", $"₹{items.Sum(i => i.TotalInflow):N2}" },
                    { "Total Period Outflows", $"₹{items.Sum(i => i.TotalOutflow):N2}" }
                },
                SummaryKpis = new Dictionary<string, string>
                {
                    { "Days Covered", items.Count.ToString() },
                    { "Total Inflows", $"₹{items.Sum(i => i.TotalInflow):N2}" },
                    { "Total Outflows", $"₹{items.Sum(i => i.TotalOutflow):N2}" },
                    { "Latest Closing", $"₹{(items.FirstOrDefault()?.TotalClosingBalance ?? 0m):N2}" }
                },
                Headers = new List<string>
                {
                    "#", "Business Date", "Shift Status", "Opening Cash (₹)", "Opening Bank (₹)", "Total Opening (₹)",
                    "Cash Inflow (₹)", "Bank / UPI Inflow (₹)", "Total Inflow (₹)", "Cash Outflow (₹)", "Bank Outflow (₹)",
                    "Total Outflow (₹)", "Closing Cash (₹)", "Closing Bank (₹)", "Total Closing (₹)",
                    "Physical Cash Count (₹)", "Cash Variance (₹)", "Transactions"
                },
                Rows = rows,
                TotalsRow = new List<object?>
                {
                    "TOTAL", $"{items.Count} Days", "—", "—", "—", "—",
                    items.Sum(i => i.CashInflow), items.Sum(i => i.BankUpiInflow), items.Sum(i => i.TotalInflow),
                    items.Sum(i => i.CashOutflow), items.Sum(i => i.BankOutflow), items.Sum(i => i.TotalOutflow),
                    "—", "—", "—", "—", "—", items.Sum(i => i.TransactionCount)
                }
            };

            return new ExportDocument("Daily Cash & Bank Register", "Daily_Cash_Bank_Register_History", sheet);
        }

        var reg = await GetDailyBalanceAsync(date);
        var txRows = reg.Transactions.Select((t, idx) => new List<object?>
        {
            idx + 1,
            t.Timestamp,
            t.ReferenceNo,
            t.Type,
            t.Direction,
            t.Channel,
            t.Description,
            t.CashAmount,
            t.BankAmount,
            t.TotalAmount
        }).ToList();

        var summarySheet = new ExportSheet
        {
            SheetName = "Daily Register Summary",
            Title = $"Daily Cash & Bank Register — {reg.BusinessDate} ({reg.StatusBadge})",
            Metadata = new Dictionary<string, string>
            {
                { "Business Date", reg.BusinessDate },
                { "Shift Status", reg.StatusBadge },
                { "Opened At", reg.ShiftOpenedAt.ToString("yyyy-MM-dd HH:mm") },
                { "Opened By", reg.OpenedBy ?? "admin" },
                { "Closed By", reg.ClosedBy ?? "Open" },
                { "Carry-Forward Source", reg.OpeningBalance.CarryForwardSource },
                { "Reconciliation Status", reg.Reconciliation.ReconciliationStatus }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "1. Opening Balance", $"₹{reg.OpeningBalance.TotalOpeningBalance:N2} (Cash ₹{reg.OpeningBalance.CashFloat:N2} | Bank ₹{reg.OpeningBalance.BankBalance:N2})" },
                { "2. Total Inflow (Sales)", $"+₹{reg.TotalInflow.TotalInflow:N2} ({reg.TotalInflow.SettledReceiptsCount} receipts)" },
                { "3. Total Outflow (Expenses)", $"-₹{reg.TotalOutflow.TotalOutflow:N2}" },
                { "4. Closing Balance", $"₹{reg.ClosingBalance.TotalClosingBalance:N2} (Cash ₹{reg.ClosingBalance.CashBalance:N2} | Bank ₹{reg.ClosingBalance.BankBalance:N2})" }
            },
            Headers = new List<string>
            {
                "Section", "Cash Drawer (₹)", "Bank & UPI (₹)", "Total Combined (₹)", "Notes"
            },
            Rows = new List<List<object?>>
            {
                new() { "1. Opening Balance", reg.OpeningBalance.CashFloat, reg.OpeningBalance.BankBalance, reg.OpeningBalance.TotalOpeningBalance, reg.OpeningBalance.Caption },
                new() { "2. Total Inflow (Sales & Receipts)", reg.TotalInflow.CashInflow, reg.TotalInflow.BankUpiInflow, reg.TotalInflow.TotalInflow, reg.TotalInflow.Caption },
                new() { "3. Total Outflow (Purchases, Payroll & Petty)", reg.TotalOutflow.CashOutflow, reg.TotalOutflow.BankOutflow, reg.TotalOutflow.TotalOutflow, reg.TotalOutflow.Caption },
                new() { "4. Expected Closing Balance", reg.ClosingBalance.CashBalance, reg.ClosingBalance.BankBalance, reg.ClosingBalance.TotalClosingBalance, reg.StatusBadge },
                new() { "5. Physical Cash Count & Variance", reg.Reconciliation.PhysicalCashCount ?? 0m, 0m, reg.Reconciliation.CashVariance ?? 0m, reg.Reconciliation.ReconciliationStatus }
            }
        };

        var txSheet = new ExportSheet
        {
            SheetName = "Day Transactions",
            Title = $"Cash & Bank Movements — {reg.BusinessDate}",
            Headers = new List<string>
            {
                "#", "Date & Time", "Reference #", "Type", "Direction", "Channel", "Description", "Cash Amount (₹)", "Bank Amount (₹)", "Total Amount (₹)"
            },
            Rows = txRows,
            TotalsRow = new List<object?>
            {
                "TOTAL", "—", "—", $"{reg.Transactions.Count} Entries", "—", "—", "NET DAY FLOW",
                reg.TotalInflow.CashInflow - reg.TotalOutflow.CashOutflow,
                reg.TotalInflow.BankUpiInflow - reg.TotalOutflow.BankOutflow,
                reg.TotalInflow.TotalInflow - reg.TotalOutflow.TotalOutflow
            }
        };

        return new ExportDocument
        {
            Title = $"Daily Cash & Bank Register ({reg.BusinessDate})",
            BaseFileName = $"Daily_Cash_Bank_Register_{reg.BusinessDate}",
            Sheets = new List<ExportSheet> { summarySheet, txSheet }
        };
    }

    // ============================================================
    // SCREEN 2: CHART OF ACCOUNTS (COA)
    // ============================================================

    private static string NormalizeGroup(string group)
    {
        if (string.IsNullOrWhiteSpace(group))
            throw new ArgumentException("Account group is required.");

        var matched = ValidGroups.FirstOrDefault(g => g.Equals(group.Trim(), StringComparison.OrdinalIgnoreCase));
        if (matched == null)
        {
            throw new ArgumentException($"Invalid group '{group}'. Allowed groups: Assets, Liabilities, Equity, Income, Expenses.");
        }
        return matched;
    }

    private static string ResolveNormalBalance(string group, string? requestedNormalBalance)
    {
        if (!string.IsNullOrWhiteSpace(requestedNormalBalance))
        {
            if (requestedNormalBalance.Trim().Equals("Debit", StringComparison.OrdinalIgnoreCase)) return "Debit";
            if (requestedNormalBalance.Trim().Equals("Credit", StringComparison.OrdinalIgnoreCase)) return "Credit";
            throw new ArgumentException("Normal balance must be 'Debit' or 'Credit'.");
        }
        return (group == "Assets" || group == "Expenses") ? "Debit" : "Credit";
    }

    public async Task<ChartOfAccountListResponseDto> GetChartOfAccountsAsync(
        string? group = null,
        string? search = null,
        bool includeInactive = false)
    {
        var snap = await LoadOperationalSnapshotAsync();
        var postings = BuildUnifiedPostings(snap);

        var totalsByCode = postings
            .GroupBy(p => p.AccountCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => (Debit: g.Sum(x => x.Debit), Credit: g.Sum(x => x.Credit)),
                StringComparer.OrdinalIgnoreCase);

        var activeBase = includeInactive
            ? snap.Accounts
            : snap.Accounts.Where(a => a.IsActive).ToList();

        var groupCounts = new Dictionary<string, int>
        {
            { "All", activeBase.Count },
            { "Assets", activeBase.Count(a => a.AccountGroup == "Assets") },
            { "Liabilities", activeBase.Count(a => a.AccountGroup == "Liabilities") },
            { "Equity", activeBase.Count(a => a.AccountGroup == "Equity") },
            { "Income", activeBase.Count(a => a.AccountGroup == "Income") },
            { "Expenses", activeBase.Count(a => a.AccountGroup == "Expenses") }
        };

        IEnumerable<ChartOfAccount> filtered = activeBase;
        if (!string.IsNullOrWhiteSpace(group) && !group.Trim().Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            var gTrim = group.Trim();
            filtered = filtered.Where(a => a.AccountGroup.Equals(gTrim, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLowerInvariant();
            filtered = filtered.Where(a =>
                a.Code.ToLowerInvariant().Contains(q) ||
                a.AccountName.ToLowerInvariant().Contains(q) ||
                a.AccountType.ToLowerInvariant().Contains(q) ||
                (a.Description?.ToLowerInvariant().Contains(q) ?? false));
        }

        var dtos = filtered.Select(a => MapAccountDto(a, totalsByCode)).ToList();

        return new ChartOfAccountListResponseDto
        {
            GroupCounts = groupCounts,
            Metadata = new ChartOfAccountMetadataDto(),
            Accounts = dtos
        };
    }

    public async Task<ChartOfAccountDto?> GetChartOfAccountByIdAsync(long id)
    {
        var acct = await _context.ChartOfAccounts.AsNoTracking().FirstOrDefaultAsync(a => a.AccountId == id);
        if (acct == null) return null;

        var snap = await LoadOperationalSnapshotAsync();
        var postings = BuildUnifiedPostings(snap).Where(p => p.AccountCode.Equals(acct.Code, StringComparison.OrdinalIgnoreCase)).ToList();
        var dict = new Dictionary<string, (decimal Debit, decimal Credit)>(StringComparer.OrdinalIgnoreCase)
        {
            { acct.Code, (postings.Sum(x => x.Debit), postings.Sum(x => x.Credit)) }
        };

        return MapAccountDto(acct, dict);
    }

    private static ChartOfAccountDto MapAccountDto(
        ChartOfAccount a,
        Dictionary<string, (decimal Debit, decimal Credit)> totalsByCode)
    {
        totalsByCode.TryGetValue(a.Code, out var sums);
        decimal signedNet = a.NormalBalance == "Debit"
            ? sums.Debit - sums.Credit
            : sums.Credit - sums.Debit;

        string side = signedNet >= 0m
            ? a.NormalBalance
            : (a.NormalBalance == "Debit" ? "Credit" : "Debit");

        return new ChartOfAccountDto
        {
            AccountId = a.AccountId,
            Code = a.Code,
            AccountName = a.AccountName,
            Group = a.AccountGroup,
            AccountType = a.AccountType,
            NormalBalance = a.NormalBalance,
            Description = a.Description ?? string.Empty,
            TotalDebit = sums.Debit,
            TotalCredit = sums.Credit,
            CurrentBalance = signedNet,
            BalanceSide = side,
            IsSystemAccount = a.IsSystemAccount,
            IsActive = a.IsActive,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt
        };
    }

    public async Task<ChartOfAccountDto> CreateChartOfAccountAsync(CreateChartOfAccountDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Code)) throw new ArgumentException("Account code is required.");
        if (string.IsNullOrWhiteSpace(dto.AccountName)) throw new ArgumentException("Account name is required.");

        string code = dto.Code.Trim();
        string group = NormalizeGroup(dto.Group);
        string normalBalance = ResolveNormalBalance(group, dto.NormalBalance);

        bool codeExists = await _context.ChartOfAccounts.AnyAsync(a => a.Code.ToLower() == code.ToLower());
        if (codeExists)
        {
            throw new InvalidOperationException($"Account code '{code}' already exists in Chart of Accounts.");
        }

        var now = DateTime.UtcNow;
        var entity = new ChartOfAccount
        {
            Code = code,
            AccountName = dto.AccountName.Trim(),
            AccountGroup = group,
            AccountType = string.IsNullOrWhiteSpace(dto.AccountType) ? $"{group} Account" : dto.AccountType.Trim(),
            NormalBalance = normalBalance,
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            IsSystemAccount = false,
            IsActive = dto.IsActive,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.ChartOfAccounts.Add(entity);
        await _context.SaveChangesAsync();

        return (await GetChartOfAccountByIdAsync(entity.AccountId))!;
    }

    public async Task<ChartOfAccountDto?> UpdateChartOfAccountAsync(long id, UpdateChartOfAccountDto dto)
    {
        var entity = await _context.ChartOfAccounts.FirstOrDefaultAsync(a => a.AccountId == id);
        if (entity == null) return null;

        if (!string.IsNullOrWhiteSpace(dto.Code) && !dto.Code.Trim().Equals(entity.Code, StringComparison.OrdinalIgnoreCase))
        {
            if (entity.IsSystemAccount)
                throw new InvalidOperationException("Core system ledger account codes cannot be modified.");

            string newCode = dto.Code.Trim();
            bool used = await _context.JournalVoucherLines.AnyAsync(l => l.AccountId == entity.AccountId);
            if (used)
                throw new InvalidOperationException("Cannot change account code after journal vouchers have posted to this account.");

            bool duplicate = await _context.ChartOfAccounts.AnyAsync(a => a.AccountId != id && a.Code.ToLower() == newCode.ToLower());
            if (duplicate)
                throw new InvalidOperationException($"Account code '{newCode}' is already assigned to another ledger account.");

            entity.Code = newCode;
        }

        if (!string.IsNullOrWhiteSpace(dto.AccountName))
            entity.AccountName = dto.AccountName.Trim();

        if (!string.IsNullOrWhiteSpace(dto.Group))
            entity.AccountGroup = NormalizeGroup(dto.Group);

        if (!string.IsNullOrWhiteSpace(dto.AccountType))
            entity.AccountType = dto.AccountType.Trim();

        if (!string.IsNullOrWhiteSpace(dto.NormalBalance))
            entity.NormalBalance = ResolveNormalBalance(entity.AccountGroup, dto.NormalBalance);

        if (dto.Description != null)
            entity.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();

        if (dto.IsActive.HasValue)
            entity.IsActive = dto.IsActive.Value;

        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetChartOfAccountByIdAsync(entity.AccountId);
    }

    public async Task<(bool Deleted, string Message)> DeleteChartOfAccountAsync(long id)
    {
        var entity = await _context.ChartOfAccounts.FirstOrDefaultAsync(a => a.AccountId == id);
        if (entity == null) return (false, "Account not found.");

        if (entity.IsSystemAccount)
            throw new InvalidOperationException($"Account '{entity.Code} {entity.AccountName}' is a core system account and cannot be deleted. You may deactivate it instead.");

        bool hasJournalLines = await _context.JournalVoucherLines.AnyAsync(l => l.AccountId == id || l.AccountCode == entity.Code);
        if (hasJournalLines)
            throw new InvalidOperationException($"Account '{entity.Code} {entity.AccountName}' has posted journal voucher lines and cannot be deleted. Set isActive=false instead.");

        _context.ChartOfAccounts.Remove(entity);
        await _context.SaveChangesAsync();
        return (true, $"Account '{entity.Code} • {entity.AccountName}' deleted successfully.");
    }

    public async Task<ExportDocument> GenerateChartOfAccountsExportAsync(
        string? group = null,
        string? search = null,
        bool includeInactive = false)
    {
        var res = await GetChartOfAccountsAsync(group, search, includeInactive);
        var rows = res.Accounts.Select((a, idx) => new List<object?>
        {
            idx + 1,
            a.Code,
            a.AccountName,
            a.Group,
            a.AccountType,
            a.NormalBalance,
            a.Description,
            a.TotalDebit,
            a.TotalCredit,
            Math.Abs(a.CurrentBalance),
            a.BalanceSide,
            a.IsActive ? "Active" : "Inactive"
        }).ToList();

        var sheet = new ExportSheet
        {
            SheetName = "Chart of Accounts",
            Title = "Chart of Accounts (COA) — Standard 5-Group General Ledger Masters",
            Metadata = new Dictionary<string, string>
            {
                { "Group Filter", string.IsNullOrWhiteSpace(group) ? "All" : group },
                { "Search Query", string.IsNullOrWhiteSpace(search) ? "None" : search },
                { "Total Matching Accounts", res.Accounts.Count.ToString() },
                { "Assets / Liabilities / Equity / Income / Expenses", $"{res.GroupCounts["Assets"]} / {res.GroupCounts["Liabilities"]} / {res.GroupCounts["Equity"]} / {res.GroupCounts["Income"]} / {res.GroupCounts["Expenses"]}" }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Accounts Listed", res.Accounts.Count.ToString() },
                { "Total Cumulative Debits", $"₹{res.Accounts.Sum(a => a.TotalDebit):N2}" },
                { "Total Cumulative Credits", $"₹{res.Accounts.Sum(a => a.TotalCredit):N2}" }
            },
            Headers = new List<string>
            {
                "#", "Code", "Account Name", "Group", "Account Type", "Normal Balance", "Description",
                "Total Debit (₹)", "Total Credit (₹)", "Current Balance (₹)", "Balance Side", "Status"
            },
            Rows = rows,
            TotalsRow = new List<object?>
            {
                "TOTAL", "—", $"{res.Accounts.Count} Accounts", "—", "—", "—", "—",
                res.Accounts.Sum(a => a.TotalDebit),
                res.Accounts.Sum(a => a.TotalCredit),
                "—", "—", "—"
            }
        };

        return new ExportDocument("Chart of Accounts (COA)", "Chart_of_Accounts", sheet);
    }

    // ============================================================
    // SCREEN 3: GENERAL LEDGER (GL) & TRIAL BALANCE
    // ============================================================

    public async Task<GeneralLedgerResponseDto> GetGeneralLedgerAsync(
        long? accountId = null,
        string? accountCode = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? search = null)
    {
        var snap = await LoadOperationalSnapshotAsync();
        if (snap.Accounts.Count == 0)
            throw new InvalidOperationException("Chart of Accounts is empty. Please initialize Chart of Accounts first.");

        ChartOfAccount? targetAccount = null;
        if (accountId.HasValue && accountId.Value > 0)
        {
            targetAccount = snap.Accounts.FirstOrDefault(a => a.AccountId == accountId.Value);
            if (targetAccount == null)
                throw new KeyNotFoundException($"Ledger account with ID {accountId.Value} was not found.");
        }
        else if (!string.IsNullOrWhiteSpace(accountCode))
        {
            var codeNorm = accountCode.Trim();
            targetAccount = snap.Accounts.FirstOrDefault(a => a.Code.Equals(codeNorm, StringComparison.OrdinalIgnoreCase));
            if (targetAccount == null)
                throw new KeyNotFoundException($"Ledger account with code '{codeNorm}' was not found.");
        }
        else
        {
            targetAccount = snap.Accounts.FirstOrDefault(a => a.Code == "1001") ?? snap.Accounts.First();
        }

        // Default fiscal range: April 1 of fiscal year to March 31 next year (matches FY Apr-Mar e.g. 2026-04-01 to 2027-03-31)
        DateTime effectiveStart;
        DateTime effectiveEnd;
        if (fromDate.HasValue || toDate.HasValue)
        {
            effectiveStart = (fromDate ?? new DateTime(2000, 1, 1)).Date;
            effectiveEnd = (toDate ?? DateTime.Today.AddYears(1)).Date;
        }
        else
        {
            var refDate = DateTime.Today;
            int fyStartYear = refDate.Month >= 4 ? refDate.Year : refDate.Year - 1;
            effectiveStart = new DateTime(fyStartYear, 4, 1);
            effectiveEnd = new DateTime(fyStartYear + 1, 3, 31);
        }

        if (effectiveStart > effectiveEnd) (effectiveStart, effectiveEnd) = (effectiveEnd, effectiveStart);
        var periodEndInclusive = effectiveEnd.Date.AddDays(1).AddTicks(-1);

        var allPostings = BuildUnifiedPostings(snap);
        var acctPostings = allPostings
            .Where(p => p.AccountCode.Equals(targetAccount.Code, StringComparison.OrdinalIgnoreCase))
            .OrderBy(p => p.Date)
            .ThenBy(p => p.VoucherNo, StringComparer.OrdinalIgnoreCase)
            .ThenBy(p => p.PostingId, StringComparer.OrdinalIgnoreCase)
            .ToList();

        bool isDebitNormal = targetAccount.NormalBalance.Equals("Debit", StringComparison.OrdinalIgnoreCase);

        decimal priorDebits = acctPostings.Where(p => p.Date < effectiveStart).Sum(p => p.Debit);
        decimal priorCredits = acctPostings.Where(p => p.Date < effectiveStart).Sum(p => p.Credit);
        decimal runningSigned = isDebitNormal ? (priorDebits - priorCredits) : (priorCredits - priorDebits);

        decimal openingMag = Math.Abs(runningSigned);
        string openingSide = runningSigned >= 0m
            ? targetAccount.NormalBalance
            : (isDebitNormal ? "Credit" : "Debit");

        var periodPostings = acctPostings
            .Where(p => p.Date >= effectiveStart && p.Date <= periodEndInclusive)
            .ToList();

        var fullChronologicalRows = new List<GeneralLedgerEntryDto>();
        foreach (var p in periodPostings)
        {
            runningSigned += isDebitNormal ? (p.Debit - p.Credit) : (p.Credit - p.Debit);
            string rowSide = runningSigned >= 0m
                ? targetAccount.NormalBalance
                : (isDebitNormal ? "Credit" : "Debit");

            fullChronologicalRows.Add(new GeneralLedgerEntryDto
            {
                EntryId = p.PostingId,
                Date = p.Date,
                VoucherNo = p.VoucherNo,
                Type = p.Type,
                SourceModule = p.SourceModule,
                SourceId = p.SourceId,
                Particulars = p.Particulars,
                Debit = p.Debit,
                Credit = p.Credit,
                RunningBalance = runningSigned,
                BalanceSide = rowSide
            });
        }

        // Apply optional text search on voucher #, type, or particulars
        List<GeneralLedgerEntryDto> displayedRows;
        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLowerInvariant();
            displayedRows = fullChronologicalRows.Where(r =>
                r.VoucherNo.ToLowerInvariant().Contains(q) ||
                r.Type.ToLowerInvariant().Contains(q) ||
                r.Particulars.ToLowerInvariant().Contains(q) ||
                r.SourceModule.ToLowerInvariant().Contains(q)).ToList();
        }
        else
        {
            displayedRows = fullChronologicalRows;
        }

        decimal totalPeriodDebits = displayedRows.Sum(r => r.Debit);
        decimal totalPeriodCredits = displayedRows.Sum(r => r.Credit);

        // Net closing reflects exact closing balance at end of period (or sum if unfiltered)
        decimal netClosingSigned = string.IsNullOrWhiteSpace(search)
            ? runningSigned
            : (isDebitNormal ? (totalPeriodDebits - totalPeriodCredits) : (totalPeriodCredits - totalPeriodDebits));

        string closingSide = netClosingSigned >= 0m
            ? targetAccount.NormalBalance
            : (isDebitNormal ? "Credit" : "Debit");

        var totalsAllTime = acctPostings.Aggregate((Debit: 0m, Credit: 0m), (acc, p) => (acc.Debit + p.Debit, acc.Credit + p.Credit));
        var accountDto = MapAccountDto(targetAccount, new Dictionary<string, (decimal Debit, decimal Credit)>(StringComparer.OrdinalIgnoreCase)
        {
            { targetAccount.Code, totalsAllTime }
        });

        var options = snap.Accounts
            .Where(a => a.IsActive)
            .OrderBy(a => a.Code)
            .Select(a => new AccountOptionDto
            {
                AccountId = a.AccountId,
                Code = a.Code,
                AccountName = a.AccountName,
                Group = a.AccountGroup,
                NormalBalance = a.NormalBalance
            })
            .ToList();

        return new GeneralLedgerResponseDto
        {
            Account = accountDto,
            FromDate = effectiveStart.ToString("yyyy-MM-dd"),
            ToDate = effectiveEnd.ToString("yyyy-MM-dd"),
            Summary = new GeneralLedgerKpiDto
            {
                OpeningBalance = openingMag,
                OpeningBalanceSide = openingSide,
                TotalPeriodDebits = totalPeriodDebits,
                TotalPeriodCredits = totalPeriodCredits,
                NetClosingBalance = Math.Abs(netClosingSigned),
                NetClosingBalanceSide = closingSide,
                AsOfDate = effectiveEnd.ToString("yyyy-MM-dd")
            },
            AvailableAccounts = options,
            Entries = displayedRows
        };
    }

    public async Task<TrialBalanceResponseDto> GetTrialBalanceAsync(DateTime? fromDate = null, DateTime? toDate = null)
    {
        var snap = await LoadOperationalSnapshotAsync();
        var refDate = DateTime.Today;
        int fyStartYear = refDate.Month >= 4 ? refDate.Year : refDate.Year - 1;

        var start = (fromDate ?? new DateTime(fyStartYear, 4, 1)).Date;
        var end = (toDate ?? new DateTime(fyStartYear + 1, 3, 31)).Date;
        if (start > end) (start, end) = (end, start);
        var endInclusive = end.AddDays(1).AddTicks(-1);

        var allPostings = BuildUnifiedPostings(snap);
        var grouped = allPostings.GroupBy(p => p.AccountCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.OrdinalIgnoreCase);

        var rows = new List<TrialBalanceRowDto>();
        foreach (var acct in snap.Accounts.OrderBy(a => a.Code))
        {
            grouped.TryGetValue(acct.Code, out var postings);
            postings ??= new List<UnifiedPosting>();

            decimal priorDr = postings.Where(p => p.Date < start).Sum(p => p.Debit);
            decimal priorCr = postings.Where(p => p.Date < start).Sum(p => p.Credit);
            decimal opNet = priorDr - priorCr;
            decimal opDr = opNet > 0m ? opNet : 0m;
            decimal opCr = opNet < 0m ? Math.Abs(opNet) : 0m;

            decimal perDr = postings.Where(p => p.Date >= start && p.Date <= endInclusive).Sum(p => p.Debit);
            decimal perCr = postings.Where(p => p.Date >= start && p.Date <= endInclusive).Sum(p => p.Credit);

            decimal clNet = opNet + perDr - perCr;
            decimal clDr = clNet > 0m ? clNet : 0m;
            decimal clCr = clNet < 0m ? Math.Abs(clNet) : 0m;

            rows.Add(new TrialBalanceRowDto
            {
                AccountId = acct.AccountId,
                Code = acct.Code,
                AccountName = acct.AccountName,
                Group = acct.AccountGroup,
                NormalBalance = acct.NormalBalance,
                OpeningDebit = opDr,
                OpeningCredit = opCr,
                PeriodDebit = perDr,
                PeriodCredit = perCr,
                ClosingDebit = clDr,
                ClosingCredit = clCr
            });
        }

        return new TrialBalanceResponseDto
        {
            FromDate = start.ToString("yyyy-MM-dd"),
            ToDate = end.ToString("yyyy-MM-dd"),
            TotalOpeningDebit = rows.Sum(r => r.OpeningDebit),
            TotalOpeningCredit = rows.Sum(r => r.OpeningCredit),
            TotalPeriodDebit = rows.Sum(r => r.PeriodDebit),
            TotalPeriodCredit = rows.Sum(r => r.PeriodCredit),
            TotalClosingDebit = rows.Sum(r => r.ClosingDebit),
            TotalClosingCredit = rows.Sum(r => r.ClosingCredit),
            Accounts = rows
        };
    }

    public async Task<ExportDocument> GenerateGeneralLedgerExportAsync(
        long? accountId = null,
        string? accountCode = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? search = null)
    {
        var gl = await GetGeneralLedgerAsync(accountId, accountCode, fromDate, toDate, search);
        var rows = gl.Entries.Select((e, idx) => new List<object?>
        {
            idx + 1,
            e.Date,
            e.VoucherNo,
            e.Type,
            e.Particulars,
            e.Debit,
            e.Credit,
            e.RunningBalance,
            e.BalanceSide
        }).ToList();

        var sheet = new ExportSheet
        {
            SheetName = $"GL {gl.Account.Code}",
            Title = $"General Ledger (GL) — {gl.Account.Code} • {gl.Account.AccountName} ({gl.Account.Group})",
            Metadata = new Dictionary<string, string>
            {
                { "Account Code & Name", $"{gl.Account.Code} • {gl.Account.AccountName}" },
                { "Group / Type", $"{gl.Account.Group} ({gl.Account.AccountType})" },
                { "Normal Balance", gl.Account.NormalBalance },
                { "Period", $"{gl.FromDate} to {gl.ToDate}" },
                { "Opening Balance", $"₹{gl.Summary.OpeningBalance:N2} {gl.Summary.OpeningBalanceSide}" },
                { "Search Filter", string.IsNullOrWhiteSpace(search) ? "None" : search }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Opening Balance", $"₹{gl.Summary.OpeningBalance:N2} {gl.Summary.OpeningBalanceSide}" },
                { "Total Period Debits", $"₹{gl.Summary.TotalPeriodDebits:N2}" },
                { "Total Period Credits", $"₹{gl.Summary.TotalPeriodCredits:N2}" },
                { "Net Closing Balance", $"₹{gl.Summary.NetClosingBalance:N2} {gl.Summary.NetClosingBalanceSide}" }
            },
            Headers = new List<string>
            {
                "#", "Date", "Voucher #", "Type", "Particulars / Description", "Debit (₹)", "Credit (₹)", "Running Balance (₹)", "Dr/Cr"
            },
            Rows = rows,
            TotalsRow = new List<object?>
            {
                "TOTAL", "—", $"{gl.Entries.Count} Postings", "—", "PERIOD TOTALS & CLOSING",
                gl.Summary.TotalPeriodDebits,
                gl.Summary.TotalPeriodCredits,
                gl.Summary.NetClosingBalance,
                gl.Summary.NetClosingBalanceSide
            }
        };

        return new ExportDocument(
            $"General Ledger - {gl.Account.Code} {gl.Account.AccountName}",
            $"General_Ledger_{gl.Account.Code}",
            sheet);
    }

    // ============================================================
    // SCREEN 4: JOURNAL ENTRIES (JV) — DOUBLE-ENTRY VOUCHERS
    // ============================================================

    public async Task<(int TotalVouchers, decimal TotalVolume, List<JournalVoucherDto> Vouchers)> GetJournalEntriesAsync(
        string? search = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? voucherType = null,
        string? status = null)
    {
        var query = _context.JournalVouchers
            .Include(v => v.Lines)
            .AsNoTracking()
            .AsQueryable();

        if (fromDate.HasValue)
        {
            var start = fromDate.Value.Date;
            query = query.Where(v => v.VoucherDate >= start);
        }

        if (toDate.HasValue)
        {
            var end = toDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(v => v.VoucherDate <= end);
        }

        if (!string.IsNullOrWhiteSpace(voucherType) && !voucherType.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            var vt = voucherType.Trim().ToLower();
            query = query.Where(v => v.VoucherType.ToLower() == vt);
        }

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            var st = status.Trim().ToLower();
            query = query.Where(v => v.Status.ToLower() == st);
        }

        var list = await query
            .OrderByDescending(v => v.VoucherDate)
            .ThenByDescending(v => v.VoucherId)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLowerInvariant();
            list = list.Where(v =>
                v.VoucherNumber.ToLowerInvariant().Contains(q) ||
                v.Narration.ToLowerInvariant().Contains(q) ||
                v.CreatedBy.ToLowerInvariant().Contains(q) ||
                v.VoucherType.ToLowerInvariant().Contains(q) ||
                v.Lines.Any(l =>
                    l.AccountCode.ToLowerInvariant().Contains(q) ||
                    l.AccountName.ToLowerInvariant().Contains(q) ||
                    (l.Description?.ToLowerInvariant().Contains(q) ?? false)))
                .ToList();
        }

        var dtos = list.Select(MapVoucherDto).ToList();
        decimal totalVolume = dtos.Where(v => v.Status == "Posted").Sum(v => v.TotalAmount);
        return (dtos.Count, totalVolume, dtos);
    }

    public async Task<JournalVoucherDto?> GetJournalEntryByIdAsync(long id)
    {
        var v = await _context.JournalVouchers
            .Include(x => x.Lines)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.VoucherId == id);

        return v == null ? null : MapVoucherDto(v);
    }

    private static JournalVoucherDto MapVoucherDto(JournalVoucher v)
    {
        var lines = v.Lines
            .OrderByDescending(l => l.DebitAmount > 0m)
            .ThenBy(l => l.LineId)
            .Select(l => new JournalVoucherLineDto
            {
                LineId = l.LineId,
                AccountId = l.AccountId,
                AccountCode = l.AccountCode,
                AccountName = l.AccountName,
                Description = l.Description,
                Debit = l.DebitAmount,
                Credit = l.CreditAmount
            })
            .ToList();

        return new JournalVoucherDto
        {
            VoucherId = v.VoucherId,
            VoucherNumber = v.VoucherNumber,
            VoucherDate = v.VoucherDate.ToString("yyyy-MM-dd"),
            VoucherType = v.VoucherType,
            Narration = v.Narration,
            TotalAmount = v.TotalAmount,
            TotalDebit = lines.Sum(l => l.Debit),
            TotalCredit = lines.Sum(l => l.Credit),
            CreatedBy = v.CreatedBy,
            Status = v.Status,
            VoidReason = v.VoidReason,
            CreatedAt = v.CreatedAt,
            UpdatedAt = v.UpdatedAt,
            Lines = lines
        };
    }

    public async Task<JournalVoucherDto> CreateJournalVoucherAsync(CreateJournalVoucherRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Narration))
            throw new ArgumentException("Voucher narration is required.");

        if (dto.Lines == null || dto.Lines.Count < 2)
            throw new ArgumentException("At least two journal lines (minimum one Debit and one Credit) are required for a double-entry voucher.");

        var allAccounts = await _context.ChartOfAccounts.AsNoTracking().ToListAsync();
        var byId = allAccounts.ToDictionary(a => a.AccountId);
        var byCode = allAccounts.ToDictionary(a => a.Code, StringComparer.OrdinalIgnoreCase);

        var resolvedLines = new List<JournalVoucherLine>();
        decimal totalDebit = 0m;
        decimal totalCredit = 0m;

        for (int i = 0; i < dto.Lines.Count; i++)
        {
            var reqLine = dto.Lines[i];
            if (reqLine.Debit < 0m || reqLine.Credit < 0m)
                throw new ArgumentException($"Line {i + 1}: Debit and Credit amounts must be non-negative.");

            if (reqLine.Debit > 0m && reqLine.Credit > 0m)
                throw new ArgumentException($"Line {i + 1}: A single line cannot contain both a Debit and a Credit amount. Split into separate lines.");

            if (reqLine.Debit == 0m && reqLine.Credit == 0m)
                throw new ArgumentException($"Line {i + 1}: Either Debit or Credit amount must be greater than zero.");

            ChartOfAccount? acct = null;
            if (reqLine.AccountId.HasValue && reqLine.AccountId.Value > 0)
            {
                byId.TryGetValue(reqLine.AccountId.Value, out acct);
            }
            if (acct == null && !string.IsNullOrWhiteSpace(reqLine.AccountCode))
            {
                byCode.TryGetValue(reqLine.AccountCode.Trim(), out acct);
            }

            if (acct == null)
                throw new ArgumentException($"Line {i + 1}: Valid Chart of Accounts ID or Code is required.");

            if (!acct.IsActive)
                throw new ArgumentException($"Line {i + 1}: Ledger account '{acct.Code} • {acct.AccountName}' is inactive.");

            decimal debit = Math.Round(reqLine.Debit, 2);
            decimal credit = Math.Round(reqLine.Credit, 2);
            totalDebit += debit;
            totalCredit += credit;

            resolvedLines.Add(new JournalVoucherLine
            {
                AccountId = acct.AccountId,
                AccountCode = acct.Code,
                AccountName = acct.AccountName,
                Description = string.IsNullOrWhiteSpace(reqLine.Description) ? null : reqLine.Description.Trim(),
                DebitAmount = debit,
                CreditAmount = credit
            });
        }

        if (totalDebit <= 0m)
            throw new ArgumentException("Voucher total amount must be greater than zero.");

        if (Math.Abs(totalDebit - totalCredit) >= 0.01m)
        {
            throw new ArgumentException(
                $"Double-entry imbalance: Total Debits (₹{totalDebit:N2}) must equal Total Credits (₹{totalCredit:N2}). Difference: ₹{Math.Abs(totalDebit - totalCredit):N2}.");
        }

        var voucherDate = (dto.VoucherDate ?? DateTime.Today).Date;
        string voucherNumber;
        if (!string.IsNullOrWhiteSpace(dto.VoucherNumber))
        {
            voucherNumber = dto.VoucherNumber.Trim().ToUpperInvariant();
            bool dup = await _context.JournalVouchers.AnyAsync(v => v.VoucherNumber.ToLower() == voucherNumber.ToLower());
            if (dup)
                throw new InvalidOperationException($"Journal voucher number '{voucherNumber}' already exists.");
        }
        else
        {
            voucherNumber = await GenerateNextVoucherNumberAsync(voucherDate.Year);
        }

        var now = DateTime.UtcNow;
        var voucher = new JournalVoucher
        {
            VoucherNumber = voucherNumber,
            VoucherDate = voucherDate,
            VoucherType = string.IsNullOrWhiteSpace(dto.VoucherType) ? "JV" : dto.VoucherType.Trim(),
            Narration = dto.Narration.Trim(),
            TotalAmount = totalDebit,
            CreatedBy = string.IsNullOrWhiteSpace(dto.CreatedBy) ? "admin" : dto.CreatedBy.Trim(),
            Status = "Posted",
            CreatedAt = now,
            UpdatedAt = now,
            Lines = resolvedLines
        };

        _context.JournalVouchers.Add(voucher);
        await _context.SaveChangesAsync();

        return (await GetJournalEntryByIdAsync(voucher.VoucherId))!;
    }

    private async Task<string> GenerateNextVoucherNumberAsync(int year)
    {
        string prefix = $"JV-{year}-";
        var existingNums = await _context.JournalVouchers.AsNoTracking()
            .Where(v => v.VoucherNumber.StartsWith(prefix))
            .Select(v => v.VoucherNumber)
            .ToListAsync();

        int maxSeq = 0;
        foreach (var num in existingNums)
        {
            var suffix = num.Substring(prefix.Length);
            if (int.TryParse(suffix, NumberStyles.Integer, CultureInfo.InvariantCulture, out int seq) && seq > maxSeq)
            {
                maxSeq = seq;
            }
        }

        return $"{prefix}{(maxSeq + 1):D3}";
    }

    public async Task<JournalVoucherDto?> VoidJournalVoucherAsync(long id, VoidJournalVoucherRequestDto? dto = null)
    {
        var voucher = await _context.JournalVouchers
            .Include(v => v.Lines)
            .FirstOrDefaultAsync(v => v.VoucherId == id);

        if (voucher == null) return null;

        if (voucher.Status.Equals("Void", StringComparison.OrdinalIgnoreCase))
            return MapVoucherDto(voucher);

        voucher.Status = "Void";
        voucher.VoidReason = string.IsNullOrWhiteSpace(dto?.Reason)
            ? "Voided by administrator"
            : dto.Reason.Trim();
        voucher.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapVoucherDto(voucher);
    }

    public async Task<bool> DeleteJournalVoucherAsync(long id)
    {
        var voucher = await _context.JournalVouchers
            .Include(v => v.Lines)
            .FirstOrDefaultAsync(v => v.VoucherId == id);

        if (voucher == null) return false;

        _context.JournalVoucherLines.RemoveRange(voucher.Lines);
        _context.JournalVouchers.Remove(voucher);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ExportDocument> GenerateJournalEntriesExportAsync(
        string? search = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? voucherType = null,
        string? status = null)
    {
        var (totalVouchers, totalVolume, vouchers) = await GetJournalEntriesAsync(search, fromDate, toDate, voucherType, status);

        var rows = new List<List<object?>>();
        int index = 1;
        decimal grandDebit = 0m;
        decimal grandCredit = 0m;

        foreach (var v in vouchers)
        {
            foreach (var line in v.Lines)
            {
                grandDebit += line.Debit;
                grandCredit += line.Credit;

                rows.Add(new List<object?>
                {
                    index++,
                    v.VoucherNumber,
                    v.VoucherDate,
                    v.VoucherType,
                    v.CreatedBy,
                    v.Status,
                    v.Narration,
                    line.AccountCode,
                    line.AccountName,
                    line.Description ?? "—",
                    line.Debit,
                    line.Credit
                });
            }
        }

        var sheet = new ExportSheet
        {
            SheetName = "Journal Entries (JV)",
            Title = "Journal Vouchers (JV) — Double-Entry Audit Register",
            Metadata = new Dictionary<string, string>
            {
                { "Total Vouchers", totalVouchers.ToString() },
                { "Posted Voucher Volume", $"₹{totalVolume:N2}" },
                { "Status Filter", string.IsNullOrWhiteSpace(status) ? "All" : status },
                { "Voucher Type Filter", string.IsNullOrWhiteSpace(voucherType) ? "All" : voucherType },
                { "Search Query", string.IsNullOrWhiteSpace(search) ? "None" : search }
            },
            SummaryKpis = new Dictionary<string, string>
            {
                { "Total Vouchers", totalVouchers.ToString() },
                { "Total Lines", rows.Count.ToString() },
                { "Total Debits", $"₹{grandDebit:N2}" },
                { "Total Credits", $"₹{grandCredit:N2}" }
            },
            Headers = new List<string>
            {
                "#", "Voucher #", "Date", "Type", "Created By", "Status", "Narration",
                "Account Code", "Account Name", "Line Description", "Debit (₹)", "Credit (₹)"
            },
            Rows = rows,
            TotalsRow = new List<object?>
            {
                "TOTAL", $"{totalVouchers} Vouchers", "—", "—", "—", "—", "BALANCED DOUBLE-ENTRY TOTALS",
                "—", "—", "—", grandDebit, grandCredit
            }
        };

        return new ExportDocument("Journal Entries (JV)", "Journal_Entries_JV", sheet);
    }
}
