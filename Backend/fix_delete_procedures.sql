-- SQL Migration to support complete soft-delete and fix data reappearance after refresh

DROP PROCEDURE IF EXISTS `sp_DeleteSupplier`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteSupplier`(IN p_supplier_id BIGINT)
BEGIN
    UPDATE `suppliers`
    SET is_active = 0, deleted_at = NOW(), updated_at = NOW()
    WHERE supplier_id = p_supplier_id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetSuppliers`;
DELIMITER //
CREATE PROCEDURE `sp_GetSuppliers`()
BEGIN
    SELECT supplier_id, supplier_name, phone, email, address, is_active, created_at
    FROM `suppliers`
    WHERE is_active = 1 AND deleted_at IS NULL
    ORDER BY supplier_name;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteCustomer`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteCustomer`(IN p_customer_id BIGINT)
BEGIN
    UPDATE `customers`
    SET is_active = 0, deleted_at = NOW(), updated_at = NOW()
    WHERE customer_id = p_customer_id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetCustomers`;
DELIMITER //
CREATE PROCEDURE `sp_GetCustomers`(IN p_search VARCHAR(100))
BEGIN
    SELECT customer_id, full_name, phone, email, loyalty_points, created_at, updated_at
    FROM `customers`
    WHERE deleted_at IS NULL AND is_active = 1
      AND (p_search IS NULL OR p_search = '' OR LOWER(full_name) LIKE CONCAT('%', LOWER(p_search), '%') OR phone LIKE CONCAT('%', p_search, '%'))
    ORDER BY created_at DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeletePromotion`;
DELIMITER //
CREATE PROCEDURE `sp_DeletePromotion`(IN p_promotion_id BIGINT)
BEGIN
    UPDATE `promotions`
    SET is_active = 0
    WHERE promotion_id = p_promotion_id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteReservation`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteReservation`(IN p_reservation_id BIGINT)
BEGIN
    UPDATE `reservations`
    SET status = 'CANCELLED'
    WHERE reservation_id = p_reservation_id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteMenuCategory`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteMenuCategory`(IN p_name VARCHAR(100))
BEGIN
    DELETE FROM `menu_categories` WHERE LOWER(name) = LOWER(p_name);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteInvoice`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteInvoice`(IN p_invoice_id BIGINT)
BEGIN
    UPDATE `invoices`
    SET status = 'VOID', payment_status = 'void', updated_at = NOW()
    WHERE invoice_id = p_invoice_id;
END //
DELIMITER ;
