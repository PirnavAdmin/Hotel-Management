using HMS.Models;
using Microsoft.EntityFrameworkCore;
using System.Data.Common;

namespace HMS.Data;

public static class DbInitializer
{
    public static void Initialize(AppDbContext context)
    {
        EnsureTablesSchema(context);
        EnsureStoredProcedures(context);

        // ============================================================
        // FIND OR CREATE ADMIN ROLE
        // ============================================================

        var adminRole = context.Roles
            .FirstOrDefault(r =>
                r.RoleName == "Admin" &&
                r.DeletedAt == null);

        if (adminRole == null)
        {
            adminRole = new Role
            {
                RoleName = "Admin",
                Description = "Full system administration access",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Roles.Add(adminRole);
            context.SaveChanges();
        }

        var posRole = context.Roles.FirstOrDefault(r => r.RoleName == "User POS" && r.DeletedAt == null);
        if (posRole == null)
        {
            posRole = new Role
            {
                RoleName = "User POS",
                Description = "Billing and floor orders access",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Roles.Add(posRole);
            context.SaveChanges();
        }

        var kotRole = context.Roles.FirstOrDefault(r => r.RoleName == "Kitchen KOT" && r.DeletedAt == null);
        if (kotRole == null)
        {
            kotRole = new Role
            {
                RoleName = "Kitchen KOT",
                Description = "Kitchen display system access",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Roles.Add(kotRole);
            context.SaveChanges();
        }

        // ============================================================
        // FIND ADMIN USER
        // ============================================================

        var adminUser = context.Users.FirstOrDefault(u => u.UserName == "admin" && u.DeletedAt == null);
        const string adminUsername = "admin";
        const string adminPassword = "Admin@123";
        const string adminEmail = "admin@avsrfoodcourt.com";

        if (adminUser == null)
        {
            adminUser = new User
            {
                RoleId = adminRole.RoleId,
                BranchId = null,
                FullName = "AVULA VENKATA SURESH REDDY",
                UserName = adminUsername,
                Password = adminPassword,
                ConfirmPassword = adminPassword,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                Email = adminEmail,
                Phone = "9999999999",
                PinCode = "1234",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Users.Add(adminUser);
            context.SaveChanges();
        }
        else
        {
            adminUser.RoleId = adminRole.RoleId;
            adminUser.FullName = "AVULA VENKATA SURESH REDDY";
            adminUser.UserName = adminUsername;
            adminUser.Password = adminPassword;
            adminUser.ConfirmPassword = adminPassword;
            adminUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword);
            adminUser.Email = adminEmail;
            adminUser.BranchId = null;
            adminUser.IsActive = true;
            context.SaveChanges();
        }

        // Also seed/update "admins" username alias so both admin and admins logins work
        var adminsUser = context.Users.FirstOrDefault(u => u.UserName == "admins" && u.DeletedAt == null);
        if (adminsUser == null)
        {
            adminsUser = new User
            {
                RoleId = adminRole.RoleId,
                BranchId = null,
                FullName = "AVULA VENKATA SURESH REDDY (Admin)",
                UserName = "admins",
                Password = adminPassword,
                ConfirmPassword = adminPassword,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                Email = "admins@avsrfoodcourt.com",
                Phone = "9999999999",
                PinCode = "1234",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Users.Add(adminsUser);
            context.SaveChanges();
        }
        else
        {
            adminsUser.RoleId = adminRole.RoleId;
            adminsUser.FullName = "AVULA VENKATA SURESH REDDY (Admin)";
            adminsUser.UserName = "admins";
            adminsUser.Password = adminPassword;
            adminsUser.ConfirmPassword = adminPassword;
            adminsUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword);
            adminsUser.Email = "admins@avsrfoodcourt.com";
            adminsUser.BranchId = null;
            adminsUser.IsActive = true;
            context.SaveChanges();
        }

        // Seed Sample POS User
        var posUser = context.Users.FirstOrDefault(u => u.UserName == "ravi.kumar" && u.DeletedAt == null);
        if (posUser == null && posRole != null)
        {
            posUser = new User
            {
                RoleId = posRole.RoleId,
                BranchId = null,
                FullName = "Ravi Kumar",
                UserName = "ravi.kumar",
                Password = "Password123",
                ConfirmPassword = "Password123",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123"),
                Email = "ravi.kumar@avsrfoodcourt.com",
                Phone = "9876543210",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Users.Add(posUser);
            context.SaveChanges();
        }

        // Seed Sample KOT User
        var kotUser = context.Users.FirstOrDefault(u => u.UserName == "kitchen.chef" && u.DeletedAt == null);
        if (kotUser == null && kotRole != null)
        {
            kotUser = new User
            {
                RoleId = kotRole.RoleId,
                BranchId = null,
                FullName = "Kitchen Display Terminal",
                UserName = "kitchen.chef",
                Password = "Password123",
                ConfirmPassword = "Password123",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123"),
                Email = "kitchen@avsrfoodcourt.com",
                Phone = "9876543211",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Users.Add(kotUser);
            context.SaveChanges();
        }

        // ============================================================
        // SEED STAFF MEMBERS
        // ============================================================

        if (!context.StaffPersons.Any(s => s.DeletedAt == null))
        {
            var staffList = new List<StaffPerson>
            {
                new StaffPerson { FullName = "Rajesh K.", RoleTitle = "Senior Captain", Phone = "+91 98450 11223", Shift = "Morning Shift (10 AM - 4 PM)", IsActive = true },
                new StaffPerson { FullName = "Vikram S.", RoleTitle = "Head Waiter", Phone = "+91 98450 44556", Shift = "Evening Shift (5 PM - 11 PM)", IsActive = true },
                new StaffPerson { FullName = "Ananya R.", RoleTitle = "Stewardess", Phone = "+91 98450 77889", Shift = "Full Day (11 AM - 11 PM)", IsActive = true },
                new StaffPerson { FullName = "Pooja M.", RoleTitle = "Captain", Phone = "+91 98450 99001", Shift = "Morning Shift (10 AM - 4 PM)", IsActive = true },
                new StaffPerson { FullName = "Suresh N.", RoleTitle = "Server / Waiter", Phone = "+91 98450 33445", Shift = "Evening Shift (5 PM - 11 PM)", IsActive = true },
                new StaffPerson { FullName = "Karan D.", RoleTitle = "VIP Lounge Captain", Phone = "+91 98450 66778", Shift = "Evening Shift (5 PM - 11 PM)", IsActive = true }
            };

            context.StaffPersons.AddRange(staffList);
            context.SaveChanges();
        }

        // ============================================================
        // SEED RESTAURANT TABLES
        // ============================================================

        if (!context.RestaurantTables.Any(t => t.DeletedAt == null))
        {
            var rajesh = context.StaffPersons.FirstOrDefault(s => s.FullName == "Rajesh K.");
            var vikram = context.StaffPersons.FirstOrDefault(s => s.FullName == "Vikram S.");
            var pooja = context.StaffPersons.FirstOrDefault(s => s.FullName == "Pooja M.");
            var suresh = context.StaffPersons.FirstOrDefault(s => s.FullName == "Suresh N.");
            var karan = context.StaffPersons.FirstOrDefault(s => s.FullName == "Karan D.");
            var ananya = context.StaffPersons.FirstOrDefault(s => s.FullName == "Ananya R.");

            var tablesList = new List<RestaurantTable>
            {
                new RestaurantTable { TableName = "Table 1", SectionArea = "Main Hall", CapacityChairs = 2, OccupiedChairs = 0, Status = "VACANT", AssignedServerId = rajesh?.StaffId },
                new RestaurantTable { TableName = "Table 2", SectionArea = "Main Hall", CapacityChairs = 4, OccupiedChairs = 0, Status = "VACANT", AssignedServerId = vikram?.StaffId },
                new RestaurantTable { TableName = "Table 3", SectionArea = "Main Hall", CapacityChairs = 4, OccupiedChairs = 4, Status = "OCCUPIED", AssignedServerId = rajesh?.StaffId },
                new RestaurantTable { TableName = "Table 4", SectionArea = "Main Hall", CapacityChairs = 6, OccupiedChairs = 0, Status = "VACANT", AssignedServerId = pooja?.StaffId },
                new RestaurantTable { TableName = "Table 5", SectionArea = "Main Hall", CapacityChairs = 4, OccupiedChairs = 0, Status = "VACANT", AssignedServerId = rajesh?.StaffId },
                new RestaurantTable { TableName = "Table 6", SectionArea = "Main Hall", CapacityChairs = 4, OccupiedChairs = 0, Status = "VACANT", AssignedServerId = suresh?.StaffId },
                new RestaurantTable { TableName = "Table 7", SectionArea = "VIP Lounge", CapacityChairs = 8, OccupiedChairs = 0, Status = "VACANT", AssignedServerId = karan?.StaffId },
                new RestaurantTable { TableName = "Table 8", SectionArea = "VIP Lounge", CapacityChairs = 8, OccupiedChairs = 0, Status = "VACANT", AssignedServerId = karan?.StaffId },
                new RestaurantTable { TableName = "Table 9", SectionArea = "Terrace", CapacityChairs = 4, OccupiedChairs = 0, Status = "VACANT", AssignedServerId = ananya?.StaffId },
                new RestaurantTable { TableName = "Table 10", SectionArea = "Terrace", CapacityChairs = 4, OccupiedChairs = 0, Status = "VACANT", AssignedServerId = ananya?.StaffId },
                new RestaurantTable { TableName = "Table 11", SectionArea = "Main Hall", CapacityChairs = 4, OccupiedChairs = 0, Status = "VACANT", AssignedServerId = suresh?.StaffId },
                new RestaurantTable { TableName = "Table 12", SectionArea = "Main Hall", CapacityChairs = 4, OccupiedChairs = 0, Status = "VACANT", AssignedServerId = suresh?.StaffId },
                new RestaurantTable { TableName = "Table 13", SectionArea = "VIP Lounge", CapacityChairs = 6, OccupiedChairs = 0, Status = "VACANT", AssignedServerId = karan?.StaffId },
                new RestaurantTable { TableName = "Table 14", SectionArea = "VIP Lounge", CapacityChairs = 4, OccupiedChairs = 0, Status = "VACANT", AssignedServerId = karan?.StaffId },
                new RestaurantTable { TableName = "Table 15", SectionArea = "Terrace", CapacityChairs = 4, OccupiedChairs = 0, Status = "VACANT", AssignedServerId = ananya?.StaffId }
            };

            context.RestaurantTables.AddRange(tablesList);
            context.SaveChanges();
        }

        // ============================================================
        // SEED MENU ITEMS
        // ============================================================

        if (!context.MenuItems.Any(m => m.DeletedAt == null))
        {
            var menuItemsList = new List<MenuItem>
            {
                new MenuItem
                {
                    DishName = "Hyderabadi Chicken Dum Biryani",
                    Category = "Biryani",
                    Price = 320.00m,
                    DietaryType = "NON-VEG",
                    SpiceLevel = 2,
                    PrepTimeMinutes = 15,
                    ShortDescription = "Authentic kacchi dum biryani cooked with marinated chicken & basmati rice",
                    IsChefsSpecial = true,
                    IsAvailable = true
                },
                new MenuItem
                {
                    DishName = "Royal Mutton Dum Biryani",
                    Category = "Biryani",
                    Price = 440.00m,
                    DietaryType = "NON-VEG",
                    SpiceLevel = 3,
                    PrepTimeMinutes = 18,
                    ShortDescription = "Succulent baby goat mutton slow-cooked in handi with aromatic spices",
                    IsChefsSpecial = true,
                    IsAvailable = true
                },
                new MenuItem
                {
                    DishName = "Special Boneless Chicken Biryani",
                    Category = "Biryani",
                    Price = 350.00m,
                    DietaryType = "NON-VEG",
                    SpiceLevel = 2,
                    PrepTimeMinutes = 15,
                    ShortDescription = "Juicy boneless chicken cubes spiced with crushed pepper and dum rice",
                    IsChefsSpecial = false,
                    IsAvailable = true
                },
                new MenuItem
                {
                    DishName = "Chicken 65 Biryani",
                    Category = "Biryani",
                    Price = 360.00m,
                    DietaryType = "NON-VEG",
                    SpiceLevel = 3,
                    PrepTimeMinutes = 14,
                    ShortDescription = "Crispy spicy Chicken 65 tossed with curry leaves layered over biryani",
                    IsChefsSpecial = false,
                    IsAvailable = true
                },
                new MenuItem
                {
                    DishName = "Paneer Butter Masala",
                    Category = "Curries",
                    Price = 260.00m,
                    DietaryType = "VEG",
                    SpiceLevel = 1,
                    PrepTimeMinutes = 12,
                    ShortDescription = "Cottage cheese cubes in rich tomato cashew cream gravy",
                    IsChefsSpecial = false,
                    IsAvailable = true
                }
            };

            context.MenuItems.AddRange(menuItemsList);
            context.SaveChanges();
        }

        // ============================================================
        // SEED SAMPLE KOT ORDER
        // ============================================================

        if (!context.KotOrders.Any(o => o.DeletedAt == null))
        {
            var table3 = context.RestaurantTables.FirstOrDefault(t => t.TableName == "Table 3");
            var biryani1 = context.MenuItems.FirstOrDefault(m => m.DishName == "Hyderabadi Chicken Dum Biryani");
            var biryani2 = context.MenuItems.FirstOrDefault(m => m.DishName == "Royal Mutton Dum Biryani");

            var kotOrder = new KotOrder
            {
                TableId = table3?.TableId,
                TableName = "Table 3",
                SectionArea = "Main Hall",
                ServerName = "Rajesh K.",
                OrderStatus = "PREPARATION COMPLETED",
                OrderReceivedAt = DateTime.UtcNow.AddMinutes(-25),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Items = new List<KotOrderItem>
                {
                    new KotOrderItem
                    {
                        MenuItemId = biryani1?.MenuItemId,
                        DishName = "Hyderabadi Chicken Dum Biryani",
                        Quantity = 1,
                        ItemStatus = "READY",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new KotOrderItem
                    {
                        MenuItemId = biryani2?.MenuItemId,
                        DishName = "Royal Mutton Dum Biryani",
                        Quantity = 1,
                        ItemStatus = "READY",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    }
                }
            };

            context.KotOrders.Add(kotOrder);
            context.SaveChanges();
        }

        // ============================================================
        // SEED SAMPLE RESTAURANT ORDER (For KitchenController Active Tickets)
        // ============================================================

        if (!context.Orders.Any(o => !o.IsDeleted))
        {
            var table3 = context.RestaurantTables.FirstOrDefault(t => t.TableName == "Table 3");
            var biryani1 = context.MenuItems.FirstOrDefault(m => m.DishName == "Hyderabadi Chicken Dum Biryani");
            var biryani2 = context.MenuItems.FirstOrDefault(m => m.DishName == "Royal Mutton Dum Biryani");

            var sampleOrder = new Order
            {
                OrderNumber = "ORD-1001",
                OutletId = 1,
                OrderType = "DineIn",
                TableId = table3?.TableId ?? 3,
                TableName = "Table 3",
                Section = "Main Hall",
                ServerName = "Rajesh K.",
                Guests = 4,
                Status = "Active",
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                Items = new List<OrderItem>
                {
                    new OrderItem
                    {
                        KotId = 1,
                        MenuItemId = biryani1?.MenuItemId ?? 1,
                        Name = "Hyderabadi Chicken Dum Biryani",
                        Price = 320.00m,
                        Quantity = 1,
                        TotalPrice = 320.00m,
                        KotStatus = "Queued",
                        KotBatch = 1,
                        IsActive = true,
                        IsDeleted = false,
                        CreatedAt = DateTime.UtcNow
                    },
                    new OrderItem
                    {
                        KotId = 1,
                        MenuItemId = biryani2?.MenuItemId ?? 2,
                        Name = "Royal Mutton Dum Biryani",
                        Price = 440.00m,
                        Quantity = 1,
                        TotalPrice = 440.00m,
                        KotStatus = "Queued",
                        KotBatch = 1,
                        IsActive = true,
                        IsDeleted = false,
                        CreatedAt = DateTime.UtcNow
                    }
                }
            };

            context.Orders.Add(sampleOrder);
            context.SaveChanges();
        }
    }

    private static void EnsureTablesSchema(AppDbContext context)
    {
        try
        {
            context.Database.EnsureCreated();
        }
        catch { }

        try
        {
            var conn = context.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
            {
                conn.Open();
            }

            SafeExecuteSql(conn, "ALTER DATABASE DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
            SafeExecuteSql(conn, "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;");
            SafeExecuteSql(conn, "SET collation_connection = utf8mb4_unicode_ci;");

            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SET FOREIGN_KEY_CHECKS = 0;";
                cmd.ExecuteNonQuery();

                // 1. Find and drop all foreign key constraints across the database
                cmd.CommandText = @"
                    SELECT TABLE_NAME, CONSTRAINT_NAME 
                    FROM information_schema.TABLE_CONSTRAINTS 
                    WHERE CONSTRAINT_TYPE = 'FOREIGN KEY' AND TABLE_SCHEMA = DATABASE()";

                var fks = new List<(string Table, string Fk)>();
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        fks.Add((reader.GetString(0), reader.GetString(1)));
                    }
                }

                foreach (var fk in fks)
                {
                    try
                    {
                        using var dropCmd = conn.CreateCommand();
                        dropCmd.CommandText = $"ALTER TABLE `{fk.Table}` DROP FOREIGN KEY `{fk.Fk}`;";
                        dropCmd.ExecuteNonQuery();
                    }
                    catch { }
                }

                // 2. Ensure all tables have nullable branch_id, outlet_id, created_by, updated_by and matching utf8mb4_unicode_ci collation
                string[] allTables = new[]
                {
                    "users", "menu_items", "staff_persons", "restaurant_tables", "kot_orders",
                    "kot_order_items", "restaurant_orders", "order_items", "roles", "dining_tables",
                    "dining_sections", "menu_categories", "staff", "kitchen_stations", "kitchen_order_tickets",
                    "suppliers", "customers", "reservations", "ingredients", "purchase_orders",
                    "attendances", "promotions", "delivery_orders", "invoices", "invoice_payments",
                    "password_reset_tokens"
                };
                foreach (var tbl in allTables)
                {
                    SafeExecuteSql(conn, $"ALTER TABLE `{tbl}` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
                    EnsureColumnExists(conn, tbl, "branch_id", "BIGINT NULL DEFAULT NULL");
                    SafeExecuteSql(conn, $"ALTER TABLE `{tbl}` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;");
                    EnsureColumnExists(conn, tbl, "outlet_id", "BIGINT NULL DEFAULT 1");
                    SafeExecuteSql(conn, $"ALTER TABLE `{tbl}` MODIFY COLUMN `outlet_id` BIGINT NULL DEFAULT 1;");
                    EnsureColumnExists(conn, tbl, "created_by", "BIGINT NULL DEFAULT NULL");
                    SafeExecuteSql(conn, $"ALTER TABLE `{tbl}` MODIFY COLUMN `created_by` BIGINT NULL DEFAULT NULL;");
                    EnsureColumnExists(conn, tbl, "updated_by", "BIGINT NULL DEFAULT NULL");
                    SafeExecuteSql(conn, $"ALTER TABLE `{tbl}` MODIFY COLUMN `updated_by` BIGINT NULL DEFAULT NULL;");
                }

                cmd.CommandText = "SET FOREIGN_KEY_CHECKS = 1;";
                cmd.ExecuteNonQuery();
            }

            // Primary key column renames for legacy tables
            SafeExecuteSql(conn, "ALTER TABLE `menu_items` RENAME COLUMN `id` TO `menu_item_id`;");
            SafeExecuteSql(conn, "ALTER TABLE `menu_items` RENAME COLUMN `item_id` TO `menu_item_id`;");
            SafeExecuteSql(conn, "ALTER TABLE `menu_items` CHANGE COLUMN `id` `menu_item_id` BIGINT NOT NULL AUTO_INCREMENT;");
            SafeExecuteSql(conn, "ALTER TABLE `menu_items` CHANGE COLUMN `item_id` `menu_item_id` BIGINT NOT NULL AUTO_INCREMENT;");
            SafeExecuteSql(conn, "ALTER TABLE `staff_persons` RENAME COLUMN `id` TO `staff_id`;");
            SafeExecuteSql(conn, "ALTER TABLE `staff_persons` CHANGE COLUMN `id` `staff_id` BIGINT NOT NULL AUTO_INCREMENT;");
            SafeExecuteSql(conn, "ALTER TABLE `restaurant_tables` RENAME COLUMN `id` TO `table_id`;");
            SafeExecuteSql(conn, "ALTER TABLE `restaurant_tables` CHANGE COLUMN `id` `table_id` BIGINT NOT NULL AUTO_INCREMENT;");
            SafeExecuteSql(conn, "ALTER TABLE `kot_orders` RENAME COLUMN `id` TO `order_id`;");
            SafeExecuteSql(conn, "ALTER TABLE `kot_orders` CHANGE COLUMN `id` `order_id` BIGINT NOT NULL AUTO_INCREMENT;");
            SafeExecuteSql(conn, "ALTER TABLE `restaurant_orders` RENAME COLUMN `id` TO `order_id`;");
            SafeExecuteSql(conn, "ALTER TABLE `restaurant_orders` CHANGE COLUMN `id` `order_id` BIGINT NOT NULL AUTO_INCREMENT;");
            SafeExecuteSql(conn, "ALTER TABLE `order_items` RENAME COLUMN `id` TO `order_item_id`;");
            SafeExecuteSql(conn, "ALTER TABLE `order_items` CHANGE COLUMN `id` `order_item_id` BIGINT NOT NULL AUTO_INCREMENT;");

            // Legacy column defaults for pre-existing tables
            EnsureColumnExists(conn, "invoices", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "invoices", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "invoice_payments", "paid_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "customers", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "customers", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "reservations", "branch_id", "BIGINT NOT NULL DEFAULT 1");
            EnsureColumnExists(conn, "reservations", "customer_name", "VARCHAR(100) NULL");
            EnsureColumnExists(conn, "reservations", "phone", "VARCHAR(20) NULL");
            EnsureColumnExists(conn, "reservations", "reservation_date", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "reservations", "notes", "VARCHAR(255) NULL");
            EnsureColumnExists(conn, "reservations", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "reservations", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            SafeExecuteSql(conn, "ALTER TABLE `reservations` MODIFY COLUMN `reservation_time` TIME NOT NULL DEFAULT '12:00:00';");

            EnsureColumnExists(conn, "ingredients", "name", "VARCHAR(100) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "ingredients", "unit", "VARCHAR(20) NOT NULL DEFAULT 'KG'");
            EnsureColumnExists(conn, "ingredients", "current_stock", "DECIMAL(18,2) NOT NULL DEFAULT 0.00");
            EnsureColumnExists(conn, "ingredients", "minimum_threshold", "DECIMAL(18,2) NOT NULL DEFAULT 5.00");
            EnsureColumnExists(conn, "ingredients", "unit_cost", "DECIMAL(18,2) NOT NULL DEFAULT 0.00");
            EnsureColumnExists(conn, "ingredients", "category", "VARCHAR(100) NULL DEFAULT 'General'");
            EnsureColumnExists(conn, "ingredients", "subcategory", "VARCHAR(100) NULL DEFAULT ''");
            EnsureColumnExists(conn, "ingredients", "supplier", "VARCHAR(150) NULL DEFAULT 'Local Supplier'");
            EnsureColumnExists(conn, "ingredients", "mrp", "DECIMAL(10,2) NULL DEFAULT 0.00");
            EnsureColumnExists(conn, "ingredients", "ingredient_code", "VARCHAR(30) NULL");
            EnsureColumnExists(conn, "ingredients", "is_active", "TINYINT(1) NOT NULL DEFAULT 1");
            EnsureColumnExists(conn, "ingredients", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");

            EnsureColumnExists(conn, "suppliers", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "purchase_orders", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "purchase_orders", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "attendances", "check_in", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "promotions", "valid_until", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "delivery_orders", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");

            SafeExecuteSql(conn, "ALTER TABLE `restaurant_tables` MODIFY COLUMN `table_number` VARCHAR(50) NULL DEFAULT '';");
            SafeExecuteSql(conn, "ALTER TABLE `dining_tables` MODIFY COLUMN `table_number` VARCHAR(50) NULL DEFAULT '';");
            SafeExecuteSql(conn, "ALTER TABLE `dining_tables` MODIFY COLUMN `section_id` BIGINT NULL DEFAULT 1;");
            SafeExecuteSql(conn, "ALTER TABLE `dining_tables` MODIFY COLUMN `assigned_waiter_id` BIGINT NULL DEFAULT NULL;");
            SafeExecuteSql(conn, "ALTER TABLE `staff` MODIFY COLUMN `name` VARCHAR(100) NULL DEFAULT '';");
            SafeExecuteSql(conn, "ALTER TABLE `menu_items` MODIFY COLUMN `name` VARCHAR(100) NULL DEFAULT '';");
            SafeExecuteSql(conn, "ALTER TABLE `menu_items` MODIFY COLUMN `item_name` VARCHAR(100) NULL DEFAULT '';");

            // users ALTER TABLE
            EnsureColumnExists(conn, "users", "role_id", "BIGINT NOT NULL DEFAULT 1");
            EnsureColumnExists(conn, "users", "branch_id", "BIGINT NULL DEFAULT NULL");
            EnsureColumnExists(conn, "users", "user_name", "VARCHAR(60) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "users", "password", "VARCHAR(255) NULL");
            EnsureColumnExists(conn, "users", "confirm_password", "VARCHAR(255) NULL");
            EnsureColumnExists(conn, "users", "password_hash", "VARCHAR(255) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "users", "full_name", "VARCHAR(100) NULL");
            EnsureColumnExists(conn, "users", "email", "VARCHAR(100) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "users", "phone", "VARCHAR(20) NULL");
            EnsureColumnExists(conn, "users", "pin_code", "VARCHAR(10) NULL");
            EnsureColumnExists(conn, "users", "is_active", "TINYINT(1) NOT NULL DEFAULT 1");
            EnsureColumnExists(conn, "users", "last_login", "DATETIME NULL");
            EnsureColumnExists(conn, "users", "deleted_at", "DATETIME NULL");
            EnsureColumnExists(conn, "users", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "users", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");

            // roles ALTER TABLE
            EnsureColumnExists(conn, "roles", "role_name", "VARCHAR(50) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "roles", "description", "VARCHAR(255) NULL");
            EnsureColumnExists(conn, "roles", "is_active", "TINYINT(1) NOT NULL DEFAULT 1");
            EnsureColumnExists(conn, "roles", "deleted_at", "DATETIME NULL");
            EnsureColumnExists(conn, "roles", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "roles", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");

            // menu_items ALTER TABLE
            EnsureColumnExists(conn, "menu_items", "dish_name", "VARCHAR(100) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "menu_items", "category", "VARCHAR(100) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "menu_items", "price", "DECIMAL(18,2) NOT NULL DEFAULT 0.00");
            EnsureColumnExists(conn, "menu_items", "dietary_type", "VARCHAR(20) NOT NULL DEFAULT 'Non-Veg'");
            EnsureColumnExists(conn, "menu_items", "spice_level", "INT NOT NULL DEFAULT 0");
            EnsureColumnExists(conn, "menu_items", "prep_time_minutes", "INT NULL DEFAULT 15");
            EnsureColumnExists(conn, "menu_items", "short_description", "VARCHAR(500) NULL");
            EnsureColumnExists(conn, "menu_items", "image_url", "VARCHAR(255) NULL");
            EnsureColumnExists(conn, "menu_items", "is_chefs_special", "TINYINT(1) NOT NULL DEFAULT 0");
            EnsureColumnExists(conn, "menu_items", "is_available", "TINYINT(1) NOT NULL DEFAULT 1");
            EnsureColumnExists(conn, "menu_items", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "menu_items", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "menu_items", "deleted_at", "DATETIME NULL");

            // staff_persons ALTER TABLE
            EnsureColumnExists(conn, "staff_persons", "full_name", "VARCHAR(100) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "staff_persons", "role_title", "VARCHAR(50) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "staff_persons", "phone", "VARCHAR(20) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "staff_persons", "shift", "VARCHAR(50) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "staff_persons", "is_active", "TINYINT(1) NOT NULL DEFAULT 1");
            EnsureColumnExists(conn, "staff_persons", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "staff_persons", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "staff_persons", "deleted_at", "DATETIME NULL");

            // restaurant_tables ALTER TABLE
            EnsureColumnExists(conn, "restaurant_tables", "table_name", "VARCHAR(50) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "restaurant_tables", "section_area", "VARCHAR(50) NOT NULL DEFAULT 'Main Hall'");
            EnsureColumnExists(conn, "restaurant_tables", "capacity_chairs", "INT NOT NULL DEFAULT 4");
            EnsureColumnExists(conn, "restaurant_tables", "occupied_chairs", "INT NOT NULL DEFAULT 0");
            EnsureColumnExists(conn, "restaurant_tables", "status", "VARCHAR(50) NOT NULL DEFAULT 'VACANT'");
            SafeExecuteSql(conn, "ALTER TABLE `restaurant_tables` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'VACANT';");
            EnsureColumnExists(conn, "restaurant_tables", "assigned_server_id", "BIGINT NULL");
            EnsureColumnExists(conn, "restaurant_tables", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "restaurant_tables", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "restaurant_tables", "deleted_at", "DATETIME NULL");

            // kot_orders ALTER TABLE
            EnsureColumnExists(conn, "kot_orders", "table_id", "BIGINT NULL");
            EnsureColumnExists(conn, "kot_orders", "table_name", "VARCHAR(50) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "kot_orders", "section_area", "VARCHAR(50) NOT NULL DEFAULT 'Main Hall'");
            EnsureColumnExists(conn, "kot_orders", "server_name", "VARCHAR(100) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "kot_orders", "order_status", "VARCHAR(30) NOT NULL DEFAULT 'PENDING'");
            EnsureColumnExists(conn, "kot_orders", "order_received_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "kot_orders", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "kot_orders", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "kot_orders", "deleted_at", "DATETIME NULL");

            // restaurant_orders ALTER TABLE
            EnsureColumnExists(conn, "restaurant_orders", "is_active", "TINYINT(1) NOT NULL DEFAULT 1");
            EnsureColumnExists(conn, "restaurant_orders", "is_deleted", "TINYINT(1) NOT NULL DEFAULT 0");
            EnsureColumnExists(conn, "restaurant_orders", "order_number", "VARCHAR(30) NOT NULL DEFAULT 'ORD-1001'");
            EnsureColumnExists(conn, "restaurant_orders", "outlet_id", "BIGINT NOT NULL DEFAULT 1");
            EnsureColumnExists(conn, "restaurant_orders", "order_type", "VARCHAR(30) NOT NULL DEFAULT 'DineIn'");
            EnsureColumnExists(conn, "restaurant_orders", "dining_table_id", "BIGINT NULL");
            EnsureColumnExists(conn, "restaurant_orders", "guests_count", "INT NOT NULL DEFAULT 1");
            EnsureColumnExists(conn, "restaurant_orders", "order_status", "VARCHAR(20) NOT NULL DEFAULT 'Active'");
            EnsureColumnExists(conn, "restaurant_orders", "created_by", "BIGINT NULL");
            EnsureColumnExists(conn, "restaurant_orders", "updated_by", "BIGINT NULL");
            EnsureColumnExists(conn, "restaurant_orders", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "restaurant_orders", "updated_at", "DATETIME NULL");
            EnsureColumnExists(conn, "restaurant_orders", "special_instructions", "TEXT NULL");
            EnsureColumnExists(conn, "restaurant_orders", "booking_id", "BIGINT NULL");
            EnsureColumnExists(conn, "restaurant_orders", "waiter_id", "BIGINT NULL");

            // order_items ALTER TABLE
            EnsureColumnExists(conn, "order_items", "is_active", "TINYINT(1) NOT NULL DEFAULT 1");
            EnsureColumnExists(conn, "order_items", "is_deleted", "TINYINT(1) NOT NULL DEFAULT 0");
            EnsureColumnExists(conn, "order_items", "kot_id", "BIGINT NOT NULL DEFAULT 1");
            EnsureColumnExists(conn, "order_items", "menu_item_id", "BIGINT NOT NULL DEFAULT 1");
            EnsureColumnExists(conn, "order_items", "item_name", "VARCHAR(150) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "order_items", "unit_price", "DECIMAL(18,2) NOT NULL DEFAULT 0.00");
            EnsureColumnExists(conn, "order_items", "quantity", "INT NOT NULL DEFAULT 1");
            EnsureColumnExists(conn, "order_items", "total_price", "DECIMAL(18,2) NOT NULL DEFAULT 0.00");
            EnsureColumnExists(conn, "order_items", "item_status", "VARCHAR(30) NOT NULL DEFAULT 'Queued'");
            EnsureColumnExists(conn, "order_items", "created_by", "BIGINT NULL");
            EnsureColumnExists(conn, "order_items", "updated_by", "BIGINT NULL");
            EnsureColumnExists(conn, "order_items", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "order_items", "updated_at", "DATETIME NULL");
            EnsureColumnExists(conn, "order_items", "preparation_notes", "TEXT NULL");
            EnsureColumnExists(conn, "order_items", "variant_id", "BIGINT NULL");

            CreateAllTables(conn);

            // Verify menu_items schema
            try { _ = context.MenuItems.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `menu_items`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify staff_persons schema
            try { _ = context.StaffPersons.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `staff_persons`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify restaurant_tables schema
            try { _ = context.RestaurantTables.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `restaurant_tables`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify kot_orders schema
            try { _ = context.KotOrders.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `kot_orders`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify restaurant_orders schema
            try { _ = context.Orders.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `order_items`; DROP TABLE IF EXISTS `restaurant_orders`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Fix legacy item_id column on order_items if present from older schema
            SafeExecuteSql(conn, "ALTER TABLE `order_items` MODIFY COLUMN `item_id` BIGINT NULL DEFAULT NULL;");

            // Verify invoices schema
            try { _ = context.Invoices.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `invoice_payments`; DROP TABLE IF EXISTS `invoices`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify customers schema
            try { _ = context.Customers.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `customers`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify reservations schema
            try { _ = context.Reservations.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `reservations`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify ingredients schema
            try { _ = context.Ingredients.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `ingredients`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify suppliers schema
            try { _ = context.Suppliers.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `suppliers`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify purchase_orders schema
            try { _ = context.PurchaseOrders.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `purchase_orders`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify attendances schema
            try { _ = context.Attendances.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `attendances`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify promotions schema
            try { _ = context.Promotions.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `promotions`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify delivery_orders schema
            try { _ = context.DeliveryOrders.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `delivery_orders`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify menu_categories schema
            try { _ = context.MenuCategories.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `menu_categories`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify staff schema
            try { _ = context.Staff.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `staff`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify dining_sections schema
            try { _ = context.DiningSections.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `dining_sections`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify dining_tables schema
            try { _ = context.DiningTables.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `dining_tables`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify kitchen_stations schema
            try { _ = context.KitchenStations.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `kitchen_stations`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }

            // Verify kitchen_order_tickets schema
            try { _ = context.KitchenOrderTickets.AsNoTracking().Take(1).ToList(); }
            catch
            {
                SafeExecuteSql(conn, "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS `kitchen_order_tickets`; SET FOREIGN_KEY_CHECKS = 1;");
                CreateAllTables(conn);
            }
        }
        catch { }
    }

    private static void CreateAllTables(DbConnection conn)
    {
        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `menu_items` (
                `menu_item_id` BIGINT NOT NULL AUTO_INCREMENT,
                `dish_name` VARCHAR(100) NOT NULL,
                `category` VARCHAR(100) NOT NULL,
                `price` DECIMAL(18,2) NOT NULL,
                `dietary_type` VARCHAR(20) NOT NULL DEFAULT 'Non-Veg',
                `spice_level` INT NOT NULL DEFAULT 0,
                `prep_time_minutes` INT NULL DEFAULT 15,
                `short_description` VARCHAR(500) NULL,
                `image_url` VARCHAR(255) NULL,
                `is_chefs_special` TINYINT(1) NOT NULL DEFAULT 0,
                `is_available` TINYINT(1) NOT NULL DEFAULT 1,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `deleted_at` DATETIME NULL,
                PRIMARY KEY (`menu_item_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `staff_persons` (
                `staff_id` BIGINT NOT NULL AUTO_INCREMENT,
                `full_name` VARCHAR(100) NOT NULL,
                `role_title` VARCHAR(50) NOT NULL,
                `phone` VARCHAR(20) NOT NULL,
                `shift` VARCHAR(50) NOT NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `deleted_at` DATETIME NULL,
                PRIMARY KEY (`staff_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `restaurant_tables` (
                `table_id` BIGINT NOT NULL AUTO_INCREMENT,
                `table_name` VARCHAR(50) NOT NULL,
                `section_area` VARCHAR(50) NOT NULL DEFAULT 'Main Hall',
                `capacity_chairs` INT NOT NULL DEFAULT 4,
                `occupied_chairs` INT NOT NULL DEFAULT 0,
                `status` VARCHAR(20) NOT NULL DEFAULT 'VACANT',
                `assigned_server_id` BIGINT NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `deleted_at` DATETIME NULL,
                PRIMARY KEY (`table_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `kot_orders` (
                `order_id` BIGINT NOT NULL AUTO_INCREMENT,
                `table_id` BIGINT NULL,
                `table_name` VARCHAR(50) NOT NULL,
                `section_area` VARCHAR(50) NOT NULL DEFAULT 'Main Hall',
                `server_name` VARCHAR(100) NOT NULL,
                `order_status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
                `order_received_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `deleted_at` DATETIME NULL,
                PRIMARY KEY (`order_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `kot_order_items` (
                `order_item_id` BIGINT NOT NULL AUTO_INCREMENT,
                `order_id` BIGINT NOT NULL,
                `menu_item_id` BIGINT NULL,
                `dish_name` VARCHAR(100) NOT NULL,
                `quantity` INT NOT NULL DEFAULT 1,
                `item_status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`order_item_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `restaurant_orders` (
                `order_id` BIGINT NOT NULL AUTO_INCREMENT,
                `order_number` VARCHAR(30) NOT NULL,
                `outlet_id` BIGINT NOT NULL DEFAULT 1,
                `order_type` VARCHAR(30) NOT NULL DEFAULT 'DineIn',
                `dining_table_id` BIGINT NULL,
                `booking_id` BIGINT NULL,
                `waiter_id` BIGINT NULL,
                `guests_count` INT NOT NULL DEFAULT 1,
                `order_status` VARCHAR(20) NOT NULL DEFAULT 'Active',
                `special_instructions` TEXT NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NULL,
                `created_by` BIGINT NULL,
                `updated_by` BIGINT NULL,
                PRIMARY KEY (`order_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `order_items` (
                `order_item_id` BIGINT NOT NULL AUTO_INCREMENT,
                `order_id` BIGINT NOT NULL,
                `kot_id` BIGINT NOT NULL DEFAULT 1,
                `menu_item_id` BIGINT NOT NULL DEFAULT 1,
                `variant_id` BIGINT NULL,
                `item_name` VARCHAR(150) NOT NULL,
                `unit_price` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `quantity` INT NOT NULL DEFAULT 1,
                `total_price` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `preparation_notes` TEXT NULL,
                `item_status` VARCHAR(30) NOT NULL DEFAULT 'Queued',
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NULL,
                `created_by` BIGINT NULL,
                `updated_by` BIGINT NULL,
                PRIMARY KEY (`order_item_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `invoices` (
                `invoice_id` BIGINT NOT NULL AUTO_INCREMENT,
                `order_id` BIGINT NOT NULL,
                `invoice_number` VARCHAR(50) NOT NULL,
                `subtotal` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `tax_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `discount_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `total_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `paid_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `status` VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`invoice_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `invoice_payments` (
                `payment_id` BIGINT NOT NULL AUTO_INCREMENT,
                `invoice_id` BIGINT NOT NULL,
                `amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `payment_mode` VARCHAR(30) NOT NULL DEFAULT 'CASH',
                `transaction_reference` VARCHAR(100) NULL,
                `paid_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`payment_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `customers` (
                `customer_id` BIGINT NOT NULL AUTO_INCREMENT,
                `full_name` VARCHAR(100) NOT NULL,
                `phone` VARCHAR(20) NOT NULL,
                `email` VARCHAR(100) NULL,
                `loyalty_points` INT NOT NULL DEFAULT 0,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`customer_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `reservations` (
                `reservation_id` BIGINT NOT NULL AUTO_INCREMENT,
                `branch_id` BIGINT NOT NULL DEFAULT 1,
                `customer_id` BIGINT NULL,
                `customer_name` VARCHAR(100) NULL,
                `phone` VARCHAR(20) NULL,
                `table_id` BIGINT NULL,
                `guests_count` INT NOT NULL DEFAULT 2,
                `reservation_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `reservation_time` TIME NOT NULL DEFAULT '12:00:00',
                `status` VARCHAR(20) NOT NULL DEFAULT 'booked',
                `notes` VARCHAR(255) NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`reservation_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `ingredients` (
                `ingredient_id` BIGINT NOT NULL AUTO_INCREMENT,
                `name` VARCHAR(100) NOT NULL,
                `unit` VARCHAR(20) NOT NULL DEFAULT 'KG',
                `current_stock` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `minimum_threshold` DECIMAL(18,2) NOT NULL DEFAULT 5.00,
                `unit_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `category` VARCHAR(100) NOT NULL DEFAULT 'General',
                `subcategory` VARCHAR(100) NULL DEFAULT '',
                `supplier` VARCHAR(150) NOT NULL DEFAULT 'Local Supplier',
                `mrp` DECIMAL(18,2) NULL DEFAULT 0.00,
                `ingredient_code` VARCHAR(30) NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`ingredient_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `suppliers` (
                `supplier_id` BIGINT NOT NULL AUTO_INCREMENT,
                `supplier_name` VARCHAR(100) NOT NULL,
                `phone` VARCHAR(20) NOT NULL,
                `email` VARCHAR(100) NULL,
                `address` VARCHAR(255) NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`supplier_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `purchase_orders` (
                `po_id` BIGINT NOT NULL AUTO_INCREMENT,
                `supplier_id` BIGINT NOT NULL,
                `po_number` VARCHAR(50) NOT NULL,
                `total_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`po_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `attendances` (
                `attendance_id` BIGINT NOT NULL AUTO_INCREMENT,
                `staff_id` BIGINT NOT NULL,
                `check_in` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `check_out` DATETIME NULL,
                `status` VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
                `shift` VARCHAR(50) NULL,
                PRIMARY KEY (`attendance_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `promotions` (
                `promotion_id` BIGINT NOT NULL AUTO_INCREMENT,
                `code` VARCHAR(50) NOT NULL,
                `discount_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                `flat_discount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `valid_until` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                PRIMARY KEY (`promotion_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `delivery_orders` (
                `delivery_id` BIGINT NOT NULL AUTO_INCREMENT,
                `order_id` BIGINT NOT NULL,
                `customer_name` VARCHAR(100) NOT NULL,
                `phone` VARCHAR(20) NOT NULL,
                `delivery_address` VARCHAR(255) NOT NULL,
                `delivery_status` VARCHAR(20) NOT NULL DEFAULT 'DISPATCHED',
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`delivery_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `menu_categories` (
                `id` CHAR(36) NOT NULL,
                `name` VARCHAR(100) NOT NULL,
                `display_order` INT NOT NULL DEFAULT 0,
                PRIMARY KEY (`id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `staff` (
                `id` BIGINT NOT NULL AUTO_INCREMENT,
                `name` VARCHAR(100) NOT NULL,
                `role` VARCHAR(50) NOT NULL DEFAULT 'Waiter',
                `phone` VARCHAR(20) NOT NULL DEFAULT '',
                `shift` VARCHAR(50) NOT NULL DEFAULT 'Morning',
                `status` VARCHAR(20) NOT NULL DEFAULT 'active',
                PRIMARY KEY (`id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `dining_sections` (
                `section_id` BIGINT NOT NULL AUTO_INCREMENT,
                `outlet_id` BIGINT NOT NULL DEFAULT 1,
                `section_name` VARCHAR(100) NOT NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NULL,
                `created_by` BIGINT NULL,
                `updated_by` BIGINT NULL,
                PRIMARY KEY (`section_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `dining_tables` (
                `dining_table_id` BIGINT NOT NULL AUTO_INCREMENT,
                `section_id` BIGINT NOT NULL DEFAULT 1,
                `table_number` VARCHAR(50) NOT NULL,
                `seating_capacity` INT NOT NULL DEFAULT 4,
                `status` VARCHAR(20) NOT NULL DEFAULT 'Vacant',
                `assigned_waiter_id` BIGINT NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NULL,
                `created_by` BIGINT NULL,
                `updated_by` BIGINT NULL,
                PRIMARY KEY (`dining_table_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `kitchen_stations` (
                `station_id` BIGINT NOT NULL AUTO_INCREMENT,
                `outlet_id` BIGINT NOT NULL DEFAULT 1,
                `station_name` VARCHAR(100) NOT NULL,
                `printer_ip` VARCHAR(50) NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NULL,
                `created_by` BIGINT NULL,
                `updated_by` BIGINT NULL,
                PRIMARY KEY (`station_id`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `kitchen_order_tickets` (
                `kot_id` BIGINT NOT NULL AUTO_INCREMENT,
                `kot_number` VARCHAR(30) NOT NULL,
                `order_id` BIGINT NOT NULL,
                `station_id` BIGINT NOT NULL,
                `batch_number` INT NOT NULL DEFAULT 1,
                `status` VARCHAR(50) NOT NULL DEFAULT 'Queued',
                `prepared_by_chef_id` BIGINT NULL,
                `printed_at` DATETIME NULL,
                `completed_at` DATETIME NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NULL,
                `created_by` BIGINT NULL,
                `updated_by` BIGINT NULL,
                PRIMARY KEY (`kot_id`)
            ) ENGINE=InnoDB;");

        // ============================================================
        // ALTER TABLE COLUMN SAFEGUARDS (For Pre-existing Databases)
        // ============================================================
        string[] alterSqls = new[]
        {
            "ALTER TABLE `suppliers` ADD COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `suppliers` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `suppliers` ADD COLUMN `outlet_id` BIGINT NULL DEFAULT 1;",
            "ALTER TABLE `suppliers` MODIFY COLUMN `outlet_id` BIGINT NULL DEFAULT 1;",
            "ALTER TABLE `suppliers` ADD COLUMN `created_by` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `suppliers` MODIFY COLUMN `created_by` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `suppliers` ADD COLUMN `updated_by` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `suppliers` MODIFY COLUMN `updated_by` BIGINT NULL DEFAULT NULL;",

            "ALTER TABLE `customers` ADD COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `customers` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `reservations` ADD COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `reservations` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `ingredients` ADD COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `ingredients` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `purchase_orders` ADD COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `purchase_orders` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `attendances` ADD COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `attendances` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `promotions` ADD COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `promotions` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `delivery_orders` ADD COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",
            "ALTER TABLE `delivery_orders` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;",

            "ALTER TABLE `menu_categories` ADD COLUMN `name` VARCHAR(100) NOT NULL DEFAULT '';",
            "ALTER TABLE `menu_categories` ADD COLUMN `display_order` INT NOT NULL DEFAULT 0;",
            "ALTER TABLE `staff` ADD COLUMN `name` VARCHAR(100) NOT NULL DEFAULT '';",
            "ALTER TABLE `staff` ADD COLUMN `role` VARCHAR(50) NOT NULL DEFAULT 'Waiter';",
            "ALTER TABLE `staff` ADD COLUMN `phone` VARCHAR(20) NOT NULL DEFAULT '';",
            "ALTER TABLE `staff` ADD COLUMN `shift` VARCHAR(50) NOT NULL DEFAULT 'Morning';",
            "ALTER TABLE `staff` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'active';",

            "ALTER TABLE `invoices` ADD COLUMN `order_id` BIGINT NOT NULL DEFAULT 0;",
            "ALTER TABLE `invoices` ADD COLUMN `invoice_number` VARCHAR(50) NOT NULL DEFAULT '';",
            "ALTER TABLE `invoices` ADD COLUMN `subtotal` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `invoices` ADD COLUMN `tax_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `invoices` ADD COLUMN `discount_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `invoices` ADD COLUMN `total_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `invoices` ADD COLUMN `paid_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `invoices` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'UNPAID';",
            "ALTER TABLE `invoices` ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `invoices` ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",

            "ALTER TABLE `invoice_payments` ADD COLUMN `invoice_id` BIGINT NOT NULL DEFAULT 0;",
            "ALTER TABLE `invoice_payments` ADD COLUMN `amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `invoice_payments` ADD COLUMN `payment_mode` VARCHAR(30) NOT NULL DEFAULT 'CASH';",
            "ALTER TABLE `invoice_payments` ADD COLUMN `transaction_reference` VARCHAR(100) NULL;",
            "ALTER TABLE `invoice_payments` ADD COLUMN `paid_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",

            "ALTER TABLE `customers` ADD COLUMN `full_name` VARCHAR(100) NOT NULL DEFAULT '';",
            "ALTER TABLE `customers` ADD COLUMN `phone` VARCHAR(20) NOT NULL DEFAULT '';",
            "ALTER TABLE `customers` ADD COLUMN `email` VARCHAR(100) NULL;",
            "ALTER TABLE `customers` ADD COLUMN `loyalty_points` INT NOT NULL DEFAULT 0;",
            "ALTER TABLE `customers` ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `customers` ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",

            "ALTER TABLE `reservations` ADD COLUMN `customer_id` BIGINT NULL;",
            "ALTER TABLE `reservations` ADD COLUMN `customer_name` VARCHAR(100) NOT NULL DEFAULT '';",
            "ALTER TABLE `reservations` ADD COLUMN `phone` VARCHAR(20) NOT NULL DEFAULT '';",
            "ALTER TABLE `reservations` ADD COLUMN `table_id` BIGINT NULL;",
            "ALTER TABLE `reservations` ADD COLUMN `guests_count` INT NOT NULL DEFAULT 2;",
            "ALTER TABLE `reservations` ADD COLUMN `reservation_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `reservations` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING';",
            "ALTER TABLE `reservations` ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",

            "ALTER TABLE `invoices` ADD COLUMN `taxable_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `invoices` ADD COLUMN `amount_paid` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `invoices` ADD COLUMN `paid_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `invoices` ADD COLUMN `subtotal` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `invoices` ADD COLUMN `tax_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `invoices` ADD COLUMN `discount_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `invoices` ADD COLUMN `total_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `invoices` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'UNPAID';",

            "ALTER TABLE `invoice_payments` ADD COLUMN `payment_mode` VARCHAR(30) NOT NULL DEFAULT 'CASH';",
            "ALTER TABLE `invoice_payments` ADD COLUMN `transaction_reference` VARCHAR(100) NULL;",

            "ALTER TABLE `kot_order_items` MODIFY COLUMN `item_status` VARCHAR(50) NOT NULL DEFAULT 'PENDING';",
            "ALTER TABLE `order_items` MODIFY COLUMN `kot_status` VARCHAR(50) NOT NULL DEFAULT 'Queued';",
            "ALTER TABLE `kot_orders` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING';",
            "ALTER TABLE `kitchen_order_tickets` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'Queued';",

            "ALTER TABLE `ingredients` ADD COLUMN `name` VARCHAR(100) NOT NULL DEFAULT '';",
            "ALTER TABLE `ingredients` ADD COLUMN `unit` VARCHAR(20) NOT NULL DEFAULT 'KG';",
            "ALTER TABLE `ingredients` ADD COLUMN `current_stock` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `ingredients` ADD COLUMN `minimum_threshold` DECIMAL(18,2) NOT NULL DEFAULT 5.00;",
            "ALTER TABLE `ingredients` ADD COLUMN `unit_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `ingredients` ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",

            "ALTER TABLE `suppliers` ADD COLUMN `supplier_name` VARCHAR(100) NOT NULL DEFAULT '';",
            "ALTER TABLE `suppliers` ADD COLUMN `phone` VARCHAR(20) NOT NULL DEFAULT '';",
            "ALTER TABLE `suppliers` ADD COLUMN `email` VARCHAR(100) NULL;",
            "ALTER TABLE `suppliers` ADD COLUMN `address` VARCHAR(255) NULL;",
            "ALTER TABLE `suppliers` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1;",
            "ALTER TABLE `suppliers` ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",

            "ALTER TABLE `purchase_orders` ADD COLUMN `supplier_id` BIGINT NOT NULL DEFAULT 0;",
            "ALTER TABLE `purchase_orders` ADD COLUMN `po_number` VARCHAR(50) NOT NULL DEFAULT '';",
            "ALTER TABLE `purchase_orders` ADD COLUMN `total_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `purchase_orders` ADD COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING';",
            "ALTER TABLE `purchase_orders` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING';",
            "ALTER TABLE `purchase_orders` ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `purchase_orders` ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `purchase_orders` ADD COLUMN `po_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `purchase_orders` MODIFY COLUMN `po_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `purchase_orders` ADD COLUMN `order_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `purchase_orders` MODIFY COLUMN `order_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;",

            "ALTER TABLE `reservations` ADD COLUMN `reservation_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `reservations` MODIFY COLUMN `reservation_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `reservations` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING';",

            "ALTER TABLE `attendances` ADD COLUMN `attendance_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `attendances` MODIFY COLUMN `attendance_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `attendances` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'PRESENT';",

            "ALTER TABLE `invoices` ADD COLUMN `invoice_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `invoices` MODIFY COLUMN `invoice_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `invoices` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'UNPAID';",

            "ALTER TABLE `delivery_orders` ADD COLUMN `delivery_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `delivery_orders` MODIFY COLUMN `delivery_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `delivery_orders` MODIFY COLUMN `delivery_status` VARCHAR(50) NOT NULL DEFAULT 'DISPATCHED';",

            "ALTER TABLE `attendances` ADD COLUMN `staff_id` BIGINT NOT NULL DEFAULT 0;",
            "ALTER TABLE `attendances` ADD COLUMN `check_in` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `attendances` ADD COLUMN `check_out` DATETIME NULL;",
            "ALTER TABLE `attendances` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'PRESENT';",
            "ALTER TABLE `attendances` ADD COLUMN `shift` VARCHAR(50) NULL;",

            "ALTER TABLE `promotions` ADD COLUMN `code` VARCHAR(50) NOT NULL DEFAULT '';",
            "ALTER TABLE `promotions` ADD COLUMN `discount_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `promotions` ADD COLUMN `flat_discount` DECIMAL(18,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE `promotions` ADD COLUMN `valid_until` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `promotions` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1;",

            "ALTER TABLE `delivery_orders` ADD COLUMN `order_id` BIGINT NOT NULL DEFAULT 0;",
            "ALTER TABLE `delivery_orders` ADD COLUMN `customer_name` VARCHAR(100) NOT NULL DEFAULT '';",
            "ALTER TABLE `delivery_orders` ADD COLUMN `phone` VARCHAR(20) NOT NULL DEFAULT '';",
            "ALTER TABLE `delivery_orders` ADD COLUMN `delivery_address` VARCHAR(255) NOT NULL DEFAULT '';",
            "ALTER TABLE `delivery_orders` ADD COLUMN `delivery_status` VARCHAR(20) NOT NULL DEFAULT 'DISPATCHED';",
            "ALTER TABLE `delivery_orders` ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",

            "ALTER TABLE `kot_orders` ADD COLUMN `kot_number` VARCHAR(50) NOT NULL DEFAULT '';",
            "ALTER TABLE `kot_orders` ADD COLUMN `order_type` VARCHAR(30) NOT NULL DEFAULT 'DINE_IN';",
            "ALTER TABLE `kot_orders` ADD COLUMN `table_number` VARCHAR(30) NULL;",
            "ALTER TABLE `kot_orders` ADD COLUMN `token_number` VARCHAR(30) NULL;",
            "ALTER TABLE `kot_orders` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING';",
            "ALTER TABLE `kot_orders` ADD COLUMN `total_items` INT NOT NULL DEFAULT 0;",
            "ALTER TABLE `kot_orders` ADD COLUMN `prepared_items` INT NOT NULL DEFAULT 0;",
            "ALTER TABLE `kot_orders` ADD COLUMN `special_instructions` TEXT NULL;",
            "ALTER TABLE `kot_orders` ADD COLUMN `staff_name` VARCHAR(100) NULL;",
            "ALTER TABLE `kot_orders` ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `kot_orders` ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE `kot_orders` ADD COLUMN `deleted_at` DATETIME NULL;"
        };

        foreach (var sql in alterSqls)
        {
            SafeExecuteSql(conn, sql);
        }
    }

    private static void SafeExecuteSql(DbConnection conn, string sql)
    {
        try
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            cmd.ExecuteNonQuery();
        }
        catch { }
    }

    private static void EnsureColumnExists(DbConnection conn, string tableName, string columnName, string columnDefinition)
    {
        try
        {
            using var checkCmd = conn.CreateCommand();
            checkCmd.CommandText = @"
                SELECT COUNT(*) 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = @tbl 
                  AND COLUMN_NAME = @col";

            var pTbl = checkCmd.CreateParameter();
            pTbl.ParameterName = "@tbl";
            pTbl.Value = tableName;
            checkCmd.Parameters.Add(pTbl);

            var pCol = checkCmd.CreateParameter();
            pCol.ParameterName = "@col";
            pCol.Value = columnName;
            checkCmd.Parameters.Add(pCol);

            var count = Convert.ToInt32(checkCmd.ExecuteScalar() ?? 0);
            if (count == 0)
            {
                using var alterCmd = conn.CreateCommand();
                alterCmd.CommandText = $"ALTER TABLE `{tableName}` ADD COLUMN `{columnName}` {columnDefinition}";
                alterCmd.ExecuteNonQuery();
            }
        }
        catch { }
    }

    private static void EnsureStoredProcedures(AppDbContext context)
    {
        try
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string sqlPath = Path.Combine(baseDir, "Documentation", "HMS_POS_STORED_PROCEDURES.sql");
            if (!File.Exists(sqlPath))
            {
                sqlPath = Path.Combine(Directory.GetCurrentDirectory(), "Documentation", "HMS_POS_STORED_PROCEDURES.sql");
            }
            if (!File.Exists(sqlPath))
            {
                sqlPath = Path.Combine(Directory.GetCurrentDirectory(), "HMS", "Documentation", "HMS_POS_STORED_PROCEDURES.sql");
            }

            if (!File.Exists(sqlPath)) return;

            string script = File.ReadAllText(sqlPath);
            var procedureBlocks = script.Split(new[] { "DROP PROCEDURE IF EXISTS" }, StringSplitOptions.RemoveEmptyEntries);

            var conn = context.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
            {
                conn.Open();
            }

            SafeExecuteSql(conn, "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;");
            SafeExecuteSql(conn, "SET collation_connection = utf8mb4_unicode_ci;");

            foreach (var block in procedureBlocks)
            {
                var trimmedBlock = block.Trim();
                if (string.IsNullOrWhiteSpace(trimmedBlock) || trimmedBlock.StartsWith("--")) continue;

                string fullBlockSql = "DROP PROCEDURE IF EXISTS " + trimmedBlock;
                int createIdx = fullBlockSql.IndexOf("CREATE PROCEDURE", StringComparison.OrdinalIgnoreCase);

                if (createIdx > 0)
                {
                    string dropStmt = fullBlockSql.Substring(0, createIdx).Trim();
                    string createStmt = fullBlockSql.Substring(createIdx).Trim();

                    if (dropStmt.EndsWith(";")) dropStmt = dropStmt.Substring(0, dropStmt.Length - 1).Trim();
                    if (createStmt.EndsWith(";")) createStmt = createStmt.Substring(0, createStmt.Length - 1).Trim();

                    using (var dropCmd = conn.CreateCommand())
                    {
                        dropCmd.CommandText = dropStmt;
                        try { dropCmd.ExecuteNonQuery(); } catch { }
                    }

                    using (var createCmd = conn.CreateCommand())
                    {
                        createCmd.CommandText = createStmt;
                        try { createCmd.ExecuteNonQuery(); } catch { }
                    }
                }
            }
        }
        catch { }
    }
}