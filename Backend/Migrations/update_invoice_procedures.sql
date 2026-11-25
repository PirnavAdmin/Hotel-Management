USE hoteldb;

DROP PROCEDURE IF EXISTS sp_CreateInvoice;
DELIMITER $$
CREATE PROCEDURE sp_CreateInvoice(
    IN p_order_id BIGINT,
    IN p_invoice_number VARCHAR(50),
    IN p_subtotal DECIMAL(18,2),
    IN p_taxable_amount DECIMAL(18,2),
    IN p_tax_amount DECIMAL(18,2),
    IN p_discount_amount DECIMAL(18,2),
    IN p_total_amount DECIMAL(18,2)
)
BEGIN
    DECLARE v_order_num VARCHAR(50) DEFAULT NULL;
    DECLARE v_branch_id BIGINT DEFAULT 1;
    DECLARE v_order_type VARCHAR(50) DEFAULT NULL;
    DECLARE v_cust_name VARCHAR(150) DEFAULT NULL;
    DECLARE v_cust_phone VARCHAR(20) DEFAULT NULL;
    DECLARE v_cgst DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_sgst DECIMAL(10,2) DEFAULT 0.00;

    SELECT o.order_number, COALESCE(o.branch_id, o.outlet_id, 1), o.order_type, c.full_name, c.phone
    INTO v_order_num, v_branch_id, v_order_type, v_cust_name, v_cust_phone
    FROM orders o
    LEFT JOIN customers c ON c.customer_id = o.customer_id
    WHERE o.order_id = p_order_id
    LIMIT 1;

    SET v_cgst = ROUND(p_tax_amount / 2, 2);
    SET v_sgst = p_tax_amount - v_cgst;

    INSERT INTO invoices (
        order_id, invoice_number, order_number, branch_id, order_type,
        customer_name, customer_phone, subtotal, taxable_amount, gst_percent,
        cgst_amount, sgst_amount, tax_amount, discount_amount, total_amount,
        paid_amount, amount_paid, payment_status, status, created_at, updated_at
    )
    VALUES (
        p_order_id, p_invoice_number, v_order_num, v_branch_id, v_order_type,
        v_cust_name, v_cust_phone, p_subtotal, p_taxable_amount, 5.00,
        v_cgst, v_sgst, p_tax_amount, p_discount_amount, p_total_amount,
        0.00, 0.00, 'pending', 'UNPAID', NOW(), NOW()
    );

    SELECT LAST_INSERT_ID() AS invoice_id;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_RecordInvoicePayment;
DELIMITER $$
CREATE PROCEDURE sp_RecordInvoicePayment(
    IN p_invoice_id BIGINT,
    IN p_amount DECIMAL(18,2),
    IN p_payment_mode VARCHAR(30),
    IN p_transaction_reference VARCHAR(100)
)
BEGIN
    DECLARE v_paid DECIMAL(18,2);
    DECLARE v_total DECIMAL(18,2);
    DECLARE v_status VARCHAR(20);
    DECLARE v_pay_status VARCHAR(20);
    DECLARE v_method VARCHAR(20);

    SET v_method = LOWER(TRIM(p_payment_mode));
    IF v_method NOT IN ('cash', 'card', 'upi', 'net_banking', 'wallet', 'other') THEN
        SET v_method = 'cash';
    END IF;

    INSERT INTO invoice_payments (
        invoice_id, amount, amount_paid, payment_mode, payment_method, transaction_reference, txn_reference, paid_at
    )
    VALUES (
        p_invoice_id, p_amount, p_amount, UPPER(p_payment_mode), v_method, p_transaction_reference, p_transaction_reference, NOW()
    );

    SELECT paid_amount + p_amount, total_amount INTO v_paid, v_total
    FROM invoices WHERE invoice_id = p_invoice_id;

    IF v_paid >= v_total THEN
        SET v_status = 'PAID';
        SET v_pay_status = 'paid';
    ELSE
        SET v_status = 'PARTIAL';
        SET v_pay_status = 'partially_paid';
    END IF;

    UPDATE invoices
    SET paid_amount = v_paid, amount_paid = v_paid, status = v_status, payment_status = v_pay_status, updated_at = NOW()
    WHERE invoice_id = p_invoice_id;
END$$
DELIMITER ;
