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
        // SEED/ENSURE PIRNAV & ADMIN USERS
        // ============================================================

        var pirnavUser = context.Users.FirstOrDefault(u => u.UserName == "pirnav" && u.DeletedAt == null);
        const string pirnavUsername = "pirnav";
        const string pirnavPassword = "Admin@123";
        const string pirnavEmail = "maturi.vikas@pirnav.com";

        if (pirnavUser == null)
        {
            pirnavUser = new User
            {
                RoleId = adminRole.RoleId,
                BranchId = null,
                FullName = "pirnav",
                UserName = pirnavUsername,
                Password = pirnavPassword,
                ConfirmPassword = pirnavPassword,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(pirnavPassword),
                Email = pirnavEmail,
                Phone = "9999999999",
                PinCode = "1234",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Users.Add(pirnavUser);
            context.SaveChanges();
        }
        else
        {
            pirnavUser.RoleId = adminRole.RoleId;
            pirnavUser.FullName = "pirnav";
            pirnavUser.Password = pirnavPassword;
            pirnavUser.ConfirmPassword = pirnavPassword;
            pirnavUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(pirnavPassword);
            pirnavUser.IsActive = true;
            context.SaveChanges();
        }

        var adminUser = context.Users.FirstOrDefault(u => u.UserName == "admin" && u.DeletedAt == null);
        const string adminUsername = "admin";
        const string adminPassword = "Admin@123";
        const string adminEmail = "admin@bhanupos.com";

        if (adminUser == null)
        {
            adminUser = new User
            {
                RoleId = adminRole.RoleId,
                BranchId = null,
                FullName = "pirnav",
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
            adminUser.FullName = "pirnav";
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
                FullName = "pirnav",
                UserName = "admins",
                Password = adminPassword,
                ConfirmPassword = adminPassword,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                Email = "admins@bhanupos.com",
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
            adminsUser.FullName = "pirnav";
            adminsUser.UserName = "admins";
            adminsUser.Password = adminPassword;
            adminsUser.ConfirmPassword = adminPassword;
            adminsUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword);
            adminsUser.Email = "admins@bhanupos.com";
            adminsUser.BranchId = null;
            adminsUser.IsActive = true;
            context.SaveChanges();
        }

        // Seed staff_persons, ingredients, salary_payments, and inventory_purchases
        try
        {
            if (!context.StaffPersons.Any())
            {
                var initialStaff = new List<StaffPerson>
                {
                    new StaffPerson { FullName = "Suresh Reddy", RoleTitle = "General Manager", Department = "Management", BaseSalary = 50000m, Phone = "9876543210", Shift = "General", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new StaffPerson { FullName = "Vikas Anand", RoleTitle = "Head Bartender", Department = "Bar", BaseSalary = 30000m, Phone = "9876543211", Shift = "Evening", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new StaffPerson { FullName = "Rahul Sharma", RoleTitle = "Senior Mixologist", Department = "Bar", BaseSalary = 28000m, Phone = "9876543212", Shift = "Evening", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new StaffPerson { FullName = "Chef Sanjeev Kumar", RoleTitle = "Executive Chef", Department = "Kitchen", BaseSalary = 45000m, Phone = "9876543213", Shift = "Morning", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new StaffPerson { FullName = "Anil Verma", RoleTitle = "Sous Chef", Department = "Kitchen", BaseSalary = 32000m, Phone = "9876543214", Shift = "Morning", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new StaffPerson { FullName = "Pooja Patel", RoleTitle = "Cashier & Accountant", Department = "Management", BaseSalary = 26000m, Phone = "9876543215", Shift = "General", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new StaffPerson { FullName = "Kiran Rao", RoleTitle = "Head Captain", Department = "Dining / Service", BaseSalary = 24000m, Phone = "9876543216", Shift = "Evening", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new StaffPerson { FullName = "Ramesh Babu", RoleTitle = "Senior Steward", Department = "Dining / Service", BaseSalary = 20000m, Phone = "9876543217", Shift = "Evening", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
                };
                context.StaffPersons.AddRange(initialStaff);
                context.SaveChanges();
            }

            if (!context.Ingredients.Any())
            {
                var initialIngredients = new List<Ingredient>
                {
                    new Ingredient { Name = "Johnnie Walker Black Label", IngredientName = "Johnnie Walker Black Label", Category = "Whiskey", Unit = "Bottle", CurrentStock = 24m, MinimumThreshold = 5m, UnitCost = 2800m, CostPerUnit = 2800m, ReorderLevel = 5m, Mrp = 3800m, Supplier = "Diageo Direct", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Ingredient { Name = "Absolut Vodka", IngredientName = "Absolut Vodka", Category = "Vodka & Gin", Unit = "Bottle", CurrentStock = 18m, MinimumThreshold = 4m, UnitCost = 1900m, CostPerUnit = 1900m, ReorderLevel = 4m, Mrp = 2600m, Supplier = "Pernod Ricard", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Ingredient { Name = "Corona Extra Beer", IngredientName = "Corona Extra Beer", Category = "Beer", Unit = "Bottle", CurrentStock = 120m, MinimumThreshold = 24m, UnitCost = 180m, CostPerUnit = 180m, ReorderLevel = 24m, Mrp = 300m, Supplier = "Anheuser-Busch", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Ingredient { Name = "Sula Cabernet Shiraz", IngredientName = "Sula Cabernet Shiraz", Category = "Wine", Unit = "Bottle", CurrentStock = 30m, MinimumThreshold = 6m, UnitCost = 950m, CostPerUnit = 950m, ReorderLevel = 6m, Mrp = 1500m, Supplier = "Sula Vineyards", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Ingredient { Name = "Basmati Rice Premium", IngredientName = "Basmati Rice Premium", Category = "Grains & Rice", Unit = "KG", CurrentStock = 200m, MinimumThreshold = 30m, UnitCost = 95m, CostPerUnit = 95m, ReorderLevel = 30m, Mrp = 120m, Supplier = "Royal Grains Ltd", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Ingredient { Name = "Fresh Paneer", IngredientName = "Fresh Paneer", Category = "Dairy & Cheeses", Unit = "KG", CurrentStock = 3m, MinimumThreshold = 10m, UnitCost = 320m, CostPerUnit = 320m, ReorderLevel = 10m, Mrp = 400m, Supplier = "Dairy Fresh Co", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Ingredient { Name = "Fresh Mint Leaves", IngredientName = "Fresh Mint Leaves", Category = "Garnishes", Unit = "GM", CurrentStock = 0m, MinimumThreshold = 500m, UnitCost = 0.20m, CostPerUnit = 0.20m, ReorderLevel = 500m, Mrp = 0.50m, Supplier = "Local Green Market", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
                };
                context.Ingredients.AddRange(initialIngredients);
                context.SaveChanges();
            }

            var staffList = context.StaffPersons.ToList();
            bool staffChanged = false;
            foreach (var st in staffList)
            {
                var roleLower = (st.RoleTitle ?? "").ToLowerInvariant();
                string targetDept = "Dining / Service";
                decimal targetSalary = 22000m;

                if (roleLower.Contains("bartender") || roleLower.Contains("bar") || roleLower.Contains("mixologist") || roleLower.Contains("sommelier"))
                {
                    targetDept = "Bar";
                    targetSalary = 28000m;
                }
                else if (roleLower.Contains("chef") || roleLower.Contains("cook") || roleLower.Contains("kitchen") || roleLower.Contains("commis"))
                {
                    targetDept = "Kitchen";
                    targetSalary = 32000m;
                }
                else if (roleLower.Contains("manager") || roleLower.Contains("supervisor") || roleLower.Contains("cashier") || roleLower.Contains("accountant") || roleLower.Contains("admin"))
                {
                    targetDept = "Management";
                    targetSalary = 45000m;
                }

                if (string.IsNullOrWhiteSpace(st.Department) || (st.Department == "Dining / Service" && targetDept != "Dining / Service"))
                {
                    st.Department = targetDept;
                    staffChanged = true;
                }
                if (st.BaseSalary <= 0 || (st.BaseSalary == 25000.00m && targetSalary != 25000.00m))
                {
                    st.BaseSalary = targetSalary;
                    staffChanged = true;
                }
            }
            if (staffChanged)
            {
                context.SaveChanges();
            }

            // Seed initial salary payments if empty
            if (!context.SalaryPayments.Any() && staffList.Any())
            {
                var currentMonthStr = DateTime.UtcNow.ToString("yyyy-MM");
                var paymentList = new List<SalaryPayment>();
                foreach (var st in staffList.Take(6))
                {
                    paymentList.Add(new SalaryPayment
                    {
                        StaffId = st.StaffId,
                        StaffName = st.FullName,
                        RoleTitle = st.RoleTitle,
                        Department = st.Department ?? "Dining / Service",
                        Amount = st.BaseSalary,
                        PaymentDate = DateTime.UtcNow.AddDays(-2),
                        PaymentMonth = currentMonthStr,
                        PaymentMethod = "BANK_TRANSFER",
                        TransactionReference = $"TXN-{DateTime.UtcNow:yyyyMM}-{st.StaffId:D4}",
                        Remarks = $"Monthly salary for {currentMonthStr}",
                        Status = "COMPLETED",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
                context.SalaryPayments.AddRange(paymentList);
                context.SaveChanges();
            }

            // Seed initial inventory purchases if empty
            if (!context.InventoryPurchases.Any())
            {
                var items = context.Ingredients.Where(i => i.IsActive).Take(6).ToList();
                var purchaseList = new List<InventoryPurchase>();
                foreach (var itm in items)
                {
                    var isBar = (itm.Category ?? "").ToLower().Contains("bar") || (itm.Category ?? "").ToLower().Contains("drink") || (itm.Category ?? "").ToLower().Contains("liquor") || (itm.Category ?? "").ToLower().Contains("beer") || (itm.Category ?? "").ToLower().Contains("wine") || (itm.Category ?? "").ToLower().Contains("whiskey");
                    var qty = itm.CurrentStock > 0 ? itm.CurrentStock : 10m;
                    var cost = itm.UnitCost > 0 ? itm.UnitCost : 150m;
                    purchaseList.Add(new InventoryPurchase
                    {
                        IngredientId = itm.IngredientId,
                        ItemName = itm.Name ?? itm.IngredientName ?? "Stock Item",
                        Department = isBar ? "Bar" : "Dine",
                        Supplier = !string.IsNullOrWhiteSpace(itm.Supplier) ? itm.Supplier : "AVSR Direct Supply",
                        Quantity = qty,
                        UnitCost = cost,
                        TotalAmount = qty * cost,
                        Note = "Initial stock procurement",
                        PurchaseDate = DateTime.UtcNow.AddDays(-5),
                        CreatedAt = DateTime.UtcNow
                    });
                }
                if (purchaseList.Any())
                {
                    context.InventoryPurchases.AddRange(purchaseList);
                    context.SaveChanges();
                }
            }
        }
        catch { }

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
            SafeExecuteSql(conn, @"
                CREATE TABLE IF NOT EXISTS `salary_payments` (
                    `payment_id` BIGINT NOT NULL AUTO_INCREMENT,
                    `staff_id` BIGINT NULL,
                    `staff_name` VARCHAR(100) NOT NULL,
                    `amount` DECIMAL(18,2) NOT NULL,
                    `paid_on` DATE NOT NULL,
                    `salary_period` CHAR(7) NOT NULL,
                    `payment_method` VARCHAR(40) NOT NULL,
                    `notes` VARCHAR(255) NULL,
                    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (`payment_id`),
                    INDEX `ix_salary_payments_staff_paid_on` (`staff_id`, `paid_on`)
                ) ENGINE=InnoDB;");
            SafeExecuteSql(conn, @"
                CREATE TABLE IF NOT EXISTS `inventory_purchase_records` (
                    `purchase_id` BIGINT NOT NULL AUTO_INCREMENT,
                    `item_id` BIGINT NULL,
                    `name` VARCHAR(100) NOT NULL,
                    `category` VARCHAR(100) NOT NULL DEFAULT '',
                    `subcategory` VARCHAR(100) NOT NULL DEFAULT '',
                    `supplier` VARCHAR(150) NOT NULL DEFAULT '',
                    `quantity` DECIMAL(18,3) NOT NULL,
                    `unit` VARCHAR(50) NOT NULL,
                    `unit_cost` DECIMAL(18,2) NOT NULL,
                    `department` VARCHAR(10) NOT NULL DEFAULT 'dine',
                    `purchase_date` DATE NOT NULL,
                    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (`purchase_id`),
                    INDEX `ix_inventory_purchase_records_department_date` (`department`, `purchase_date`)
                ) ENGINE=InnoDB;");

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
                    "password_reset_tokens", "inventory_purchases", "salary_payments", "inventory_transactions"
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
            EnsureColumnExists(conn, "ingredients", "ingredient_name", "VARCHAR(150) NULL DEFAULT ''");
            EnsureColumnExists(conn, "ingredients", "cost_per_unit", "DECIMAL(18,2) NOT NULL DEFAULT 0.00");
            EnsureColumnExists(conn, "inventory_transactions", "note", "VARCHAR(255) NULL");
            EnsureColumnExists(conn, "inventory_transactions", "notes", "VARCHAR(255) NULL");
            EnsureColumnExists(conn, "inventory_transactions", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "inventory_transactions", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "inventory_transactions", "transaction_date", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "inventory_transactions", "unit_cost", "DECIMAL(18,2) NOT NULL DEFAULT 0.00");
            EnsureColumnExists(conn, "inventory_transactions", "txn_type", "VARCHAR(30) NOT NULL DEFAULT 'usage'");
            EnsureColumnExists(conn, "inventory_transactions", "quantity", "DECIMAL(18,2) NOT NULL DEFAULT 0.00");
            EnsureColumnExists(conn, "inventory_transactions", "remarks", "VARCHAR(255) NULL");
            EnsureColumnExists(conn, "inventory_transactions", "txn_date", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "inventory_transactions", "balance_after", "DECIMAL(18,3) NOT NULL DEFAULT 0.00");
            SafeExecuteSql(conn, "ALTER TABLE `inventory_transactions` MODIFY COLUMN `balance_after` DECIMAL(18,3) NULL DEFAULT 0.00;");
            SafeExecuteSql(conn, "ALTER TABLE `inventory_transactions` MODIFY COLUMN `txn_type` VARCHAR(50) NOT NULL DEFAULT 'usage';");
            EnsureColumnExists(conn, "ingredients", "reorder_level", "DECIMAL(18,2) NOT NULL DEFAULT 5.00");
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
            EnsureColumnExists(conn, "ingredients", "deleted_at", "DATETIME NULL");
            SafeExecuteSql(conn, "ALTER TABLE `ingredients` MODIFY COLUMN `cost_per_unit` DECIMAL(18,2) NOT NULL DEFAULT 0.00;");
            EnsureColumnExists(conn, "ingredients", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "ingredients", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "ingredients", "used_quantity", "DECIMAL(18,2) NOT NULL DEFAULT 0.00");
            EnsureColumnExists(conn, "ingredients", "item_type", "VARCHAR(100) NULL DEFAULT ''");

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
            EnsureColumnExists(conn, "menu_items", "subcategory", "VARCHAR(100) NULL");
            EnsureColumnExists(conn, "menu_items", "price", "DECIMAL(18,2) NOT NULL DEFAULT 0.00");
            EnsureColumnExists(conn, "menu_items", "dietary_type", "VARCHAR(20) NULL DEFAULT 'N/A'");
            EnsureColumnExists(conn, "menu_items", "spice_level", "INT NOT NULL DEFAULT 0");
            EnsureColumnExists(conn, "menu_items", "prep_time_minutes", "INT NULL DEFAULT 15");
            EnsureColumnExists(conn, "menu_items", "short_description", "VARCHAR(500) NULL");
            EnsureColumnExists(conn, "menu_items", "image_url", "VARCHAR(255) NULL");
            EnsureColumnExists(conn, "menu_items", "is_chefs_special", "TINYINT(1) NOT NULL DEFAULT 0");
            EnsureColumnExists(conn, "menu_items", "is_available", "TINYINT(1) NOT NULL DEFAULT 1");
            EnsureColumnExists(conn, "menu_items", "recipe_json", "LONGTEXT NULL");
            EnsureColumnExists(conn, "menu_items", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "menu_items", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
            EnsureColumnExists(conn, "menu_items", "deleted_at", "DATETIME NULL");

            // staff_persons ALTER TABLE
            EnsureColumnExists(conn, "staff_persons", "full_name", "VARCHAR(100) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "staff_persons", "role_title", "VARCHAR(50) NOT NULL DEFAULT ''");
            EnsureColumnExists(conn, "staff_persons", "department", "VARCHAR(50) NOT NULL DEFAULT 'Dining / Service'");
            EnsureColumnExists(conn, "staff_persons", "base_salary", "DECIMAL(18,2) NOT NULL DEFAULT 25000.00");
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
                `recipe_json` LONGTEXT NULL,
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

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `inventory_purchases` (
                `purchase_id` BIGINT NOT NULL AUTO_INCREMENT,
                `ingredient_id` BIGINT NOT NULL,
                `item_name` VARCHAR(150) NOT NULL,
                `department` VARCHAR(50) NOT NULL DEFAULT 'Bar',
                `supplier` VARCHAR(150) NOT NULL DEFAULT 'Local Supplier',
                `quantity` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `unit_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `total_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `note` VARCHAR(255) NULL,
                `purchase_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `branch_id` BIGINT NULL,
                `outlet_id` BIGINT NULL DEFAULT 1,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `created_by` BIGINT NULL,
                `updated_by` BIGINT NULL,
                PRIMARY KEY (`purchase_id`),
                KEY `idx_inv_purchases_date` (`purchase_date`),
                KEY `idx_inv_purchases_dept` (`department`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `salary_payments` (
                `payment_id` BIGINT NOT NULL AUTO_INCREMENT,
                `staff_id` BIGINT NOT NULL,
                `staff_name` VARCHAR(100) NOT NULL,
                `role_title` VARCHAR(50) NOT NULL,
                `department` VARCHAR(50) NOT NULL DEFAULT 'Dining / Service',
                `amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `payment_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `payment_month` VARCHAR(20) NOT NULL DEFAULT '',
                `payment_method` VARCHAR(50) NOT NULL DEFAULT 'BANK_TRANSFER',
                `transaction_reference` VARCHAR(100) NULL,
                `remarks` VARCHAR(255) NULL,
                `status` VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
                `branch_id` BIGINT NULL,
                `outlet_id` BIGINT NULL DEFAULT 1,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `created_by` BIGINT NULL,
                `updated_by` BIGINT NULL,
                PRIMARY KEY (`payment_id`),
                KEY `idx_salary_staff` (`staff_id`),
                KEY `idx_salary_date` (`payment_date`),
                KEY `idx_salary_dept` (`department`)
            ) ENGINE=InnoDB;");

        EnsureColumnExists(conn, "salary_payments", "role_title", "VARCHAR(50) NOT NULL DEFAULT ''");
        EnsureColumnExists(conn, "salary_payments", "department", "VARCHAR(50) NOT NULL DEFAULT 'Dining / Service'");
        EnsureColumnExists(conn, "salary_payments", "payment_date", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
        EnsureColumnExists(conn, "salary_payments", "payment_month", "VARCHAR(20) NOT NULL DEFAULT ''");
        EnsureColumnExists(conn, "salary_payments", "transaction_reference", "VARCHAR(100) NULL");
        EnsureColumnExists(conn, "salary_payments", "remarks", "VARCHAR(255) NULL");
        EnsureColumnExists(conn, "salary_payments", "status", "VARCHAR(30) NOT NULL DEFAULT 'COMPLETED'");
        EnsureColumnExists(conn, "salary_payments", "updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
        EnsureColumnExists(conn, "salary_payments", "created_by", "BIGINT NULL DEFAULT NULL");
        EnsureColumnExists(conn, "salary_payments", "paid_on", "DATE NULL");
        EnsureColumnExists(conn, "salary_payments", "salary_period", "CHAR(7) NOT NULL DEFAULT ''");
        EnsureColumnExists(conn, "salary_payments", "notes", "VARCHAR(255) NULL");
        SafeExecuteSql(conn, "ALTER TABLE `salary_payments` MODIFY COLUMN `staff_id` BIGINT NULL;");
        SafeExecuteSql(conn, "UPDATE `salary_payments` SET `payment_date` = `paid_on` WHERE `paid_on` IS NOT NULL;");
        SafeExecuteSql(conn, "UPDATE `salary_payments` SET `payment_month` = `salary_period` WHERE `salary_period` <> '';");
        SafeExecuteSql(conn, "UPDATE `salary_payments` SET `remarks` = `notes` WHERE `notes` IS NOT NULL;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `inventory_transactions` (
                `txn_id` BIGINT NOT NULL AUTO_INCREMENT,
                `ingredient_id` BIGINT NOT NULL,
                `txn_type` VARCHAR(30) NOT NULL,
                `quantity` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `unit_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `note` VARCHAR(255) NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`txn_id`),
                KEY `idx_txn_ingredient` (`ingredient_id`)
            ) ENGINE=InnoDB;");

        // ============================================================
        // CA FINANCIAL ACCOUNTING & STATUTORY AUDIT TABLES
        // ============================================================
        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `audit_logs` (
                `log_id` BIGINT NOT NULL AUTO_INCREMENT,
                `user_id` BIGINT NULL,
                `username` VARCHAR(100) NULL DEFAULT 'System',
                `action` VARCHAR(100) NOT NULL,
                `table_name` VARCHAR(100) NOT NULL,
                `record_id` VARCHAR(100) NULL,
                `old_value` TEXT NULL,
                `new_value` TEXT NULL,
                `ip_address` VARCHAR(50) NULL,
                `severity` VARCHAR(20) NOT NULL DEFAULT 'INFO',
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`log_id`),
                KEY `idx_audit_action` (`action`),
                KEY `idx_audit_created` (`created_at`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `daily_balances` (
                `id` BIGINT NOT NULL AUTO_INCREMENT,
                `balance_date` VARCHAR(20) NOT NULL UNIQUE,
                `opening_cash` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `opening_bank` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `opening_total` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `closing_cash` DECIMAL(18,2) NULL,
                `closing_bank` DECIMAL(18,2) NULL,
                `closing_total` DECIMAL(18,2) NULL,
                `expected_cash` DECIMAL(18,2) NULL,
                `cash_difference` DECIMAL(18,2) NULL,
                `is_closed` TINYINT(1) NOT NULL DEFAULT 0,
                `opened_by` VARCHAR(100) NULL,
                `closed_by` VARCHAR(100) NULL,
                `notes` TEXT NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_balance_date` (`balance_date`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `journal_entries` (
                `id` BIGINT NOT NULL AUTO_INCREMENT,
                `voucher_number` VARCHAR(50) NOT NULL UNIQUE,
                `entry_date` VARCHAR(20) NOT NULL,
                `narration` TEXT NOT NULL,
                `total_debit` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `total_credit` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `lines_json` LONGTEXT NOT NULL,
                `created_by` VARCHAR(100) NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_journal_date` (`entry_date`),
                KEY `idx_journal_voucher` (`voucher_number`)
            ) ENGINE=InnoDB;");

        SafeExecuteSql(conn, @"
            CREATE TABLE IF NOT EXISTS `chart_of_accounts` (
                `id` BIGINT NOT NULL AUTO_INCREMENT,
                `account_code` VARCHAR(50) NOT NULL UNIQUE,
                `account_name` VARCHAR(150) NOT NULL,
                `account_group` VARCHAR(50) NOT NULL,
                `account_type` VARCHAR(50) NOT NULL,
                `normal_balance` VARCHAR(20) NOT NULL DEFAULT 'Debit',
                `description` VARCHAR(255) NULL,
                `opening_balance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                `is_system` TINYINT(1) NOT NULL DEFAULT 0,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_account_code` (`account_code`)
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
