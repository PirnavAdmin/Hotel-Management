-- ============================================================================
-- PIRNAV SaaS Phase 3.31B Idempotent Non-Destructive Migration (MySQL 8+)
-- Extends Phase 3.31A schema for Super Admin SaaS Billing, Support Tickets,
-- and Branch Code support.
-- ============================================================================

-- 1. Add branch_code to branches if missing
SET @branch_code_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'branches'
      AND COLUMN_NAME = 'branch_code'
);

SET @sql_add_branch_code = IF(
    @branch_code_exists = 0,
    'ALTER TABLE `branches` ADD COLUMN `branch_code` VARCHAR(80) NULL AFTER `branch_name`;',
    'SELECT ''branches.branch_code already exists'' AS migration_status;'
);
PREPARE stmt_add_branch_code FROM @sql_add_branch_code;
EXECUTE stmt_add_branch_code;
DEALLOCATE PREPARE stmt_add_branch_code;

-- 2. SaaS Billing Invoices (separate from diner invoices)
CREATE TABLE IF NOT EXISTS `saas_billing_invoices` (
    `saas_billing_invoice_id` BIGINT NOT NULL AUTO_INCREMENT,
    `organization_id` BIGINT NOT NULL,
    `invoice_number` VARCHAR(60) NOT NULL,
    `plan_name` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `due_date` DATETIME NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'Pending',
    `payment_reference` VARCHAR(120) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`saas_billing_invoice_id`),
    UNIQUE KEY `uq_saas_billing_invoice_number` (`invoice_number`),
    KEY `ix_saas_billing_org_status` (`organization_id`, `status`),
    CONSTRAINT `fk_saas_billing_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`organization_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Support Tickets
CREATE TABLE IF NOT EXISTS `support_tickets` (
    `support_ticket_id` BIGINT NOT NULL AUTO_INCREMENT,
    `organization_id` BIGINT NOT NULL,
    `ticket_number` VARCHAR(50) NOT NULL,
    `subject` VARCHAR(200) NOT NULL,
    `priority` VARCHAR(20) NOT NULL DEFAULT 'Medium',
    `status` VARCHAR(30) NOT NULL DEFAULT 'Open',
    `description` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`support_ticket_id`),
    UNIQUE KEY `uq_support_ticket_number` (`ticket_number`),
    KEY `ix_support_ticket_org_prio_status` (`organization_id`, `priority`, `status`),
    CONSTRAINT `fk_support_tickets_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`organization_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Support Ticket Internal Notes
CREATE TABLE IF NOT EXISTS `support_ticket_notes` (
    `support_ticket_note_id` BIGINT NOT NULL AUTO_INCREMENT,
    `support_ticket_id` BIGINT NOT NULL,
    `author_user_id` BIGINT NULL,
    `note` TEXT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`support_ticket_note_id`),
    KEY `ix_support_ticket_notes_ticket` (`support_ticket_id`),
    CONSTRAINT `fk_support_ticket_notes_ticket` FOREIGN KEY (`support_ticket_id`) REFERENCES `support_tickets` (`support_ticket_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Ensure RestaurantOwner role exists for newly approved restaurant owners
INSERT INTO `roles` (`role_name`, `description`, `is_active`, `created_at`, `updated_at`)
SELECT 'RestaurantOwner', 'Primary owner of a registered restaurant organization', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `role_name` = 'RestaurantOwner' AND `deleted_at` IS NULL);
