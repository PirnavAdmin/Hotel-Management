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
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.ToTable("order_items");
            entity.HasKey(oi => oi.Id);
            entity.Property(oi => oi.Id).HasColumnName("order_item_id").ValueGeneratedOnAdd();
            entity.Property(oi => oi.OrderId).HasColumnName("order_id").IsRequired();
            entity.Property(oi => oi.KotId).HasColumnName("kot_id").IsRequired(false);
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
    }
}