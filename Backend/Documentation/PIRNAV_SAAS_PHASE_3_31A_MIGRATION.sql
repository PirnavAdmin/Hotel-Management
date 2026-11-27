-- ============================================================================
-- PIRNAV SaaS Phase 3.31A – Non-Destructive Multi-Tenant & Auth Hardening Migration
-- Target: MySQL 8.0+ (Idempotent; preserves all existing Branch & User data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `organizations` (
  `organization_id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(160) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `gstin` VARCHAR(20) NULL,
  `owner_email` VARCHAR(150) NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'Active',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) NULL,
  PRIMARY KEY (`organization_id`),
  UNIQUE KEY `ux_organizations_slug` (`slug`),
  KEY `ix_organizations_gstin` (`gstin`),
  KEY `ix_organizations_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `restaurants` (
  `restaurant_id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `code` VARCHAR(60) NOT NULL,
  `brand_tagline` VARCHAR(200) NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'Active',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) NULL,
  PRIMARY KEY (`restaurant_id`),
  UNIQUE KEY `ux_restaurants_code` (`code`),
  KEY `ix_restaurants_organization_id` (`organization_id`),
  CONSTRAINT `fk_restaurants_organization` FOREIGN KEY (`organization_id`)
    REFERENCES `organizations` (`organization_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Safely add restaurant_id to existing branches table if missing
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches' AND COLUMN_NAME = 'restaurant_id'
);
SET @sql_add_col := IF(
  @col_exists = 0,
  'ALTER TABLE `branches` ADD COLUMN `restaurant_id` BIGINT NULL AFTER `branch_id`, ADD INDEX `ix_branches_restaurant_id` (`restaurant_id`)',
  'SELECT 1'
);
PREPARE stmt_add_col FROM @sql_add_col;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

CREATE TABLE IF NOT EXISTS `user_workspace_access` (
  `user_workspace_access_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `organization_id` BIGINT NOT NULL,
  `restaurant_id` BIGINT NOT NULL,
  `branch_id` BIGINT NULL,
  `scope_role` VARCHAR(50) NOT NULL DEFAULT 'Admin',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`user_workspace_access_id`),
  UNIQUE KEY `ux_user_workspace_scope` (`user_id`, `organization_id`, `restaurant_id`, `branch_id`),
  KEY `ix_uwa_org_rest_branch` (`organization_id`, `restaurant_id`, `branch_id`),
  CONSTRAINT `fk_uwa_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_uwa_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`organization_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_uwa_rest` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_uwa_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `restaurant_registrations` (
  `restaurant_registration_id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_name` VARCHAR(160) NOT NULL,
  `restaurant_name` VARCHAR(160) NOT NULL,
  `branch_name` VARCHAR(160) NOT NULL,
  `owner_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(25) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `address` VARCHAR(500) NOT NULL,
  `gstin` VARCHAR(20) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PendingApproval',
  `rejection_reason` VARCHAR(500) NULL,
  `reviewed_by_user_id` BIGINT NULL,
  `reviewed_at` DATETIME(6) NULL,
  `provisioned_organization_id` BIGINT NULL,
  `provisioned_restaurant_id` BIGINT NULL,
  `provisioned_branch_id` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`restaurant_registration_id`),
  KEY `ix_reg_email_status` (`email`, `status`),
  KEY `ix_reg_gstin` (`gstin`),
  KEY `ix_reg_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `demo_requests` (
  `demo_request_id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `restaurant_or_org` VARCHAR(160) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(25) NOT NULL,
  `branch_count` INT NOT NULL DEFAULT 1,
  `message` VARCHAR(1000) NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'New',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`demo_request_id`),
  KEY `ix_demo_email` (`email`),
  KEY `ix_demo_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tenant_subscriptions` (
  `tenant_subscription_id` BIGINT NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL,
  `plan_key` VARCHAR(60) NOT NULL DEFAULT 'single-outlet',
  `plan_name` VARCHAR(100) NOT NULL DEFAULT 'Single Outlet',
  `status` VARCHAR(30) NOT NULL DEFAULT 'Trial',
  `trial_status` VARCHAR(40) NOT NULL DEFAULT 'ActiveTrial',
  `branch_limit` INT NOT NULL DEFAULT 1,
  `user_limit` INT NOT NULL DEFAULT 15,
  `enabled_modules_json` TEXT NULL,
  `monthly_price_inr` DECIMAL(12,2) NOT NULL DEFAULT 2499.00,
  `current_period_start` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `current_period_end` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`tenant_subscription_id`),
  KEY `ix_tsub_org_status` (`organization_id`, `status`),
  CONSTRAINT `fk_tsub_organization` FOREIGN KEY (`organization_id`)
    REFERENCES `organizations` (`organization_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_permission_id` BIGINT NOT NULL AUTO_INCREMENT,
  `role_id` BIGINT NOT NULL,
  `role_key` VARCHAR(60) NOT NULL,
  `permission_key` VARCHAR(80) NOT NULL,
  `is_granted` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_by_user_id` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`role_permission_id`),
  UNIQUE KEY `ux_role_permission` (`role_id`, `permission_key`),
  KEY `ix_rp_role_key` (`role_key`),
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`)
    REFERENCES `roles` (`role_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `platform_settings` (
  `platform_setting_id` BIGINT NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `platform_name` VARCHAR(120) NOT NULL DEFAULT 'PIRNAV',
  `require_manual_approval` TINYINT(1) NOT NULL DEFAULT 1,
  `default_currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `default_tax_rate` DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  `notify_on_registration` TINYINT(1) NOT NULL DEFAULT 1,
  `settings_json` TEXT NULL,
  `updated_by_user_id` BIGINT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`platform_setting_id`),
  UNIQUE KEY `ux_platform_settings_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Non-destructive seed/backfill for existing legacy branches
INSERT INTO `organizations` (`name`, `slug`, `status`)
SELECT 'PIRNAV Default Organization', 'pirnav-default-org', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM `organizations` WHERE `slug` = 'pirnav-default-org');

INSERT INTO `restaurants` (`organization_id`, `name`, `code`, `status`)
SELECT o.`organization_id`, 'Default Restaurant', 'default-restaurant', 'Active'
FROM `organizations` o
WHERE o.`slug` = 'pirnav-default-org'
  AND NOT EXISTS (SELECT 1 FROM `restaurants` WHERE `code` = 'default-restaurant');

UPDATE `branches` b
JOIN `restaurants` r ON r.`code` = 'default-restaurant'
SET b.`restaurant_id` = r.`restaurant_id`
WHERE b.`restaurant_id` IS NULL;

INSERT INTO `platform_settings` (`setting_key`, `platform_name`, `require_manual_approval`, `default_currency`, `default_tax_rate`, `notify_on_registration`)
SELECT 'default', 'PIRNAV', 1, 'INR', 5.00, 1
WHERE NOT EXISTS (SELECT 1 FROM `platform_settings` WHERE `setting_key` = 'default');
