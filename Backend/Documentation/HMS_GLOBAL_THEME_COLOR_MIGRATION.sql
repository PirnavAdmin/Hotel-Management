-- One global accent color per authenticated restaurant/branch tenant.
-- The JWT branchId is stored as restaurant_id; no shared global row is used.
CREATE TABLE IF NOT EXISTS `restaurant_theme_settings` (
    `restaurant_id` BIGINT NOT NULL,
    `accent_color` VARCHAR(7) NOT NULL DEFAULT '#f59e0b',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    `updated_by` BIGINT NOT NULL,
    PRIMARY KEY (`restaurant_id`),
    KEY `ix_restaurant_theme_settings_updated_by` (`updated_by`),
    CONSTRAINT `ck_restaurant_theme_settings_hex` CHECK (`accent_color` REGEXP '^#[0-9A-Fa-f]{6}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;