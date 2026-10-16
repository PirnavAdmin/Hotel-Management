-- ============================================================
-- HMS & POS MERGED DATABASE MIGRATION SCRIPT
-- Script: HMS_POS_DATABASE_UPDATES.sql
-- Target Database: MySQL (hotel_management_db / hotel_management_db_31)
-- Description: Self-healing idempotent DDL statements for all HMS and POS tables.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `user_id` BIGINT NOT NULL AUTO_INCREMENT,
    `role_id` BIGINT NOT NULL DEFAULT 1,
    `branch_id` BIGINT NULL,
    `user_name` VARCHAR(60) NOT NULL,
    `password` VARCHAR(255) NULL,
    `confirm_password` VARCHAR(255) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NULL,
    `email` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `pin_code` VARCHAR(10) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `last_login` DATETIME NULL,
    `deleted_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT NULL,
    `updated_by` BIGINT NULL,
    PRIMARY KEY (`user_id`),
    UNIQUE KEY `uk_users_email` (`email`),
    UNIQUE KEY `uk_users_user_name` (`user_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Menu Categories Table
CREATE TABLE IF NOT EXISTS `menu_categories` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `display_order` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Menu Items Table
CREATE TABLE IF NOT EXISTS `menu_items` (
    `menu_item_id` BIGINT NOT NULL AUTO_INCREMENT,
    `dish_name` VARCHAR(150) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `price` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `dietary_type` VARCHAR(20) NOT NULL DEFAULT 'Non-Veg',
    `spice_level` INT NOT NULL DEFAULT 0,
    `prep_time_minutes` INT NULL DEFAULT 15,
    `short_description` VARCHAR(500) NULL,
    `image_url` VARCHAR(500) NULL,
    `is_chefs_special` TINYINT(1) NOT NULL DEFAULT 0,
    `is_available` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL,
    PRIMARY KEY (`menu_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Staff Table
CREATE TABLE IF NOT EXISTS `staff` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'Waiter',
    `phone` VARCHAR(20) NOT NULL,
    `shift` VARCHAR(20) NOT NULL DEFAULT 'Morning',
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Dining Sections Table
CREATE TABLE IF NOT EXISTS `dining_sections` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `outlet_id` BIGINT NOT NULL DEFAULT 1,
    `section_name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL,
    `created_by` BIGINT NULL,
    `updated_by` BIGINT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Dining Tables Table
CREATE TABLE IF NOT EXISTS `dining_tables` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `section_id` BIGINT NOT NULL DEFAULT 1,
    `name` VARCHAR(50) NOT NULL,
    `capacity` INT NOT NULL DEFAULT 4,
    `status` VARCHAR(20) NOT NULL DEFAULT 'Vacant',
    `assigned_waiter_id` BIGINT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL,
    `created_by` BIGINT NULL,
    `updated_by` BIGINT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Orders Table
CREATE TABLE IF NOT EXISTS `orders` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_number` VARCHAR(50) NOT NULL,
    `outlet_id` BIGINT NOT NULL DEFAULT 1,
    `table_id` BIGINT NOT NULL,
    `waiter_id` BIGINT NULL,
    `guests` INT NOT NULL DEFAULT 1,
    `status` VARCHAR(20) NOT NULL DEFAULT 'Active',
    `special_instructions` VARCHAR(500) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL,
    `created_by` BIGINT NULL,
    `updated_by` BIGINT NULL,
    `table_name` VARCHAR(50) NOT NULL DEFAULT '',
    `section` VARCHAR(50) NOT NULL DEFAULT '',
    `server_name` VARCHAR(100) NOT NULL DEFAULT '',
    `subtotal` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `discount_percent` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `tax_percent` DECIMAL(18,2) NOT NULL DEFAULT 5.00,
    `tax_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `service_charge_percent` DECIMAL(18,2) NOT NULL DEFAULT 5.00,
    `service_charge_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `tip_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `grand_total` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `payment_method` VARCHAR(30) NULL,
    `invoice_no` VARCHAR(50) NULL,
    `settled_at` DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_orders_order_number` (`order_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Order Items Table
CREATE TABLE IF NOT EXISTS `order_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `kot_id` BIGINT NOT NULL DEFAULT 0,
    `menu_item_id` BIGINT NOT NULL,
    `variant_id` BIGINT NULL,
    `name` VARCHAR(150) NOT NULL,
    `price` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `quantity` INT NOT NULL DEFAULT 1,
    `total_price` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `notes` VARCHAR(255) NULL,
    `kot_status` VARCHAR(20) NOT NULL DEFAULT 'Queued',
    `kot_batch` INT NOT NULL DEFAULT 1,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL,
    `created_by` BIGINT NULL,
    `updated_by` BIGINT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Kitchen Stations Table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Kitchen Order Tickets (KOT) Table
CREATE TABLE IF NOT EXISTS `kitchen_order_tickets` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `kot_number` VARCHAR(50) NOT NULL,
    `order_id` BIGINT NOT NULL,
    `station_id` BIGINT NOT NULL DEFAULT 1,
    `batch_number` INT NOT NULL DEFAULT 1,
    `status` VARCHAR(20) NOT NULL DEFAULT 'Queued',
    `prepared_by_chef_id` BIGINT NULL,
    `printed_at` DATETIME NULL,
    `completed_at` DATETIME NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL,
    `created_by` BIGINT NULL,
    `updated_by` BIGINT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Invoices Table
CREATE TABLE IF NOT EXISTS `invoices` (
    `invoice_id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `invoice_number` VARCHAR(50) NOT NULL,
    `subtotal` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `taxable_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ensure taxable_amount column exists on existing invoices table (Self-healing fix)
ALTER TABLE `invoices` ADD COLUMN IF NOT EXISTS `taxable_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00;

-- 12. Invoice Payments Table
CREATE TABLE IF NOT EXISTS `invoice_payments` (
    `payment_id` BIGINT NOT NULL AUTO_INCREMENT,
    `invoice_id` BIGINT NOT NULL,
    `amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `payment_mode` VARCHAR(30) NOT NULL DEFAULT 'CASH',
    `transaction_reference` VARCHAR(100) NULL,
    `paid_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Customers Table
CREATE TABLE IF NOT EXISTS `customers` (
    `customer_id` BIGINT NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(100) NULL,
    `loyalty_points` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Reservations Table
CREATE TABLE IF NOT EXISTS `reservations` (
    `reservation_id` BIGINT NOT NULL AUTO_INCREMENT,
    `customer_id` BIGINT NULL,
    `customer_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `table_id` BIGINT NULL,
    `guests_count` INT NOT NULL DEFAULT 2,
    `reservation_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`reservation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Ingredients Table
CREATE TABLE IF NOT EXISTS `ingredients` (
    `ingredient_id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'KG',
    `current_stock` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `minimum_threshold` DECIMAL(18,2) NOT NULL DEFAULT 5.00,
    `unit_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`ingredient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Suppliers Table
CREATE TABLE IF NOT EXISTS `suppliers` (
    `supplier_id` BIGINT NOT NULL AUTO_INCREMENT,
    `supplier_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(100) NULL,
    `address` VARCHAR(255) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Self-healing nullability safeguards for audit and branch columns
ALTER TABLE `suppliers` ADD COLUMN IF NOT EXISTS `branch_id` BIGINT NULL DEFAULT NULL;
ALTER TABLE `suppliers` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;

ALTER TABLE `customers` ADD COLUMN IF NOT EXISTS `branch_id` BIGINT NULL DEFAULT NULL;
ALTER TABLE `customers` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;

ALTER TABLE `reservations` ADD COLUMN IF NOT EXISTS `branch_id` BIGINT NULL DEFAULT NULL;
ALTER TABLE `reservations` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;

ALTER TABLE `ingredients` ADD COLUMN IF NOT EXISTS `branch_id` BIGINT NULL DEFAULT NULL;
ALTER TABLE `ingredients` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;

ALTER TABLE `purchase_orders` ADD COLUMN IF NOT EXISTS `branch_id` BIGINT NULL DEFAULT NULL;
ALTER TABLE `purchase_orders` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;

ALTER TABLE `attendances` ADD COLUMN IF NOT EXISTS `branch_id` BIGINT NULL DEFAULT NULL;
ALTER TABLE `attendances` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;

ALTER TABLE `promotions` ADD COLUMN IF NOT EXISTS `branch_id` BIGINT NULL DEFAULT NULL;
ALTER TABLE `promotions` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;

ALTER TABLE `delivery_orders` ADD COLUMN IF NOT EXISTS `branch_id` BIGINT NULL DEFAULT NULL;
ALTER TABLE `delivery_orders` MODIFY COLUMN `branch_id` BIGINT NULL DEFAULT NULL;

-- Safeguards for legacy table date columns
ALTER TABLE `purchase_orders` ADD COLUMN IF NOT EXISTS `po_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `purchase_orders` MODIFY COLUMN `po_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `purchase_orders` ADD COLUMN IF NOT EXISTS `order_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `purchase_orders` MODIFY COLUMN `order_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE `reservations` ADD COLUMN IF NOT EXISTS `reservation_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `reservations` MODIFY COLUMN `reservation_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE `attendances` ADD COLUMN IF NOT EXISTS `attendance_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `attendances` MODIFY COLUMN `attendance_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE `invoices` ADD COLUMN IF NOT EXISTS `invoice_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `invoices` MODIFY COLUMN `invoice_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE `delivery_orders` ADD COLUMN IF NOT EXISTS `delivery_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `delivery_orders` MODIFY COLUMN `delivery_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;

-- Safeguards for users table columns
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `full_name` VARCHAR(100) NULL DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `phone` VARCHAR(20) NULL DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `pin_code` VARCHAR(10) NULL DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `last_login` DATETIME NULL DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `deleted_at` DATETIME NULL DEFAULT NULL;

-- Safeguards for status column truncation
ALTER TABLE `purchase_orders` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING';
ALTER TABLE `reservations` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING';
ALTER TABLE `attendances` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'PRESENT';
ALTER TABLE `invoices` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'UNPAID';
ALTER TABLE `delivery_orders` MODIFY COLUMN `delivery_status` VARCHAR(50) NOT NULL DEFAULT 'DISPATCHED';

SET FOREIGN_KEY_CHECKS = 1;



