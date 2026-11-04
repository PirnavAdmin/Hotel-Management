-- ============================================================
-- HMS & POS MISSING APIS DATABASE MIGRATION SCRIPT
-- Script: HMS_POS_MISSING_APIS.sql
-- Target Database: MySQL (hotel_management_db)
-- Description: Self-healing idempotent DDL statements for all POS and HMS tables.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Dining Tables
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

-- 2. Orders Table
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

-- 3. Order Items Table
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
    CONSTRAINT `fk_order_items_order_missing` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Users Table
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
-- 5. Invoices Self-Healing Table & Column Alignment
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

-- Self-healing migration for existing databases missing taxable_amount or amount_paid
ALTER TABLE `invoices` ADD COLUMN IF NOT EXISTS `taxable_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00;
ALTER TABLE `invoices` ADD COLUMN IF NOT EXISTS `amount_paid` DECIMAL(18,2) NOT NULL DEFAULT 0.00;
ALTER TABLE `invoices` ADD COLUMN IF NOT EXISTS `paid_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00;

SET FOREIGN_KEY_CHECKS = 1;
