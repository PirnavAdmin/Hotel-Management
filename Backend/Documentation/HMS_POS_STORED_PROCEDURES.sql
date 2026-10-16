-- ============================================================
-- HMS & POS COMPLETE STORED PROCEDURES MIGRATION SCRIPT
-- Script: HMS_POS_STORED_PROCEDURES.sql
-- Target Database: MySQL (hotel_management_db)
-- Description: Comprehensive stored procedures for all HMS & POS modules.
-- ============================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET collation_connection = utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 1. USERS & AUTH PROCEDURES
-- ------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetUsers`;
CREATE PROCEDURE `sp_GetUsers`()
BEGIN
    SELECT u.user_id, u.role_id, u.branch_id, u.user_name, u.password, u.password_hash,
           u.full_name, u.email, u.phone, u.pin_code, u.is_active, u.last_login,
           u.created_at, u.updated_at,
           r.role_name, r.description AS role_description
    FROM `users` u
    LEFT JOIN `roles` r ON u.role_id = r.role_id
    WHERE u.deleted_at IS NULL
    ORDER BY u.created_at DESC;
END;

DROP PROCEDURE IF EXISTS `sp_GetUserByIdentifier`;
CREATE PROCEDURE `sp_GetUserByIdentifier`(IN p_identifier VARCHAR(100))
BEGIN
    SELECT u.user_id, u.role_id, u.branch_id, u.user_name, u.password, u.password_hash,
           u.full_name, u.email, u.phone, u.pin_code, u.is_active, u.last_login,
           u.created_at, u.updated_at,
           r.role_name, r.description AS role_description
    FROM `users` u
    LEFT JOIN `roles` r ON u.role_id = r.role_id
    WHERE u.deleted_at IS NULL
      AND (
            CAST(u.user_id AS CHAR) = p_identifier
            OR LOWER(u.user_name) = LOWER(p_identifier)
            OR LOWER(u.email) = LOWER(p_identifier)
          )
    LIMIT 1;
END;

DROP PROCEDURE IF EXISTS `sp_GetUserByUsernameOrEmail`;
CREATE PROCEDURE `sp_GetUserByUsernameOrEmail`(IN p_login_value VARCHAR(100))
BEGIN
    SELECT u.user_id, u.role_id, u.branch_id, u.user_name, u.password, u.password_hash,
           u.full_name, u.email, u.phone, u.pin_code, u.is_active, u.last_login,
           u.created_at, u.updated_at,
           r.role_id, r.role_name, r.is_active AS role_is_active, r.deleted_at AS role_deleted_at
    FROM `users` u
    LEFT JOIN `roles` r ON u.role_id = r.role_id
    WHERE u.deleted_at IS NULL
      AND (LOWER(TRIM(u.user_name)) = LOWER(TRIM(p_login_value)) OR LOWER(TRIM(u.email)) = LOWER(TRIM(p_login_value)))
    LIMIT 1;
END;

DROP PROCEDURE IF EXISTS `sp_CheckUsernameExists`;
CREATE PROCEDURE `sp_CheckUsernameExists`(IN p_username VARCHAR(60))
BEGIN
    SELECT COUNT(1) AS user_count
    FROM `users`
    WHERE LOWER(user_name) = LOWER(p_username) AND deleted_at IS NULL;
END;

DROP PROCEDURE IF EXISTS `sp_CheckEmailExists`;
CREATE PROCEDURE `sp_CheckEmailExists`(IN p_email VARCHAR(100))
BEGIN
    SELECT COUNT(1) AS user_count
    FROM `users`
    WHERE LOWER(email) = LOWER(p_email) AND deleted_at IS NULL;
END;

DROP PROCEDURE IF EXISTS `sp_CreateUser`;
CREATE PROCEDURE `sp_CreateUser`(
    IN p_role_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_user_name VARCHAR(60),
    IN p_password VARCHAR(255),
    IN p_password_hash VARCHAR(255),
    IN p_full_name VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_pin_code VARCHAR(10)
)
BEGIN
    INSERT INTO `users` (role_id, branch_id, user_name, password, password_hash, full_name, email, phone, pin_code, is_active, created_at, updated_at)
    VALUES (p_role_id, p_branch_id, p_user_name, p_password, p_password_hash, p_full_name, p_email, p_phone, p_pin_code, 1, NOW(), NOW());
    SELECT LAST_INSERT_ID() AS user_id;
END;

DROP PROCEDURE IF EXISTS `sp_UpdateUserPassword`;
CREATE PROCEDURE `sp_UpdateUserPassword`(
    IN p_user_id BIGINT,
    IN p_password VARCHAR(255),
    IN p_password_hash VARCHAR(255)
)
BEGIN
    UPDATE `users`
    SET password = p_password,
        confirm_password = p_password,
        password_hash = p_password_hash,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;

DROP PROCEDURE IF EXISTS `sp_DeleteUser`;
CREATE PROCEDURE `sp_DeleteUser`(IN p_user_id BIGINT)
BEGIN
    UPDATE `users`
    SET deleted_at = NOW(),
        is_active = 0,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;

DROP PROCEDURE IF EXISTS `sp_UpdateUserLastLogin`;
CREATE PROCEDURE `sp_UpdateUserLastLogin`(IN p_user_id BIGINT)
BEGIN
    UPDATE `users`
    SET last_login = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;

DROP PROCEDURE IF EXISTS `sp_GetLoginManagementSummary`;
CREATE PROCEDURE `sp_GetLoginManagementSummary`()
BEGIN
    SELECT u.user_id, u.role_id, u.branch_id, u.user_name, u.full_name, u.email, u.phone,
           u.is_active, u.created_at, u.last_login,
           r.role_name
    FROM `users` u
    LEFT JOIN `roles` r ON u.role_id = r.role_id
    WHERE u.deleted_at IS NULL
    ORDER BY u.created_at DESC;
END;

-- ------------------------------------------------------------
-- 2. PASSWORD RESET TOKENS PROCEDURES
-- ------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_InvalidatePreviousPasswordResetTokens`;
CREATE PROCEDURE `sp_InvalidatePreviousPasswordResetTokens`(IN p_user_id BIGINT)
BEGIN
    UPDATE `password_reset_tokens`
    SET used_at = NOW()
    WHERE user_id = p_user_id AND used_at IS NULL;
END;

DROP PROCEDURE IF EXISTS `sp_CreatePasswordResetToken`;
CREATE PROCEDURE `sp_CreatePasswordResetToken`(
    IN p_user_id BIGINT,
    IN p_otp_hash VARCHAR(255),
    IN p_expires_at DATETIME
)
BEGIN
    INSERT INTO `password_reset_tokens` (user_id, otp_hash, expires_at, attempts, created_at)
    VALUES (p_user_id, p_otp_hash, p_expires_at, 0, NOW());
    SELECT LAST_INSERT_ID() AS reset_id;
END;

DROP PROCEDURE IF EXISTS `sp_GetActivePasswordResetToken`;
CREATE PROCEDURE `sp_GetActivePasswordResetToken`(IN p_user_id BIGINT)
BEGIN
    SELECT reset_id, user_id, otp_hash, expires_at, verified_at, used_at, attempts, created_at
    FROM `password_reset_tokens`
    WHERE user_id = p_user_id AND used_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;
END;

DROP PROCEDURE IF EXISTS `sp_IncrementPasswordResetAttempts`;
CREATE PROCEDURE `sp_IncrementPasswordResetAttempts`(IN p_reset_id BIGINT)
BEGIN
    UPDATE `password_reset_tokens`
    SET attempts = attempts + 1
    WHERE reset_id = p_reset_id;
END;

DROP PROCEDURE IF EXISTS `sp_VerifyPasswordResetToken`;
CREATE PROCEDURE `sp_VerifyPasswordResetToken`(IN p_reset_id BIGINT)
BEGIN
    UPDATE `password_reset_tokens`
    SET verified_at = NOW()
    WHERE reset_id = p_reset_id;
END;

-- ------------------------------------------------------------
-- 3. ROLES PROCEDURES
-- ------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetAllRoles`;
CREATE PROCEDURE `sp_GetAllRoles`()
BEGIN
    SELECT role_id, role_name, description, is_active, created_at, updated_at
    FROM `roles`
    WHERE is_active = 1 AND deleted_at IS NULL
    ORDER BY role_id;
END;

DROP PROCEDURE IF EXISTS `sp_GetRoleById`;
CREATE PROCEDURE `sp_GetRoleById`(IN p_role_id BIGINT)
BEGIN
    SELECT role_id, role_name, description, is_active
    FROM `roles`
    WHERE role_id = p_role_id AND deleted_at IS NULL;
END;

DROP PROCEDURE IF EXISTS `sp_GetRoleByName`;
CREATE PROCEDURE `sp_GetRoleByName`(IN p_role_name VARCHAR(50))
BEGIN
    SELECT role_id, role_name, description, is_active
    FROM `roles`
    WHERE LOWER(role_name) = LOWER(p_role_name) AND is_active = 1 AND deleted_at IS NULL
    LIMIT 1;
END;

-- ------------------------------------------------------------
-- 4. MENU ITEMS & CATEGORIES PROCEDURES
-- ------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetMenuItems`;
CREATE PROCEDURE `sp_GetMenuItems`(
    IN p_search VARCHAR(100),
    IN p_category VARCHAR(100),
    IN p_dietary_type VARCHAR(20)
)
BEGIN
    SELECT menu_item_id, dish_name, category, price, dietary_type, spice_level,
           prep_time_minutes, short_description, image_url, is_chefs_special, is_available,
           created_at, updated_at
    FROM `menu_items`
    WHERE deleted_at IS NULL
      AND (p_search IS NULL OR p_search = '' OR LOWER(dish_name) LIKE CONCAT('%', LOWER(p_search), '%') OR LOWER(category) LIKE CONCAT('%', LOWER(p_search), '%'))
      AND (p_category IS NULL OR p_category = '' OR LOWER(category) = LOWER(p_category))
      AND (p_dietary_type IS NULL OR p_dietary_type = '' OR LOWER(dietary_type) = LOWER(p_dietary_type))
    ORDER BY created_at DESC;
END;

DROP PROCEDURE IF EXISTS `sp_GetMenuItemById`;
CREATE PROCEDURE `sp_GetMenuItemById`(IN p_menu_item_id BIGINT)
BEGIN
    SELECT menu_item_id, dish_name, category, price, dietary_type, spice_level,
           prep_time_minutes, short_description, image_url, is_chefs_special, is_available,
           created_at, updated_at
    FROM `menu_items`
    WHERE menu_item_id = p_menu_item_id AND deleted_at IS NULL;
END;

DROP PROCEDURE IF EXISTS `sp_CreateMenuItem`;
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
    INSERT INTO `menu_items` (dish_name, category, price, dietary_type, spice_level, prep_time_minutes, short_description, image_url, is_chefs_special, is_available, created_at, updated_at)
    VALUES (p_dish_name, p_category, p_price, p_dietary_type, p_spice_level, p_prep_time_minutes, p_short_description, NULLIF(TRIM(p_image_url), ''), p_is_chefs_special, p_is_available, NOW(), NOW());
    SELECT LAST_INSERT_ID() AS menu_item_id;
END;

DROP PROCEDURE IF EXISTS `sp_UpdateMenuItem`;
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
        image_url = CASE 
            WHEN p_image_url IS NOT NULL AND TRIM(p_image_url) != '' THEN TRIM(p_image_url) 
            ELSE image_url 
        END,
        is_chefs_special = p_is_chefs_special,
        is_available = p_is_available,
        updated_at = NOW()
    WHERE menu_item_id = p_menu_item_id AND deleted_at IS NULL;
END;

DROP PROCEDURE IF EXISTS `sp_DeleteMenuItem`;
CREATE PROCEDURE `sp_DeleteMenuItem`(IN p_menu_item_id BIGINT)
BEGIN
    UPDATE `menu_items`
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE menu_item_id = p_menu_item_id;
END;

DROP PROCEDURE IF EXISTS `sp_ToggleMenuItemAvailability`;
CREATE PROCEDURE `sp_ToggleMenuItemAvailability`(
    IN p_menu_item_id BIGINT,
    IN p_is_available TINYINT(1)
)
BEGIN
    UPDATE `menu_items`
    SET is_available = p_is_available, updated_at = NOW()
    WHERE menu_item_id = p_menu_item_id AND deleted_at IS NULL;
END;

DROP PROCEDURE IF EXISTS `sp_ToggleMenuItemSpecialStatus`;
CREATE PROCEDURE `sp_ToggleMenuItemSpecialStatus`(
    IN p_menu_item_id BIGINT,
    IN p_is_chefs_special TINYINT(1)
)
BEGIN
    UPDATE `menu_items`
    SET is_chefs_special = p_is_chefs_special, updated_at = NOW()
    WHERE menu_item_id = p_menu_item_id AND deleted_at IS NULL;
END;

DROP PROCEDURE IF EXISTS `sp_GetSpecialMenuItems`;
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
END;

DROP PROCEDURE IF EXISTS `sp_GetMenuCategories`;
CREATE PROCEDURE `sp_GetMenuCategories`()
BEGIN
    SELECT DISTINCT category AS name FROM `menu_items` WHERE deleted_at IS NULL ORDER BY category;
END;

DROP PROCEDURE IF EXISTS `sp_CreateMenuCategory`;
CREATE PROCEDURE `sp_CreateMenuCategory`(
    IN p_id CHAR(36),
    IN p_name VARCHAR(100),
    IN p_display_order INT
)
BEGIN
    INSERT INTO `menu_categories` (id, name, display_order)
    VALUES (p_id, p_name, p_display_order);
END;

-- ------------------------------------------------------------
-- 5. STAFF PROCEDURES
-- ------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetStaffList`;
CREATE PROCEDURE `sp_GetStaffList`()
BEGIN
    SELECT s.staff_id, s.full_name, s.role_title, s.phone, s.shift, s.is_active, s.created_at,
           COUNT(t.table_id) AS assigned_tables_count
    FROM `staff_persons` s
    LEFT JOIN `restaurant_tables` t ON t.assigned_server_id = s.staff_id AND t.deleted_at IS NULL
    WHERE s.deleted_at IS NULL
    GROUP BY s.staff_id
    ORDER BY s.staff_id;
END;

DROP PROCEDURE IF EXISTS `sp_GetStaffById`;
CREATE PROCEDURE `sp_GetStaffById`(IN p_staff_id BIGINT)
BEGIN
    SELECT s.staff_id, s.full_name, s.role_title, s.phone, s.shift, s.is_active, s.created_at,
           COUNT(t.table_id) AS assigned_tables_count
    FROM `staff_persons` s
    LEFT JOIN `restaurant_tables` t ON t.assigned_server_id = s.staff_id AND t.deleted_at IS NULL
    WHERE s.staff_id = p_staff_id AND s.deleted_at IS NULL
    GROUP BY s.staff_id;
END;

DROP PROCEDURE IF EXISTS `sp_CreateStaff`;
CREATE PROCEDURE `sp_CreateStaff`(
    IN p_full_name VARCHAR(100),
    IN p_role_title VARCHAR(50),
    IN p_phone VARCHAR(20),
    IN p_shift VARCHAR(50),
    IN p_is_active TINYINT(1)
)
BEGIN
    INSERT INTO `staff_persons` (full_name, role_title, phone, shift, is_active, created_at, updated_at)
    VALUES (p_full_name, p_role_title, p_phone, p_shift, p_is_active, NOW(), NOW());
    SELECT LAST_INSERT_ID() AS staff_id;
END;

DROP PROCEDURE IF EXISTS `sp_UpdateStaff`;
CREATE PROCEDURE `sp_UpdateStaff`(
    IN p_staff_id BIGINT,
    IN p_full_name VARCHAR(100),
    IN p_role_title VARCHAR(50),
    IN p_phone VARCHAR(20),
    IN p_shift VARCHAR(50),
    IN p_is_active TINYINT(1)
)
BEGIN
    UPDATE `staff_persons`
    SET full_name = p_full_name,
        role_title = p_role_title,
        phone = p_phone,
        shift = p_shift,
        is_active = p_is_active,
        updated_at = NOW()
    WHERE staff_id = p_staff_id AND deleted_at IS NULL;
END;

DROP PROCEDURE IF EXISTS `sp_DeleteStaff`;
CREATE PROCEDURE `sp_DeleteStaff`(IN p_staff_id BIGINT)
BEGIN
    UPDATE `staff_persons` SET deleted_at = NOW(), updated_at = NOW() WHERE staff_id = p_staff_id;
    UPDATE `restaurant_tables` SET assigned_server_id = NULL WHERE assigned_server_id = p_staff_id;
END;

-- ------------------------------------------------------------
-- 6. TABLES PROCEDURES
-- ------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTables`;
CREATE PROCEDURE `sp_GetTables`(
    IN p_section VARCHAR(50),
    IN p_status VARCHAR(50)
)
BEGIN
    SELECT t.table_id, t.table_name, t.section_area, t.capacity_chairs, t.occupied_chairs, t.status,
           t.assigned_server_id, t.created_at,
           s.full_name AS server_name, s.role_title AS server_role
    FROM `restaurant_tables` t
    LEFT JOIN `staff_persons` s ON t.assigned_server_id = s.staff_id
    WHERE t.deleted_at IS NULL
      AND (p_section IS NULL OR p_section = '' OR LOWER(t.section_area) = LOWER(p_section))
      AND (p_status IS NULL OR p_status = '' OR UPPER(t.status) = UPPER(p_status))
    ORDER BY t.table_id;
END;

DROP PROCEDURE IF EXISTS `sp_GetTableSummary`;
CREATE PROCEDURE `sp_GetTableSummary`()
BEGIN
    SELECT COUNT(1) AS total_tables,
           COALESCE(SUM(capacity_chairs), 0) AS total_chairs,
           COALESCE(SUM(occupied_chairs), 0) AS occupied_chairs
    FROM `restaurant_tables`
    WHERE deleted_at IS NULL;
END;

DROP PROCEDURE IF EXISTS `sp_GetTableById`;
CREATE PROCEDURE `sp_GetTableById`(IN p_table_id BIGINT)
BEGIN
    SELECT t.table_id, t.table_name, t.section_area, t.capacity_chairs, t.occupied_chairs, t.status,
           t.assigned_server_id, t.created_at,
           s.full_name AS server_name, s.role_title AS server_role
    FROM `restaurant_tables` t
    LEFT JOIN `staff_persons` s ON t.assigned_server_id = s.staff_id
    WHERE t.table_id = p_table_id AND t.deleted_at IS NULL;
END;

DROP PROCEDURE IF EXISTS `sp_CreateTable`;
CREATE PROCEDURE `sp_CreateTable`(
    IN p_table_name VARCHAR(50),
    IN p_section_area VARCHAR(50),
    IN p_capacity_chairs INT,
    IN p_assigned_server_id BIGINT
)
BEGIN
    INSERT INTO `restaurant_tables` (table_name, section_area, capacity_chairs, occupied_chairs, status, assigned_server_id, created_at, updated_at)
    VALUES (p_table_name, p_section_area, p_capacity_chairs, 0, 'VACANT', p_assigned_server_id, NOW(), NOW());
    SELECT LAST_INSERT_ID() AS table_id;
END;

DROP PROCEDURE IF EXISTS `sp_UpdateTable`;
CREATE PROCEDURE `sp_UpdateTable`(
    IN p_table_id BIGINT,
    IN p_table_name VARCHAR(50),
    IN p_section_area VARCHAR(50),
    IN p_capacity_chairs INT,
    IN p_occupied_chairs INT,
    IN p_status VARCHAR(50),
    IN p_assigned_server_id BIGINT
)
BEGIN
    UPDATE `restaurant_tables`
    SET table_name = p_table_name,
        section_area = p_section_area,
        capacity_chairs = p_capacity_chairs,
        occupied_chairs = p_occupied_chairs,
        status = UPPER(p_status),
        assigned_server_id = p_assigned_server_id,
        updated_at = NOW()
    WHERE table_id = p_table_id AND deleted_at IS NULL;
END;

DROP PROCEDURE IF EXISTS `sp_DeleteTable`;
CREATE PROCEDURE `sp_DeleteTable`(IN p_table_id BIGINT)
BEGIN
    UPDATE `restaurant_tables` SET deleted_at = NOW(), updated_at = NOW() WHERE table_id = p_table_id;
END;

DROP PROCEDURE IF EXISTS `sp_TransferTable`;
CREATE PROCEDURE `sp_TransferTable`(
    IN p_source_table_id BIGINT,
    IN p_target_table_id BIGINT
)
BEGIN
    DECLARE v_target_name VARCHAR(50);
    DECLARE v_target_section VARCHAR(50);
    DECLARE v_source_occupied INT DEFAULT 0;
    DECLARE v_target_status VARCHAR(20) DEFAULT 'VACANT';

    -- Check source table
    SELECT table_name, section_area, IFNULL(occupied_chairs, 1) 
    INTO v_target_name, v_target_section, v_source_occupied
    FROM `restaurant_tables` 
    WHERE table_id = p_source_table_id AND deleted_at IS NULL;

    -- Check target table
    SELECT status, table_name, section_area
    INTO v_target_status, v_target_name, v_target_section
    FROM `restaurant_tables`
    WHERE table_id = p_target_table_id AND deleted_at IS NULL;

    IF v_target_name IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target table not found.';
    END IF;

    IF UPPER(IFNULL(v_target_status, 'VACANT')) = 'OCCUPIED' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target table already has an active order.';
    END IF;

    -- Transfer active restaurant_orders if any
    UPDATE `restaurant_orders`
    SET dining_table_id = p_target_table_id, updated_at = NOW()
    WHERE dining_table_id = p_source_table_id AND is_deleted = 0 AND UPPER(order_status) = 'ACTIVE';

    -- Transfer active kot_orders if any
    UPDATE `kot_orders`
    SET table_id = p_target_table_id, table_name = v_target_name, section_area = v_target_section, updated_at = NOW()
    WHERE table_id = p_source_table_id AND deleted_at IS NULL AND UPPER(order_status) NOT IN ('COMPLETED', 'CANCELLED');

    -- Update tables status
    UPDATE `restaurant_tables` 
    SET status = 'VACANT', occupied_chairs = 0, updated_at = NOW() 
    WHERE table_id = p_source_table_id;

    UPDATE `restaurant_tables` 
    SET status = 'OCCUPIED', occupied_chairs = GREATEST(1, v_source_occupied), updated_at = NOW() 
    WHERE table_id = p_target_table_id;
END;

-- ------------------------------------------------------------
-- 7. KITCHEN ORDER TICKETS (KOT) PROCEDURES
-- ------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetActiveKotOrders`;
CREATE PROCEDURE `sp_GetActiveKotOrders`(
    IN p_table_id BIGINT,
    IN p_status VARCHAR(30)
)
BEGIN
    SELECT order_id, table_id, table_name, section_area, server_name, order_status, order_received_at, created_at, updated_at
    FROM `kot_orders`
    WHERE deleted_at IS NULL
      AND (p_table_id IS NULL OR p_table_id = 0 OR table_id = p_table_id)
      AND (p_status IS NULL OR p_status = '' OR UPPER(order_status) = UPPER(p_status))
    ORDER BY order_received_at DESC;

    SELECT order_item_id AS item_id, order_id, menu_item_id, dish_name, quantity, item_status
    FROM `kot_order_items`
    WHERE order_id IN (
        SELECT order_id FROM `kot_orders`
        WHERE deleted_at IS NULL
          AND (p_table_id IS NULL OR p_table_id = 0 OR table_id = p_table_id)
          AND (p_status IS NULL OR p_status = '' OR UPPER(order_status) = UPPER(p_status))
    );
END;

DROP PROCEDURE IF EXISTS `sp_GetKotOrderById`;
CREATE PROCEDURE `sp_GetKotOrderById`(IN p_order_id BIGINT)
BEGIN
    SELECT order_id, table_id, table_name, section_area, server_name, order_status, order_received_at, created_at, updated_at
    FROM `kot_orders`
    WHERE order_id = p_order_id AND deleted_at IS NULL;

    SELECT order_item_id AS item_id, order_id, menu_item_id, dish_name, quantity, item_status
    FROM `kot_order_items`
    WHERE order_id = p_order_id;
END;

DROP PROCEDURE IF EXISTS `sp_CreateKotOrder`;
CREATE PROCEDURE `sp_CreateKotOrder`(
    IN p_table_id BIGINT,
    IN p_table_name VARCHAR(50),
    IN p_section_area VARCHAR(50),
    IN p_server_name VARCHAR(100),
    IN p_order_status VARCHAR(30)
)
BEGIN
    INSERT INTO `kot_orders` (table_id, table_name, section_area, server_name, order_status, order_received_at, created_at, updated_at)
    VALUES (p_table_id, p_table_name, p_section_area, p_server_name, p_order_status, NOW(), NOW(), NOW());
    SELECT LAST_INSERT_ID() AS order_id;
END;

DROP PROCEDURE IF EXISTS `sp_CreateKotOrderItem`;
CREATE PROCEDURE `sp_CreateKotOrderItem`(
    IN p_order_id BIGINT,
    IN p_menu_item_id BIGINT,
    IN p_dish_name VARCHAR(150),
    IN p_quantity INT,
    IN p_item_status VARCHAR(30)
)
BEGIN
    INSERT INTO `kot_order_items` (order_id, menu_item_id, dish_name, quantity, item_status, created_at, updated_at)
    VALUES (p_order_id, p_menu_item_id, p_dish_name, p_quantity, p_item_status, NOW(), NOW());
END;

DROP PROCEDURE IF EXISTS `sp_UpdateKotOrderStatus`;
CREATE PROCEDURE `sp_UpdateKotOrderStatus`(
    IN p_order_id BIGINT,
    IN p_status VARCHAR(30)
)
BEGIN
    UPDATE `kot_orders`
    SET order_status = UPPER(p_status), updated_at = NOW()
    WHERE order_id = p_order_id AND deleted_at IS NULL;

    IF UPPER(p_status) = 'PREPARATION COMPLETED' OR UPPER(p_status) = 'READY' THEN
        UPDATE `kot_order_items`
        SET item_status = 'READY', updated_at = NOW()
        WHERE order_id = p_order_id;
    END IF;
END;

DROP PROCEDURE IF EXISTS `sp_UpdateKotItemStatus`;
CREATE PROCEDURE `sp_UpdateKotItemStatus`(
    IN p_order_id BIGINT,
    IN p_item_id BIGINT,
    IN p_status VARCHAR(30)
)
BEGIN
    UPDATE `kot_order_items`
    SET item_status = UPPER(p_status), updated_at = NOW()
    WHERE order_id = p_order_id AND (order_item_id = p_item_id OR menu_item_id = p_item_id);
END;

DROP PROCEDURE IF EXISTS `sp_DeleteKotOrder`;
CREATE PROCEDURE `sp_DeleteKotOrder`(IN p_order_id BIGINT)
BEGIN
    UPDATE `kot_orders` SET deleted_at = NOW(), order_status = 'CANCELLED', updated_at = NOW() WHERE order_id = p_order_id;
END;

DROP PROCEDURE IF EXISTS `sp_GetKotSummary`;
CREATE PROCEDURE `sp_GetKotSummary`()
BEGIN
    SELECT COUNT(1) AS total_tickets,
           SUM(CASE WHEN UPPER(order_status) = 'PENDING' THEN 1 ELSE 0 END) AS pending_tickets,
           SUM(CASE WHEN UPPER(order_status) = 'IN PREPARATION' THEN 1 ELSE 0 END) AS in_prep_tickets,
           SUM(CASE WHEN UPPER(order_status) IN ('PREPARATION COMPLETED', 'READY') THEN 1 ELSE 0 END) AS ready_tickets,
           SUM(CASE WHEN deleted_at IS NOT NULL OR UPPER(order_status) = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_tickets
    FROM `kot_orders`;
END;

-- ------------------------------------------------------------
-- 8. ORDERS & INVOICES PROCEDURES
-- ------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetInvoices`;
CREATE PROCEDURE `sp_GetInvoices`(IN p_status VARCHAR(20))
BEGIN
    SELECT invoice_id, order_id, invoice_number, subtotal, taxable_amount, tax_amount, discount_amount, total_amount, paid_amount, status, created_at, updated_at
    FROM `invoices`
    WHERE (p_status IS NULL OR p_status = '' OR UPPER(status) = UPPER(p_status))
    ORDER BY created_at DESC;

    SELECT payment_id, invoice_id, amount, payment_mode, transaction_reference, paid_at
    FROM `invoice_payments`
    WHERE invoice_id IN (
        SELECT invoice_id FROM `invoices` WHERE (p_status IS NULL OR p_status = '' OR UPPER(status) = UPPER(p_status))
    );
END;

DROP PROCEDURE IF EXISTS `sp_GetInvoiceById`;
CREATE PROCEDURE `sp_GetInvoiceById`(IN p_invoice_id BIGINT)
BEGIN
    SELECT invoice_id, order_id, invoice_number, subtotal, taxable_amount, tax_amount, discount_amount, total_amount, paid_amount, status, created_at, updated_at
    FROM `invoices`
    WHERE invoice_id = p_invoice_id;

    SELECT payment_id, invoice_id, amount, payment_mode, transaction_reference, paid_at
    FROM `invoice_payments`
    WHERE invoice_id = p_invoice_id;
END;

DROP PROCEDURE IF EXISTS `sp_CreateInvoice`;
CREATE PROCEDURE `sp_CreateInvoice`(
    IN p_order_id BIGINT,
    IN p_invoice_number VARCHAR(50),
    IN p_subtotal DECIMAL(18,2),
    IN p_taxable_amount DECIMAL(18,2),
    IN p_tax_amount DECIMAL(18,2),
    IN p_discount_amount DECIMAL(18,2),
    IN p_total_amount DECIMAL(18,2)
)
BEGIN
    INSERT INTO `invoices` (order_id, invoice_number, subtotal, taxable_amount, tax_amount, discount_amount, total_amount, paid_amount, status, created_at, updated_at)
    VALUES (p_order_id, p_invoice_number, p_subtotal, p_taxable_amount, p_tax_amount, p_discount_amount, p_total_amount, 0.00, 'UNPAID', NOW(), NOW());
    SELECT LAST_INSERT_ID() AS invoice_id;
END;

DROP PROCEDURE IF EXISTS `sp_RecordInvoicePayment`;
CREATE PROCEDURE `sp_RecordInvoicePayment`(
    IN p_invoice_id BIGINT,
    IN p_amount DECIMAL(18,2),
    IN p_payment_mode VARCHAR(30),
    IN p_transaction_reference VARCHAR(100)
)
BEGIN
    DECLARE v_paid DECIMAL(18,2);
    DECLARE v_total DECIMAL(18,2);
    DECLARE v_status VARCHAR(20);
    DECLARE v_method VARCHAR(20);

    SET v_method = LOWER(TRIM(p_payment_mode));
    IF v_method NOT IN ('cash', 'card', 'upi', 'net_banking', 'wallet', 'other') THEN
        SET v_method = 'cash';
    END IF;

    INSERT INTO `invoice_payments` (
        invoice_id, amount, amount_paid, payment_mode, payment_method, transaction_reference, txn_reference, paid_at
    )
    VALUES (
        p_invoice_id, p_amount, p_amount, UPPER(p_payment_mode), v_method, p_transaction_reference, p_transaction_reference, NOW()
    );

    SELECT paid_amount + p_amount, total_amount INTO v_paid, v_total
    FROM `invoices` WHERE invoice_id = p_invoice_id;

    IF v_paid >= v_total THEN
        SET v_status = 'PAID';
    ELSE
        SET v_status = 'PARTIAL';
    END IF;

    UPDATE `invoices`
    SET paid_amount = v_paid, amount_paid = v_paid, status = v_status, updated_at = NOW()
    WHERE invoice_id = p_invoice_id;
END;

-- ------------------------------------------------------------
-- 9. CUSTOMERS & RESERVATIONS PROCEDURES
-- ------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetCustomers`;
CREATE PROCEDURE `sp_GetCustomers`(IN p_search VARCHAR(100))
BEGIN
    SELECT customer_id, full_name, phone, email, loyalty_points, created_at, updated_at
    FROM `customers`
    WHERE (p_search IS NULL OR p_search = '' OR LOWER(full_name) LIKE CONCAT('%', LOWER(p_search), '%') OR phone LIKE CONCAT('%', p_search, '%'))
    ORDER BY created_at DESC;
END;

DROP PROCEDURE IF EXISTS `sp_GetCustomerById`;
CREATE PROCEDURE `sp_GetCustomerById`(IN p_customer_id BIGINT)
BEGIN
    SELECT customer_id, full_name, phone, email, loyalty_points, created_at, updated_at
    FROM `customers`
    WHERE customer_id = p_customer_id;
END;

DROP PROCEDURE IF EXISTS `sp_CreateCustomer`;
CREATE PROCEDURE `sp_CreateCustomer`(
    IN p_full_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_email VARCHAR(100),
    IN p_loyalty_points INT
)
BEGIN
    INSERT INTO `customers` (full_name, phone, email, loyalty_points, created_at, updated_at)
    VALUES (p_full_name, p_phone, p_email, p_loyalty_points, NOW(), NOW());
    SELECT LAST_INSERT_ID() AS customer_id;
END;

DROP PROCEDURE IF EXISTS `sp_UpdateCustomer`;
CREATE PROCEDURE `sp_UpdateCustomer`(
    IN p_customer_id BIGINT,
    IN p_full_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_email VARCHAR(100),
    IN p_loyalty_points INT
)
BEGIN
    UPDATE `customers`
    SET full_name = p_full_name, phone = p_phone, email = p_email, loyalty_points = p_loyalty_points, updated_at = NOW()
    WHERE customer_id = p_customer_id;
END;

DROP PROCEDURE IF EXISTS `sp_GetReservations`;
CREATE PROCEDURE `sp_GetReservations`(IN p_status VARCHAR(20))
BEGIN
    SELECT reservation_id, customer_id, customer_name, phone, table_id, guests_count, reservation_time, status, created_at
    FROM `reservations`
    WHERE (p_status IS NULL OR p_status = '' OR UPPER(status) = UPPER(p_status))
    ORDER BY reservation_time DESC;
END;

DROP PROCEDURE IF EXISTS `sp_CreateReservation`;
CREATE PROCEDURE `sp_CreateReservation`(
    IN p_customer_id BIGINT,
    IN p_customer_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_table_id BIGINT,
    IN p_guests_count INT,
    IN p_reservation_time DATETIME
)
BEGIN
    INSERT INTO `reservations` (customer_id, customer_name, phone, table_id, guests_count, reservation_time, status, created_at)
    VALUES (p_customer_id, p_customer_name, p_phone, p_table_id, p_guests_count, p_reservation_time, 'CONFIRMED', NOW());
    SELECT LAST_INSERT_ID() AS reservation_id;
END;

DROP PROCEDURE IF EXISTS `sp_UpdateReservationStatus`;
CREATE PROCEDURE `sp_UpdateReservationStatus`(
    IN p_reservation_id BIGINT,
    IN p_status VARCHAR(20)
)
BEGIN
    UPDATE `reservations` SET status = UPPER(p_status) WHERE reservation_id = p_reservation_id;
END;

-- ------------------------------------------------------------
-- 10. INVENTORY, SUPPLIERS, PROMOTIONS & ATTENDANCE PROCEDURES
-- ------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetIngredients`;
CREATE PROCEDURE `sp_GetIngredients`()
BEGIN
    SELECT 
        ingredient_id,
        COALESCE(NULLIF(name, ''), ingredient_name, '') AS name,
        COALESCE(category, 'General') AS category,
        COALESCE(subcategory, '') AS subcategory,
        COALESCE(supplier, 'Local Supplier') AS supplier,
        COALESCE(unit, 'KG') AS unit,
        current_stock,
        COALESCE(NULLIF(minimum_threshold, 0), reorder_level, 5.00) AS minimum_threshold,
        COALESCE(NULLIF(unit_cost, 0), cost_per_unit, 0.00) AS unit_cost,
        mrp,
        COALESCE(ingredient_code, '') AS ingredient_code,
        is_active,
        updated_at
    FROM ingredients
    WHERE deleted_at IS NULL
    ORDER BY ingredient_id ASC;
END;

DROP PROCEDURE IF EXISTS `sp_GetLowStockIngredients`;
CREATE PROCEDURE `sp_GetLowStockIngredients`()
BEGIN
    SELECT 
        ingredient_id,
        COALESCE(NULLIF(name, ''), ingredient_name) AS name,
        unit,
        current_stock,
        minimum_threshold,
        unit_cost,
        COALESCE(category, 'General') AS category,
        COALESCE(supplier, 'Local Supplier') AS supplier
    FROM ingredients
    WHERE current_stock <= minimum_threshold AND deleted_at IS NULL
    ORDER BY current_stock ASC;
END;


DROP PROCEDURE IF EXISTS `sp_CreateIngredient`;
CREATE PROCEDURE `sp_CreateIngredient`(
    IN p_name VARCHAR(150),
    IN p_category VARCHAR(100),
    IN p_subcategory VARCHAR(100),
    IN p_supplier VARCHAR(150),
    IN p_unit VARCHAR(50),
    IN p_current_stock DECIMAL(18,3),
    IN p_minimum_threshold DECIMAL(18,3),
    IN p_unit_cost DECIMAL(18,2),
    IN p_mrp DECIMAL(18,2)
)
BEGIN
    INSERT INTO `ingredients` (
        name, ingredient_name, category, subcategory, supplier, unit,
        current_stock, minimum_threshold, reorder_level, unit_cost, cost_per_unit, mrp,
        is_active, created_at, updated_at
    )
    VALUES (
        p_name, p_name, 
        IFNULL(NULLIF(TRIM(p_category), ''), 'General'),
        p_subcategory,
        IFNULL(NULLIF(TRIM(p_supplier), ''), 'Local Supplier'),
        IFNULL(NULLIF(UPPER(TRIM(p_unit)), ''), 'KG'),
        IFNULL(p_current_stock, 0.000),
        IFNULL(p_minimum_threshold, 5.000),
        IFNULL(p_minimum_threshold, 5.000),
        IFNULL(p_unit_cost, 0.00),
        IFNULL(p_unit_cost, 0.00),
        p_mrp,
        1, NOW(), NOW()
    );
    SELECT LAST_INSERT_ID() AS ingredient_id;
END;

DROP PROCEDURE IF EXISTS `sp_AdjustStock`;
CREATE PROCEDURE `sp_AdjustStock`(
    IN p_ingredient_id BIGINT,
    IN p_quantity_change DECIMAL(18,3),
    IN p_remarks VARCHAR(255)
)
BEGIN
    DECLARE v_new_stock DECIMAL(18,3);
    DECLARE v_unit_cost DECIMAL(10,2);
    DECLARE v_branch_id BIGINT;

    SELECT GREATEST(0, current_stock + p_quantity_change), IFNULL(unit_cost, 0.00), IFNULL(branch_id, 1)
    INTO v_new_stock, v_unit_cost, v_branch_id
    FROM `ingredients` WHERE ingredient_id = p_ingredient_id;

    UPDATE `ingredients`
    SET current_stock = v_new_stock, updated_at = NOW()
    WHERE ingredient_id = p_ingredient_id;

    INSERT INTO `inventory_transactions` (
        ingredient_id, branch_id, txn_type, quantity, unit_cost, balance_after, remarks, txn_date
    )
    VALUES (
        p_ingredient_id, 
        v_branch_id, 
        IF(p_quantity_change >= 0, 'purchase', 'adjustment'), 
        ABS(p_quantity_change), 
        IFNULL(v_unit_cost, 0.00), 
        v_new_stock, 
        IFNULL(p_remarks, 'Stock adjustment'), 
        NOW()
    );
END;

DROP PROCEDURE IF EXISTS `sp_GetInventoryTransactions`;
CREATE PROCEDURE `sp_GetInventoryTransactions`(IN p_limit INT)
BEGIN
    DECLARE v_limit INT DEFAULT 50;
    IF p_limit IS NOT NULL AND p_limit > 0 THEN
        SET v_limit = p_limit;
    END IF;

    SELECT 
        it.txn_id,
        it.ingredient_id,
        COALESCE(i.name, i.ingredient_name, 'Unknown') AS ingredient_name,
        it.txn_type,
        it.quantity,
        it.unit_cost,
        it.balance_after,
        it.remarks,
        it.txn_date
    FROM inventory_transactions it
    LEFT JOIN ingredients i ON it.ingredient_id = i.ingredient_id
    ORDER BY it.txn_date DESC, it.txn_id DESC
    LIMIT v_limit;
END;

DROP PROCEDURE IF EXISTS `sp_GetSuppliers`;
CREATE PROCEDURE `sp_GetSuppliers`()
BEGIN
    SELECT supplier_id, supplier_name, phone, email, address, is_active, created_at
    FROM `suppliers`
    WHERE is_active = 1
    ORDER BY supplier_name;
END;

DROP PROCEDURE IF EXISTS `sp_CreateSupplier`;
CREATE PROCEDURE `sp_CreateSupplier`(
    IN p_supplier_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_email VARCHAR(100),
    IN p_address VARCHAR(255)
)
BEGIN
    INSERT INTO `suppliers` (supplier_name, phone, email, address, is_active, created_at)
    VALUES (p_supplier_name, p_phone, p_email, p_address, 1, NOW());
    SELECT LAST_INSERT_ID() AS supplier_id;
END;

DROP PROCEDURE IF EXISTS `sp_GetPurchaseOrders`;
CREATE PROCEDURE `sp_GetPurchaseOrders`(IN p_status VARCHAR(50))
BEGIN
    SELECT po_id, supplier_id, po_number, total_amount, status, created_at, updated_at
    FROM `purchase_orders`
    WHERE (p_status IS NULL OR p_status = '' OR UPPER(status) = UPPER(p_status))
    ORDER BY created_at DESC;
END;

DROP PROCEDURE IF EXISTS `sp_CreatePurchaseOrder`;
CREATE PROCEDURE `sp_CreatePurchaseOrder`(
    IN p_supplier_id BIGINT,
    IN p_po_number VARCHAR(50),
    IN p_total_amount DECIMAL(18,2)
)
BEGIN
    INSERT INTO `purchase_orders` (supplier_id, po_number, total_amount, status, created_at, updated_at)
    VALUES (p_supplier_id, p_po_number, p_total_amount, 'PENDING', NOW(), NOW());
    SELECT LAST_INSERT_ID() AS po_id;
END;

DROP PROCEDURE IF EXISTS `sp_UpdatePoStatus`;
CREATE PROCEDURE `sp_UpdatePoStatus`(
    IN p_po_id BIGINT,
    IN p_status VARCHAR(50)
)
BEGIN
    UPDATE `purchase_orders` SET status = UPPER(p_status), updated_at = NOW() WHERE po_id = p_po_id;
END;

DROP PROCEDURE IF EXISTS `sp_GetAttendances`;
CREATE PROCEDURE `sp_GetAttendances`(IN p_staff_id BIGINT)
BEGIN
    SELECT attendance_id, staff_id, check_in, check_out, status, shift
    FROM `attendances`
    WHERE (p_staff_id IS NULL OR p_staff_id = 0 OR staff_id = p_staff_id)
    ORDER BY check_in DESC;
END;

DROP PROCEDURE IF EXISTS `sp_CheckInAttendance`;
CREATE PROCEDURE `sp_CheckInAttendance`(
    IN p_staff_id BIGINT,
    IN p_shift VARCHAR(50)
)
BEGIN
    INSERT INTO `attendances` (staff_id, check_in, status, shift)
    VALUES (p_staff_id, NOW(), 'PRESENT', p_shift);
    SELECT LAST_INSERT_ID() AS attendance_id;
END;

DROP PROCEDURE IF EXISTS `sp_CheckOutAttendance`;
CREATE PROCEDURE `sp_CheckOutAttendance`(
    IN p_attendance_id BIGINT,
    IN p_staff_id BIGINT
)
BEGIN
    UPDATE `attendances`
    SET check_out = NOW()
    WHERE (attendance_id = p_attendance_id OR (staff_id = p_staff_id AND check_out IS NULL))
    LIMIT 1;
END;

DROP PROCEDURE IF EXISTS `sp_GetPromotions`;
CREATE PROCEDURE `sp_GetPromotions`()
BEGIN
    SELECT promotion_id, code, discount_percentage, flat_discount, valid_until, is_active
    FROM `promotions`
    WHERE is_active = 1
    ORDER BY valid_until DESC;
END;

DROP PROCEDURE IF EXISTS `sp_CreatePromotion`;
CREATE PROCEDURE `sp_CreatePromotion`(
    IN p_code VARCHAR(50),
    IN p_discount_percentage DECIMAL(18,2),
    IN p_flat_discount DECIMAL(18,2),
    IN p_valid_until DATETIME
)
BEGIN
    INSERT INTO `promotions` (code, discount_percentage, flat_discount, valid_until, is_active)
    VALUES (UPPER(p_code), p_discount_percentage, p_flat_discount, p_valid_until, 1);
    SELECT LAST_INSERT_ID() AS promotion_id;
END;

DROP PROCEDURE IF EXISTS `sp_GetDeliveryOrders`;
CREATE PROCEDURE `sp_GetDeliveryOrders`(IN p_status VARCHAR(50))
BEGIN
    SELECT delivery_id, order_id, customer_name, phone, delivery_address, delivery_status, created_at
    FROM `delivery_orders`
    WHERE (p_status IS NULL OR p_status = '' OR UPPER(delivery_status) = UPPER(p_status))
    ORDER BY created_at DESC;
END;

DROP PROCEDURE IF EXISTS `sp_CreateDeliveryOrder`;
CREATE PROCEDURE `sp_CreateDeliveryOrder`(
    IN p_order_id BIGINT,
    IN p_customer_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_delivery_address VARCHAR(255)
)
BEGIN
    INSERT INTO `delivery_orders` (order_id, customer_name, phone, delivery_address, delivery_status, created_at)
    VALUES (p_order_id, p_customer_name, p_phone, p_delivery_address, 'DISPATCHED', NOW());
    SELECT LAST_INSERT_ID() AS delivery_id;
END;

DROP PROCEDURE IF EXISTS `sp_UpdateDeliveryStatus`;
CREATE PROCEDURE `sp_UpdateDeliveryStatus`(
    IN p_delivery_id BIGINT,
    IN p_status VARCHAR(50)
)
BEGIN
    UPDATE `delivery_orders` SET delivery_status = UPPER(p_status) WHERE delivery_id = p_delivery_id;
END;

-- ------------------------------------------------------------
-- 11. REPORTS DASHBOARD PROCEDURE
-- ------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetReportsDashboardSummary`;
CREATE PROCEDURE `sp_GetReportsDashboardSummary`()
BEGIN
    SELECT 
        COALESCE(NULLIF(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0.00 END), 0.00), 
                 SUM(total_amount), 0.00) AS today_revenue,
        COALESCE(NULLIF(COUNT(CASE WHEN UPPER(status) = 'PAID' AND DATE(created_at) = CURDATE() THEN 1 END), 0),
                 COUNT(CASE WHEN UPPER(status) = 'PAID' THEN 1 END), 0) AS today_settled_orders
    FROM invoices
    WHERE UPPER(status) = 'PAID';

    SELECT COALESCE(NULLIF(COUNT(CASE WHEN DATE(order_time) = CURDATE() THEN 1 END), 0), COUNT(1)) AS today_total_orders 
    FROM orders;

    SELECT COUNT(1) AS active_tables_count 
    FROM restaurant_tables 
    WHERE UPPER(status) IN ('OCCUPIED', 'BILLED', 'SEATED', 'BUSY') AND deleted_at IS NULL;

    SELECT 
        COALESCE(m.dish_name, oi.item_name) AS item_name,
        CAST(COALESCE(SUM(oi.quantity), 0) AS SIGNED) AS quantity_sold,
        COALESCE(SUM(oi.total_price), SUM(oi.unit_price * oi.quantity), 0.00) AS total_revenue
    FROM order_items oi
    LEFT JOIN menu_items m ON oi.menu_item_id = m.menu_item_id
    WHERE oi.is_deleted = 0
    GROUP BY COALESCE(m.dish_name, oi.item_name)
    ORDER BY quantity_sold DESC
    LIMIT 5;

    SELECT 
        UPPER(payment_mode) AS payment_method,
        COALESCE(SUM(amount), 0.00) AS total_amount
    FROM invoice_payments
    GROUP BY UPPER(payment_mode);
END;



-- ------------------------------------------------------------
-- 12. RESTAURANT ORDERS PROCEDURES
-- ------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetActiveOrders`;
CREATE PROCEDURE `sp_GetActiveOrders`()
BEGIN
    SELECT id AS order_id, order_number, outlet_id, order_type, table_id, guests, status, is_active, is_deleted, created_at, table_name, section, server_name, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, service_charge_percent, service_charge_amount, tip_amount, grand_total, payment_method, invoice_no, settled_at
    FROM `orders`
    WHERE is_active = 1 AND is_deleted = 0 AND (LOWER(status) = 'active' OR LOWER(status) = 'billed')
    ORDER BY created_at DESC;

    SELECT id AS item_id, order_id, kot_id, menu_item_id, variant_id, name, price, quantity, total_price, notes, kot_status, kot_batch, is_active, is_deleted, created_at
    FROM `order_items`
    WHERE order_id IN (
        SELECT id FROM `orders` WHERE is_active = 1 AND is_deleted = 0 AND (LOWER(status) = 'active' OR LOWER(status) = 'billed')
    ) AND is_deleted = 0;
END;

DROP PROCEDURE IF EXISTS `sp_GetOrderByTable`;
CREATE PROCEDURE `sp_GetOrderByTable`(IN p_table_id BIGINT)
BEGIN
    SELECT id AS order_id, order_number, outlet_id, order_type, table_id, guests, status, is_active, is_deleted, created_at, table_name, section, server_name, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, service_charge_percent, service_charge_amount, tip_amount, grand_total, payment_method, invoice_no, settled_at
    FROM `orders`
    WHERE table_id = p_table_id AND is_active = 1 AND is_deleted = 0 AND (LOWER(status) = 'active' OR LOWER(status) = 'billed')
    ORDER BY created_at DESC
    LIMIT 1;

    SELECT id AS item_id, order_id, kot_id, menu_item_id, variant_id, name, price, quantity, total_price, notes, kot_status, kot_batch, is_active, is_deleted, created_at
    FROM `order_items`
    WHERE order_id IN (
        SELECT id FROM `orders` WHERE table_id = p_table_id AND is_active = 1 AND is_deleted = 0 AND (LOWER(status) = 'active' OR LOWER(status) = 'billed')
    ) AND is_deleted = 0;
END;

DROP PROCEDURE IF EXISTS `sp_GetOrderHistory`;
CREATE PROCEDURE `sp_GetOrderHistory`()
BEGIN
    SELECT id AS order_id, order_number, outlet_id, order_type, table_id, guests, status, is_active, is_deleted, created_at, table_name, section, server_name, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, service_charge_percent, service_charge_amount, tip_amount, grand_total, payment_method, invoice_no, settled_at
    FROM `orders`
    WHERE is_deleted = 0 AND LOWER(status) = 'settled'
    ORDER BY settled_at DESC;

    SELECT id AS item_id, order_id, kot_id, menu_item_id, variant_id, name, price, quantity, total_price, notes, kot_status, kot_batch, is_active, is_deleted, created_at
    FROM `order_items`
    WHERE order_id IN (
        SELECT id FROM `orders` WHERE is_deleted = 0 AND LOWER(status) = 'settled'
    ) AND is_deleted = 0;
END;

DROP PROCEDURE IF EXISTS `sp_UpdateOrderGuests`;
CREATE PROCEDURE `sp_UpdateOrderGuests`(
    IN p_order_id BIGINT,
    IN p_guests INT
)
BEGIN
    UPDATE `orders` SET guests = p_guests, updated_at = NOW() WHERE id = p_order_id;
END;

DROP PROCEDURE IF EXISTS `sp_UpdateOrderDiscount`;
CREATE PROCEDURE `sp_UpdateOrderDiscount`(
    IN p_order_id BIGINT,
    IN p_discount_percent DECIMAL(18,2)
)
BEGIN
    UPDATE `orders` SET discount_percent = p_discount_percent, updated_at = NOW() WHERE id = p_order_id;
END;

DROP PROCEDURE IF EXISTS `sp_UpdateOrderItemNotes`;
CREATE PROCEDURE `sp_UpdateOrderItemNotes`(
    IN p_order_id BIGINT,
    IN p_item_id BIGINT,
    IN p_notes VARCHAR(255)
)
BEGIN
    UPDATE `order_items` SET notes = p_notes, updated_at = NOW() WHERE id = p_item_id AND order_id = p_order_id;
END;

DROP PROCEDURE IF EXISTS `sp_SettleOrder`;
CREATE PROCEDURE `sp_SettleOrder`(
    IN p_order_id BIGINT,
    IN p_payment_method VARCHAR(30)
)
BEGIN
    UPDATE `orders`
    SET status = 'Settled', payment_method = p_payment_method, settled_at = NOW(), updated_at = NOW()
    WHERE id = p_order_id;
END;
