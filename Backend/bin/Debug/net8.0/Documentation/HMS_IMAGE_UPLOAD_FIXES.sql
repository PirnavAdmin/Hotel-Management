-- =====================================================================================
-- HOTEL MANAGEMENT SYSTEM (HMS) - IMAGE UPLOAD & NULL image_url FIX SCRIPT
-- Target Database: MySQL (hotel_management_db_test / hotel_management_db)
-- Description:
--   1. Ensures menu_items.image_url column supports up to 500 characters.
--   2. Updates sp_CreateMenuItem to properly store image_url (converting blanks to NULL).
--   3. Updates sp_UpdateMenuItem to PRESERVE existing images when editing other fields
--      without uploading a new image (prevents accidental NULL overwrite).
-- =====================================================================================

USE `hotel_management_db_test`;

-- 1. Ensure column width accommodates image paths
ALTER TABLE `menu_items` 
MODIFY COLUMN `image_url` VARCHAR(500) NULL DEFAULT NULL;

-- 2. Update sp_CreateMenuItem
DROP PROCEDURE IF EXISTS `sp_CreateMenuItem`;
DELIMITER //
CREATE PROCEDURE `sp_CreateMenuItem`(
    IN p_dish_name VARCHAR(150),
    IN p_category VARCHAR(100),
    IN p_price DECIMAL(18,2),
    IN p_dietary_type VARCHAR(20),
    IN p_spice_level INT,
    IN p_prep_time_minutes INT,
    IN p_short_description VARCHAR(500),
    IN p_image_url VARCHAR(500),
    IN p_is_chefs_special TINYINT(1),
    IN p_is_available TINYINT(1)
)
BEGIN
    INSERT INTO `menu_items` (
        dish_name, category, price, dietary_type, spice_level, 
        prep_time_minutes, short_description, image_url, 
        is_chefs_special, is_available, created_at, updated_at
    )
    VALUES (
        p_dish_name, p_category, p_price, p_dietary_type, p_spice_level, 
        p_prep_time_minutes, p_short_description, NULLIF(TRIM(p_image_url), ''), 
        p_is_chefs_special, p_is_available, NOW(), NOW()
    );
    
    SELECT LAST_INSERT_ID() AS menu_item_id;
END //
DELIMITER ;

-- 3. Update sp_UpdateMenuItem (with existing image retention logic)
DROP PROCEDURE IF EXISTS `sp_UpdateMenuItem`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateMenuItem`(
    IN p_menu_item_id BIGINT,
    IN p_dish_name VARCHAR(150),
    IN p_category VARCHAR(100),
    IN p_price DECIMAL(18,2),
    IN p_dietary_type VARCHAR(20),
    IN p_spice_level INT,
    IN p_prep_time_minutes INT,
    IN p_short_description VARCHAR(500),
    IN p_image_url VARCHAR(500),
    IN p_is_chefs_special TINYINT(1),
    IN p_is_available TINYINT(1)
)
BEGIN
    UPDATE `menu_items`
    SET dish_name = p_dish_name,
        category = p_category,
        price = p_price,
        dietary_type = p_dietary_type,
        spice_level = p_spice_level,
        prep_time_minutes = p_prep_time_minutes,
        short_description = p_short_description,
        -- Retain existing image_url if new p_image_url is NULL or blank
        image_url = CASE 
            WHEN p_image_url IS NOT NULL AND TRIM(p_image_url) != '' THEN TRIM(p_image_url) 
            ELSE image_url 
        END,
        is_chefs_special = p_is_chefs_special,
        is_available = p_is_available,
        updated_at = NOW()
    WHERE menu_item_id = p_menu_item_id AND deleted_at IS NULL;
END //
DELIMITER ;

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================
-- Check table column:
DESCRIBE `menu_items`;

-- Check recent items and their image_url:
SELECT menu_item_id, dish_name, category, price, image_url, updated_at 
FROM `menu_items` 
ORDER BY menu_item_id DESC 
LIMIT 10;
