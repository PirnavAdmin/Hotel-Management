-- =====================================================================
-- Restaurant Brand Identity & Settings Migration Script
-- Target Databases: hotel_management_db_32 / hotel_management_db_test
-- Safe script: Preserves all existing records and schema
-- =====================================================================

-- 1. Ensure settings table column allows long text (e.g. for URLs or configs)
ALTER TABLE `settings` MODIFY COLUMN `setting_value` LONGTEXT NULL;

-- 2. Create restaurant_settings table for structured brand profile storage
CREATE TABLE IF NOT EXISTS `restaurant_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `restaurant_name` VARCHAR(200) NOT NULL,
    `tagline` VARCHAR(255) NULL,
    `contact_number` VARCHAR(50) NULL,
    `address` VARCHAR(255) NULL,
    `gstin` VARCHAR(50) NULL,
    `restaurant_logo` LONGTEXT NULL,
    `food_gst_rate` DECIMAL(5,2) DEFAULT 5.00,
    `service_charge_rate` DECIMAL(5,2) DEFAULT 5.00,
    `service_charge_enabled` TINYINT(1) DEFAULT 1,
    `rounding_mode` VARCHAR(20) DEFAULT 'nearest',
    `currency` VARCHAR(10) DEFAULT '₹',
    `receipt_header` VARCHAR(255) NULL,
    `receipt_footer` VARCHAR(255) NULL,
    `selected_qr_id` VARCHAR(50) NULL,
    `payment_qrs` LONGTEXT NULL,
    `show_logo_on_receipt` TINYINT(1) DEFAULT 1,
    `show_address_on_receipt` TINYINT(1) DEFAULT 1,
    `show_gst_breakdown` TINYINT(1) DEFAULT 1,
    `low_stock_alerts_enabled` TINYINT(1) DEFAULT 1,
    `display_theme` VARCHAR(50) DEFAULT 'royal-saffron',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed default record if empty
INSERT INTO `restaurant_settings` (
    `id`, `restaurant_name`, `tagline`, `contact_number`, `address`, `gstin`,
    `food_gst_rate`, `service_charge_rate`, `service_charge_enabled`,
    `rounding_mode`, `currency`, `receipt_header`, `receipt_footer`,
    `display_theme`
)
SELECT 1, 'AVSR FOOD COURT', 'Restaurant Management & Fine Dining', '+91 98450 12345', 'Main Road, Near Tech Park, Hyderabad, India', '36AABCA1234F1Z5', 5.00, 5.00, 1, 'nearest', '₹', 'Welcome to AVSR Food Court!', 'Thank you for dining with us. Visit again!', 'royal-saffron'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `restaurant_settings` WHERE `id` = 1);

-- 4. Seed initial keys in settings table
INSERT INTO `settings` (`branch_id`, `setting_key`, `setting_value`)
VALUES 
  (1, 'RESTAURANT_NAME', 'AVSR FOOD COURT'),
  (1, 'RESTAURANT_TAGLINE', 'Restaurant Management & Fine Dining'),
  (1, 'CONTACT_NUMBER', '+91 98450 12345'),
  (1, 'GSTIN', '36AABCA1234F1Z5'),
  (1, 'RECEIPT_HEADER', 'Welcome to AVSR Food Court!'),
  (1, 'RECEIPT_FOOTER', 'Thank you for dining with us. Visit again!')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- 5. Stored Procedure: sp_get_restaurant_settings
DROP PROCEDURE IF EXISTS `sp_get_restaurant_settings`;

DELIMITER //

CREATE PROCEDURE `sp_get_restaurant_settings`()
BEGIN
    SELECT 
        `id`,
        `restaurant_name`,
        `tagline`,
        `contact_number`,
        `address`,
        `gstin`,
        `restaurant_logo`,
        `food_gst_rate`,
        `service_charge_rate`,
        `service_charge_enabled`,
        `rounding_mode`,
        `currency`,
        `receipt_header`,
        `receipt_footer`,
        `selected_qr_id`,
        `payment_qrs`,
        `show_logo_on_receipt`,
        `show_address_on_receipt`,
        `show_gst_breakdown`,
        `low_stock_alerts_enabled`,
        `display_theme`,
        `updated_at`
    FROM `restaurant_settings`
    ORDER BY `id` ASC
    LIMIT 1;
END //

DELIMITER ;

-- 6. Stored Procedure: sp_save_restaurant_settings
DROP PROCEDURE IF EXISTS `sp_save_restaurant_settings`;

DELIMITER //

CREATE PROCEDURE `sp_save_restaurant_settings`(
    IN p_restaurant_name VARCHAR(200),
    IN p_tagline VARCHAR(255),
    IN p_contact_number VARCHAR(50),
    IN p_address VARCHAR(255),
    IN p_gstin VARCHAR(50),
    IN p_restaurant_logo LONGTEXT,
    IN p_food_gst_rate DECIMAL(5,2),
    IN p_service_charge_rate DECIMAL(5,2),
    IN p_service_charge_enabled TINYINT(1),
    IN p_rounding_mode VARCHAR(20),
    IN p_currency VARCHAR(10),
    IN p_receipt_header VARCHAR(255),
    IN p_receipt_footer VARCHAR(255),
    IN p_selected_qr_id VARCHAR(50),
    IN p_payment_qrs LONGTEXT,
    IN p_show_logo_on_receipt TINYINT(1),
    IN p_show_address_on_receipt TINYINT(1),
    IN p_show_gst_breakdown TINYINT(1),
    IN p_low_stock_alerts_enabled TINYINT(1),
    IN p_display_theme VARCHAR(50)
)
BEGIN
    DECLARE v_count INT;
    
    SELECT COUNT(*) INTO v_count FROM `restaurant_settings` WHERE `id` = 1;
    
    IF v_count = 0 THEN
        INSERT INTO `restaurant_settings` (
            `id`, `restaurant_name`, `tagline`, `contact_number`, `address`, `gstin`,
            `restaurant_logo`, `food_gst_rate`, `service_charge_rate`, `service_charge_enabled`,
            `rounding_mode`, `currency`, `receipt_header`, `receipt_footer`,
            `selected_qr_id`, `payment_qrs`, `show_logo_on_receipt`, `show_address_on_receipt`,
            `show_gst_breakdown`, `low_stock_alerts_enabled`, `display_theme`
        ) VALUES (
            1, p_restaurant_name, p_tagline, p_contact_number, p_address, p_gstin,
            p_restaurant_logo, p_food_gst_rate, p_service_charge_rate, p_service_charge_enabled,
            p_rounding_mode, p_currency, p_receipt_header, p_receipt_footer,
            p_selected_qr_id, p_payment_qrs, p_show_logo_on_receipt, p_show_address_on_receipt,
            p_show_gst_breakdown, p_low_stock_alerts_enabled, p_display_theme
        );
    ELSE
        UPDATE `restaurant_settings` SET
            `restaurant_name` = p_restaurant_name,
            `tagline` = p_tagline,
            `contact_number` = p_contact_number,
            `address` = p_address,
            `gstin` = p_gstin,
            `restaurant_logo` = COALESCE(p_restaurant_logo, `restaurant_logo`),
            `food_gst_rate` = p_food_gst_rate,
            `service_charge_rate` = p_service_charge_rate,
            `service_charge_enabled` = p_service_charge_enabled,
            `rounding_mode` = p_rounding_mode,
            `currency` = p_currency,
            `receipt_header` = p_receipt_header,
            `receipt_footer` = p_receipt_footer,
            `selected_qr_id` = p_selected_qr_id,
            `payment_qrs` = COALESCE(p_payment_qrs, `payment_qrs`),
            `show_logo_on_receipt` = p_show_logo_on_receipt,
            `show_address_on_receipt` = p_show_address_on_receipt,
            `show_gst_breakdown` = p_show_gst_breakdown,
            `low_stock_alerts_enabled` = p_low_stock_alerts_enabled,
            `display_theme` = p_display_theme,
            `updated_at` = NOW()
        WHERE `id` = 1;
    END IF;

    -- Update key-value settings table
    INSERT INTO `settings` (`branch_id`, `setting_key`, `setting_value`)
    VALUES (1, 'RESTAURANT_NAME', p_restaurant_name)
    ON DUPLICATE KEY UPDATE `setting_value` = p_restaurant_name;

    INSERT INTO `settings` (`branch_id`, `setting_key`, `setting_value`)
    VALUES (1, 'RESTAURANT_TAGLINE', p_tagline)
    ON DUPLICATE KEY UPDATE `setting_value` = p_tagline;

    INSERT INTO `settings` (`branch_id`, `setting_key`, `setting_value`)
    VALUES (1, 'CONTACT_NUMBER', p_contact_number)
    ON DUPLICATE KEY UPDATE `setting_value` = p_contact_number;

    INSERT INTO `settings` (`branch_id`, `setting_key`, `setting_value`)
    VALUES (1, 'GSTIN', p_gstin)
    ON DUPLICATE KEY UPDATE `setting_value` = p_gstin;

    IF p_food_gst_rate IS NOT NULL THEN
        INSERT INTO `settings` (`branch_id`, `setting_key`, `setting_value`)
        VALUES (1, 'DEFAULT_GST_RATE', CAST(p_food_gst_rate AS CHAR))
        ON DUPLICATE KEY UPDATE `setting_value` = CAST(p_food_gst_rate AS CHAR);
    END IF;

    IF p_service_charge_rate IS NOT NULL THEN
        INSERT INTO `settings` (`branch_id`, `setting_key`, `setting_value`)
        VALUES (1, 'SERVICE_CHARGE_PERCENTAGE', CAST(p_service_charge_rate AS CHAR))
        ON DUPLICATE KEY UPDATE `setting_value` = CAST(p_service_charge_rate AS CHAR);
    END IF;

    -- Update branch name in branches table if branch 1 exists
    UPDATE `branches` SET
        `branch_name` = p_restaurant_name,
        `phone` = COALESCE(p_contact_number, `phone`),
        `gstin_number` = COALESCE(p_gstin, `gstin_number`)
    WHERE `branch_id` = 1;

    -- Return the updated settings row
    CALL `sp_get_restaurant_settings`();
END //

DELIMITER ;
