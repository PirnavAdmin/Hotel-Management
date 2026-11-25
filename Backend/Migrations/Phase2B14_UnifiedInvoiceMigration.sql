-- ============================================================================
-- Phase 2B.14 / 2B.15 – Unified Invoice Schema Migration (MySQL 8.0+)
-- IMPORTANT: Take a full database backup (mysqldump) BEFORE running this script.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Pre-Flight Duplicate & Integrity Checks (Read-Only)
-- Stop and resolve any rows returned below before creating unique indexes.
-- ----------------------------------------------------------------------------
SELECT order_id, COUNT(*) AS duplicate_count
FROM invoices
GROUP BY order_id
HAVING COUNT(*) > 1;

SELECT invoice_number, COUNT(*) AS duplicate_count
FROM invoices
GROUP BY invoice_number
HAVING COUNT(*) > 1;

SELECT COUNT(*) AS invalid_rows
FROM invoices
WHERE order_id IS NULL OR order_id <= 0
   OR invoice_number IS NULL OR TRIM(invoice_number) = '';

-- ----------------------------------------------------------------------------
-- STEP 2: Add Unified Invoice Columns (MySQL 8.0 Safe Idempotent Procedure)
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_phase2b14_add_invoice_columns;
DELIMITER $$
CREATE PROCEDURE sp_phase2b14_add_invoice_columns()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'order_number') THEN
        ALTER TABLE invoices ADD COLUMN order_number VARCHAR(50) NULL AFTER order_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'branch_id') THEN
        ALTER TABLE invoices ADD COLUMN branch_id BIGINT NULL AFTER order_number;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'order_type') THEN
        ALTER TABLE invoices ADD COLUMN order_type VARCHAR(50) NULL AFTER branch_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'customer_name') THEN
        ALTER TABLE invoices ADD COLUMN customer_name VARCHAR(150) NULL AFTER order_type;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'customer_phone') THEN
        ALTER TABLE invoices ADD COLUMN customer_phone VARCHAR(20) NULL AFTER customer_name;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'gst_percent') THEN
        ALTER TABLE invoices ADD COLUMN gst_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER taxable_amount;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'cgst_amount') THEN
        ALTER TABLE invoices ADD COLUMN cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER gst_percent;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'sgst_amount') THEN
        ALTER TABLE invoices ADD COLUMN sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER cgst_amount;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'service_charge_percent') THEN
        ALTER TABLE invoices ADD COLUMN service_charge_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER discount_amount;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'service_charge_amount') THEN
        ALTER TABLE invoices ADD COLUMN service_charge_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER service_charge_percent;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'rounding_adjustment') THEN
        ALTER TABLE invoices ADD COLUMN rounding_adjustment DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER service_charge_amount;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'payment_status') THEN
        ALTER TABLE invoices ADD COLUMN payment_status VARCHAR(30) NULL AFTER status;
    END IF;
END$$
DELIMITER ;

CALL sp_phase2b14_add_invoice_columns();
DROP PROCEDURE IF EXISTS sp_phase2b14_add_invoice_columns;

-- ----------------------------------------------------------------------------
-- STEP 3: Backfill Metadata From Existing Orders (Non-Destructive)
-- ----------------------------------------------------------------------------
UPDATE invoices i
INNER JOIN orders o ON o.id = i.order_id
SET
    i.order_number = COALESCE(i.order_number, o.order_number),
    i.branch_id = COALESCE(i.branch_id, o.branch_id, NULLIF(o.outlet_id, 0), 1),
    i.order_type = COALESCE(i.order_type, o.order_type),
    i.customer_name = COALESCE(i.customer_name, o.customer_name),
    i.customer_phone = COALESCE(i.customer_phone, o.customer_phone),
    i.service_charge_amount = CASE
        WHEN LOWER(COALESCE(o.order_type, '')) = 'selfservice' THEN 0.00
        WHEN i.service_charge_amount = 0 THEN COALESCE(o.service_charge, 0.00)
        ELSE i.service_charge_amount
    END,
    i.cgst_amount = CASE WHEN i.cgst_amount = 0 AND i.tax_amount > 0 THEN ROUND(i.tax_amount / 2, 2) ELSE i.cgst_amount END,
    i.sgst_amount = CASE WHEN i.sgst_amount = 0 AND i.tax_amount > 0 THEN i.tax_amount - ROUND(i.tax_amount / 2, 2) ELSE i.sgst_amount END,
    i.payment_status = COALESCE(i.payment_status, CASE UPPER(COALESCE(i.status, 'UNPAID'))
        WHEN 'PAID' THEN 'Paid'
        WHEN 'PARTIAL' THEN 'Partial'
        WHEN 'VOID' THEN 'Void'
        WHEN 'REFUNDED' THEN 'Refunded'
        ELSE 'Unpaid'
    END);

-- ----------------------------------------------------------------------------
-- STEP 4: Create Unique Indexes (Run ONLY if STEP 1 returned 0 duplicates)
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX ix_invoices_order_id ON invoices (order_id);
CREATE UNIQUE INDEX ix_invoices_invoice_number ON invoices (invoice_number);

-- ----------------------------------------------------------------------------
-- STEP 5: Post-Migration Verification
-- ----------------------------------------------------------------------------
DESCRIBE invoices;
SHOW INDEX FROM invoices;
SELECT COUNT(*) AS total_invoices FROM invoices;
