-- ============================================================
-- HMS & POS CORE STORED PROCEDURES (24, 25, 26, 31)
-- Target Database: MySQL (hotel_management_db / hotel_management_db_test)
-- ============================================================

-- Ensure times_used column exists on promotions table
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promotions' AND COLUMN_NAME = 'times_used');
SET @alter_sql = IF(@col_exists = 0, 'ALTER TABLE `promotions` ADD COLUMN `times_used` INT NOT NULL DEFAULT 0;', 'SELECT 1;');
PREPARE stmt FROM @alter_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 24. sp_pos_create_complete_order
-- Core POS order creation engine: creates order, order items, addons,
-- sets table occupied, increments promo times_used, and writes audit log.
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_pos_create_complete_order`;
DELIMITER $$
CREATE PROCEDURE `sp_pos_create_complete_order`(
    IN p_branch_id          BIGINT UNSIGNED,
    IN p_customer_id        BIGINT UNSIGNED,
    IN p_waiter_id          BIGINT UNSIGNED,
    IN p_table_id           BIGINT UNSIGNED,
    IN p_promo_code         VARCHAR(50),
    IN p_order_type         VARCHAR(20),       -- 'dine_in', 'takeaway', 'delivery'
    IN p_packaging_charge   DECIMAL(10,2),
    IN p_service_charge_pct DECIMAL(5,2),
    IN p_notes              VARCHAR(255),
    IN p_items_json         JSON,              -- Array of { "item_id": 1, "variant_id": 2, "qty": 1, "is_complimentary": 0, "notes": "...", "addons": [ { "option_id": 3, "price": 20.00 } ] }
    IN p_user_id            BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_order_number VARCHAR(30);
    DECLARE v_items_count INT DEFAULT 0;
    DECLARE v_idx INT DEFAULT 0;
    DECLARE v_addons_count INT DEFAULT 0;
    DECLARE v_aidx INT DEFAULT 0;

    -- Iteration item variables
    DECLARE v_item_id BIGINT UNSIGNED;
    DECLARE v_variant_id BIGINT UNSIGNED;
    DECLARE v_qty INT;
    DECLARE v_is_comp TINYINT(1);
    DECLARE v_item_notes VARCHAR(255);
    DECLARE v_dish_name VARCHAR(150);
    DECLARE v_base_price DECIMAL(10,2);
    DECLARE v_variant_price DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_unit_price DECIMAL(10,2);
    DECLARE v_line_total DECIMAL(10,2);
    DECLARE v_new_oi_id BIGINT UNSIGNED;

    -- Addon variables
    DECLARE v_option_id BIGINT UNSIGNED;
    DECLARE v_addon_price DECIMAL(10,2);

    -- Calculation variables
    DECLARE v_subtotal DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_discount_amt DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_tax_amt DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_service_charge_amt DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_raw_total DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_round_off DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_grand_total DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_promo_id BIGINT UNSIGNED DEFAULT NULL;
    DECLARE v_order_type VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Order Creation Failed: ', v_error_msg) AS message, NULL AS order_id, NULL AS order_number, 0.00 AS total_amount;
    END;

    -- Validate items json
    SET v_items_count = JSON_LENGTH(p_items_json);
    IF v_items_count IS NULL OR v_items_count = 0 THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'Order must contain at least one item' AS message, NULL AS order_id, NULL AS order_number, 0.00 AS total_amount;
        LEAVE proc_label;
    END IF;

    -- Clean order_type
    SET v_order_type = LOWER(TRIM(COALESCE(p_order_type, 'dine_in')));
    IF v_order_type NOT IN ('dine_in', 'takeaway', 'delivery') THEN
        IF v_order_type = 'dinein' OR v_order_type = 'dine-in' THEN
            SET v_order_type = 'dine_in';
        ELSE
            SET v_order_type = 'dine_in';
        END IF;
    END IF;

    -- Generate ORD-YYYYMMDD-XXXX
    SET v_order_number = CONCAT('ORD-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(1 + RAND() * 9998), 4, '0'));

    START TRANSACTION;

        -- 1. Insert master order record
        INSERT INTO `orders` (
            order_number, branch_id, customer_id, waiter_id, table_id,
            order_type, status, subtotal, discount_amt, tax_amt,
            packaging_charge, service_charge_amt, round_off, total_amt,
            notes, order_time, created_by
        ) VALUES (
            v_order_number, COALESCE(p_branch_id, 1), p_customer_id, p_waiter_id, p_table_id,
            v_order_type, 'pending', 0.00, 0.00, 0.00,
            COALESCE(p_packaging_charge, 0.00), 0.00, 0.00, 0.00,
            p_notes, NOW(), p_user_id
        );
        SET @new_order_id = LAST_INSERT_ID();

        -- 2. Loop through JSON array of items
        WHILE v_idx < v_items_count DO
            SET v_item_id    = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].item_id')));
            SET v_variant_id = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].variant_id')));
            SET v_qty        = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].qty'))) AS SIGNED), 1);
            IF v_qty <= 0 THEN SET v_qty = 1; END IF;
            SET v_item_notes = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].notes')));
            SET v_is_comp    = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].is_complimentary'))) AS SIGNED), 0);

            -- Fetch price and dish_name from menu_items
            SET v_base_price = 0.00;
            SET v_dish_name = '';
            SELECT price, dish_name INTO v_base_price, v_dish_name 
            FROM `menu_items` 
            WHERE menu_item_id = v_item_id;

            IF v_dish_name IS NULL OR v_dish_name = '' THEN
                SET v_dish_name = CONCAT('Item #', v_item_id);
            END IF;

            -- Variant price calculation
            IF v_variant_id IS NOT NULL AND v_variant_id != 'null' AND v_variant_id > 0 THEN
                SELECT price INTO v_variant_price FROM `menu_item_options` WHERE option_id = v_variant_id;
                IF v_variant_price IS NULL THEN
                    SET v_variant_price = 0.00;
                END IF;
            ELSE
                SET v_variant_id = NULL;
                SET v_variant_price = 0.00;
            END IF;

            SET v_unit_price = COALESCE(v_base_price, 0.00) + v_variant_price;
            SET v_line_total = IF(v_is_comp = 1, 0.00, ROUND(v_unit_price * v_qty, 2));
            SET v_subtotal = v_subtotal + v_line_total;

            -- Insert order_item
            INSERT INTO `order_items` (
                order_id, item_id, menu_item_id, item_name, variant_id, quantity, unit_price,
                total_price, is_complimentary, special_notes, item_status, branch_id, created_at
            ) VALUES (
                @new_order_id, v_item_id, v_item_id, v_dish_name, v_variant_id, v_qty, v_unit_price,
                v_line_total, v_is_comp, v_item_notes, 'queued', COALESCE(p_branch_id, 1), NOW()
            );
            SET v_new_oi_id = LAST_INSERT_ID();

            -- Insert Addons if any
            SET v_addons_count = JSON_LENGTH(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].addons')));
            IF v_addons_count IS NOT NULL AND v_addons_count > 0 THEN
                SET v_aidx = 0;
                WHILE v_aidx < v_addons_count DO
                    SET v_option_id   = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].addons[', v_aidx, '].option_id')));
                    SET v_addon_price = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].addons[', v_aidx, '].price')));

                    IF v_addon_price IS NULL THEN
                        SELECT price INTO v_addon_price FROM `menu_item_options` WHERE option_id = v_option_id;
                    END IF;
                    SET v_addon_price = COALESCE(v_addon_price, 0.00);

                    INSERT INTO `order_item_addons` (order_item_id, option_id, price)
                    VALUES (v_new_oi_id, v_option_id, v_addon_price);

                    IF v_is_comp = 0 THEN
                        SET v_subtotal = v_subtotal + (v_addon_price * v_qty);
                    END IF;

                    SET v_aidx = v_aidx + 1;
                END WHILE;
            END IF;

            SET v_idx = v_idx + 1;
        END WHILE;

        -- 3. Promo Code Discount & times_used increment
        IF p_promo_code IS NOT NULL AND TRIM(p_promo_code) != '' THEN
            SELECT promotion_id, discount_percentage, flat_discount
            INTO @pr_id, @pr_pct, @pr_flat
            FROM `promotions`
            WHERE code = UPPER(TRIM(p_promo_code)) AND is_active = 1
              AND (valid_until IS NULL OR valid_until >= NOW())
            LIMIT 1;

            IF @pr_id IS NOT NULL THEN
                SET v_promo_id = @pr_id;
                IF @pr_pct > 0 THEN
                    SET v_discount_amt = ROUND((v_subtotal * @pr_pct) / 100.00, 2);
                ELSEIF @pr_flat > 0 THEN
                    SET v_discount_amt = LEAST(v_subtotal, @pr_flat);
                END IF;

                UPDATE `promotions` SET times_used = times_used + 1 WHERE promotion_id = @pr_id;
            END IF;
        END IF;

        -- 4. 5% GST calculation
        SET v_tax_amt = ROUND(GREATEST(0.00, v_subtotal - v_discount_amt) * 0.05, 2);

        -- 5. Service charge calculation
        IF p_service_charge_pct IS NOT NULL AND p_service_charge_pct > 0 THEN
            SET v_service_charge_amt = ROUND(v_subtotal * (p_service_charge_pct / 100.00), 2);
        END IF;

        -- 6. Raw total, round-off, and grand total
        SET v_raw_total = (v_subtotal - v_discount_amt) + v_tax_amt + COALESCE(p_packaging_charge, 0.00) + v_service_charge_amt;
        SET v_grand_total = ROUND(v_raw_total, 0);
        SET v_round_off = v_grand_total - v_raw_total;

        -- 7. Update orders table with calculated totals
        UPDATE `orders`
        SET promo_id           = v_promo_id,
            subtotal           = v_subtotal,
            discount_amt       = v_discount_amt,
            tax_amt            = v_tax_amt,
            packaging_charge   = COALESCE(p_packaging_charge, 0.00),
            service_charge_amt = v_service_charge_amt,
            round_off          = v_round_off,
            total_amt          = v_grand_total,
            updated_at         = NOW()
        WHERE order_id = @new_order_id;

        -- 8. Update table status to occupied
        IF p_table_id IS NOT NULL THEN
            UPDATE `restaurant_tables` SET status = 'occupied', updated_at = NOW() WHERE table_id = p_table_id;
            UPDATE `dining_tables` SET status = 'Occupied', updated_at = NOW() WHERE dining_table_id = p_table_id;
        END IF;

        -- 9. Insert audit log
        INSERT INTO `audit_logs` (user_id, action, table_name, record_id, new_value, created_at)
        VALUES (p_user_id, 'CREATE_ORDER', 'orders', @new_order_id, 
                JSON_OBJECT('order_number', v_order_number, 'total', v_grand_total, 'table_id', p_table_id, 'order_type', v_order_type), 
                NOW());

    COMMIT;

    SELECT 'SUCCESS' AS status, 201 AS status_code, 'Order created successfully' AS message, @new_order_id AS order_id, v_order_number AS order_number, v_grand_total AS total_amount;
END $$
DELIMITER ;

-- ------------------------------------------------------------
-- 25. sp_pos_generate_kot
-- Kitchen Order Ticket (KOT) generation and routing.
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_pos_generate_kot`;
DELIMITER $$
CREATE PROCEDURE `sp_pos_generate_kot`(
    IN p_order_id     BIGINT UNSIGNED,
    IN p_branch_id    BIGINT UNSIGNED,
    IN p_chef_id      BIGINT UNSIGNED,
    IN p_priority     VARCHAR(20),       -- 'normal', 'high', 'urgent'
    IN p_notes        VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_kot_number VARCHAR(30);
    DECLARE v_batch INT DEFAULT 1;
    DECLARE v_unassigned_count INT DEFAULT 0;
    DECLARE v_priority VARCHAR(20);
    DECLARE v_branch_id BIGINT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('KOT Generation Failed: ', v_error_msg) AS message, NULL AS kot_id, NULL AS kot_number;
    END;

    -- Check if order exists
    SELECT branch_id INTO v_branch_id FROM `orders` WHERE order_id = p_order_id;
    IF v_branch_id IS NULL THEN
        SELECT 'FAILED' AS status, 404 AS status_code, 'Order not found' AS message, NULL AS kot_id, NULL AS kot_number;
        LEAVE proc_label;
    END IF;

    SET v_branch_id = COALESCE(p_branch_id, v_branch_id, 1);

    -- Check unassigned items
    SELECT COUNT(*) INTO v_unassigned_count 
    FROM `order_items` 
    WHERE order_id = p_order_id AND kot_id IS NULL AND item_status = 'queued';

    IF v_unassigned_count = 0 THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'No new items pending for KOT generation' AS message, NULL AS kot_id, NULL AS kot_number;
        LEAVE proc_label;
    END IF;

    -- Clean priority
    SET v_priority = LOWER(TRIM(COALESCE(p_priority, 'normal')));
    IF v_priority NOT IN ('normal', 'high', 'urgent') THEN
        SET v_priority = 'normal';
    END IF;

    -- Batch number for re-orders
    SELECT COALESCE(MAX(batch_number), 0) + 1 INTO v_batch FROM `kitchen_orders` WHERE order_id = p_order_id;

    -- Generate KOT-YYYYMMDD-XXXX
    SET v_kot_number = CONCAT('KOT-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(1 + RAND() * 9998), 4, '0'));

    START TRANSACTION;
        -- 1. Insert kitchen_orders
        INSERT INTO `kitchen_orders` (
            kot_number, order_id, branch_id, chef_id, batch_number,
            status, priority, special_notes, created_at
        ) VALUES (
            v_kot_number, p_order_id, v_branch_id, p_chef_id, v_batch,
            'queued', v_priority, p_notes, NOW()
        );
        SET @new_kot_id = LAST_INSERT_ID();

        -- 2. Bind unassigned order items to this KOT ticket
        UPDATE `order_items`
        SET kot_id = @new_kot_id,
            updated_at = NOW()
        WHERE order_id = p_order_id AND kot_id IS NULL AND item_status = 'queued';

        -- 3. Set order status to preparing
        UPDATE `orders` 
        SET status = 'preparing',
            updated_at = NOW() 
        WHERE order_id = p_order_id AND status IN ('pending', 'confirmed');
    COMMIT;

    -- Response 1: Summary result
    SELECT 'SUCCESS' AS status, 201 AS status_code, 'KOT generated successfully' AS message, @new_kot_id AS kot_id, v_kot_number AS kot_number, v_batch AS batch_number;

    -- Response 2: Item details routed to kitchen
    SELECT oi.order_item_id, 
           COALESCE(m.dish_name, oi.item_name) AS item_name, 
           COALESCE(m.dietary_type, 'Non-Veg') AS food_type, 
           oi.quantity, 
           oi.special_notes,
           (SELECT GROUP_CONCAT(o.option_name SEPARATOR ', ') 
            FROM `order_item_addons` oia 
            JOIN `menu_item_options` o ON oia.option_id = o.option_id 
            WHERE oia.order_item_id = oi.order_item_id) AS addons
    FROM `order_items` oi
    LEFT JOIN `menu_items` m ON (oi.menu_item_id = m.menu_item_id OR oi.item_id = m.menu_item_id)
    WHERE oi.kot_id = @new_kot_id;
END $$
DELIMITER ;

-- ------------------------------------------------------------
-- 26. sp_kitchen_update_item_status
-- Kitchen Display System (KDS) live progress updater.
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_kitchen_update_item_status`;
DELIMITER $$
CREATE PROCEDURE `sp_kitchen_update_item_status`(
    IN p_kot_id        BIGINT UNSIGNED,
    IN p_order_item_id BIGINT UNSIGNED,
    IN p_new_status    VARCHAR(20)        -- 'cooking', 'ready', 'served', 'cancelled'
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_order_id BIGINT UNSIGNED;
    DECLARE v_kot_id BIGINT UNSIGNED;
    DECLARE v_pending_in_kot INT DEFAULT 0;
    DECLARE v_pending_in_order INT DEFAULT 0;
    DECLARE v_cooking_or_ready INT DEFAULT 0;
    DECLARE v_new_status VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('KDS Update Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    -- Normalize status
    SET v_new_status = LOWER(TRIM(COALESCE(p_new_status, '')));
    IF v_new_status = 'start cooking' THEN
        SET v_new_status = 'cooking';
    ELSEIF v_new_status = 'ready for pickup' THEN
        SET v_new_status = 'ready';
    END IF;

    IF v_new_status NOT IN ('cooking', 'ready', 'served', 'cancelled') THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid item status. Allowed: cooking, ready, served, cancelled' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

    -- Lookup order_id and kot_id from order_items
    SELECT order_id, kot_id INTO v_order_id, v_kot_id 
    FROM `order_items` 
    WHERE order_item_id = p_order_item_id;

    IF v_order_id IS NULL THEN
        SELECT 'FAILED' AS status, 404 AS status_code, 'Order item not found' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

    IF p_kot_id IS NOT NULL AND p_kot_id > 0 THEN
        SET v_kot_id = p_kot_id;
    END IF;

    START TRANSACTION;
        -- 1. Update order_items status
        UPDATE `order_items`
        SET item_status = v_new_status,
            updated_at = NOW()
        WHERE order_item_id = p_order_item_id;

        -- 2. Update kitchen_orders status & completed_at
        IF v_kot_id IS NOT NULL AND v_kot_id > 0 THEN
            SELECT COUNT(*) INTO v_pending_in_kot
            FROM `order_items`
            WHERE kot_id = v_kot_id AND item_status IN ('queued', 'cooking');

            IF v_pending_in_kot = 0 THEN
                SELECT COUNT(*) INTO v_cooking_or_ready
                FROM `order_items`
                WHERE kot_id = v_kot_id AND item_status = 'ready';

                UPDATE `kitchen_orders`
                SET status = IF(v_cooking_or_ready > 0, 'ready', 'served'),
                    completed_at = COALESCE(completed_at, NOW())
                WHERE kot_id = v_kot_id;
            ELSE
                UPDATE `kitchen_orders` SET status = 'preparing' WHERE kot_id = v_kot_id;
            END IF;
        END IF;

        -- 3. Auto-flip parent order status to ready when all items are prepared
        SELECT COUNT(*) INTO v_pending_in_order
        FROM `order_items`
        WHERE order_id = v_order_id AND item_status IN ('queued', 'cooking');

        IF v_pending_in_order = 0 THEN
            UPDATE `orders` 
            SET status = 'ready',
                updated_at = NOW() 
            WHERE order_id = v_order_id AND status IN ('pending', 'confirmed', 'preparing');
        END IF;
    COMMIT;

    SELECT 'SUCCESS' AS status, 200 AS status_code, CONCAT('Item status changed to ', v_new_status) AS message, p_order_item_id AS data_id;
END $$
DELIMITER ;

-- ------------------------------------------------------------
-- 31. sp_pos_cancel_void_order
-- Safely voids/cancels an entire unpaid order, halting kitchen tickets and restoring table availability.
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_pos_cancel_void_order`;
DELIMITER $$
CREATE PROCEDURE `sp_pos_cancel_void_order`(
    IN p_order_id      BIGINT UNSIGNED,
    IN p_cancel_reason VARCHAR(255),
    IN p_user_id       BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_table_id BIGINT UNSIGNED;
    DECLARE v_order_status VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Order Cancellation Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    -- Validate reason
    IF p_cancel_reason IS NULL OR TRIM(p_cancel_reason) = '' THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'Cancellation reason is mandatory' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

    -- Check order existence and status
    SELECT table_id, status INTO v_table_id, v_order_status 
    FROM `orders` 
    WHERE order_id = p_order_id;

    IF v_order_status IS NULL THEN
        SELECT 'FAILED' AS status, 404 AS status_code, 'Order not found' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

    IF v_order_status = 'completed' THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'Completed/Paid orders cannot be cancelled directly. Please issue a refund.' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

    START TRANSACTION;
        -- 1. Cancel order
        UPDATE `orders`
        SET status           = 'cancelled',
            cancelled_reason = p_cancel_reason,
            updated_by       = p_user_id,
            updated_at       = NOW()
        WHERE order_id = p_order_id;

        -- 2. Mark all order_items cancelled
        UPDATE `order_items` 
        SET item_status = 'cancelled', 
            updated_at = NOW() 
        WHERE order_id = p_order_id;

        -- 3. Mark all kitchen_orders cancelled
        UPDATE `kitchen_orders` 
        SET status = 'cancelled' 
        WHERE order_id = p_order_id;

        -- 4. Mark invoices void
        UPDATE `invoices` 
        SET payment_status = 'void',
            status = 'VOID',
            updated_at = NOW() 
        WHERE order_id = p_order_id;

        -- 5. Restore table availability
        IF v_table_id IS NOT NULL THEN
            UPDATE `restaurant_tables` 
            SET status = 'available', 
                updated_at = NOW() 
            WHERE table_id = v_table_id;

            UPDATE `dining_tables` 
            SET status = 'Available', 
                updated_at = NOW() 
            WHERE dining_table_id = v_table_id;
        END IF;

        -- 6. Insert audit log
        INSERT INTO `audit_logs` (user_id, action, table_name, record_id, new_value, created_at)
        VALUES (p_user_id, 'CANCEL_ORDER', 'orders', p_order_id, 
                JSON_OBJECT('reason', p_cancel_reason, 'cancelled_at', NOW()), 
                NOW());

    COMMIT;

    SELECT 'SUCCESS' AS status, 200 AS status_code, 'Order cancelled successfully and table released' AS message, p_order_id AS order_id;
END $$
DELIMITER ;
