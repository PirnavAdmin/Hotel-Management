using HMS.Models;
using Microsoft.EntityFrameworkCore;

namespace HMS.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; }

    public DbSet<Role> Roles { get; set; }

    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }

    public DbSet<MenuItem> MenuItems { get; set; }

    public DbSet<StaffPerson> StaffPersons { get; set; }

    public DbSet<RestaurantTable> RestaurantTables { get; set; }

    public DbSet<KotOrder> KotOrders { get; set; }

    public DbSet<KotOrderItem> KotOrderItems { get; set; }

    // Merged Hotel Management DbSets
    public DbSet<DiningTable> DiningTables { get; set; }

    public DbSet<DiningSection> DiningSections { get; set; }

    public DbSet<MenuCategory> MenuCategories { get; set; }

    public DbSet<Staff> Staff { get; set; }

    public DbSet<Order> Orders { get; set; }

    public DbSet<OrderItem> OrderItems { get; set; }

    public DbSet<KitchenStation> KitchenStations { get; set; }

    public DbSet<KitchenOrderTicket> KitchenOrderTickets { get; set; }

    public DbSet<Invoice> Invoices { get; set; }

    public DbSet<InvoicePayment> InvoicePayments { get; set; }

    public DbSet<Customer> Customers { get; set; }

    public DbSet<Reservation> Reservations { get; set; }

    public DbSet<Ingredient> Ingredients { get; set; }

    public DbSet<Supplier> Suppliers { get; set; }

    public DbSet<PurchaseOrder> PurchaseOrders { get; set; }

    public DbSet<Attendance> Attendances { get; set; }

    public DbSet<Promotion> Promotions { get; set; }

    public DbSet<DeliveryOrder> DeliveryOrders { get; set; }
    public DbSet<RestaurantSetting> RestaurantSettings { get; set; }
    public DbSet<Setting> Settings { get; set; }
    public DbSet<InventoryPurchase> InventoryPurchases { get; set; }
    public DbSet<SalaryPayment> SalaryPayments { get; set; }

    // Accounting & Audit
    public DbSet<ChartOfAccount> ChartOfAccounts { get; set; }
    public DbSet<JournalVoucher> JournalVouchers { get; set; }
    public DbSet<JournalVoucherLine> JournalVoucherLines { get; set; }
    public DbSet<DailyCashBankRegister> DailyCashBankRegisters { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ============================================================
        // USERS
        // ============================================================

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");

            entity.HasKey(u => u.UserId);

            entity.Property(u => u.UserId)
                .HasColumnName("user_id");

            entity.Property(u => u.RoleId)
                .HasColumnName("role_id")
                .IsRequired();

            entity.Property(u => u.BranchId)
                .HasColumnName("branch_id");

            entity.Property(u => u.UserName)
                .HasColumnName("user_name")
                .HasMaxLength(60)
                .IsRequired();

            entity.Property(u => u.Password)
                .HasColumnName("password")
                .HasMaxLength(255);

            // ConfirmPassword is for request validation only; never stored in the database.
            entity.Ignore(u => u.ConfirmPassword);

            entity.Property(u => u.PasswordHash)
                .HasColumnName("password_hash")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(u => u.FullName)
                .HasColumnName("full_name")
                .HasMaxLength(100);

            entity.Property(u => u.Email)
                .HasColumnName("email")
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(u => u.Phone)
                .HasColumnName("phone")
                .HasMaxLength(20);

            entity.Property(u => u.PinCode)
                .HasColumnName("pin_code")
                .HasMaxLength(10);

            entity.Property(u => u.IsActive)
                .HasColumnName("is_active")
                .IsRequired();

            entity.Property(u => u.LastLogin)
                .HasColumnName("last_login");

            entity.Property(u => u.DeletedAt)
                .HasColumnName("deleted_at");

            entity.Property(u => u.CreatedAt)
                .HasColumnName("created_at");

            entity.Property(u => u.UpdatedAt)
                .HasColumnName("updated_at");

            entity.Property(u => u.CreatedBy)
                .HasColumnName("created_by");

            entity.Property(u => u.UpdatedBy)
                .HasColumnName("updated_by");

            entity.HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ============================================================
        // ROLES
        // ============================================================

        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("roles");

            entity.HasKey(r => r.RoleId);

            entity.Property(r => r.RoleId)
                .HasColumnName("role_id");

            entity.Property(r => r.RoleName)
                .HasColumnName("role_name")
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(r => r.Description)
                .HasColumnName("description")
                .HasMaxLength(255);

            entity.Property(r => r.IsActive)
                .HasColumnName("is_active")
                .IsRequired();

            entity.Property(r => r.DeletedAt)
                .HasColumnName("deleted_at");

            entity.Property(r => r.CreatedAt)
                .HasColumnName("created_at");

            entity.Property(r => r.UpdatedAt)
                .HasColumnName("updated_at");

            entity.Property(r => r.CreatedBy)
                .HasColumnName("created_by");

            entity.Property(r => r.UpdatedBy)
                .HasColumnName("updated_by");
        });

        // ============================================================
        // PASSWORD RESET TOKENS
        // ============================================================

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.ToTable("password_reset_tokens");

            entity.HasKey(x => x.ResetId);

            entity.Property(x => x.ResetId)
                .HasColumnName("reset_id");

            entity.Property(x => x.UserId)
                .HasColumnName("user_id")
                .IsRequired();

            entity.Property(x => x.OtpHash)
                .HasColumnName("otp_hash")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(x => x.ExpiresAt)
                .HasColumnName("expires_at")
                .IsRequired();

            entity.Property(x => x.VerifiedAt)
                .HasColumnName("verified_at");

            entity.Property(x => x.UsedAt)
                .HasColumnName("used_at");

            entity.Property(x => x.Attempts)
                .HasColumnName("attempts")
                .IsRequired();

            entity.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ============================================================
        // MENU ITEMS
        // ============================================================

        modelBuilder.Entity<MenuItem>(entity =>
        {
            entity.ToTable("menu_items");
            entity.HasKey(m => m.MenuItemId);
        });

        // ============================================================
        // STAFF PERSONS
        // ============================================================

        modelBuilder.Entity<StaffPerson>(entity =>
        {
            entity.ToTable("staff_persons");
            entity.HasKey(s => s.StaffId);
        });

        // ============================================================
        // RESTAURANT TABLES
        // ============================================================

        modelBuilder.Entity<RestaurantTable>(entity =>
        {
            entity.ToTable("restaurant_tables");
            entity.HasKey(t => t.TableId);

            entity.HasOne(t => t.AssignedServer)
                .WithMany(s => s.AssignedTables)
                .HasForeignKey(t => t.AssignedServerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ============================================================
        // KITCHEN ORDER TICKETS (KOT)
        // ============================================================

        modelBuilder.Entity<KotOrder>(entity =>
        {
            entity.ToTable("kot_orders");
            entity.HasKey(o => o.OrderId);
        });

        modelBuilder.Entity<KotOrderItem>(entity =>
        {
            entity.ToTable("kot_order_items");
            entity.HasKey(i => i.OrderItemId);

            entity.HasOne(i => i.Order)
                .WithMany(o => o.Items)
                .HasForeignKey(i => i.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ============================================================
        // MERGED HOTEL MANAGEMENT ENTITY CONFIGURATIONS
        // ============================================================

        modelBuilder.Entity<DiningTable>(entity =>
        {
            entity.ToTable("dining_tables");
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Id).HasColumnName("dining_table_id").ValueGeneratedOnAdd();
            entity.Property(t => t.SectionId).HasColumnName("section_id").IsRequired();
            entity.Property(t => t.Name).HasColumnName("table_number").HasMaxLength(50).IsRequired();
            entity.Property(t => t.Capacity).HasColumnName("seating_capacity").IsRequired();
            entity.Property(t => t.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(t => t.AssignedWaiterId).HasColumnName("assigned_waiter_id");
            entity.Property(t => t.IsActive).HasColumnName("is_active");
            entity.Property(t => t.IsDeleted).HasColumnName("is_deleted");
            entity.Property(t => t.CreatedAt).HasColumnName("created_at");
            entity.Property(t => t.UpdatedAt).HasColumnName("updated_at");
            entity.Property(t => t.CreatedBy).HasColumnName("created_by");
            entity.Property(t => t.UpdatedBy).HasColumnName("updated_by");
        });

        modelBuilder.Entity<DiningSection>(entity =>
        {
            entity.ToTable("dining_sections");
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Id).HasColumnName("section_id").ValueGeneratedOnAdd();
            entity.Property(s => s.OutletId).HasColumnName("outlet_id").IsRequired();
            entity.Property(s => s.SectionName).HasColumnName("section_name").HasMaxLength(100).IsRequired();
            entity.Property(s => s.IsActive).HasColumnName("is_active");
            entity.Property(s => s.IsDeleted).HasColumnName("is_deleted");
            entity.Property(s => s.CreatedAt).HasColumnName("created_at");
            entity.Property(s => s.UpdatedAt).HasColumnName("updated_at");
            entity.Property(s => s.CreatedBy).HasColumnName("created_by");
            entity.Property(s => s.UpdatedBy).HasColumnName("updated_by");
        });

        modelBuilder.Entity<MenuCategory>(entity =>
        {
            entity.ToTable("menu_categories");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasColumnName("id");
            entity.Property(c => c.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(c => c.DisplayOrder).HasColumnName("display_order");
            entity.Ignore(c => c.Items);
        });

        modelBuilder.Entity<Staff>(entity =>
        {
            entity.ToTable("staff");
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(s => s.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(s => s.Role).HasColumnName("role").HasMaxLength(50);
            entity.Property(s => s.Phone).HasColumnName("phone").HasMaxLength(20);
            entity.Property(s => s.Shift).HasColumnName("shift").HasMaxLength(50);
            entity.Property(s => s.Status).HasColumnName("status").HasMaxLength(20);
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("restaurant_orders");
            entity.HasKey(o => o.Id);
            entity.Property(o => o.Id).HasColumnName("order_id").ValueGeneratedOnAdd();
            entity.Property(o => o.OrderNumber).HasColumnName("order_number").HasMaxLength(30).IsRequired();
            entity.Property(o => o.OutletId).HasColumnName("outlet_id").IsRequired();
            entity.Property(o => o.OrderType).HasColumnName("order_type").HasMaxLength(30).IsRequired();
            entity.Property(o => o.TableId).HasColumnName("dining_table_id");
            entity.Property(o => o.BookingId).HasColumnName("booking_id");
            entity.Property(o => o.WaiterId).HasColumnName("waiter_id");
            entity.Property(o => o.Guests).HasColumnName("guests_count").IsRequired();
            entity.Property(o => o.Status).HasColumnName("order_status").HasMaxLength(20).IsRequired();
            entity.Property(o => o.SpecialInstructions).HasColumnName("special_instructions");
            entity.Property(o => o.IsActive).HasColumnName("is_active");
            entity.Property(o => o.IsDeleted).HasColumnName("is_deleted");
            entity.Property(o => o.CreatedAt).HasColumnName("created_at");
            entity.Property(o => o.UpdatedAt).HasColumnName("updated_at");
            entity.Property(o => o.CreatedBy).HasColumnName("created_by");
            entity.Property(o => o.UpdatedBy).HasColumnName("updated_by");
            entity.Property(o => o.CustomerId).HasColumnName("customer_id");
            entity.Property(o => o.CustomerName).HasColumnName("customer_name").HasMaxLength(120);
            entity.Property(o => o.CustomerPhone).HasColumnName("customer_phone").HasMaxLength(20);
            entity.Property(o => o.CustomerEmail).HasColumnName("customer_email").HasMaxLength(120);
            entity.Property(o => o.PackagingCharge).HasColumnName("packaging_charge").HasPrecision(18, 2);
            entity.Property(o => o.FulfillmentStatus).HasColumnName("fulfillment_status").HasMaxLength(30);
            entity.Property(o => o.PaymentStatus).HasColumnName("payment_status").HasMaxLength(20);
            entity.Property(o => o.PaymentMethod).HasColumnName("payment_method").HasMaxLength(30);
            entity.Property(o => o.IdempotencyKey).HasColumnName("idempotency_key").HasMaxLength(100);
            entity.Property(o => o.ServiceCharge).HasColumnName("service_charge").HasPrecision(18, 2);
            entity.Property(o => o.CancellationReason).HasColumnName("cancellation_reason").HasMaxLength(255);
            entity.Property(o => o.CancelledAt).HasColumnName("cancelled_at");
            entity.Property(o => o.CancelledBy).HasColumnName("cancelled_by");
            entity.Property(o => o.CancelledByName).HasColumnName("cancelled_by_name").HasMaxLength(120);
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.ToTable("order_items");
            entity.HasKey(oi => oi.Id);
            entity.Property(oi => oi.Id).HasColumnName("order_item_id").ValueGeneratedOnAdd();
            entity.Property(oi => oi.OrderId).HasColumnName("order_id").IsRequired();
            entity.Property(oi => oi.KotId).HasColumnName("kot_id").IsRequired(false);
            entity.Property(oi => oi.BotId).HasColumnName("bot_id").IsRequired(false);
            entity.Property(oi => oi.MenuItemId).HasColumnName("menu_item_id").IsRequired();
            entity.Property(oi => oi.VariantId).HasColumnName("variant_id");
            entity.Property(oi => oi.Name).HasColumnName("item_name").HasMaxLength(150).IsRequired();
            entity.Property(oi => oi.Price).HasColumnName("unit_price").HasPrecision(10, 2).IsRequired();
            entity.Property(oi => oi.Quantity).HasColumnName("quantity").IsRequired();
            entity.Property(oi => oi.TotalPrice).HasColumnName("total_price").HasPrecision(10, 2).IsRequired();
            entity.Property(oi => oi.Notes).HasColumnName("preparation_notes").HasMaxLength(255);
            entity.Property(oi => oi.KotStatus).HasColumnName("item_status").HasMaxLength(50).IsRequired();
            entity.Property(oi => oi.IsActive).HasColumnName("is_active");
            entity.Property(oi => oi.IsDeleted).HasColumnName("is_deleted");
            entity.Property(oi => oi.CreatedAt).HasColumnName("created_at");
            entity.Property(oi => oi.UpdatedAt).HasColumnName("updated_at");
            entity.Property(oi => oi.CreatedBy).HasColumnName("created_by");
            entity.Property(oi => oi.UpdatedBy).HasColumnName("updated_by");

            entity.HasOne(oi => oi.Order)
                .WithMany(o => o.Items)
                .HasForeignKey(oi => oi.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<KitchenStation>(entity =>
        {
            entity.ToTable("kitchen_stations");
            entity.HasKey(s => s.StationId);
            entity.Property(s => s.StationId).HasColumnName("station_id").ValueGeneratedOnAdd();
            entity.Property(s => s.OutletId).HasColumnName("outlet_id").IsRequired();
            entity.Property(s => s.StationName).HasColumnName("station_name").HasMaxLength(100).IsRequired();
            entity.Property(s => s.PrinterIp).HasColumnName("printer_ip").HasMaxLength(50);
            entity.Property(s => s.IsActive).HasColumnName("is_active");
            entity.Property(s => s.IsDeleted).HasColumnName("is_deleted");
            entity.Property(s => s.CreatedAt).HasColumnName("created_at");
            entity.Property(s => s.UpdatedAt).HasColumnName("updated_at");
            entity.Property(s => s.CreatedBy).HasColumnName("created_by");
            entity.Property(s => s.UpdatedBy).HasColumnName("updated_by");
        });

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable("invoices");
            entity.HasKey(i => i.InvoiceId);
            entity.Property(i => i.InvoiceId).HasColumnName("invoice_id").ValueGeneratedOnAdd();
            entity.Property(i => i.OrderId).HasColumnName("order_id").IsRequired();
            entity.Property(i => i.InvoiceNumber).HasColumnName("invoice_number").HasMaxLength(50).IsRequired();
            entity.Property(i => i.Subtotal).HasColumnName("subtotal").HasPrecision(18, 2);
            entity.Property(i => i.TaxableAmount).HasColumnName("taxable_amount").HasPrecision(18, 2);
            entity.Property(i => i.TaxAmount).HasColumnName("tax_amount").HasPrecision(18, 2);
            entity.Property(i => i.DiscountAmount).HasColumnName("discount_amount").HasPrecision(18, 2);
            entity.Property(i => i.TotalAmount).HasColumnName("total_amount").HasPrecision(18, 2);
            entity.Property(i => i.PaidAmount).HasColumnName("paid_amount").HasPrecision(18, 2);
            entity.Property(i => i.AmountPaid).HasColumnName("amount_paid").HasPrecision(18, 2);
            entity.Property(i => i.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(i => i.CreatedAt).HasColumnName("created_at");
            entity.Property(i => i.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(i => i.Payments)
                  .WithOne()
                  .HasForeignKey(p => p.InvoiceId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InvoicePayment>(entity =>
        {
            entity.ToTable("invoice_payments");
            entity.HasKey(p => p.PaymentId);
            entity.Property(p => p.PaymentId).HasColumnName("payment_id").ValueGeneratedOnAdd();
            entity.Property(p => p.InvoiceId).HasColumnName("invoice_id").IsRequired();
            entity.Property(p => p.Amount).HasColumnName("amount").HasPrecision(18, 2);
            entity.Property(p => p.AmountPaid).HasColumnName("amount_paid").HasPrecision(18, 2);
            entity.Property(p => p.PaymentMode).HasColumnName("payment_mode").HasMaxLength(30).IsRequired();
            entity.Property(p => p.PaymentMethod).HasColumnName("payment_method").HasMaxLength(20);
            entity.Property(p => p.TransactionReference).HasColumnName("transaction_reference").HasMaxLength(100);
            entity.Property(p => p.TxnReference).HasColumnName("txn_reference").HasMaxLength(100);
            entity.Property(p => p.PaymentStatus).HasColumnName("payment_status").HasMaxLength(20);
            entity.Property(p => p.GatewayProvider).HasColumnName("gateway_provider").HasMaxLength(40);
            entity.Property(p => p.GatewayOrderId).HasColumnName("gateway_order_id").HasMaxLength(100);
            entity.Property(p => p.GatewayPaymentId).HasColumnName("gateway_payment_id").HasMaxLength(100);
            entity.Property(p => p.GatewaySignature).HasColumnName("gateway_signature").HasMaxLength(255);
            entity.Property(p => p.FailureReason).HasColumnName("failure_reason").HasMaxLength(255);
            entity.Property(p => p.IdempotencyKey).HasColumnName("idempotency_key").HasMaxLength(100);
            entity.Property(p => p.PaidAt).HasColumnName("paid_at");
        });

        modelBuilder.Entity<KitchenOrderTicket>(entity =>
        {
            entity.ToTable("kitchen_order_tickets");
            entity.HasKey(k => k.Id);
            entity.Property(k => k.Id).HasColumnName("kot_id").ValueGeneratedOnAdd();
            entity.Property(k => k.KotNumber).HasColumnName("kot_number").HasMaxLength(30).IsRequired();
            entity.Property(k => k.OrderId).HasColumnName("order_id").IsRequired();
            entity.Property(k => k.StationId).HasColumnName("station_id").IsRequired();
            entity.Property(k => k.BatchNumber).HasColumnName("batch_number").IsRequired();
            entity.Property(k => k.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(k => k.PreparedByChefId).HasColumnName("prepared_by_chef_id");
            entity.Property(k => k.PrintedAt).HasColumnName("printed_at");
            entity.Property(k => k.CompletedAt).HasColumnName("completed_at");
            entity.Property(k => k.IsActive).HasColumnName("is_active");
            entity.Property(k => k.IsDeleted).HasColumnName("is_deleted");
            entity.Property(k => k.CreatedAt).HasColumnName("created_at");
            entity.Property(k => k.UpdatedAt).HasColumnName("updated_at");
            entity.Property(k => k.CreatedBy).HasColumnName("created_by");
            entity.Property(k => k.UpdatedBy).HasColumnName("updated_by");

            entity.HasOne(k => k.Order)
                .WithMany()
                .HasForeignKey(k => k.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ============================================================
        // SALARY PAYMENTS
        // ============================================================

        modelBuilder.Entity<SalaryPayment>(entity =>
        {
            entity.ToTable("salary_payments");
            entity.HasKey(e => e.PaymentId);
            entity.Property(e => e.PaymentId).HasColumnName("payment_id");
            entity.Property(e => e.StaffId).HasColumnName("staff_id");
            entity.Property(e => e.StaffName).HasColumnName("staff_name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.RoleTitle).HasColumnName("role_title").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Department).HasColumnName("department").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Amount).HasColumnName("amount").HasPrecision(18, 2);
            entity.Property(e => e.PaymentDate).HasColumnName("payment_date");
            entity.Property(e => e.PaymentMonth).HasColumnName("payment_month").HasMaxLength(20).IsRequired();
            entity.Property(e => e.PaymentMethod).HasColumnName("payment_method").HasMaxLength(50).IsRequired();
            entity.Property(e => e.TransactionReference).HasColumnName("transaction_reference").HasMaxLength(100);
            entity.Property(e => e.Remarks).HasColumnName("remarks").HasMaxLength(255);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.StaffPerson)
                  .WithMany(s => s.SalaryPayments)
                  .HasForeignKey(e => e.StaffId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ============================================================
        // INVENTORY PURCHASES
        // ============================================================

        // ============================================================
        // ACCOUNTING & AUDIT (COA, JOURNAL VOUCHERS, DAILY REGISTER)
        // ============================================================

        modelBuilder.Entity<ChartOfAccount>(entity =>
        {
            entity.ToTable("chart_of_accounts");
            entity.HasKey(e => e.AccountId);
            entity.Property(e => e.AccountId).HasColumnName("account_id").ValueGeneratedOnAdd();
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(20).IsRequired();
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.AccountName).HasColumnName("account_name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.AccountGroup).HasColumnName("account_group").HasMaxLength(40).IsRequired();
            entity.Property(e => e.AccountType).HasColumnName("account_type").HasMaxLength(80).IsRequired();
            entity.Property(e => e.NormalBalance).HasColumnName("normal_balance").HasMaxLength(15).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(500);
            entity.Property(e => e.IsSystemAccount).HasColumnName("is_system_account");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<JournalVoucher>(entity =>
        {
            entity.ToTable("journal_vouchers");
            entity.HasKey(e => e.VoucherId);
            entity.Property(e => e.VoucherId).HasColumnName("voucher_id").ValueGeneratedOnAdd();
            entity.Property(e => e.VoucherNumber).HasColumnName("voucher_number").HasMaxLength(40).IsRequired();
            entity.HasIndex(e => e.VoucherNumber).IsUnique();
            entity.Property(e => e.VoucherDate).HasColumnName("voucher_date");
            entity.Property(e => e.VoucherType).HasColumnName("voucher_type").HasMaxLength(40).IsRequired();
            entity.Property(e => e.Narration).HasColumnName("narration").HasMaxLength(500).IsRequired();
            entity.Property(e => e.TotalAmount).HasColumnName("total_amount").HasPrecision(18, 2);
            entity.Property(e => e.CreatedBy).HasColumnName("created_by").HasMaxLength(100);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(e => e.VoidReason).HasColumnName("void_reason").HasMaxLength(255);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(v => v.Lines)
                  .WithOne(l => l.Voucher)
                  .HasForeignKey(l => l.VoucherId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<JournalVoucherLine>(entity =>
        {
            entity.ToTable("journal_voucher_lines");
            entity.HasKey(e => e.LineId);
            entity.Property(e => e.LineId).HasColumnName("line_id").ValueGeneratedOnAdd();
            entity.Property(e => e.VoucherId).HasColumnName("voucher_id").IsRequired();
            entity.Property(e => e.AccountId).HasColumnName("account_id").IsRequired();
            entity.Property(e => e.AccountCode).HasColumnName("account_code").HasMaxLength(20).IsRequired();
            entity.Property(e => e.AccountName).HasColumnName("account_name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(255);
            entity.Property(e => e.DebitAmount).HasColumnName("debit_amount").HasPrecision(18, 2);
            entity.Property(e => e.CreditAmount).HasColumnName("credit_amount").HasPrecision(18, 2);

            entity.HasOne(l => l.Account)
                  .WithMany(a => a.JournalLines)
                  .HasForeignKey(l => l.AccountId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DailyCashBankRegister>(entity =>
        {
            entity.ToTable("daily_cash_bank_registers");
            entity.HasKey(e => e.RegisterId);
            entity.Property(e => e.RegisterId).HasColumnName("register_id").ValueGeneratedOnAdd();
            entity.Property(e => e.BusinessDate).HasColumnName("business_date");
            entity.HasIndex(e => e.BusinessDate).IsUnique();
            entity.Property(e => e.OpeningCashFloat).HasColumnName("opening_cash_float").HasPrecision(18, 2);
            entity.Property(e => e.OpeningBankBalance).HasColumnName("opening_bank_balance").HasPrecision(18, 2);
            entity.Property(e => e.TotalOpeningBalance).HasColumnName("total_opening_balance").HasPrecision(18, 2);
            entity.Property(e => e.PhysicalCashCount).HasColumnName("physical_cash_count").HasPrecision(18, 2);
            entity.Property(e => e.DenominationsJson).HasColumnName("denominations_json").HasMaxLength(1000);
            entity.Property(e => e.CashVariance).HasColumnName("cash_variance").HasPrecision(18, 2);
            entity.Property(e => e.ShiftStatus).HasColumnName("shift_status").HasMaxLength(20).IsRequired();
            entity.Property(e => e.ShiftOpenedAt).HasColumnName("shift_opened_at");
            entity.Property(e => e.ShiftClosedAt).HasColumnName("shift_closed_at");
            entity.Property(e => e.OpenedBy).HasColumnName("opened_by").HasMaxLength(100);
            entity.Property(e => e.ClosedBy).HasColumnName("closed_by").HasMaxLength(100);
            entity.Property(e => e.Notes).HasColumnName("notes").HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<InventoryPurchase>(entity =>
        {
            entity.ToTable("inventory_purchases");
            entity.HasKey(e => e.PurchaseId);
            entity.Property(e => e.PurchaseId).HasColumnName("purchase_id");
            entity.Property(e => e.IngredientId).HasColumnName("ingredient_id");
            entity.Property(e => e.ItemName).HasColumnName("item_name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Department).HasColumnName("department").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Supplier).HasColumnName("supplier").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Quantity).HasColumnName("quantity").HasPrecision(18, 2);
            entity.Property(e => e.UnitCost).HasColumnName("unit_cost").HasPrecision(18, 2);
            entity.Property(e => e.TotalAmount).HasColumnName("total_amount").HasPrecision(18, 2);
            entity.Property(e => e.Note).HasColumnName("note").HasMaxLength(255);
            entity.Property(e => e.PurchaseDate).HasColumnName("purchase_date");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });
    }
}
