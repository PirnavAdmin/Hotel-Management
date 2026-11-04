-- ============================================================================
-- HMS (Hotel Management System) - Specials API Database Procedures
-- ============================================================================
-- Database: hotel_management_db_test (or production DB)
-- Description: Stored procedures for managing and retrieving Chef's Specials.
-- Reuses existing column: `menu_items.is_chefs_special` TINYINT(1) DEFAULT 0
-- ============================================================================

USE `hotel_management_db_test`;

-- 1. Procedure to toggle or update a menu item's Chef Special status
DROP PROCEDURE IF EXISTS `sp_ToggleMenuItemSpecialStatus`;
DELIMITER //
CREATE PROCEDURE `sp_ToggleMenuItemSpecialStatus`(
    IN p_menu_item_id BIGINT,
    IN p_is_chefs_special TINYINT(1)
)
BEGIN
    UPDATE `menu_items`
    SET is_chefs_special = p_is_chefs_special,
        updated_at = NOW()
    WHERE menu_item_id = p_menu_item_id
      AND deleted_at IS NULL;
END //
DELIMITER ;

-- 2. Procedure to retrieve active Chef's Special menu items with optional category & branch filter
DROP PROCEDURE IF EXISTS `sp_GetSpecialMenuItems`;
DELIMITER //
CREATE PROCEDURE `sp_GetSpecialMenuItems`(
    IN p_category VARCHAR(100),
    IN p_branch_id BIGINT
)
BEGIN
    SELECT menu_item_id, dish_name, category, price, dietary_type, spice_level,
           prep_time_minutes, short_description, image_url, is_chefs_special, is_available,
           created_at, updated_at
    FROM `menu_items`
    WHERE deleted_at IS NULL
      AND is_chefs_special = 1
      AND is_available = 1
      AND (p_category IS NULL OR p_category = '' OR LOWER(category) = LOWER(p_category))
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    ORDER BY created_at DESC;
END //
DELIMITER ;
