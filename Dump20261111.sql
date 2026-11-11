CREATE DATABASE  IF NOT EXISTS `hotel_management_db_test` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `hotel_management_db_test`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: hotel_management_db_test
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `acc_chart_of_accounts`
--

DROP TABLE IF EXISTS `acc_chart_of_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `acc_chart_of_accounts` (
  `account_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `account_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_type` enum('asset','liability','equity','revenue','expense') COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_category` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `normal_balance` enum('debit','credit') COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_account_id` bigint unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `uq_branch_account` (`branch_id`,`account_code`),
  KEY `fk_coa_parent` (`parent_account_id`),
  KEY `idx_coa_type` (`branch_id`,`account_type`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chart of Accounts';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `acc_chart_of_accounts`
--

LOCK TABLES `acc_chart_of_accounts` WRITE;
/*!40000 ALTER TABLE `acc_chart_of_accounts` DISABLE KEYS */;
INSERT INTO `acc_chart_of_accounts` VALUES (1,1,'1010','Cash on Hand (Till & POS Counter)','asset','Current Assets','debit',NULL,1),(2,1,'1020','Bank Operating Account (Card & UPI)','asset','Current Assets','debit',NULL,1),(3,1,'1030','Accounts Receivable (Delivery Aggregators & Tabs)','asset','Current Assets','debit',NULL,1),(4,1,'1040','Kitchen Pantry Inventory (Food Raw Materials)','asset','Current Assets','debit',NULL,1),(5,1,'1050','Cellar Bar Inventory (Sealed Liquor & Kegs)','asset','Current Assets','debit',NULL,1),(6,1,'1510','Kitchen Equipment (Tandoor, Burners, Freezers)','asset','Fixed Assets','debit',NULL,1),(7,1,'1520','Bar Equipment & Draught Beer Tap Systems','asset','Fixed Assets','debit',NULL,1),(8,1,'1590','Accumulated Depreciation - Equipment','asset','Fixed Assets','credit',NULL,1),(9,1,'2010','Accounts Payable (Grocery & Liquor Vendors)','liability','Current Liabilities','credit',NULL,1),(10,1,'2020','Output CGST Payable (2.5%)','liability','Current Liabilities','credit',NULL,1),(11,1,'2030','Output SGST Payable (2.5%)','liability','Current Liabilities','credit',NULL,1),(12,1,'2040','Salaries & Staff Wages Payable','liability','Current Liabilities','credit',NULL,1),(13,1,'2510','Bank Business Term Loan','liability','Long Term Liabilities','credit',NULL,1),(14,1,'3010','Owner Capital & Partner Equity','equity','Capital','credit',NULL,1),(15,1,'3020','Retained Earnings','equity','Reserves & Surplus','credit',NULL,1),(16,1,'4010','Restaurant Food Sales (Veg Dishes)','revenue','Food Sales','credit',NULL,1),(17,1,'4020','Restaurant Food Sales (Non-Veg Dishes)','revenue','Food Sales','credit',NULL,1),(18,1,'4030','Bar Alcohol Sales (Spirits, Beer & Wine)','revenue','Bar Sales','credit',NULL,1),(19,1,'4040','Restaurant Service Charges Collected','revenue','Service Revenue','credit',NULL,1),(20,1,'4050','Delivery Packaging Charges Collected','revenue','Service Revenue','credit',NULL,1),(21,1,'4060','Sales Discounts Allowed','revenue','Discounts','debit',NULL,1),(22,1,'5010','COGS - Kitchen Food Ingredients Consumed','expense','Cost of Goods Sold','debit',NULL,1),(23,1,'5020','COGS - Bar Liquor & Draught Beer Consumed','expense','Cost of Goods Sold','debit',NULL,1),(24,1,'6010','Salaries & Wages (Kitchen Chefs & Floor Waitstaff)','expense','Operating Expenses','debit',NULL,1),(25,1,'6020','Commercial LPG Gas & Kitchen Electricity','expense','Operating Expenses','debit',NULL,1),(26,1,'6030','Kitchen & Bar Equipment Maintenance','expense','Operating Expenses','debit',NULL,1),(27,1,'6040','State Excise License & Restaurant Permit Fees','expense','Administrative Expenses','debit',NULL,1),(28,1,'6050','Depreciation Expense','expense','Depreciation','debit',NULL,1);
/*!40000 ALTER TABLE `acc_chart_of_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `acc_expenses`
--

DROP TABLE IF EXISTS `acc_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `acc_expenses` (
  `expense_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `expense_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_id` bigint unsigned NOT NULL,
  `paid_from_account` bigint unsigned NOT NULL,
  `expense_date` date NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `tax_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `vendor_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_mode` enum('cash','bank_transfer','cheque','upi','card') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'bank_transfer',
  `reference_voucher` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`expense_id`),
  UNIQUE KEY `expense_number` (`expense_number`),
  KEY `fk_exp_branch` (`branch_id`),
  KEY `fk_exp_account` (`account_id`),
  KEY `fk_exp_bankacc` (`paid_from_account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Direct operating expense records';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `acc_expenses`
--

LOCK TABLES `acc_expenses` WRITE;
/*!40000 ALTER TABLE `acc_expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `acc_expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `acc_fiscal_years`
--

DROP TABLE IF EXISTS `acc_fiscal_years`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `acc_fiscal_years` (
  `fiscal_year_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `fy_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_closed` tinyint(1) NOT NULL DEFAULT '0',
  `closed_at` datetime DEFAULT NULL,
  `closed_by` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`fiscal_year_id`),
  UNIQUE KEY `uq_branch_fy` (`branch_id`,`fy_code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Accounting financial years';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `acc_fiscal_years`
--

LOCK TABLES `acc_fiscal_years` WRITE;
/*!40000 ALTER TABLE `acc_fiscal_years` DISABLE KEYS */;
INSERT INTO `acc_fiscal_years` VALUES (1,1,'FY-2026-27','2026-04-01','2027-03-31',0,NULL,NULL);
/*!40000 ALTER TABLE `acc_fiscal_years` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `acc_journal_entries`
--

DROP TABLE IF EXISTS `acc_journal_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `acc_journal_entries` (
  `entry_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entry_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `fiscal_year_id` bigint unsigned NOT NULL,
  `entry_date` date NOT NULL,
  `entry_type` enum('sales_invoice','payment_receipt','purchase_bill','cogs_expense','operating_expense','audit_adjustment','period_closing') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `narration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_debit` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_credit` decimal(12,2) NOT NULL DEFAULT '0.00',
  `is_posted` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`entry_id`),
  UNIQUE KEY `entry_number` (`entry_number`),
  KEY `fk_je_fy` (`fiscal_year_id`),
  KEY `idx_je_date` (`branch_id`,`entry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='General ledger journal voucher header';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `acc_journal_entries`
--

LOCK TABLES `acc_journal_entries` WRITE;
/*!40000 ALTER TABLE `acc_journal_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `acc_journal_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `acc_journal_entry_lines`
--

DROP TABLE IF EXISTS `acc_journal_entry_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `acc_journal_entry_lines` (
  `line_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entry_id` bigint unsigned NOT NULL,
  `account_id` bigint unsigned NOT NULL,
  `debit_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `credit_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`line_id`),
  KEY `fk_jel_entry` (`entry_id`),
  KEY `idx_jel_account_date` (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Balanced journal lines';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `acc_journal_entry_lines`
--

LOCK TABLES `acc_journal_entry_lines` WRITE;
/*!40000 ALTER TABLE `acc_journal_entry_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `acc_journal_entry_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendances`
--

DROP TABLE IF EXISTS `attendances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendances` (
  `attendance_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL DEFAULT '1',
  `branch_id` bigint DEFAULT NULL,
  `attendance_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `check_in` datetime DEFAULT NULL,
  `check_out` datetime DEFAULT NULL,
  `total_hours` decimal(5,2) NOT NULL DEFAULT '0.00',
  `overtime_minutes` int NOT NULL DEFAULT '0',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PRESENT',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `outlet_id` bigint DEFAULT '1',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `staff_id` bigint NOT NULL DEFAULT '0',
  `shift` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`attendance_id`),
  UNIQUE KEY `uq_att` (`employee_id`,`attendance_date`),
  KEY `idx_att_date_status` (`branch_id`,`attendance_date`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daily staff attendance';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendances`
--

LOCK TABLES `attendances` WRITE;
/*!40000 ALTER TABLE `attendances` DISABLE KEYS */;
INSERT INTO `attendances` VALUES (1,1,1,'2026-10-09 00:00:00','2026-10-09 09:55:00','2026-10-09 19:05:00',9.16,10,'present','2026-10-09 15:13:45',1,NULL,NULL,0,NULL),(2,2,1,'2026-10-09 00:00:00','2026-10-09 10:50:00','2026-10-09 16:10:00',5.33,20,'present','2026-10-09 15:13:45',1,NULL,NULL,0,NULL),(3,3,1,'2026-10-09 00:00:00','2026-10-09 15:58:00','2026-10-10 00:40:00',8.70,42,'present','2026-10-09 15:13:45',1,NULL,NULL,0,NULL),(4,4,1,'2026-10-09 00:00:00','2026-10-09 16:50:00','2026-10-09 23:45:00',6.91,25,'present','2026-10-09 15:13:45',1,NULL,NULL,0,NULL),(5,5,1,'2026-10-09 00:00:00','2026-10-09 17:55:00','2026-10-10 01:15:00',7.33,20,'present','2026-10-09 15:13:45',1,NULL,NULL,0,NULL),(6,1,NULL,'2026-11-02 15:09:15','2026-11-02 15:09:15','2026-11-02 15:09:15',0.00,0,'PRESENT','2026-11-02 15:09:15',1,NULL,NULL,1,'Morning Shift');
/*!40000 ALTER TABLE `attendances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `log_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `record_id` bigint unsigned DEFAULT NULL,
  `old_value` json DEFAULT NULL,
  `new_value` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `fk_audit_user` (`user_id`),
  KEY `idx_audit_table` (`table_name`,`record_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System change logs';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,'CREATE','branches',1,NULL,'{\"status\": \"active\", \"branch_id\": 1, \"branch_name\": \"Grand Palace - Bengaluru Downtown\"}','192.168.1.100','2026-10-01 09:00:00'),(2,3,'PAYMENT_SETTLED','invoices',1,'{\"payment_status\": \"pending\"}','{\"total_amount\": 1304.0, \"payment_status\": \"paid\"}','192.168.1.105','2026-10-09 20:32:00');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bar_bot_items`
--

DROP TABLE IF EXISTS `bar_bot_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bar_bot_items` (
  `bot_item_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bot_id` bigint unsigned NOT NULL,
  `order_item_id` bigint unsigned NOT NULL,
  `pour_size_ml` decimal(6,2) NOT NULL DEFAULT '60.00',
  `item_status` enum('queued','mixing','ready','served','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'queued',
  `special_notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`bot_item_id`),
  KEY `fk_bbi_orderitem` (`order_item_id`),
  KEY `idx_bbi_status` (`bot_id`,`item_status`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BOT drink lines';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bar_bot_items`
--

LOCK TABLES `bar_bot_items` WRITE;
/*!40000 ALTER TABLE `bar_bot_items` DISABLE KEYS */;
INSERT INTO `bar_bot_items` VALUES (1,1,94,60.00,'queued','On the rocks'),(2,2,97,60.00,'ready','60ml'),(3,3,102,60.00,'queued','On the rocks'),(4,4,105,60.00,'ready','60ml'),(5,5,101,60.00,'queued','Extra mint'),(6,5,109,60.00,'queued','Extra mint'),(7,5,110,60.00,'queued','On the rocks'),(8,6,104,60.00,'ready','Less ice'),(9,6,112,60.00,'ready','Less ice'),(10,6,113,60.00,'ready','60ml'),(11,7,117,60.00,'queued','Extra mint'),(12,7,118,60.00,'queued','On the rocks'),(13,8,120,60.00,'ready','Less ice'),(14,8,121,60.00,'ready','60ml'),(15,9,123,60.00,'queued','Chilled bottle'),(16,10,125,60.00,'queued',NULL),(17,11,131,60.00,'queued',''),(18,12,133,60.00,'queued','Extra mint'),(19,12,134,60.00,'queued','On the rocks'),(20,13,136,60.00,'ready','Less ice'),(21,13,137,60.00,'ready','60ml'),(22,14,139,60.00,'queued','Chilled bottle'),(23,15,148,60.00,'queued','Extra mint'),(24,15,149,60.00,'queued','On the rocks'),(25,16,151,60.00,'ready','Less ice'),(26,16,152,60.00,'ready','60ml'),(27,17,154,60.00,'queued','Chilled bottle'),(28,18,155,60.00,'queued',''),(29,19,157,60.00,'queued',''),(30,40,231,60.00,'queued',''),(31,41,238,60.00,'queued','');
/*!40000 ALTER TABLE `bar_bot_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bar_bottle_sizes`
--

DROP TABLE IF EXISTS `bar_bottle_sizes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bar_bottle_sizes` (
  `size_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `brand_id` bigint unsigned NOT NULL,
  `package_type` enum('bottle','can','keg','cask') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'bottle',
  `volume_ml` decimal(10,2) NOT NULL,
  `standard_peg_ml` int NOT NULL DEFAULT '60',
  `barcode_ean` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cost_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `mrp` decimal(10,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`size_id`),
  KEY `idx_bottle_lookup` (`brand_id`,`volume_ml`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bottle packaging & pour sizes';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bar_bottle_sizes`
--

LOCK TABLES `bar_bottle_sizes` WRITE;
/*!40000 ALTER TABLE `bar_bottle_sizes` DISABLE KEYS */;
INSERT INTO `bar_bottle_sizes` VALUES (1,1,'bottle',750.00,60,NULL,4200.00,6500.00,1,'2026-10-27 16:08:24'),(2,2,'bottle',750.00,60,NULL,3100.00,4800.00,1,'2026-10-27 16:08:24'),(3,3,'keg',30000.00,500,NULL,4500.00,12000.00,1,'2026-10-27 16:08:24'),(4,4,'bottle',750.00,150,NULL,950.00,1800.00,1,'2026-10-27 16:08:24');
/*!40000 ALTER TABLE `bar_bottle_sizes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bar_counters`
--

DROP TABLE IF EXISTS `bar_counters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bar_counters` (
  `bar_counter_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `counter_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `counter_code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Main Dining Hall',
  `printer_ip_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`bar_counter_id`),
  UNIQUE KEY `uq_branch_bar_counter` (`branch_id`,`counter_code`),
  KEY `idx_bar_counters_active` (`branch_id`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bar dispense stations';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bar_counters`
--

LOCK TABLES `bar_counters` WRITE;
/*!40000 ALTER TABLE `bar_counters` DISABLE KEYS */;
INSERT INTO `bar_counters` VALUES (1,1,'Main Saloon Bar','BAR-BLR-01','Ground Floor Lounge','192.168.1.180',1,'2026-10-27 16:08:24','2026-10-27 16:08:24'),(2,1,'Skyline Rooftop Bar','BAR-BLR-02','5th Floor Open Terrace','192.168.1.181',1,'2026-10-27 16:08:24','2026-10-27 16:08:24');
/*!40000 ALTER TABLE `bar_counters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bar_excise_daily_registers`
--

DROP TABLE IF EXISTS `bar_excise_daily_registers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bar_excise_daily_registers` (
  `register_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `brand_id` bigint unsigned NOT NULL,
  `register_date` date NOT NULL,
  `opening_sealed_bottles` int NOT NULL DEFAULT '0',
  `opening_loose_ml` decimal(10,2) NOT NULL DEFAULT '0.00',
  `inward_sealed_bottles` int NOT NULL DEFAULT '0',
  `sales_sealed_bottles` int NOT NULL DEFAULT '0',
  `sales_loose_ml` decimal(10,2) NOT NULL DEFAULT '0.00',
  `breakage_spillage_ml` decimal(10,2) NOT NULL DEFAULT '0.00',
  `closing_sealed_bottles` int NOT NULL DEFAULT '0',
  `closing_loose_ml` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discrepancy_ml` decimal(10,2) NOT NULL DEFAULT '0.00',
  `verified_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`register_id`),
  UNIQUE KEY `uq_excise_daily` (`branch_id`,`brand_id`,`register_date`),
  KEY `fk_excise_brand` (`brand_id`),
  KEY `fk_excise_verifier` (`verified_by`),
  KEY `idx_excise_date` (`branch_id`,`register_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Statutory government excise daily book';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bar_excise_daily_registers`
--

LOCK TABLES `bar_excise_daily_registers` WRITE;
/*!40000 ALTER TABLE `bar_excise_daily_registers` DISABLE KEYS */;
INSERT INTO `bar_excise_daily_registers` VALUES (1,1,1,'2026-10-27',12,570.00,6,0,180.00,0.00,18,390.00,0.00,1,'2026-10-27 16:08:24');
/*!40000 ALTER TABLE `bar_excise_daily_registers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bar_happy_hours`
--

DROP TABLE IF EXISTS `bar_happy_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bar_happy_hours` (
  `happy_hour_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `rule_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `days_of_week` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1,2,3,4,5',
  `offer_type` enum('bogo','discount_percent','flat_price') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'bogo',
  `discount_value` decimal(10,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`happy_hour_id`),
  KEY `idx_hh_timing` (`branch_id`,`is_active`,`start_time`,`end_time`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Beverage Happy Hour configurations';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bar_happy_hours`
--

LOCK TABLES `bar_happy_hours` WRITE;
/*!40000 ALTER TABLE `bar_happy_hours` DISABLE KEYS */;
INSERT INTO `bar_happy_hours` VALUES (1,1,'Sunset Happy Hours','16:00:00','20:00:00','1,2,3,4,5','bogo',0.00,1,'2026-10-27 16:08:24');
/*!40000 ALTER TABLE `bar_happy_hours` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bar_inventory_stock`
--

DROP TABLE IF EXISTS `bar_inventory_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bar_inventory_stock` (
  `stock_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `brand_id` bigint unsigned NOT NULL,
  `size_id` bigint unsigned NOT NULL,
  `sealed_quantity` int unsigned NOT NULL DEFAULT '0' COMMENT 'Sealed bottles/cans/kegs in stock',
  `min_reorder_level` int unsigned NOT NULL DEFAULT '5' COMMENT 'Low stock alert threshold',
  `max_stock_level` int unsigned NOT NULL DEFAULT '100' COMMENT 'Maximum cellar holding capacity',
  `reorder_quantity` int unsigned NOT NULL DEFAULT '20' COMMENT 'Standard reorder batch quantity',
  `avg_cost_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Weighted moving average cost per bottle',
  `last_received_at` datetime DEFAULT NULL COMMENT 'Timestamp of latest stock inward',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stock_id`),
  UNIQUE KEY `uq_branch_brand_size` (`branch_id`,`brand_id`,`size_id`),
  KEY `fk_barstock_brand` (`brand_id`),
  KEY `fk_barstock_size` (`size_id`),
  KEY `idx_bar_stock_reorder` (`branch_id`,`sealed_quantity`,`min_reorder_level`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cellar sealed liquor inventory balances';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bar_inventory_stock`
--

LOCK TABLES `bar_inventory_stock` WRITE;
/*!40000 ALTER TABLE `bar_inventory_stock` DISABLE KEYS */;
INSERT INTO `bar_inventory_stock` VALUES (1,1,1,1,1358,5,60,24,4500.00,'2026-11-05 05:41:41','2026-10-26 10:00:00','2026-11-05 05:41:41'),(2,1,2,2,14,5,50,18,3100.00,'2026-11-01 10:30:00','2026-10-26 10:00:00','2026-11-04 10:44:10'),(3,1,3,3,5,2,15,6,4500.00,'2026-11-02 11:15:00','2026-10-26 10:00:00','2026-11-04 10:44:10'),(4,1,4,4,23,6,60,24,950.00,'2026-11-02 14:00:00','2026-10-26 10:00:00','2026-11-04 10:44:10');
/*!40000 ALTER TABLE `bar_inventory_stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bar_inventory_transactions`
--

DROP TABLE IF EXISTS `bar_inventory_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bar_inventory_transactions` (
  `bar_trans_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `brand_id` bigint unsigned NOT NULL,
  `size_id` bigint unsigned NOT NULL,
  `bar_counter_id` bigint unsigned DEFAULT NULL COMMENT 'Dispense counter involved (NULL for central cellar receipts)',
  `transaction_type` enum('inward_purchase','cellar_to_counter','counter_to_cellar','direct_bottle_sale','breakage_spoilage','audit_adjustment','supplier_return') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL COMMENT 'Positive for stock additions, negative for reductions',
  `unit_cost` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `excise_permit_no` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Excise Transport Permit (TP) or Pass No.',
  `batch_no` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Brewery/Distillery batch identification',
  `reference_invoice_no` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Vendor invoice or internal transfer requisition',
  `reason_remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Breakage explanation or audit note',
  `created_by` bigint unsigned DEFAULT NULL COMMENT 'Staff member who executed the transaction',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`bar_trans_id`),
  KEY `fk_bartrans_brand` (`brand_id`),
  KEY `fk_bartrans_size` (`size_id`),
  KEY `fk_bartrans_counter` (`bar_counter_id`),
  KEY `fk_bartrans_user` (`created_by`),
  KEY `idx_bar_trans_date` (`branch_id`,`created_at`),
  KEY `idx_bar_trans_brand_size` (`branch_id`,`brand_id`,`size_id`),
  KEY `idx_bar_trans_type` (`branch_id`,`transaction_type`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit ledger for all liquor movements';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bar_inventory_transactions`
--

LOCK TABLES `bar_inventory_transactions` WRITE;
/*!40000 ALTER TABLE `bar_inventory_transactions` DISABLE KEYS */;
INSERT INTO `bar_inventory_transactions` VALUES (1,1,1,1,NULL,'inward_purchase',24,4200.00,100800.00,'EXC-TP-2026-0941','BATCH-GF-2026-B1','INV-EXCISE-8812','Direct government depot shipment received into central cellar',1,'2026-11-01 10:30:00'),(2,1,1,1,1,'cellar_to_counter',-2,4200.00,8400.00,NULL,'BATCH-GF-2026-B1','REQ-BAR1-0101','Requisition to Main Saloon Bar for evening service',3,'2026-11-01 16:30:00'),(3,1,1,1,2,'cellar_to_counter',-2,4200.00,8400.00,NULL,'BATCH-GF-2026-B1','REQ-BAR2-0044','Weekend bar station restock',3,'2026-11-02 17:00:00'),(4,1,1,1,1,'direct_bottle_sale',-1,4200.00,4200.00,NULL,'BATCH-GF-2026-B1','INV-2026-0045','Direct full sealed bottle sale to VIP guest at Table #12',1,'2026-11-03 21:15:00'),(5,1,1,1,NULL,'breakage_spoilage',-1,4200.00,4200.00,NULL,'BATCH-GF-2026-B1','INCIDENT-BRK-09','Slipped from cellar shelf; photographed for excise write-off',1,'2026-11-04 09:10:00'),(6,1,2,2,NULL,'inward_purchase',18,3100.00,55800.00,'EXC-TP-2026-0941','BATCH-GG-2026-07','INV-EXCISE-8812','Depot delivery checked and binned into vodka racks',1,'2026-11-01 10:30:00'),(7,1,2,2,1,'cellar_to_counter',-3,3100.00,9300.00,NULL,'BATCH-GG-2026-07','REQ-BAR1-0102','Weekend cocktail bar requisition',3,'2026-11-01 16:45:00'),(8,1,2,2,2,'cellar_to_counter',-1,3100.00,3100.00,NULL,'BATCH-GG-2026-07','REQ-BAR2-0045','Rooftop cocktail lounge issue',3,'2026-11-02 17:30:00'),(9,1,3,3,NULL,'inward_purchase',6,4500.00,27000.00,'EXC-TP-2026-0948','KF-KEG-2026-04','INV-BREW-9921','6 Cold kegs transferred into walk-in beer chiller',1,'2026-11-02 11:15:00'),(10,1,3,3,1,'cellar_to_counter',-1,4500.00,4500.00,NULL,'KF-KEG-2026-04','TAP-KF-01','Connected to Tap Line #01 at Main Saloon Bar',3,'2026-11-02 15:00:00'),(11,1,4,4,NULL,'inward_purchase',30,950.00,28500.00,'EXC-TP-2026-0955','BATCH-SULA-2024','INV-SULA-1022','30 bottles stored in temperature-controlled wine cellar',1,'2026-11-02 14:00:00'),(12,1,4,4,1,'direct_bottle_sale',-4,950.00,3800.00,NULL,'BATCH-SULA-2024','POS-DIN-9031','Wine bottle service for banquet table reservation',3,'2026-11-02 20:30:00'),(13,1,4,4,2,'cellar_to_counter',-2,950.00,1900.00,NULL,'BATCH-SULA-2024','REQ-BAR2-0048','Rooftop wine cooler replenishment',3,'2026-11-03 18:00:00'),(14,1,4,4,NULL,'audit_adjustment',-1,950.00,950.00,NULL,'BATCH-SULA-2024','AUDIT-WK-44','Weekly physical stock variance adjustment approved by manager',1,'2026-11-04 09:30:00');
/*!40000 ALTER TABLE `bar_inventory_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bar_keg_tappings`
--

DROP TABLE IF EXISTS `bar_keg_tappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bar_keg_tappings` (
  `keg_tapping_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bar_counter_id` bigint unsigned NOT NULL,
  `brand_id` bigint unsigned NOT NULL,
  `tap_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `keg_serial_number` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capacity_liters` decimal(6,2) NOT NULL DEFAULT '30.00',
  `tapped_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tapped_by` bigint unsigned NOT NULL,
  `liters_dispensed` decimal(6,2) NOT NULL DEFAULT '0.00',
  `foam_loss_liters` decimal(6,2) NOT NULL DEFAULT '0.00',
  `status` enum('tapped','empty','disconnected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'tapped',
  `disconnected_at` datetime DEFAULT NULL,
  PRIMARY KEY (`keg_tapping_id`),
  KEY `fk_keg_brand` (`brand_id`),
  KEY `fk_keg_employee` (`tapped_by`),
  KEY `idx_keg_status` (`bar_counter_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Draught beer keg line monitoring';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bar_keg_tappings`
--

LOCK TABLES `bar_keg_tappings` WRITE;
/*!40000 ALTER TABLE `bar_keg_tappings` DISABLE KEYS */;
INSERT INTO `bar_keg_tappings` VALUES (1,1,3,'Tap #01','KEG-KF-2026-9921',30.00,'2026-10-27 16:08:24',3,12.50,0.40,'tapped',NULL);
/*!40000 ALTER TABLE `bar_keg_tappings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bar_liquor_brands`
--

DROP TABLE IF EXISTS `bar_liquor_brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bar_liquor_brands` (
  `brand_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `brand_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `liquor_category` enum('whisky','vodka','rum','gin','tequila','brandy','beer_bottled','beer_draught','wine_red','wine_white','liqueur','cocktail_mixer') COLLATE utf8mb4_unicode_ci NOT NULL,
  `origin_type` enum('domestic','imported_imfl','imported_bio') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'domestic',
  `alcohol_pct` decimal(4,2) NOT NULL DEFAULT '42.80',
  `excise_brand_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hsn_sac_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2208',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`brand_id`),
  KEY `idx_liquor_category` (`branch_id`,`liquor_category`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Excise brand master';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bar_liquor_brands`
--

LOCK TABLES `bar_liquor_brands` WRITE;
/*!40000 ALTER TABLE `bar_liquor_brands` DISABLE KEYS */;
INSERT INTO `bar_liquor_brands` VALUES (1,1,'Glenfiddich 12 Year Single Malt','whisky','imported_bio',40.00,'EXC-BLR-WH-001','2208',1,NULL,'2026-10-27 16:08:24','2026-10-27 16:08:24'),(2,1,'Grey Goose Premium Vodka','vodka','imported_bio',40.00,'EXC-BLR-VO-002','2208',1,NULL,'2026-10-27 16:08:24','2026-10-27 16:08:24'),(3,1,'Kingfisher Premium Draught Keg','beer_draught','domestic',4.80,'EXC-BLR-BR-003','2203',1,NULL,'2026-10-27 16:08:24','2026-10-27 16:08:24'),(4,1,'Sula Dindori Reserve Shiraz','wine_red','domestic',13.50,'EXC-BLR-WN-004','2204',1,NULL,'2026-10-27 16:08:24','2026-10-27 16:08:24');
/*!40000 ALTER TABLE `bar_liquor_brands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bar_opened_bottles`
--

DROP TABLE IF EXISTS `bar_opened_bottles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bar_opened_bottles` (
  `opened_bottle_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bar_counter_id` bigint unsigned NOT NULL,
  `brand_id` bigint unsigned NOT NULL,
  `size_id` bigint unsigned NOT NULL,
  `bottle_serial_number` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `opened_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `opened_by` bigint unsigned NOT NULL,
  `initial_volume_ml` decimal(10,2) NOT NULL,
  `remaining_volume_ml` decimal(10,2) NOT NULL,
  `is_empty` tinyint(1) NOT NULL DEFAULT '0',
  `emptied_at` datetime DEFAULT NULL,
  PRIMARY KEY (`opened_bottle_id`),
  KEY `fk_opnbot_brand` (`brand_id`),
  KEY `fk_opnbot_size` (`size_id`),
  KEY `fk_opnbot_employee` (`opened_by`),
  KEY `idx_active_bottles` (`bar_counter_id`,`brand_id`,`is_empty`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Active opened bottles for peg dispensing';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bar_opened_bottles`
--

LOCK TABLES `bar_opened_bottles` WRITE;
/*!40000 ALTER TABLE `bar_opened_bottles` DISABLE KEYS */;
INSERT INTO `bar_opened_bottles` VALUES (1,1,1,1,'BOT-GLEN-8841','2026-10-27 16:08:24',3,750.00,570.00,0,NULL);
/*!40000 ALTER TABLE `bar_opened_bottles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bar_order_tickets`
--

DROP TABLE IF EXISTS `bar_order_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bar_order_tickets` (
  `bot_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bot_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` bigint unsigned NOT NULL,
  `bar_counter_id` bigint unsigned NOT NULL,
  `bartender_id` bigint unsigned DEFAULT NULL,
  `batch_number` int NOT NULL DEFAULT '1',
  `status` enum('queued','mixing','ready','served','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'queued',
  `priority` enum('normal','high','urgent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `special_notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`bot_id`),
  UNIQUE KEY `bot_number` (`bot_number`),
  KEY `fk_bot_order` (`order_id`),
  KEY `fk_bot_barman` (`bartender_id`),
  KEY `idx_bot_queue` (`bar_counter_id`,`status`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bar Order Tickets for Bartenders';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bar_order_tickets`
--

LOCK TABLES `bar_order_tickets` WRITE;
/*!40000 ALTER TABLE `bar_order_tickets` DISABLE KEYS */;
INSERT INTO `bar_order_tickets` VALUES (1,'BOT-20261102102346040',38,1,NULL,1,'queued','normal','Table: Table-2 (Main Hall)','2026-11-02 15:53:46',NULL),(2,'BOT-20261102102346132',37,1,NULL,1,'ready','normal','Table: Table-3 (Main Hall)','2026-11-02 15:53:46','2026-11-03 07:42:30'),(3,'BOT-20261102102809423',40,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 15:58:09',NULL),(4,'BOT-20261102102809527',41,1,NULL,1,'ready','normal','Table:  ()','2026-11-02 15:58:09','2026-11-02 10:28:09'),(5,'BOT-20261102103632440',40,1,NULL,2,'queued','normal','Table:  ()','2026-11-02 16:06:32',NULL),(6,'BOT-20261102103632509',41,1,NULL,2,'ready','normal','Table:  ()','2026-11-02 16:06:32','2026-11-02 10:36:32'),(7,'BOT-20261102104042588',43,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 16:10:42',NULL),(8,'BOT-20261102104042675',44,1,NULL,1,'ready','normal','Table:  ()','2026-11-02 16:10:42','2026-11-02 10:40:42'),(9,'BOT-20261102104042787',44,1,NULL,2,'queued','normal','Table:  ()','2026-11-02 16:10:42',NULL),(10,'BOT-20261102104056102',45,1,NULL,1,'queued','normal','Table: Takeaway (Takeaway)','2026-11-02 16:10:56',NULL),(11,'BOT-20261102110019018',34,1,NULL,1,'ready','normal','Table: Table-1 (Main Hall)','2026-11-02 16:30:19','2026-11-04 04:45:07'),(12,'BOT-20261102110144196',49,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 16:31:44',NULL),(13,'BOT-20261102110144350',50,1,NULL,1,'ready','normal','Table:  ()','2026-11-02 16:31:44','2026-11-02 11:01:44'),(14,'BOT-20261102110144482',50,1,NULL,2,'queued','normal','Table:  ()','2026-11-02 16:31:44',NULL),(15,'BOT-20261102115452110',57,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 17:24:52',NULL),(16,'BOT-20261102115452174',58,1,NULL,1,'ready','normal','Table:  ()','2026-11-02 17:24:52','2026-11-02 11:54:52'),(17,'BOT-20261102115452262',58,1,NULL,2,'queued','normal','Table:  ()','2026-11-02 17:24:52',NULL),(18,'BOT-20261102120424628',34,1,NULL,2,'ready','normal','Table: Table-1 (Main Hall)','2026-11-02 17:34:24','2026-11-04 04:45:07'),(19,'BOT-20261102120450771',34,1,NULL,3,'ready','normal','Table: Table-1 (Main Hall)','2026-11-02 17:34:50','2026-11-04 04:45:07'),(20,'BOT-20261103071142127',59,1,NULL,1,'ready','normal','Table:  ()','2026-11-03 12:41:42','2026-11-03 08:34:57'),(21,'BOT-20261103071142314',37,1,NULL,2,'ready','normal','Table:  ()','2026-11-03 12:41:42','2026-11-03 07:42:30'),(22,'BOT-20261103071142542',60,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 12:41:42',NULL),(23,'BOT-20261103071219562',62,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 12:42:19',NULL),(24,'BOT-20261103071237602',63,1,NULL,1,'mixing','normal','Table:  ()','2026-11-03 12:42:37',NULL),(25,'BOT-20261103071608036',34,1,NULL,4,'ready','normal','Table:  ()','2026-11-03 12:46:08','2026-11-04 04:45:07'),(26,'BOT-20261103071917614',64,1,NULL,1,'ready','normal','Table:  ()','2026-11-03 12:49:17','2026-11-03 07:42:33'),(27,'BOT-20261103073846016',59,1,NULL,2,'ready','normal','Table:  ()','2026-11-03 13:08:46','2026-11-03 08:34:57'),(28,'BOT-20261103074428704',68,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 13:14:28',NULL),(29,'BOT-20261103074429022',69,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 13:14:29',NULL),(30,'BOT-20261103074429374',70,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 13:14:29',NULL),(31,'BOT-20261103074739447',72,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 13:17:39',NULL),(32,'BOT-20261103074740192',61,1,NULL,1,'mixing','normal','Table:  ()','2026-11-03 13:17:40',NULL),(33,'BOT-20261103074740901',37,1,NULL,3,'queued','normal','Table:  ()','2026-11-03 13:17:40',NULL),(34,'BOT-20261103074900371',74,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 13:19:00',NULL),(35,'BOT-20261103074900870',75,1,NULL,1,'mixing','normal','Table:  ()','2026-11-03 13:19:00',NULL),(36,'BOT-20261103074901389',76,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 13:19:01',NULL),(37,'BOT-20261103074924536',75,1,NULL,2,'queued','normal','Table:  ()','2026-11-03 13:19:24',NULL),(38,'BOT-20261103074946281',77,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 13:19:46',NULL),(39,'BOT-20261105075127690',86,1,NULL,1,'queued','normal','Table:  ()','2026-11-05 13:21:27',NULL),(40,'BOT-20261106102440052',34,1,NULL,5,'queued','normal','Table: Table-1 (Main Hall)','2026-11-06 15:54:40',NULL),(41,'BOT-20261106104207012',88,1,NULL,1,'queued','normal','Table: Table-3 (Main Hall)','2026-11-06 16:12:07',NULL);
/*!40000 ALTER TABLE `bar_order_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bar_tabs`
--

DROP TABLE IF EXISTS `bar_tabs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bar_tabs` (
  `tab_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `bar_counter_id` bigint unsigned NOT NULL,
  `tab_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `opened_by` bigint unsigned NOT NULL,
  `order_id` bigint unsigned NOT NULL,
  `preauth_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `card_last4` varchar(4) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('open','closed','merged','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `opened_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`tab_id`),
  UNIQUE KEY `order_id` (`order_id`),
  KEY `fk_tab_counter` (`bar_counter_id`),
  KEY `fk_tab_customer` (`customer_id`),
  KEY `fk_tab_employee` (`opened_by`),
  KEY `idx_tab_status` (`branch_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Running bar counter tabs';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bar_tabs`
--

LOCK TABLES `bar_tabs` WRITE;
/*!40000 ALTER TABLE `bar_tabs` DISABLE KEYS */;
/*!40000 ALTER TABLE `bar_tabs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `branch_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pincode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gstin_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fssai_license_no` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currency_code` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INR',
  `opening_time` time DEFAULT NULL,
  `closing_time` time DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`branch_id`),
  KEY `idx_branches_active` (`is_active`,`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Restaurant branches';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES (1,'Bhanu','100 Feet Road, Indiranagar','Bengaluru','Karnataka','560038','+91 98450 12345','blr.dt@grandpalace.com','36AABCA1234F1Z5','11223344556677','INR','11:00:00','23:30:00',1,NULL,'2026-10-09 15:13:45','2026-11-02 15:31:35',1,NULL),(2,'Grand Palace - Hyderabad Hitech City','Madhapur Main Road','Hyderabad','Telangana','500081','+919876543211','hyd.hitech@grandpalace.com','36ABCDE1234F1Z2','22334455667788','INR','12:00:00','01:00:00',1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL),(3,'Grand Palace - Mumbai Bandra','Linking Road, Bandra West','Mumbai','Maharashtra','400050','+919876543212','mum.bandra@grandpalace.com','27ABCDE1234F1Z9','33445566778899','INR','11:30:00','00:30:00',1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL);
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chart_of_accounts`
--

DROP TABLE IF EXISTS `chart_of_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chart_of_accounts` (
  `account_id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_group` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Assets',
  `account_type` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Current Asset',
  `normal_balance` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Debit',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_system_account` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `uk_coa_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chart_of_accounts`
--

LOCK TABLES `chart_of_accounts` WRITE;
/*!40000 ALTER TABLE `chart_of_accounts` DISABLE KEYS */;
INSERT INTO `chart_of_accounts` VALUES (1,'1001','Cash in Hand','Assets','Current Asset','Debit','Physical cash in restaurant register',1,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(2,'1002','Bank & UPI Collections','Assets','Current Asset','Debit','HDFC / ICICI POS terminal & UPI settled account',1,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(3,'1100','Accounts Receivable','Assets','Current Asset','Debit','Credit customer receivables & pending card settlements',1,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(4,'1200','Kitchen & Bar Inventory Asset','Assets','Current Asset','Debit','Food ingredients, liquor & beverage stock on hand',1,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(5,'1500','Kitchen & Bar Equipment','Assets','Fixed Asset','Debit','Ovens, chillers, espresso machines, POS hardware & furniture',0,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(6,'2001','Accounts Payable (Suppliers)','Liabilities','Current Liability','Credit','Unpaid vendor bills for kitchen & bar stock procurement',1,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(7,'2100','GST & Output Tax Payable','Liabilities','Current Liability','Credit','Collected GST / VAT / Service Tax awaiting remittance',1,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(8,'2200','Salaries & Wages Payable','Liabilities','Current Liability','Credit','Accrued staff payroll obligations',0,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(9,'3001','Owner Capital & Equity','Equity','Equity','Credit','Partners initial capital infusion & ownership equity',1,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(10,'3100','Retained Earnings','Equity','Equity','Credit','Accumulated net profits retained in business',1,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(11,'4001','Food & Dine-In Sales Revenue','Income','Operating Revenue','Credit','Dine-in, takeaway and delivery food sales net of GST',1,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(12,'4002','Bar & Beverage Sales Revenue','Income','Operating Revenue','Credit','Cocktails, liquor, beer, wine and bar counter sales',1,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(13,'4003','Service Charge & Other Income','Income','Operating Revenue','Credit','Service charges, corkage & miscellaneous revenue',1,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(14,'5001','Inventory & COGS Purchases','Expenses','Cost of Goods Sold','Debit','Raw ingredients, liquor restocking & direct kitchen/bar purchases',1,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(15,'5002','Staff Salaries & Payroll','Expenses','Operating Expense','Debit','Monthly wages, incentives and chef/waiter payroll',1,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(16,'5003','Utilities, Rent & Petty Expenses','Expenses','Operating Expense','Debit','Electricity, gas, rent, cleaning & petty cash overheads',0,1,'2026-11-09 06:13:11','2026-11-09 06:13:11'),(17,'5004','Depreciation Expense','Expenses','Non-Cash Expense','Debit','Periodic depreciation of kitchen, bar and POS fixed assets',0,1,'2026-11-09 06:13:11','2026-11-09 06:13:11');
/*!40000 ALTER TABLE `chart_of_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `customer_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `anniversary_date` date DEFAULT NULL,
  `gstin` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pincode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `loyalty_points` int NOT NULL DEFAULT '0',
  `last_login` datetime DEFAULT NULL,
  `registered_branch_id` bigint unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `phone_active` varchar(20) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (if((`deleted_at` is null),`phone`,NULL)) VIRTUAL,
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `uq_customer_phone_active` (`phone_active`),
  KEY `fk_cust_branch` (`registered_branch_id`),
  KEY `idx_customers_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customers & loyalty details';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` (`customer_id`, `full_name`, `phone`, `email`, `password_hash`, `gender`, `dob`, `anniversary_date`, `gstin`, `address_line`, `city`, `pincode`, `loyalty_points`, `last_login`, `registered_branch_id`, `is_active`, `deleted_at`, `created_at`, `updated_at`, `created_by`, `updated_by`, `branch_id`, `outlet_id`) VALUES (1,'Rahul Dravid','+919845012345','rahul.d@gmail.com',NULL,'male','1973-01-11','2003-05-04',NULL,'Plot 45, Defense Colony, Indiranagar','Bengaluru','560038',456,NULL,1,1,NULL,'2026-10-09 15:13:45','2026-11-11 10:02:46',1,NULL,NULL,1),(2,'Infosys Enterprise Guest','+919845067890','corporate.travel@infosys.com',NULL,'other',NULL,NULL,'29AAACI4567J1Z8','Electronics City Phase 1','Bengaluru','560100',1212,NULL,1,1,NULL,'2026-10-09 15:13:45','2026-11-11 10:03:01',1,NULL,NULL,1),(3,'Sneha Reddy','+919845099887','sneha.reddy@yahoo.com',NULL,'female','1995-10-24','2022-11-18',NULL,'Flat 302, Green Glen Layout, Bellandur','Bengaluru','560103',180,NULL,1,1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,NULL,1),(4,'Rajesh Test','9988776655','rajesh@test.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,1,NULL,'2026-10-12 13:07:03','2026-10-12 13:07:03',NULL,NULL,NULL,1),(5,'Kishore Kumar','9848012345','kishore@avsr.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,1,NULL,'2026-10-12 13:09:47','2026-10-12 13:09:47',NULL,NULL,NULL,1),(7,'Suresh Raina','9959518717','suresh@raina.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,1,NULL,'2026-10-12 13:12:54','2026-10-12 13:12:54',NULL,NULL,NULL,1),(8,'Sunil Gavaskar','9932099772','sunil@cricket.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,1,NULL,'2026-10-12 13:14:38','2026-10-12 13:14:38',NULL,NULL,NULL,1),(10,'Test SoftDelete Customer','+91 99999 77777','customer@test.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,0,'2026-10-16 13:01:18','2026-10-16 13:01:18','2026-10-16 13:01:18',NULL,NULL,NULL,1),(11,'Virat Kohli','+919888877777',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,1,1,NULL,'2026-10-16 13:47:05','2026-10-16 13:47:05',NULL,NULL,NULL,1),(12,'Rohit Sharma','+919777766666',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,1,1,NULL,'2026-10-16 13:47:14','2026-10-16 13:47:14',NULL,NULL,NULL,1),(13,'Mr. Test Guest','+91 98888 77777',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,1,1,NULL,'2026-10-21 16:34:34','2026-10-21 16:34:34',NULL,NULL,NULL,1),(14,'Integration Test Customer 1793612202220','9873281815','test1793612202220@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,0,'2026-11-02 15:06:42','2026-11-02 15:06:42','2026-11-02 15:06:42',NULL,NULL,NULL,1),(15,'Integration Test Customer 1793612355455','9825705467','test1793612355456@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,0,'2026-11-02 15:09:15','2026-11-02 15:09:15','2026-11-02 15:09:15',NULL,NULL,NULL,1),(43,'Suresh Kumar1','9988776695','suresh.kumar1@example.com','$2y$10$e8YqJpABCDEF1234567890abckef',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-11-11 09:43:09',1,1,NULL,'2026-11-11 09:42:53','2026-11-11 09:43:09',NULL,NULL,NULL,1);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `daily_cash_bank_registers`
--

DROP TABLE IF EXISTS `daily_cash_bank_registers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_cash_bank_registers` (
  `register_id` bigint NOT NULL AUTO_INCREMENT,
  `business_date` datetime NOT NULL,
  `opening_cash_float` decimal(18,2) NOT NULL DEFAULT '0.00',
  `opening_bank_balance` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_opening_balance` decimal(18,2) NOT NULL DEFAULT '0.00',
  `physical_cash_count` decimal(18,2) DEFAULT NULL,
  `denominations_json` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cash_variance` decimal(18,2) DEFAULT NULL,
  `shift_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Open',
  `shift_opened_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `shift_closed_at` datetime DEFAULT NULL,
  `opened_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
  `closed_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`register_id`),
  UNIQUE KEY `uk_daily_reg_date` (`business_date`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_cash_bank_registers`
--

LOCK TABLES `daily_cash_bank_registers` WRITE;
/*!40000 ALTER TABLE `daily_cash_bank_registers` DISABLE KEYS */;
INSERT INTO `daily_cash_bank_registers` VALUES (1,'2026-11-09 00:00:00',5000.00,25000.00,30000.00,NULL,NULL,NULL,'Open','2026-11-09 08:00:00',NULL,'pirnav',NULL,'Brought forward at 08:00 AM shift start','2026-11-09 06:13:11','2026-11-09 06:13:11');
/*!40000 ALTER TABLE `daily_cash_bank_registers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_orders`
--

DROP TABLE IF EXISTS `delivery_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_orders` (
  `delivery_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `partner_id` bigint unsigned DEFAULT NULL,
  `customer_id` bigint unsigned NOT NULL DEFAULT '1',
  `delivery_address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivery_city` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delivery_pincode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delivery_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delivery_otp` varchar(6) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `driver_latitude` decimal(10,7) DEFAULT NULL,
  `driver_longitude` decimal(10,7) DEFAULT NULL,
  `delivery_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` enum('assigned','picked','on_the_way','delivered','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'assigned',
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `delivered_at` datetime DEFAULT NULL,
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `delivery_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `delivery_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DISPATCHED',
  PRIMARY KEY (`delivery_id`),
  UNIQUE KEY `order_id` (`order_id`),
  KEY `fk_do_partner` (`partner_id`),
  KEY `fk_do_customer` (`customer_id`),
  KEY `idx_do_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Delivery tracking';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_orders`
--

LOCK TABLES `delivery_orders` WRITE;
/*!40000 ALTER TABLE `delivery_orders` DISABLE KEYS */;
INSERT INTO `delivery_orders` VALUES (1,2,5,3,'Flat 302, Green Glen Layout, Bellandur','Bengaluru','560103','+919845099887','482910',12.9279232,77.6749321,40.00,'delivered','2026-10-09 20:20:00','2026-10-09 20:55:00',NULL,1,NULL,NULL,'2026-10-09 15:20:23','2026-10-09 15:20:44','','','DISPATCHED'),(2,32,NULL,1,'Block B, Hyderabad',NULL,NULL,NULL,NULL,NULL,NULL,0.00,'assigned','2026-11-02 15:09:15',NULL,NULL,1,NULL,NULL,'2026-11-02 15:09:15','2026-11-02 15:09:15','Delivery Tester','9845000000','DELIVERED');
/*!40000 ALTER TABLE `delivery_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dining_sections`
--

DROP TABLE IF EXISTS `dining_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dining_sections` (
  `section_id` bigint NOT NULL AUTO_INCREMENT,
  `outlet_id` bigint DEFAULT '1',
  `section_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `branch_id` bigint DEFAULT NULL,
  PRIMARY KEY (`section_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dining_sections`
--

LOCK TABLES `dining_sections` WRITE;
/*!40000 ALTER TABLE `dining_sections` DISABLE KEYS */;
INSERT INTO `dining_sections` VALUES (1,1,'Main Hall',1,0,'2026-10-12 12:56:26',NULL,NULL,NULL,1),(2,1,'AC Family Hall',1,0,'2026-10-12 12:56:26',NULL,NULL,NULL,1),(3,1,'Rooftop Lounge',1,0,'2026-10-12 12:56:26',NULL,NULL,NULL,1);
/*!40000 ALTER TABLE `dining_sections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dining_tables`
--

DROP TABLE IF EXISTS `dining_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dining_tables` (
  `dining_table_id` bigint NOT NULL AUTO_INCREMENT,
  `section_id` bigint DEFAULT '1',
  `table_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `seating_capacity` int NOT NULL DEFAULT '4',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Vacant',
  `assigned_waiter_id` bigint DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  PRIMARY KEY (`dining_table_id`)
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dining_tables`
--

LOCK TABLES `dining_tables` WRITE;
/*!40000 ALTER TABLE `dining_tables` DISABLE KEYS */;
INSERT INTO `dining_tables` VALUES (1,1,'Table-1',6,'occupied',NULL,1,0,'2026-10-12 12:56:26','2026-11-06 15:56:43',NULL,NULL,1,1),(2,1,'Table-2',5,'occupied',NULL,1,0,'2026-10-12 12:56:26','2026-11-10 15:18:08',NULL,NULL,1,1),(3,1,'Table-3',4,'occupied',NULL,1,0,'2026-10-12 12:56:26','2026-11-10 11:27:33',NULL,NULL,1,1),(4,1,'Table-4',6,'vacant',NULL,1,0,'2026-10-12 12:56:26','2026-11-06 09:59:45',NULL,NULL,1,1),(5,1,'Table-5',2,'occupied',NULL,1,0,'2026-10-12 12:56:26','2026-11-04 11:55:04',NULL,NULL,1,1),(6,1,'Table-6',10,'occupied',NULL,1,0,'2026-10-12 12:56:26','2026-11-04 17:19:55',NULL,NULL,1,1),(7,1,'Table-7',8,'occupied',NULL,1,0,'2026-10-12 12:56:26','2026-11-03 07:49:00',NULL,NULL,1,1),(8,1,'Table-8',8,'occupied',NULL,1,0,'2026-10-12 12:56:26','2026-11-03 07:12:07',NULL,NULL,1,1),(9,1,'Table-9',4,'occupied',NULL,1,0,'2026-10-12 12:56:26','2026-11-03 07:12:20',NULL,NULL,1,1),(10,1,'Table-10',4,'occupied',NULL,1,0,'2026-10-12 12:56:26','2026-11-03 07:12:38',NULL,NULL,1,1),(11,1,'Table-11',4,'available',NULL,0,1,'0001-01-01 00:00:00','2026-10-22 10:08:05',NULL,NULL,NULL,1),(12,1,'Table-12',4,'occupied',NULL,1,0,'0001-01-01 00:00:00','2026-11-03 07:44:29',NULL,NULL,NULL,1),(13,1,'Table-13',6,'occupied',NULL,1,0,'2026-10-21 10:41:02','2026-11-03 07:44:29',NULL,NULL,1,1),(14,1,'Table-14',4,'occupied',NULL,1,0,'2026-10-21 10:41:02','2026-11-06 16:01:32',NULL,NULL,1,1),(15,1,'Table-15',4,'occupied',NULL,1,0,'2026-10-21 10:41:02','2026-11-03 07:49:01',NULL,NULL,1,1),(54,1,'Table 16',4,'vacant',NULL,0,1,'2026-10-21 18:00:57','2026-10-22 09:57:36',NULL,NULL,1,1),(55,1,'Table 16',8,'occupied',NULL,1,0,'2026-10-22 10:10:25','2026-11-03 07:44:29',NULL,NULL,1,1),(56,1,'Table 11',4,'occupied',NULL,1,0,'2026-10-22 11:01:58','2026-11-03 07:20:30',NULL,NULL,1,1),(57,1,'Table 17',6,'occupied',NULL,1,0,'2026-10-29 17:41:13','2026-11-03 07:44:28',NULL,NULL,1,1),(59,1,'Table-20',8,'vacant',NULL,1,0,'2026-11-10 11:59:53','2026-11-10 11:59:53',NULL,NULL,1,1);
/*!40000 ALTER TABLE `dining_tables` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_shifts`
--

DROP TABLE IF EXISTS `employee_shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_shifts` (
  `emp_shift_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `shift_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `shift_date` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`emp_shift_id`),
  UNIQUE KEY `uq_emp_shift` (`employee_id`,`shift_date`,`shift_name`),
  KEY `idx_shifts_branch_date` (`branch_id`,`shift_date`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Employee shift allocation';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_shifts`
--

LOCK TABLES `employee_shifts` WRITE;
/*!40000 ALTER TABLE `employee_shifts` DISABLE KEYS */;
INSERT INTO `employee_shifts` VALUES (1,1,1,'General Shift','10:00:00','19:00:00','2026-10-09','2026-10-09 15:13:45'),(2,2,1,'Lunch Shift','11:00:00','16:00:00','2026-10-09','2026-10-09 15:13:45'),(3,3,1,'Dinner Kitchen Shift','16:00:00','00:30:00','2026-10-09','2026-10-09 15:13:45'),(4,4,1,'Dinner Floor Shift','17:00:00','23:30:00','2026-10-09','2026-10-09 15:13:45'),(5,5,1,'Night Delivery Shift','18:00:00','01:00:00','2026-10-09','2026-10-09 15:13:45'),(6,17,1,'Morning Shift (10 AM - 4 PM)','10:00:00','16:00:00','2026-10-12','2026-10-12 14:43:24');
/*!40000 ALTER TABLE `employee_shifts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `employee_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `employee_code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `joining_date` date DEFAULT NULL,
  `designation` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salary` decimal(10,2) DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_delivery_partner` tinyint(1) NOT NULL DEFAULT '0',
  `vehicle_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`employee_id`),
  UNIQUE KEY `employee_code` (`employee_code`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_employees_branch_active` (`branch_id`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Restaurant staff & riders';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES (1,2,1,'EMP-BLR-001','Vikramaditya Sharma','+919000000002','vikram@grandpalace.com','male','1985-06-15','2023-01-10','General Manager',85000.00,'Koramangala 4th Block, Bengaluru',0,NULL,1,1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL),(2,3,1,'EMP-BLR-002','Pooja Hegde','+919000000003','pooja.h@grandpalace.com','female','1996-03-22','2024-02-01','Lead Cashier',32000.00,'Ulsoor, Bengaluru',0,NULL,1,1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL),(3,4,1,'EMP-BLR-003','Chef Sanjeev Nambiar','+919000000004','sanjeev.n@grandpalace.com','male','1982-11-09','2023-01-15','Executive Head Chef',75000.00,'Indiranagar 2nd Stage, Bengaluru',0,NULL,1,1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL),(4,5,1,'EMP-BLR-004','Ramesh Kumar','+919000000005','ramesh.k@grandpalace.com','male','1999-08-30','2024-05-10','Senior Captain Waiter',22000.00,'Domlur, Bengaluru',0,NULL,1,1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL),(5,6,1,'EMP-BLR-005','Kiran Gowda','+919000000006','kiran.g@grandpalace.com','male','2001-01-14','2024-06-01','Delivery Executive',18000.00,'Murugeshpalya, Bengaluru',1,'KA-03-HA-8899',1,1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL),(6,NULL,1,'EMP-BLR-011','Rajesh K.','+91 98450 11223',NULL,NULL,NULL,NULL,'Senior Captain',NULL,NULL,0,NULL,1,1,NULL,'2026-10-09 09:56:43','2026-10-09 09:56:43',NULL,NULL),(7,NULL,1,'EMP-BLR-012','Vikram S.','+91 98450 44556',NULL,NULL,NULL,NULL,'Head Waiter',NULL,NULL,0,NULL,1,1,NULL,'2026-10-09 09:56:43','2026-10-09 09:56:43',NULL,NULL),(8,NULL,1,'EMP-BLR-013','Ananya R.','+91 98450 77889',NULL,NULL,NULL,NULL,'Stewardess',NULL,NULL,0,NULL,1,1,NULL,'2026-10-09 09:56:43','2026-10-09 09:56:43',NULL,NULL),(9,NULL,1,'EMP-BLR-014','Pooja M.','+91 98450 99001',NULL,NULL,NULL,NULL,'Captain',NULL,NULL,0,NULL,1,1,NULL,'2026-10-09 09:56:43','2026-10-09 09:56:43',NULL,NULL),(10,NULL,1,'EMP-BLR-015','Suresh N.','+91 98450 33445',NULL,NULL,NULL,NULL,'Server / Waiter',NULL,NULL,0,NULL,1,1,NULL,'2026-10-09 09:56:43','2026-10-09 09:56:43',NULL,NULL),(11,NULL,1,'EMP-BLR-016','Karan D.','+91 98450 66778',NULL,NULL,NULL,NULL,'VIP Lounge Captain',NULL,NULL,0,NULL,1,1,NULL,'2026-10-09 09:56:43','2026-10-09 09:56:43',NULL,NULL),(12,NULL,1,'EMP-BLR-019','Vishnu kumar','9867543232',NULL,NULL,NULL,NULL,'Server / Waiter',NULL,NULL,0,NULL,1,1,NULL,'2026-10-12 12:45:35','2026-10-12 12:45:35',NULL,NULL),(13,NULL,1,'EMP-BLR-020','Anish A.','9865738349',NULL,NULL,NULL,NULL,'Server / Waiter',NULL,NULL,0,NULL,1,1,NULL,'2026-10-12 12:46:04','2026-10-12 12:46:04',NULL,NULL),(14,NULL,1,'EMP-BLR-021','K Vishnu Verified','9875373872',NULL,NULL,NULL,NULL,'Captain',NULL,NULL,0,NULL,1,1,NULL,'2026-10-12 13:10:37','2026-10-12 13:10:37',NULL,NULL),(15,NULL,1,'EMP-BLR-022','K Vishnu Captain','9875373872',NULL,NULL,NULL,NULL,'Captain',NULL,NULL,0,NULL,1,1,NULL,'2026-10-12 13:12:53','2026-10-12 13:12:53',NULL,NULL),(16,NULL,1,'EMP-BLR-023','Anish A.','9845673218',NULL,NULL,NULL,NULL,'Server / Waiter',NULL,NULL,0,NULL,1,1,NULL,'2026-10-12 14:21:46','2026-10-12 14:21:46',NULL,NULL),(17,NULL,1,'EMP-BLR-017','K Vishnu Test','9875373999',NULL,NULL,NULL,NULL,'Captain',NULL,NULL,0,NULL,1,1,NULL,'2026-10-12 14:43:24','2026-10-12 14:43:24',NULL,NULL);
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ingredients`
--

DROP TABLE IF EXISTS `ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingredients` (
  `ingredient_id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'KG',
  `current_stock` decimal(18,2) NOT NULL DEFAULT '0.00',
  `minimum_threshold` decimal(18,2) NOT NULL DEFAULT '5.00',
  `unit_cost` decimal(18,2) NOT NULL DEFAULT '0.00',
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'General',
  `subcategory` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `supplier` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Local Supplier',
  `mrp` decimal(18,2) DEFAULT '0.00',
  `ingredient_code` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `ingredient_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `cost_per_unit` decimal(18,2) NOT NULL DEFAULT '0.00',
  `reorder_level` decimal(18,2) NOT NULL DEFAULT '5.00',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `used_quantity` decimal(18,2) NOT NULL DEFAULT '0.00',
  `item_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`ingredient_id`)
) ENGINE=InnoDB AUTO_INCREMENT=844 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ingredients`
--

LOCK TABLES `ingredients` WRITE;
/*!40000 ALTER TABLE `ingredients` DISABLE KEYS */;
INSERT INTO `ingredients` VALUES (1,'Johnnie Walker Black Label','BOTTLE (750 ML)',216.00,5.00,2800.00,'Scotch','Single Malt Scotch','Diageo Direct',3800.00,NULL,1,'2026-11-06 12:15:28',NULL,1,NULL,NULL,'Johnnie Walker Black Label',2800.00,5.00,'2026-11-05 07:32:46',3.00,NULL,NULL),(2,'Absolut Vodka','BOTTLE',144.00,5.00,1900.00,'Vodka & Gin','General Supplies','Pernod Ricard',2600.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Absolut Vodka',1900.00,5.00,'2026-11-05 07:32:46',0.00,NULL,NULL),(3,'Corona Extra Beer','BOTTLE',960.00,5.00,180.00,'Beer','General Supplies','Anheuser-Busch',300.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Corona Extra Beer',180.00,5.00,'2026-11-05 07:32:46',0.00,NULL,NULL),(4,'Sula Cabernet Shiraz','BOTTLE',240.00,5.00,950.00,'Wine','General Supplies','Sula Vineyards',1500.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Sula Cabernet Shiraz',950.00,5.00,'2026-11-05 07:32:46',0.00,NULL,NULL),(5,'Basmati Biryani Rice','KG',1600.00,5.00,95.00,'Grains & Rice','Basmati Biryani Rice','Royal Grains Ltd',120.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Basmati Biryani Rice',95.00,5.00,'2026-11-05 07:32:46',0.00,NULL,NULL),(6,'Fresh Paneer','KG',24.00,5.00,320.00,'Dairy & Cheeses','Fresh Malai Paneer','Dairy Fresh Co',400.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Fresh Paneer',320.00,5.00,'2026-11-05 07:32:46',0.00,NULL,NULL),(7,'Fresh Mint Leaves','GM',0.00,5.00,0.20,'Garnishes','General Supplies','Local Green Market',0.50,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Fresh Mint Leaves',0.20,5.00,'2026-11-05 07:32:46',0.00,NULL,NULL),(8,'Test Glenfiddich 12 Single Malt Scotch','Bottle',30.00,8.00,3500.00,'Whiskey','','Direct Highland Import',4800.00,NULL,0,'2026-11-05 07:32:57',NULL,1,NULL,NULL,'Test Glenfiddich 12 Single Malt Scotch',3500.00,8.00,'2026-11-05 07:32:57',5.00,'','2026-11-05 07:32:57'),(9,'Test Glenfiddich 12 Single Malt Scotch','Bottle',30.00,8.00,3500.00,'Whiskey','','Direct Highland Import',4800.00,NULL,0,'2026-11-05 07:36:48',NULL,1,NULL,NULL,'Test Glenfiddich 12 Single Malt Scotch',3500.00,8.00,'2026-11-05 07:36:48',5.00,'','2026-11-05 07:36:48'),(10,'Test Glenfiddich 12 Single Malt Scotch','Bottle',30.00,8.00,3500.00,'Whiskey','','Direct Highland Import',4800.00,NULL,0,'2026-11-05 07:41:00',NULL,1,NULL,NULL,'Test Glenfiddich 12 Single Malt Scotch',3500.00,8.00,'2026-11-05 07:41:00',5.00,'','2026-11-05 07:41:01'),(11,'Test Glenfiddich 12 Single Malt Scotch','Bottle',30.00,8.00,3500.00,'Whiskey','','Direct Highland Import',4800.00,NULL,0,'2026-11-05 08:02:47',NULL,1,NULL,NULL,'Test Glenfiddich 12 Single Malt Scotch',3500.00,8.00,'2026-11-05 08:02:46',5.00,'','2026-11-05 08:02:47'),(12,'Basmati Rice','KG',800.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-06 03:51:12',0.00,'',NULL),(13,'Basmati Biryani Rice','KG',15600.00,10.00,120.00,'Grains & Rice','Basmati Biryani Rice','Royal Grains Ltd',120.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Basmati Biryani Rice',120.00,10.00,'2026-11-06 03:51:12',0.00,'',NULL),(14,'Fresh Paneer','KG',3200.00,10.00,360.00,'Dairy & Eggs','','Local Supplier',360.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Fresh Paneer',360.00,10.00,'2026-11-06 03:51:12',0.00,'',NULL),(15,'Raw Chicken','KG',7200.00,5.00,280.00,'Meat & Seafood','General Supplies','Local Supplier',280.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Raw Chicken',280.00,5.00,'2026-11-06 03:51:12',0.00,'',NULL),(16,'Cooking Butter & Cream','KG',3200.00,5.00,550.00,'Dairy & Eggs','General Supplies','Local Supplier',550.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Cooking Butter & Cream',550.00,5.00,'2026-11-06 03:51:12',0.00,'',NULL),(17,'Cooking Oil','L',7200.00,5.00,180.00,'Oils & Condiments','General Supplies','Local Supplier',180.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Cooking Oil',180.00,5.00,'2026-11-06 03:51:12',0.00,'',NULL),(18,'Onions','KG',6400.00,5.00,40.00,'Vegetables & Fresh Produce','Onions','Local Supplier',40.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Onions',40.00,5.00,'2026-11-06 03:51:13',0.00,'',NULL),(19,'Onions','KG',17600.00,10.00,40.00,'Vegetables & Fresh Produce','Onions','Local Supplier',40.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Onions',40.00,10.00,'2026-11-06 03:51:13',0.00,'',NULL),(20,'Garam Masala Spices','KG',3200.00,5.00,250.00,'Spices & Seasoning','General Supplies','Local Supplier',250.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Garam Masala Spices',250.00,5.00,'2026-11-06 03:51:13',0.00,'',NULL),(21,'Biryani Spices & Masala','KG',7200.00,5.00,250.00,'Spices & Seasoning','General Supplies','Local Supplier',250.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Biryani Spices & Masala',250.00,5.00,'2026-11-06 03:51:13',0.00,'',NULL),(22,'Tomato & Onion Gravy','KG',1200.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-06 04:30:14',0.00,'',NULL),(23,'Onions & Mint','KG',750.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 05:04:53',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-06 05:04:52',0.00,'',NULL),(24,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-06 15:40:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-06 15:40:28',0.00,'',NULL),(25,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-06 15:40:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-06 15:40:28',0.00,'',NULL),(26,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 15:40:28',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-06 15:40:28',0.00,'',NULL),(27,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-06 15:40:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-06 15:40:28',0.00,'',NULL),(28,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-06 15:40:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-06 15:40:28',0.00,'',NULL),(29,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 15:40:28',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-06 15:40:28',0.00,'',NULL),(30,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(31,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(32,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(33,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(34,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(35,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(36,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(37,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(38,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(39,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(40,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(41,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(42,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(43,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(44,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(45,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(46,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(47,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(48,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 15:55:25',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-06 15:55:25',0.00,'',NULL),(49,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-06 15:55:26',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-06 15:55:26',0.00,'',NULL),(50,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:29:38',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:29:38',0.00,'',NULL),(51,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:40:44',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:40:44',0.00,'',NULL),(52,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:40:44',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:40:44',0.00,'',NULL),(53,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:40:44',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:40:44',0.00,'',NULL),(54,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:40:44',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:40:44',0.00,'',NULL),(55,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:40:45',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:40:45',0.00,'',NULL),(56,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:40:45',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:40:45',0.00,'',NULL),(57,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:40:45',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:40:45',0.00,'',NULL),(58,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:40:45',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:40:45',0.00,'',NULL),(59,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:45:37',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:45:37',0.00,'',NULL),(60,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:49:51',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:49:51',0.00,'',NULL),(61,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:49:52',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:49:52',0.00,'',NULL),(62,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:49:52',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:49:52',0.00,'',NULL),(63,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:49:52',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:49:52',0.00,'',NULL),(64,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:49:52',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:49:52',0.00,'',NULL),(65,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:49:56',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:49:56',0.00,'',NULL),(66,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:49:56',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:49:56',0.00,'',NULL),(67,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:49:56',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:49:56',0.00,'',NULL),(68,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:49:56',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:49:56',0.00,'',NULL),(69,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:49:56',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:49:56',0.00,'',NULL),(70,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:49:56',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:49:56',0.00,'',NULL),(71,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:49:57',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:49:57',0.00,'',NULL),(72,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:49:58',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:49:58',0.00,'',NULL),(73,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:49:58',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:49:58',0.00,'',NULL),(74,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:00',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:00',0.00,'',NULL),(75,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:00',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:00',0.00,'',NULL),(76,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:00',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:00',0.00,'',NULL),(77,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:01',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:01',0.00,'',NULL),(78,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:02',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:50:02',0.00,'',NULL),(79,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:03',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:03',0.00,'',NULL),(80,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:03',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:03',0.00,'',NULL),(81,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:03',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:03',0.00,'',NULL),(82,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:04',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:04',0.00,'',NULL),(83,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:05',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:50:05',0.00,'',NULL),(84,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:05',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:05',0.00,'',NULL),(85,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:06',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:06',0.00,'',NULL),(86,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:06',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:06',0.00,'',NULL),(87,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:06',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:06',0.00,'',NULL),(88,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:11',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:11',0.00,'',NULL),(89,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:11',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:11',0.00,'',NULL),(90,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:11',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:11',0.00,'',NULL),(91,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:11',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:11',0.00,'',NULL),(92,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:11',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:11',0.00,'',NULL),(93,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:12',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:12',0.00,'',NULL),(94,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:12',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:12',0.00,'',NULL),(95,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:12',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:12',0.00,'',NULL),(96,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:13',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:13',0.00,'',NULL),(97,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:13',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:13',0.00,'',NULL),(98,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:14',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:14',0.00,'',NULL),(99,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:14',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:14',0.00,'',NULL),(100,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:15',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:15',0.00,'',NULL),(101,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:15',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:15',0.00,'',NULL),(102,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:17',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:17',0.00,'',NULL),(103,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:18',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:18',0.00,'',NULL),(104,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:20',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:20',0.00,'',NULL),(105,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:20',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:20',0.00,'',NULL),(106,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:20',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:20',0.00,'',NULL),(107,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:21',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:21',0.00,'',NULL),(108,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:22',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:22',0.00,'',NULL),(109,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:23',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:23',0.00,'',NULL),(110,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:23',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:23',0.00,'',NULL),(111,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:24',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:24',0.00,'',NULL),(112,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:25',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:25',0.00,'',NULL),(113,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:25',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:25',0.00,'',NULL),(114,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:26',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:26',0.00,'',NULL),(115,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:26',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:26',0.00,'',NULL),(116,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:27',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:50:27',0.00,'',NULL),(117,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:27',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:27',0.00,'',NULL),(118,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:28',0.00,'',NULL),(119,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:28',0.00,'',NULL),(120,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:29',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:50:29',0.00,'',NULL),(121,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:29',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:29',0.00,'',NULL),(122,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:30',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:30',0.00,'',NULL),(123,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:30',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:30',0.00,'',NULL),(124,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:30',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:50:30',0.00,'',NULL),(125,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:31',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:31',0.00,'',NULL),(126,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:31',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:31',0.00,'',NULL),(127,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:32',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:32',0.00,'',NULL),(128,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:32',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:50:32',0.00,'',NULL),(129,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:34',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:34',0.00,'',NULL),(130,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:35',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:35',0.00,'',NULL),(131,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:36',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:36',0.00,'',NULL),(132,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:36',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:36',0.00,'',NULL),(133,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:38',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:38',0.00,'',NULL),(134,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:38',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:38',0.00,'',NULL),(135,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:39',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:39',0.00,'',NULL),(136,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:39',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:39',0.00,'',NULL),(137,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:39',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:39',0.00,'',NULL),(138,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:40',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:40',0.00,'',NULL),(139,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:41',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:41',0.00,'',NULL),(140,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:41',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:41',0.00,'',NULL),(141,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:42',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:42',0.00,'',NULL),(142,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:42',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:42',0.00,'',NULL),(143,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:43',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:50:43',0.00,'',NULL),(144,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:43',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:43',0.00,'',NULL),(145,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:43',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:43',0.00,'',NULL),(146,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:43',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:43',0.00,'',NULL),(147,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:44',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:44',0.00,'',NULL),(148,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:44',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:50:44',0.00,'',NULL),(149,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:44',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:44',0.00,'',NULL),(150,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:45',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:45',0.00,'',NULL),(151,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:45',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:45',0.00,'',NULL),(152,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:45',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:45',0.00,'',NULL),(153,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:46',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:50:46',0.00,'',NULL),(154,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:46',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:46',0.00,'',NULL),(155,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:46',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:46',0.00,'',NULL),(156,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:46',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:46',0.00,'',NULL),(157,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:47',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:47',0.00,'',NULL),(158,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:47',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:47',0.00,'',NULL),(159,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:47',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:47',0.00,'',NULL),(160,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:49',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:49',0.00,'',NULL),(161,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:50',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:50',0.00,'',NULL),(162,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:50',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:50',0.00,'',NULL),(163,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:51',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:51',0.00,'',NULL),(164,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:51',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:51',0.00,'',NULL),(165,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:51',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:51',0.00,'',NULL),(166,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:52',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:52',0.00,'',NULL),(167,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:52',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:52',0.00,'',NULL),(168,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:52',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:52',0.00,'',NULL),(169,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:52',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:52',0.00,'',NULL),(170,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:53',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:53',0.00,'',NULL),(171,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:54',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:54',0.00,'',NULL),(172,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:54',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:54',0.00,'',NULL),(173,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:55',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:55',0.00,'',NULL),(174,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:55',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:55',0.00,'',NULL),(175,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:56',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:56',0.00,'',NULL),(176,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:56',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:56',0.00,'',NULL),(177,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:56',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:50:56',0.00,'',NULL),(178,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:56',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:56',0.00,'',NULL),(179,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:57',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:57',0.00,'',NULL),(180,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:57',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:57',0.00,'',NULL),(181,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:57',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:57',0.00,'',NULL),(182,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:58',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:50:58',0.00,'',NULL),(183,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:58',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:58',0.00,'',NULL),(184,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:58',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:58',0.00,'',NULL),(185,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:50:58',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:50:58',0.00,'',NULL),(186,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:59',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:59',0.00,'',NULL),(187,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:59',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:50:59',0.00,'',NULL),(188,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:50:59',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:50:59',0.00,'',NULL),(189,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:00',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:00',0.00,'',NULL),(190,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:00',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:00',0.00,'',NULL),(191,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:02',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:02',0.00,'',NULL),(192,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:02',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:02',0.00,'',NULL),(193,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:02',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:02',0.00,'',NULL),(194,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:03',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:03',0.00,'',NULL),(195,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:03',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:03',0.00,'',NULL),(196,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:04',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:04',0.00,'',NULL),(197,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:04',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:04',0.00,'',NULL),(198,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:05',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:05',0.00,'',NULL),(199,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:06',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:06',0.00,'',NULL),(200,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:07',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:07',0.00,'',NULL),(201,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:07',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:07',0.00,'',NULL),(202,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:08',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:08',0.00,'',NULL),(203,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:08',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:08',0.00,'',NULL),(204,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:08',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:08',0.00,'',NULL),(205,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:09',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:09',0.00,'',NULL),(206,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:09',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:09',0.00,'',NULL),(207,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:10',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:10',0.00,'',NULL),(208,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:10',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:51:10',0.00,'',NULL),(209,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:10',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:10',0.00,'',NULL),(210,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:11',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:11',0.00,'',NULL),(211,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:11',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:11',0.00,'',NULL),(212,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:12',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:12',0.00,'',NULL),(213,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:12',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:12',0.00,'',NULL),(214,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:13',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:51:13',0.00,'',NULL),(215,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:13',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:13',0.00,'',NULL),(216,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:13',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:13',0.00,'',NULL),(217,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:13',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:13',0.00,'',NULL),(218,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:13',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:13',0.00,'',NULL),(219,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:14',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:51:14',0.00,'',NULL),(220,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:14',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:14',0.00,'',NULL),(221,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:14',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:14',0.00,'',NULL),(222,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:18',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:18',0.00,'',NULL),(223,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:18',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:18',0.00,'',NULL),(224,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:19',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:19',0.00,'',NULL),(225,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:20',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:20',0.00,'',NULL),(226,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:21',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:21',0.00,'',NULL),(227,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:21',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:21',0.00,'',NULL),(228,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:22',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:22',0.00,'',NULL),(229,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:23',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:23',0.00,'',NULL),(230,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:24',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:24',0.00,'',NULL),(231,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:25',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:25',0.00,'',NULL),(232,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:26',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:26',0.00,'',NULL),(233,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:26',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:26',0.00,'',NULL),(234,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:27',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:27',0.00,'',NULL),(235,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:27',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:51:27',0.00,'',NULL),(236,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:28',0.00,'',NULL),(237,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:28',0.00,'',NULL),(238,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:28',0.00,'',NULL),(239,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:28',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:28',0.00,'',NULL),(240,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:29',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:51:29',0.00,'',NULL),(241,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:29',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:29',0.00,'',NULL),(242,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:30',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:30',0.00,'',NULL),(243,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:30',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:30',0.00,'',NULL),(244,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:31',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:31',0.00,'',NULL),(245,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:32',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:32',0.00,'',NULL),(246,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:32',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:32',0.00,'',NULL),(247,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:32',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:32',0.00,'',NULL),(248,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:51:32',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:51:32',0.00,'',NULL),(249,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:32',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:32',0.00,'',NULL),(250,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:32',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:51:32',0.00,'',NULL),(251,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:33',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:33',0.00,'',NULL),(252,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:33',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:33',0.00,'',NULL),(253,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:42',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:42',0.00,'',NULL),(254,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:51:59',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:51:59',0.00,'',NULL),(255,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:01',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:01',0.00,'',NULL),(256,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:01',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:01',0.00,'',NULL),(257,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:01',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:01',0.00,'',NULL),(258,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:01',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:01',0.00,'',NULL),(259,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:02',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:02',0.00,'',NULL),(260,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:03',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:03',0.00,'',NULL),(261,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:04',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:04',0.00,'',NULL),(262,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:05',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:05',0.00,'',NULL),(263,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:05',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:05',0.00,'',NULL),(264,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:06',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:06',0.00,'',NULL),(265,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:08',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:52:08',0.00,'',NULL),(266,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:09',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:09',0.00,'',NULL),(267,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:09',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:09',0.00,'',NULL),(268,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:10',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:10',0.00,'',NULL),(269,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:11',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:11',0.00,'',NULL),(270,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:11',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:52:11',0.00,'',NULL),(271,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:11',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:11',0.00,'',NULL),(272,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:12',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:12',0.00,'',NULL),(273,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:13',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:13',0.00,'',NULL),(274,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:14',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:14',0.00,'',NULL),(275,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:14',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:52:14',0.00,'',NULL),(276,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:15',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:15',0.00,'',NULL),(277,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:16',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:16',0.00,'',NULL),(278,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:17',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:17',0.00,'',NULL),(279,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:27',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:27',0.00,'',NULL),(280,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:27',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:27',0.00,'',NULL),(281,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:27',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:27',0.00,'',NULL),(282,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:28',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:28',0.00,'',NULL),(283,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:30',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:30',0.00,'',NULL),(284,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:31',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:31',0.00,'',NULL),(285,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:31',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:31',0.00,'',NULL),(286,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:31',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:31',0.00,'',NULL),(287,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:32',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:32',0.00,'',NULL),(288,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:32',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:32',0.00,'',NULL),(289,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:32',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:32',0.00,'',NULL),(290,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:33',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:33',0.00,'',NULL),(291,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:34',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:34',0.00,'',NULL),(292,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:36',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:36',0.00,'',NULL),(293,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:36',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:52:36',0.00,'',NULL),(294,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:37',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:37',0.00,'',NULL),(295,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:37',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:37',0.00,'',NULL),(296,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:38',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:38',0.00,'',NULL),(297,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:39',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:39',0.00,'',NULL),(298,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:39',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:52:39',0.00,'',NULL),(299,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:40',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:40',0.00,'',NULL),(300,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:40',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:40',0.00,'',NULL),(301,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:41',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:41',0.00,'',NULL),(302,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:41',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:41',0.00,'',NULL),(303,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:41',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:52:41',0.00,'',NULL),(304,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:42',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:42',0.00,'',NULL),(305,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:42',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:42',0.00,'',NULL),(306,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:42',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:42',0.00,'',NULL),(307,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:50',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:50',0.00,'',NULL),(308,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:50',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:50',0.00,'',NULL),(309,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:51',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:51',0.00,'',NULL),(310,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:53',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:53',0.00,'',NULL),(311,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:57',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:57',0.00,'',NULL),(312,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:59',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:59',0.00,'',NULL),(313,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:59',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:59',0.00,'',NULL),(314,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:59',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:59',0.00,'',NULL),(315,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:52:59',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:52:59',0.00,'',NULL),(316,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:59',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:59',0.00,'',NULL),(317,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:52:59',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:52:59',0.00,'',NULL),(318,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:00',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:53:00',0.00,'',NULL),(319,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:00',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:00',0.00,'',NULL),(320,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:02',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:02',0.00,'',NULL),(321,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:03',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:03',0.00,'',NULL),(322,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:03',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:03',0.00,'',NULL),(323,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:03',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:53:03',0.00,'',NULL),(324,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:03',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:53:03',0.00,'',NULL),(325,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:03',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:03',0.00,'',NULL),(326,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:03',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:03',0.00,'',NULL),(327,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:03',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:03',0.00,'',NULL),(328,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:03',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:53:03',0.00,'',NULL),(329,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:04',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:53:04',0.00,'',NULL),(330,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:04',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:04',0.00,'',NULL),(331,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:04',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:04',0.00,'',NULL),(332,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:04',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:04',0.00,'',NULL),(333,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:05',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:53:05',0.00,'',NULL),(334,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:05',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:53:05',0.00,'',NULL),(335,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:05',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:53:05',0.00,'',NULL),(336,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:06',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:53:06',0.00,'',NULL),(337,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:06',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:53:06',0.00,'',NULL),(338,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:10',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:53:10',0.00,'',NULL),(339,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:10',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:53:10',0.00,'',NULL),(340,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:10',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:53:10',0.00,'',NULL),(341,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:10',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:10',0.00,'',NULL),(342,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:11',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:11',0.00,'',NULL),(343,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:11',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:11',0.00,'',NULL),(344,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:11',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:53:11',0.00,'',NULL),(345,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:11',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:11',0.00,'',NULL),(346,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:11',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:11',0.00,'',NULL),(347,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:53:11',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:53:11',0.00,'',NULL),(348,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:11',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:53:11',0.00,'',NULL),(349,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:11',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:53:11',0.00,'',NULL),(350,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:12',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:53:12',0.00,'',NULL),(351,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:12',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:53:12',0.00,'',NULL),(352,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:12',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:53:12',0.00,'',NULL),(353,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:53:12',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:53:12',0.00,'',NULL),(354,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:57:40',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 11:57:40',0.00,'',NULL),(355,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:57:41',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:57:41',0.00,'',NULL),(356,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:57:42',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:57:42',0.00,'',NULL),(357,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:57:43',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:57:43',0.00,'',NULL),(358,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:57:43',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 11:57:43',0.00,'',NULL),(359,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:57:43',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:57:43',0.00,'',NULL),(360,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:57:44',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:57:44',0.00,'',NULL),(361,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:57:45',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:57:45',0.00,'',NULL),(362,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:57:46',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:57:46',0.00,'',NULL),(363,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:57:46',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:57:46',0.00,'',NULL),(364,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 11:57:46',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 11:57:46',0.00,'',NULL),(365,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:57:46',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:57:46',0.00,'',NULL),(366,'Curry Spices','KG',50.00,10.00,250.00,'Spices & Seasoning','','Local Supplier',250.00,NULL,1,'2026-11-10 11:57:47',NULL,1,NULL,NULL,'Curry Spices',250.00,10.00,'2026-11-10 11:57:47',0.00,'',NULL),(367,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:57:48',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:57:48',0.00,'',NULL),(368,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:57:52',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:57:52',0.00,'',NULL),(369,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:57:52',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:57:52',0.00,'',NULL),(370,'Curry Spices','KG',50.00,10.00,250.00,'Spices & Seasoning','','Local Supplier',250.00,NULL,1,'2026-11-10 11:57:52',NULL,1,NULL,NULL,'Curry Spices',250.00,10.00,'2026-11-10 11:57:52',0.00,'',NULL),(371,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:57:54',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:57:54',0.00,'',NULL),(372,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:57:57',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:57:57',0.00,'',NULL),(373,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:57:59',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:57:59',0.00,'',NULL),(374,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:58:00',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:58:00',0.00,'',NULL),(375,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:58:01',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 11:58:01',0.00,'',NULL),(376,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:58:03',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 11:58:03',0.00,'',NULL),(377,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:58:04',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:58:04',0.00,'',NULL),(378,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:58:04',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 11:58:04',0.00,'',NULL),(379,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:58:04',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 11:58:04',0.00,'',NULL),(380,'Curry Spices','KG',50.00,10.00,250.00,'Spices & Seasoning','','Local Supplier',250.00,NULL,1,'2026-11-10 11:58:05',NULL,1,NULL,NULL,'Curry Spices',250.00,10.00,'2026-11-10 11:58:05',0.00,'',NULL),(381,'Curry Spices','KG',50.00,10.00,250.00,'Spices & Seasoning','','Local Supplier',250.00,NULL,1,'2026-11-10 11:58:05',NULL,1,NULL,NULL,'Curry Spices',250.00,10.00,'2026-11-10 11:58:05',0.00,'',NULL),(382,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:58:06',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 11:58:06',0.00,'',NULL),(383,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 11:58:07',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 11:58:07',0.00,'',NULL),(384,'Curry Spices','KG',50.00,10.00,250.00,'Spices & Seasoning','','Local Supplier',250.00,NULL,1,'2026-11-10 11:58:07',NULL,1,NULL,NULL,'Curry Spices',250.00,10.00,'2026-11-10 11:58:07',0.00,'',NULL),(385,'Curry Spices','KG',50.00,10.00,250.00,'Spices & Seasoning','','Local Supplier',250.00,NULL,1,'2026-11-10 11:58:08',NULL,1,NULL,NULL,'Curry Spices',250.00,10.00,'2026-11-10 11:58:08',0.00,'',NULL),(386,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:41',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 12:05:41',0.00,'',NULL),(387,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:42',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:42',0.00,'',NULL),(388,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:42',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:42',0.00,'',NULL),(389,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:42',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:42',0.00,'',NULL),(390,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:42',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:42',0.00,'',NULL),(391,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:43',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 12:05:43',0.00,'',NULL),(392,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:43',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 12:05:43',0.00,'',NULL),(393,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:44',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:44',0.00,'',NULL),(394,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:44',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:44',0.00,'',NULL),(395,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:44',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:44',0.00,'',NULL),(396,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:45',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:45',0.00,'',NULL),(397,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:45',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 12:05:45',0.00,'',NULL),(398,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:45',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:45',0.00,'',NULL),(399,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:45',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:45',0.00,'',NULL),(400,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:46',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:46',0.00,'',NULL),(401,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:46',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:46',0.00,'',NULL),(402,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:46',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 12:05:46',0.00,'',NULL),(403,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:46',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:46',0.00,'',NULL),(404,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:47',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:47',0.00,'',NULL),(405,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:47',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:47',0.00,'',NULL),(406,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:47',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:47',0.00,'',NULL),(407,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:47',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 12:05:47',0.00,'',NULL),(408,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:48',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:48',0.00,'',NULL),(409,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:48',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:48',0.00,'',NULL),(410,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:48',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:48',0.00,'',NULL),(411,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:49',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:49',0.00,'',NULL),(412,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:49',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 12:05:49',0.00,'',NULL),(413,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:49',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:49',0.00,'',NULL),(414,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:49',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:49',0.00,'',NULL),(415,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:49',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:49',0.00,'',NULL),(416,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:50',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:50',0.00,'',NULL),(417,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:50',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 12:05:50',0.00,'',NULL),(418,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:50',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:50',0.00,'',NULL),(419,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:50',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:50',0.00,'',NULL),(420,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:50',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:50',0.00,'',NULL),(421,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:51',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:51',0.00,'',NULL),(422,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:51',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:51',0.00,'',NULL),(423,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:51',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:51',0.00,'',NULL),(424,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:51',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:51',0.00,'',NULL),(425,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:51',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:51',0.00,'',NULL),(426,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:54',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:54',0.00,'',NULL),(427,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:55',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:55',0.00,'',NULL),(428,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:55',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:55',0.00,'',NULL),(429,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:55',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:55',0.00,'',NULL),(430,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:55',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:55',0.00,'',NULL),(431,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:56',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:56',0.00,'',NULL),(432,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:56',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:56',0.00,'',NULL),(433,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:56',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:56',0.00,'',NULL),(434,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:56',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:56',0.00,'',NULL),(435,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:56',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:56',0.00,'',NULL),(436,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:57',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:57',0.00,'',NULL),(437,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:05:57',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:05:57',0.00,'',NULL),(438,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:57',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:57',0.00,'',NULL),(439,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:57',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:57',0.00,'',NULL),(440,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:58',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:58',0.00,'',NULL),(441,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:58',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:58',0.00,'',NULL),(442,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:58',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:58',0.00,'',NULL),(443,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:58',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:58',0.00,'',NULL),(444,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:59',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:59',0.00,'',NULL),(445,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:59',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:59',0.00,'',NULL),(446,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:59',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:59',0.00,'',NULL),(447,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:05:59',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:05:59',0.00,'',NULL),(448,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:06:00',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:06:00',0.00,'',NULL),(449,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:06:00',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:06:00',0.00,'',NULL),(450,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:06:00',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:06:00',0.00,'',NULL),(451,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:06:00',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:06:00',0.00,'',NULL),(452,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:06:00',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:06:00',0.00,'',NULL),(453,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 12:06:01',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 12:06:01',0.00,'',NULL),(454,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:01',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:01',0.00,'',NULL),(455,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:01',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:01',0.00,'',NULL),(456,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:02',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:02',0.00,'',NULL),(457,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:02',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:02',0.00,'',NULL),(458,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:03',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:03',0.00,'',NULL),(459,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:03',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:03',0.00,'',NULL),(460,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:03',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:03',0.00,'',NULL),(461,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:03',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:03',0.00,'',NULL),(462,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:03',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:03',0.00,'',NULL),(463,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:04',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:04',0.00,'',NULL),(464,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:04',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:04',0.00,'',NULL),(465,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:04',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:04',0.00,'',NULL),(466,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:04',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:04',0.00,'',NULL),(467,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:05',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:05',0.00,'',NULL),(468,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:05',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:05',0.00,'',NULL),(469,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:05',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:05',0.00,'',NULL),(470,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:05',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 12:06:05',0.00,'',NULL),(471,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:06',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 12:06:06',0.00,'',NULL),(472,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:06',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 12:06:06',0.00,'',NULL),(473,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:06',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 12:06:06',0.00,'',NULL),(474,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:07',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:07',0.00,'',NULL),(475,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:07',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:07',0.00,'',NULL),(476,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:07',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:07',0.00,'',NULL),(477,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 12:06:08',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 12:06:08',0.00,'',NULL),(478,'bir Main Ingredient','KG',50.00,10.00,100.00,'General Supplies','','Local Supplier',100.00,NULL,1,'2026-11-10 12:36:13',NULL,1,NULL,NULL,'bir Main Ingredient',100.00,10.00,'2026-11-10 12:36:13',0.00,'',NULL),(479,'Cooking Oil / Butter','L',50.00,10.00,550.00,'Oils & Condiments','','Local Supplier',550.00,NULL,1,'2026-11-10 12:36:13',NULL,1,NULL,NULL,'Cooking Oil / Butter',550.00,10.00,'2026-11-10 12:36:13',0.00,'',NULL),(480,'Seasoning & Spices','KG',50.00,10.00,250.00,'Spices & Seasoning','','Local Supplier',250.00,NULL,1,'2026-11-10 12:36:13',NULL,1,NULL,NULL,'Seasoning & Spices',250.00,10.00,'2026-11-10 12:36:13',0.00,'',NULL),(481,'Pizza Base','PCS',50.00,10.00,180.00,'Bakery & Bread','','Local Supplier',180.00,NULL,1,'2026-11-10 12:48:40',NULL,1,NULL,NULL,'Pizza Base',180.00,10.00,'2026-11-10 12:48:40',0.00,'',NULL),(482,'Mozzarella Cheese','KG',50.00,10.00,420.00,'Dairy & Eggs','','Local Supplier',420.00,NULL,1,'2026-11-10 12:48:40',NULL,1,NULL,NULL,'Mozzarella Cheese',420.00,10.00,'2026-11-10 12:48:40',0.00,'',NULL),(483,'Pizza Marinara Sauce','KG',50.00,10.00,220.00,'Oils & Condiments','','Local Supplier',220.00,NULL,1,'2026-11-10 12:48:40',NULL,1,NULL,NULL,'Pizza Marinara Sauce',220.00,10.00,'2026-11-10 12:48:40',0.00,'',NULL),(484,'Toppings (Veggies/Meat)','KG',50.00,10.00,8.00,'Produce & Veggies','','Local Supplier',8.00,NULL,1,'2026-11-10 12:48:41',NULL,1,NULL,NULL,'Toppings (Veggies/Meat)',8.00,10.00,'2026-11-10 12:48:41',0.00,'',NULL),(485,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 15:12:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 15:12:28',0.00,'',NULL),(486,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 15:12:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 15:12:28',0.00,'',NULL),(487,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 15:12:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 15:12:28',0.00,'',NULL),(488,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 15:12:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 15:12:28',0.00,'',NULL),(489,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:28',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 15:12:28',0.00,'',NULL),(490,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:29',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 15:12:29',0.00,'',NULL),(491,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:31',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 15:12:31',0.00,'',NULL),(492,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 15:12:31',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 15:12:31',0.00,'',NULL),(493,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 15:12:31',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 15:12:31',0.00,'',NULL),(494,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 15:12:31',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 15:12:31',0.00,'',NULL),(495,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 15:12:31',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 15:12:31',0.00,'',NULL),(496,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:32',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 15:12:32',0.00,'',NULL),(497,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:32',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:12:32',0.00,'',NULL),(498,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:32',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:12:32',0.00,'',NULL),(499,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:32',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:12:32',0.00,'',NULL),(500,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:33',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:12:33',0.00,'',NULL),(501,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 15:12:35',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 15:12:35',0.00,'',NULL),(502,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 15:12:36',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 15:12:36',0.00,'',NULL),(503,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 15:12:36',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 15:12:36',0.00,'',NULL),(504,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 15:12:37',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 15:12:37',0.00,'',NULL),(505,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:37',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 15:12:37',0.00,'',NULL),(506,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:38',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:12:38',0.00,'',NULL),(507,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:38',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:12:38',0.00,'',NULL),(508,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:41',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:12:41',0.00,'',NULL),(509,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:42',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:12:42',0.00,'',NULL),(510,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:44',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:12:44',0.00,'',NULL),(511,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:45',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:12:45',0.00,'',NULL),(512,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:45',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:12:45',0.00,'',NULL),(513,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:46',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:12:46',0.00,'',NULL),(514,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:49',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 15:12:49',0.00,'',NULL),(515,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:12:50',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 15:12:50',0.00,'',NULL),(516,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:22:35',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:22:35',0.00,'',NULL),(517,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:22:35',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:22:35',0.00,'',NULL),(518,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:22:35',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 15:22:35',0.00,'',NULL),(519,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:22:36',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:22:36',0.00,'',NULL),(520,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:22:36',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:22:36',0.00,'',NULL),(521,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:22:37',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 15:22:37',0.00,'',NULL),(522,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:22:37',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:22:37',0.00,'',NULL),(523,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:22:37',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:22:37',0.00,'',NULL),(524,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:22:38',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:22:38',0.00,'',NULL),(525,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:22:38',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:22:38',0.00,'',NULL),(526,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:22:38',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 15:22:38',0.00,'',NULL),(527,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:28:31',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:28:31',0.00,'',NULL),(528,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:28:31',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:28:31',0.00,'',NULL),(529,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:28:31',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:28:31',0.00,'',NULL),(530,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:28:31',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:28:31',0.00,'',NULL),(531,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:28:32',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 15:28:32',0.00,'',NULL),(532,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:28:34',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 15:28:34',0.00,'',NULL),(533,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:28:34',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:28:34',0.00,'',NULL),(534,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:28:34',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:28:34',0.00,'',NULL),(535,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:28:34',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:28:34',0.00,'',NULL),(536,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:28:35',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 15:28:35',0.00,'',NULL),(537,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 15:28:35',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 15:28:35',0.00,'',NULL),(538,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:01:22',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 16:01:22',0.00,'',NULL),(539,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:01:22',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 16:01:22',0.00,'',NULL),(540,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:01:22',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 16:01:22',0.00,'',NULL),(541,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:01:22',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 16:01:22',0.00,'',NULL),(542,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:01:24',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 16:01:24',0.00,'',NULL),(543,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:01:25',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 16:01:25',0.00,'',NULL),(544,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:01:25',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 16:01:25',0.00,'',NULL),(545,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:01:25',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 16:01:25',0.00,'',NULL),(546,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:01:25',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 16:01:25',0.00,'',NULL),(547,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:01:25',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 16:01:25',0.00,'',NULL),(548,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:01:27',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 16:01:27',0.00,'',NULL),(549,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:01:27',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 16:01:27',0.00,'',NULL),(550,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:01:27',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 16:01:27',0.00,'',NULL),(551,'Onions & Mint','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:01:30',NULL,1,NULL,NULL,'Onions & Mint',40.00,10.00,'2026-11-10 16:01:30',0.00,'',NULL),(552,'Curry Gravies & Onions','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:01:33',NULL,1,NULL,NULL,'Curry Gravies & Onions',40.00,10.00,'2026-11-10 16:01:33',0.00,'',NULL),(553,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:28',0.00,'',NULL),(554,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:28',0.00,'',NULL),(555,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:28',0.00,'',NULL),(556,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:28',0.00,'',NULL),(557,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:28',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:28',0.00,'',NULL),(558,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(559,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(560,'Shawarma Main Ingredient','KG',50.00,10.00,100.00,'General Supplies','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Shawarma Main Ingredient',100.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(561,'Crispy Corn Salt & Pepper Main Ingredient','KG',50.00,10.00,25.00,'Grains & Rice','','Local Supplier',25.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Crispy Corn Salt & Pepper Main Ingredient',25.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(562,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(563,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(564,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Meat & Seafood','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(565,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(566,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'General Supplies','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(567,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Meat & Seafood','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(568,'Dal Makhani Bukhara Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Dal Makhani Bukhara Main Ingredient',100.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(569,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(570,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Dairy & Eggs','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(571,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Meat & Seafood','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(572,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Dairy & Eggs','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(573,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Dairy & Eggs','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(574,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient','KG',50.00,10.00,100.00,'General Supplies','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient',100.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(575,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Dairy & Eggs','','Local Supplier',280.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(576,'Matka Kulfi Falooda Main Ingredient','KG',50.00,10.00,100.00,'General Supplies','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Matka Kulfi Falooda Main Ingredient',100.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(577,'Royal Shahi Tukda Main Ingredient','KG',50.00,10.00,100.00,'General Supplies','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:29',NULL,1,NULL,NULL,'Royal Shahi Tukda Main Ingredient',100.00,10.00,'2026-11-10 16:33:29',0.00,'',NULL),(578,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(579,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(580,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(581,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(582,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(583,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(584,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(585,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(586,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(587,'Shawarma Main Ingredient','KG',50.00,10.00,100.00,'General Supplies','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Shawarma Main Ingredient',100.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(588,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'General Supplies','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(589,'Crispy Corn Salt & Pepper Main Ingredient','KG',50.00,10.00,25.00,'Grains & Rice','','Local Supplier',25.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Crispy Corn Salt & Pepper Main Ingredient',25.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(590,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(591,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(592,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Meat & Seafood','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(593,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Meat & Seafood','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(594,'Dal Makhani Bukhara Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Dal Makhani Bukhara Main Ingredient',100.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(595,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Meat & Seafood','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(596,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Dairy & Eggs','','Local Supplier',280.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(597,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Dairy & Eggs','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(598,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Dairy & Eggs','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(599,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Dairy & Eggs','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(600,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient','KG',50.00,10.00,100.00,'General Supplies','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient',100.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(601,'Royal Shahi Tukda Main Ingredient','KG',50.00,10.00,100.00,'General Supplies','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:30',NULL,1,NULL,NULL,'Royal Shahi Tukda Main Ingredient',100.00,10.00,'2026-11-10 16:33:30',0.00,'',NULL),(602,'Matka Kulfi Falooda Main Ingredient','KG',50.00,10.00,100.00,'General Supplies','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:31',NULL,1,NULL,NULL,'Matka Kulfi Falooda Main Ingredient',100.00,10.00,'2026-11-10 16:33:31',0.00,'',NULL),(603,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:32',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:32',0.00,'',NULL),(604,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:32',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:32',0.00,'',NULL),(605,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:32',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:32',0.00,'',NULL),(606,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:32',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:32',0.00,'',NULL),(607,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:32',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:32',0.00,'',NULL),(608,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:38',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:38',0.00,'',NULL),(609,'Dal Makhani Bukhara Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:38',NULL,1,NULL,NULL,'Dal Makhani Bukhara Main Ingredient',100.00,10.00,'2026-11-10 16:33:38',0.00,'',NULL),(610,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:38',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:33:38',0.00,'',NULL),(611,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient',100.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(612,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(613,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(614,'Royal Shahi Tukda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Royal Shahi Tukda Main Ingredient',100.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(615,'Matka Kulfi Falooda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Matka Kulfi Falooda Main Ingredient',100.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(616,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(617,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(618,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(619,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(620,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(621,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(622,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(623,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(624,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(625,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(626,'Crispy Corn Salt & Pepper Main Ingredient','KG',50.00,10.00,25.00,'Grains & Rice','','Local Supplier',25.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Crispy Corn Salt & Pepper Main Ingredient',25.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(627,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(628,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(629,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(630,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(631,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(632,'Dal Makhani Bukhara Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:39',NULL,1,NULL,NULL,'Dal Makhani Bukhara Main Ingredient',100.00,10.00,'2026-11-10 16:33:39',0.00,'',NULL),(633,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:40',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:40',0.00,'',NULL),(634,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:40',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:33:40',0.00,'',NULL),(635,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:40',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:33:40',0.00,'',NULL),(636,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:40',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:33:40',0.00,'',NULL),(637,'Royal Shahi Tukda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:40',NULL,1,NULL,NULL,'Royal Shahi Tukda Main Ingredient',100.00,10.00,'2026-11-10 16:33:40',0.00,'',NULL),(638,'Matka Kulfi Falooda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:40',NULL,1,NULL,NULL,'Matka Kulfi Falooda Main Ingredient',100.00,10.00,'2026-11-10 16:33:40',0.00,'',NULL),(639,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:40',NULL,1,NULL,NULL,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient',100.00,10.00,'2026-11-10 16:33:40',0.00,'',NULL),(640,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:33:40',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:33:40',0.00,'',NULL),(641,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:43',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:33:43',0.00,'',NULL),(642,'Crispy Corn Salt & Pepper Main Ingredient','KG',50.00,10.00,25.00,'Grains & Rice','','Local Supplier',25.00,NULL,1,'2026-11-10 16:33:43',NULL,1,NULL,NULL,'Crispy Corn Salt & Pepper Main Ingredient',25.00,10.00,'2026-11-10 16:33:43',0.00,'',NULL),(643,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:43',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:43',0.00,'',NULL),(644,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:43',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:43',0.00,'',NULL),(645,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:44',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:33:44',0.00,'',NULL),(646,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:44',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:44',0.00,'',NULL),(647,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:44',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:44',0.00,'',NULL),(648,'Dal Makhani Bukhara Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:44',NULL,1,NULL,NULL,'Dal Makhani Bukhara Main Ingredient',100.00,10.00,'2026-11-10 16:33:44',0.00,'',NULL),(649,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:44',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:44',0.00,'',NULL),(650,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:44',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:33:44',0.00,'',NULL),(651,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:44',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:33:44',0.00,'',NULL),(652,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:33:44',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:33:44',0.00,'',NULL),(653,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:44',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:33:44',0.00,'',NULL),(654,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:44',NULL,1,NULL,NULL,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient',100.00,10.00,'2026-11-10 16:33:44',0.00,'',NULL),(655,'Royal Shahi Tukda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:44',NULL,1,NULL,NULL,'Royal Shahi Tukda Main Ingredient',100.00,10.00,'2026-11-10 16:33:44',0.00,'',NULL),(656,'Matka Kulfi Falooda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:44',NULL,1,NULL,NULL,'Matka Kulfi Falooda Main Ingredient',100.00,10.00,'2026-11-10 16:33:44',0.00,'',NULL),(657,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:45',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:45',0.00,'',NULL),(658,'Crispy Corn Salt & Pepper Main Ingredient','KG',50.00,10.00,25.00,'Grains & Rice','','Local Supplier',25.00,NULL,1,'2026-11-10 16:33:45',NULL,1,NULL,NULL,'Crispy Corn Salt & Pepper Main Ingredient',25.00,10.00,'2026-11-10 16:33:45',0.00,'',NULL),(659,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:45',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:45',0.00,'',NULL),(660,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:45',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:33:45',0.00,'',NULL),(661,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:45',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:45',0.00,'',NULL),(662,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:45',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:33:45',0.00,'',NULL),(663,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:45',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:45',0.00,'',NULL),(664,'Dal Makhani Bukhara Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:45',NULL,1,NULL,NULL,'Dal Makhani Bukhara Main Ingredient',100.00,10.00,'2026-11-10 16:33:45',0.00,'',NULL),(665,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:45',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:45',0.00,'',NULL),(666,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:45',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:33:45',0.00,'',NULL),(667,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:45',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:33:45',0.00,'',NULL),(668,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:45',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:33:45',0.00,'',NULL),(669,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:33:45',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:33:45',0.00,'',NULL),(670,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:45',NULL,1,NULL,NULL,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient',100.00,10.00,'2026-11-10 16:33:45',0.00,'',NULL),(671,'Matka Kulfi Falooda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:45',NULL,1,NULL,NULL,'Matka Kulfi Falooda Main Ingredient',100.00,10.00,'2026-11-10 16:33:45',0.00,'',NULL),(672,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:47',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:47',0.00,'',NULL),(673,'Crispy Corn Salt & Pepper Main Ingredient','KG',50.00,10.00,25.00,'Grains & Rice','','Local Supplier',25.00,NULL,1,'2026-11-10 16:33:47',NULL,1,NULL,NULL,'Crispy Corn Salt & Pepper Main Ingredient',25.00,10.00,'2026-11-10 16:33:47',0.00,'',NULL),(674,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:47',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:33:47',0.00,'',NULL),(675,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:47',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:47',0.00,'',NULL),(676,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:47',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:47',0.00,'',NULL),(677,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:47',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:33:47',0.00,'',NULL),(678,'Tomato & Onion Gravy','KG',50.00,10.00,40.00,'Produce & Veggies','','Local Supplier',40.00,NULL,1,'2026-11-10 16:33:47',NULL,1,NULL,NULL,'Tomato & Onion Gravy',40.00,10.00,'2026-11-10 16:33:47',0.00,'',NULL),(679,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:47',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:47',0.00,'',NULL),(680,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:47',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:33:47',0.00,'',NULL),(681,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:47',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:33:47',0.00,'',NULL),(682,'Dal Makhani Bukhara Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:47',NULL,1,NULL,NULL,'Dal Makhani Bukhara Main Ingredient',100.00,10.00,'2026-11-10 16:33:47',0.00,'',NULL),(683,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:47',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:33:47',0.00,'',NULL),(684,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:47',NULL,1,NULL,NULL,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient',100.00,10.00,'2026-11-10 16:33:47',0.00,'',NULL),(685,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:33:47',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:33:47',0.00,'',NULL),(686,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:49',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:33:49',0.00,'',NULL),(687,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:49',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:49',0.00,'',NULL),(688,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:49',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:33:49',0.00,'',NULL),(689,'Crispy Corn Salt & Pepper Main Ingredient','KG',50.00,10.00,25.00,'Grains & Rice','','Local Supplier',25.00,NULL,1,'2026-11-10 16:33:49',NULL,1,NULL,NULL,'Crispy Corn Salt & Pepper Main Ingredient',25.00,10.00,'2026-11-10 16:33:49',0.00,'',NULL),(690,'Dal Makhani Bukhara Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:49',NULL,1,NULL,NULL,'Dal Makhani Bukhara Main Ingredient',100.00,10.00,'2026-11-10 16:33:49',0.00,'',NULL),(691,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:49',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:49',0.00,'',NULL),(692,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:49',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:33:49',0.00,'',NULL),(693,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:49',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:33:49',0.00,'',NULL),(694,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:49',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:33:49',0.00,'',NULL),(695,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:33:49',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:33:49',0.00,'',NULL),(696,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:49',NULL,1,NULL,NULL,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient',100.00,10.00,'2026-11-10 16:33:49',0.00,'',NULL),(697,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:50',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:33:50',0.00,'',NULL),(698,'Crispy Corn Salt & Pepper Main Ingredient','KG',50.00,10.00,25.00,'Grains & Rice','','Local Supplier',25.00,NULL,1,'2026-11-10 16:33:50',NULL,1,NULL,NULL,'Crispy Corn Salt & Pepper Main Ingredient',25.00,10.00,'2026-11-10 16:33:50',0.00,'',NULL),(699,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:50',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:50',0.00,'',NULL),(700,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:50',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:33:50',0.00,'',NULL),(701,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:50',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:33:50',0.00,'',NULL),(702,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:50',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:33:50',0.00,'',NULL),(703,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:50',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:33:50',0.00,'',NULL),(704,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:50',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:50',0.00,'',NULL),(705,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:33:50',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:33:50',0.00,'',NULL),(706,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:50',NULL,1,NULL,NULL,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient',100.00,10.00,'2026-11-10 16:33:50',0.00,'',NULL),(707,'Crispy Corn Salt & Pepper Main Ingredient','KG',50.00,10.00,25.00,'Grains & Rice','','Local Supplier',25.00,NULL,1,'2026-11-10 16:33:51',NULL,1,NULL,NULL,'Crispy Corn Salt & Pepper Main Ingredient',25.00,10.00,'2026-11-10 16:33:51',0.00,'',NULL),(708,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:51',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:33:51',0.00,'',NULL),(709,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:51',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:51',0.00,'',NULL),(710,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:51',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:51',0.00,'',NULL),(711,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:51',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:33:51',0.00,'',NULL),(712,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:51',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:33:51',0.00,'',NULL),(713,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:51',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:33:51',0.00,'',NULL),(714,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:51',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:51',0.00,'',NULL),(715,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:33:51',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:33:51',0.00,'',NULL),(716,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:51',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:33:51',0.00,'',NULL),(717,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:51',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:51',0.00,'',NULL),(718,'Crispy Corn Salt & Pepper Main Ingredient','KG',50.00,10.00,25.00,'Grains & Rice','','Local Supplier',25.00,NULL,1,'2026-11-10 16:33:51',NULL,1,NULL,NULL,'Crispy Corn Salt & Pepper Main Ingredient',25.00,10.00,'2026-11-10 16:33:51',0.00,'',NULL),(719,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:51',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:33:51',0.00,'',NULL),(720,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:51',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:33:51',0.00,'',NULL),(721,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:51',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:51',0.00,'',NULL),(722,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:52',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:33:52',0.00,'',NULL),(723,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:52',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:52',0.00,'',NULL),(724,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:52',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:33:52',0.00,'',NULL),(725,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:52',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:33:52',0.00,'',NULL),(726,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:52',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:52',0.00,'',NULL),(727,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:52',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:33:52',0.00,'',NULL),(728,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:52',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:33:52',0.00,'',NULL),(729,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:52',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:52',0.00,'',NULL),(730,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:52',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:52',0.00,'',NULL),(731,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:52',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:33:52',0.00,'',NULL),(732,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:52',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:33:52',0.00,'',NULL),(733,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:52',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:33:52',0.00,'',NULL),(734,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:53',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:53',0.00,'',NULL),(735,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:53',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:33:53',0.00,'',NULL),(736,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:53',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:53',0.00,'',NULL),(737,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:53',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:33:53',0.00,'',NULL),(738,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:53',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:33:53',0.00,'',NULL),(739,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:53',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:33:53',0.00,'',NULL),(740,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:53',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:53',0.00,'',NULL),(741,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:53',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:33:53',0.00,'',NULL),(742,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:53',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:53',0.00,'',NULL),(743,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:53',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:33:53',0.00,'',NULL),(744,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:33:54',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:33:54',0.00,'',NULL),(745,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:54',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:33:54',0.00,'',NULL),(746,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:54',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:33:54',0.00,'',NULL),(747,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:54',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:54',0.00,'',NULL),(748,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:54',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:54',0.00,'',NULL),(749,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:54',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:54',0.00,'',NULL),(750,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:54',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:54',0.00,'',NULL),(751,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:33:54',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:33:54',0.00,'',NULL),(752,'Basmati Rice','KG',50.00,10.00,120.00,'Grains & Rice','','Local Supplier',120.00,NULL,1,'2026-11-10 16:33:55',NULL,1,NULL,NULL,'Basmati Rice',120.00,10.00,'2026-11-10 16:33:55',0.00,'',NULL),(753,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:56',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:56',0.00,'',NULL),(754,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:33:57',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:33:57',0.00,'',NULL),(755,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:33:57',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:33:57',0.00,'',NULL),(756,'Dal Makhani Bukhara Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:08',NULL,1,NULL,NULL,'Dal Makhani Bukhara Main Ingredient',100.00,10.00,'2026-11-10 16:36:08',0.00,'',NULL),(757,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:08',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:36:08',0.00,'',NULL),(758,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:08',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:36:08',0.00,'',NULL),(759,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:08',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:36:08',0.00,'',NULL),(760,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:36:08',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:36:08',0.00,'',NULL),(761,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:36:08',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:36:08',0.00,'',NULL),(762,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:08',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:36:08',0.00,'',NULL),(763,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:09',NULL,1,NULL,NULL,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient',100.00,10.00,'2026-11-10 16:36:09',0.00,'',NULL),(764,'Royal Shahi Tukda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:09',NULL,1,NULL,NULL,'Royal Shahi Tukda Main Ingredient',100.00,10.00,'2026-11-10 16:36:09',0.00,'',NULL),(765,'Matka Kulfi Falooda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:09',NULL,1,NULL,NULL,'Matka Kulfi Falooda Main Ingredient',100.00,10.00,'2026-11-10 16:36:09',0.00,'',NULL),(766,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:13',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:36:13',0.00,'',NULL),(767,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:36:13',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:36:13',0.00,'',NULL),(768,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:13',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:36:13',0.00,'',NULL),(769,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:13',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:36:13',0.00,'',NULL),(770,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:36:13',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:36:13',0.00,'',NULL),(771,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:14',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:36:14',0.00,'',NULL),(772,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:36:14',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:36:14',0.00,'',NULL),(773,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:14',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:36:14',0.00,'',NULL),(774,'Dal Makhani Bukhara Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:14',NULL,1,NULL,NULL,'Dal Makhani Bukhara Main Ingredient',100.00,10.00,'2026-11-10 16:36:14',0.00,'',NULL),(775,'Matka Kulfi Falooda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:14',NULL,1,NULL,NULL,'Matka Kulfi Falooda Main Ingredient',100.00,10.00,'2026-11-10 16:36:14',0.00,'',NULL),(776,'Royal Shahi Tukda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:14',NULL,1,NULL,NULL,'Royal Shahi Tukda Main Ingredient',100.00,10.00,'2026-11-10 16:36:14',0.00,'',NULL),(777,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:14',NULL,1,NULL,NULL,'Gulab Jamun with Rabdi (2 Pcs) Main Ingredient',100.00,10.00,'2026-11-10 16:36:14',0.00,'',NULL),(778,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:18',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:36:18',0.00,'',NULL),(779,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:36:18',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:36:18',0.00,'',NULL),(780,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:18',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:36:18',0.00,'',NULL),(781,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:18',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:36:18',0.00,'',NULL),(782,'Dal Makhani Bukhara Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:18',NULL,1,NULL,NULL,'Dal Makhani Bukhara Main Ingredient',100.00,10.00,'2026-11-10 16:36:18',0.00,'',NULL),(783,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:18',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:36:18',0.00,'',NULL),(784,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:36:19',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:36:19',0.00,'',NULL),(785,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:19',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:36:19',0.00,'',NULL),(786,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:36:19',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:36:19',0.00,'',NULL),(787,'Royal Shahi Tukda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:19',NULL,1,NULL,NULL,'Royal Shahi Tukda Main Ingredient',100.00,10.00,'2026-11-10 16:36:19',0.00,'',NULL),(788,'Matka Kulfi Falooda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:19',NULL,1,NULL,NULL,'Matka Kulfi Falooda Main Ingredient',100.00,10.00,'2026-11-10 16:36:19',0.00,'',NULL),(789,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:21',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:36:21',0.00,'',NULL),(790,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:21',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:36:21',0.00,'',NULL),(791,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:36:21',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:36:21',0.00,'',NULL),(792,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:21',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:36:21',0.00,'',NULL),(793,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:21',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:36:21',0.00,'',NULL),(794,'Cheese Garlic Naan Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:36:21',NULL,1,NULL,NULL,'Cheese Garlic Naan Main Ingredient',420.00,10.00,'2026-11-10 16:36:21',0.00,'',NULL),(795,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:36:21',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:36:21',0.00,'',NULL),(796,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:21',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:36:21',0.00,'',NULL),(797,'Matka Kulfi Falooda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:22',NULL,1,NULL,NULL,'Matka Kulfi Falooda Main Ingredient',100.00,10.00,'2026-11-10 16:36:22',0.00,'',NULL),(798,'Royal Shahi Tukda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:22',NULL,1,NULL,NULL,'Royal Shahi Tukda Main Ingredient',100.00,10.00,'2026-11-10 16:36:22',0.00,'',NULL),(799,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:36:23',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:36:23',0.00,'',NULL),(800,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:23',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:36:23',0.00,'',NULL),(801,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:23',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:36:23',0.00,'',NULL),(802,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:23',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:36:23',0.00,'',NULL),(803,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:23',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:36:23',0.00,'',NULL),(804,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:23',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:36:23',0.00,'',NULL),(805,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:36:23',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:36:23',0.00,'',NULL),(806,'Royal Shahi Tukda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:23',NULL,1,NULL,NULL,'Royal Shahi Tukda Main Ingredient',100.00,10.00,'2026-11-10 16:36:23',0.00,'',NULL),(807,'Matka Kulfi Falooda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:23',NULL,1,NULL,NULL,'Matka Kulfi Falooda Main Ingredient',100.00,10.00,'2026-11-10 16:36:23',0.00,'',NULL),(808,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:36:27',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:36:27',0.00,'',NULL),(809,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:27',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:36:27',0.00,'',NULL),(810,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:28',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:36:28',0.00,'',NULL),(811,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:28',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:36:28',0.00,'',NULL),(812,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:28',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:36:28',0.00,'',NULL),(813,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:36:28',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:36:28',0.00,'',NULL),(814,'Royal Shahi Tukda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:28',NULL,1,NULL,NULL,'Royal Shahi Tukda Main Ingredient',100.00,10.00,'2026-11-10 16:36:28',0.00,'',NULL),(815,'Mutton Rogan Josh Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:28',NULL,1,NULL,NULL,'Mutton Rogan Josh Main Ingredient',700.00,10.00,'2026-11-10 16:36:28',0.00,'',NULL),(816,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:30',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:36:30',0.00,'',NULL),(817,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:30',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:36:30',0.00,'',NULL),(818,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:31',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:36:31',0.00,'',NULL),(819,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:36:31',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:36:31',0.00,'',NULL),(820,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:31',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:36:31',0.00,'',NULL),(821,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:36:31',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:36:31',0.00,'',NULL),(822,'Royal Shahi Tukda Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:31',NULL,1,NULL,NULL,'Royal Shahi Tukda Main Ingredient',100.00,10.00,'2026-11-10 16:36:31',0.00,'',NULL),(823,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:34',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:36:34',0.00,'',NULL),(824,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:36:34',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:36:34',0.00,'',NULL),(825,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:34',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:36:34',0.00,'',NULL),(826,'Tandoori Roti (Butter) Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:34',NULL,1,NULL,NULL,'Tandoori Roti (Butter) Main Ingredient',550.00,10.00,'2026-11-10 16:36:34',0.00,'',NULL),(827,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:34',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:36:34',0.00,'',NULL),(828,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:36:34',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:36:34',0.00,'',NULL),(829,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:38',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:36:38',0.00,'',NULL),(830,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:36:38',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:36:38',0.00,'',NULL),(831,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:38',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:36:38',0.00,'',NULL),(832,'Murgh Malai Kebab Main Ingredient','KG',50.00,10.00,100.00,'Grains & Rice','','Local Supplier',100.00,NULL,1,'2026-11-10 16:36:38',NULL,1,NULL,NULL,'Murgh Malai Kebab Main Ingredient',100.00,10.00,'2026-11-10 16:36:38',0.00,'',NULL),(833,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:36:38',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:36:38',0.00,'',NULL),(834,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:40',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:36:40',0.00,'',NULL),(835,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:36:40',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:36:40',0.00,'',NULL),(836,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:40',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:36:40',0.00,'',NULL),(837,'Ice cream Main Ingredient','KG',50.00,10.00,280.00,'Grains & Rice','','Local Supplier',280.00,NULL,1,'2026-11-10 16:36:40',NULL,1,NULL,NULL,'Ice cream Main Ingredient',280.00,10.00,'2026-11-10 16:36:40',0.00,'',NULL),(838,'Apollo Fish Fry Main Ingredient','KG',50.00,10.00,420.00,'Grains & Rice','','Local Supplier',420.00,NULL,1,'2026-11-10 16:36:42',NULL,1,NULL,NULL,'Apollo Fish Fry Main Ingredient',420.00,10.00,'2026-11-10 16:36:42',0.00,'',NULL),(839,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:42',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:36:42',0.00,'',NULL),(840,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:42',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:36:42',0.00,'',NULL),(841,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:42',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:36:42',0.00,'',NULL),(842,'Butter Garlic Naan Main Ingredient','KG',50.00,10.00,550.00,'Grains & Rice','','Local Supplier',550.00,NULL,1,'2026-11-10 16:36:42',NULL,1,NULL,NULL,'Butter Garlic Naan Main Ingredient',550.00,10.00,'2026-11-10 16:36:42',0.00,'',NULL),(843,'Mutton Seekh Kebab Main Ingredient','KG',50.00,10.00,700.00,'Grains & Rice','','Local Supplier',700.00,NULL,1,'2026-11-10 16:36:44',NULL,1,NULL,NULL,'Mutton Seekh Kebab Main Ingredient',700.00,10.00,'2026-11-10 16:36:44',0.00,'',NULL);
/*!40000 ALTER TABLE `ingredients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_purchases`
--

DROP TABLE IF EXISTS `inventory_purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_purchases` (
  `purchase_id` bigint NOT NULL AUTO_INCREMENT,
  `ingredient_id` bigint NOT NULL,
  `item_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Bar',
  `supplier` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Local Supplier',
  `quantity` decimal(18,2) NOT NULL DEFAULT '0.00',
  `unit_cost` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchase_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`purchase_id`),
  KEY `idx_inv_purchases_date` (`purchase_date`),
  KEY `idx_inv_purchases_dept` (`department`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_purchases`
--

LOCK TABLES `inventory_purchases` WRITE;
/*!40000 ALTER TABLE `inventory_purchases` DISABLE KEYS */;
INSERT INTO `inventory_purchases` VALUES (1,1,'Johnnie Walker Black Label','Bar','Diageo Direct',24.00,2800.00,67200.00,'Initial stock procurement','2026-10-31 07:32:46',NULL,1,'2026-11-05 07:32:46',NULL,NULL),(2,2,'Absolut Vodka','Dine','Pernod Ricard',18.00,1900.00,34200.00,'Initial stock procurement','2026-10-31 07:32:46',NULL,1,'2026-11-05 07:32:46',NULL,NULL),(3,3,'Corona Extra Beer','Bar','Anheuser-Busch',120.00,180.00,21600.00,'Initial stock procurement','2026-10-31 07:32:46',NULL,1,'2026-11-05 07:32:46',NULL,NULL),(4,4,'Sula Cabernet Shiraz','Bar','Sula Vineyards',30.00,950.00,28500.00,'Initial stock procurement','2026-10-31 07:32:46',NULL,1,'2026-11-05 07:32:46',NULL,NULL),(5,5,'Basmati Rice Premium','Dine','Royal Grains Ltd',200.00,95.00,19000.00,'Initial stock procurement','2026-10-31 07:32:46',NULL,1,'2026-11-05 07:32:46',NULL,NULL),(6,6,'Fresh Paneer','Dine','Dairy Fresh Co',3.00,320.00,960.00,'Initial stock procurement','2026-10-31 07:32:46',NULL,1,'2026-11-05 07:32:46',NULL,NULL),(7,8,'Test Glenfiddich 12 Single Malt Scotch','Bar','Direct Highland Import',10.00,3500.00,35000.00,'Received 10 new bottles','2026-11-05 07:32:57',NULL,1,'2026-11-05 07:32:57',NULL,NULL),(8,1,'Johnnie Walker Black Label','Bar','Diageo',2.00,2800.00,5600.00,'Stock received into bar inventory','2026-11-05 07:33:07',NULL,1,'2026-11-05 07:33:06',NULL,NULL),(9,9,'Test Glenfiddich 12 Single Malt Scotch','Bar','Direct Highland Import',10.00,3500.00,35000.00,'Received 10 new bottles','2026-11-05 07:36:49',NULL,1,'2026-11-05 07:36:48',NULL,NULL),(10,1,'Johnnie Walker Black Label','Bar','Diageo',2.00,2800.00,5600.00,'Stock received into bar inventory','2026-11-05 07:36:59',NULL,1,'2026-11-05 07:36:58',NULL,NULL),(11,1,'Johnnie Walker Black Label','Bar','Diageo Direct',2.00,2800.00,5600.00,'Stock received into bar inventory','2026-11-05 07:38:33',NULL,1,'2026-11-05 07:38:33',NULL,NULL),(12,10,'Test Glenfiddich 12 Single Malt Scotch','Bar','Direct Highland Import',10.00,3500.00,35000.00,'Received 10 new bottles','2026-11-05 07:41:01',NULL,1,'2026-11-05 07:41:00',NULL,NULL),(13,11,'Test Glenfiddich 12 Single Malt Scotch','Bar','Direct Highland Import',10.00,3500.00,35000.00,'Received 10 new bottles','2026-11-05 08:02:47',NULL,1,'2026-11-05 08:02:47',NULL,NULL);
/*!40000 ALTER TABLE `inventory_purchases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_transactions`
--

DROP TABLE IF EXISTS `inventory_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_transactions` (
  `txn_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ingredient_id` bigint unsigned NOT NULL,
  `branch_id` bigint DEFAULT NULL,
  `po_id` bigint unsigned DEFAULT NULL,
  `txn_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'usage',
  `quantity` decimal(12,3) NOT NULL,
  `unit_cost` decimal(10,2) NOT NULL DEFAULT '0.00',
  `balance_after` decimal(18,3) DEFAULT '0.000',
  `remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `txn_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `outlet_id` bigint DEFAULT '1',
  `updated_by` bigint DEFAULT NULL,
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `transaction_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`txn_id`),
  KEY `fk_invtxn_ing` (`ingredient_id`),
  KEY `fk_invtxn_po` (`po_id`),
  KEY `idx_inv_txn_lookup` (`branch_id`,`ingredient_id`,`txn_date`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stock in/out log';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_transactions`
--

LOCK TABLES `inventory_transactions` WRITE;
/*!40000 ALTER TABLE `inventory_transactions` DISABLE KEYS */;
INSERT INTO `inventory_transactions` VALUES (1,1,1,1,'purchase',25.000,320.00,25.000,'Received PO-BLR-2026-001 from FarmFresh',1,'2026-10-09 15:13:45',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(2,2,1,1,'purchase',40.000,240.00,40.000,'Received PO-BLR-2026-001 from FarmFresh',1,'2026-10-09 15:13:45',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(3,1,1,NULL,'consumption',-0.500,320.00,24.500,'Auto-deduct for POS Order ORD-20261009-001',1,'2026-10-09 15:13:45',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(4,8,1,NULL,'purchase',10.000,180.00,25.500,'Stock adjustment',NULL,'2026-10-16 09:47:18',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(5,11269,1,NULL,'adjustment',0.160,40.00,49.680,'Live POS billing deduction (Invoice INV-001)',NULL,'2026-10-30 18:01:53',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(6,10825,1,NULL,'adjustment',0.400,120.00,49.200,'Live POS billing deduction (Invoice INV-001)',NULL,'2026-10-30 18:01:53',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(7,18734,1,NULL,'adjustment',0.400,120.00,49.600,'Live POS billing deduction (Invoice INV-005)',NULL,'2026-11-02 12:21:13',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(8,18738,1,NULL,'adjustment',0.160,40.00,49.840,'Live POS billing deduction (Invoice INV-005)',NULL,'2026-11-02 12:21:13',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(9,20343,1,NULL,'adjustment',0.160,40.00,49.840,'Live POS billing deduction (Invoice INV-008)',NULL,'2026-11-02 16:23:03',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(10,20333,1,NULL,'adjustment',0.400,120.00,49.600,'Live POS billing deduction (Invoice INV-008)',NULL,'2026-11-02 16:23:03',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(11,18738,1,NULL,'adjustment',0.160,40.00,99.680,'Live POS billing deduction (Invoice INV-006)',NULL,'2026-11-02 16:29:30',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(12,18734,1,NULL,'adjustment',0.400,120.00,49.200,'Live POS billing deduction (Invoice INV-006)',NULL,'2026-11-02 16:29:30',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(13,18734,1,NULL,'adjustment',0.400,120.00,48.800,'Live POS billing deduction (Invoice INV-007)',NULL,'2026-11-02 16:29:42',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(14,18738,1,NULL,'adjustment',0.160,40.00,49.520,'Live POS billing deduction (Invoice INV-007)',NULL,'2026-11-02 16:29:42',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(15,20562,1,NULL,'adjustment',0.080,40.00,49.920,'Live POS billing deduction (Invoice INV-051)',NULL,'2026-11-03 14:03:47',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(16,20554,1,NULL,'adjustment',0.200,120.00,49.800,'Live POS billing deduction (Invoice INV-051)',NULL,'2026-11-03 14:03:47',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(17,20562,1,NULL,'adjustment',0.080,40.00,49.840,'Live POS billing deduction (Invoice INV-052)',NULL,'2026-11-03 14:03:57',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(18,20554,1,NULL,'adjustment',0.200,120.00,49.600,'Live POS billing deduction (Invoice INV-052)',NULL,'2026-11-03 14:03:57',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(19,20562,1,NULL,'adjustment',0.160,40.00,49.680,'Live POS billing deduction (Invoice INV-053)',NULL,'2026-11-03 14:05:04',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(20,20554,1,NULL,'adjustment',0.400,120.00,49.200,'Live POS billing deduction (Invoice INV-053)',NULL,'2026-11-03 14:05:05',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(21,20562,1,NULL,'adjustment',0.080,40.00,49.600,'Live POS billing deduction (Invoice INV-054)',NULL,'2026-11-03 14:05:14',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(22,20554,1,NULL,'adjustment',0.200,120.00,49.000,'Live POS billing deduction (Invoice INV-054)',NULL,'2026-11-03 14:05:14',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(23,20562,1,NULL,'adjustment',0.080,40.00,49.520,'Live POS billing deduction (Invoice INV-055)',NULL,'2026-11-03 14:05:24',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(24,20554,1,NULL,'adjustment',0.200,120.00,48.800,'Live POS billing deduction (Invoice INV-055)',NULL,'2026-11-03 14:05:24',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(25,20562,1,NULL,'adjustment',0.080,40.00,49.440,'Live POS billing deduction (Invoice INV-056)',NULL,'2026-11-03 15:18:05',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(26,20554,1,NULL,'adjustment',0.200,120.00,48.600,'Live POS billing deduction (Invoice INV-056)',NULL,'2026-11-03 15:18:06',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(27,20562,1,NULL,'adjustment',0.160,40.00,49.280,'Live POS billing deduction (Invoice INV-057)',NULL,'2026-11-03 15:19:41',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(28,20554,1,NULL,'adjustment',0.400,120.00,48.200,'Live POS billing deduction (Invoice INV-057)',NULL,'2026-11-03 15:19:45',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(29,20562,1,NULL,'adjustment',0.080,40.00,49.200,'Live POS billing deduction (Invoice INV-058)',NULL,'2026-11-03 15:19:57',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(30,20554,1,NULL,'adjustment',0.200,120.00,48.000,'Live POS billing deduction (Invoice INV-058)',NULL,'2026-11-03 15:19:58',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(31,122,1,NULL,'adjustment',0.250,280.00,49741.250,'Live POS billing deduction (Invoice INV-081)',NULL,'2026-11-04 11:23:30',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(32,132,1,NULL,'adjustment',0.040,180.00,51524.840,'Live POS billing deduction (Invoice INV-081)',NULL,'2026-11-04 11:23:30',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(33,150,1,NULL,'adjustment',0.020,250.00,44662.260,'Live POS billing deduction (Invoice INV-081)',NULL,'2026-11-04 11:23:30',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(34,122,1,NULL,'adjustment',0.250,280.00,124353.000,'Live POS billing deduction (Invoice INV-082)',NULL,'2026-11-04 11:24:22',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(35,132,1,NULL,'adjustment',0.040,180.00,128812.080,'Live POS billing deduction (Invoice INV-082)',NULL,'2026-11-04 11:24:22',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(36,150,1,NULL,'adjustment',0.020,250.00,111655.640,'Live POS billing deduction (Invoice INV-082)',NULL,'2026-11-04 11:24:22',1,NULL,NULL,NULL,'2026-11-05 13:08:16','2026-11-05 13:08:16','2026-11-05 13:08:16'),(37,10,1,NULL,'adjustment',5.000,3400.00,20.000,'Cocktail event consumption',NULL,'2026-11-05 07:41:00',1,NULL,NULL,NULL,'2026-11-05 13:11:00','2026-11-05 13:11:00','2026-11-05 13:11:00'),(38,10,1,NULL,'purchase',10.000,3500.00,30.000,'Received 10 new bottles',NULL,'2026-11-05 07:41:00',1,NULL,NULL,NULL,'2026-11-05 13:11:00','2026-11-05 13:11:00','2026-11-05 13:11:00'),(39,11,1,NULL,'adjustment',5.000,3400.00,20.000,'Cocktail event consumption',NULL,'2026-11-05 08:02:47',1,NULL,NULL,NULL,'2026-11-05 13:32:47','2026-11-05 13:32:47','2026-11-05 13:32:47'),(40,11,1,NULL,'purchase',10.000,3500.00,30.000,'Received 10 new bottles',NULL,'2026-11-05 08:02:47',1,NULL,NULL,NULL,'2026-11-05 13:32:47','2026-11-05 13:32:47','2026-11-05 13:32:47');
/*!40000 ALTER TABLE `inventory_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_payments`
--

DROP TABLE IF EXISTS `invoice_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_payments` (
  `payment_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` bigint unsigned NOT NULL,
  `payment_method` enum('cash','card','upi','wallet','netbanking','room_charge') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL,
  `tip_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `txn_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success',
  `received_by` bigint unsigned DEFAULT NULL,
  `paid_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `payment_mode` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CASH',
  `transaction_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_provider` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_order_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_payment_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_signature` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `failure_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`payment_id`),
  KEY `idx_payments_invoice` (`invoice_id`),
  KEY `idx_payments_cashier` (`received_by`,`paid_at`)
) ENGINE=InnoDB AUTO_INCREMENT=115 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Split payment transactions';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_payments`
--

LOCK TABLES `invoice_payments` WRITE;
/*!40000 ALTER TABLE `invoice_payments` DISABLE KEYS */;
INSERT INTO `invoice_payments` VALUES (1,1,'upi',804.00,50.00,'UPI/PAYTM/9845012345/TXN987654','success',3,'2026-10-09 20:31:00',NULL,1,NULL,NULL,0.00,'CASH',NULL,NULL,NULL,NULL,NULL,NULL,NULL),(2,1,'cash',500.00,0.00,'CASH_DRAWER_BLR_01','success',3,'2026-10-09 20:32:00',NULL,1,NULL,NULL,0.00,'CASH',NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3,2,'card',1069.00,0.00,'HDFC_POS_AUTH_543219','success',3,'2026-10-09 20:46:00',NULL,1,NULL,NULL,0.00,'CASH',NULL,NULL,NULL,NULL,NULL,NULL,NULL),(5,4,'cash',286.00,0.00,'TXN-ORD-4-VERIFIED','success',NULL,'2026-10-12 14:55:37',1,1,NULL,NULL,286.00,'CASH','TXN-ORD-4-VERIFIED',NULL,NULL,NULL,NULL,NULL,NULL),(6,5,'upi',525.00,0.00,'UPI-REF-99-TEST','success',NULL,'2026-10-12 14:55:45',1,1,NULL,NULL,525.00,'UPI','UPI-REF-99-TEST',NULL,NULL,NULL,NULL,NULL,NULL),(8,8,'upi',577.50,0.00,'TXN-ORD-5-065042','success',NULL,'2026-10-16 12:20:42',NULL,1,NULL,NULL,577.50,'UPI','TXN-ORD-5-065042',NULL,NULL,NULL,NULL,NULL,NULL),(9,9,'upi',709.50,0.00,'TXN-ORD-6-073950','success',NULL,'2026-10-16 13:09:50',NULL,1,NULL,NULL,709.50,'UPI','TXN-ORD-6-073950',NULL,NULL,NULL,NULL,NULL,NULL),(10,11,'upi',511.50,0.00,'TXN-ORD-7-075526','success',NULL,'2026-10-16 13:25:26',NULL,1,NULL,NULL,511.50,'UPI','TXN-ORD-7-075526',NULL,NULL,NULL,NULL,NULL,NULL),(11,12,'upi',198.00,0.00,'TXN-ORD-8-075704','success',NULL,'2026-10-16 13:27:04',NULL,1,NULL,NULL,198.00,'UPI','TXN-ORD-8-075704',NULL,NULL,NULL,NULL,NULL,NULL),(12,13,'upi',1045.00,0.00,'TXN-ORD-9-080413','success',NULL,'2026-10-16 13:34:13',NULL,1,NULL,NULL,1045.00,'UPI','TXN-ORD-9-080413',NULL,NULL,NULL,NULL,NULL,NULL),(13,14,'cash',275.00,0.00,'TXN-ORD-10-041834','success',NULL,'2026-10-19 09:48:34',NULL,1,NULL,NULL,275.00,'CASH','TXN-ORD-10-041834',NULL,NULL,NULL,NULL,NULL,NULL),(14,15,'upi',324.50,0.00,'TXN-ORD-11-044240','success',NULL,'2026-10-19 10:12:40',NULL,1,NULL,NULL,324.50,'UPI','TXN-ORD-11-044240',NULL,NULL,NULL,NULL,NULL,NULL),(15,16,'card',550.00,0.00,'TXN-ORD-12-091236','success',NULL,'2026-10-19 14:42:36',NULL,1,NULL,NULL,550.00,'CARD','TXN-ORD-12-091236',NULL,NULL,NULL,NULL,NULL,NULL),(16,17,'cash',704.00,0.00,'TXN-ORD-13-051239','success',NULL,'2026-10-21 10:42:39',NULL,1,NULL,NULL,704.00,'CASH','TXN-ORD-13-051239',NULL,NULL,NULL,NULL,NULL,NULL),(17,18,'cash',550.00,0.00,'TXN-ORD-14-051802','success',NULL,'2026-10-21 10:48:02',NULL,1,NULL,NULL,550.00,'CASH','TXN-ORD-14-051802',NULL,NULL,NULL,NULL,NULL,NULL),(18,19,'wallet',599.50,0.00,'TXN-ORD-15-052949','success',NULL,'2026-10-21 10:59:49',NULL,1,NULL,NULL,599.50,'WALLET','TXN-ORD-15-052949',NULL,NULL,NULL,NULL,NULL,NULL),(19,20,'upi',352.00,0.00,'TXN-ORD-16-053329','success',NULL,'2026-10-21 11:03:29',NULL,1,NULL,NULL,352.00,'UPI','TXN-ORD-16-053329',NULL,NULL,NULL,NULL,NULL,NULL),(20,21,'cash',946.00,0.00,'TXN-ORD-17-110333','success',NULL,'2026-10-21 16:33:33',NULL,1,NULL,NULL,946.00,'CASH','TXN-ORD-17-110333',NULL,NULL,NULL,NULL,NULL,NULL),(21,22,'cash',709.50,0.00,'TXN-ORD-18-112642','success',NULL,'2026-10-21 16:56:42',NULL,1,NULL,NULL,709.50,'CASH','TXN-ORD-18-112642',NULL,NULL,NULL,NULL,NULL,NULL),(22,23,'upi',275.00,0.00,'TXN-ORD-19-043446','success',NULL,'2026-10-22 10:04:46',NULL,1,NULL,NULL,275.00,'UPI','TXN-ORD-19-043446',NULL,NULL,NULL,NULL,NULL,NULL),(23,24,'upi',456.50,0.00,'TXN-ORD-20-051850','success',NULL,'2026-10-22 10:48:50',NULL,1,NULL,NULL,456.50,'UPI','TXN-ORD-20-051850',NULL,NULL,NULL,NULL,NULL,NULL),(24,25,'cash',672.00,0.00,'TXN-ORD-21-115657','success',NULL,'2026-10-27 17:26:57',NULL,1,NULL,NULL,672.00,'CASH','TXN-ORD-21-115657',NULL,NULL,NULL,NULL,NULL,NULL),(25,26,'upi',1188.00,0.00,'TXN-ORD-22-062543','success',NULL,'2026-10-29 11:55:43',NULL,1,NULL,NULL,1188.00,'UPI','TXN-ORD-22-062543',NULL,NULL,NULL,NULL,NULL,NULL),(26,27,'upi',495.00,0.00,'TXN-ORD-23-062545','success',NULL,'2026-10-29 11:55:45',NULL,1,NULL,NULL,495.00,'UPI','TXN-ORD-23-062545',NULL,NULL,NULL,NULL,NULL,NULL),(27,28,'upi',583.00,0.00,'TXN-ORD-24-062551','success',NULL,'2026-10-29 11:55:51',NULL,1,NULL,NULL,583.00,'UPI','TXN-ORD-24-062551',NULL,NULL,NULL,NULL,NULL,NULL),(28,29,'upi',1672.00,0.00,'TXN-ORD-25-123154','success',NULL,'2026-10-30 18:01:54',NULL,1,NULL,NULL,1672.00,'UPI','TXN-ORD-25-123154',NULL,NULL,NULL,NULL,NULL,NULL),(29,30,'upi',1001.00,0.00,'TXN-ORD-26-051102','success',NULL,'2026-11-02 10:41:02',NULL,1,NULL,NULL,1001.00,'UPI','TXN-ORD-26-051102',NULL,NULL,NULL,NULL,NULL,NULL),(30,31,'upi',1677.50,0.00,'TXN-ORD-27-055652','success',NULL,'2026-11-02 11:26:52',NULL,1,NULL,NULL,1677.50,'UPI','TXN-ORD-27-055652',NULL,NULL,NULL,NULL,NULL,NULL),(31,32,'upi',968.00,0.00,'TXN-ORD-28-065117','success',NULL,'2026-11-02 12:21:17',NULL,1,NULL,NULL,968.00,'UPI','TXN-ORD-28-065117',NULL,NULL,NULL,NULL,NULL,NULL),(32,33,'upi',495.00,0.00,'TXN-ORD-30-092145','success',NULL,'2026-11-02 14:51:45',NULL,1,NULL,NULL,495.00,'UPI','TXN-ORD-30-092145',NULL,NULL,NULL,NULL,NULL,NULL),(33,34,'upi',633.60,0.00,'TXN-ORD-31-093642','success',NULL,'2026-11-02 15:06:42',NULL,1,NULL,NULL,633.60,'UPI','TXN-ORD-31-093642',NULL,NULL,NULL,NULL,NULL,NULL),(34,35,'upi',633.60,0.00,'TXN-ORD-33-093916','success',NULL,'2026-11-02 15:09:16',NULL,1,NULL,NULL,633.60,'UPI','TXN-ORD-33-093916',NULL,NULL,NULL,NULL,NULL,NULL),(35,37,'upi',1248.50,0.00,'TXN-ORD-29-102007','success',NULL,'2026-11-02 15:50:07',NULL,1,NULL,NULL,1248.50,'UPI','TXN-ORD-29-102007',NULL,NULL,NULL,NULL,NULL,NULL),(36,38,'upi',1507.00,0.00,'TXN-ORD-36-102018','success',NULL,'2026-11-02 15:50:18',NULL,1,NULL,NULL,1507.00,'UPI','TXN-ORD-36-102018',NULL,NULL,NULL,NULL,NULL,NULL),(37,39,'upi',720.50,0.00,'TXN-ORD-45-104056','success',NULL,'2026-11-02 16:10:56',NULL,1,NULL,NULL,720.50,'UPI','TXN-ORD-45-104056',NULL,NULL,NULL,NULL,NULL,NULL),(38,40,'upi',781.00,0.00,'TXN-ORD-46-105303','success',NULL,'2026-11-02 16:23:03',NULL,1,NULL,NULL,781.00,'UPI','TXN-ORD-46-105303',NULL,NULL,NULL,NULL,NULL,NULL),(39,46,'upi',493.80,0.00,NULL,'success',NULL,'2026-11-02 11:54:39',NULL,1,NULL,NULL,493.80,'UPI','TXN-TAK-54-115438',NULL,NULL,NULL,NULL,NULL,NULL),(40,47,'upi',378.00,0.00,NULL,'success',NULL,'2026-11-02 11:54:39',NULL,1,NULL,NULL,378.00,'UPI','TXN-TEST-1793620478846',NULL,NULL,NULL,NULL,NULL,NULL),(41,48,'cash',336.00,0.00,'TXN-ORD-66-072119','success',NULL,'2026-11-03 12:51:19',NULL,1,NULL,NULL,336.00,'CASH','TXN-ORD-66-072119',NULL,NULL,NULL,NULL,NULL,NULL),(42,49,'cash',294.00,0.00,'TXN-ORD-71-074859','success',NULL,'2026-11-03 13:18:59',NULL,1,NULL,NULL,294.00,'CASH','TXN-ORD-71-074859',NULL,NULL,NULL,NULL,NULL,NULL),(43,50,'cash',367.50,0.00,'TXN-ORD-72-074900','success',NULL,'2026-11-03 13:19:00',NULL,1,NULL,NULL,367.50,'CASH','TXN-ORD-72-074900',NULL,NULL,NULL,NULL,NULL,NULL),(44,51,'cash',1323.00,0.00,'TXN-ORD-75-074946','success',NULL,'2026-11-03 13:19:46',NULL,1,NULL,NULL,1323.00,'CASH','TXN-ORD-75-074946',NULL,NULL,NULL,NULL,NULL,NULL),(45,52,'upi',484.00,0.00,'TXN-ORD-64-083347','success',NULL,'2026-11-03 14:03:47',NULL,1,NULL,NULL,484.00,'UPI','TXN-ORD-64-083347',NULL,NULL,NULL,NULL,NULL,NULL),(46,53,'upi',4823.50,0.00,'TXN-ORD-37-083357','success',NULL,'2026-11-03 14:03:57',NULL,1,NULL,NULL,4823.50,'UPI','TXN-ORD-37-083357',NULL,NULL,NULL,NULL,NULL,NULL),(47,54,'upi',1353.00,0.00,'TXN-ORD-59-083504','success',NULL,'2026-11-03 14:05:04',NULL,1,NULL,NULL,1353.00,'UPI','TXN-ORD-59-083504',NULL,NULL,NULL,NULL,NULL,NULL),(48,55,'upi',484.00,0.00,'TXN-ORD-78-083514','success',NULL,'2026-11-03 14:05:14',NULL,1,NULL,NULL,484.00,'UPI','TXN-ORD-78-083514',NULL,NULL,NULL,NULL,NULL,NULL),(49,56,'upi',506.00,0.00,'TXN-ORD-79-083523','success',NULL,'2026-11-03 14:05:23',NULL,1,NULL,NULL,506.00,'UPI','TXN-ORD-79-083523',NULL,NULL,NULL,NULL,NULL,NULL),(50,58,'upi',506.00,0.00,'TXN-ORD-81-094803','success',NULL,'2026-11-03 15:18:03',NULL,1,NULL,NULL,506.00,'UPI','TXN-ORD-81-094803',NULL,NULL,NULL,NULL,NULL,NULL),(51,59,'upi',858.00,0.00,'TXN-ORD-82-094938','success',NULL,'2026-11-03 15:19:38',NULL,1,NULL,NULL,858.00,'UPI','TXN-ORD-82-094938',NULL,NULL,NULL,NULL,NULL,NULL),(52,60,'upi',484.00,0.00,'TXN-ORD-83-094956','success',NULL,'2026-11-03 15:19:56',NULL,1,NULL,NULL,484.00,'UPI','TXN-ORD-83-094956',NULL,NULL,NULL,NULL,NULL,NULL),(53,61,'upi',378.00,0.00,'TXN-ORD-84-055329','success',NULL,'2026-11-04 11:23:29',NULL,1,NULL,NULL,378.00,'UPI','TXN-ORD-84-055329',NULL,NULL,NULL,NULL,NULL,NULL),(54,62,'upi',378.00,0.00,'TXN-ORD-85-055422','success',NULL,'2026-11-04 11:24:22',NULL,1,NULL,NULL,378.00,'UPI','TXN-ORD-85-055422',NULL,NULL,NULL,NULL,NULL,NULL),(55,63,'card',100.00,0.00,'TXN-CARD-1001','success',NULL,'2026-11-04 12:08:00',NULL,1,NULL,NULL,100.00,'CARD','TXN-CARD-1001',NULL,NULL,NULL,NULL,NULL,NULL),(56,63,'upi',50.00,0.00,'TXN-UPI-2002','success',NULL,'2026-11-04 12:08:00',NULL,1,NULL,NULL,50.00,'UPI','TXN-UPI-2002',NULL,NULL,NULL,NULL,NULL,NULL),(57,63,'upi',1.00,0.00,'CONC-1793794080333-1','success',NULL,'2026-11-04 12:08:00',NULL,1,NULL,NULL,1.00,'UPI','CONC-1793794080333-1',NULL,NULL,NULL,NULL,NULL,NULL),(58,63,'upi',1.00,0.00,'CONC-1793794080332-0','success',NULL,'2026-11-04 12:08:00',NULL,1,NULL,NULL,1.00,'UPI','CONC-1793794080332-0',NULL,NULL,NULL,NULL,NULL,NULL),(59,63,'upi',1.00,0.00,'CONC-1793794080333-2','success',NULL,'2026-11-04 12:08:00',NULL,1,NULL,NULL,1.00,'UPI','CONC-1793794080333-2',NULL,NULL,NULL,NULL,NULL,NULL),(60,63,'upi',1.00,0.00,'CONC-1793794080334-3','success',NULL,'2026-11-04 12:08:00',NULL,1,NULL,NULL,1.00,'UPI','CONC-1793794080334-3',NULL,NULL,NULL,NULL,NULL,NULL),(61,63,'upi',1.00,0.00,'CONC-1793794080334-4','success',NULL,'2026-11-04 12:08:00',NULL,1,NULL,NULL,1.00,'UPI','CONC-1793794080334-4',NULL,NULL,NULL,NULL,NULL,NULL),(62,63,'card',100.00,0.00,'TXN-CARD-1001','success',NULL,'2026-11-04 12:08:34',NULL,1,NULL,NULL,100.00,'CARD','TXN-CARD-1001',NULL,NULL,NULL,NULL,NULL,NULL),(63,63,'upi',50.00,0.00,'TXN-UPI-2002','success',NULL,'2026-11-04 12:08:34',NULL,1,NULL,NULL,50.00,'UPI','TXN-UPI-2002',NULL,NULL,NULL,NULL,NULL,NULL),(64,63,'upi',1.00,0.00,'CONC-1793794113804-2','success',NULL,'2026-11-04 12:08:34',NULL,1,NULL,NULL,1.00,'UPI','CONC-1793794113804-2',NULL,NULL,NULL,NULL,NULL,NULL),(65,63,'upi',1.00,0.00,'CONC-1793794113804-1','success',NULL,'2026-11-04 12:08:34',NULL,1,NULL,NULL,1.00,'UPI','CONC-1793794113804-1',NULL,NULL,NULL,NULL,NULL,NULL),(66,63,'upi',1.00,0.00,'CONC-1793794113804-0','success',NULL,'2026-11-04 12:08:34',NULL,1,NULL,NULL,1.00,'UPI','CONC-1793794113804-0',NULL,NULL,NULL,NULL,NULL,NULL),(67,63,'upi',1.00,0.00,'CONC-1793794113804-3','success',NULL,'2026-11-04 12:08:34',NULL,1,NULL,NULL,1.00,'UPI','CONC-1793794113804-3',NULL,NULL,NULL,NULL,NULL,NULL),(68,63,'upi',1.00,0.00,'CONC-1793794113805-4','success',NULL,'2026-11-04 12:08:34',NULL,1,NULL,NULL,1.00,'UPI','CONC-1793794113805-4',NULL,NULL,NULL,NULL,NULL,NULL),(69,63,'card',100.00,0.00,'TXN-CARD-1001','success',NULL,'2026-11-04 12:09:28',NULL,1,NULL,NULL,100.00,'CARD','TXN-CARD-1001',NULL,NULL,NULL,NULL,NULL,NULL),(70,63,'upi',50.00,0.00,'TXN-UPI-2002','success',NULL,'2026-11-04 12:09:28',NULL,1,NULL,NULL,50.00,'UPI','TXN-UPI-2002',NULL,NULL,NULL,NULL,NULL,NULL),(71,63,'upi',1.00,0.00,'CONC-1793794168442-0','success',NULL,'2026-11-04 12:09:28',NULL,1,NULL,NULL,1.00,'UPI','CONC-1793794168442-0',NULL,NULL,NULL,NULL,NULL,NULL),(72,63,'upi',1.00,0.00,'CONC-1793794168442-1','success',NULL,'2026-11-04 12:09:28',NULL,1,NULL,NULL,1.00,'UPI','CONC-1793794168442-1',NULL,NULL,NULL,NULL,NULL,NULL),(73,63,'upi',1.00,0.00,'CONC-1793794168442-2','success',NULL,'2026-11-04 12:09:28',NULL,1,NULL,NULL,1.00,'UPI','CONC-1793794168442-2',NULL,NULL,NULL,NULL,NULL,NULL),(74,63,'upi',1.00,0.00,'CONC-1793794168443-4','success',NULL,'2026-11-04 12:09:28',NULL,1,NULL,NULL,1.00,'UPI','CONC-1793794168443-4',NULL,NULL,NULL,NULL,NULL,NULL),(75,63,'upi',1.00,0.00,'CONC-1793794168443-3','success',NULL,'2026-11-04 12:09:28',NULL,1,NULL,NULL,1.00,'UPI','CONC-1793794168443-3',NULL,NULL,NULL,NULL,NULL,NULL),(111,94,'upi',352.00,0.00,'TXN-ORD-116-042646','success',NULL,'2026-11-11 09:56:46',NULL,1,NULL,NULL,352.00,'UPI','TXN-ORD-116-042646',NULL,NULL,NULL,NULL,NULL,NULL),(113,97,'upi',697.00,0.00,'upi_razorpay_9821739182','success',NULL,'2026-11-11 10:02:46',1,1,NULL,NULL,697.00,'UPI','upi_razorpay_9821739182',NULL,NULL,NULL,NULL,NULL,NULL),(114,98,'card',1295.00,0.00,'hdfc_pos_auth_7841920','success',NULL,'2026-11-11 10:03:01',1,1,NULL,NULL,1295.00,'CARD','hdfc_pos_auth_7841920',NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `invoice_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `invoice_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` bigint unsigned NOT NULL,
  `branch_id` bigint DEFAULT NULL,
  `tax_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'GST',
  `tax_percentage` decimal(5,2) DEFAULT '5.00',
  `taxable_amount` decimal(10,2) NOT NULL,
  `cgst_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `sgst_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(10,2) NOT NULL,
  `service_charge` decimal(10,2) NOT NULL DEFAULT '0.00',
  `round_off` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(10,2) NOT NULL,
  `payment_status` enum('pending','paid','partially_paid','refunded','void') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `invoice_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `updated_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `subtotal` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UNPAID',
  `amount_paid` decimal(18,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`invoice_id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  UNIQUE KEY `order_id` (`order_id`),
  KEY `idx_invoices_date_status` (`branch_id`,`invoice_date`,`payment_status`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tax invoice header';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` VALUES (1,'INV-BLR-2026-0001',1,1,'GST',5.00,1179.00,29.48,29.47,58.95,65.50,0.55,1304.00,'pending','2026-10-09 20:30:00',3,1,NULL,'2026-10-09 15:20:23','2026-10-12 14:43:32',0.00,0.00,0.00,'UNPAID',0.00),(2,'INV-BLR-2026-0002',2,1,'GST',5.00,980.00,24.50,24.50,49.00,0.00,0.00,1069.00,'paid','2026-10-09 20:45:00',3,1,NULL,'2026-10-09 15:20:23','2026-10-09 15:20:23',0.00,0.00,0.00,'UNPAID',0.00),(4,'INV-20261012-4',4,NULL,'GST',5.00,260.00,0.00,0.00,13.00,0.00,0.00,286.00,'paid','2026-10-12 14:53:57',NULL,1,NULL,'2026-10-12 14:53:57','2026-10-12 14:55:37',260.00,0.00,286.00,'PAID',286.00),(5,'INV-20261012-1396',99,1,'GST',5.00,500.00,12.50,12.50,25.00,0.00,0.00,525.00,'paid','2026-10-12 14:55:45',NULL,1,NULL,'2026-10-12 14:55:45','2026-10-15 17:33:43',500.00,0.00,525.00,'PAID',525.00),(8,'INV-20261016-5',5,NULL,'GST',5.00,525.00,0.00,0.00,26.25,0.00,0.00,577.50,'pending','2026-10-16 12:20:42',NULL,1,NULL,'2026-10-16 12:20:42','2026-10-16 12:20:42',525.00,0.00,577.50,'PAID',577.50),(9,'INV-20261016-6',6,NULL,'GST',5.00,645.00,0.00,0.00,32.25,0.00,0.00,709.50,'pending','2026-10-16 13:09:49',NULL,1,NULL,'2026-10-16 13:09:49','2026-10-16 13:09:50',645.00,0.00,709.50,'PAID',709.50),(11,'INV-20261016-7',7,NULL,'GST',5.00,465.00,0.00,0.00,23.25,0.00,0.00,511.50,'pending','2026-10-16 13:25:26',NULL,1,NULL,'2026-10-16 13:25:26','2026-10-16 13:25:26',465.00,0.00,511.50,'PAID',511.50),(12,'INV-20261016-8',8,NULL,'GST',5.00,180.00,0.00,0.00,9.00,0.00,0.00,198.00,'pending','2026-10-16 13:27:04',NULL,1,NULL,'2026-10-16 13:27:04','2026-10-16 13:27:04',180.00,0.00,198.00,'PAID',198.00),(13,'INV-20261016-9',9,NULL,'GST',5.00,950.00,0.00,0.00,47.50,0.00,0.00,1045.00,'pending','2026-10-16 13:34:13',NULL,1,NULL,'2026-10-16 13:34:13','2026-10-16 13:34:13',950.00,0.00,1045.00,'PAID',1045.00),(14,'INV-20261019-10',10,NULL,'GST',5.00,250.00,0.00,0.00,12.50,0.00,0.00,275.00,'pending','2026-10-19 09:48:34',NULL,1,NULL,'2026-10-19 09:48:34','2026-10-19 09:48:34',250.00,0.00,275.00,'PAID',275.00),(15,'INV-20261019-11',11,NULL,'GST',5.00,295.00,0.00,0.00,14.75,0.00,0.00,324.50,'pending','2026-10-19 10:12:40',NULL,1,NULL,'2026-10-19 10:12:40','2026-10-19 10:12:40',295.00,0.00,324.50,'PAID',324.50),(16,'INV-20261019-12',12,NULL,'GST',5.00,500.00,0.00,0.00,25.00,0.00,0.00,550.00,'pending','2026-10-19 14:42:36',NULL,1,NULL,'2026-10-19 14:42:36','2026-10-19 14:42:36',500.00,0.00,550.00,'PAID',550.00),(17,'INV-20261021-13',13,NULL,'GST',5.00,576.00,0.00,0.00,28.80,0.00,0.00,633.60,'pending','2026-10-21 10:42:39',NULL,1,NULL,'2026-10-21 10:42:39','2026-10-21 09:36:36',640.00,64.00,633.60,'PAID',633.60),(18,'INV-20261021-14',14,NULL,'GST',5.00,500.00,0.00,0.00,25.00,0.00,0.00,550.00,'pending','2026-10-21 10:48:02',NULL,1,NULL,'2026-10-21 10:48:02','2026-10-21 10:48:02',500.00,0.00,550.00,'PAID',550.00),(19,'INV-20261021-15',15,NULL,'GST',5.00,490.50,0.00,0.00,24.53,0.00,0.00,539.55,'pending','2026-10-21 10:59:49',NULL,1,NULL,'2026-10-21 10:59:49','2026-10-21 10:29:44',545.00,54.50,539.55,'PAID',539.55),(20,'INV-20261021-16',16,NULL,'GST',5.00,288.00,0.00,0.00,14.40,0.00,0.00,316.80,'pending','2026-10-21 11:03:29',NULL,1,NULL,'2026-10-21 11:03:29','2026-10-21 10:29:16',320.00,32.00,316.80,'PAID',316.80),(21,'INV-20261021-17',17,NULL,'GST',5.00,860.00,0.00,0.00,43.00,0.00,0.00,946.00,'pending','2026-10-21 16:33:33',NULL,1,NULL,'2026-10-21 16:33:33','2026-10-21 16:33:33',860.00,0.00,946.00,'PAID',946.00),(22,'INV-20261021-18',18,NULL,'GST',5.00,645.00,0.00,0.00,32.25,0.00,0.00,709.50,'pending','2026-10-21 16:56:42',NULL,1,NULL,'2026-10-21 16:56:42','2026-10-21 16:56:42',645.00,0.00,709.50,'PAID',709.50),(23,'INV-20261022-19',19,NULL,'GST',5.00,250.00,0.00,0.00,12.50,0.00,0.00,275.00,'pending','2026-10-22 10:04:46',NULL,1,NULL,'2026-10-22 10:04:46','2026-10-22 10:04:46',250.00,0.00,275.00,'PAID',275.00),(24,'INV-20261022-20',20,NULL,'GST',5.00,415.00,0.00,0.00,20.75,0.00,0.00,456.50,'pending','2026-10-22 10:48:50',NULL,1,NULL,'2026-10-22 10:48:50','2026-10-22 10:48:50',415.00,0.00,456.50,'PAID',456.50),(25,'INV-20261027-21',21,NULL,'GST',5.00,640.00,0.00,0.00,32.00,0.00,0.00,672.00,'pending','2026-10-27 17:26:57',NULL,1,NULL,'2026-10-27 17:26:57','2026-10-27 17:26:57',640.00,0.00,672.00,'PAID',672.00),(26,'INV-20261029-22',22,NULL,'GST',5.00,1080.00,0.00,0.00,54.00,0.00,0.00,1188.00,'pending','2026-10-29 11:55:43',NULL,1,NULL,'2026-10-29 11:55:43','2026-10-29 11:55:43',1080.00,0.00,1188.00,'PAID',1188.00),(27,'INV-20261029-23',23,NULL,'GST',5.00,450.00,0.00,0.00,22.50,0.00,0.00,495.00,'pending','2026-10-29 11:55:45',NULL,1,NULL,'2026-10-29 11:55:45','2026-10-29 11:55:45',450.00,0.00,495.00,'PAID',495.00),(28,'INV-20261029-24',24,NULL,'GST',5.00,530.00,0.00,0.00,26.50,0.00,0.00,583.00,'pending','2026-10-29 11:55:51',NULL,1,NULL,'2026-10-29 11:55:51','2026-10-29 11:55:51',530.00,0.00,583.00,'PAID',583.00),(29,'INV-001',25,NULL,'GST',5.00,1520.00,0.00,0.00,76.00,0.00,0.00,1672.00,'pending','2026-10-30 18:01:54',NULL,1,NULL,'2026-10-30 18:01:54','2026-10-30 18:01:54',1520.00,0.00,1672.00,'PAID',1672.00),(30,'INV-002',26,NULL,'GST',5.00,910.00,0.00,0.00,45.50,0.00,0.00,1001.00,'pending','2026-11-02 10:41:02',NULL,1,NULL,'2026-11-02 10:41:02','2026-11-02 10:41:02',910.00,0.00,1001.00,'PAID',1001.00),(31,'INV-003',27,NULL,'GST',5.00,1525.00,0.00,0.00,76.25,0.00,0.00,1677.50,'pending','2026-11-02 11:26:52',NULL,1,NULL,'2026-11-02 11:26:52','2026-11-02 11:26:52',1525.00,0.00,1677.50,'PAID',1677.50),(32,'INV-005',28,NULL,'GST',5.00,880.00,0.00,0.00,44.00,0.00,0.00,968.00,'pending','2026-11-02 12:21:17',NULL,1,NULL,'2026-11-02 12:21:17','2026-11-02 12:21:17',880.00,0.00,968.00,'PAID',968.00),(33,'INV-TEST-1793611304594',30,NULL,'GST',5.00,450.00,0.00,0.00,22.50,0.00,0.00,495.00,'pending','2026-11-02 14:51:45',NULL,1,NULL,'2026-11-02 14:51:45','2026-11-02 14:51:45',500.00,50.00,495.00,'PAID',495.00),(34,'INV-E2E-1793612202957',31,NULL,'GST',5.00,576.00,0.00,0.00,28.80,0.00,0.00,633.60,'pending','2026-11-02 15:06:42',NULL,1,NULL,'2026-11-02 15:06:42','2026-11-02 15:06:43',640.00,64.00,633.60,'PAID',633.60),(35,'INV-E2E-1793612356050',33,NULL,'GST',5.00,576.00,0.00,0.00,28.80,0.00,0.00,633.60,'pending','2026-11-02 15:09:16',NULL,1,NULL,'2026-11-02 15:09:16','2026-11-02 15:09:16',640.00,64.00,633.60,'PAID',633.60),(37,'INV-006',29,NULL,'GST',5.00,1135.00,0.00,0.00,56.75,0.00,0.00,1248.50,'pending','2026-11-02 15:50:07',NULL,1,NULL,'2026-11-02 15:50:07','2026-11-02 15:50:07',1135.00,0.00,1248.50,'PAID',1248.50),(38,'INV-007',36,NULL,'GST',5.00,1370.00,0.00,0.00,68.50,0.00,0.00,1507.00,'pending','2026-11-02 15:50:18',NULL,1,NULL,'2026-11-02 15:50:18','2026-11-02 15:50:18',1370.00,0.00,1507.00,'PAID',1507.00),(39,'INV-20261102-45',45,NULL,'GST',5.00,655.00,0.00,0.00,32.75,0.00,0.00,720.50,'pending','2026-11-02 16:10:56',NULL,1,NULL,'2026-11-02 16:10:56','2026-11-02 16:10:56',655.00,0.00,720.50,'PAID',720.50),(40,'INV-008',46,NULL,'GST',5.00,710.00,0.00,0.00,35.50,0.00,0.00,781.00,'pending','2026-11-02 16:23:03',NULL,1,NULL,'2026-11-02 16:23:03','2026-11-02 16:23:03',710.00,0.00,781.00,'PAID',781.00),(44,'INV-20261102-115022347',52,NULL,'GST',5.00,360.00,0.00,0.00,18.00,0.00,0.00,378.00,'pending','2026-11-02 17:20:22',NULL,1,NULL,'2026-11-02 11:50:22','2026-11-02 11:50:22',360.00,0.00,0.00,'UNPAID',0.00),(46,'INV-20261102-115438435',54,NULL,'GST',5.00,456.00,0.00,0.00,22.80,0.00,0.00,493.80,'pending','2026-11-02 17:24:38',NULL,1,NULL,'2026-11-02 11:54:39','2026-11-02 11:54:39',480.00,24.00,493.80,'PAID',493.80),(47,'INV-20261102-115438814',55,NULL,'GST',5.00,360.00,0.00,0.00,18.00,0.00,0.00,378.00,'paid','2026-11-02 17:24:38',NULL,1,NULL,'2026-11-02 11:54:39','2026-11-02 11:54:39',360.00,0.00,378.00,'PAID',378.00),(48,'TEST-DI-20261103072117',66,NULL,'GST',5.00,320.00,0.00,0.00,16.00,0.00,0.00,336.00,'pending','2026-11-03 12:51:19',NULL,1,NULL,'2026-11-03 12:51:19','2026-11-03 12:51:19',320.00,0.00,336.00,'PAID',336.00),(49,'INV-20261103-71',71,NULL,'GST',5.00,280.00,0.00,0.00,14.00,0.00,0.00,294.00,'pending','2026-11-03 13:18:59',NULL,1,NULL,'2026-11-03 13:18:59','2026-11-03 13:18:59',280.00,0.00,294.00,'PAID',294.00),(50,'INV-20261103-72',72,NULL,'GST',5.00,350.00,0.00,0.00,17.50,0.00,0.00,367.50,'pending','2026-11-03 13:19:00',NULL,1,NULL,'2026-11-03 13:19:00','2026-11-03 13:19:00',350.00,0.00,367.50,'PAID',367.50),(51,'INV-20261103-75',75,NULL,'GST',5.00,1260.00,0.00,0.00,63.00,0.00,0.00,1323.00,'pending','2026-11-03 13:19:46',NULL,1,NULL,'2026-11-03 13:19:46','2026-11-03 13:19:46',1260.00,0.00,1323.00,'PAID',1323.00),(52,'INV-051',64,NULL,'GST',5.00,440.00,0.00,0.00,22.00,0.00,0.00,484.00,'pending','2026-11-03 14:03:47',NULL,1,NULL,'2026-11-03 14:03:47','2026-11-03 14:03:47',440.00,0.00,484.00,'PAID',484.00),(53,'INV-052',37,NULL,'GST',5.00,4385.00,0.00,0.00,219.25,0.00,0.00,4823.50,'pending','2026-11-03 14:03:57',NULL,1,NULL,'2026-11-03 14:03:57','2026-11-03 14:03:57',4385.00,0.00,4823.50,'PAID',4823.50),(54,'INV-053',59,NULL,'GST',5.00,1230.00,0.00,0.00,61.50,0.00,0.00,1353.00,'pending','2026-11-03 14:05:04',NULL,1,NULL,'2026-11-03 14:05:04','2026-11-03 14:05:04',1230.00,0.00,1353.00,'PAID',1353.00),(55,'INV-054',78,NULL,'GST',5.00,440.00,0.00,0.00,22.00,0.00,0.00,484.00,'pending','2026-11-03 14:05:14',NULL,1,NULL,'2026-11-03 14:05:14','2026-11-03 14:05:14',440.00,0.00,484.00,'PAID',484.00),(56,'INV-055',79,NULL,'GST',5.00,460.00,0.00,0.00,23.00,0.00,0.00,506.00,'pending','2026-11-03 14:05:23',NULL,1,NULL,'2026-11-03 14:05:23','2026-11-03 14:05:23',460.00,0.00,506.00,'PAID',506.00),(58,'INV-056',81,NULL,'GST',5.00,460.00,0.00,0.00,23.00,0.00,0.00,506.00,'pending','2026-11-03 15:18:03',NULL,1,NULL,'2026-11-03 15:18:03','2026-11-03 15:18:03',460.00,0.00,506.00,'PAID',506.00),(59,'INV-057',82,NULL,'GST',5.00,780.00,0.00,0.00,39.00,0.00,0.00,858.00,'pending','2026-11-03 15:19:38',NULL,1,NULL,'2026-11-03 15:19:38','2026-11-03 15:19:38',780.00,0.00,858.00,'PAID',858.00),(60,'INV-058',83,NULL,'GST',5.00,440.00,0.00,0.00,22.00,0.00,0.00,484.00,'pending','2026-11-03 15:19:56',NULL,1,NULL,'2026-11-03 15:19:56','2026-11-03 15:19:56',440.00,0.00,484.00,'PAID',484.00),(61,'INV-081',84,NULL,'GST',5.00,360.00,0.00,0.00,18.00,0.00,0.00,378.00,'pending','2026-11-04 11:23:29',NULL,1,NULL,'2026-11-04 11:23:29','2026-11-04 11:23:29',360.00,0.00,378.00,'PAID',378.00),(62,'INV-082',85,NULL,'GST',5.00,360.00,0.00,0.00,18.00,0.00,0.00,378.00,'pending','2026-11-04 11:24:22',NULL,1,NULL,'2026-11-04 11:24:22','2026-11-04 11:24:22',360.00,0.00,378.00,'PAID',378.00),(63,'INV-20261104-8907',34,NULL,'GST',5.00,300.00,0.00,0.00,15.00,0.00,0.00,315.00,'pending','2026-11-04 17:37:59',NULL,1,NULL,'2026-11-04 12:08:00','2026-11-04 12:09:28',300.00,0.00,463.00,'PAID',463.00),(94,'INV-20261111-116',116,NULL,'GST',5.00,320.00,0.00,0.00,16.00,0.00,0.00,352.00,'pending','2026-11-11 09:56:46',NULL,1,NULL,'2026-11-11 09:56:46','2026-11-11 09:56:46',320.00,0.00,352.00,'PAID',352.00),(97,'INV-TK-20261111100246-907',117,1,'GST',5.00,640.00,16.00,16.00,32.00,0.00,0.00,697.00,'paid','2026-11-11 10:02:46',NULL,1,NULL,'2026-11-11 10:02:46','2026-11-11 10:02:46',640.00,0.00,697.00,'PAID',697.00),(98,'INV-TK-20261111100301-744',118,1,'GST',5.00,1200.00,30.00,30.00,60.00,0.00,0.00,1295.00,'paid','2026-11-11 10:03:01',NULL,1,NULL,'2026-11-11 10:03:01','2026-11-11 10:03:01',1200.00,0.00,1295.00,'PAID',1295.00);
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal_voucher_lines`
--

DROP TABLE IF EXISTS `journal_voucher_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `journal_voucher_lines` (
  `line_id` bigint NOT NULL AUTO_INCREMENT,
  `voucher_id` bigint NOT NULL,
  `account_id` bigint NOT NULL,
  `account_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `debit_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `credit_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`line_id`),
  KEY `idx_jvl_voucher` (`voucher_id`),
  KEY `idx_jvl_account` (`account_id`),
  KEY `idx_jvl_code` (`account_code`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_voucher_lines`
--

LOCK TABLES `journal_voucher_lines` WRITE;
/*!40000 ALTER TABLE `journal_voucher_lines` DISABLE KEYS */;
INSERT INTO `journal_voucher_lines` VALUES (1,1,1,'1001','Cash in Hand','Opening drawer cash capital',50000.00,0.00),(2,1,2,'1002','Bank & UPI Collections','Partner capital bank deposit',450000.00,0.00),(3,1,9,'3001','Owner Capital & Equity','Partners equity contribution',0.00,500000.00),(4,2,5,'1500','Kitchen & Bar Equipment','Commercial kitchen ovens & POS terminals',120000.00,0.00),(5,2,2,'1002','Bank & UPI Collections','Payment via business bank transfer',0.00,120000.00);
/*!40000 ALTER TABLE `journal_voucher_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal_vouchers`
--

DROP TABLE IF EXISTS `journal_vouchers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `journal_vouchers` (
  `voucher_id` bigint NOT NULL AUTO_INCREMENT,
  `voucher_number` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `voucher_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `voucher_type` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'JV',
  `narration` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `created_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Posted',
  `void_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`voucher_id`),
  UNIQUE KEY `uk_jv_number` (`voucher_number`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_vouchers`
--

LOCK TABLES `journal_vouchers` WRITE;
/*!40000 ALTER TABLE `journal_vouchers` DISABLE KEYS */;
INSERT INTO `journal_vouchers` VALUES (1,'JV-2026-001','2026-04-01 00:00:00','Capital','Initial Capital infusion by restaurant partners into Bank & Cash',500000.00,'pirnav','Posted',NULL,'2026-04-01 09:00:00','2026-04-01 09:00:00'),(2,'JV-2026-002','2026-04-05 00:00:00','Asset Purchase','Kitchen equipment, espresso bar & POS hardware setup',120000.00,'pirnav','Posted',NULL,'2026-04-05 11:30:00','2026-04-05 11:30:00');
/*!40000 ALTER TABLE `journal_vouchers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kitchen_order_tickets`
--

DROP TABLE IF EXISTS `kitchen_order_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kitchen_order_tickets` (
  `kot_id` bigint NOT NULL AUTO_INCREMENT,
  `kot_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` bigint NOT NULL,
  `station_id` bigint NOT NULL,
  `batch_number` int NOT NULL DEFAULT '1',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Queued',
  `prepared_by_chef_id` bigint DEFAULT NULL,
  `printed_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  PRIMARY KEY (`kot_id`)
) ENGINE=InnoDB AUTO_INCREMENT=109 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kitchen_order_tickets`
--

LOCK TABLES `kitchen_order_tickets` WRITE;
/*!40000 ALTER TABLE `kitchen_order_tickets` DISABLE KEYS */;
INSERT INTO `kitchen_order_tickets` VALUES (1,'KOT-20261027115645182',21,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-10-27 11:56:45',NULL,NULL,NULL,NULL,1),(2,'KOT-20261029062637480',25,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-10-29 06:26:37',NULL,NULL,NULL,NULL,1),(3,'KOT-20261030123030078',25,1,2,'Queued',NULL,NULL,NULL,1,0,'2026-10-30 12:30:30',NULL,NULL,NULL,NULL,1),(4,'KOT-20261102051040175',26,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 05:10:40',NULL,NULL,NULL,NULL,1),(5,'KOT-20261102055635415',27,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 05:56:35',NULL,NULL,NULL,NULL,1),(6,'KOT-20261102070130052',29,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 07:01:30',NULL,NULL,NULL,NULL,1),(7,'KOT-20261102094418963',34,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 09:44:19',NULL,NULL,NULL,NULL,1),(8,'KOT-20261102095439511',35,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 09:54:40',NULL,NULL,NULL,NULL,1),(9,'KOT-20261102095716876',36,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 09:57:17',NULL,NULL,NULL,NULL,1),(10,'KOT-20261102102017469',34,1,2,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:20:17',NULL,NULL,NULL,NULL,1),(11,'KOT-20261102102017582',36,1,2,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:20:18',NULL,NULL,NULL,NULL,1),(12,'KOT-20261102102017682',37,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:20:18',NULL,NULL,NULL,NULL,1),(13,'KOT-20261102102345781',34,1,3,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:23:46',NULL,NULL,NULL,NULL,1),(14,'KOT-20261102102346012',38,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:23:46',NULL,NULL,NULL,NULL,1),(15,'KOT-20261102102346109',37,1,2,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:23:46',NULL,NULL,NULL,NULL,1),(16,'KOT-20261102102346198',37,1,3,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:23:46',NULL,NULL,NULL,NULL,1),(17,'KOT-20261102102346249',37,1,4,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:23:46',NULL,NULL,NULL,NULL,1),(18,'KOT-20261102102809340',39,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:28:09',NULL,NULL,NULL,NULL,1),(19,'KOT-20261102102809403',40,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:28:09',NULL,NULL,NULL,NULL,1),(20,'KOT-20261102102809500',41,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:28:10',NULL,NULL,NULL,NULL,1),(21,'KOT-20261102102809575',41,1,2,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:28:10',NULL,NULL,NULL,NULL,1),(22,'KOT-20261102102809629',41,1,3,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:28:10',NULL,NULL,NULL,NULL,1),(23,'KOT-20261102103632318',39,1,2,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:36:32',NULL,NULL,NULL,NULL,1),(24,'KOT-20261102103632496',41,1,4,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:36:32',NULL,NULL,NULL,NULL,1),(25,'KOT-20261102103632560',41,1,5,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:36:33',NULL,NULL,NULL,NULL,1),(26,'KOT-20261102103632591',41,1,6,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:36:33',NULL,NULL,NULL,NULL,1),(27,'KOT-20261102104042422',42,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:40:42',NULL,NULL,NULL,NULL,1),(28,'KOT-20261102104042657',44,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:40:43',NULL,NULL,NULL,NULL,1),(29,'KOT-20261102104042749',44,1,2,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:40:43',NULL,NULL,NULL,NULL,1),(30,'KOT-20261102104056080',45,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:40:56',NULL,NULL,NULL,NULL,1),(31,'KOT-20261102105241683',46,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 10:52:42',NULL,NULL,NULL,NULL,1),(32,'KOT-20261102110018998',34,1,4,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 11:00:19',NULL,NULL,NULL,NULL,1),(33,'KOT-20261102110144020',48,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 11:01:44',NULL,NULL,NULL,NULL,1),(34,'KOT-20261102110144326',50,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 11:01:44',NULL,NULL,NULL,NULL,1),(35,'KOT-20261102110144427',50,1,2,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 11:01:44',NULL,NULL,NULL,NULL,1),(37,'KOT-20261102115022355',52,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 11:50:22',NULL,NULL,NULL,NULL,1),(39,'KOT-20261102115438672',54,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 11:54:39',NULL,NULL,NULL,NULL,1),(40,'KOT-20261102115438833',55,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 11:54:39',NULL,NULL,NULL,NULL,1),(41,'KOT-20261102115452050',56,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 11:54:52',NULL,NULL,NULL,NULL,1),(42,'KOT-20261102115452163',58,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 11:54:52',NULL,NULL,NULL,NULL,1),(43,'KOT-20261102115452225',58,1,2,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 11:54:52',NULL,NULL,NULL,NULL,1),(44,'KOT-20261102120424559',34,1,5,'Queued',NULL,NULL,NULL,1,0,'2026-11-02 12:04:25',NULL,NULL,NULL,NULL,1),(45,'KOT-20261103071141589',34,1,6,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:11:42',NULL,NULL,NULL,NULL,1),(46,'KOT-20261103071142305',37,1,5,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:11:42',NULL,NULL,NULL,NULL,1),(47,'KOT-20261103071142533',60,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:11:43',NULL,NULL,NULL,NULL,1),(48,'KOT-20261103071207176',61,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:12:07',NULL,NULL,NULL,NULL,1),(49,'KOT-20261103071237593',63,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:12:38',NULL,NULL,NULL,NULL,1),(50,'KOT-20261103071607951',34,1,7,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:16:08',NULL,NULL,NULL,NULL,1),(51,'KOT-20261103071917591',64,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:19:18',NULL,NULL,NULL,NULL,1),(52,'KOT-20261103072029905',65,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:20:30',NULL,NULL,NULL,NULL,1),(53,'KOT-20261103072118999',66,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:21:19',NULL,NULL,NULL,NULL,1),(54,'KOT-20261103073845989',59,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:38:46',NULL,NULL,NULL,NULL,1),(55,'KOT-20261103074428238',67,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:44:28',NULL,NULL,NULL,NULL,1),(56,'KOT-20261103074429008',69,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:44:29',NULL,NULL,NULL,NULL,1),(57,'KOT-20261103074739084',71,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:47:39',NULL,NULL,NULL,NULL,1),(58,'KOT-20261103074740181',61,1,2,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:47:40',NULL,NULL,NULL,NULL,1),(59,'KOT-20261103074859836',73,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:49:00',NULL,NULL,NULL,NULL,1),(60,'KOT-20261103074900852',75,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:49:01',NULL,NULL,NULL,NULL,1),(61,'KOT-20261103074924517',75,1,2,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:49:25',NULL,NULL,NULL,NULL,1),(62,'KOT-20261103074946261',77,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 07:49:46',NULL,NULL,NULL,NULL,1),(63,'KOT-20261103083413517',59,1,2,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 08:34:14',NULL,NULL,NULL,NULL,1),(64,'KOT-20261103084205781',80,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 08:42:06',NULL,NULL,NULL,NULL,1),(65,'KOT-20261103092516757',77,1,2,'Queued',NULL,NULL,NULL,1,0,'2026-11-03 09:25:17',NULL,NULL,NULL,NULL,1),(66,'KOT-20261104055226155',34,1,8,'Queued',NULL,NULL,NULL,1,0,'2026-11-04 05:52:26',NULL,NULL,NULL,NULL,1),(67,'KOT-20261104055330322',84,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-04 05:53:30',NULL,NULL,NULL,NULL,1),(68,'KOT-20261104055422705',85,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-04 05:54:23',NULL,NULL,NULL,NULL,1),(69,'KOT-20261104114901508',77,1,3,'Queued',NULL,NULL,NULL,1,0,'2026-11-04 11:49:02',NULL,NULL,NULL,NULL,1),(70,'KOT-20261105070926305',34,1,9,'Queued',NULL,NULL,NULL,1,0,'2026-11-05 07:09:26',NULL,NULL,NULL,NULL,1),(71,'KOT-20261105075127608',86,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-05 07:51:28',NULL,NULL,NULL,NULL,1),(72,'KOT-20261105130627402',60,1,2,'Queued',NULL,NULL,NULL,1,0,'2026-11-05 13:06:27',NULL,NULL,NULL,NULL,1),(73,'KOT-20261106050236440',87,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-06 05:02:36',NULL,NULL,NULL,NULL,1),(74,'KOT-20261106102555578',34,1,10,'Queued',NULL,NULL,NULL,1,0,'2026-11-06 10:25:56',NULL,NULL,NULL,NULL,1),(75,'KOT-20261106102642932',34,1,11,'Queued',NULL,NULL,NULL,1,0,'2026-11-06 10:26:43',NULL,NULL,NULL,NULL,1),(76,'KOT-20261106102747265',73,1,2,'Queued',NULL,NULL,NULL,1,0,'2026-11-06 10:27:47',NULL,NULL,NULL,NULL,1),(77,'KOT-20261106103132352',73,1,3,'Queued',NULL,NULL,NULL,1,0,'2026-11-06 10:31:32',NULL,NULL,NULL,NULL,1),(78,'KOT-20261106103356473',88,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-06 10:33:56',NULL,NULL,NULL,NULL,1),(106,'KOT-20261111042646117',116,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-11 04:26:46',NULL,NULL,NULL,NULL,1),(107,'KOT-20261111043458435',117,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-11 04:34:58',NULL,NULL,NULL,NULL,1),(108,'KOT-20261111043533522',118,1,1,'Queued',NULL,NULL,NULL,1,0,'2026-11-11 04:35:34',NULL,NULL,NULL,NULL,1);
/*!40000 ALTER TABLE `kitchen_order_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kitchen_orders`
--

DROP TABLE IF EXISTS `kitchen_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kitchen_orders` (
  `kot_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `kot_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `chef_id` bigint unsigned DEFAULT NULL,
  `batch_number` int NOT NULL DEFAULT '1',
  `status` enum('queued','preparing','ready','served','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'queued',
  `priority` enum('normal','high','urgent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `special_notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`kot_id`),
  UNIQUE KEY `kot_number` (`kot_number`),
  KEY `fk_kot_order` (`order_id`),
  KEY `fk_kot_chef` (`chef_id`),
  KEY `idx_kot_kds_lookup` (`branch_id`,`status`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Kitchen Order Tickets (KDS)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kitchen_orders`
--

LOCK TABLES `kitchen_orders` WRITE;
/*!40000 ALTER TABLE `kitchen_orders` DISABLE KEYS */;
INSERT INTO `kitchen_orders` VALUES (1,'KOT-20261009-001',1,1,3,1,'ready','normal','Table 2 - Serve starters first','2026-10-09 15:13:45','2026-10-09 19:45:00'),(2,'KOT-20261009-002',2,1,3,1,'ready','high','Delivery parcel - seal container tightly','2026-10-09 15:13:45','2026-11-03 09:51:43'),(3,'KOT-20261012-007',7,1,NULL,1,'ready','normal','Table: Table 1 (Main Hall)','2026-10-12 14:43:46','2026-10-12 14:43:51'),(4,'KOT-20261012-010',10,1,NULL,1,'ready','normal','Table: Table 3 (Main Hall)','2026-10-12 14:53:26','2026-10-12 14:53:41'),(5,'KOT-20261027115645182',21,1,NULL,1,'queued','normal','Table:  ()','2026-10-27 17:26:45',NULL),(6,'KOT-20261029062637480',25,1,NULL,1,'queued','normal','Table:  ()','2026-10-29 11:56:37',NULL),(7,'KOT-20261030123030078',25,1,NULL,2,'queued','normal','Table:  ()','2026-10-30 18:00:30',NULL),(8,'KOT-20261102051040175',26,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 10:40:40',NULL),(9,'KOT-20261102055635415',27,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 11:26:35',NULL),(10,'KOT-20261102070130052',29,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 12:31:30',NULL),(11,'KOT-20261102094418963',34,1,NULL,1,'ready','normal','Table:  ()','2026-11-02 15:14:19','2026-11-04 04:45:07'),(12,'KOT-20261102095439511',35,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 15:24:39',NULL),(13,'KOT-20261102095716876',36,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 15:27:16',NULL),(14,'KOT-20261102102017469',34,1,NULL,2,'ready','normal','Table: Table-1 (Main Hall)','2026-11-02 15:50:17','2026-11-04 04:45:07'),(15,'KOT-20261102102017582',36,1,NULL,2,'queued','normal','Table: Table-2 (Main Hall)','2026-11-02 15:50:17',NULL),(16,'KOT-20261102102017682',37,1,NULL,1,'ready','normal','Table: Table-3 (Main Hall)','2026-11-02 15:50:17','2026-11-03 07:42:30'),(17,'KOT-20261102102345781',34,1,NULL,3,'ready','normal','Table: Table-1 (Main Hall)','2026-11-02 15:53:45','2026-11-04 04:45:07'),(18,'KOT-20261102102346012',38,1,NULL,1,'queued','normal','Table: Table-2 (Main Hall)','2026-11-02 15:53:46',NULL),(19,'KOT-20261102102346109',37,1,NULL,2,'ready','normal','Table: Table-3 (Main Hall)','2026-11-02 15:53:46','2026-11-03 07:42:30'),(20,'KOT-20261102102346198',37,1,NULL,3,'ready','normal','Table: Table-3 (Main Hall)','2026-11-02 15:53:46','2026-11-03 07:42:30'),(21,'KOT-20261102102346249',37,1,NULL,4,'ready','normal','Table: Table-3 (Main Hall)','2026-11-02 15:53:46','2026-11-03 07:42:30'),(22,'KOT-20261102102809340',39,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 15:58:09',NULL),(23,'KOT-20261102102809403',40,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 15:58:09',NULL),(24,'KOT-20261102102809500',41,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 15:58:09',NULL),(25,'KOT-20261102102809575',41,1,NULL,2,'queued','normal','Table:  ()','2026-11-02 15:58:09',NULL),(26,'KOT-20261102102809629',41,1,NULL,3,'queued','normal','Table:  ()','2026-11-02 15:58:09',NULL),(27,'KOT-20261102103632318',39,1,NULL,2,'queued','normal','Table:  ()','2026-11-02 16:06:32',NULL),(28,'KOT-20261102103632496',41,1,NULL,4,'queued','normal','Table:  ()','2026-11-02 16:06:32',NULL),(29,'KOT-20261102103632560',41,1,NULL,5,'queued','normal','Table:  ()','2026-11-02 16:06:32',NULL),(30,'KOT-20261102103632591',41,1,NULL,6,'queued','normal','Table:  ()','2026-11-02 16:06:32',NULL),(31,'KOT-20261102104042422',42,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 16:10:42',NULL),(32,'KOT-20261102104042657',44,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 16:10:42',NULL),(33,'KOT-20261102104042749',44,1,NULL,2,'queued','normal','Table:  ()','2026-11-02 16:10:42',NULL),(34,'KOT-20261102104056080',45,1,NULL,1,'queued','normal','Table: Takeaway (Takeaway)','2026-11-02 16:10:56',NULL),(35,'KOT-20261102105241683',46,1,NULL,1,'queued','normal','Table: Table-4 (Main Hall)','2026-11-02 16:22:41',NULL),(36,'KOT-20261102110018998',34,1,NULL,4,'ready','normal','Table: Table-1 (Main Hall)','2026-11-02 16:30:19','2026-11-04 04:45:07'),(37,'KOT-20261102110144020',48,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 16:31:44',NULL),(38,'KOT-20261102110144326',50,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 16:31:44',NULL),(39,'KOT-20261102110144427',50,1,NULL,2,'queued','normal','Table:  ()','2026-11-02 16:31:44',NULL),(41,'KOT-20261102115022355',52,1,NULL,1,'queued','normal','Takeaway Order','2026-11-02 17:20:22',NULL),(43,'KOT-20261102115438672',54,1,NULL,1,'queued','normal','Takeaway Order','2026-11-02 17:24:38',NULL),(44,'KOT-20261102115438833',55,1,NULL,1,'queued','normal','Takeaway Order','2026-11-02 17:24:38',NULL),(45,'KOT-20261102115452050',56,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 17:24:52',NULL),(46,'KOT-20261102115452163',58,1,NULL,1,'queued','normal','Table:  ()','2026-11-02 17:24:52',NULL),(47,'KOT-20261102115452225',58,1,NULL,2,'queued','normal','Table:  ()','2026-11-02 17:24:52',NULL),(48,'KOT-20261102120424559',34,1,NULL,5,'ready','normal','Table: Table-1 (Main Hall)','2026-11-02 17:34:24','2026-11-04 04:45:07'),(49,'KOT-20261103071141589',34,1,NULL,6,'ready','normal','Table:  ()','2026-11-03 12:41:41','2026-11-04 04:45:07'),(50,'KOT-20261103071142305',37,1,NULL,5,'ready','normal','Table:  ()','2026-11-03 12:41:42','2026-11-03 07:42:30'),(51,'KOT-20261103071142533',60,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 12:41:42',NULL),(52,'KOT-20261103071207176',61,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 12:42:07',NULL),(53,'KOT-20261103071237593',63,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 12:42:37',NULL),(54,'KOT-20261103071607951',34,1,NULL,7,'ready','normal','Table:  ()','2026-11-03 12:46:08','2026-11-04 04:45:07'),(55,'KOT-20261103071917591',64,1,NULL,1,'ready','normal','Table:  ()','2026-11-03 12:49:17','2026-11-03 07:42:33'),(56,'KOT-20261103072029905',65,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 12:50:29',NULL),(57,'KOT-20261103072118999',66,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 12:51:19',NULL),(58,'KOT-20261103073845989',59,1,NULL,1,'ready','normal','Table:  ()','2026-11-03 13:08:46','2026-11-03 08:34:57'),(59,'KOT-20261103074428238',67,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 13:14:28',NULL),(60,'KOT-20261103074429008',69,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 13:14:29',NULL),(61,'KOT-20261103074739084',71,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 13:17:39',NULL),(62,'KOT-20261103074740181',61,1,NULL,2,'queued','normal','Table:  ()','2026-11-03 13:17:40',NULL),(63,'KOT-20261103074859836',73,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 13:18:59',NULL),(64,'KOT-20261103074900852',75,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 13:19:00',NULL),(65,'KOT-20261103074924517',75,1,NULL,2,'queued','normal','Table:  ()','2026-11-03 13:19:24',NULL),(66,'KOT-20261103074946261',77,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 13:19:46',NULL),(67,'KOT-20261103083413517',59,1,NULL,2,'ready','normal','Table:  ()','2026-11-03 14:04:13','2026-11-03 08:34:57'),(68,'KOT-20261103084205781',80,1,NULL,1,'queued','normal','Table:  ()','2026-11-03 14:12:05',NULL),(69,'KOT-20261103092516757',77,1,NULL,2,'queued','normal','Table:  ()','2026-11-03 14:55:16',NULL),(70,'KOT-20261104055226155',34,1,NULL,8,'queued','normal','Table:  ()','2026-11-04 11:22:26',NULL),(71,'KOT-20261104055330322',84,1,NULL,1,'queued','normal','Table:  ()','2026-11-04 11:23:30',NULL),(72,'KOT-20261104055422705',85,1,NULL,1,'queued','normal','Table:  ()','2026-11-04 11:24:22',NULL),(73,'KOT-20261104114901508',77,1,NULL,3,'queued','normal','Table:  ()','2026-11-04 17:19:01',NULL),(74,'KOT-20261105070926305',34,1,NULL,9,'queued','normal','Table:  ()','2026-11-05 12:39:26',NULL),(75,'KOT-20261105075127608',86,1,NULL,1,'queued','normal','Table:  ()','2026-11-05 13:21:27',NULL),(76,'KOT-20261105130627402',60,1,NULL,2,'queued','normal','Table:  ()','2026-11-05 18:36:27',NULL),(77,'KOT-20261106050236440',87,1,NULL,1,'queued','normal','Table:  ()','2026-11-06 10:32:36',NULL),(78,'KOT-20261106102555578',34,1,NULL,10,'queued','normal','Table: Table-1 (Main Hall)','2026-11-06 15:55:55',NULL),(79,'KOT-20261106102642932',34,1,NULL,11,'queued','normal','Table: Table-1 (Main Hall)','2026-11-06 15:56:42',NULL),(80,'KOT-20261106102747265',73,1,NULL,2,'queued','normal','Table: Table-14 (Main Hall)','2026-11-06 15:57:47',NULL),(81,'KOT-20261106103132352',73,1,NULL,3,'queued','normal','Table: Table-14 (Main Hall)','2026-11-06 16:01:32',NULL),(82,'KOT-20261106103356473',88,1,NULL,1,'queued','normal','Table: Table-3 (Main Hall)','2026-11-06 16:03:56',NULL),(110,'KOT-20261111042646117',116,1,NULL,1,'queued','normal','Table: Takeaway (Takeaway)','2026-11-11 09:56:46',NULL),(113,'KOT-TK-20261111100246-655',117,1,NULL,1,'queued','high','Takeaway Token: TK-1111-6706','2026-11-11 10:02:46',NULL),(114,'KOT-TK-20261111100301-136',118,1,NULL,1,'served','high','Takeaway Token: TK-1111-5120','2026-11-11 10:03:01','2026-11-11 10:03:55'),(115,'KOT-20261111043458435',117,1,NULL,1,'queued','normal','Table: Takeaway (Takeaway)','2026-11-11 10:04:58',NULL),(116,'KOT-20261111043533522',118,1,NULL,1,'queued','normal','Table: Takeaway (Takeaway)','2026-11-11 10:05:33',NULL);
/*!40000 ALTER TABLE `kitchen_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kitchen_stations`
--

DROP TABLE IF EXISTS `kitchen_stations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kitchen_stations` (
  `station_id` bigint NOT NULL AUTO_INCREMENT,
  `outlet_id` bigint DEFAULT '1',
  `station_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `printer_ip` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `branch_id` bigint DEFAULT NULL,
  PRIMARY KEY (`station_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kitchen_stations`
--

LOCK TABLES `kitchen_stations` WRITE;
/*!40000 ALTER TABLE `kitchen_stations` DISABLE KEYS */;
INSERT INTO `kitchen_stations` VALUES (1,1,'Main Kitchen',NULL,1,0,'2026-10-12 12:56:26',NULL,NULL,NULL,1),(2,1,'Beverages & Bar',NULL,1,0,'2026-10-12 12:56:26',NULL,NULL,NULL,1),(3,1,'Tandoor & Grill',NULL,1,0,'2026-10-12 12:56:26',NULL,NULL,NULL,1);
/*!40000 ALTER TABLE `kitchen_stations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kot_order_items`
--

DROP TABLE IF EXISTS `kot_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kot_order_items` (
  `order_item_id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `menu_item_id` bigint DEFAULT NULL,
  `dish_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `item_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`order_item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kot_order_items`
--

LOCK TABLES `kot_order_items` WRITE;
/*!40000 ALTER TABLE `kot_order_items` DISABLE KEYS */;
INSERT INTO `kot_order_items` VALUES (1,1,1,'Hyderabadi Chicken Dum Biryani',1,'READY','2026-10-09 09:56:43','2026-10-09 09:56:43',NULL,1,NULL,NULL),(2,1,2,'Royal Mutton Dum Biryani',1,'READY','2026-10-09 09:56:43','2026-10-09 09:56:43',NULL,1,NULL,NULL),(3,2,NULL,'Hyderabadi Chicken Dum Biryani',2,'PENDING','2026-10-12 13:07:03','2026-10-12 13:07:03',NULL,1,NULL,NULL),(4,2,NULL,'Paneer Butter Masala',1,'PENDING','2026-10-12 13:07:03','2026-10-12 13:07:03',NULL,1,NULL,NULL),(5,3,NULL,'Hyderabadi Chicken Dum Biryani',2,'PENDING','2026-10-12 13:09:46','2026-10-12 13:09:46',NULL,1,NULL,NULL),(6,3,NULL,'Paneer Butter Masala',1,'PENDING','2026-10-12 13:09:46','2026-10-12 13:09:46',NULL,1,NULL,NULL),(7,4,NULL,'Hyderabadi Chicken Dum Biryani',2,'PENDING','2026-10-12 13:10:37','2026-10-12 13:10:37',NULL,1,NULL,NULL),(8,4,NULL,'Paneer Butter Masala',1,'PENDING','2026-10-12 13:10:37','2026-10-12 13:10:37',NULL,1,NULL,NULL),(9,5,NULL,'Hyderabadi Chicken Dum Biryani',2,'PENDING','2026-10-12 13:12:53','2026-10-12 13:12:53',NULL,1,NULL,NULL),(10,5,NULL,'Paneer Butter Masala',1,'PENDING','2026-10-12 13:12:53','2026-10-12 13:12:53',NULL,1,NULL,NULL),(11,6,NULL,'Hyderabadi Chicken Dum Biryani',3,'READY','2026-10-12 13:14:05','2026-10-12 13:14:15',NULL,1,NULL,NULL),(12,6,NULL,'Special Boneless Chicken Biryani',1,'READY','2026-10-12 13:14:05','2026-10-12 13:14:15',NULL,1,NULL,NULL),(13,8,1,'Paneer Butter Masala',2,'PENDING','2026-10-12 14:51:11','2026-10-12 14:51:11',NULL,1,NULL,NULL),(14,9,1,'Paneer Butter Masala',2,'PENDING','2026-10-12 14:52:39','2026-10-12 14:52:39',NULL,1,NULL,NULL),(15,10,2,'Butter Naan',4,'PENDING','2026-10-12 14:53:26','2026-10-12 14:53:26',NULL,1,NULL,NULL),(16,11,NULL,'Butter Naan',3,'READY','2026-10-16 09:47:18','2026-10-16 09:47:18',NULL,1,NULL,NULL),(17,11,NULL,'Chicken Tikka',1,'READY','2026-10-16 09:47:18','2026-10-16 09:47:18',NULL,1,NULL,NULL),(18,12,1,'Butter Chicken',2,'PENDING','2026-10-16 12:40:41','2026-10-16 12:40:41',NULL,1,NULL,NULL),(19,13,1,'Butter Chicken',2,'PENDING','2026-10-19 09:42:59','2026-10-19 09:42:59',NULL,1,NULL,NULL),(20,14,1,'Biryani',1,'PENDING','2026-10-19 10:47:31','2026-10-19 10:47:31',NULL,1,NULL,NULL),(21,15,NULL,'Hyderabadi Chicken Dum Biryani',1,'PENDING','2026-10-19 10:47:39','2026-10-19 10:47:39',NULL,1,NULL,NULL),(22,16,1,'Hyderabadi Chicken Dum Biryani',2,'PENDING','2026-10-19 10:59:59','2026-10-19 10:59:59',NULL,1,NULL,NULL),(23,16,2,'Butter Naan',3,'PENDING','2026-10-19 10:59:59','2026-10-19 10:59:59',NULL,1,NULL,NULL),(24,17,1,'Hyderabadi Chicken Dum Biryani',1,'PENDING','2026-10-19 11:02:43','2026-10-19 11:02:43',NULL,1,NULL,NULL),(25,18,1,'Chicken Biryani',2,'PENDING','2026-10-21 10:49:49','2026-10-21 10:49:49',NULL,1,NULL,NULL),(26,19,1,'Chicken Biryani',2,'PENDING','2026-10-21 10:50:08','2026-10-21 10:50:08',NULL,1,NULL,NULL),(27,20,NULL,'Chicken Dum Biryani',2,'IN PREP','2026-10-21 16:33:11','2026-10-21 16:33:25',NULL,1,NULL,NULL),(28,20,NULL,'Chocolate Milkshake',2,'PENDING','2026-10-21 16:33:11','2026-10-21 16:33:11',NULL,1,NULL,NULL),(29,21,41,'bagara with mutton',1,'PENDING','2026-10-21 16:52:49','2026-10-21 16:52:49',NULL,1,NULL,NULL),(30,21,35,'Paneer Butter Masala',1,'PENDING','2026-10-21 16:52:49','2026-10-21 16:52:49',NULL,1,NULL,NULL),(31,21,34,'Brownie with ice cream',1,'PENDING','2026-10-21 16:52:49','2026-10-21 16:52:49',NULL,1,NULL,NULL),(32,22,35,'Paneer Butter Masala',1,'PENDING','2026-10-21 16:53:09','2026-10-21 16:53:09',NULL,1,NULL,NULL),(33,22,21,'Andhra Mutton Curry',1,'PENDING','2026-10-21 16:53:09','2026-10-21 16:53:09',NULL,1,NULL,NULL),(34,22,19,'Crispy Corn Salt & Pepper',1,'PENDING','2026-10-21 16:53:09','2026-10-21 16:53:09',NULL,1,NULL,NULL),(35,23,41,'bagara with mutton',1,'PENDING','2026-10-21 16:53:43','2026-10-21 16:53:43',NULL,1,NULL,NULL),(36,23,35,'Paneer Butter Masala',1,'PENDING','2026-10-21 16:53:43','2026-10-21 16:53:43',NULL,1,NULL,NULL),(37,23,34,'Brownie with ice cream',1,'PENDING','2026-10-21 16:53:43','2026-10-21 16:53:43',NULL,1,NULL,NULL),(38,24,41,'bagara with mutton',1,'PENDING','2026-10-21 16:55:07','2026-10-21 16:55:07',NULL,1,NULL,NULL),(39,24,35,'Paneer Butter Masala',1,'PENDING','2026-10-21 16:55:07','2026-10-21 16:55:07',NULL,1,NULL,NULL),(40,24,34,'Brownie with ice cream',1,'PENDING','2026-10-21 16:55:07','2026-10-21 16:55:07',NULL,1,NULL,NULL),(41,25,41,'bagara with mutton',1,'PENDING','2026-10-22 09:46:44','2026-10-22 09:46:44',NULL,1,NULL,NULL),(42,25,35,'Paneer Butter Masala',1,'PENDING','2026-10-22 09:46:44','2026-10-22 09:46:44',NULL,1,NULL,NULL),(43,25,34,'Brownie with ice cream',1,'PENDING','2026-10-22 09:46:44','2026-10-22 09:46:44',NULL,1,NULL,NULL),(44,26,35,'Paneer Butter Masala',1,'PENDING','2026-10-22 10:04:05','2026-10-22 10:04:05',NULL,1,NULL,NULL),(45,27,29,'Mango Lassi',1,'PENDING','2026-10-22 10:48:30','2026-10-22 10:48:30',NULL,1,NULL,NULL),(46,27,35,'Paneer Butter Masala',1,'PENDING','2026-10-22 10:48:30','2026-10-22 10:48:30',NULL,1,NULL,NULL),(47,27,25,'Tandoori Roti',1,'PENDING','2026-10-22 10:48:30','2026-10-22 10:48:30',NULL,1,NULL,NULL);
/*!40000 ALTER TABLE `kot_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kot_orders`
--

DROP TABLE IF EXISTS `kot_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kot_orders` (
  `order_id` bigint NOT NULL AUTO_INCREMENT,
  `table_id` bigint DEFAULT NULL,
  `table_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `section_area` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Main Hall',
  `server_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `order_received_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `kot_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `order_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DINE_IN',
  `table_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `total_items` int NOT NULL DEFAULT '0',
  `prepared_items` int NOT NULL DEFAULT '0',
  `special_instructions` text COLLATE utf8mb4_unicode_ci,
  `staff_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kot_orders`
--

LOCK TABLES `kot_orders` WRITE;
/*!40000 ALTER TABLE `kot_orders` DISABLE KEYS */;
INSERT INTO `kot_orders` VALUES (1,NULL,'Table 3','Main Hall','Rajesh K.','PREPARATION COMPLETED','2026-10-09 09:31:43','2026-10-09 09:56:43','2026-10-09 09:56:43',NULL,'','DINE_IN',NULL,NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(2,NULL,'Main Table','Main Hall','Captain Vishnu','PENDING','2026-10-12 13:07:03','2026-10-12 13:07:03','2026-10-12 13:07:03',NULL,'','DINE_IN',NULL,NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(3,NULL,'Live Verification Table','Main Hall','Captain Vishnu','PENDING','2026-10-12 13:09:46','2026-10-12 13:09:46','2026-10-12 13:09:46',NULL,'','DINE_IN',NULL,NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(4,11,'Live Verification Table','Main Hall','Captain Vishnu','PENDING','2026-10-12 13:10:37','2026-10-12 13:10:37','2026-10-12 13:10:37',NULL,'','DINE_IN',NULL,NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(5,12,'Table Final 101','Main Hall','Captain Vishnu','PENDING','2026-10-12 13:12:53','2026-10-12 13:12:53','2026-10-12 13:12:53',NULL,'','DINE_IN',NULL,NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(6,12,'Table Final 101','Main Hall','Captain Vishnu','PREPARATION COMPLETED','2026-10-12 13:14:05','2026-10-12 13:14:05','2026-10-12 13:14:15',NULL,'','DINE_IN',NULL,NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(7,1,'Table 1','Main Hall','Rajesh K.','PREPARATION COMPLETED','2026-10-12 14:43:46','2026-10-12 14:43:46','2026-10-12 14:43:51',NULL,'KOT-20261012-007','DINE_IN',NULL,NULL,'PREPARATION COMPLETED',0,0,NULL,NULL,NULL,1,NULL,NULL),(8,2,'Table 2','Main Hall','K Vishnu Verified','PENDING','2026-10-12 14:51:11','2026-10-12 14:51:11','2026-10-12 14:51:11',NULL,'','DINE_IN',NULL,NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(9,2,'Table 2','Main Hall','K Vishnu Verified','PENDING','2026-10-12 14:52:39','2026-10-12 14:52:39','2026-10-12 14:52:39',NULL,'','DINE_IN',NULL,NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(10,3,'Table 3','Main Hall','K Vishnu Verified','PREPARATION COMPLETED','2026-10-12 14:53:26','2026-10-12 14:53:26','2026-10-12 14:53:41',NULL,'KOT-20261012-010','DINE_IN',NULL,NULL,'PREPARATION COMPLETED',0,0,NULL,NULL,NULL,1,NULL,NULL),(11,4,'Table 4','Main Hall','Captain Ramesh','READY','2026-10-16 09:47:18','2026-10-16 09:47:18','2026-10-16 09:47:18',NULL,'','DINE_IN',NULL,NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(12,1,'Table T1','Main Hall','Ramesh','PENDING','2026-10-16 12:40:41','2026-10-16 12:40:41','2026-10-16 12:40:41',NULL,'','DINE_IN',NULL,NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(13,7,'T-07','Main Hall','Staff','PENDING','2026-10-19 09:42:59','2026-10-19 09:42:59','2026-10-19 09:42:59',NULL,'','DINE_IN',NULL,NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(14,1,'T-01','Main Hall','Staff','PENDING','2026-10-19 10:47:25','2026-10-19 10:47:25','2026-10-19 10:47:25',NULL,'','DINE_IN',NULL,NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(15,1,'Table 1','Main Hall','Staff','PENDING','2026-10-19 10:47:39','2026-10-19 10:47:39','2026-10-19 10:47:39',NULL,'','DINE_IN',NULL,NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(16,1,'T-01','Rooftop','Captain Ramesh','PENDING','2026-10-19 10:59:59','2026-10-19 10:59:59','2026-10-19 10:59:59',NULL,'','DINE_IN',NULL,NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(17,2,'T-02','Main Hall','Captain Ramesh','PENDING','2026-10-19 11:02:43','2026-10-19 11:02:43','2026-10-19 11:02:43',NULL,'KOT-0017','DINE_IN','T-02',NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(18,1,'T-01','Main Hall','Ravi Kumar','PENDING','2026-10-21 10:49:49','2026-10-21 10:49:49','2026-10-21 10:49:49',NULL,'KOT-0018','DINE_IN','T-01',NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(19,1,'T-01','Main Hall','Ravi Kumar','PENDING','2026-10-21 10:50:08','2026-10-21 10:50:08','2026-10-21 10:50:08',NULL,'KOT-0019','DINE_IN','T-01',NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(20,4,'Table-4','Main Hall','Karan D.','PENDING','2026-10-21 16:33:11','2026-10-21 16:33:11','2026-10-21 16:33:11',NULL,'KOT-0020','DINE_IN','Table-4',NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(21,3,'Table 3','Main Hall','Server','PENDING','2026-10-21 16:52:49','2026-10-21 16:52:49','2026-10-21 16:52:49',NULL,'KOT-0021','DINE_IN','Table 3',NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(22,4,'Table 4','Main Hall','Server','PENDING','2026-10-21 16:53:09','2026-10-21 16:53:09','2026-10-21 16:53:09',NULL,'KOT-0022','DINE_IN','Table 4',NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(23,3,'Table 3','Main Hall','Server','PENDING','2026-10-21 16:53:43','2026-10-21 16:53:43','2026-10-21 16:53:43',NULL,'KOT-0023','DINE_IN','Table 3',NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(24,3,'Table 3','Main Hall','Server','PENDING','2026-10-21 16:55:07','2026-10-21 16:55:07','2026-10-21 16:55:07',NULL,'KOT-0024','DINE_IN','Table 3',NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(25,1,'Table 1','Main Hall','Server','PENDING','2026-10-22 09:46:44','2026-10-22 09:46:44','2026-10-22 09:46:44',NULL,'KOT-0025','DINE_IN','Table 1',NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(26,3,'Table 3','Main Hall','Server','PENDING','2026-10-22 10:04:05','2026-10-22 10:04:05','2026-10-22 10:04:05',NULL,'KOT-0026','DINE_IN','Table 3',NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL),(27,2,'Table 2','Main Hall','Server','PENDING','2026-10-22 10:48:30','2026-10-22 10:48:30','2026-10-22 10:48:30',NULL,'KOT-0027','DINE_IN','Table 2',NULL,'PENDING',0,0,NULL,NULL,NULL,1,NULL,NULL);
/*!40000 ALTER TABLE `kot_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_categories`
--

DROP TABLE IF EXISTS `menu_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_categories` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_categories`
--

LOCK TABLES `menu_categories` WRITE;
/*!40000 ALTER TABLE `menu_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `menu_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_item_options`
--

DROP TABLE IF EXISTS `menu_item_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_item_options` (
  `option_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `item_id` bigint unsigned NOT NULL,
  `option_type` enum('variant','addon') COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`option_id`),
  KEY `idx_option_type` (`item_id`,`option_type`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Portion sizes and add-ons';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_item_options`
--

LOCK TABLES `menu_item_options` WRITE;
/*!40000 ALTER TABLE `menu_item_options` DISABLE KEYS */;
INSERT INTO `menu_item_options` VALUES (1,5,'variant','Regular Portion (1 Person)',0.00,'2026-10-09 15:13:45'),(2,5,'variant','Jumbo Handi Portion (3 Persons)',450.00,'2026-10-09 15:13:45'),(3,1,'addon','Extra Cheese Topping',50.00,'2026-10-09 15:13:45'),(4,5,'addon','Extra Mirchi Ka Salan & Raita',40.00,'2026-10-09 15:13:45'),(5,6,'addon','Extra Clarified Desi Ghee',25.00,'2026-10-09 15:13:45');
/*!40000 ALTER TABLE `menu_item_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_items`
--

DROP TABLE IF EXISTS `menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_items` (
  `menu_item_id` bigint NOT NULL AUTO_INCREMENT,
  `dish_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(18,2) NOT NULL,
  `dietary_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `spice_level` int NOT NULL DEFAULT '0',
  `prep_time_minutes` int DEFAULT '15',
  `short_description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_chefs_special` tinyint(1) NOT NULL DEFAULT '0',
  `is_available` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `serving_measure` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `drink_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alcohol_pct` decimal(5,2) DEFAULT NULL,
  `is_bar_item` tinyint(1) NOT NULL DEFAULT '0',
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`menu_item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_items`
--

LOCK TABLES `menu_items` WRITE;
/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
INSERT INTO `menu_items` VALUES (1,'Hyderabadi Chicken Dum Biryani','Biryani',320.00,'Non-Veg',2,15,'Authentic kacchi dum biryani cooked with marinated chicken & basmati rice','https://decisions-frederick-flip-seems.trycloudflare.com/uploads/menu_27aca38a06c640209974704752c28961_1793620741.jpg',1,1,'2026-10-27 11:55:58','2026-11-02 17:29:03',NULL,NULL,NULL,NULL,0,NULL,1,NULL,NULL),(2,'Royal Mutton Dum Biryani','Biryani',440.00,'NON-VEG',3,18,'Succulent baby goat mutton slow-cooked in handi with aromatic spices',NULL,1,1,'2026-10-27 11:55:58','2026-10-27 11:55:58',NULL,NULL,NULL,NULL,0,NULL,1,NULL,NULL),(3,'Special Boneless Chicken Biryani','Biryani',350.00,'NON-VEG',2,15,'Juicy boneless chicken cubes spiced with crushed pepper and dum rice',NULL,0,1,'2026-10-27 11:55:58','2026-10-27 11:55:58',NULL,NULL,NULL,NULL,0,NULL,1,NULL,NULL),(4,'Chicken 65 Biryani','Biryani',360.00,'NON-VEG',3,14,'Crispy spicy Chicken 65 tossed with curry leaves layered over biryani',NULL,0,1,'2026-10-27 11:55:58','2026-10-27 11:55:58',NULL,NULL,NULL,NULL,0,NULL,1,NULL,NULL),(5,'Paneer Butter Masala','Curries',260.00,'VEG',1,12,'Cottage cheese cubes in rich tomato cashew cream gravy',NULL,0,1,'2026-10-27 11:55:58','2026-10-27 11:55:58',NULL,NULL,NULL,NULL,0,NULL,1,NULL,NULL),(6,'Royal Stag','Whiskey',570.00,'Veg',0,15,'','',0,1,'2026-10-29 12:06:03','2026-10-29 17:38:12','2026-10-29 17:38:12','30 ml (Single Peg)','Alcoholic',40.00,1,NULL,1,NULL,NULL),(7,'Mojito','Cocktails',235.00,'Non-Veg',0,15,'','',0,1,'2026-10-29 12:09:17','2026-11-02 04:29:08',NULL,'30 ml (Single Peg)','Non-Alcoholic',4.00,1,NULL,1,NULL,NULL),(11,'beers','Beer',300.00,'Veg',0,15,'','',0,1,'2026-11-02 04:35:42','2026-11-06 08:58:03',NULL,'Single Peg (30 ml)','Alcoholic',5.60,1,NULL,1,NULL,NULL),(12,'Coffee','Tea & Coffee',20.00,'Non-Veg',0,15,'','',0,1,'2026-11-02 05:08:50','2026-11-03 10:32:53',NULL,'Glass','Non-Alcoholic',0.00,1,NULL,1,NULL,NULL),(13,'vodka','Vodka & Gin',200.00,'Veg',0,15,'','',0,1,'2026-11-02 05:09:45','2026-11-02 05:09:45',NULL,'30 ml (Single Peg)','Alcoholic',40.00,1,NULL,1,NULL,NULL),(14,'Test Corona Extra','Beer',290.00,'Veg',0,15,NULL,NULL,0,1,'2026-11-02 05:52:49','2026-11-02 11:22:49','2026-11-02 11:22:49','330 ml (Pint)','Alcoholic',5.00,1,NULL,1,NULL,NULL),(15,'Test Watermelon Juice','Juices',90.00,'Non-Veg',0,15,NULL,NULL,0,1,'2026-11-02 05:52:50','2026-11-02 11:22:49','2026-11-02 11:22:49','Glass (250 ml)','Non-Alcoholic',0.00,1,NULL,1,NULL,NULL),(16,'Test Blue Lagoon','Cocktails',320.00,'Veg',0,15,NULL,NULL,0,1,'2026-11-02 05:52:50','2026-11-02 11:22:49','2026-11-02 11:22:49','60 ml (Double Peg)','Alcoholic',15.00,1,NULL,1,NULL,NULL),(17,'chicken burger','breads',120.00,'Non-Veg',0,12,NULL,'/assets/dishes/default.svg?v=20261015-v4',0,1,'2026-11-10 06:27:40','2026-11-10 11:59:06',NULL,NULL,NULL,NULL,0,NULL,1,NULL,NULL),(18,'chicken pizza','fast-food',150.00,'Non-Veg',0,15,NULL,NULL,0,1,'2026-11-10 07:05:50','2026-11-10 12:35:55','2026-11-10 12:35:55',NULL,NULL,NULL,0,NULL,1,NULL,NULL),(19,'bir','biryani',35.00,'Non-Veg',0,15,NULL,NULL,0,1,'2026-11-10 07:06:13','2026-11-10 12:36:17','2026-11-10 12:36:17',NULL,NULL,NULL,0,NULL,1,NULL,NULL),(20,'pizza veg','fast-food',110.00,'Veg',0,15,NULL,NULL,0,1,'2026-11-10 07:18:40','2026-11-10 12:52:40','2026-11-10 12:52:40',NULL,NULL,NULL,0,NULL,1,NULL,NULL);
/*!40000 ALTER TABLE `menu_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_sub_categories`
--

DROP TABLE IF EXISTS `menu_sub_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_sub_categories` (
  `sub_category_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `category_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `sub_category_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`sub_category_id`),
  KEY `fk_subcat_branch` (`branch_id`),
  KEY `idx_subcategories_display` (`category_id`,`display_order`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Menu sub-categories';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_sub_categories`
--

LOCK TABLES `menu_sub_categories` WRITE;
/*!40000 ALTER TABLE `menu_sub_categories` DISABLE KEYS */;
INSERT INTO `menu_sub_categories` VALUES (1,1,1,'Tandoori Starters (Veg)',1,1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45'),(2,1,1,'Tandoori Starters (Non-Veg)',2,1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45'),(3,2,1,'Paneer & Veg Gravies',1,1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45'),(4,2,1,'Chicken & Mutton Curries',2,1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45'),(5,3,1,'Hyderabadi Dum Biryani',1,1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45');
/*!40000 ALTER TABLE `menu_sub_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_item_addons`
--

DROP TABLE IF EXISTS `order_item_addons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_item_addons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_item_id` bigint unsigned NOT NULL,
  `option_id` bigint unsigned NOT NULL,
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_oia_orderitem` (`order_item_id`),
  KEY `fk_oia_option` (`option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Add-ons chosen for order items';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_item_addons`
--

LOCK TABLES `order_item_addons` WRITE;
/*!40000 ALTER TABLE `order_item_addons` DISABLE KEYS */;
INSERT INTO `order_item_addons` VALUES (1,1,3,50.00),(2,5,4,40.00);
/*!40000 ALTER TABLE `order_item_addons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `order_item_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `kot_id` bigint unsigned DEFAULT NULL,
  `bot_id` bigint unsigned DEFAULT NULL,
  `item_id` bigint DEFAULT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `is_complimentary` tinyint(1) NOT NULL DEFAULT '0',
  `special_notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `item_status` enum('queued','cooking','ready','served','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'queued',
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `menu_item_id` bigint NOT NULL DEFAULT '1',
  `item_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `preparation_notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`order_item_id`),
  KEY `fk_oi_kot` (`kot_id`),
  KEY `fk_oi_variant` (`variant_id`),
  KEY `idx_oi_order` (`order_id`),
  KEY `idx_oi_item_analytics` (`item_id`),
  KEY `idx_order_items_bot` (`bot_id`)
) ENGINE=InnoDB AUTO_INCREMENT=283 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Line items of order';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,1,1,NULL,1,NULL,1,340.00,340.00,0,'Extra char on tikka','served',NULL,1,NULL,NULL,1,0,1,'','2026-10-09 15:20:41',NULL,NULL),(2,1,1,NULL,4,NULL,1,460.00,460.00,0,'Standard spicy gravy','served',NULL,1,NULL,NULL,1,0,1,'','2026-10-09 15:20:41',NULL,NULL),(3,1,1,NULL,6,NULL,3,70.00,210.00,0,'Crispy garlic naan','served',NULL,1,NULL,NULL,1,0,1,'','2026-10-09 15:20:41',NULL,NULL),(4,1,1,NULL,7,NULL,2,150.00,300.00,0,'Served chilled','served',NULL,1,NULL,NULL,1,0,1,'','2026-10-09 15:20:41',NULL,NULL),(5,2,2,NULL,5,1,1,520.00,520.00,0,'Pack salan in separate pouch','ready',NULL,1,NULL,NULL,1,0,1,'','2026-10-09 15:20:41','2026-11-03 09:51:43',NULL),(6,2,2,NULL,4,NULL,1,460.00,460.00,0,'Extra gravy container','ready',NULL,1,NULL,NULL,1,0,1,'','2026-10-09 15:20:41','2026-11-03 09:51:43',NULL),(7,1,1,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-10-09 09:56:43',NULL,NULL),(8,1,1,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-10-09 09:56:43',NULL,NULL),(9,2,NULL,NULL,NULL,NULL,2,320.00,640.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-10-12 07:40:39','2026-11-03 09:51:43',NULL),(10,2,NULL,NULL,NULL,NULL,1,260.00,260.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,5,'Paneer Butter Masala','2026-10-12 07:40:39','2026-11-03 09:51:43',NULL),(11,3,NULL,NULL,NULL,NULL,2,320.00,640.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-10-12 07:42:54','2026-11-03 09:52:27',NULL),(12,3,NULL,NULL,NULL,NULL,1,260.00,260.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,5,'Paneer Butter Masala','2026-10-12 07:42:54','2026-11-03 09:52:27',NULL),(13,4,NULL,NULL,NULL,NULL,1,260.00,260.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Paneer Butter Masala','2026-10-12 09:23:57',NULL,NULL),(14,5,NULL,NULL,NULL,NULL,3,115.00,345.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,34,'Brownie with ice cream','2026-10-16 06:50:42','2026-11-03 09:53:01',''),(15,5,NULL,NULL,NULL,NULL,1,180.00,180.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,33,'Gulab Jamun with Rabdi','2026-10-16 06:50:42','2026-11-03 09:53:01',''),(16,6,NULL,NULL,NULL,NULL,1,250.00,250.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,35,'Paneer Butter Masala','2026-10-16 07:39:50',NULL,''),(17,6,NULL,NULL,NULL,NULL,1,115.00,115.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,34,'Brownie with ice cream','2026-10-16 07:39:50',NULL,''),(18,6,NULL,NULL,NULL,NULL,1,180.00,180.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,33,'Gulab Jamun with Rabdi','2026-10-16 07:39:50',NULL,''),(19,6,NULL,NULL,NULL,NULL,1,100.00,100.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,32,'Gulab Jamun','2026-10-16 07:39:50',NULL,''),(20,1,NULL,NULL,NULL,NULL,1,115.00,115.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,34,'Brownie with ice cream','2026-10-16 07:53:15',NULL,''),(21,1,NULL,NULL,NULL,NULL,1,100.00,100.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,32,'Gulab Jamun','2026-10-16 07:53:15',NULL,''),(22,1,NULL,NULL,NULL,NULL,1,150.00,150.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,31,'Chocolate Milkshake','2026-10-16 07:53:15',NULL,''),(23,7,NULL,NULL,NULL,NULL,1,115.00,115.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,34,'Brownie with ice cream','2026-10-16 07:55:27',NULL,''),(24,7,NULL,NULL,NULL,NULL,1,350.00,350.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,21,'Andhra Mutton Curry','2026-10-16 07:55:27',NULL,''),(25,8,NULL,NULL,NULL,NULL,1,180.00,180.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,33,'Gulab Jamun with Rabdi','2026-10-16 07:57:04',NULL,''),(26,9,NULL,NULL,NULL,NULL,1,250.00,250.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,18,'Chicken 65','2026-10-16 08:04:13',NULL,''),(27,9,NULL,NULL,NULL,NULL,1,250.00,250.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,24,'Chicken Seekh Kebab','2026-10-16 08:04:13',NULL,''),(28,9,NULL,NULL,NULL,NULL,1,350.00,350.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,17,'Hyderabadi Mutton biryani','2026-10-16 08:04:13',NULL,''),(29,9,NULL,NULL,NULL,NULL,1,100.00,100.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,32,'Gulab Jamun','2026-10-16 08:04:13',NULL,''),(30,10,NULL,NULL,NULL,NULL,1,250.00,250.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Butter Chicken','2026-10-19 04:18:35',NULL,NULL),(31,11,NULL,NULL,NULL,NULL,1,115.00,115.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,34,'Brownie with ice cream','2026-10-19 04:42:40',NULL,''),(32,11,NULL,NULL,NULL,NULL,1,180.00,180.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,33,'Gulab Jamun with Rabdi','2026-10-19 04:42:40',NULL,''),(33,12,NULL,NULL,NULL,NULL,2,25.00,50.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,25,'Tandoori Roti','2026-10-19 09:12:37',NULL,''),(34,12,NULL,NULL,NULL,NULL,1,350.00,350.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,21,'Andhra Mutton Curry','2026-10-19 09:12:37',NULL,''),(35,12,NULL,NULL,NULL,NULL,1,100.00,100.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,32,'Gulab Jamun','2026-10-19 09:12:37',NULL,''),(36,13,NULL,NULL,NULL,NULL,2,320.00,640.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-10-21 05:12:40',NULL,NULL),(37,14,NULL,NULL,NULL,NULL,2,250.00,500.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Chicken Biryani','2026-10-21 05:18:02',NULL,NULL),(38,15,NULL,NULL,NULL,NULL,1,250.00,250.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,35,'Paneer Butter Masala','2026-10-21 05:29:50',NULL,''),(39,15,NULL,NULL,NULL,NULL,1,115.00,115.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,34,'Brownie with ice cream','2026-10-21 05:29:50',NULL,''),(40,15,NULL,NULL,NULL,NULL,1,180.00,180.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,33,'Gulab Jamun with Rabdi','2026-10-21 05:29:50',NULL,''),(41,16,NULL,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Chicken Biryani','2026-10-21 05:33:29',NULL,NULL),(42,17,NULL,NULL,NULL,NULL,2,280.00,560.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Chicken Dum Biryani','2026-10-21 11:03:33',NULL,NULL),(43,17,NULL,NULL,NULL,NULL,2,150.00,300.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Chocolate Milkshake','2026-10-21 11:03:33',NULL,NULL),(44,18,NULL,NULL,NULL,NULL,1,280.00,280.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,41,'bagara with mutton','2026-10-21 11:26:43',NULL,''),(45,18,NULL,NULL,NULL,NULL,1,250.00,250.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,35,'Paneer Butter Masala','2026-10-21 11:26:43',NULL,''),(46,18,NULL,NULL,NULL,NULL,1,115.00,115.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,34,'Brownie with ice cream','2026-10-21 11:26:43',NULL,''),(47,19,NULL,NULL,NULL,NULL,1,250.00,250.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,35,'Paneer Butter Masala','2026-10-22 04:34:46',NULL,''),(48,20,NULL,NULL,NULL,NULL,1,140.00,140.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,29,'Mango Lassi','2026-10-22 05:18:50',NULL,''),(49,20,NULL,NULL,NULL,NULL,1,250.00,250.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,35,'Paneer Butter Masala','2026-10-22 05:18:50',NULL,''),(50,20,NULL,NULL,NULL,NULL,1,25.00,25.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,25,'Tandoori Roti','2026-10-22 05:18:50',NULL,''),(51,21,1,NULL,NULL,NULL,2,320.00,640.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-10-27 11:56:39','2026-10-27 11:56:58','Extra spicy'),(52,22,NULL,NULL,NULL,NULL,3,360.00,1080.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Chicken 65 Biryani','2026-10-29 06:25:40','2026-10-29 06:25:44',''),(53,23,NULL,NULL,NULL,NULL,5,90.00,450.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Aromas Fresh Brewed Coffee','2026-10-29 06:25:44','2026-10-29 06:25:45',''),(54,24,NULL,NULL,NULL,NULL,1,280.00,280.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,41,'bagara with mutton','2026-10-29 06:25:50','2026-10-29 06:25:51',''),(55,24,NULL,NULL,NULL,NULL,1,250.00,250.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,35,'Paneer Butter Masala','2026-10-29 06:25:50','2026-10-29 06:25:51',''),(56,25,2,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-10-29 06:26:37','2026-10-30 12:31:54',''),(57,25,2,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-10-29 06:26:37','2026-10-30 12:31:54',''),(58,25,3,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-10-30 12:30:30','2026-10-30 12:31:54',''),(59,25,3,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-10-30 12:30:30','2026-10-30 12:31:54',''),(60,26,4,NULL,NULL,NULL,1,120.00,120.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,11,'beers','2026-11-02 05:10:40','2026-11-02 05:11:03',''),(61,26,4,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-02 05:10:40','2026-11-02 05:11:03',''),(62,26,4,NULL,NULL,NULL,1,350.00,350.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,3,'Special Boneless Chicken Biryani','2026-11-02 05:10:40','2026-11-02 05:11:03',''),(63,27,5,NULL,NULL,NULL,1,120.00,120.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,11,'beers','2026-11-02 05:56:35','2026-11-02 05:56:53',''),(64,27,5,NULL,NULL,NULL,1,235.00,235.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-02 05:56:35','2026-11-02 05:56:53',''),(65,27,5,NULL,NULL,NULL,1,20.00,20.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,12,'Coffee','2026-11-02 05:56:35','2026-11-02 05:56:53',''),(66,27,5,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-02 05:56:35','2026-11-02 05:56:53',''),(67,27,5,NULL,NULL,NULL,1,350.00,350.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,3,'Special Boneless Chicken Biryani','2026-11-02 05:56:35','2026-11-02 05:56:53',''),(68,27,5,NULL,NULL,NULL,1,360.00,360.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,4,'Chicken 65 Biryani','2026-11-02 05:56:35','2026-11-02 05:56:53',''),(69,28,NULL,NULL,NULL,NULL,2,440.00,880.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Royal Mutton Dum Biryani','2026-11-02 06:51:16','2026-11-02 06:51:17',''),(70,29,6,NULL,NULL,NULL,1,700.00,700.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,8,'Vikas Vodka','2026-11-02 07:01:30','2026-11-02 10:20:08',''),(71,30,NULL,NULL,NULL,NULL,2,250.00,500.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Paneer Butter Masala','2026-11-02 09:21:45','2026-11-02 09:21:45','Less spicy'),(72,31,NULL,NULL,NULL,NULL,2,320.00,640.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Butter Chicken','2026-11-02 09:36:43','2026-11-02 09:36:43','Extra butter'),(73,33,NULL,NULL,NULL,NULL,2,320.00,640.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Butter Chicken','2026-11-02 09:39:16','2026-11-02 09:39:16','Extra butter'),(74,34,7,NULL,NULL,NULL,1,360.00,360.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,4,'Chicken 65 Biryani','2026-11-02 09:44:19','2026-11-05 07:12:03',''),(75,34,NULL,NULL,NULL,NULL,1,20.00,20.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,12,'Coffee','2026-11-02 09:44:19','2026-11-04 04:45:07',''),(76,35,8,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-02 09:54:39','2026-11-02 09:55:36',''),(77,35,8,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-02 09:54:39','2026-11-02 09:55:36',''),(78,35,8,NULL,NULL,NULL,1,350.00,350.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,3,'Special Boneless Chicken Biryani','2026-11-02 09:54:39','2026-11-02 09:55:36',''),(79,35,NULL,NULL,NULL,NULL,1,235.00,235.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-02 09:54:39','2026-11-02 09:55:36',''),(80,35,NULL,NULL,NULL,NULL,1,20.00,20.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,12,'Coffee','2026-11-02 09:54:39','2026-11-02 09:55:36',''),(81,35,NULL,NULL,NULL,NULL,1,120.00,120.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,11,'beers','2026-11-02 09:54:39','2026-11-02 09:55:36',''),(82,35,NULL,NULL,NULL,NULL,2,200.00,400.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,13,'vodka','2026-11-02 09:54:39','2026-11-02 09:55:36',''),(83,29,NULL,NULL,NULL,NULL,1,200.00,200.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,13,'vodka','2026-11-02 09:56:05','2026-11-02 10:20:08',''),(84,29,NULL,NULL,NULL,NULL,1,235.00,235.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-02 09:56:05','2026-11-02 10:20:08',''),(85,36,9,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-02 09:57:17','2026-11-02 10:20:18',''),(86,36,9,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-02 09:57:17','2026-11-02 10:20:18',''),(87,36,NULL,NULL,NULL,NULL,1,120.00,120.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,11,'beers','2026-11-02 09:57:17','2026-11-02 10:20:18',''),(88,36,NULL,NULL,NULL,NULL,1,20.00,20.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,12,'Coffee','2026-11-02 09:57:17','2026-11-02 10:20:18',''),(89,34,10,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-02 10:20:17','2026-11-05 07:12:03','Spicy'),(90,36,11,NULL,NULL,NULL,2,235.00,470.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Mojito','2026-11-02 10:20:18','2026-11-02 10:20:18','On the rocks'),(91,37,12,NULL,NULL,NULL,3,320.00,960.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-02 10:20:18','2026-11-03 08:33:57','60ml'),(92,34,13,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-02 10:23:45','2026-11-05 07:12:03','Spicy'),(93,38,14,NULL,NULL,NULL,1,235.00,235.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Mojito','2026-11-02 10:23:46','2026-11-02 10:59:32','Extra mint'),(94,38,NULL,1,NULL,NULL,1,700.00,700.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,7,'Vikas Vodka','2026-11-02 10:23:46','2026-11-02 10:59:32','On the rocks'),(95,37,15,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-02 10:23:46','2026-11-03 08:33:57','Extra raita'),(96,37,15,NULL,NULL,NULL,1,235.00,235.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Mojito','2026-11-02 10:23:46','2026-11-03 08:33:57','Less ice'),(97,37,NULL,2,NULL,NULL,1,700.00,700.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,7,'Vikas Vodka','2026-11-02 10:23:46','2026-11-03 08:33:57','60ml'),(98,37,16,NULL,NULL,NULL,2,45.00,90.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Butter Naan','2026-11-02 10:23:46','2026-11-03 08:33:57','Hot & crisp'),(99,37,17,NULL,NULL,NULL,1,210.00,210.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Kingfisher Beer','2026-11-02 10:23:46','2026-11-03 08:33:57','Chilled bottle'),(100,39,18,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-02 10:28:09','2026-11-02 10:28:09','Spicy'),(101,40,19,5,NULL,NULL,1,235.00,235.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Mojito','2026-11-02 10:28:09','2026-11-02 10:36:32','Extra mint'),(102,40,NULL,3,NULL,NULL,1,700.00,700.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,7,'Vikas Vodka','2026-11-02 10:28:09','2026-11-02 10:28:09','On the rocks'),(103,41,20,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-02 10:28:09','2026-11-02 10:36:33','Extra raita'),(104,41,20,6,NULL,NULL,1,235.00,235.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Mojito','2026-11-02 10:28:09','2026-11-02 10:36:33','Less ice'),(105,41,NULL,4,NULL,NULL,1,700.00,700.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,7,'Vikas Vodka','2026-11-02 10:28:09','2026-11-02 10:28:10','60ml'),(106,41,21,NULL,NULL,NULL,2,45.00,90.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Butter Naan','2026-11-02 10:28:10','2026-11-02 10:36:33','Hot & crisp'),(107,41,22,NULL,NULL,NULL,1,210.00,210.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Kingfisher Beer','2026-11-02 10:28:10','2026-11-02 10:36:33','Chilled bottle'),(108,39,23,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-02 10:36:32','2026-11-02 10:36:32','Spicy'),(109,40,NULL,5,NULL,NULL,1,235.00,235.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-02 10:36:32','2026-11-02 10:36:32','Extra mint'),(110,40,NULL,5,NULL,NULL,1,700.00,700.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-02 10:36:32','2026-11-02 10:36:32','On the rocks'),(111,41,24,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-02 10:36:32','2026-11-02 10:36:33','Extra raita'),(112,41,NULL,6,NULL,NULL,1,235.00,235.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-02 10:36:32','2026-11-02 10:36:33','Less ice'),(113,41,NULL,6,NULL,NULL,1,700.00,700.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-02 10:36:32','2026-11-02 10:36:33','60ml'),(114,41,25,NULL,NULL,NULL,2,45.00,90.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Butter Naan','2026-11-02 10:36:33','2026-11-02 10:36:33','Hot & crisp'),(115,41,26,NULL,NULL,NULL,1,210.00,210.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Kingfisher Beer','2026-11-02 10:36:33','2026-11-02 10:36:33','Chilled bottle'),(116,42,27,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-02 10:40:42','2026-11-02 10:40:43','Spicy'),(117,43,NULL,7,NULL,NULL,1,235.00,235.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-02 10:40:43','2026-11-02 10:40:43','Extra mint'),(118,43,NULL,7,NULL,NULL,1,700.00,700.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-02 10:40:43','2026-11-02 10:40:43','On the rocks'),(119,44,28,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-02 10:40:43','2026-11-02 10:40:43','Extra raita'),(120,44,NULL,8,NULL,NULL,1,235.00,235.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-02 10:40:43','2026-11-02 10:40:43','Less ice'),(121,44,NULL,8,NULL,NULL,1,700.00,700.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-02 10:40:43','2026-11-02 10:40:43','60ml'),(122,44,29,NULL,NULL,NULL,2,45.00,90.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Butter Naan','2026-11-02 10:40:43','2026-11-02 10:40:43','Hot & crisp'),(123,44,NULL,9,NULL,NULL,1,210.00,210.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,7,'Kingfisher Beer','2026-11-02 10:40:43','2026-11-02 10:40:43','Chilled bottle'),(124,45,30,NULL,NULL,NULL,1,420.00,420.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-02 10:40:56','2026-11-02 10:40:56',NULL),(125,45,NULL,10,NULL,NULL,1,235.00,235.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-02 10:40:56','2026-11-02 10:40:56',NULL),(126,46,31,NULL,NULL,NULL,1,350.00,350.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,3,'Special Boneless Chicken Biryani','2026-11-02 10:52:41','2026-11-02 10:53:04',''),(127,46,31,NULL,NULL,NULL,1,360.00,360.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,4,'Chicken 65 Biryani','2026-11-02 10:52:41','2026-11-02 10:53:04',''),(128,47,NULL,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-02 10:59:43','2026-11-02 10:59:43',''),(129,47,NULL,NULL,NULL,NULL,1,350.00,350.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,3,'Special Boneless Chicken Biryani','2026-11-02 10:59:43','2026-11-02 10:59:43',''),(130,34,32,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-02 11:00:19','2026-11-05 07:12:03',''),(131,34,NULL,11,NULL,NULL,1,235.00,235.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-02 11:00:19','2026-11-04 04:45:07',''),(132,48,33,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-02 11:01:44','2026-11-02 11:01:44','Spicy'),(133,49,NULL,12,NULL,NULL,1,235.00,235.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-02 11:01:44','2026-11-02 11:01:44','Extra mint'),(134,49,NULL,12,NULL,NULL,1,700.00,700.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-02 11:01:44','2026-11-02 11:01:44','On the rocks'),(135,50,34,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-02 11:01:44','2026-11-02 11:01:45','Extra raita'),(136,50,NULL,13,NULL,NULL,1,235.00,235.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-02 11:01:44','2026-11-02 11:01:44','Less ice'),(137,50,NULL,13,NULL,NULL,1,700.00,700.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-02 11:01:44','2026-11-02 11:01:44','60ml'),(138,50,35,NULL,NULL,NULL,2,45.00,90.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Butter Naan','2026-11-02 11:01:44','2026-11-02 11:01:45','Hot & crisp'),(139,50,NULL,14,NULL,NULL,1,210.00,210.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,7,'Kingfisher Beer','2026-11-02 11:01:44','2026-11-02 11:01:45','Chilled bottle'),(142,52,37,NULL,NULL,NULL,1,360.00,360.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,4,'Chicken 65 Biryani','2026-11-02 11:50:22',NULL,NULL),(144,54,39,NULL,NULL,NULL,1,360.00,360.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,4,'Chicken 65 Biryani','2026-11-02 11:54:39',NULL,'Extra onions'),(145,54,NULL,NULL,NULL,NULL,1,120.00,120.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,11,'beers','2026-11-02 11:54:39',NULL,'Chilled'),(146,55,40,NULL,NULL,NULL,1,360.00,360.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,4,'Chicken 65 Biryani','2026-11-02 11:54:39',NULL,NULL),(147,56,41,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-02 11:54:52','2026-11-02 11:54:52','Spicy'),(148,57,NULL,15,NULL,NULL,1,235.00,235.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-02 11:54:52','2026-11-02 11:54:52','Extra mint'),(149,57,NULL,15,NULL,NULL,1,700.00,700.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-02 11:54:52','2026-11-02 11:54:52','On the rocks'),(150,58,42,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-02 11:54:52','2026-11-02 11:54:52','Extra raita'),(151,58,NULL,16,NULL,NULL,1,235.00,235.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-02 11:54:52','2026-11-02 11:54:52','Less ice'),(152,58,NULL,16,NULL,NULL,1,700.00,700.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-02 11:54:52','2026-11-02 11:54:52','60ml'),(153,58,43,NULL,NULL,NULL,2,45.00,90.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Butter Naan','2026-11-02 11:54:52','2026-11-02 11:54:52','Hot & crisp'),(154,58,NULL,17,NULL,NULL,1,210.00,210.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,7,'Kingfisher Beer','2026-11-02 11:54:52','2026-11-02 11:54:52','Chilled bottle'),(155,34,NULL,18,NULL,NULL,1,120.00,120.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,11,'beers','2026-11-02 12:04:24','2026-11-04 04:45:07',''),(156,34,44,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-02 12:04:24','2026-11-05 07:12:03',''),(157,34,NULL,19,NULL,NULL,1,120.00,120.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,11,'beers','2026-11-02 12:04:51','2026-11-04 04:45:07',''),(158,34,45,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-03 07:11:41','2026-11-05 07:12:03',NULL),(159,59,NULL,20,NULL,NULL,1,450.00,450.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-03 07:11:42','2026-11-03 08:35:05',NULL),(160,37,46,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-03 07:11:42','2026-11-03 08:33:57',NULL),(161,37,NULL,21,NULL,NULL,1,450.00,450.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-03 07:11:42','2026-11-03 08:33:57',NULL),(162,60,47,NULL,NULL,NULL,2,320.00,640.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-03 07:11:43','2026-11-03 07:11:43',NULL),(163,60,NULL,22,NULL,NULL,2,250.00,500.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,11,'Kingfisher Beer','2026-11-03 07:11:43','2026-11-03 07:11:43',NULL),(164,60,NULL,22,NULL,NULL,1,180.00,180.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-03 07:11:43','2026-11-03 07:11:43',NULL),(165,61,48,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'cooking',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-03 07:12:07','2026-11-03 07:47:41',NULL),(166,62,NULL,23,NULL,NULL,2,450.00,900.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-03 07:12:20','2026-11-03 07:12:20',NULL),(167,63,49,NULL,NULL,NULL,2,320.00,640.00,0,NULL,'cooking',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-03 07:12:38','2026-11-03 07:12:38',NULL),(168,63,NULL,24,NULL,NULL,1,450.00,450.00,0,NULL,'cooking',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-03 07:12:38','2026-11-03 07:12:38',NULL),(169,34,50,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-03 07:16:07','2026-11-05 07:12:03',''),(170,34,NULL,25,NULL,NULL,1,120.00,120.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,11,'beers','2026-11-03 07:16:07','2026-11-04 04:45:07',''),(171,64,51,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-03 07:19:17','2026-11-03 08:33:47',''),(172,64,NULL,26,NULL,NULL,1,120.00,120.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,11,'beers','2026-11-03 07:19:17','2026-11-03 08:33:47',''),(173,65,52,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-03 07:20:30','2026-11-03 07:20:30','TEST-INTEGRATION-20261103072029'),(174,66,53,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-03 07:21:19','2026-11-03 07:21:19','TEST-INTEGRATION-20261103072117'),(175,59,54,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-03 07:38:46','2026-11-03 08:35:05',''),(176,59,NULL,27,NULL,NULL,1,20.00,20.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,12,'Coffee','2026-11-03 07:38:46','2026-11-03 08:35:05',''),(177,67,55,NULL,NULL,NULL,1,280.00,280.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-03 07:44:28','2026-11-03 07:44:28',NULL),(178,68,NULL,28,NULL,NULL,1,350.00,350.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-03 07:44:29','2026-11-03 07:44:29',NULL),(179,69,56,NULL,NULL,NULL,1,280.00,280.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-03 07:44:29','2026-11-03 07:44:29',NULL),(180,69,NULL,29,NULL,NULL,1,350.00,350.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-03 07:44:29','2026-11-03 07:44:29',NULL),(181,70,NULL,30,NULL,NULL,2,350.00,700.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-03 07:44:29','2026-11-03 07:44:29',NULL),(182,70,NULL,30,NULL,NULL,1,220.00,220.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,6,'Royal Stag','2026-11-03 07:44:29','2026-11-03 07:44:29',NULL),(183,70,NULL,30,NULL,NULL,1,180.00,180.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-03 07:44:29','2026-11-03 07:44:29',NULL),(184,71,57,NULL,NULL,NULL,1,280.00,280.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-03 07:47:39','2026-11-03 07:49:00',NULL),(185,72,NULL,31,NULL,NULL,1,350.00,350.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-03 07:47:39','2026-11-03 07:49:00',NULL),(186,61,58,NULL,NULL,NULL,1,280.00,280.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-03 07:47:40','2026-11-03 07:47:40',NULL),(187,61,NULL,32,NULL,NULL,1,350.00,350.00,0,NULL,'cooking',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-03 07:47:40','2026-11-03 07:47:40',NULL),(188,37,NULL,33,NULL,NULL,2,350.00,700.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-03 07:47:41','2026-11-03 08:33:57',NULL),(189,37,NULL,33,NULL,NULL,1,220.00,220.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,6,'Royal Stag','2026-11-03 07:47:41','2026-11-03 08:33:57',NULL),(190,37,NULL,33,NULL,NULL,1,180.00,180.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-03 07:47:41','2026-11-03 08:33:57',NULL),(191,73,59,NULL,NULL,NULL,1,280.00,280.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-03 07:49:00','2026-11-03 07:49:00',NULL),(192,74,NULL,34,NULL,NULL,1,350.00,350.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-03 07:49:00','2026-11-03 07:49:00',NULL),(193,75,60,NULL,NULL,NULL,1,280.00,280.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-03 07:49:01','2026-11-03 07:49:46',NULL),(194,75,NULL,35,NULL,NULL,1,350.00,350.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-03 07:49:01','2026-11-03 07:49:46',NULL),(195,76,NULL,36,NULL,NULL,2,350.00,700.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-03 07:49:01','2026-11-03 07:49:01',NULL),(196,76,NULL,36,NULL,NULL,1,220.00,220.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,6,'Royal Stag','2026-11-03 07:49:01','2026-11-03 07:49:01',NULL),(197,76,NULL,36,NULL,NULL,1,180.00,180.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-03 07:49:01','2026-11-03 07:49:01',NULL),(198,75,61,NULL,NULL,NULL,1,280.00,280.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-03 07:49:24','2026-11-03 07:49:46',NULL),(199,75,NULL,37,NULL,NULL,1,350.00,350.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-03 07:49:24','2026-11-03 07:49:46',NULL),(200,77,62,NULL,NULL,NULL,1,280.00,280.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabad Chicken Dum Biryani','2026-11-03 07:49:46','2026-11-04 11:49:55',NULL),(201,77,NULL,38,NULL,NULL,1,350.00,350.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,13,'Vikas Vodka','2026-11-03 07:49:46','2026-11-03 07:49:46',NULL),(202,59,63,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-03 08:34:13','2026-11-03 08:35:05',''),(203,78,NULL,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-03 08:35:14','2026-11-03 08:35:14',''),(204,78,NULL,NULL,NULL,NULL,1,120.00,120.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,11,'beers','2026-11-03 08:35:14','2026-11-03 08:35:14',''),(205,79,NULL,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-03 08:35:24','2026-11-03 08:35:24',''),(206,79,NULL,NULL,NULL,NULL,1,20.00,20.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,12,'Coffee','2026-11-03 08:35:24','2026-11-03 08:35:24',''),(207,80,64,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-03 08:42:06','2026-11-03 08:45:00',''),(208,80,64,NULL,NULL,NULL,1,350.00,350.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,3,'Special Boneless Chicken Biryani','2026-11-03 08:42:06','2026-11-03 08:45:00',''),(209,77,65,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-03 09:25:16','2026-11-04 11:49:55',''),(210,81,NULL,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-03 09:48:03','2026-11-03 09:48:03',''),(211,81,NULL,NULL,NULL,NULL,1,20.00,20.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,12,'Coffee','2026-11-03 09:48:03','2026-11-03 09:48:03',''),(212,82,NULL,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-03 09:49:37','2026-11-03 09:49:38',''),(213,82,NULL,NULL,NULL,NULL,1,20.00,20.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,12,'Coffee','2026-11-03 09:49:37','2026-11-03 09:49:38',''),(214,82,NULL,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-03 09:49:37','2026-11-03 09:49:38',''),(215,83,NULL,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-03 09:49:56','2026-11-03 09:49:57',''),(216,83,NULL,NULL,NULL,NULL,1,120.00,120.00,0,NULL,'served',NULL,1,NULL,NULL,1,0,11,'beers','2026-11-03 09:49:56','2026-11-03 09:49:57',''),(217,34,66,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-04 05:52:26','2026-11-05 07:12:03',''),(218,84,67,NULL,NULL,NULL,1,360.00,360.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,4,'Chicken 65 Biryani','2026-11-04 05:53:30','2026-11-04 05:53:30',''),(219,85,68,NULL,NULL,NULL,1,360.00,360.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,4,'Chicken 65 Biryani','2026-11-04 05:54:22','2026-11-04 05:54:23',''),(220,77,69,NULL,NULL,NULL,1,350.00,350.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,3,'Special Boneless Chicken Biryani','2026-11-04 11:49:01','2026-11-04 11:49:55',''),(221,77,69,NULL,NULL,NULL,1,360.00,360.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,4,'Chicken 65 Biryani','2026-11-04 11:49:01','2026-11-04 11:49:55',''),(222,34,70,NULL,NULL,NULL,7,150.00,1050.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,1,'Order Item','2026-11-04 12:08:00','2026-11-05 07:12:03',''),(223,34,70,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-05 07:09:26','2026-11-05 07:12:03',''),(224,86,71,NULL,NULL,NULL,3,360.00,1080.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,4,'Chicken 65 Biryani','2026-11-05 07:51:27','2026-11-05 07:51:28',''),(225,86,NULL,39,NULL,NULL,1,20.00,20.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,12,'Coffee','2026-11-05 07:51:27','2026-11-05 07:51:28',''),(226,60,72,NULL,NULL,NULL,1,350.00,350.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,3,'Special Boneless Chicken Biryani','2026-11-05 13:06:27','2026-11-05 13:06:27',''),(227,60,72,NULL,NULL,NULL,1,360.00,360.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,4,'Chicken 65 Biryani','2026-11-05 13:06:27','2026-11-05 13:06:27',''),(228,60,72,NULL,NULL,NULL,1,260.00,260.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,5,'Paneer Butter Masala','2026-11-05 13:06:27','2026-11-05 13:06:27',''),(229,87,73,NULL,NULL,NULL,1,350.00,350.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,3,'Special Boneless Chicken Biryani','2026-11-06 05:02:36','2026-11-06 05:03:23',''),(230,87,73,NULL,NULL,NULL,1,360.00,360.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,4,'Chicken 65 Biryani','2026-11-06 05:02:36','2026-11-06 05:03:23',''),(231,34,NULL,40,NULL,NULL,1,300.00,300.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,11,'beers','2026-11-06 10:24:40','2026-11-06 10:24:40',''),(232,34,74,NULL,NULL,NULL,2,320.00,640.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-06 10:25:55','2026-11-06 10:25:56',''),(233,34,75,NULL,NULL,NULL,1,360.00,360.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,4,'Chicken 65 Biryani','2026-11-06 10:26:43','2026-11-06 10:26:43',''),(234,73,76,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-06 10:27:47','2026-11-06 10:27:47',''),(235,73,76,NULL,NULL,NULL,1,350.00,350.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,3,'Special Boneless Chicken Biryani','2026-11-06 10:27:47','2026-11-06 10:27:47',''),(236,73,77,NULL,NULL,NULL,2,350.00,700.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,3,'Special Boneless Chicken Biryani','2026-11-06 10:31:32','2026-11-06 10:31:32',''),(237,88,78,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'ready',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-06 10:33:56','2026-11-06 10:39:29',''),(238,88,NULL,41,NULL,NULL,1,235.00,235.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,7,'Mojito','2026-11-06 10:42:07','2026-11-06 10:42:07',''),(275,116,106,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-11 04:26:46','2026-11-11 04:26:46',NULL),(278,117,113,NULL,1,NULL,2,320.00,640.00,0,'Medium spicy, please pack extra green chutney','queued',1,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-11 10:02:46',NULL,'Medium spicy, please pack extra green chutney'),(279,118,114,NULL,1,NULL,1,320.00,320.00,0,'Crispy fried','queued',1,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-11 10:03:01',NULL,'Crispy fried'),(280,118,114,NULL,2,NULL,2,440.00,880.00,0,'With extra salan and raita','queued',1,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-11 10:03:01',NULL,'With extra salan and raita'),(281,117,107,NULL,NULL,NULL,1,320.00,320.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,1,'Hyderabadi Chicken Dum Biryani','2026-11-11 04:34:58','2026-11-11 04:34:58',NULL),(282,118,108,NULL,NULL,NULL,1,440.00,440.00,0,NULL,'queued',NULL,1,NULL,NULL,1,0,2,'Royal Mutton Dum Biryani','2026-11-11 04:35:34','2026-11-11 04:35:34',NULL);
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `waiter_id` bigint unsigned DEFAULT NULL,
  `table_id` bigint unsigned DEFAULT NULL,
  `promo_id` bigint unsigned DEFAULT NULL,
  `order_type` enum('dine_in','takeaway','delivery') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','confirmed','preparing','ready','served','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_amt` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tax_amt` decimal(10,2) NOT NULL DEFAULT '0.00',
  `packaging_charge` decimal(10,2) NOT NULL DEFAULT '0.00',
  `service_charge_amt` decimal(10,2) NOT NULL DEFAULT '0.00',
  `round_off` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_amt` decimal(10,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancelled_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rating` tinyint DEFAULT NULL,
  `feedback_comments` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `fk_order_cust` (`customer_id`),
  KEY `fk_order_waiter` (`waiter_id`),
  KEY `fk_order_table` (`table_id`),
  KEY `fk_order_promo` (`promo_id`),
  KEY `idx_order_branch_time_status` (`branch_id`,`order_time`,`status`),
  CONSTRAINT `orders_chk_1` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=119 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Order header';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,'ORD-20261009-001',1,1,4,2,1,'dine_in','completed',1310.00,131.00,58.95,0.00,65.50,0.55,1304.00,'Customer requested spicy tikka',NULL,NULL,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',3,NULL),(2,'ORD-20261009-002',1,3,NULL,NULL,NULL,'delivery','completed',980.00,0.00,49.00,40.00,0.00,0.00,1069.00,'Ring doorbell twice upon arrival',NULL,NULL,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',3,NULL),(94,'TAK-20261110-0001',1,21,NULL,NULL,NULL,'takeaway','pending',1020.00,102.00,45.90,25.00,0.00,0.00,692.00,'Online takeaway E2E test',NULL,NULL,NULL,'2026-11-10 07:29:44','2026-11-10 15:37:47',NULL,NULL),(95,'TAK-20261110-0002',1,22,NULL,NULL,NULL,'takeaway','confirmed',360.00,0.00,18.00,10.00,0.00,0.00,844.50,NULL,NULL,NULL,NULL,'2026-11-10 07:29:45','2026-11-10 15:37:48',NULL,NULL),(117,'ORD-TK-20261111100246-756',1,1,NULL,NULL,NULL,'takeaway','confirmed',640.00,0.00,32.00,25.00,0.00,0.00,697.00,'Online Prepaid Self-Pickup',NULL,NULL,NULL,'2026-11-11 10:02:46','2026-11-11 10:02:46',NULL,NULL),(118,'ORD-TK-20261111100301-546',1,2,NULL,NULL,NULL,'takeaway','completed',1200.00,0.00,60.00,35.00,0.00,0.00,1295.00,'Online Prepaid Self-Pickup',NULL,NULL,NULL,'2026-11-11 10:03:01','2026-11-11 10:03:55',NULL,NULL);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `reset_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `otp_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `verified_at` datetime DEFAULT NULL,
  `used_at` datetime DEFAULT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`reset_id`),
  KEY `idx_password_reset_lookup` (`user_id`,`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User password recovery';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
INSERT INTO `password_reset_tokens` VALUES (1,3,'$2y$10$wKqKj08F/dummy_otp_hash_for_cashier1','2026-10-09 15:28:45',NULL,NULL,0,'2026-10-09 15:13:45',NULL,1,NULL,NULL);
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `permission_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `permission_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'General',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `permission_name` (`permission_name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System actions catalog';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'users.manage','Security','Create, update, and manage staff login accounts',1,'2026-10-09 15:13:45','2026-10-09 15:13:45'),(2,'menu.manage','Menu','Manage dishes, categories, pricing, and variants',1,'2026-10-09 15:13:45','2026-10-09 15:13:45'),(3,'orders.create','POS','Create new dine-in, takeaway, and delivery orders',1,'2026-10-09 15:13:45','2026-10-09 15:13:45'),(4,'orders.void','POS','Void order line items or cancel active orders',1,'2026-10-09 15:13:45','2026-10-09 15:13:45'),(5,'invoices.generate','Billing','Generate tax invoices and settle split payments',1,'2026-10-09 15:13:45','2026-10-09 15:13:45'),(6,'inventory.manage','Inventory','Manage raw materials, GRN receiving, and stock audits',1,'2026-10-09 15:13:45','2026-10-09 15:13:45'),(7,'reports.financial','Reports','View daily Z-reports, cashier drawer balance, and GST reports',1,'2026-10-09 15:13:45','2026-10-09 15:13:45');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promotions`
--

DROP TABLE IF EXISTS `promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotions` (
  `promotion_id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `flat_discount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `valid_until` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`promotion_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotions`
--

LOCK TABLES `promotions` WRITE;
/*!40000 ALTER TABLE `promotions` DISABLE KEYS */;
INSERT INTO `promotions` VALUES (1,'TESTPROMO99',15.00,0.00,'2026-11-15 07:32:01',0,NULL,1,NULL,NULL),(2,'PROMO344',20.00,0.00,'2026-12-31 23:59:59',0,NULL,1,NULL,NULL),(3,'PROMO711',20.00,0.00,'2026-12-31 23:59:59',0,NULL,1,NULL,NULL);
/*!40000 ALTER TABLE `promotions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_items` (
  `po_item_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `po_id` bigint unsigned NOT NULL,
  `ingredient_id` bigint unsigned NOT NULL,
  `quantity` decimal(12,3) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `batch_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  PRIMARY KEY (`po_item_id`),
  KEY `fk_poi_po` (`po_id`),
  KEY `fk_poi_ing` (`ingredient_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='PO Line Items';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
INSERT INTO `purchase_order_items` VALUES (1,1,1,25.000,320.00,8000.00,'BAT-PAN-2610A','2026-10-15'),(2,1,2,40.000,240.00,9600.00,'BAT-CHK-2610B','2026-10-12'),(3,1,5,8.000,475.00,3800.00,'BAT-BUT-2609X','2026-12-30');
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `po_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `po_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_id` bigint unsigned NOT NULL,
  `branch_id` bigint DEFAULT NULL,
  `po_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `expected_date` date DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `order_date` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`po_id`),
  UNIQUE KEY `po_number` (`po_number`),
  KEY `fk_po_supplier` (`supplier_id`),
  KEY `idx_po_branch_status` (`branch_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='PO Header';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
INSERT INTO `purchase_orders` VALUES (1,'PO-BLR-2026-001',1,1,'2026-10-07 00:00:00','2026-10-08',21400.00,'received','2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,1,'2026-10-09 15:20:44'),(2,'PO-BLR-2026-002',2,1,'2026-10-08 00:00:00','2026-10-09',13200.00,'pending','2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,1,'2026-10-09 15:20:44'),(3,'PO-20261102-1371',5,NULL,'2026-11-02 15:06:42',NULL,7500.00,'PENDING','2026-11-02 15:06:42','2026-11-02 15:06:42',NULL,NULL,1,'2026-11-02 15:06:42'),(4,'PO-20261102-7829',6,NULL,'2026-11-02 15:09:15',NULL,7500.00,'PENDING','2026-11-02 15:09:15','2026-11-02 15:09:15',NULL,NULL,1,'2026-11-02 15:09:15');
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recipe_ingredients`
--

DROP TABLE IF EXISTS `recipe_ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipe_ingredients` (
  `recipe_ing_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `item_id` bigint unsigned NOT NULL,
  `ingredient_id` bigint unsigned NOT NULL,
  `quantity` decimal(12,3) NOT NULL,
  PRIMARY KEY (`recipe_ing_id`),
  KEY `fk_ri_item` (`item_id`),
  KEY `idx_ri_ingredient` (`ingredient_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Recipe BOM for auto-stock deduction';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recipe_ingredients`
--

LOCK TABLES `recipe_ingredients` WRITE;
/*!40000 ALTER TABLE `recipe_ingredients` DISABLE KEYS */;
INSERT INTO `recipe_ingredients` VALUES (1,1,1,0.250),(2,1,6,0.080),(3,4,2,0.300),(4,4,5,0.040),(5,5,3,0.350),(6,5,4,0.200);
/*!40000 ALTER TABLE `recipe_ingredients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservations`
--

DROP TABLE IF EXISTS `reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservations` (
  `reservation_id` bigint NOT NULL AUTO_INCREMENT,
  `customer_id` bigint DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `table_id` bigint DEFAULT NULL,
  `guests_count` int NOT NULL DEFAULT '2',
  `reservation_time` time NOT NULL DEFAULT '12:00:00',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `branch_id` bigint DEFAULT NULL,
  `reservation_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `outlet_id` bigint DEFAULT '1',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`reservation_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservations`
--

LOCK TABLES `reservations` WRITE;
/*!40000 ALTER TABLE `reservations` DISABLE KEYS */;
INSERT INTO `reservations` VALUES (1,13,'Mr. Test Guest','+91 98888 77777',5,4,'19:30:00','cancelled','2026-10-21 16:36:09',1,'2026-10-21 00:00:00','Window seat requested','2026-10-21 16:36:50',1,NULL,NULL),(2,4,'Rajesh Test','9988776655',1,4,'20:00:00','cancelled','2026-11-02 15:06:42',1,'2026-11-15 00:00:00','VIP Window table','2026-11-02 15:06:42',1,NULL,NULL),(3,4,'Rajesh Test','9988776655',1,4,'20:00:00','cancelled','2026-11-02 15:09:15',1,'2026-11-15 00:00:00','VIP Window table','2026-11-02 15:09:15',1,NULL,NULL);
/*!40000 ALTER TABLE `reservations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `restaurant_orders`
--

DROP TABLE IF EXISTS `restaurant_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `restaurant_orders` (
  `order_id` bigint NOT NULL AUTO_INCREMENT,
  `order_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `outlet_id` bigint DEFAULT '1',
  `order_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DineIn',
  `dining_table_id` bigint DEFAULT NULL,
  `booking_id` bigint DEFAULT NULL,
  `waiter_id` bigint DEFAULT NULL,
  `guests_count` int NOT NULL DEFAULT '1',
  `order_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `special_instructions` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `branch_id` bigint DEFAULT NULL,
  `customer_id` bigint DEFAULT NULL,
  `customer_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_email` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `packaging_charge` decimal(18,2) NOT NULL DEFAULT '0.00',
  `fulfillment_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_method` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `service_charge` decimal(18,2) NOT NULL DEFAULT '0.00',
  `cancellation_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancelled_by` bigint DEFAULT NULL,
  `cancelled_by_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=119 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `restaurant_orders`
--

LOCK TABLES `restaurant_orders` WRITE;
/*!40000 ALTER TABLE `restaurant_orders` DISABLE KEYS */;
INSERT INTO `restaurant_orders` VALUES (1,'ORD-1001',1,'DineIn',3,NULL,NULL,4,'Settled',NULL,1,0,'2026-10-09 09:56:43','2026-10-16 07:53:15',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(2,'ORD-20261012-0001',1,'DineIn',11,NULL,NULL,4,'Settled',NULL,1,0,'2026-10-12 07:40:39','2026-10-12 07:40:39',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(3,'ORD-20261012-0002',1,'DineIn',12,NULL,NULL,4,'Settled',NULL,1,0,'2026-10-12 07:42:54','2026-10-12 07:42:54',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(4,'ORD-20261012-0003',1,'DineIn',4,NULL,NULL,2,'Settled',NULL,1,0,'2026-10-12 09:23:57','2026-10-12 09:23:57',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(5,'ORD-20261016-0001',1,'DineIn',7,NULL,NULL,4,'Settled',NULL,1,0,'2026-10-16 06:50:42','2026-10-16 06:50:42',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(6,'ORD-20261016-0002',1,'DineIn',1,NULL,NULL,2,'Settled',NULL,1,0,'2026-10-16 07:39:50','2026-10-16 07:39:50',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(7,'ORD-20261016-0003',1,'DineIn',1,NULL,NULL,4,'Settled',NULL,1,0,'2026-10-16 07:55:27','2026-10-16 07:55:27',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(8,'ORD-20261016-0004',1,'DineIn',1,NULL,NULL,4,'Settled',NULL,1,0,'2026-10-16 07:57:04','2026-10-16 07:57:04',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(9,'ORD-20261016-0005',1,'DineIn',1,NULL,NULL,4,'Settled',NULL,1,0,'2026-10-16 08:04:13','2026-10-16 08:04:13',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(10,'ORD-20261019-0001',1,'DineIn',7,NULL,NULL,2,'Settled',NULL,1,0,'2026-10-19 04:18:34','2026-10-19 04:18:35',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(11,'ORD-20261019-0002',1,'DineIn',1,NULL,NULL,2,'Settled',NULL,1,0,'2026-10-19 04:42:40','2026-10-19 04:42:40',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(12,'ORD-20261019-0003',1,'DineIn',2,NULL,NULL,4,'Settled',NULL,1,0,'2026-10-19 09:12:37','2026-10-19 09:12:37',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(13,'ORD-20261021-0001',1,'DineIn',1,NULL,NULL,2,'Settled',NULL,1,0,'2026-10-21 05:12:39','2026-10-21 09:36:36',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(14,'ORD-20261021-0002',1,'DineIn',1,NULL,NULL,1,'Settled',NULL,1,0,'2026-10-21 05:18:02','2026-10-21 05:18:02',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(15,'ORD-20261021-0003',1,'DineIn',5,NULL,NULL,4,'Settled',NULL,1,0,'2026-10-21 05:29:50','2026-10-21 10:29:44',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(16,'ORD-20261021-0004',1,'DineIn',1,NULL,NULL,1,'Settled',NULL,1,0,'2026-10-21 05:33:29','2026-10-21 10:29:16',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(17,'ORD-20261021-0005',1,'DineIn',4,NULL,NULL,4,'Settled',NULL,1,0,'2026-10-21 11:03:33','2026-10-21 11:03:33',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(18,'ORD-20261021-0006',1,'DineIn',3,NULL,NULL,8,'Settled',NULL,1,0,'2026-10-21 11:26:43','2026-10-21 11:26:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(19,'ORD-20261022-0001',1,'DineIn',3,NULL,NULL,12,'Settled',NULL,1,0,'2026-10-22 04:34:46','2026-10-22 04:34:46',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(20,'ORD-20261022-0002',1,'DineIn',2,NULL,NULL,10,'Settled',NULL,1,0,'2026-10-22 05:18:50','2026-10-22 05:18:50',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(21,'ORD-20261027-0001',1,'DineIn',1,NULL,NULL,2,'Settled',NULL,1,0,'2026-10-27 11:56:38','2026-10-27 11:56:58',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(22,'ORD-20261029-0001',1,'DineIn',4,NULL,NULL,3,'Settled',NULL,1,0,'2026-10-29 06:25:40','2026-10-29 06:25:44',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(23,'ORD-20261029-0002',1,'DineIn',3,NULL,NULL,1,'Settled',NULL,1,0,'2026-10-29 06:25:44','2026-10-29 06:25:45',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(24,'ORD-20261029-0003',1,'DineIn',2,NULL,NULL,2,'Settled',NULL,1,0,'2026-10-29 06:25:50','2026-10-29 06:25:51',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(25,'ORD-20261029-0004',1,'DineIn',1,NULL,NULL,1,'Settled',NULL,1,0,'2026-10-29 06:26:37','2026-10-30 12:31:54',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(26,'ORD-20261102-0001',1,'DineIn',5,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-02 05:10:40','2026-11-02 05:11:03',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(27,'ORD-20261102-0002',1,'DineIn',3,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-02 05:56:35','2026-11-02 05:56:53',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(28,'ORD-20261102-0003',1,'DineIn',2,NULL,NULL,2,'Settled',NULL,1,0,'2026-11-02 06:51:16','2026-11-02 06:51:17',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(29,'ORD-20261102-0004',1,'DineIn',5,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-02 07:01:30','2026-11-02 10:20:08',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(30,'ORD-20261102-0005',1,'Takeaway',NULL,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-02 09:21:45','2026-11-02 09:21:45',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(31,'ORD-20261102-0006',1,'Takeaway',NULL,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-02 09:36:43','2026-11-02 09:36:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(32,'ORD-DEL-20261102-7145',1,'Delivery',NULL,NULL,NULL,1,'Active',NULL,1,0,'2026-11-02 15:09:15',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(33,'ORD-20261102-0008',1,'Takeaway',NULL,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-02 09:39:16','2026-11-02 09:39:16',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(34,'ORD-20261102-0009',1,'DineIn',1,NULL,NULL,1,'Active',NULL,1,0,'2026-11-02 09:44:19',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(35,'ORD-20261102-0010',1,'DineIn',3,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-02 09:54:39','2026-11-02 09:55:36',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(36,'ORD-20261102-0011',1,'DineIn',2,NULL,NULL,2,'Settled',NULL,1,0,'2026-11-02 09:57:17','2026-11-02 10:20:18',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(37,'ORD-20261102-0012',1,'DineIn',3,NULL,NULL,4,'Settled',NULL,1,0,'2026-11-02 10:20:18','2026-11-03 08:33:57',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(38,'ORD-20261102-0013',1,'DineIn',2,NULL,NULL,2,'Settled',NULL,1,0,'2026-11-02 10:23:46','2026-11-02 10:59:32',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(39,'ORD-20261102-0014',1,'DineIn',101,NULL,NULL,2,'Settled',NULL,0,0,'2026-11-02 10:28:09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(40,'ORD-20261102-0015',1,'DineIn',102,NULL,NULL,2,'Settled',NULL,0,0,'2026-11-02 10:28:09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(41,'ORD-20261102-0016',1,'DineIn',103,NULL,NULL,3,'Settled',NULL,0,0,'2026-11-02 10:28:09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(42,'ORD-20261102-0017',1,'DineIn',101,NULL,NULL,2,'Settled',NULL,0,0,'2026-11-02 10:40:42',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(43,'ORD-20261102-0018',1,'DineIn',102,NULL,NULL,2,'Settled',NULL,0,0,'2026-11-02 10:40:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(44,'ORD-20261102-0019',1,'DineIn',103,NULL,NULL,3,'Settled',NULL,0,0,'2026-11-02 10:40:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(45,'ORD-20261102-0020',1,'Takeaway',NULL,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-02 10:40:56','2026-11-02 10:40:56',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(46,'ORD-20261102-0021',1,'DineIn',4,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-02 10:52:41','2026-11-02 10:53:04',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(47,'ORD-20261102-0022',1,'DineIn',2,NULL,NULL,2,'Settled',NULL,1,0,'2026-11-02 10:59:43','2026-11-02 10:59:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(48,'ORD-20261102-0023',1,'DineIn',101,NULL,NULL,2,'Settled',NULL,0,0,'2026-11-02 11:01:44',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(49,'ORD-20261102-0024',1,'DineIn',102,NULL,NULL,2,'Settled',NULL,0,0,'2026-11-02 11:01:44',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(50,'ORD-20261102-0025',1,'DineIn',103,NULL,NULL,3,'Settled',NULL,0,0,'2026-11-02 11:01:44',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(52,'TAK-20261102-0026',1,'Takeaway',NULL,NULL,NULL,1,'Active',NULL,1,0,'2026-11-02 11:50:22','2026-11-02 11:50:22',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(54,'TAK-20261102-0027',1,'Takeaway',NULL,NULL,NULL,1,'Settled','Takeaway packing required',1,0,'2026-11-02 11:54:38','2026-11-02 11:54:38',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(55,'TAK-20261102-0028',1,'Takeaway',NULL,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-02 11:54:39','2026-11-02 11:54:39',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(56,'ORD-20261102-0029',1,'DineIn',101,NULL,NULL,2,'Active',NULL,1,0,'2026-11-02 11:54:52',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(57,'ORD-20261102-0030',1,'DineIn',102,NULL,NULL,2,'Active',NULL,1,0,'2026-11-02 11:54:52',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(58,'ORD-20261102-0031',1,'DineIn',103,NULL,NULL,3,'Active',NULL,1,0,'2026-11-02 11:54:52',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(59,'ORD-20261103-0001',1,'DineIn',2,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-03 07:11:42','2026-11-03 08:35:05',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(60,'ORD-20261103-0002',1,'DineIn',4,NULL,NULL,1,'Active',NULL,1,0,'2026-11-03 07:11:42',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(61,'ORD-20261103-0003',1,'DineIn',8,NULL,NULL,3,'Active',NULL,1,0,'2026-11-03 07:12:07',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(62,'ORD-20261103-0004',1,'DineIn',9,NULL,NULL,2,'Active',NULL,1,0,'2026-11-03 07:12:19',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(63,'ORD-20261103-0005',1,'DineIn',10,NULL,NULL,3,'Active',NULL,1,0,'2026-11-03 07:12:38',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(64,'ORD-20261103-0006',1,'DineIn',5,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-03 07:19:17','2026-11-03 08:33:47',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(65,'ORD-20261103-0007',1,'DineIn',56,NULL,NULL,1,'Active',NULL,1,0,'2026-11-03 07:20:30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(66,'ORD-20261103-0008',1,'DineIn',57,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-03 07:21:19','2026-11-03 07:21:19',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(67,'ORD-20261103-0009',1,'DineIn',57,NULL,NULL,2,'Active',NULL,1,0,'2026-11-03 07:44:28',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(68,'ORD-20261103-0010',1,'DineIn',12,NULL,NULL,1,'Active',NULL,1,0,'2026-11-03 07:44:29',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(69,'ORD-20261103-0011',1,'DineIn',55,NULL,NULL,3,'Active',NULL,1,0,'2026-11-03 07:44:29',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(70,'ORD-20261103-0012',1,'DineIn',13,NULL,NULL,4,'Active',NULL,1,0,'2026-11-03 07:44:29',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(71,'ORD-20261103-0013',1,'DineIn',14,NULL,NULL,2,'Settled',NULL,1,0,'2026-11-03 07:47:39','2026-11-03 07:49:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(72,'ORD-20261103-0014',1,'DineIn',7,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-03 07:47:39','2026-11-03 07:49:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(73,'ORD-20261103-0015',1,'DineIn',14,NULL,NULL,1,'Active',NULL,1,0,'2026-11-03 07:49:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(74,'ORD-20261103-0016',1,'DineIn',7,NULL,NULL,1,'Active',NULL,1,0,'2026-11-03 07:49:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(75,'ORD-20261103-0017',1,'DineIn',6,NULL,NULL,2,'Settled',NULL,1,0,'2026-11-03 07:49:01','2026-11-03 07:49:46',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(76,'ORD-20261103-0018',1,'DineIn',15,NULL,NULL,4,'Active',NULL,1,0,'2026-11-03 07:49:01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(77,'ORD-20261103-0019',1,'DineIn',6,NULL,NULL,1,'Active',NULL,1,0,'2026-11-03 07:49:46',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(78,'ORD-20261103-0020',1,'DineIn',5,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-03 08:35:14','2026-11-03 08:35:14',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(79,'ORD-20261103-0021',1,'DineIn',3,NULL,NULL,3,'Settled',NULL,1,0,'2026-11-03 08:35:24','2026-11-03 08:35:24',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(80,'ORD-20261103-0022',1,'Takeaway',NULL,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-03 08:42:06','2026-11-03 08:45:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(81,'ORD-20261103-0023',1,'DineIn',3,NULL,NULL,3,'Settled',NULL,1,0,'2026-11-03 09:48:03','2026-11-03 09:48:03',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(82,'ORD-20261103-0024',1,'DineIn',2,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-03 09:49:37','2026-11-03 09:49:38',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(83,'ORD-20261103-0025',1,'DineIn',5,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-03 09:49:56','2026-11-03 09:49:57',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(84,'ORD-20261104-0001',1,'Takeaway',NULL,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-04 05:53:30','2026-11-04 05:53:30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(85,'ORD-20261104-0002',1,'Takeaway',NULL,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-04 05:54:22','2026-11-04 05:54:22',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(86,'ORD-20261105-0001',1,'DineIn',2,NULL,NULL,1,'Active',NULL,1,0,'2026-11-05 07:51:27',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(87,'ORD-20261106-0001',1,'Takeaway',NULL,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-06 05:02:36','2026-11-06 05:02:36',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(88,'ORD-20261106-0002',1,'DineIn',3,NULL,NULL,1,'Active',NULL,1,0,'2026-11-06 10:33:56',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,NULL),(116,'ORD-20261111-0001',1,'Takeaway',NULL,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-11 04:26:45','2026-11-11 04:26:46',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,'New','Paid','UPI',NULL,0.00,NULL,NULL,NULL,NULL),(117,'ORD-20261111-0002',1,'Takeaway',NULL,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-11 04:34:58','2026-11-11 04:34:58',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,'New','Paid','UPI',NULL,0.00,NULL,NULL,NULL,NULL),(118,'ORD-20261111-0003',1,'Takeaway',NULL,NULL,NULL,1,'Settled',NULL,1,0,'2026-11-11 04:35:34','2026-11-11 04:35:34',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,'New','Paid','NETBANKING',NULL,0.00,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `restaurant_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `restaurant_settings`
--

DROP TABLE IF EXISTS `restaurant_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `restaurant_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `restaurant_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tagline` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gstin` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `restaurant_logo` longtext COLLATE utf8mb4_unicode_ci,
  `food_gst_rate` decimal(5,2) DEFAULT '5.00',
  `service_charge_rate` decimal(5,2) DEFAULT '5.00',
  `service_charge_enabled` tinyint(1) DEFAULT '1',
  `rounding_mode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'nearest',
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'Ôé╣',
  `receipt_header` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receipt_footer` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `selected_qr_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_qrs` longtext COLLATE utf8mb4_unicode_ci,
  `show_logo_on_receipt` tinyint(1) DEFAULT '1',
  `show_address_on_receipt` tinyint(1) DEFAULT '1',
  `show_gst_breakdown` tinyint(1) DEFAULT '1',
  `low_stock_alerts_enabled` tinyint(1) DEFAULT '1',
  `display_theme` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'royal-saffron',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `restaurant_settings`
--

LOCK TABLES `restaurant_settings` WRITE;
/*!40000 ALTER TABLE `restaurant_settings` DISABLE KEYS */;
INSERT INTO `restaurant_settings` VALUES (1,'Bhanu','Fine Dining & POS Management','+91 98450 12345','Main Road, Near Tech Park, Hyderabad, India','36AABCA1234F1Z5','data:image/jpeg;base64,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',5.00,5.00,1,'nearest','₹','Welcome to AVSR Food Court!','Thank you for dining with us. Visit again!','qr-1','[{\"id\":\"qr-1\",\"label\":\"phonepe\",\"image\":\"/src/assets/payment-qr.png\",\"active\":true},{\"id\":\"qr-2\",\"label\":\"Counter 2 / Bar UPI\",\"image\":null,\"active\":false},{\"id\":\"qr-3\",\"label\":\"Counter 3 / Takeaway UPI\",\"image\":null,\"active\":false}]',1,1,1,1,'royal-saffron','2026-10-15 12:10:14','2026-11-06 09:22:47');
/*!40000 ALTER TABLE `restaurant_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `restaurant_tables`
--

DROP TABLE IF EXISTS `restaurant_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `restaurant_tables` (
  `table_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint DEFAULT NULL,
  `table_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `capacity` int NOT NULL DEFAULT '4',
  `location` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Main Hall',
  `qr_code_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VACANT',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `outlet_id` bigint DEFAULT '1',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `table_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `section_area` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Main Hall',
  `capacity_chairs` int NOT NULL DEFAULT '4',
  `occupied_chairs` int NOT NULL DEFAULT '0',
  `assigned_server_id` bigint DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`table_id`),
  UNIQUE KEY `uq_table` (`branch_id`,`table_number`),
  KEY `idx_table_status` (`branch_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Floor table layout';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `restaurant_tables`
--

LOCK TABLES `restaurant_tables` WRITE;
/*!40000 ALTER TABLE `restaurant_tables` DISABLE KEYS */;
INSERT INTO `restaurant_tables` VALUES (1,1,'Table-1',6,'VIP Lounge','https://qr.hms.hotel/t01','occupied','2026-10-09 15:13:45',1,NULL,NULL,'Table-1','VIP Lounge',6,1,1,'2026-11-06 15:56:43',NULL),(2,1,'Table-2',5,'Main Hall','https://qr.hms.hotel/t02','occupied','2026-10-09 15:13:45',1,NULL,NULL,'Table-2','Main Hall',5,1,1,'2026-11-10 15:18:08',NULL),(3,1,'Table-3',4,'Main Hall','https://qr.hms.hotel/t03','occupied','2026-10-09 15:13:45',1,NULL,NULL,'Table-3','Main Hall',4,1,2,'2026-11-10 11:27:33',NULL),(4,1,'Table-4',6,'Main Hall','https://qr.hms.hotel/vip01','vacant','2026-10-09 15:13:45',1,NULL,NULL,'Table-4','Main Hall',6,4,6,'2026-11-06 09:59:45',NULL),(5,1,'Table-5',2,'Main Hall','https://qr.hms.hotel/hyd01','occupied','2026-10-09 15:13:45',1,NULL,NULL,'Table-5','Main Hall',2,0,NULL,'2026-11-04 11:55:04',NULL),(6,1,'Table-6',10,'Main Hall','https://qr.hms.hotel/t06','occupied','2026-10-09 17:34:42',1,NULL,NULL,'Table-6','Main Hall',10,2,3,'2026-11-04 17:19:55',NULL),(7,1,'Table-7',8,'VIP Lounge','https://qr.hms.hotel/t07','occupied','2026-10-09 17:37:38',1,NULL,NULL,'Table-7','VIP Lounge',8,1,NULL,'2026-11-03 07:49:00',NULL),(8,1,'Table-8',8,'VIP Lounge','https://qr.hms.hotel/t08','occupied','2026-10-12 11:59:21',1,NULL,NULL,'Table-8','VIP Lounge',8,2,NULL,'2026-11-03 07:12:07',NULL),(9,1,'Table-9',4,'Terrace','https://qr.hms.hotel/t09','occupied','2026-10-12 12:00:49',1,NULL,NULL,'Table-9','Terrace',4,2,5,'2026-11-03 07:12:20',NULL),(10,1,'Table-10',4,'Terrace','https://qr.hms.hotel/t10','occupied','2026-10-12 12:14:15',1,NULL,NULL,'Table-10','Terrace',4,3,5,'2026-11-03 07:12:38',NULL),(12,1,'Table-12',4,'Main Hall',NULL,'occupied','2026-10-12 13:12:53',1,NULL,NULL,'Table-12','Main Hall',4,1,NULL,'2026-11-03 07:44:29',NULL),(13,1,'Table-13',6,'VIP Lounge',NULL,'occupied','2026-10-12 14:32:18',1,NULL,NULL,'Table-13','VIP Lounge',6,4,NULL,'2026-11-03 07:44:29',NULL),(14,1,'Table-14',4,'VIP Lounge',NULL,'occupied','2026-10-15 12:18:15',1,NULL,NULL,'Table-14','VIP Lounge',4,2,NULL,'2026-11-06 16:01:32',NULL),(15,1,'Table-15',4,'Terrace',NULL,'occupied','2026-10-16 10:50:20',1,NULL,NULL,'Table-15','Terrace',4,4,NULL,'2026-11-03 07:49:01',NULL),(55,1,'Table 16',8,'VIP Lounge',NULL,'occupied','2026-10-22 10:10:25',1,NULL,NULL,'Table 16','VIP Lounge',8,3,10,'2026-11-03 07:44:29',NULL),(56,1,'Table 11',4,'AC Family Hall',NULL,'occupied','2026-10-22 11:01:58',1,NULL,NULL,'Table 11','AC Family Hall',4,1,9,'2026-11-03 07:20:30',NULL),(57,1,'Table 17',6,'Main Hall',NULL,'occupied','2026-10-29 17:41:13',1,NULL,NULL,'Table 17','Main Hall',6,2,26,'2026-11-03 07:44:28',NULL),(59,1,'Table-20',8,'Roof top',NULL,'available','2026-11-10 11:59:53',1,NULL,NULL,'Table-20','Roof top',8,0,5,'2026-11-10 11:59:53',NULL);
/*!40000 ALTER TABLE `restaurant_tables` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_restaurant_tables_before_insert` BEFORE INSERT ON `restaurant_tables` FOR EACH ROW BEGIN
    IF NEW.branch_id IS NULL OR NEW.branch_id = 0 THEN
        SET NEW.branch_id = 1;
    END IF;

    IF NEW.table_number IS NULL OR TRIM(NEW.table_number) = '' THEN
        IF NEW.table_name IS NOT NULL AND TRIM(NEW.table_name) != '' THEN
            SET NEW.table_number = TRIM(NEW.table_name);
        ELSE
            SET NEW.table_number = 'T-01';
        END IF;
    ELSE
        SET NEW.table_number = TRIM(NEW.table_number);
    END IF;

    IF NEW.table_name IS NULL OR TRIM(NEW.table_name) = '' THEN
        SET NEW.table_name = NEW.table_number;
    ELSE
        SET NEW.table_name = TRIM(NEW.table_name);
    END IF;

    IF NEW.location IS NULL OR TRIM(NEW.location) = '' THEN
        SET NEW.location = COALESCE(NULLIF(TRIM(NEW.section_area), ''), 'Main Hall');
    ELSE
        SET NEW.location = TRIM(NEW.location);
    END IF;

    IF NEW.section_area IS NULL OR TRIM(NEW.section_area) = '' THEN
        SET NEW.section_area = NEW.location;
    ELSE
        SET NEW.section_area = TRIM(NEW.section_area);
    END IF;

    IF NEW.capacity IS NULL OR NEW.capacity <= 0 THEN
        SET NEW.capacity = COALESCE(NULLIF(NEW.capacity_chairs, 0), 4);
    END IF;

    IF NEW.capacity_chairs IS NULL OR NEW.capacity_chairs <= 0 THEN
        SET NEW.capacity_chairs = NEW.capacity;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_restaurant_tables_before_update` BEFORE UPDATE ON `restaurant_tables` FOR EACH ROW BEGIN
    IF NEW.table_number IS NOT NULL AND NEW.table_number != '' AND (NEW.table_name IS NULL OR NEW.table_name = '') THEN
        SET NEW.table_name = NEW.table_number;
    END IF;
    IF NEW.location IS NOT NULL AND NEW.location != '' AND (NEW.section_area IS NULL OR NEW.section_area = '') THEN
        SET NEW.section_area = NEW.location;
    END IF;
    IF NEW.capacity IS NOT NULL AND NEW.capacity > 0 AND (NEW.capacity_chairs IS NULL OR NEW.capacity_chairs = 0) THEN
        SET NEW.capacity_chairs = NEW.capacity;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` bigint unsigned NOT NULL,
  `permission_id` bigint unsigned NOT NULL,
  `granted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `granted_by` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `fk_rp_permission` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Role-Permission mapping';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1,'2026-10-09 15:13:45',1),(1,2,'2026-10-09 15:13:45',1),(1,3,'2026-10-09 15:13:45',1),(1,4,'2026-10-09 15:13:45',1),(1,5,'2026-10-09 15:13:45',1),(1,6,'2026-10-09 15:13:45',1),(1,7,'2026-10-09 15:13:45',1),(2,2,'2026-10-09 15:13:45',1),(2,3,'2026-10-09 15:13:45',1),(2,4,'2026-10-09 15:13:45',1),(2,5,'2026-10-09 15:13:45',1),(2,6,'2026-10-09 15:13:45',1),(2,7,'2026-10-09 15:13:45',1),(3,3,'2026-10-09 15:13:45',1),(3,5,'2026-10-09 15:13:45',1),(4,6,'2026-10-09 15:13:45',1),(5,3,'2026-10-09 15:13:45',1);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `role_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User roles';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Super Admin','Full system access across all branches',1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,NULL,1),(2,'Branch Manager','Branch operations, staff management, and approvals',1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,NULL,1),(3,'POS Cashier','Order taking, invoicing, and payment processing',1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,NULL,1),(4,'Head Chef','KDS kitchen ticket management and recipe inventory',1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,NULL,1),(5,'Waitstaff','Table order management and customer service',1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,NULL,1),(6,'Delivery Rider','Order pickup, doorstep delivery, and OTP verification',1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,NULL,1),(7,'Admin','Full system administration access',1,NULL,'2026-10-09 09:51:00','2026-10-09 09:51:00',NULL,NULL,NULL,1),(8,'User POS','Billing and floor orders access',1,NULL,'2026-10-09 09:51:00','2026-10-09 09:51:00',NULL,NULL,NULL,1),(9,'Kitchen KOT','Kitchen display system access',1,NULL,'2026-10-09 09:51:00','2026-10-09 09:51:00',NULL,NULL,NULL,1);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salary_payments`
--

DROP TABLE IF EXISTS `salary_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_payments` (
  `payment_id` bigint NOT NULL AUTO_INCREMENT,
  `staff_id` bigint NOT NULL,
  `staff_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_title` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Dining / Service',
  `amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `payment_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `payment_month` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BANK_TRANSFER',
  `transaction_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'COMPLETED',
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`payment_id`),
  KEY `idx_salary_staff` (`staff_id`),
  KEY `idx_salary_date` (`payment_date`),
  KEY `idx_salary_dept` (`department`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salary_payments`
--

LOCK TABLES `salary_payments` WRITE;
/*!40000 ALTER TABLE `salary_payments` DISABLE KEYS */;
INSERT INTO `salary_payments` VALUES (1,1,'Suresh Reddy','General Manager','Management',50000.00,'2026-11-03 07:32:46','2026-11','BANK_TRANSFER','TXN-202611-0001','Monthly salary for 2026-11','COMPLETED',NULL,1,'2026-11-05 07:32:46','2026-11-05 07:32:46',NULL,NULL),(2,2,'Vikas Anand','Head Bartender','Bar',30000.00,'2026-11-03 07:32:46','2026-11','BANK_TRANSFER','TXN-202611-0002','Monthly salary for 2026-11','COMPLETED',NULL,1,'2026-11-05 07:32:46','2026-11-05 07:32:46',NULL,NULL),(3,3,'Rahul Sharma','Senior Mixologist','Bar',28000.00,'2026-11-03 07:32:46','2026-11','BANK_TRANSFER','TXN-202611-0003','Monthly salary for 2026-11','COMPLETED',NULL,1,'2026-11-05 07:32:46','2026-11-05 07:32:46',NULL,NULL),(4,4,'Chef Sanjeev Kumar','Executive Chef','Kitchen',45000.00,'2026-11-03 07:32:46','2026-11','BANK_TRANSFER','TXN-202611-0004','Monthly salary for 2026-11','COMPLETED',NULL,1,'2026-11-05 07:32:46','2026-11-05 07:32:46',NULL,NULL),(5,5,'Anil Verma','Sous Chef','Kitchen',32000.00,'2026-11-03 07:32:46','2026-11','BANK_TRANSFER','TXN-202611-0005','Monthly salary for 2026-11','COMPLETED',NULL,1,'2026-11-05 07:32:46','2026-11-05 07:32:46',NULL,NULL),(6,6,'Pooja Patel','Cashier & Accountant','Management',26000.00,'2026-11-03 07:32:46','2026-11','BANK_TRANSFER','TXN-202611-0006','Monthly salary for 2026-11','COMPLETED',NULL,1,'2026-11-05 07:32:46','2026-11-05 07:32:46',NULL,NULL),(7,1,'Suresh Reddy','General Manager','Management',32000.00,'2026-11-05 07:32:57','2026-11','BANK_TRANSFER','SAL-202611-TEST01','November 2026 Executive Chef salary payment','PAID',NULL,1,'2026-11-05 07:32:57','2026-11-05 07:32:57',1,NULL),(8,2,'Vikas Anand','Head Bartender','Bar',28000.00,'2026-11-05 07:32:58','2026-11','UPI','UPI-SAL-TEST02','November 2026 Head Bartender salary','PAID',NULL,1,'2026-11-05 07:32:58','2026-11-05 07:32:58',1,NULL),(9,1,'Suresh Reddy','General Manager','Management',32000.00,'2026-11-05 07:36:49','2026-11','BANK_TRANSFER','SAL-202611-TEST01','November 2026 Executive Chef salary payment','PAID',NULL,1,'2026-11-05 07:36:49','2026-11-05 07:36:49',1,NULL),(10,2,'Vikas Anand','Head Bartender','Bar',28000.00,'2026-11-05 07:36:49','2026-11','UPI','UPI-SAL-TEST02','November 2026 Head Bartender salary','PAID',NULL,1,'2026-11-05 07:36:49','2026-11-05 07:36:49',1,NULL),(11,1,'Suresh Reddy','General Manager','Management',32000.00,'2026-11-05 07:41:01','2026-11','BANK_TRANSFER','SAL-202611-TEST01','November 2026 Executive Chef salary payment','PAID',NULL,1,'2026-11-05 07:41:01','2026-11-05 07:41:01',1,NULL),(12,2,'Vikas Anand','Head Bartender','Bar',28000.00,'2026-11-05 07:41:01','2026-11','UPI','UPI-SAL-TEST02','November 2026 Head Bartender salary','PAID',NULL,1,'2026-11-05 07:41:01','2026-11-05 07:41:01',1,NULL),(13,1,'Suresh Reddy','General Manager','Management',32000.00,'2026-11-05 08:02:47','2026-11','BANK_TRANSFER','SAL-202611-TEST01','November 2026 Executive Chef salary payment','PAID',NULL,1,'2026-11-05 08:02:47','2026-11-05 08:02:47',1,NULL),(14,2,'Vikas Anand','Head Bartender','Bar',28000.00,'2026-11-05 08:02:47','2026-11','UPI','UPI-SAL-TEST02','November 2026 Head Bartender salary','PAID',NULL,1,'2026-11-05 08:02:47','2026-11-05 08:02:47',1,NULL),(15,7,'Kiran Rao','Head Captain','Dining / Service',12000.00,'2026-11-06 06:05:04','2026-11','BANK_TRANSFER','TXN-TEST-INSTALLMENT-1','November 2026 Salary - 1st Installment (Partial Payment)','PAID',NULL,1,'2026-11-06 06:05:04','2026-11-06 06:05:04',1,NULL),(16,7,'Kiran Rao','Head Captain','Dining / Service',12000.00,'2026-11-06 06:05:13','2026-11','UPI','TXN-TEST-INSTALLMENT-2','November 2026 Salary - 2nd Installment (Balance Payment)','PAID',NULL,1,'2026-11-06 06:05:13','2026-11-06 06:05:13',1,NULL);
/*!40000 ALTER TABLE `salary_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `setting_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned DEFAULT NULL,
  `setting_key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` longtext COLLATE utf8mb4_unicode_ci,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `uq_setting` (`branch_id`,`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Branch configurations';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES (1,1,'INVOICE_PREFIX','INV-BLR-','2026-10-09 15:13:45'),(2,1,'DEFAULT_GST_RATE','5.00','2026-10-09 15:13:45'),(3,1,'SERVICE_CHARGE_PERCENTAGE','5.00','2026-10-09 15:13:45'),(4,1,'AUTO_KOT_PRINT','ENABLED','2026-10-09 15:13:45'),(5,2,'INVOICE_PREFIX','INV-HYD-','2026-10-09 15:13:45'),(6,NULL,'GLOBAL_CURRENCY','INR','2026-10-09 15:13:45'),(7,1,'RESTAURANT_NAME','Bhanu','2026-11-02 15:31:35'),(8,1,'RESTAURANT_TAGLINE','Fine Dining & POS Management','2026-11-02 15:31:35'),(9,1,'CONTACT_NUMBER','+91 98450 12345','2026-10-15 12:10:14'),(10,1,'GSTIN','36AABCA1234F1Z5','2026-10-15 12:10:14'),(11,1,'RECEIPT_HEADER','Welcome to AVSR Food Court!','2026-10-15 12:10:14'),(12,1,'RECEIPT_FOOTER','Thank you for dining with us. Visit again!','2026-10-15 12:10:14');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Waiter',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `shift` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Morning',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff`
--

LOCK TABLES `staff` WRITE;
/*!40000 ALTER TABLE `staff` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_persons`
--

DROP TABLE IF EXISTS `staff_persons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_persons` (
  `staff_id` bigint NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_title` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shift` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `branch_id` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `department` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Dining / Service',
  `base_salary` decimal(18,2) NOT NULL DEFAULT '25000.00',
  PRIMARY KEY (`staff_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_persons`
--

LOCK TABLES `staff_persons` WRITE;
/*!40000 ALTER TABLE `staff_persons` DISABLE KEYS */;
INSERT INTO `staff_persons` VALUES (1,'Suresh Reddy','General Manager','9876543210','General',1,'2026-11-05 07:30:21','2026-11-05 07:30:21',NULL,NULL,1,NULL,NULL,'Management',50000.00),(2,'Vikas Anand','Head Bartender','9876543211','Evening',1,'2026-11-05 07:30:21','2026-11-05 07:30:21',NULL,NULL,1,NULL,NULL,'Bar',30000.00),(3,'Rahul Sharma','Senior Mixologist','9876543212','Evening',1,'2026-11-05 07:30:21','2026-11-05 07:30:21',NULL,NULL,1,NULL,NULL,'Bar',28000.00),(4,'Chef Sanjeev Kumar','Executive Chef','9876543213','Morning',1,'2026-11-05 07:30:21','2026-11-05 07:30:21',NULL,NULL,1,NULL,NULL,'Kitchen',45000.00),(5,'Anil Verma','Sous Chef','9876543214','Morning',1,'2026-11-05 07:30:21','2026-11-05 07:30:21',NULL,NULL,1,NULL,NULL,'Kitchen',32000.00),(6,'Pooja Patel','Cashier & Accountant','9876543215','General',1,'2026-11-05 07:30:21','2026-11-05 07:30:21',NULL,NULL,1,NULL,NULL,'Management',26000.00),(7,'Kiran Rao','Head Captain','9876543216','Evening',1,'2026-11-05 07:30:21','2026-11-05 07:30:21',NULL,NULL,1,NULL,NULL,'Dining / Service',24000.00),(8,'Ramesh Babu','Senior Steward','9876543217','Evening',1,'2026-11-05 07:30:21','2026-11-05 07:30:21',NULL,NULL,1,NULL,NULL,'Dining / Service',20000.00);
/*!40000 ALTER TABLE `staff_persons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `supplier_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint DEFAULT NULL,
  `supplier_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gst_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_terms` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Net 30',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `outlet_id` bigint DEFAULT '1',
  PRIMARY KEY (`supplier_id`),
  KEY `idx_suppliers_branch` (`branch_id`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Raw material suppliers';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES (1,1,'FarmFresh Dairy & Poultry Ltd','Suresh Patel','+919123456780','suresh@farmfresh.com','Yeshwanthpur APMC Yard, Bengaluru','29AAACF1234D1Z1','Net 15',1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,1),(2,1,'GreenFields Agro & Spices','Anand Rao','+919123456781','orders@greenfields.com','KR Market Commercial Complex, Bengaluru','29AAACG5678E1Z8','Net 30',1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,1),(3,2,'Deccan Meats & Seafoods','Mohammed Ali','+919123456782','ali@deccanmeats.com','Gachibowli Market, Hyderabad','36AAACD9012F1Z3','Weekly',1,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,1),(4,NULL,'Test SoftDelete Supplier',NULL,'+91 99999 88888','test@supplier.com','Test City',NULL,'Net 30',0,'2026-10-16 13:01:08','2026-10-16 13:01:08','2026-10-16 13:01:08',NULL,NULL,1),(5,NULL,'Organic Veggies Mart 1793612202772',NULL,'9123456789','veggies@example.com','Vegetable Market Yard',NULL,'Net 30',0,'2026-11-02 15:06:42','2026-11-02 15:06:42','2026-11-02 15:06:42',NULL,NULL,1),(6,NULL,'Organic Veggies Mart 1793612355891',NULL,'9123456789','veggies@example.com','Vegetable Market Yard',NULL,'Net 30',0,'2026-11-02 15:09:15','2026-11-02 15:09:15','2026-11-02 15:09:15',NULL,NULL,1);
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `takeaway_orders`
--

DROP TABLE IF EXISTS `takeaway_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `takeaway_orders` (
  `takeaway_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `pickup_token` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pickup_otp` varchar(6) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estimated_pickup_time` datetime NOT NULL,
  `actual_picked_up_at` datetime DEFAULT NULL,
  `handed_over_by` bigint unsigned DEFAULT NULL,
  `vehicle_details` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('placed','preparing','ready_for_pickup','picked_up','unclaimed_expired','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'placed',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`takeaway_id`),
  UNIQUE KEY `order_id` (`order_id`),
  UNIQUE KEY `pickup_token` (`pickup_token`),
  KEY `fk_to_customer` (`customer_id`),
  KEY `fk_to_staff` (`handed_over_by`),
  KEY `idx_takeaway_status` (`branch_id`,`status`,`estimated_pickup_time`),
  KEY `idx_takeaway_token` (`pickup_token`),
  CONSTRAINT `fk_to_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_to_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_to_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_to_staff` FOREIGN KEY (`handed_over_by`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Prepaid takeaway pickup verification';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `takeaway_orders`
--

LOCK TABLES `takeaway_orders` WRITE;
/*!40000 ALTER TABLE `takeaway_orders` DISABLE KEYS */;
INSERT INTO `takeaway_orders` VALUES (2,117,1,1,'TK-1111-6706','5316','2026-11-11 10:27:46',NULL,NULL,NULL,'placed','2026-11-11 10:02:46','2026-11-11 10:02:46'),(3,118,2,1,'TK-1111-5120','2269','2026-11-11 10:38:01','2026-11-11 10:03:55',3,'White Creta KA-03-MM-4421','picked_up','2026-11-11 10:03:01','2026-11-11 10:03:55');
/*!40000 ALTER TABLE `takeaway_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `role_id` bigint unsigned NOT NULL,
  `branch_id` bigint DEFAULT NULL,
  `user_name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pin_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_type` enum('admin','manager','cashier','waitstaff','chef','rider') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cashier',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `email_active` varchar(100) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (if((`deleted_at` is null),`email`,NULL)) VIRTUAL,
  `username_active` varchar(60) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (if((`deleted_at` is null),`user_name`,NULL)) VIRTUAL,
  `outlet_id` bigint DEFAULT '1',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confirm_password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_users_username_active` (`username_active`),
  UNIQUE KEY `uq_users_email_active` (`email_active`),
  KEY `fk_user_branch` (`branch_id`),
  KEY `idx_users_role_branch` (`role_id`,`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System login users';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` (`user_id`, `role_id`, `branch_id`, `user_name`, `password_hash`, `email`, `phone`, `pin_code`, `user_type`, `is_active`, `last_login`, `deleted_at`, `created_at`, `updated_at`, `created_by`, `updated_by`, `outlet_id`, `password`, `confirm_password`, `full_name`) VALUES (1,1,NULL,'superadmin','$2y$12$e8YqJp...hashed_pass_superadmin','admin@grandpalace.com','+919000000001','1234','admin',1,'2026-10-12 12:41:44',NULL,'2026-10-09 15:13:45','2026-10-12 12:41:44',1,NULL,1,NULL,NULL,NULL),(2,2,1,'blr_manager','$2y$12$e8YqJp...hashed_pass_blr_mgr','blr.mgr@grandpalace.com','+919000000002','4321','manager',1,NULL,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,1,NULL,NULL,NULL),(3,3,1,'blr_cashier1','$2y$12$e8YqJp...hashed_pass_cashier1','cashier1.blr@grandpalace.com','+919000000003','1111','cashier',0,NULL,'2026-10-16 13:09:03','2026-10-09 15:13:45','2026-10-16 13:09:03',1,NULL,1,NULL,NULL,NULL),(4,4,1,'blr_headchef','$2y$12$e8YqJp...hashed_pass_chef1','chef.blr@grandpalace.com','+919000000004','2222','chef',1,NULL,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,1,NULL,NULL,NULL),(5,5,1,'blr_waiter1','$2y$12$e8YqJp...hashed_pass_waiter1','waiter1.blr@grandpalace.com','+919000000005','3333','waitstaff',1,NULL,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,1,NULL,NULL,NULL),(6,6,1,'blr_rider1','$2y$12$e8YqJp...hashed_pass_rider1','rider1.blr@grandpalace.com','+919000000006','5555','rider',1,NULL,NULL,'2026-10-09 15:13:45','2026-10-09 15:13:45',1,NULL,1,NULL,NULL,NULL),(7,7,NULL,'admin','$2a$11$JOmRVsF/hHrb2TRolbhFyO8gghkxPCJx7XjOSabty0RsEnPp7yn.G','admin@avsrfoodcourt.com','9999999999','1234','cashier',1,'2026-11-11 10:08:04',NULL,'2026-10-09 09:56:42','2026-11-11 10:08:04',NULL,NULL,1,'Admin@123',NULL,'AVULA VENKATA SURESH REDDY'),(8,8,NULL,'ravi.kumar','$2a$11$f4c/EeDraR458ZJa1NOlle3Ps4eEIU4kPmIG8yWzouNp0qAd7O.Ga','ravi.kumar@avsrfoodcourt.com','9876543210',NULL,'cashier',1,'2026-11-10 15:42:40',NULL,'2026-10-09 09:56:43','2026-11-10 15:42:40',NULL,NULL,1,'Password123',NULL,'Ravi Kumar'),(9,9,NULL,'kitchen.chef','$2a$11$SCC2oDnabGGjjPeN7tk5JOXdlKwCJjmKAT/10oRigegu/cCXt1Gty','kitchen@avsrfoodcourt.com','9876543211',NULL,'cashier',1,'2026-11-10 15:42:40',NULL,'2026-10-09 09:56:43','2026-11-10 15:42:40',NULL,NULL,1,'Password123',NULL,'Kitchen Display Terminal'),(10,7,NULL,'admins','$2a$11$5yHiEK4uJM7W8t8090dh0O1DeNIEeoN6poZk/m8qtmFv363M/yrj6','admins@avsrfoodcourt.com','9999999999','1234','cashier',1,'2026-11-05 09:34:49',NULL,'2026-10-09 10:21:58','2026-11-11 09:13:46',NULL,NULL,1,'Admin@123',NULL,'AVULA VENKATA SURESH REDDY (Admin)'),(11,7,NULL,'testadmin_pass','$2a$11$Eba6fukRhvlzTSIb4Gj/heuR6GmPk.rG2ba1AnZjY5fq/CvFSzqaK','testadmin_pass@avsrfoodcourt.com','9876543210',NULL,'cashier',1,NULL,NULL,'2026-10-09 16:21:55','2026-10-09 16:21:55',NULL,NULL,1,'Password123',NULL,'Test Registration Admin'),(12,7,NULL,'admin2','$2a$11$41CsTaMpfe59PtX5WaY5V.2viPPhLM/UNB6qAWOQqokVxtx2.ob9S','admin2@gmail.com','9959361927',NULL,'cashier',1,NULL,NULL,'2026-10-09 16:27:32','2026-10-09 16:27:32',NULL,NULL,1,'Password123',NULL,'ADMIN2'),(13,7,NULL,'hotel','$2a$11$FHlZJxSKs6JE8maq5dLx1OC.fWCXgQ3uHmcPDzHN2V5MnuT6km232','hotel@gmail.com','9876543231',NULL,'cashier',1,'2026-10-09 16:29:49',NULL,'2026-10-09 16:29:47','2026-10-09 16:29:49',NULL,NULL,1,'Hotel@123',NULL,'hotel'),(14,7,NULL,'avsr','$2a$11$yAFOwnJNRVudD8J2.yYo3uJlIf4cSFeieKF3uM.AP8EYEWLbGP2yu','avsr@gmail.com','9959361927',NULL,'cashier',1,'2026-10-09 16:35:16',NULL,'2026-10-09 16:35:15','2026-10-09 16:35:16',NULL,NULL,1,'Avsr@123',NULL,'AVSR'),(15,8,NULL,'useravsr','$2a$11$VJkySEWhp8NQTM3T5hIfLu1V3BYNobOvVxJIseqni0fje52B5pl8C','useravsr@avsr.com','9959361927',NULL,'cashier',0,NULL,'2026-10-16 13:08:51','2026-10-09 16:36:18','2026-10-16 13:08:51',NULL,NULL,1,'Avsr@123',NULL,'useravsr'),(16,9,NULL,'avsrkitchen','$2a$11$E0AV/h/MJlJkN3OhNFftEuNAYAOPD.m3qiP5ZbDUoOVXy36fgbIei','avsrkitchen@avsr.com','9959361293',NULL,'cashier',1,'2026-10-09 16:42:22',NULL,'2026-10-09 16:40:43','2026-10-09 16:42:22',NULL,NULL,1,'Avsr@123',NULL,'kitechenavsr'),(17,7,NULL,'admin3','$2a$11$wyLMy1z3FIFcdGYVyKo8gehYSABph1PwMV0CIYtGYtuVnRCXGHxry','admin3@gmail.com','3974343743',NULL,'cashier',1,'2026-10-12 15:59:06',NULL,'2026-10-09 16:44:35','2026-10-12 15:59:06',NULL,NULL,1,'Admin3@123',NULL,'ADMIN3'),(18,8,NULL,'user3','$2a$11$kBoFCh/wCGyH2gVAShApquiwrig9kw7RFvZohWXmIpy5QTj6Eog7G','user3@avsr.com','7638433132',NULL,'cashier',0,'2026-10-09 17:42:26','2026-10-16 13:08:46','2026-10-09 16:46:24','2026-10-16 13:08:46',NULL,NULL,1,'User3@123',NULL,'USER3'),(19,9,NULL,'kot3','$2a$11$zLNMyIWYycd6ApE9b6wn6ORgo/qT8b8bp84N.RPlSb.6dabN7BGmW','kot3@avsr.com','4278545578',NULL,'cashier',1,'2026-10-09 17:41:56',NULL,'2026-10-09 16:47:05','2026-10-09 17:41:56',NULL,NULL,1,'Kot3@123',NULL,'KOT3'),(20,7,NULL,'admin8','$2a$11$F00Hg1pY0qEEFN4qTvlL7u4bALsismTF.FYsvNGK9bY1We1nROVt.','admin@gmail.com','8765454742',NULL,'cashier',1,'2026-10-09 17:26:50',NULL,'2026-10-09 17:11:46','2026-10-09 17:26:50',NULL,NULL,1,'admin123',NULL,'Admin'),(21,7,NULL,'admin5','$2a$11$6Sox1GK8gWVdnDesWNIQ7.FdCG2eeVDSVbj8VM9a31.pShhGATXya','admin5@gmail.com','9876543234',NULL,'cashier',1,'2026-10-09 17:32:57',NULL,'2026-10-09 17:31:27','2026-10-09 17:32:57',NULL,NULL,1,'Admin@123',NULL,'admin5'),(22,7,NULL,'admin7','$2a$11$vwdMXyH4L4DAEuovv.wKXOzjqqBzO5cE7H1q956lv5xOHDyhui.qi','admin7@gmail.com','9876543234',NULL,'cashier',1,'2026-10-09 17:35:59',NULL,'2026-10-09 17:35:57','2026-10-09 17:35:59',NULL,NULL,1,'admin@123',NULL,'admin5'),(23,7,NULL,'hotel1','$2a$11$El.vfAFVX2EsWArzkjH1OOia15cuEvijATMewYPFLbZXR.TbQuuT6','hotel1@gmail.com','9876545342',NULL,'cashier',1,'2026-10-12 09:44:23',NULL,'2026-10-12 09:44:21','2026-10-12 09:44:23',NULL,NULL,1,'Hotel@123',NULL,'hotel1'),(24,3,NULL,'poshotel','$2a$11$xhHKsezjKOH5MbeOUWA2xelU6/B7b9MvY6h4MOdLeDGV0JuLvdjpO','poshotel@avsr.com','9876543212',NULL,'cashier',0,'2026-10-12 10:01:46','2026-10-16 13:08:40','2026-10-12 10:01:17','2026-10-16 13:08:40',NULL,NULL,1,'Poshotel@123',NULL,'hotel3'),(25,9,NULL,'kothotel','$2a$11$4rFUvGRlMmx3gj2DFUqd1elqhNrP1P.oVVoWT346YL8jdtFohzn5e','kothotel@avsr.com','9876565432',NULL,'cashier',0,'2026-10-12 10:03:15','2026-10-16 13:09:09','2026-10-12 10:02:38','2026-10-16 13:09:09',NULL,NULL,1,'Kothotel@123',NULL,'kothotel'),(26,7,NULL,'pirnav','$2a$11$VXeWX2UKTIsFUfjkm1g4W.4uedn1f9EFWby/l8LTSK/aDaylbkGZq','pasupuleti.bhanu7@gmail.com','9876543456',NULL,'cashier',1,'2026-11-10 16:24:57',NULL,'2026-10-12 10:46:43','2026-11-10 16:24:57',NULL,NULL,1,'Admin@123',NULL,'pirnav'),(27,8,NULL,'testdeluser','$2a$11$GlesTtLqY4WFExO8Vb79BOS9.DK3vgtwliXOzs0IZVDaFoGAwe6ZW','testdel@user.com','919999944444',NULL,'cashier',1,NULL,NULL,'2026-10-16 13:03:01','2026-10-16 13:03:01',NULL,NULL,1,'Password123!',NULL,'Test Del User'),(28,8,NULL,'testdeluser2','$2a$11$lZwfKu01bDi/C2kaHlqFDeW9Gkqs6lN2V2GIBb0/FHqTKm40dD.fy','testdel2@user.com','919999944445',NULL,'cashier',0,NULL,'2026-10-16 13:03:12','2026-10-16 13:03:07','2026-10-16 13:03:12',NULL,NULL,1,'Password123!',NULL,'Test Del User 2');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `vw_takeaway_live_counter_board`
--

DROP TABLE IF EXISTS `vw_takeaway_live_counter_board`;
/*!50001 DROP VIEW IF EXISTS `vw_takeaway_live_counter_board`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_takeaway_live_counter_board` AS SELECT 
 1 AS `takeaway_id`,
 1 AS `branch_id`,
 1 AS `branch_name`,
 1 AS `order_id`,
 1 AS `order_number`,
 1 AS `pickup_token`,
 1 AS `pickup_otp`,
 1 AS `customer_id`,
 1 AS `customer_name`,
 1 AS `customer_phone`,
 1 AS `takeaway_status`,
 1 AS `kitchen_status`,
 1 AS `estimated_pickup_time`,
 1 AS `mins_until_pickup`,
 1 AS `total_amount`,
 1 AS `prepaid_amount`,
 1 AS `invoice_number`,
 1 AS `payment_status`,
 1 AS `vehicle_details`,
 1 AS `total_items_count`,
 1 AS `ordered_items_summary`,
 1 AS `order_placed_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping events for database 'hotel_management_db_test'
--

--
-- Dumping routines for database 'hotel_management_db_test'
--
/*!50003 DROP PROCEDURE IF EXISTS `sp_acc_post_invoice_to_gl` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `sp_acc_post_invoice_to_gl`(
    IN p_invoice_id BIGINT UNSIGNED,
    IN p_user_id    BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_branch_id BIGINT UNSIGNED;
    DECLARE v_order_id BIGINT UNSIGNED;
    DECLARE v_invoice_no VARCHAR(30);
    DECLARE v_invoice_date DATE;
    DECLARE v_taxable_amt DECIMAL(10,2);
    DECLARE v_cgst DECIMAL(10,2);
    DECLARE v_sgst DECIMAL(10,2);
    DECLARE v_service_charge DECIMAL(10,2);
    DECLARE v_total_amt DECIMAL(10,2);
    DECLARE v_fy_id BIGINT UNSIGNED;
    DECLARE v_entry_id BIGINT UNSIGNED;
    
    DECLARE v_veg_rev DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_nonveg_rev DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_bar_rev DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_entry_no VARCHAR(30);

    SELECT branch_id, order_id, invoice_number, DATE(invoice_date), taxable_amount, cgst_amount, sgst_amount, service_charge, total_amount
    INTO v_branch_id, v_order_id, v_invoice_no, v_invoice_date, v_taxable_amt, v_cgst, v_sgst, v_service_charge, v_total_amt
    FROM invoices WHERE invoice_id = p_invoice_id;

    IF v_branch_id IS NULL THEN
        SELECT 'FAILED' AS status, 404 AS status_code, 'Invoice not found' AS message;
        LEAVE proc_label;
    END IF;

    SELECT fiscal_year_id INTO v_fy_id FROM acc_fiscal_years 
    WHERE branch_id = v_branch_id AND v_invoice_date BETWEEN start_date AND end_date AND is_closed = 0 LIMIT 1;
    IF v_fy_id IS NULL THEN SET v_fy_id = 1; END IF;

    -- Break down sales by Veg Food, Non-Veg Food, and Bar Alcohol
    SELECT 
        COALESCE(SUM(CASE WHEN c.category_name LIKE '%Bar%' OR c.category_name LIKE '%Liquor%' OR c.category_name LIKE '%Beverage%' THEN oi.total_price ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN (c.category_name NOT LIKE '%Bar%' AND c.category_name NOT LIKE '%Liquor%' AND c.category_name NOT LIKE '%Beverage%') AND m.food_type = 'veg' THEN oi.total_price ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN (c.category_name NOT LIKE '%Bar%' AND c.category_name NOT LIKE '%Liquor%' AND c.category_name NOT LIKE '%Beverage%') AND m.food_type != 'veg' THEN oi.total_price ELSE 0 END), 0.00)
    INTO v_bar_rev, v_veg_rev, v_nonveg_rev
    FROM order_items oi
    JOIN menu_items m ON oi.item_id = m.item_id
    JOIN menu_categories c ON m.category_id = c.category_id
    WHERE oi.order_id = v_order_id AND oi.item_status != 'cancelled';

    IF (v_veg_rev + v_nonveg_rev + v_bar_rev) = 0 THEN
        SET v_veg_rev = v_taxable_amt;
    END IF;

    SET v_entry_no = CONCAT('JV-INV-', v_invoice_no);

    START TRANSACTION;

    INSERT INTO acc_journal_entries (
        entry_number, branch_id, fiscal_year_id, entry_date, entry_type, reference_type, reference_id, narration, total_debit, total_credit, created_by
    ) VALUES (
        v_entry_no, v_branch_id, v_fy_id, v_invoice_date, 'sales_invoice', 'invoice', p_invoice_id, 
        CONCAT('Restaurant & Bar Sales Invoice #', v_invoice_no), v_total_amt, v_total_amt, p_user_id
    ) ON DUPLICATE KEY UPDATE total_debit = VALUES(total_debit), total_credit = VALUES(total_credit);

    SET v_entry_id = (SELECT entry_id FROM acc_journal_entries WHERE entry_number = v_entry_no);
    DELETE FROM acc_journal_entry_lines WHERE entry_id = v_entry_id;

    -- Line 1 (DEBIT): Accounts Receivable
    INSERT INTO acc_journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, description)
    VALUES (v_entry_id, 3, v_total_amt, 0.00, 'Customer Food & Drink Bill');

    -- Line 2 (CREDIT): Veg Food Sales
    IF v_veg_rev > 0 THEN
        INSERT INTO acc_journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, description)
        VALUES (v_entry_id, 16, 0.00, v_veg_rev, 'Dine-in Veg Food Sales');
    END IF;

    -- Line 3 (CREDIT): Non-Veg Food Sales
    IF v_nonveg_rev > 0 THEN
        INSERT INTO acc_journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, description)
        VALUES (v_entry_id, 17, 0.00, v_nonveg_rev, 'Dine-in Non-Veg Food Sales');
    END IF;

    -- Line 4 (CREDIT): Bar Alcohol Sales
    IF v_bar_rev > 0 THEN
        INSERT INTO acc_journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, description)
        VALUES (v_entry_id, 18, 0.00, v_bar_rev, 'Bar Beverage Sales');
    END IF;

    -- Line 5 (CREDIT): Output CGST
    IF v_cgst > 0 THEN
        INSERT INTO acc_journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, description)
        VALUES (v_entry_id, 10, 0.00, v_cgst, 'Output CGST');
    END IF;

    -- Line 6 (CREDIT): Output SGST
    IF v_sgst > 0 THEN
        INSERT INTO acc_journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, description)
        VALUES (v_entry_id, 11, 0.00, v_sgst, 'Output SGST');
    END IF;

    -- Line 7 (CREDIT): Service Charge
    IF v_service_charge > 0 THEN
        INSERT INTO acc_journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, description)
        VALUES (v_entry_id, 19, 0.00, v_service_charge, 'Restaurant Service Charge');
    END IF;

    COMMIT;
    SELECT 'SUCCESS' AS status, 200 AS status_code, 'Sales invoice posted to GL' AS message, v_entry_id AS entry_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_acc_post_payment_to_gl` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `sp_acc_post_payment_to_gl`(
    IN p_payment_id BIGINT UNSIGNED,
    IN p_user_id    BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_invoice_id BIGINT UNSIGNED;
    DECLARE v_branch_id BIGINT UNSIGNED;
    DECLARE v_method VARCHAR(20);
    DECLARE v_amt DECIMAL(10,2);
    DECLARE v_pay_date DATE;
    DECLARE v_fy_id BIGINT UNSIGNED;
    DECLARE v_entry_id BIGINT UNSIGNED;
    DECLARE v_debit_acc BIGINT UNSIGNED;
    DECLARE v_entry_no VARCHAR(30);

    SELECT p.invoice_id, i.branch_id, p.payment_method, p.amount_paid, DATE(p.paid_at)
    INTO v_invoice_id, v_branch_id, v_method, v_amt, v_pay_date
    FROM invoice_payments p
    JOIN invoices i ON p.invoice_id = i.invoice_id
    WHERE p.payment_id = p_payment_id;

    IF v_branch_id IS NULL THEN
        SELECT 'FAILED' AS status, 404 AS status_code, 'Payment record not found' AS message;
        LEAVE proc_label;
    END IF;

    SELECT fiscal_year_id INTO v_fy_id FROM acc_fiscal_years 
    WHERE branch_id = v_branch_id AND v_pay_date BETWEEN start_date AND end_date LIMIT 1;
    IF v_fy_id IS NULL THEN SET v_fy_id = 1; END IF;

    IF v_method = 'cash' THEN
        SET v_debit_acc = 1; -- 1010: Cash on Hand
    ELSE
        SET v_debit_acc = 2; -- 1020: Bank Account (Card/UPI)
    END IF;

    SET v_entry_no = CONCAT('JV-PAY-', p_payment_id);

    START TRANSACTION;

    INSERT INTO acc_journal_entries (
        entry_number, branch_id, fiscal_year_id, entry_date, entry_type, reference_type, reference_id, narration, total_debit, total_credit, created_by
    ) VALUES (
        v_entry_no, v_branch_id, v_fy_id, v_pay_date, 'payment_receipt', 'payment', p_payment_id,
        CONCAT('Bill collection via ', v_method, ' for Invoice #', v_invoice_id), v_amt, v_amt, p_user_id
    ) ON DUPLICATE KEY UPDATE total_debit = VALUES(total_debit), total_credit = VALUES(total_credit);

    SET v_entry_id = (SELECT entry_id FROM acc_journal_entries WHERE entry_number = v_entry_no);
    DELETE FROM acc_journal_entry_lines WHERE entry_id = v_entry_id;

    -- Line 1 (DEBIT): Cash or Bank
    INSERT INTO acc_journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, description)
    VALUES (v_entry_id, v_debit_acc, v_amt, 0.00, CONCAT('Payment received via ', v_method));

    -- Line 2 (CREDIT): Accounts Receivable
    INSERT INTO acc_journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, description)
    VALUES (v_entry_id, 3, 0.00, v_amt, 'Clear Customer Bill Receivable');

    COMMIT;
    SELECT 'SUCCESS' AS status, 200 AS status_code, 'Payment settlement posted to GL' AS message, v_entry_id AS entry_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_acc_record_expense` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `sp_acc_record_expense`(
    IN p_branch_id         BIGINT UNSIGNED,
    IN p_expense_account_id BIGINT UNSIGNED, -- e.g. 24 (Salaries), 25 (LPG & Electricity), 26 (Maintenance), 27 (Excise Permit)
    IN p_paid_from_account  BIGINT UNSIGNED, -- 1 (Cash) or 2 (Bank)
    IN p_expense_date      DATE,
    IN p_amount            DECIMAL(10,2),
    IN p_vendor_name       VARCHAR(120),
    IN p_payment_mode      VARCHAR(20),
    IN p_notes             VARCHAR(255),
    IN p_user_id           BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_exp_id BIGINT UNSIGNED;
    DECLARE v_exp_no VARCHAR(30);
    DECLARE v_fy_id BIGINT UNSIGNED;
    DECLARE v_entry_id BIGINT UNSIGNED;

    IF p_amount <= 0 THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'Expense amount must be greater than zero' AS message;
        LEAVE proc_label;
    END IF;

    SELECT fiscal_year_id INTO v_fy_id FROM acc_fiscal_years 
    WHERE branch_id = p_branch_id AND p_expense_date BETWEEN start_date AND end_date LIMIT 1;
    IF v_fy_id IS NULL THEN SET v_fy_id = 1; END IF;

    SET v_exp_no = CONCAT('EXP-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 9999), 4, '0'));

    START TRANSACTION;

    INSERT INTO acc_expenses (
        branch_id, expense_number, account_id, paid_from_account, expense_date, amount, vendor_name, payment_mode, notes, created_by
    ) VALUES (
        p_branch_id, v_exp_no, p_expense_account_id, p_paid_from_account, p_expense_date, p_amount, p_vendor_name, p_payment_mode, p_notes, p_user_id
    );
    SET v_exp_id = LAST_INSERT_ID();

    INSERT INTO acc_journal_entries (
        entry_number, branch_id, fiscal_year_id, entry_date, entry_type, reference_type, reference_id, narration, total_debit, total_credit, created_by
    ) VALUES (
        CONCAT('JV-', v_exp_no), p_branch_id, v_fy_id, p_expense_date, 'operating_expense', 'expense', v_exp_id,
        CONCAT('Operating expense paid to ', COALESCE(p_vendor_name, 'Vendor'), ': ', p_notes), p_amount, p_amount, p_user_id
    );
    SET v_entry_id = LAST_INSERT_ID();

    -- Debit Expense
    INSERT INTO acc_journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, description)
    VALUES (v_entry_id, p_expense_account_id, p_amount, 0.00, p_notes);

    -- Credit Cash or Bank
    INSERT INTO acc_journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, description)
    VALUES (v_entry_id, p_paid_from_account, 0.00, p_amount, CONCAT('Payment via ', p_payment_mode));

    COMMIT;
    SELECT 'SUCCESS' AS status, 201 AS status_code, 'Expense recorded and posted to GL' AS message, v_exp_id AS expense_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_AdjustStock` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_AdjustStock`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_auth_password_reset` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_auth_password_reset`(
    IN p_action             VARCHAR(30),   
    IN p_email              VARCHAR(100),
    IN p_otp_hash           VARCHAR(255),
    IN p_new_password_hash  VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_user_id BIGINT UNSIGNED;
    DECLARE v_reset_id BIGINT UNSIGNED;
    DECLARE v_attempts INT;
    DECLARE v_error_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    
    SELECT user_id INTO v_user_id FROM users WHERE email = LOWER(TRIM(p_email)) AND deleted_at IS NULL;
    IF v_user_id IS NULL THEN
        SELECT 'FAILED' AS status, 404 AS status_code, 'User email not found' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

    
    IF p_action = 'REQUEST_OTP' THEN
        START TRANSACTION;
            INSERT INTO password_reset_tokens (user_id, otp_hash, expires_at, attempts)
            VALUES (v_user_id, p_otp_hash, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 0);
            SET @token_id = LAST_INSERT_ID();
        COMMIT;

        SELECT 'SUCCESS' AS status, 200 AS status_code, 'OTP generated. Valid for 15 minutes.' AS message, @token_id AS data_id;

    
    ELSEIF p_action = 'VERIFY_OTP' THEN
        SELECT reset_id, attempts INTO v_reset_id, v_attempts 
        FROM password_reset_tokens 
        WHERE user_id = v_user_id AND used_at IS NULL AND expires_at > NOW()
        ORDER BY reset_id DESC LIMIT 1;

        IF v_reset_id IS NULL THEN
            SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid or expired OTP request' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;

        IF v_attempts >= 5 THEN
            SELECT 'FAILED' AS status, 429 AS status_code, 'Too many failed attempts. Please request a new OTP.' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;

        START TRANSACTION;
            UPDATE password_reset_tokens SET verified_at = NOW() WHERE reset_id = v_reset_id;
        COMMIT;

        SELECT 'SUCCESS' AS status, 200 AS status_code, 'OTP verified successfully' AS message, v_reset_id AS data_id;

    
    ELSEIF p_action = 'RESET_PASSWORD' THEN
        SELECT reset_id INTO v_reset_id
        FROM password_reset_tokens 
        WHERE user_id = v_user_id AND verified_at IS NOT NULL AND used_at IS NULL AND expires_at > NOW()
        ORDER BY reset_id DESC LIMIT 1;

        IF v_reset_id IS NULL THEN
            SELECT 'FAILED' AS status, 400 AS status_code, 'Unverified or expired password reset session' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;

        START TRANSACTION;
            UPDATE users SET password_hash = p_new_password_hash WHERE user_id = v_user_id;
            UPDATE password_reset_tokens SET used_at = NOW() WHERE reset_id = v_reset_id;
            
            INSERT INTO audit_logs (user_id, action, table_name, record_id)
            VALUES (v_user_id, 'PASSWORD_RESET_COMPLETED', 'users', v_user_id);
        COMMIT;

        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Password successfully reset' AS message, v_user_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_bar_dispense_peg_bottle` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_bar_dispense_peg_bottle`(
    IN p_bar_counter_id BIGINT UNSIGNED,
    IN p_brand_id       BIGINT UNSIGNED,
    IN p_pour_ml        DECIMAL(10,2),     -- 30.00, 60.00, 90.00
    IN p_bartender_id   BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_opened_bot_id BIGINT UNSIGNED;
    DECLARE v_curr_remaining DECIMAL(10,2);
    DECLARE v_size_id BIGINT UNSIGNED;
    DECLARE v_full_volume DECIMAL(10,2);
    DECLARE v_new_remaining DECIMAL(10,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Peg Dispense Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    -- 1. Find active open bottle for this brand with sufficient volume
    SELECT opened_bottle_id, remaining_volume_ml 
    INTO v_opened_bot_id, v_curr_remaining
    FROM bar_opened_bottles
    WHERE bar_counter_id = p_bar_counter_id 
      AND brand_id = p_brand_id 
      AND is_empty = 0
    ORDER BY opened_bottle_id ASC LIMIT 1 FOR UPDATE;

    START TRANSACTION;
        -- 2. If no opened bottle exists or remaining ml is 0, crack open a new sealed bottle
        IF v_opened_bot_id IS NULL OR v_curr_remaining < p_pour_ml THEN
            -- Close depleted bottle if exists
            IF v_opened_bot_id IS NOT NULL THEN
                UPDATE bar_opened_bottles 
                SET is_empty = 1, emptied_at = NOW(), remaining_volume_ml = 0.00 
                WHERE opened_bottle_id = v_opened_bot_id;
            END IF;

            -- Find standard bottle packaging size (e.g. 750ml)
            SELECT size_id, volume_ml INTO v_size_id, v_full_volume
            FROM bar_bottle_sizes
            WHERE brand_id = p_brand_id AND package_type = 'bottle'
            ORDER BY volume_ml DESC LIMIT 1;

            IF v_size_id IS NULL THEN
                SELECT 'FAILED' AS status, 404 AS status_code, 'No packaging size configured for this brand' AS message, NULL AS data_id;
                ROLLBACK;
                LEAVE proc_label;
            END IF;

            -- Open fresh bottle
            INSERT INTO bar_opened_bottles (
                bar_counter_id, brand_id, size_id, bottle_serial_number,
                opened_by, initial_volume_ml, remaining_volume_ml, is_empty, opened_at
            ) VALUES (
                p_bar_counter_id, p_brand_id, v_size_id, CONCAT('BTL-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 9999), 4, '0')),
                p_bartender_id, v_full_volume, v_full_volume, 0, NOW()
            );
            SET v_opened_bot_id = LAST_INSERT_ID();
            SET v_curr_remaining = v_full_volume;
        END IF;

        -- 3. Pour the peg and decrement remaining ml
        SET v_new_remaining = v_curr_remaining - p_pour_ml;

        UPDATE bar_opened_bottles
        SET remaining_volume_ml = GREATEST(0.00, v_new_remaining),
            is_empty = IF(v_new_remaining <= 0.00, 1, 0),
            emptied_at = IF(v_new_remaining <= 0.00, NOW(), emptied_at)
        WHERE opened_bottle_id = v_opened_bot_id;

    COMMIT;

    SELECT 'SUCCESS' AS status, 200 AS status_code, 'Peg poured from active bottle' AS message, 
           v_opened_bot_id AS opened_bottle_id, p_pour_ml AS ml_dispensed, v_new_remaining AS remaining_ml;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_bar_generate_bot` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_bar_generate_bot`(
    IN p_order_id        BIGINT UNSIGNED,
    IN p_bar_counter_id  BIGINT UNSIGNED,
    IN p_bartender_id    BIGINT UNSIGNED,
    IN p_priority        VARCHAR(20),       -- 'normal', 'high', 'urgent'
    IN p_special_notes   VARCHAR(255),
    IN p_items_json      JSON               -- Array: [{"order_item_id": 10, "pour_size_ml": 60.0, "notes": "On rocks"}]
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_bot_number VARCHAR(30);
    DECLARE v_batch INT DEFAULT 1;
    DECLARE v_items_count INT DEFAULT 0;
    DECLARE v_idx INT DEFAULT 0;

    DECLARE v_oi_id BIGINT UNSIGNED;
    DECLARE v_pour_ml DECIMAL(6,2);
    DECLARE v_item_notes VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('BOT Generation Failed: ', v_error_msg) AS message, NULL AS bot_id, NULL AS bot_number;
    END;

    SET v_items_count = JSON_LENGTH(p_items_json);
    IF v_items_count IS NULL OR v_items_count = 0 THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'At least one drink line item is required' AS message, NULL AS bot_id, NULL AS bot_number;
        LEAVE proc_label;
    END IF;

    -- Calculate Batch Number for Bar Orders on this Order
    SELECT COALESCE(MAX(batch_number), 0) + 1 INTO v_batch 
    FROM bar_order_tickets 
    WHERE order_id = p_order_id;

    -- Generate BOT Ticket Number: BOT-YYYYMMDD-XXXX
    SET v_bot_number = CONCAT('BOT-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 9999), 4, '0'));

    START TRANSACTION;
        INSERT INTO bar_order_tickets (
            bot_number, order_id, bar_counter_id, bartender_id,
            batch_number, status, priority, special_notes, created_at
        ) VALUES (
            v_bot_number, p_order_id, p_bar_counter_id, p_bartender_id,
            v_batch, 'queued', COALESCE(p_priority, 'normal'), p_special_notes, NOW()
        );
        SET @new_bot_id = LAST_INSERT_ID();

        -- Insert BOT child drink line items
        WHILE v_idx < v_items_count DO
            SET v_oi_id      = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].order_item_id')));
            SET v_pour_ml    = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].pour_size_ml'))), 60.00);
            SET v_item_notes = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].notes')));

            INSERT INTO bar_bot_items (
                bot_id, order_item_id, pour_size_ml, item_status, special_notes
            ) VALUES (
                @new_bot_id, v_oi_id, v_pour_ml, 'queued', v_item_notes
            );

            SET v_idx = v_idx + 1;
        END WHILE;
    COMMIT;

    -- Result Set 1: Header
    SELECT 'SUCCESS' AS status, 201 AS status_code, 'Bar Order Ticket (BOT) dispatched' AS message, @new_bot_id AS bot_id, v_bot_number AS bot_number, v_batch AS batch_number;

    -- Result Set 2: Bar Slip for Bartender
    SELECT bbi.bot_item_id, m.item_name, bbi.pour_size_ml, oi.quantity, bbi.special_notes, oi.special_notes AS guest_notes
    FROM bar_bot_items bbi
    JOIN order_items oi ON bbi.order_item_id = oi.order_item_id
    JOIN menu_items m ON oi.item_id = m.item_id
    WHERE bbi.bot_id = @new_bot_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_bar_manage_inventory` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `sp_bar_manage_inventory`(
    IN p_action              VARCHAR(30),        -- 'INWARD_STOCK', 'TRANSFER_TO_COUNTER', 'DIRECT_BOTTLE_SALE', 'LOG_BREAKAGE', 'STOCK_AUDIT_ADJUSTMENT', 'GET_CELLAR_STOCK', 'GET_BAR_COUNTER_STOCK', 'GET_TRANSACTION_LEDGER'
    IN p_branch_id           BIGINT UNSIGNED,
    IN p_brand_id            BIGINT UNSIGNED,
    IN p_size_id             BIGINT UNSIGNED,
    IN p_bar_counter_id      BIGINT UNSIGNED,
    IN p_quantity            INT,
    IN p_unit_cost           DECIMAL(10,2),
    IN p_excise_permit_no    VARCHAR(80),
    IN p_batch_no            VARCHAR(60),
    IN p_reference_no        VARCHAR(80),
    IN p_remarks             VARCHAR(255),
    IN p_user_id             BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_current_stock INT UNSIGNED DEFAULT 0;
    DECLARE v_volume_ml INT UNSIGNED DEFAULT 0;
    DECLARE v_total_cost DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_i INT DEFAULT 0;
 
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Bar Inventory Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;
 
    -- =================================================================
    -- 1. INWARD STOCK
    -- =================================================================
    IF p_action = 'INWARD_STOCK' THEN
        IF p_quantity <= 0 THEN
            SELECT 'FAILED' AS status, 400 AS status_code, 'Quantity received must be greater than zero' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;
 
        SET v_total_cost = ROUND(p_quantity * COALESCE(p_unit_cost, 0.00), 2);
 
        START TRANSACTION;
 
        INSERT INTO bar_inventory_stock (
            branch_id, brand_id, size_id, sealed_quantity, avg_cost_price, last_received_at
        ) VALUES (
            p_branch_id, p_brand_id, p_size_id, p_quantity, COALESCE(p_unit_cost, 0.00), NOW()
        )
        ON DUPLICATE KEY UPDATE
            avg_cost_price   = ROUND(((sealed_quantity * avg_cost_price) + (p_quantity * COALESCE(p_unit_cost, avg_cost_price))) / (sealed_quantity + p_quantity), 2),
            sealed_quantity  = sealed_quantity + p_quantity,
            last_received_at = NOW();
 
        INSERT INTO bar_inventory_transactions (
            branch_id, brand_id, size_id, bar_counter_id, transaction_type,
            quantity, unit_cost, total_cost, excise_permit_no, batch_no,
            reference_invoice_no, reason_remarks, created_by, created_at
        ) VALUES (
            p_branch_id, p_brand_id, p_size_id, NULL, 'inward_purchase',
            p_quantity, COALESCE(p_unit_cost, 0.00), v_total_cost, p_excise_permit_no, p_batch_no,
            p_reference_no, p_remarks, p_user_id, NOW()
        );
 
        COMMIT;
        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Stock received and logged in excise ledger successfully' AS message, LAST_INSERT_ID() AS data_id;
        LEAVE proc_label;
    END IF;
 
    -- =================================================================
    -- 2. TRANSFER TO COUNTER
    -- =================================================================
    IF p_action = 'TRANSFER_TO_COUNTER' THEN
        IF p_quantity <= 0 THEN
            SELECT 'FAILED' AS status, 400 AS status_code, 'Transfer quantity must be greater than zero' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;
 
        IF p_bar_counter_id IS NULL THEN
            SELECT 'FAILED' AS status, 400 AS status_code, 'Target bar counter must be specified' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;
 
        SELECT sealed_quantity INTO v_current_stock
        FROM bar_inventory_stock
        WHERE branch_id = p_branch_id AND brand_id = p_brand_id AND size_id = p_size_id;
 
        IF v_current_stock IS NULL OR v_current_stock < p_quantity THEN
            SELECT 'FAILED' AS status, 400 AS status_code, 
                   CONCAT('Insufficient cellar stock. Available: ', COALESCE(v_current_stock, 0), ', Requested: ', p_quantity) AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;
 
        SELECT CAST(volume_ml AS UNSIGNED) INTO v_volume_ml
        FROM bar_bottle_sizes
        WHERE size_id = p_size_id;
 
        START TRANSACTION;
 
        UPDATE bar_inventory_stock
        SET sealed_quantity = sealed_quantity - p_quantity
        WHERE branch_id = p_branch_id AND brand_id = p_brand_id AND size_id = p_size_id;
 
        INSERT INTO bar_inventory_transactions (
            branch_id, brand_id, size_id, bar_counter_id, transaction_type,
            quantity, unit_cost, total_cost, reference_invoice_no, reason_remarks, created_by, created_at
        ) VALUES (
            p_branch_id, p_brand_id, p_size_id, p_bar_counter_id, 'cellar_to_counter',
            -p_quantity, 0.00, 0.00, p_reference_no, p_remarks, p_user_id, NOW()
        );
 
        SET v_i = 0;
        WHILE v_i < p_quantity DO
            INSERT INTO bar_opened_bottles (
                bar_counter_id, brand_id, size_id, initial_volume_ml, remaining_volume_ml, is_empty, opened_by, opened_at
            ) VALUES (
                p_bar_counter_id, p_brand_id, p_size_id, v_volume_ml, v_volume_ml, 0, p_user_id, NOW()
            );
            SET v_i = v_i + 1;
        END WHILE;
 
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 
               CONCAT(p_quantity, ' bottle(s) transferred to bar counter and uncorked for dispensing') AS message, p_bar_counter_id AS data_id;
        LEAVE proc_label;
    END IF;
 
    -- =================================================================
    -- 3. DIRECT BOTTLE SALE
    -- =================================================================
    IF p_action = 'DIRECT_BOTTLE_SALE' THEN
        SELECT sealed_quantity INTO v_current_stock
        FROM bar_inventory_stock
        WHERE branch_id = p_branch_id AND brand_id = p_brand_id AND size_id = p_size_id;
 
        IF v_current_stock IS NULL OR v_current_stock < p_quantity THEN
            SELECT 'FAILED' AS status, 400 AS status_code, 'Insufficient sealed stock for direct sale' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;
 
        START TRANSACTION;
 
        UPDATE bar_inventory_stock
        SET sealed_quantity = sealed_quantity - p_quantity
        WHERE branch_id = p_branch_id AND brand_id = p_brand_id AND size_id = p_size_id;
 
        INSERT INTO bar_inventory_transactions (
            branch_id, brand_id, size_id, bar_counter_id, transaction_type,
            quantity, reference_invoice_no, reason_remarks, created_by, created_at
        ) VALUES (
            p_branch_id, p_brand_id, p_size_id, p_bar_counter_id, 'direct_bottle_sale',
            -p_quantity, p_reference_no, p_remarks, p_user_id, NOW()
        );
 
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Sealed bottle sale recorded' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;
 
    -- =================================================================
    -- 4. LOG BREAKAGE
    -- =================================================================
    IF p_action = 'LOG_BREAKAGE' THEN
        SELECT sealed_quantity INTO v_current_stock
        FROM bar_inventory_stock
        WHERE branch_id = p_branch_id AND brand_id = p_brand_id AND size_id = p_size_id;
 
        IF v_current_stock IS NULL OR v_current_stock < p_quantity THEN
            SELECT 'FAILED' AS status, 400 AS status_code, 'Breakage quantity exceeds available stock' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;
 
        START TRANSACTION;
 
        UPDATE bar_inventory_stock
        SET sealed_quantity = sealed_quantity - p_quantity
        WHERE branch_id = p_branch_id AND brand_id = p_brand_id AND size_id = p_size_id;
 
        INSERT INTO bar_inventory_transactions (
            branch_id, brand_id, size_id, bar_counter_id, transaction_type,
            quantity, reason_remarks, created_by, created_at
        ) VALUES (
            p_branch_id, p_brand_id, p_size_id, p_bar_counter_id, 'breakage_spoilage',
            -p_quantity, p_remarks, p_user_id, NOW()
        );
 
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Breakage logged in excise spillage ledger' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;
 
    -- =================================================================
    -- 5. STOCK AUDIT ADJUSTMENT
    -- =================================================================
    IF p_action = 'STOCK_AUDIT_ADJUSTMENT' THEN
        START TRANSACTION;
 
        INSERT INTO bar_inventory_stock (
            branch_id, brand_id, size_id, sealed_quantity
        ) VALUES (
            p_branch_id, p_brand_id, p_size_id, p_quantity
        )
        ON DUPLICATE KEY UPDATE sealed_quantity = p_quantity;
 
        INSERT INTO bar_inventory_transactions (
            branch_id, brand_id, size_id, transaction_type,
            quantity, reason_remarks, created_by, created_at
        ) VALUES (
            p_branch_id, p_brand_id, p_size_id, 'audit_adjustment',
            p_quantity, p_remarks, p_user_id, NOW()
        );
 
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Stock level reconciled against physical audit' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;
 
    -- =================================================================
    -- 6. GET CELLAR STOCK (Corrected packaging_size format)
    -- =================================================================
    IF p_action = 'GET_CELLAR_STOCK' THEN
        SELECT 
            s.stock_id,
            b.brand_id,
            b.brand_name,
            b.liquor_category,
            b.excise_brand_code,
            sz.size_id,
            sz.package_type,
            sz.volume_ml,
            CONCAT(
                CASE 
                    WHEN sz.volume_ml >= 1000 THEN CONCAT(ROUND(sz.volume_ml / 1000, 1), ' L')
                    ELSE CONCAT(ROUND(sz.volume_ml, 0), ' ml')
                END, 
                ' (', sz.package_type, ')'
            ) AS packaging_size,
            s.sealed_quantity,
            s.min_reorder_level,
            s.reorder_quantity,
            s.avg_cost_price,
            ROUND(s.sealed_quantity * s.avg_cost_price, 2) AS total_inventory_value,
            s.last_received_at,
            CASE 
                WHEN s.sealed_quantity <= s.min_reorder_level THEN 'REORDER_NOW'
                WHEN s.sealed_quantity <= (s.min_reorder_level * 1.5) THEN 'LOW_STOCK'
                ELSE 'SUFFICIENT'
            END AS stock_status
        FROM bar_inventory_stock s
        JOIN bar_liquor_brands b ON s.brand_id = b.brand_id
        JOIN bar_bottle_sizes sz ON s.size_id = sz.size_id
        WHERE s.branch_id = p_branch_id
          AND (p_brand_id IS NULL OR s.brand_id = p_brand_id)
        ORDER BY b.liquor_category, b.brand_name;
        LEAVE proc_label;
    END IF;
 
    -- =================================================================
    -- 7. GET BAR COUNTER STOCK (Corrected packaging_size format)
    -- =================================================================
    IF p_action = 'GET_BAR_COUNTER_STOCK' THEN
        SELECT 
            ob.opened_bottle_id,
            bc.counter_name,
            b.brand_name,
            b.liquor_category,
            sz.package_type,
            sz.volume_ml,
            CONCAT(ROUND(sz.volume_ml, 0), ' ml (', sz.package_type, ')') AS packaging_size,
            ob.initial_volume_ml,
            ob.remaining_volume_ml,
            ROUND((ob.remaining_volume_ml / ob.initial_volume_ml) * 100, 1) AS remaining_pct,
            CASE WHEN ob.is_empty = 1 THEN 'empty' ELSE 'open' END AS status,
            ob.opened_at
        FROM bar_opened_bottles ob
        JOIN bar_counters bc ON ob.bar_counter_id = bc.bar_counter_id
        JOIN bar_liquor_brands b ON ob.brand_id = b.brand_id
        JOIN bar_bottle_sizes sz ON ob.size_id = sz.size_id
        WHERE bc.branch_id = p_branch_id
          AND (p_bar_counter_id IS NULL OR ob.bar_counter_id = p_bar_counter_id)
          AND ob.is_empty = 0
        ORDER BY bc.counter_name, b.brand_name;
        LEAVE proc_label;
    END IF;
 
    -- =================================================================
    -- 8. GET TRANSACTION LEDGER (Corrected packaging_size format)
    -- =================================================================
    IF p_action = 'GET_TRANSACTION_LEDGER' THEN
        SELECT 
            t.bar_trans_id,
            t.created_at,
            t.transaction_type,
            b.brand_name,
            CONCAT(
                CASE 
                    WHEN sz.volume_ml >= 1000 THEN CONCAT(ROUND(sz.volume_ml / 1000, 1), ' L')
                    ELSE CONCAT(ROUND(sz.volume_ml, 0), ' ml')
                END, 
                ' (', sz.package_type, ')'
            ) AS packaging_size,
            COALESCE(bc.counter_name, 'Central Cellar') AS location,
            t.quantity,
            t.unit_cost,
            t.total_cost,
            t.excise_permit_no,
            t.batch_no,
            t.reference_invoice_no,
            t.reason_remarks,
            u.user_name AS operator_name
        FROM bar_inventory_transactions t
        JOIN bar_liquor_brands b ON t.brand_id = b.brand_id
        JOIN bar_bottle_sizes sz ON t.size_id = sz.size_id
        LEFT JOIN bar_counters bc ON t.bar_counter_id = bc.bar_counter_id
        LEFT JOIN users u ON t.created_by = u.user_id
        WHERE t.branch_id = p_branch_id
          AND (p_brand_id IS NULL OR t.brand_id = p_brand_id)
        ORDER BY t.created_at DESC
        LIMIT 100;
        LEAVE proc_label;
    END IF;
 
    SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid action specified' AS message, NULL AS data_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_bar_manage_keg_tappings` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_bar_manage_keg_tappings`(
    IN p_action           VARCHAR(30),       -- 'TAP_KEG', 'LOG_DISPENSE', 'DISCONNECT_KEG', 'GET_ACTIVE_TAPS'
    IN p_keg_tapping_id   BIGINT UNSIGNED,
    IN p_bar_counter_id   BIGINT UNSIGNED,
    IN p_brand_id         BIGINT UNSIGNED,
    IN p_tap_number       VARCHAR(20),       -- e.g. "Tap #01"
    IN p_keg_serial       VARCHAR(60),
    IN p_capacity_liters  DECIMAL(6,2),      -- 30.00 or 50.00 L
    IN p_dispensed_liters DECIMAL(6,2),
    IN p_foam_loss_liters DECIMAL(6,2),
    IN p_user_id          BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Keg Management Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    -- TAP_KEG
    IF p_action = 'TAP_KEG' THEN
        START TRANSACTION;
            INSERT INTO bar_keg_tappings (
                bar_counter_id, brand_id, tap_number, keg_serial_number,
                capacity_liters, tapped_at, tapped_by, liters_dispensed, foam_loss_liters, status
            ) VALUES (
                p_bar_counter_id, p_brand_id, TRIM(p_tap_number), p_keg_serial,
                COALESCE(p_capacity_liters, 30.00), NOW(), p_user_id, 0.00, 0.00, 'tapped'
            );
            SET @new_keg_id = LAST_INSERT_ID();
        COMMIT;
        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Fresh keg tapped on beer line' AS message, @new_keg_id AS data_id;

    -- LOG_DISPENSE
    ELSEIF p_action = 'LOG_DISPENSE' THEN
        START TRANSACTION;
            UPDATE bar_keg_tappings
            SET liters_dispensed = liters_dispensed + COALESCE(p_dispensed_liters, 0.00),
                foam_loss_liters = foam_loss_liters + COALESCE(p_foam_loss_liters, 0.00),
                status = IF(liters_dispensed + foam_loss_liters >= capacity_liters, 'empty', 'tapped')
            WHERE keg_tapping_id = p_keg_tapping_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Draught dispense logged' AS message, p_keg_tapping_id AS data_id;

    -- DISCONNECT_KEG
    ELSEIF p_action = 'DISCONNECT_KEG' THEN
        START TRANSACTION;
            UPDATE bar_keg_tappings
            SET status          = 'disconnected',
                disconnected_at = NOW()
            WHERE keg_tapping_id = p_keg_tapping_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Keg line disconnected' AS message, p_keg_tapping_id AS data_id;

    -- GET_ACTIVE_TAPS
    ELSEIF p_action = 'GET_ACTIVE_TAPS' THEN
        SELECT bkt.*, blb.brand_name, bc.counter_name,
               (bkt.capacity_liters - (bkt.liters_dispensed + bkt.foam_loss_liters)) AS remaining_liters
        FROM bar_keg_tappings bkt
        JOIN bar_liquor_brands blb ON bkt.brand_id = blb.brand_id
        JOIN bar_counters bc ON bkt.bar_counter_id = bc.bar_counter_id
        WHERE bkt.bar_counter_id = p_bar_counter_id AND bkt.status = 'tapped'
        ORDER BY bkt.tap_number ASC;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_bar_reconcile_daily_excise` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_bar_reconcile_daily_excise`(
    IN p_action               VARCHAR(30),       -- 'RECORD_DAILY_ENTRY', 'VERIFY_PHYSICAL_STOCK', 'GET_EXCISE_REPORT'
    IN p_branch_id            BIGINT UNSIGNED,
    IN p_brand_id             BIGINT UNSIGNED,
    IN p_register_date        DATE,
    IN p_opening_bottles      INT,
    IN p_opening_loose_ml     DECIMAL(10,2),
    IN p_inward_bottles       INT,
    IN p_sales_bottles        INT,
    IN p_sales_loose_ml       DECIMAL(10,2),
    IN p_breakage_spillage_ml DECIMAL(10,2),
    IN p_physical_verified_ml DECIMAL(10,2),
    IN p_verified_by          BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_date DATE;
    DECLARE v_calc_closing_bottles INT;
    DECLARE v_calc_closing_ml DECIMAL(10,2);
    DECLARE v_discrepancy DECIMAL(10,2) DEFAULT 0.00;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Excise Register Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    SET v_date = COALESCE(p_register_date, CURRENT_DATE());

    -- RECORD_DAILY_ENTRY
    IF p_action = 'RECORD_DAILY_ENTRY' THEN
        -- Standard Formula: Closing Bottles = Opening + Inward - Full Bottle Sales
        SET v_calc_closing_bottles = (COALESCE(p_opening_bottles, 0) + COALESCE(p_inward_bottles, 0)) - COALESCE(p_sales_bottles, 0);
        
        -- Closing Loose ml = Opening ml - (Loose sales + Spillage)
        SET v_calc_closing_ml = GREATEST(0.00, COALESCE(p_opening_loose_ml, 0.00) - (COALESCE(p_sales_loose_ml, 0.00) + COALESCE(p_breakage_spillage_ml, 0.00)));

        START TRANSACTION;
            INSERT INTO bar_excise_daily_registers (
                branch_id, brand_id, register_date, opening_sealed_bottles, opening_loose_ml,
                inward_sealed_bottles, sales_sealed_bottles, sales_loose_ml, breakage_spillage_ml,
                closing_sealed_bottles, closing_loose_ml, discrepancy_ml, verified_by, created_at
            ) VALUES (
                p_branch_id, p_brand_id, v_date, p_opening_bottles, p_opening_loose_ml,
                COALESCE(p_inward_bottles, 0), COALESCE(p_sales_bottles, 0), COALESCE(p_sales_loose_ml, 0.00),
                COALESCE(p_breakage_spillage_ml, 0.00), v_calc_closing_bottles, v_calc_closing_ml, 0.00, p_verified_by, NOW()
            )
            ON DUPLICATE KEY UPDATE
                opening_sealed_bottles = VALUES(opening_sealed_bottles),
                opening_loose_ml       = VALUES(opening_loose_ml),
                inward_sealed_bottles  = VALUES(inward_sealed_bottles),
                sales_sealed_bottles   = VALUES(sales_sealed_bottles),
                sales_loose_ml         = VALUES(sales_loose_ml),
                breakage_spillage_ml   = VALUES(breakage_spillage_ml),
                closing_sealed_bottles = v_calc_closing_bottles,
                closing_loose_ml       = v_calc_closing_ml;
        COMMIT;

        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Daily excise record saved' AS message, p_brand_id AS data_id, v_calc_closing_bottles AS closing_bottles, v_calc_closing_ml AS closing_ml;

    -- VERIFY_PHYSICAL_STOCK
    ELSEIF p_action = 'VERIFY_PHYSICAL_STOCK' THEN
        SELECT (p_physical_verified_ml - closing_loose_ml) INTO v_discrepancy
        FROM bar_excise_daily_registers
        WHERE branch_id = p_branch_id AND brand_id = p_brand_id AND register_date = v_date;

        START TRANSACTION;
            UPDATE bar_excise_daily_registers
            SET discrepancy_ml = v_discrepancy,
                verified_by    = p_verified_by
            WHERE branch_id = p_branch_id AND brand_id = p_brand_id AND register_date = v_date;
        COMMIT;

        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Physical stock audit recorded' AS message, v_discrepancy AS variance_ml;

    -- GET_EXCISE_REPORT
    ELSEIF p_action = 'GET_EXCISE_REPORT' THEN
        SELECT 
            edr.*, 
            blb.brand_name, 
            blb.liquor_category, 
            blb.excise_brand_code,
            e.full_name AS verifier_name
        FROM bar_excise_daily_registers edr
        JOIN bar_liquor_brands blb ON edr.brand_id = blb.brand_id
        LEFT JOIN employees e ON edr.verified_by = e.employee_id
        WHERE edr.branch_id = p_branch_id AND edr.register_date = v_date
        ORDER BY blb.liquor_category, blb.brand_name ASC;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_bar_update_drink_status` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_bar_update_drink_status`(
    IN p_bot_id      BIGINT UNSIGNED,
    IN p_bot_item_id BIGINT UNSIGNED,
    IN p_new_status  VARCHAR(20),       -- 'mixing', 'ready', 'served', 'cancelled'
    IN p_user_id     BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_order_item_id BIGINT UNSIGNED;
    DECLARE v_pending_in_bot INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Bar KDS Update Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    START TRANSACTION;
        -- 1. Update BOT Line Item
        UPDATE bar_bot_items
        SET item_status = p_new_status
        WHERE bot_item_id = p_bot_item_id;

        -- 2. Reflect on order_items table
        SELECT order_item_id INTO v_order_item_id FROM bar_bot_items WHERE bot_item_id = p_bot_item_id;
        IF v_order_item_id IS NOT NULL THEN
            UPDATE order_items 
            SET item_status = IF(p_new_status = 'mixing', 'cooking', p_new_status)
            WHERE order_item_id = v_order_item_id;
        END IF;

        -- 3. Check if all drinks on this BOT are completed
        SELECT COUNT(*) INTO v_pending_in_bot
        FROM bar_bot_items
        WHERE bot_id = p_bot_id AND item_status IN ('queued', 'mixing');

        IF v_pending_in_bot = 0 THEN
            UPDATE bar_order_tickets
            SET status       = IF(p_new_status = 'served', 'served', 'ready'),
                completed_at = NOW()
            WHERE bot_id = p_bot_id;
        ELSE
            UPDATE bar_order_tickets SET status = 'mixing' WHERE bot_id = p_bot_id;
        END IF;
    COMMIT;

    SELECT 'SUCCESS' AS status, 200 AS status_code, CONCAT('Drink status updated to ', p_new_status) AS message, p_bot_item_id AS data_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CheckEmailExists` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CheckEmailExists`(IN p_email VARCHAR(100))
BEGIN
    SELECT COUNT(1) AS user_count
    FROM `users`
    WHERE LOWER(email) = LOWER(p_email) AND deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CheckInAttendance` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CheckInAttendance`(
    IN p_staff_id BIGINT,
    IN p_shift VARCHAR(50)
)
BEGIN
    INSERT INTO `attendances` (staff_id, check_in, status, shift)
    VALUES (p_staff_id, NOW(), 'PRESENT', p_shift);
    SELECT LAST_INSERT_ID() AS attendance_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CheckOutAttendance` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CheckOutAttendance`(
    IN p_attendance_id BIGINT,
    IN p_staff_id BIGINT
)
BEGIN
    UPDATE `attendances`
    SET check_out = NOW()
    WHERE (attendance_id = p_attendance_id OR (staff_id = p_staff_id AND check_out IS NULL))
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CheckUsernameExists` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CheckUsernameExists`(IN p_username VARCHAR(60))
BEGIN
    SELECT COUNT(1) AS user_count
    FROM `users`
    WHERE LOWER(user_name) = LOWER(p_username) AND deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateCustomer` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreateCustomer`(
    IN p_full_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_email VARCHAR(100),
    IN p_loyalty_points INT
)
BEGIN
    INSERT INTO `customers` (full_name, phone, email, loyalty_points, created_at, updated_at)
    VALUES (p_full_name, p_phone, p_email, p_loyalty_points, NOW(), NOW());
    SELECT LAST_INSERT_ID() AS customer_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateDeliveryOrder` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreateDeliveryOrder`(
    IN p_order_id BIGINT,
    IN p_customer_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_delivery_address VARCHAR(255)
)
BEGIN
    INSERT INTO `delivery_orders` (order_id, customer_name, phone, delivery_address, delivery_status, created_at)
    VALUES (p_order_id, p_customer_name, p_phone, p_delivery_address, 'DISPATCHED', NOW());
    SELECT LAST_INSERT_ID() AS delivery_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateIngredient` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreateIngredient`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateInvoice` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreateInvoice`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateKotOrder` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreateKotOrder`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateKotOrderItem` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreateKotOrderItem`(
    IN p_order_id BIGINT,
    IN p_menu_item_id BIGINT,
    IN p_dish_name VARCHAR(150),
    IN p_quantity INT,
    IN p_item_status VARCHAR(30)
)
BEGIN
    INSERT INTO `kot_order_items` (order_id, menu_item_id, dish_name, quantity, item_status, created_at, updated_at)
    VALUES (p_order_id, p_menu_item_id, p_dish_name, p_quantity, p_item_status, NOW(), NOW());
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateMenuCategory` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreateMenuCategory`(
    IN p_id CHAR(36),
    IN p_name VARCHAR(100),
    IN p_display_order INT
)
BEGIN
    INSERT INTO `menu_categories` (id, name, display_order)
    VALUES (p_id, p_name, p_display_order);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateMenuItem` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreateMenuItem`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreatePasswordResetToken` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreatePasswordResetToken`(
    IN p_user_id BIGINT,
    IN p_otp_hash VARCHAR(255),
    IN p_expires_at DATETIME
)
BEGIN
    INSERT INTO `password_reset_tokens` (user_id, otp_hash, expires_at, attempts, created_at)
    VALUES (p_user_id, p_otp_hash, p_expires_at, 0, NOW());
    SELECT LAST_INSERT_ID() AS reset_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreatePromotion` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreatePromotion`(
    IN p_code VARCHAR(50),
    IN p_discount_percentage DECIMAL(18,2),
    IN p_flat_discount DECIMAL(18,2),
    IN p_valid_until DATETIME
)
BEGIN
    INSERT INTO `promotions` (code, discount_percentage, flat_discount, valid_until, is_active)
    VALUES (UPPER(p_code), p_discount_percentage, p_flat_discount, p_valid_until, 1);
    SELECT LAST_INSERT_ID() AS promotion_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreatePurchaseOrder` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreatePurchaseOrder`(
    IN p_supplier_id BIGINT,
    IN p_po_number VARCHAR(50),
    IN p_total_amount DECIMAL(18,2)
)
BEGIN
    INSERT INTO `purchase_orders` (supplier_id, po_number, total_amount, status, created_at, updated_at)
    VALUES (p_supplier_id, p_po_number, p_total_amount, 'PENDING', NOW(), NOW());
    SELECT LAST_INSERT_ID() AS po_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateReservation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreateReservation`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateStaff` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreateStaff`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateSupplier` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreateSupplier`(
    IN p_supplier_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_email VARCHAR(100),
    IN p_address VARCHAR(255)
)
BEGIN
    INSERT INTO `suppliers` (supplier_name, phone, email, address, is_active, created_at)
    VALUES (p_supplier_name, p_phone, p_email, p_address, 1, NOW());
    SELECT LAST_INSERT_ID() AS supplier_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateTable` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreateTable`(
    IN p_table_name VARCHAR(50),
    IN p_section_area VARCHAR(50),
    IN p_capacity_chairs INT,
    IN p_assigned_server_id BIGINT
)
BEGIN
    INSERT INTO `restaurant_tables` (
        branch_id, table_number, table_name, capacity, capacity_chairs,
        location, section_area, occupied_chairs, status, assigned_server_id,
        created_at, updated_at
    )
    VALUES (
        1, TRIM(p_table_name), TRIM(p_table_name), COALESCE(p_capacity_chairs, 4), COALESCE(p_capacity_chairs, 4),
        COALESCE(p_section_area, 'Main Hall'), COALESCE(p_section_area, 'Main Hall'), 0, 'available', p_assigned_server_id,
        NOW(), NOW()
    );
    SELECT LAST_INSERT_ID() AS table_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateUser` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_CreateUser`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_customer_portal_login` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `sp_customer_portal_login`(

    IN p_identifier VARCHAR(120) -- Accepts Phone Number OR Email

)
proc_label: BEGIN

    DECLARE v_customer_id BIGINT UNSIGNED;

    DECLARE v_full_name VARCHAR(120);

    DECLARE v_phone VARCHAR(20);

    DECLARE v_email VARCHAR(120);

    DECLARE v_password_hash VARCHAR(255);

    DECLARE v_loyalty_points INT;

    DECLARE v_is_active TINYINT(1);

    DECLARE v_branch_id BIGINT UNSIGNED;
 
    SELECT 

        customer_id, full_name, phone, email, password_hash, loyalty_points, is_active, registered_branch_id

    INTO 

        v_customer_id, v_full_name, v_phone, v_email, v_password_hash, v_loyalty_points, v_is_active, v_branch_id

    FROM customers

    WHERE (phone = TRIM(p_identifier) OR email = TRIM(p_identifier))

      AND deleted_at IS NULL

    LIMIT 1;
 
    IF v_customer_id IS NULL THEN

        SELECT 'FAILED' AS status, 404 AS status_code, 'Customer account not found' AS message, 

               NULL AS customer_id, NULL AS full_name, NULL AS phone, NULL AS email, NULL AS loyalty_points, NULL AS password_hash, NULL AS registered_branch_id;

        LEAVE proc_label;

    END IF;
 
    IF v_is_active = 0 THEN

        SELECT 'FAILED' AS status, 403 AS status_code, 'Customer account is deactivated' AS message, 

               NULL AS customer_id, NULL AS full_name, NULL AS phone, NULL AS email, NULL AS loyalty_points, NULL AS password_hash, NULL AS registered_branch_id;

        LEAVE proc_label;

    END IF;
 
    -- Update customer's last login timestamp

    UPDATE customers 

    SET last_login = NOW() 

    WHERE customer_id = v_customer_id;
 
    SELECT 'SUCCESS' AS status, 200 AS status_code, 'Customer authenticated successfully' AS message,

           v_customer_id AS customer_id, v_full_name AS full_name, v_phone AS phone, v_email AS email,

           v_loyalty_points AS loyalty_points, v_password_hash AS password_hash, v_branch_id AS registered_branch_id;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_customer_portal_register` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `sp_customer_portal_register`(

    IN p_branch_id     BIGINT UNSIGNED,

    IN p_full_name     VARCHAR(120),

    IN p_phone         VARCHAR(20),

    IN p_email         VARCHAR(120),

    IN p_password_hash VARCHAR(255)

)
proc_label: BEGIN

    DECLARE v_customer_id BIGINT UNSIGNED;

    DECLARE v_exists INT DEFAULT 0;
 
    -- Basic input validation

    IF p_full_name IS NULL OR TRIM(p_full_name) = '' THEN

        SELECT 'FAILED' AS status, 400 AS status_code, 'Full name is required' AS message, NULL AS customer_id;

        LEAVE proc_label;

    END IF;
 
    IF p_phone IS NULL OR TRIM(p_phone) = '' THEN

        SELECT 'FAILED' AS status, 400 AS status_code, 'Phone number is required' AS message, NULL AS customer_id;

        LEAVE proc_label;

    END IF;
 
    IF p_password_hash IS NULL OR TRIM(p_password_hash) = '' THEN

        SELECT 'FAILED' AS status, 400 AS status_code, 'Password hash is required' AS message, NULL AS customer_id;

        LEAVE proc_label;

    END IF;
 
    -- Check if active customer already registered with this phone or email

    SELECT COUNT(*) INTO v_exists 

    FROM customers 

    WHERE (phone = TRIM(p_phone) OR (p_email IS NOT NULL AND email = TRIM(p_email))) 

      AND deleted_at IS NULL;
 
    IF v_exists > 0 THEN

        SELECT 'FAILED' AS status, 409 AS status_code, 'Phone number or email is already registered' AS message, NULL AS customer_id;

        LEAVE proc_label;

    END IF;
 
    START TRANSACTION;
 
    -- Insert directly into customers table (Table 12) - USERS TABLE IS NEVER TOUCHED

    INSERT INTO customers (

        full_name, 

        phone, 

        email, 

        password_hash, 

        registered_branch_id, 

        loyalty_points, 

        is_active

    ) VALUES (

        TRIM(p_full_name), 

        TRIM(p_phone), 

        TRIM(p_email), 

        p_password_hash, 

        p_branch_id, 

        0, 

        1

    );
 
    SET v_customer_id = LAST_INSERT_ID();
 
    COMMIT;
 
    SELECT 'SUCCESS' AS status, 201 AS status_code, 'Customer registered successfully' AS message, v_customer_id AS customer_id;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteCustomer` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_DeleteCustomer`(IN p_customer_id BIGINT)
BEGIN
    UPDATE `customers`
    SET is_active = 0, deleted_at = NOW(), updated_at = NOW()
    WHERE customer_id = p_customer_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteIngredient` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_DeleteIngredient`(IN p_id BIGINT)
BEGIN
    UPDATE ingredients 
    SET is_active = 0, deleted_at = NOW(), updated_at = NOW() 
    WHERE ingredient_id = p_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteInvoice` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_DeleteInvoice`(IN p_invoice_id BIGINT)
BEGIN
    UPDATE `invoices`
    SET status = 'VOID', payment_status = 'void', updated_at = NOW()
    WHERE invoice_id = p_invoice_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteKotOrder` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_DeleteKotOrder`(IN p_order_id BIGINT)
BEGIN
    UPDATE `kot_orders` SET deleted_at = NOW(), order_status = 'CANCELLED', updated_at = NOW() WHERE order_id = p_order_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteMenuCategory` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_DeleteMenuCategory`(IN p_name VARCHAR(100))
BEGIN
    DELETE FROM `menu_categories` WHERE LOWER(name) = LOWER(p_name);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteMenuItem` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_DeleteMenuItem`(IN p_menu_item_id BIGINT)
BEGIN
    UPDATE `menu_items`
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE menu_item_id = p_menu_item_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeletePromotion` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_DeletePromotion`(IN p_promotion_id BIGINT)
BEGIN
    UPDATE `promotions`
    SET is_active = 0
    WHERE promotion_id = p_promotion_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteReservation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_DeleteReservation`(IN p_reservation_id BIGINT)
BEGIN
    UPDATE `reservations`
    SET status = 'CANCELLED'
    WHERE reservation_id = p_reservation_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteStaff` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_DeleteStaff`(IN p_staff_id BIGINT)
BEGIN
    UPDATE `staff_persons` SET deleted_at = NOW(), updated_at = NOW() WHERE staff_id = p_staff_id;
    UPDATE `restaurant_tables` SET assigned_server_id = NULL WHERE assigned_server_id = p_staff_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteSupplier` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_DeleteSupplier`(IN p_supplier_id BIGINT)
BEGIN
    UPDATE `suppliers`
    SET is_active = 0, deleted_at = NOW(), updated_at = NOW()
    WHERE supplier_id = p_supplier_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteTable` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_DeleteTable`(IN p_table_id BIGINT)
BEGIN
    UPDATE `restaurant_tables` SET deleted_at = NOW(), updated_at = NOW() WHERE table_id = p_table_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteUser` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_DeleteUser`(IN p_user_id BIGINT)
BEGIN
    UPDATE `users`
    SET deleted_at = NOW(),
        is_active = 0,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_delivery_dispatch_order` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_delivery_dispatch_order`(
    IN p_order_id   BIGINT UNSIGNED,
    IN p_partner_id BIGINT UNSIGNED,   
    IN p_user_id    BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_otp VARCHAR(6);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Dispatch Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    
    SET v_otp = LPAD(FLOOR(RAND() * 900000) + 100000, 6, '0');

    START TRANSACTION;
        UPDATE delivery_orders
        SET partner_id   = p_partner_id,
            delivery_otp = v_otp,
            status       = 'on_the_way',
            assigned_at  = NOW()
        WHERE order_id = p_order_id;

        UPDATE orders SET status = 'served', updated_by = p_user_id WHERE order_id = p_order_id;
    COMMIT;

    SELECT 'SUCCESS' AS status, 200 AS status_code, 'Order dispatched for delivery' AS message, p_order_id AS order_id, v_otp AS customer_handshake_otp;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_delivery_verify_otp_and_complete` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_delivery_verify_otp_and_complete`(
    IN p_order_id    BIGINT UNSIGNED,
    IN p_entered_otp VARCHAR(6),
    IN p_user_id     BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_actual_otp VARCHAR(6);
    DECLARE v_delivery_id BIGINT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('OTP Verification Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    SELECT delivery_id, delivery_otp INTO v_delivery_id, v_actual_otp
    FROM delivery_orders WHERE order_id = p_order_id;

    IF v_delivery_id IS NULL THEN
        SELECT 'FAILED' AS status, 404 AS status_code, 'Delivery order not found' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

    IF v_actual_otp != TRIM(p_entered_otp) THEN
        SELECT 'FAILED' AS status, 401 AS status_code, 'Incorrect Delivery OTP entered' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

    START TRANSACTION;
        UPDATE delivery_orders
        SET status       = 'delivered',
            delivered_at = NOW()
        WHERE delivery_id = v_delivery_id;

        UPDATE orders
        SET status     = 'completed',
            updated_by = p_user_id
        WHERE order_id = p_order_id;
    COMMIT;

    SELECT 'SUCCESS' AS status, 200 AS status_code, 'Delivery completed successfully via OTP verification' AS message, p_order_id AS order_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_eod_cashier_shift_settlement` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eod_cashier_shift_settlement`(
    IN p_branch_id       BIGINT UNSIGNED,
    IN p_cashier_user_id BIGINT UNSIGNED,
    IN p_shift_date      DATE,
    IN p_physical_cash   DECIMAL(10,2)
)
BEGIN
    DECLARE v_date DATE;
    DECLARE v_expected_cash DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_cash_txns INT DEFAULT 0;
    DECLARE v_other_digital DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_variance DECIMAL(10,2) DEFAULT 0.00;

    SET v_date = COALESCE(p_shift_date, CURRENT_DATE());

    
    SELECT 
        COALESCE(SUM(amount_paid), 0.00),
        COUNT(payment_id)
    INTO v_expected_cash, v_cash_txns
    FROM invoice_payments ip
    JOIN invoices i ON ip.invoice_id = i.invoice_id
    WHERE i.branch_id = p_branch_id
      AND ip.received_by = p_cashier_user_id
      AND DATE(ip.paid_at) = v_date
      AND ip.payment_method = 'cash'
      AND ip.payment_status = 'success';

    
    SELECT COALESCE(SUM(amount_paid), 0.00) INTO v_other_digital
    FROM invoice_payments ip
    JOIN invoices i ON ip.invoice_id = i.invoice_id
    WHERE i.branch_id = p_branch_id
      AND ip.received_by = p_cashier_user_id
      AND DATE(ip.paid_at) = v_date
      AND ip.payment_method != 'cash'
      AND ip.payment_status = 'success';

    SET v_variance = p_physical_cash - v_expected_cash;

    SELECT 
        u.user_name AS cashier_username,
        v_date AS shift_date,
        v_cash_txns AS cash_bills_count,
        v_expected_cash AS expected_system_cash,
        p_physical_cash AS physical_cash_tendered,
        v_variance AS cash_drawer_discrepancy,
        CASE 
            WHEN v_variance = 0.00 THEN 'BALANCED'
            WHEN v_variance > 0.00 THEN 'SURPLUS / OVER'
            ELSE 'SHORTAGE / DEFICIT'
        END AS drawer_status,
        v_other_digital AS total_digital_collections;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_eod_settle_daily_register` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eod_settle_daily_register`(
    IN p_branch_id   BIGINT UNSIGNED,
    IN p_report_date DATE
)
BEGIN
    DECLARE v_date DATE;
    SET v_date = COALESCE(p_report_date, CURRENT_DATE());

    
    SELECT 
        b.branch_name,
        v_date AS business_date,
        COUNT(DISTINCT o.order_id) AS total_orders_placed,
        COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.order_id END) AS completed_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.order_id END) AS cancelled_orders,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.subtotal END), 0.00) AS gross_subtotal,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.discount_amt END), 0.00) AS total_discounts_given,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.tax_amt END), 0.00) AS total_tax_collected,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.packaging_charge END), 0.00) AS total_packaging_charges,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.service_charge_amt END), 0.00) AS total_service_charges,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.round_off END), 0.00) AS total_round_off,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amt END), 0.00) AS net_revenue
    FROM branches b
    LEFT JOIN orders o ON b.branch_id = o.branch_id AND DATE(o.order_time) = v_date
    WHERE b.branch_id = p_branch_id
    GROUP BY b.branch_id, b.branch_name;

    
    SELECT 
        ip.payment_method,
        COUNT(ip.payment_id) AS transaction_count,
        COALESCE(SUM(ip.amount_paid), 0.00) AS total_collected,
        COALESCE(SUM(ip.tip_amount), 0.00) AS total_tips
    FROM invoice_payments ip
    JOIN invoices i ON ip.invoice_id = i.invoice_id
    WHERE i.branch_id = p_branch_id 
      AND DATE(ip.paid_at) = v_date
      AND ip.payment_status = 'success'
    GROUP BY ip.payment_method;

    
    SELECT 
        oi.order_item_id,
        m.item_name,
        oi.quantity,
        oi.total_price AS lost_value,
        oi.special_notes AS void_reason,
        o.order_number
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    JOIN menu_items m ON oi.item_id = m.item_id
    WHERE o.branch_id = p_branch_id
      AND DATE(o.order_time) = v_date
      AND oi.item_status = 'cancelled';
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetActiveKotOrders` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetActiveKotOrders`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetActiveOrders` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetActiveOrders`()
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetActivePasswordResetToken` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetActivePasswordResetToken`(IN p_user_id BIGINT)
BEGIN
    SELECT reset_id, user_id, otp_hash, expires_at, verified_at, used_at, attempts, created_at
    FROM `password_reset_tokens`
    WHERE user_id = p_user_id AND used_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetAllRoles` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetAllRoles`()
BEGIN
    SELECT role_id, role_name, description, is_active, created_at, updated_at
    FROM `roles`
    WHERE is_active = 1 AND deleted_at IS NULL
    ORDER BY role_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetAttendances` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetAttendances`(IN p_staff_id BIGINT)
BEGIN
    SELECT attendance_id, staff_id, check_in, check_out, status, shift
    FROM `attendances`
    WHERE (p_staff_id IS NULL OR p_staff_id = 0 OR staff_id = p_staff_id)
    ORDER BY check_in DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetCategorySalesReport` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetCategorySalesReport`()
BEGIN
    SELECT 
        COALESCE(m.category, 'General') AS category_name,
        COUNT(oi.order_item_id) AS items_sold_count,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity,
        COALESCE(SUM(oi.total_price), SUM(oi.unit_price * oi.quantity), 0.00) AS total_revenue
    FROM order_items oi
    LEFT JOIN menu_items m ON oi.menu_item_id = m.menu_item_id
    GROUP BY COALESCE(m.category, 'General')
    ORDER BY total_revenue DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetCustomerById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetCustomerById`(IN p_customer_id BIGINT)
BEGIN
    SELECT customer_id, full_name, phone, email, loyalty_points, created_at, updated_at
    FROM `customers`
    WHERE customer_id = p_customer_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetCustomers` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetCustomers`(IN p_search VARCHAR(100))
BEGIN
    SELECT customer_id, full_name, phone, email, loyalty_points, created_at, updated_at
    FROM `customers`
    WHERE (p_search IS NULL OR p_search = '' OR LOWER(full_name) LIKE CONCAT('%', LOWER(p_search), '%') OR phone LIKE CONCAT('%', p_search, '%'))
    ORDER BY created_at DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetDailySalesReport` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetDailySalesReport`(IN p_days INT)
BEGIN
    DECLARE v_days INT DEFAULT 30;
    IF p_days IS NOT NULL AND p_days > 0 THEN
        SET v_days = p_days;
    END IF;

    SELECT 
        DATE(created_at) AS sale_date,
        COUNT(invoice_id) AS total_invoices,
        SUM(CASE WHEN UPPER(status) = 'PAID' THEN 1 ELSE 0 END) AS paid_invoices,
        COALESCE(SUM(subtotal), 0.00) AS subtotal,
        COALESCE(SUM(tax_amount), 0.00) AS tax_amount,
        COALESCE(SUM(discount_amount), 0.00) AS discount_amount,
        COALESCE(SUM(total_amount), 0.00) AS total_amount,
        COALESCE(SUM(paid_amount), 0.00) AS paid_amount
    FROM `invoices`
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL v_days DAY)
      AND UPPER(COALESCE(status, '')) NOT IN ('VOID', 'REFUNDED', 'CANCELLED')
    GROUP BY DATE(created_at)
    ORDER BY sale_date DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetDeliveryOrders` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetDeliveryOrders`(IN p_status VARCHAR(50))
BEGIN
    SELECT delivery_id, order_id, customer_name, phone, delivery_address, delivery_status, created_at
    FROM `delivery_orders`
    WHERE (p_status IS NULL OR p_status = '' OR UPPER(delivery_status) = UPPER(p_status))
    ORDER BY created_at DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetIngredientById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetIngredientById`(IN p_id BIGINT)
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
    WHERE ingredient_id = p_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetIngredients` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetIngredients`()
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetInventoryReport` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetInventoryReport`()
BEGIN
    SELECT 
        category,
        COUNT(ingredient_id) AS total_items,
        SUM(CASE WHEN current_stock <= minimum_threshold THEN 1 ELSE 0 END) AS low_stock_items,
        SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END) AS out_of_stock_items,
        COALESCE(SUM(current_stock * unit_cost), 0.00) AS total_inventory_valuation
    FROM ingredients
    WHERE deleted_at IS NULL
    GROUP BY category
    ORDER BY total_inventory_valuation DESC;

    SELECT 
        ingredient_id,
        name,
        category,
        supplier,
        unit,
        current_stock,
        minimum_threshold,
        unit_cost,
        (current_stock * unit_cost) AS stock_value,
        CASE 
            WHEN current_stock <= 0 THEN 'Out of Stock'
            WHEN current_stock <= minimum_threshold THEN 'Low Stock'
            ELSE 'Healthy'
        END AS stock_status
    FROM ingredients
    WHERE deleted_at IS NULL
    ORDER BY (current_stock - minimum_threshold) ASC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetInventoryTransactions` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetInventoryTransactions`(IN p_limit INT)
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetInvoiceById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetInvoiceById`(IN p_invoice_id BIGINT)
BEGIN
    SELECT invoice_id, order_id, invoice_number, subtotal, taxable_amount, tax_amount, discount_amount, total_amount, paid_amount, status, created_at, updated_at
    FROM `invoices`
    WHERE invoice_id = p_invoice_id;

    SELECT payment_id, invoice_id, amount, payment_mode, transaction_reference, paid_at
    FROM `invoice_payments`
    WHERE invoice_id = p_invoice_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetInvoices` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetInvoices`(IN p_status VARCHAR(20))
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetKotOrderById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetKotOrderById`(IN p_order_id BIGINT)
BEGIN
    SELECT order_id, table_id, table_name, section_area, server_name, order_status, order_received_at, created_at, updated_at
    FROM `kot_orders`
    WHERE order_id = p_order_id AND deleted_at IS NULL;

    SELECT order_item_id AS item_id, order_id, menu_item_id, dish_name, quantity, item_status
    FROM `kot_order_items`
    WHERE order_id = p_order_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetKotReport` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetKotReport`()
BEGIN
    SELECT 
        COUNT(1) AS total_tickets,
        SUM(CASE WHEN UPPER(order_status) = 'COMPLETED' OR UPPER(status) = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_tickets,
        SUM(CASE WHEN UPPER(order_status) IN ('PENDING', 'COOKING') OR UPPER(status) IN ('PENDING', 'COOKING') THEN 1 ELSE 0 END) AS active_tickets,
        COALESCE(SUM(total_items), 0) AS total_items_ordered,
        COALESCE(SUM(prepared_items), 0) AS total_items_prepared
    FROM kot_orders
    WHERE deleted_at IS NULL;

    SELECT 
        order_id,
        COALESCE(NULLIF(kot_number, ''), CONCAT('KOT-', order_id)) AS kot_number,
        table_name,
        section_area,
        server_name,
        order_status,
        total_items,
        prepared_items,
        created_at
    FROM kot_orders
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 20;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetKotSummary` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetKotSummary`()
BEGIN
    SELECT COUNT(1) AS total_tickets,
           SUM(CASE WHEN UPPER(order_status) = 'PENDING' THEN 1 ELSE 0 END) AS pending_tickets,
           SUM(CASE WHEN UPPER(order_status) = 'IN PREPARATION' THEN 1 ELSE 0 END) AS in_prep_tickets,
           SUM(CASE WHEN UPPER(order_status) IN ('PREPARATION COMPLETED', 'READY') THEN 1 ELSE 0 END) AS ready_tickets,
           SUM(CASE WHEN deleted_at IS NOT NULL OR UPPER(order_status) = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_tickets
    FROM `kot_orders`;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetLoginManagementSummary` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetLoginManagementSummary`()
BEGIN
    SELECT u.user_id, u.role_id, u.branch_id, u.user_name, u.full_name, u.email, u.phone,
           u.is_active, u.created_at, u.last_login,
           r.role_name
    FROM `users` u
    LEFT JOIN `roles` r ON u.role_id = r.role_id
    WHERE u.deleted_at IS NULL
    ORDER BY u.created_at DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetLowStockIngredients` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetLowStockIngredients`()
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetMenuCategories` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetMenuCategories`()
BEGIN
    SELECT DISTINCT category AS name FROM `menu_items` WHERE deleted_at IS NULL ORDER BY category;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetMenuItemById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetMenuItemById`(IN p_menu_item_id BIGINT)
BEGIN
    SELECT menu_item_id, dish_name, category, price, dietary_type, spice_level,
           prep_time_minutes, short_description, image_url, is_chefs_special, is_available,
           created_at, updated_at,
           serving_measure, drink_type, alcohol_pct, is_bar_item
    FROM `menu_items`
    WHERE menu_item_id = p_menu_item_id AND deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetMenuItems` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetMenuItems`(
    IN p_search VARCHAR(100),
    IN p_category VARCHAR(100),
    IN p_dietary_type VARCHAR(20)
)
BEGIN
    SELECT menu_item_id, dish_name, category, price, dietary_type, spice_level,
           prep_time_minutes, short_description, image_url, is_chefs_special, is_available,
           created_at, updated_at,
           serving_measure, drink_type, alcohol_pct, is_bar_item
    FROM `menu_items`
    WHERE deleted_at IS NULL
      AND (p_search IS NULL OR p_search = '' OR LOWER(dish_name) LIKE CONCAT('%', LOWER(p_search), '%') OR LOWER(category) LIKE CONCAT('%', LOWER(p_search), '%'))
      AND (p_category IS NULL OR p_category = '' OR LOWER(category) = LOWER(p_category))
      AND (p_dietary_type IS NULL OR p_dietary_type = '' OR LOWER(dietary_type) = LOWER(p_dietary_type))
    ORDER BY created_at DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetMonthlySalesReport` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetMonthlySalesReport`(IN p_year INT)
BEGIN
    DECLARE v_year INT;
    SET v_year = IFNULL(p_year, YEAR(CURDATE()));

    SELECT 
        DATE_FORMAT(created_at, '%Y-%m') AS sale_month,
        COUNT(invoice_id) AS total_invoices,
        SUM(CASE WHEN UPPER(status) = 'PAID' THEN 1 ELSE 0 END) AS paid_invoices,
        COALESCE(SUM(subtotal), 0.00) AS subtotal,
        COALESCE(SUM(tax_amount), 0.00) AS tax_amount,
        COALESCE(SUM(discount_amount), 0.00) AS discount_amount,
        COALESCE(SUM(total_amount), 0.00) AS total_amount,
        COALESCE(SUM(paid_amount), 0.00) AS paid_amount
    FROM `invoices`
    WHERE YEAR(created_at) = v_year
      AND UPPER(COALESCE(status, '')) NOT IN ('VOID', 'REFUNDED', 'CANCELLED')
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY sale_month DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetOrderByTable` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetOrderByTable`(IN p_table_id BIGINT)
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetOrderHistory` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetOrderHistory`()
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetPromotions` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetPromotions`()
BEGIN
    SELECT promotion_id, code, discount_percentage, flat_discount, valid_until, is_active
    FROM `promotions`
    WHERE is_active = 1
    ORDER BY valid_until DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetPurchaseOrders` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetPurchaseOrders`(IN p_status VARCHAR(50))
BEGIN
    SELECT po_id, supplier_id, po_number, total_amount, status, created_at, updated_at
    FROM `purchase_orders`
    WHERE (p_status IS NULL OR p_status = '' OR UPPER(status) = UPPER(p_status))
    ORDER BY created_at DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetReportsDashboardSummary` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetReportsDashboardSummary`()
BEGIN
    SELECT 
        COALESCE(NULLIF(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0.00 END), 0.00), 
                 SUM(total_amount), 0.00) AS today_revenue,
        COALESCE(NULLIF(COUNT(CASE WHEN UPPER(status) = 'PAID' AND DATE(created_at) = CURDATE() THEN 1 END), 0),
                 COUNT(CASE WHEN UPPER(status) = 'PAID' THEN 1 END), 0) AS today_settled_orders
    FROM invoices
    WHERE UPPER(status) = 'PAID';

    SELECT COALESCE(NULLIF(COUNT(CASE WHEN DATE(order_time) = CURDATE() THEN 1 END), 0), COUNT(1)) AS today_total_orders 
    FROM orders
    WHERE LOWER(COALESCE(status, '')) <> 'cancelled';

    SELECT COUNT(1) AS active_tables_count 
    FROM restaurant_tables 
    WHERE UPPER(status) IN ('OCCUPIED', 'BILLED', 'SEATED', 'BUSY') AND deleted_at IS NULL;

    SELECT 
        COALESCE(m.dish_name, oi.item_name) AS item_name,
        CAST(COALESCE(SUM(oi.quantity), 0) AS SIGNED) AS quantity_sold,
        COALESCE(SUM(oi.total_price), SUM(oi.unit_price * oi.quantity), 0.00) AS total_revenue
    FROM order_items oi
    LEFT JOIN menu_items m ON oi.menu_item_id = m.menu_item_id
    LEFT JOIN restaurant_orders ro ON oi.order_id = ro.order_id
    WHERE oi.is_deleted = 0
      AND LOWER(COALESCE(oi.item_status, '')) <> 'cancelled'
      AND (ro.order_id IS NULL OR (ro.is_deleted = 0 AND LOWER(COALESCE(ro.order_status, '')) <> 'cancelled'))
    GROUP BY COALESCE(m.dish_name, oi.item_name)
    ORDER BY quantity_sold DESC
    LIMIT 5;

    SELECT 
        UPPER(ip.payment_mode) AS payment_method,
        COALESCE(SUM(ip.amount), 0.00) AS total_amount
    FROM invoice_payments ip
    LEFT JOIN invoices inv ON ip.invoice_id = inv.invoice_id
    WHERE LOWER(COALESCE(ip.payment_status, 'success')) NOT IN ('failed', 'pending', 'cancelled', 'void', 'refunded')
      AND (inv.invoice_id IS NULL OR UPPER(COALESCE(inv.status, '')) NOT IN ('VOID', 'REFUNDED', 'CANCELLED'))
    GROUP BY UPPER(ip.payment_mode);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetReservations` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetReservations`(IN p_status VARCHAR(20))
BEGIN
    SELECT reservation_id, customer_id, customer_name, phone, table_id, guests_count, reservation_time, status, created_at
    FROM `reservations`
    WHERE (p_status IS NULL OR p_status = '' OR UPPER(status) = UPPER(p_status))
    ORDER BY reservation_time DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetRoleById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetRoleById`(IN p_role_id BIGINT)
BEGIN
    SELECT role_id, role_name, description, is_active
    FROM `roles`
    WHERE role_id = p_role_id AND deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetRoleByName` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetRoleByName`(IN p_role_name VARCHAR(50))
BEGIN
    SELECT role_id, role_name, description, is_active
    FROM `roles`
    WHERE LOWER(role_name) = LOWER(p_role_name) AND is_active = 1 AND deleted_at IS NULL
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetSpecialMenuItems` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetSpecialMenuItems`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetStaffById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetStaffById`(IN p_staff_id BIGINT)
BEGIN
    SELECT s.staff_id, s.full_name, s.role_title, s.phone, s.shift, s.is_active, s.created_at,
           COUNT(t.table_id) AS assigned_tables_count
    FROM `staff_persons` s
    LEFT JOIN `restaurant_tables` t ON t.assigned_server_id = s.staff_id AND t.deleted_at IS NULL
    WHERE s.staff_id = p_staff_id AND s.deleted_at IS NULL
    GROUP BY s.staff_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetStaffList` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetStaffList`()
BEGIN
    SELECT s.staff_id, s.full_name, s.role_title, s.phone, s.shift, s.is_active, s.created_at,
           COUNT(t.table_id) AS assigned_tables_count
    FROM `staff_persons` s
    LEFT JOIN `restaurant_tables` t ON t.assigned_server_id = s.staff_id AND t.deleted_at IS NULL
    WHERE s.deleted_at IS NULL
    GROUP BY s.staff_id
    ORDER BY s.staff_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetSuppliers` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetSuppliers`()
BEGIN
    SELECT supplier_id, supplier_name, phone, email, address, is_active, created_at
    FROM `suppliers`
    WHERE is_active = 1
    ORDER BY supplier_name;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetTableById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetTableById`(IN p_table_id BIGINT)
BEGIN
    SELECT t.table_id, t.table_name, t.section_area, t.capacity_chairs, t.occupied_chairs, t.status,
           t.assigned_server_id, t.created_at,
           s.full_name AS server_name, s.role_title AS server_role
    FROM `restaurant_tables` t
    LEFT JOIN `staff_persons` s ON t.assigned_server_id = s.staff_id
    WHERE t.table_id = p_table_id AND t.deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetTables` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetTables`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetTableSummary` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetTableSummary`()
BEGIN
    SELECT COUNT(1) AS total_tables,
           COALESCE(SUM(capacity_chairs), 0) AS total_chairs,
           COALESCE(SUM(occupied_chairs), 0) AS occupied_chairs
    FROM `restaurant_tables`
    WHERE deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetUserByIdentifier` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetUserByIdentifier`(IN p_identifier VARCHAR(100))
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetUserByUsernameOrEmail` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetUserByUsernameOrEmail`(IN p_login_value VARCHAR(100))
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetUsers` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_GetUsers`()
BEGIN
    SELECT u.user_id, u.role_id, u.branch_id, u.user_name, u.password, u.password_hash,
           u.full_name, u.email, u.phone, u.pin_code, u.is_active, u.last_login,
           u.created_at, u.updated_at,
           r.role_name, r.description AS role_description
    FROM `users` u
    LEFT JOIN `roles` r ON u.role_id = r.role_id
    WHERE u.deleted_at IS NULL
    ORDER BY u.created_at DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_restaurant_settings` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_restaurant_settings`()
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_IncrementPasswordResetAttempts` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_IncrementPasswordResetAttempts`(IN p_reset_id BIGINT)
BEGIN
    UPDATE `password_reset_tokens`
    SET attempts = attempts + 1
    WHERE reset_id = p_reset_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_InvalidatePreviousPasswordResetTokens` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_InvalidatePreviousPasswordResetTokens`(IN p_user_id BIGINT)
BEGIN
    UPDATE `password_reset_tokens`
    SET used_at = NOW()
    WHERE user_id = p_user_id AND used_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_inventory_auto_deduct_order` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_inventory_auto_deduct_order`(
    IN p_order_id BIGINT UNSIGNED,
    IN p_user_id  BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_branch_id BIGINT UNSIGNED;
    DECLARE v_order_number VARCHAR(30);
    DECLARE done INT DEFAULT FALSE;
    
    
    DECLARE cur_ing_id BIGINT UNSIGNED;
    DECLARE cur_qty_to_deduct DECIMAL(12,3);
    DECLARE cur_unit_cost DECIMAL(10,2);
    DECLARE cur_curr_stock DECIMAL(12,3);
    DECLARE cur_new_stock DECIMAL(12,3);

    
    DECLARE cur_bom CURSOR FOR
        SELECT 
            ri.ingredient_id,
            SUM(ri.quantity * oi.quantity) AS total_required_qty,
            i.cost_per_unit,
            i.current_stock
        FROM order_items oi
        JOIN recipe_ingredients ri ON oi.item_id = ri.item_id
        JOIN ingredients i ON ri.ingredient_id = i.ingredient_id
        WHERE oi.order_id = p_order_id 
          AND oi.item_status != 'cancelled'
        GROUP BY ri.ingredient_id, i.cost_per_unit, i.current_stock;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('BOM Auto-Deduction Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    SELECT branch_id, order_number INTO v_branch_id, v_order_number FROM orders WHERE order_id = p_order_id;

    START TRANSACTION;
        OPEN cur_bom;

        read_loop: LOOP
            FETCH cur_bom INTO cur_ing_id, cur_qty_to_deduct, cur_unit_cost, cur_curr_stock;
            IF done THEN
                LEAVE read_loop;
            END IF;

            SET cur_new_stock = cur_curr_stock - cur_qty_to_deduct;

            
            UPDATE ingredients
            SET current_stock = cur_new_stock,
                updated_by    = p_user_id
            WHERE ingredient_id = cur_ing_id;

            
            INSERT INTO inventory_transactions (
                ingredient_id, branch_id, po_id, txn_type, quantity,
                unit_cost, balance_after, remarks, created_by, txn_date
            ) VALUES (
                cur_ing_id, v_branch_id, NULL, 'consumption', -cur_qty_to_deduct,
                cur_unit_cost, cur_new_stock, CONCAT('Auto-consumption for Order #', v_order_number), p_user_id, NOW()
            );

        END LOOP;

        CLOSE cur_bom;
    COMMIT;

    SELECT 'SUCCESS' AS status, 200 AS status_code, 'BOM inventory auto-deducted successfully' AS message, p_order_id AS order_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_inventory_manual_stock_adjustment` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_inventory_manual_stock_adjustment`(
    IN p_branch_id       BIGINT UNSIGNED,
    IN p_ingredient_id   BIGINT UNSIGNED,
    IN p_adjustment_qty  DECIMAL(12,3),     
    IN p_txn_type        VARCHAR(20),       
    IN p_reason          VARCHAR(255),
    IN p_user_id         BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_curr_stock DECIMAL(12,3);
    DECLARE v_unit_cost DECIMAL(10,2);
    DECLARE v_new_stock DECIMAL(12,3);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Stock Adjustment Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'Reason is mandatory for inventory adjustments' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

    START TRANSACTION;
        SELECT current_stock, cost_per_unit INTO v_curr_stock, v_unit_cost
        FROM ingredients WHERE ingredient_id = p_ingredient_id FOR UPDATE;

        SET v_new_stock = GREATEST(0.000, v_curr_stock + p_adjustment_qty);

        UPDATE ingredients
        SET current_stock = v_new_stock,
            updated_by    = p_user_id
        WHERE ingredient_id = p_ingredient_id;

        INSERT INTO inventory_transactions (
            ingredient_id, branch_id, po_id, txn_type, quantity,
            unit_cost, balance_after, remarks, created_by, txn_date
        ) VALUES (
            p_ingredient_id, p_branch_id, NULL, p_txn_type, p_adjustment_qty,
            v_unit_cost, v_new_stock, p_reason, p_user_id, NOW()
        );
    COMMIT;

    SELECT 'SUCCESS' AS status, 200 AS status_code, 'Inventory stock adjusted' AS message, p_ingredient_id AS ingredient_id, v_new_stock AS new_balance;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_inventory_receive_po_items` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_inventory_receive_po_items`(
    IN p_po_id              BIGINT UNSIGNED,
    IN p_received_items_json JSON,              
    IN p_user_id            BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_branch_id BIGINT UNSIGNED;
    DECLARE v_items_count INT DEFAULT 0;
    DECLARE v_idx INT DEFAULT 0;

    DECLARE v_poi_id BIGINT UNSIGNED;
    DECLARE v_ing_id BIGINT UNSIGNED;
    DECLARE v_recv_qty DECIMAL(12,3);
    DECLARE v_unit_cost DECIMAL(10,2);
    DECLARE v_batch VARCHAR(50);
    DECLARE v_expiry DATE;

    DECLARE v_curr_stock DECIMAL(12,3);
    DECLARE v_curr_cost DECIMAL(10,2);
    DECLARE v_new_stock DECIMAL(12,3);
    DECLARE v_weighted_cost DECIMAL(10,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('GRN Receiving Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    SELECT branch_id INTO v_branch_id FROM purchase_orders WHERE po_id = p_po_id;

    SET v_items_count = JSON_LENGTH(p_received_items_json);
    IF v_items_count IS NULL OR v_items_count = 0 THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'No received items provided' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

    START TRANSACTION;
        WHILE v_idx < v_items_count DO
            SET v_poi_id    = JSON_UNQUOTE(JSON_EXTRACT(p_received_items_json, CONCAT('$[', v_idx, '].po_item_id')));
            SET v_ing_id    = JSON_UNQUOTE(JSON_EXTRACT(p_received_items_json, CONCAT('$[', v_idx, '].ingredient_id')));
            SET v_recv_qty  = JSON_UNQUOTE(JSON_EXTRACT(p_received_items_json, CONCAT('$[', v_idx, '].received_qty')));
            SET v_unit_cost = JSON_UNQUOTE(JSON_EXTRACT(p_received_items_json, CONCAT('$[', v_idx, '].unit_cost')));
            SET v_batch     = JSON_UNQUOTE(JSON_EXTRACT(p_received_items_json, CONCAT('$[', v_idx, '].batch_number')));
            SET v_expiry    = JSON_UNQUOTE(JSON_EXTRACT(p_received_items_json, CONCAT('$[', v_idx, '].expiry_date')));

            
            UPDATE purchase_order_items
            SET batch_number = v_batch,
                expiry_date  = v_expiry
            WHERE po_item_id = v_poi_id;

            
            SELECT current_stock, cost_per_unit INTO v_curr_stock, v_curr_cost
            FROM ingredients WHERE ingredient_id = v_ing_id FOR UPDATE;

            SET v_new_stock = v_curr_stock + v_recv_qty;

            
            IF v_new_stock > 0 THEN
                SET v_weighted_cost = ROUND(((v_curr_stock * v_curr_cost) + (v_recv_qty * v_unit_cost)) / v_new_stock, 2);
            ELSE
                SET v_weighted_cost = v_unit_cost;
            END IF;

            
            UPDATE ingredients
            SET current_stock = v_new_stock,
                cost_per_unit = v_weighted_cost,
                updated_by    = p_user_id
            WHERE ingredient_id = v_ing_id;

            
            INSERT INTO inventory_transactions (
                ingredient_id, branch_id, po_id, txn_type, quantity,
                unit_cost, balance_after, remarks, created_by, txn_date
            ) VALUES (
                v_ing_id, v_branch_id, p_po_id, 'purchase', v_recv_qty,
                v_unit_cost, v_new_stock, CONCAT('GRN Inward from PO #', p_po_id, ' (Batch: ', COALESCE(v_batch, 'N/A'), ')'), p_user_id, NOW()
            );

            SET v_idx = v_idx + 1;
        END WHILE;

        
        UPDATE purchase_orders SET status = 'received', updated_by = p_user_id WHERE po_id = p_po_id;

    COMMIT;

    SELECT 'SUCCESS' AS status, 200 AS status_code, 'Goods received note processed and inventory stock updated' AS message, p_po_id AS po_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_kitchen_update_item_status` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_kitchen_update_item_status`(
    IN p_kot_id        BIGINT UNSIGNED,
    IN p_order_item_id BIGINT UNSIGNED,
    IN p_new_status    VARCHAR(20)
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
        UPDATE `order_items`
        SET item_status = v_new_status,
            updated_at = NOW()
        WHERE order_item_id = p_order_item_id;

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
END; ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_log_audit_trail` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_log_audit_trail`(
    IN p_user_id        BIGINT UNSIGNED,
    IN p_action         VARCHAR(50),
    IN p_table_name     VARCHAR(60),
    IN p_record_id      BIGINT UNSIGNED,
    IN p_old_value_json JSON,
    IN p_new_value_json JSON,
    IN p_ip_address     VARCHAR(45)
)
BEGIN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value, ip_address, created_at)
    VALUES (p_user_id, p_action, p_table_name, p_record_id, p_old_value_json, p_new_value_json, p_ip_address, NOW());
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_attendances` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_attendances`(
    IN p_action          VARCHAR(30),       
    IN p_employee_id     BIGINT UNSIGNED,
    IN p_branch_id       BIGINT UNSIGNED,
    IN p_attendance_date DATE,
    IN p_month           INT,               
    IN p_year            INT                
)
proc_label: BEGIN
    DECLARE v_att_id BIGINT UNSIGNED;
    DECLARE v_check_in DATETIME;
    DECLARE v_total_mins INT DEFAULT 0;
    DECLARE v_total_hours DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_overtime_mins INT DEFAULT 0;
    DECLARE v_error_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    
    IF p_action = 'CLOCK_IN' THEN
        SELECT attendance_id INTO v_att_id 
        FROM attendances 
        WHERE employee_id = p_employee_id AND attendance_date = COALESCE(p_attendance_date, CURRENT_DATE());

        IF v_att_id IS NOT NULL THEN
            SELECT 'FAILED' AS status, 409 AS status_code, 'Employee already checked in for today' AS message, v_att_id AS data_id;
            LEAVE proc_label;
        END IF;

        START TRANSACTION;
            INSERT INTO attendances (employee_id, branch_id, attendance_date, check_in, status)
            VALUES (p_employee_id, p_branch_id, COALESCE(p_attendance_date, CURRENT_DATE()), NOW(), 'present');
            SET @new_att_id = LAST_INSERT_ID();
        COMMIT;

        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Clock-in recorded successfully' AS message, @new_att_id AS data_id;

    
    ELSEIF p_action = 'CLOCK_OUT' THEN
        SELECT attendance_id, check_in INTO v_att_id, v_check_in
        FROM attendances
        WHERE employee_id = p_employee_id AND check_out IS NULL
        ORDER BY attendance_id DESC LIMIT 1;

        IF v_att_id IS NULL THEN
            SELECT 'FAILED' AS status, 404 AS status_code, 'No active Clock-In session found for employee' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;

        
        SET v_total_mins = TIMESTAMPDIFF(MINUTE, v_check_in, NOW());
        SET v_total_hours = ROUND(v_total_mins / 60.0, 2);

        
        IF v_total_mins > 480 THEN
            SET v_overtime_mins = v_total_mins - 480;
        END IF;

        START TRANSACTION;
            UPDATE attendances
            SET check_out        = NOW(),
                total_hours      = v_total_hours,
                overtime_minutes = v_overtime_mins,
                status           = IF(v_total_hours < 4.0, 'half_day', 'present')
            WHERE attendance_id = v_att_id;
        COMMIT;

        SELECT 'SUCCESS' AS status, 200 AS status_code, CONCAT('Clock-out recorded. Total Hours: ', v_total_hours) AS message, v_att_id AS data_id;

    
    ELSEIF p_action = 'GET_DAILY_ATTENDANCE' THEN
        SELECT a.*, e.employee_code, e.full_name, e.designation
        FROM attendances a
        JOIN employees e ON a.employee_id = e.employee_id
        WHERE a.attendance_date = COALESCE(p_attendance_date, CURRENT_DATE())
          AND (p_branch_id IS NULL OR a.branch_id = p_branch_id)
        ORDER BY a.check_in ASC;

    
    ELSEIF p_action = 'GET_EMPLOYEE_MONTHLY' THEN
        SELECT 
            attendance_date, check_in, check_out, total_hours, overtime_minutes, status
        FROM attendances
        WHERE employee_id = p_employee_id
          AND MONTH(attendance_date) = COALESCE(p_month, MONTH(CURRENT_DATE()))
          AND YEAR(attendance_date) = COALESCE(p_year, YEAR(CURRENT_DATE()))
        ORDER BY attendance_date ASC;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_bar_bottle_sizes` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_bar_bottle_sizes`(
    IN p_action          VARCHAR(30),       -- 'CREATE', 'GET_BY_BRAND', 'UPDATE', 'DELETE'
    IN p_size_id         BIGINT UNSIGNED,
    IN p_brand_id        BIGINT UNSIGNED,
    IN p_package_type    VARCHAR(20),       -- 'bottle', 'can', 'keg', 'cask'
    IN p_volume_ml       DECIMAL(10,2),     -- 750.00, 330.00, 30000.00
    IN p_standard_peg_ml INT,               -- 30, 60, 500
    IN p_barcode_ean     VARCHAR(50),
    IN p_cost_price      DECIMAL(10,2),
    IN p_mrp             DECIMAL(10,2)
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Bottle Size Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    -- CREATE
    IF p_action = 'CREATE' THEN
        START TRANSACTION;
            INSERT INTO bar_bottle_sizes (
                brand_id, package_type, volume_ml, standard_peg_ml,
                barcode_ean, cost_price, mrp, is_active
            ) VALUES (
                p_brand_id, COALESCE(p_package_type, 'bottle'), p_volume_ml, COALESCE(p_standard_peg_ml, 60),
                p_barcode_ean, COALESCE(p_cost_price, 0.00), COALESCE(p_mrp, 0.00), 1
            );
            SET @new_size_id = LAST_INSERT_ID();
        COMMIT;
        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Bottle size registered' AS message, @new_size_id AS data_id;

    -- GET_BY_BRAND
    ELSEIF p_action = 'GET_BY_BRAND' THEN
        SELECT bbs.*, blb.brand_name, blb.liquor_category
        FROM bar_bottle_sizes bbs
        JOIN bar_liquor_brands blb ON bbs.brand_id = blb.brand_id
        WHERE bbs.brand_id = p_brand_id AND bbs.is_active = 1
        ORDER BY bbs.volume_ml ASC;

    -- UPDATE
    ELSEIF p_action = 'UPDATE' THEN
        START TRANSACTION;
            UPDATE bar_bottle_sizes
            SET package_type    = COALESCE(p_package_type, package_type),
                volume_ml       = COALESCE(p_volume_ml, volume_ml),
                standard_peg_ml = COALESCE(p_standard_peg_ml, standard_peg_ml),
                barcode_ean     = COALESCE(p_barcode_ean, barcode_ean),
                cost_price      = COALESCE(p_cost_price, cost_price),
                mrp             = COALESCE(p_mrp, mrp)
            WHERE size_id = p_size_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Bottle size configuration updated' AS message, p_size_id AS data_id;

    -- DELETE
    ELSEIF p_action = 'DELETE' THEN
        START TRANSACTION;
            DELETE FROM bar_bottle_sizes WHERE size_id = p_size_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Bottle size removed' AS message, p_size_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_bar_counters` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_bar_counters`(
    IN p_action          VARCHAR(30),       -- 'CREATE', 'GET_BY_ID', 'GET_BY_BRANCH', 'UPDATE', 'TOGGLE_STATUS', 'DELETE'
    IN p_bar_counter_id  BIGINT UNSIGNED,
    IN p_branch_id       BIGINT UNSIGNED,
    IN p_counter_name    VARCHAR(100),
    IN p_counter_code    VARCHAR(30),
    IN p_location        VARCHAR(100),
    IN p_printer_ip_name VARCHAR(100),
    IN p_user_id         BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_exists INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Bar Counter Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    -- CREATE
    IF p_action = 'CREATE' THEN
        SELECT COUNT(*) INTO v_exists 
        FROM bar_counters 
        WHERE branch_id = p_branch_id AND counter_code = TRIM(p_counter_code);

        IF v_exists > 0 THEN
            SELECT 'FAILED' AS status, 409 AS status_code, 'Bar counter code already exists in this branch' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;

        START TRANSACTION;
            INSERT INTO bar_counters (
                branch_id, counter_name, counter_code, location, printer_ip_name, is_active
            ) VALUES (
                p_branch_id, TRIM(p_counter_name), UPPER(TRIM(p_counter_code)), 
                COALESCE(p_location, 'Main Bar'), p_printer_ip_name, 1
            );
            SET @new_bar_id = LAST_INSERT_ID();
        COMMIT;

        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Bar counter created' AS message, @new_bar_id AS data_id;

    -- GET_BY_ID
    ELSEIF p_action = 'GET_BY_ID' THEN
        SELECT bc.*, b.branch_name
        FROM bar_counters bc
        JOIN branches b ON bc.branch_id = b.branch_id
        WHERE bc.bar_counter_id = p_bar_counter_id;

    -- GET_BY_BRANCH
    ELSEIF p_action = 'GET_BY_BRANCH' THEN
        SELECT bc.*, b.branch_name
        FROM bar_counters bc
        JOIN branches b ON bc.branch_id = b.branch_id
        WHERE bc.branch_id = p_branch_id
        ORDER BY bc.counter_name ASC;

    -- UPDATE
    ELSEIF p_action = 'UPDATE' THEN
        START TRANSACTION;
            UPDATE bar_counters
            SET counter_name    = COALESCE(p_counter_name, counter_name),
                counter_code    = COALESCE(UPPER(TRIM(p_counter_code)), counter_code),
                location        = COALESCE(p_location, location),
                printer_ip_name = COALESCE(p_printer_ip_name, printer_ip_name)
            WHERE bar_counter_id = p_bar_counter_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Bar counter updated' AS message, p_bar_counter_id AS data_id;

    -- TOGGLE_STATUS
    ELSEIF p_action = 'TOGGLE_STATUS' THEN
        START TRANSACTION;
            UPDATE bar_counters 
            SET is_active = IF(is_active = 1, 0, 1) 
            WHERE bar_counter_id = p_bar_counter_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Bar counter status toggled' AS message, p_bar_counter_id AS data_id;

    -- DELETE
    ELSEIF p_action = 'DELETE' THEN
        START TRANSACTION;
            DELETE FROM bar_counters WHERE bar_counter_id = p_bar_counter_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Bar counter removed' AS message, p_bar_counter_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_bar_happy_hours` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_bar_happy_hours`(
    IN p_action         VARCHAR(30),       -- 'CREATE', 'GET_BY_BRANCH', 'CHECK_ACTIVE_NOW', 'UPDATE', 'DELETE'
    IN p_happy_hour_id  BIGINT UNSIGNED,
    IN p_branch_id      BIGINT UNSIGNED,
    IN p_rule_name      VARCHAR(100),
    IN p_start_time     TIME,
    IN p_end_time       TIME,
    IN p_days_of_week   VARCHAR(30),       -- '1,2,3,4,5'
    IN p_offer_type     VARCHAR(20),       -- 'bogo', 'discount_percent', 'flat_price'
    IN p_discount_value DECIMAL(10,2)
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_day_of_week INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Happy Hour Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    -- CREATE
    IF p_action = 'CREATE' THEN
        START TRANSACTION;
            INSERT INTO bar_happy_hours (
                branch_id, rule_name, start_time, end_time,
                days_of_week, offer_type, discount_value, is_active
            ) VALUES (
                p_branch_id, TRIM(p_rule_name), p_start_time, p_end_time,
                COALESCE(p_days_of_week, '1,2,3,4,5,6,7'), COALESCE(p_offer_type, 'bogo'),
                COALESCE(p_discount_value, 0.00), 1
            );
            SET @new_hh_id = LAST_INSERT_ID();
        COMMIT;
        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Happy Hour rule created' AS message, @new_hh_id AS data_id;

    -- GET_BY_BRANCH
    ELSEIF p_action = 'GET_BY_BRANCH' THEN
        SELECT * FROM bar_happy_hours 
        WHERE branch_id = p_branch_id 
        ORDER BY start_time ASC;

    -- CHECK_ACTIVE_NOW (Real-time evaluation for current clock time & day of week)
    ELSEIF p_action = 'CHECK_ACTIVE_NOW' THEN
        -- MySQL WEEKDAY(): 0=Mon, 1=Tue ... 6=Sun -> Converted to 1-based index (1=Mon..7=Sun)
        SET v_day_of_week = WEEKDAY(CURRENT_DATE()) + 1;

        SELECT * FROM bar_happy_hours
        WHERE branch_id = p_branch_id
          AND is_active = 1
          AND CURRENT_TIME() BETWEEN start_time AND end_time
          AND FIND_IN_SET(v_day_of_week, days_of_week) > 0;

    -- UPDATE
    ELSEIF p_action = 'UPDATE' THEN
        START TRANSACTION;
            UPDATE bar_happy_hours
            SET rule_name      = COALESCE(p_rule_name, rule_name),
                start_time     = COALESCE(p_start_time, start_time),
                end_time       = COALESCE(p_end_time, end_time),
                days_of_week   = COALESCE(p_days_of_week, days_of_week),
                offer_type     = COALESCE(p_offer_type, offer_type),
                discount_value = COALESCE(p_discount_value, discount_value)
            WHERE happy_hour_id = p_happy_hour_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Happy Hour rule updated' AS message, p_happy_hour_id AS data_id;

    -- DELETE
    ELSEIF p_action = 'DELETE' THEN
        START TRANSACTION;
            DELETE FROM bar_happy_hours WHERE happy_hour_id = p_happy_hour_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Happy Hour rule removed' AS message, p_happy_hour_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_bar_liquor_brands` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_bar_liquor_brands`(
    IN p_action            VARCHAR(30),       -- 'CREATE', 'GET_BY_ID', 'GET_BY_CATEGORY', 'UPDATE', 'SOFT_DELETE'
    IN p_brand_id          BIGINT UNSIGNED,
    IN p_branch_id         BIGINT UNSIGNED,
    IN p_brand_name        VARCHAR(120),
    IN p_liquor_category   VARCHAR(30),       -- 'whisky', 'vodka', 'rum', 'gin', 'tequila', 'beer_bottled', 'beer_draught', 'wine_red', etc.
    IN p_origin_type       VARCHAR(30),       -- 'domestic', 'imported_imfl', 'imported_bio'
    IN p_alcohol_pct       DECIMAL(4,2),
    IN p_excise_brand_code VARCHAR(50),
    IN p_hsn_sac_code      VARCHAR(20),
    IN p_user_id           BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Liquor Brand Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    -- CREATE
    IF p_action = 'CREATE' THEN
        START TRANSACTION;
            INSERT INTO bar_liquor_brands (
                branch_id, brand_name, liquor_category, origin_type,
                alcohol_pct, excise_brand_code, hsn_sac_code, is_active
            ) VALUES (
                p_branch_id, TRIM(p_brand_name), p_liquor_category, COALESCE(p_origin_type, 'domestic'),
                COALESCE(p_alcohol_pct, 42.80), p_excise_brand_code, COALESCE(p_hsn_sac_code, '2208'), 1
            );
            SET @new_brand_id = LAST_INSERT_ID();
        COMMIT;
        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Liquor brand registered' AS message, @new_brand_id AS data_id;

    -- GET_BY_ID
    ELSEIF p_action = 'GET_BY_ID' THEN
        SELECT blb.*, b.branch_name
        FROM bar_liquor_brands blb
        JOIN branches b ON blb.branch_id = b.branch_id
        WHERE blb.brand_id = p_brand_id AND blb.deleted_at IS NULL;

    -- GET_BY_CATEGORY
    ELSEIF p_action = 'GET_BY_CATEGORY' THEN
        SELECT blb.*, b.branch_name
        FROM bar_liquor_brands blb
        JOIN branches b ON blb.branch_id = b.branch_id
        WHERE blb.branch_id = p_branch_id
          AND (p_liquor_category IS NULL OR blb.liquor_category = p_liquor_category)
          AND blb.deleted_at IS NULL
        ORDER BY blb.liquor_category, blb.brand_name ASC;

    -- UPDATE
    ELSEIF p_action = 'UPDATE' THEN
        START TRANSACTION;
            UPDATE bar_liquor_brands
            SET brand_name        = COALESCE(p_brand_name, brand_name),
                liquor_category   = COALESCE(p_liquor_category, liquor_category),
                origin_type       = COALESCE(p_origin_type, origin_type),
                alcohol_pct       = COALESCE(p_alcohol_pct, alcohol_pct),
                excise_brand_code = COALESCE(p_excise_brand_code, excise_brand_code),
                hsn_sac_code      = COALESCE(p_hsn_sac_code, hsn_sac_code)
            WHERE brand_id = p_brand_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Liquor brand updated' AS message, p_brand_id AS data_id;

    -- SOFT_DELETE
    ELSEIF p_action = 'SOFT_DELETE' THEN
        START TRANSACTION;
            UPDATE bar_liquor_brands SET deleted_at = NOW(), is_active = 0 WHERE brand_id = p_brand_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Liquor brand deactivated' AS message, p_brand_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_bar_tabs` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_bar_tabs`(
    IN p_action         VARCHAR(30),       -- 'OPEN_TAB', 'GET_ACTIVE_TABS', 'GET_TAB_DETAILS', 'CLOSE_TAB'
    IN p_tab_id         BIGINT UNSIGNED,
    IN p_branch_id      BIGINT UNSIGNED,
    IN p_bar_counter_id BIGINT UNSIGNED,
    IN p_tab_name       VARCHAR(120),
    IN p_customer_id    BIGINT UNSIGNED,
    IN p_opened_by      BIGINT UNSIGNED,   -- Employee ID
    IN p_preauth_amount DECIMAL(10,2),
    IN p_card_last4     VARCHAR(4)
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_order_number VARCHAR(30);
    DECLARE v_order_id BIGINT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Bar Tab Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    -- OPEN_TAB: Creates Tab & Auto-creates linked Order Shell
    IF p_action = 'OPEN_TAB' THEN
        SET v_order_number = CONCAT('TAB-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 9999), 4, '0'));

        START TRANSACTION;
            -- 1. Create underlying POS order for drinks
            INSERT INTO orders (
                order_number, branch_id, customer_id, waiter_id, table_id,
                order_type, status, subtotal, total_amt, notes, created_by
            ) VALUES (
                v_order_number, p_branch_id, p_customer_id, p_opened_by, NULL,
                'dine_in', 'pending', 0.00, 0.00, CONCAT('Running Bar Tab: ', p_tab_name), p_opened_by
            );
            SET v_order_id = LAST_INSERT_ID();

            -- 2. Create Bar Tab
            INSERT INTO bar_tabs (
                branch_id, bar_counter_id, tab_name, customer_id, opened_by,
                order_id, preauth_amount, card_last4, status, opened_at
            ) VALUES (
                p_branch_id, p_bar_counter_id, TRIM(p_tab_name), p_customer_id, p_opened_by,
                v_order_id, COALESCE(p_preauth_amount, 0.00), p_card_last4, 'open', NOW()
            );
            SET @new_tab_id = LAST_INSERT_ID();
        COMMIT;

        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Bar Tab opened' AS message, @new_tab_id AS tab_id, v_order_id AS order_id, v_order_number AS order_number;

    -- GET_ACTIVE_TABS
    ELSEIF p_action = 'GET_ACTIVE_TABS' THEN
        SELECT bt.*, bc.counter_name, c.full_name AS customer_name, c.phone AS customer_phone,
               o.total_amt AS current_running_bill, e.full_name AS bartender_name
        FROM bar_tabs bt
        JOIN bar_counters bc ON bt.bar_counter_id = bc.bar_counter_id
        JOIN orders o ON bt.order_id = o.order_id
        LEFT JOIN customers c ON bt.customer_id = c.customer_id
        JOIN employees e ON bt.opened_by = e.employee_id
        WHERE bt.branch_id = p_branch_id AND bt.status = 'open'
        ORDER BY bt.opened_at DESC;

    -- GET_TAB_DETAILS
    ELSEIF p_action = 'GET_TAB_DETAILS' THEN
        SELECT bt.*, o.order_number, o.subtotal, o.tax_amt, o.total_amt
        FROM bar_tabs bt
        JOIN orders o ON bt.order_id = o.order_id
        WHERE bt.tab_id = p_tab_id;

        -- Drinks ordered on this tab
        SELECT oi.*, m.item_name
        FROM bar_tabs bt
        JOIN order_items oi ON bt.order_id = oi.order_id
        JOIN menu_items m ON oi.item_id = m.item_id
        WHERE bt.tab_id = p_tab_id;

    -- CLOSE_TAB
    ELSEIF p_action = 'CLOSE_TAB' THEN
        START TRANSACTION;
            UPDATE bar_tabs 
            SET status    = 'closed', 
                closed_at = NOW() 
            WHERE tab_id = p_tab_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Bar Tab closed' AS message, p_tab_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_branches` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_branches`(
    IN p_action           VARCHAR(30),       
    IN p_branch_id        BIGINT UNSIGNED,
    IN p_branch_name      VARCHAR(150),
    IN p_address          VARCHAR(255),
    IN p_city             VARCHAR(80),
    IN p_state            VARCHAR(80),
    IN p_pincode          VARCHAR(10),
    IN p_phone            VARCHAR(20),
    IN p_email            VARCHAR(120),
    IN p_gstin_number     VARCHAR(20),
    IN p_fssai_license_no VARCHAR(20),
    IN p_currency_code    VARCHAR(5),
    IN p_opening_time     TIME,
    IN p_closing_time     TIME,
    IN p_page             INT,               
    IN p_page_size        INT,               
    IN p_search           VARCHAR(100),      
    IN p_user_id          BIGINT UNSIGNED    
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_offset INT DEFAULT 0;
    DECLARE v_exists INT DEFAULT 0;
    DECLARE v_old_data JSON;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    
    IF p_page IS NULL OR p_page < 1 THEN SET p_page = 1; END IF;
    IF p_page_size IS NULL OR p_page_size < 1 THEN SET p_page_size = 20; END IF;
    SET v_offset = (p_page - 1) * p_page_size;

    
    
    
    IF p_action = 'CREATE' THEN
        IF p_branch_name IS NULL OR TRIM(p_branch_name) = '' THEN
            SELECT 'FAILED' AS status, 400 AS status_code, 'Branch name is required' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;

        START TRANSACTION;
            INSERT INTO branches (
                branch_name, address, city, state, pincode, phone, email,
                gstin_number, fssai_license_no, currency_code,
                opening_time, closing_time, is_active, created_by
            ) VALUES (
                TRIM(p_branch_name), p_address, p_city, p_state, p_pincode, p_phone, p_email,
                p_gstin_number, p_fssai_license_no, COALESCE(p_currency_code, 'INR'),
                p_opening_time, p_closing_time, 1, p_user_id
            );

            SET @new_id = LAST_INSERT_ID();

            
            INSERT INTO audit_logs (user_id, action, table_name, record_id, new_value)
            VALUES (p_user_id, 'CREATE_BRANCH', 'branches', @new_id, JSON_OBJECT('branch_name', p_branch_name, 'city', p_city));
        COMMIT;

        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Branch created successfully' AS message, @new_id AS data_id;

    
    
    
    ELSEIF p_action = 'GET_BY_ID' THEN
        SELECT * FROM branches WHERE branch_id = p_branch_id AND deleted_at IS NULL;

    
    
    
    ELSEIF p_action = 'GET_ALL' THEN
        SELECT 
            b.*,
            (SELECT COUNT(*) FROM branches WHERE deleted_at IS NULL 
             AND (p_search IS NULL OR branch_name LIKE CONCAT('%', p_search, '%') OR city LIKE CONCAT('%', p_search, '%'))) AS total_records
        FROM branches b
        WHERE b.deleted_at IS NULL
          AND (p_search IS NULL OR b.branch_name LIKE CONCAT('%', p_search, '%') OR b.city LIKE CONCAT('%', p_search, '%'))
        ORDER BY b.branch_id DESC
        LIMIT p_page_size OFFSET v_offset;

    
    
    
    ELSEIF p_action = 'UPDATE' THEN
        SELECT COUNT(*) INTO v_exists FROM branches WHERE branch_id = p_branch_id AND deleted_at IS NULL;
        IF v_exists = 0 THEN
            SELECT 'FAILED' AS status, 404 AS status_code, 'Branch not found' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;

        START TRANSACTION;
            SELECT JSON_OBJECT('branch_name', branch_name, 'phone', phone, 'email', email) INTO v_old_data FROM branches WHERE branch_id = p_branch_id;

            UPDATE branches
            SET branch_name       = COALESCE(p_branch_name, branch_name),
                address           = COALESCE(p_address, address),
                city              = COALESCE(p_city, city),
                state             = COALESCE(p_state, state),
                pincode           = COALESCE(p_pincode, pincode),
                phone             = COALESCE(p_phone, phone),
                email             = COALESCE(p_email, email),
                gstin_number      = COALESCE(p_gstin_number, gstin_number),
                fssai_license_no  = COALESCE(p_fssai_license_no, fssai_license_no),
                currency_code     = COALESCE(p_currency_code, currency_code),
                opening_time      = COALESCE(p_opening_time, opening_time),
                closing_time      = COALESCE(p_closing_time, closing_time),
                updated_by        = p_user_id
            WHERE branch_id = p_branch_id;

            INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value)
            VALUES (p_user_id, 'UPDATE_BRANCH', 'branches', p_branch_id, v_old_data, JSON_OBJECT('branch_name', p_branch_name, 'phone', p_phone));
        COMMIT;

        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Branch updated successfully' AS message, p_branch_id AS data_id;

    
    
    
    ELSEIF p_action = 'SOFT_DELETE' THEN
        START TRANSACTION;
            UPDATE branches SET deleted_at = NOW(), is_active = 0, updated_by = p_user_id WHERE branch_id = p_branch_id;
            INSERT INTO audit_logs (user_id, action, table_name, record_id)
            VALUES (p_user_id, 'SOFT_DELETE_BRANCH', 'branches', p_branch_id);
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Branch soft-deleted successfully' AS message, p_branch_id AS data_id;

    
    
    
    ELSEIF p_action = 'RESTORE' THEN
        START TRANSACTION;
            UPDATE branches SET deleted_at = NULL, is_active = 1, updated_by = p_user_id WHERE branch_id = p_branch_id;
            INSERT INTO audit_logs (user_id, action, table_name, record_id)
            VALUES (p_user_id, 'RESTORE_BRANCH', 'branches', p_branch_id);
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Branch restored successfully' AS message, p_branch_id AS data_id;

    
    
    
    ELSEIF p_action = 'TOGGLE_STATUS' THEN
        START TRANSACTION;
            UPDATE branches SET is_active = IF(is_active = 1, 0, 1), updated_by = p_user_id WHERE branch_id = p_branch_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Branch status toggled successfully' AS message, p_branch_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action specified' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_customers` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_customers`(
    IN p_action               VARCHAR(30),       
    IN p_customer_id          BIGINT UNSIGNED,
    IN p_full_name            VARCHAR(120),
    IN p_phone                VARCHAR(20),
    IN p_email                VARCHAR(120),
    IN p_gender               VARCHAR(10),
    IN p_dob                  DATE,
    IN p_anniversary_date     DATE,
    IN p_gstin                VARCHAR(20),
    IN p_address_line         VARCHAR(255),
    IN p_city                 VARCHAR(80),
    IN p_pincode              VARCHAR(10),
    IN p_points_delta         INT,               
    IN p_registered_branch_id BIGINT UNSIGNED,
    IN p_page                 INT,
    IN p_page_size            INT,
    IN p_search               VARCHAR(100),
    IN p_user_id              BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_cust_id BIGINT UNSIGNED;
    DECLARE v_offset INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_page IS NULL OR p_page < 1 THEN SET p_page = 1; END IF;
    IF p_page_size IS NULL OR p_page_size < 1 THEN SET p_page_size = 20; END IF;
    SET v_offset = (p_page - 1) * p_page_size;

    
    IF p_action = 'CREATE_OR_GET' THEN
        SELECT customer_id INTO v_cust_id 
        FROM customers 
        WHERE phone = TRIM(p_phone) AND deleted_at IS NULL LIMIT 1;

        IF v_cust_id IS NOT NULL THEN
            SELECT 'SUCCESS' AS status, 200 AS status_code, 'Existing customer fetched' AS message, v_cust_id AS data_id;
            SELECT * FROM customers WHERE customer_id = v_cust_id;
        ELSE
            START TRANSACTION;
                INSERT INTO customers (
                    full_name, phone, email, gender, dob, anniversary_date,
                    gstin, address_line, city, pincode, loyalty_points,
                    registered_branch_id, is_active, created_by
                ) VALUES (
                    TRIM(p_full_name), TRIM(p_phone), p_email, p_gender, p_dob, p_anniversary_date,
                    p_gstin, p_address_line, p_city, p_pincode, 0,
                    p_registered_branch_id, 1, p_user_id
                );
                SET @new_id = LAST_INSERT_ID();
            COMMIT;

            SELECT 'SUCCESS' AS status, 201 AS status_code, 'New customer registered' AS message, @new_id AS data_id;
            SELECT * FROM customers WHERE customer_id = @new_id;
        END IF;

    
    ELSEIF p_action = 'GET_BY_ID' THEN
        SELECT * FROM customers WHERE customer_id = p_customer_id AND deleted_at IS NULL;

    
    ELSEIF p_action = 'GET_ALL' THEN
        SELECT c.*,
            (SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL AND (p_search IS NULL OR full_name LIKE CONCAT('%', p_search, '%') OR phone LIKE CONCAT('%', p_search, '%'))) AS total_records
        FROM customers c
        WHERE c.deleted_at IS NULL
          AND (p_search IS NULL OR c.full_name LIKE CONCAT('%', p_search, '%') OR c.phone LIKE CONCAT('%', p_search, '%'))
        ORDER BY c.customer_id DESC
        LIMIT p_page_size OFFSET v_offset;

    
    ELSEIF p_action = 'UPDATE' THEN
        START TRANSACTION;
            UPDATE customers
            SET full_name        = COALESCE(p_full_name, full_name),
                email            = COALESCE(p_email, email),
                gender           = COALESCE(p_gender, gender),
                dob              = COALESCE(p_dob, dob),
                anniversary_date = COALESCE(p_anniversary_date, anniversary_date),
                gstin            = COALESCE(p_gstin, gstin),
                address_line     = COALESCE(p_address_line, address_line),
                city             = COALESCE(p_city, city),
                pincode          = COALESCE(p_pincode, pincode),
                updated_by       = p_user_id
            WHERE customer_id = p_customer_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Customer profile updated' AS message, p_customer_id AS data_id;

    
    ELSEIF p_action = 'ADJUST_LOYALTY' THEN
        START TRANSACTION;
            UPDATE customers
            SET loyalty_points = GREATEST(0, loyalty_points + p_points_delta),
                updated_by     = p_user_id
            WHERE customer_id = p_customer_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Loyalty points adjusted' AS message, p_customer_id AS data_id;

    
    ELSEIF p_action = 'SOFT_DELETE' THEN
        START TRANSACTION;
            UPDATE customers SET deleted_at = NOW(), is_active = 0, updated_by = p_user_id WHERE customer_id = p_customer_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Customer profile removed' AS message, p_customer_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_delivery_orders` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_delivery_orders`(
    IN p_action           VARCHAR(30),       
    IN p_delivery_id      BIGINT UNSIGNED,
    IN p_order_id         BIGINT UNSIGNED,
    IN p_partner_id       BIGINT UNSIGNED,   
    IN p_customer_id      BIGINT UNSIGNED,
    IN p_delivery_address VARCHAR(255),
    IN p_delivery_city    VARCHAR(80),
    IN p_delivery_pincode VARCHAR(10),
    IN p_delivery_phone   VARCHAR(20),
    IN p_driver_lat       DECIMAL(10,7),
    IN p_driver_lng       DECIMAL(10,7),
    IN p_delivery_fee     DECIMAL(10,2),
    IN p_status           VARCHAR(20)        
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_otp VARCHAR(6);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    
    IF p_action = 'ASSIGN_RIDER' THEN
        SET v_otp = LPAD(FLOOR(RAND() * 900000) + 100000, 6, '0');

        START TRANSACTION;
            INSERT INTO delivery_orders (
                order_id, partner_id, customer_id, delivery_address, delivery_city,
                delivery_pincode, delivery_phone, delivery_otp, delivery_fee, status, assigned_at
            ) VALUES (
                p_order_id, p_partner_id, p_customer_id, p_delivery_address, p_delivery_city,
                p_delivery_pincode, p_delivery_phone, v_otp, COALESCE(p_delivery_fee, 0.00), 'assigned', NOW()
            )
            ON DUPLICATE KEY UPDATE partner_id = p_partner_id, status = 'assigned';
            SET @del_id = LAST_INSERT_ID();
        COMMIT;

        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Rider assigned to order' AS message, @del_id AS data_id, v_otp AS generated_otp;

    
    ELSEIF p_action = 'UPDATE_LOCATION' THEN
        START TRANSACTION;
            UPDATE delivery_orders
            SET driver_latitude  = p_driver_lat,
                driver_longitude = p_driver_lng
            WHERE delivery_id = p_delivery_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Location synced' AS message, p_delivery_id AS data_id;

    
    ELSEIF p_action = 'UPDATE_STATUS' THEN
        START TRANSACTION;
            UPDATE delivery_orders
            SET status = p_status,
                delivered_at = IF(p_status = 'delivered', NOW(), delivered_at)
            WHERE delivery_id = p_delivery_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Delivery status updated' AS message, p_delivery_id AS data_id;

    
    ELSEIF p_action = 'GET_DELIVERY_DETAILS' THEN
        SELECT d.*, e.full_name AS rider_name, e.phone AS rider_phone, e.vehicle_number, o.order_number, o.total_amt
        FROM delivery_orders d
        LEFT JOIN employees e ON d.partner_id = e.employee_id
        JOIN orders o ON d.order_id = o.order_id
        WHERE d.order_id = p_order_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_employees` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_employees`(
    IN p_action               VARCHAR(30),       
    IN p_employee_id          BIGINT UNSIGNED,
    IN p_user_id              BIGINT UNSIGNED,   
    IN p_branch_id            BIGINT UNSIGNED,
    IN p_employee_code        VARCHAR(30),
    IN p_full_name            VARCHAR(120),
    IN p_phone                VARCHAR(20),
    IN p_email                VARCHAR(120),
    IN p_gender               VARCHAR(10),
    IN p_dob                  DATE,
    IN p_joining_date         DATE,
    IN p_designation          VARCHAR(60),
    IN p_salary               DECIMAL(10,2),
    IN p_address              VARCHAR(255),
    IN p_is_delivery_partner  TINYINT(1),
    IN p_vehicle_number       VARCHAR(20),
    IN p_admin_id             BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_exists INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    
    IF p_action = 'CREATE' THEN
        SELECT COUNT(*) INTO v_exists FROM employees WHERE employee_code = p_employee_code AND deleted_at IS NULL;
        IF v_exists > 0 THEN
            SELECT 'FAILED' AS status, 409 AS status_code, 'Employee Code already exists' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;

        START TRANSACTION;
            INSERT INTO employees (
                user_id, branch_id, employee_code, full_name, phone, email,
                gender, dob, joining_date, designation, salary, address,
                is_delivery_partner, vehicle_number, is_available, is_active, created_by
            ) VALUES (
                p_user_id, p_branch_id, TRIM(p_employee_code), TRIM(p_full_name), p_phone, p_email,
                p_gender, p_dob, COALESCE(p_joining_date, CURRENT_DATE()), p_designation, p_salary, p_address,
                COALESCE(p_is_delivery_partner, 0), p_vehicle_number, 1, 1, p_admin_id
            );
            SET @new_emp_id = LAST_INSERT_ID();

            INSERT INTO audit_logs (user_id, action, table_name, record_id, new_value)
            VALUES (p_admin_id, 'CREATE_EMPLOYEE', 'employees', @new_emp_id, JSON_OBJECT('code', p_employee_code, 'name', p_full_name));
        COMMIT;

        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Employee profile created successfully' AS message, @new_emp_id AS data_id;

    
    ELSEIF p_action = 'GET_BY_ID' THEN
        SELECT e.*, b.branch_name, u.user_name, u.user_type
        FROM employees e
        JOIN branches b ON e.branch_id = b.branch_id
        LEFT JOIN users u ON e.user_id = u.user_id
        WHERE e.employee_id = p_employee_id AND e.deleted_at IS NULL;

    
    ELSEIF p_action = 'GET_ALL' THEN
        SELECT e.*, b.branch_name, u.user_name 
        FROM employees e
        JOIN branches b ON e.branch_id = b.branch_id
        LEFT JOIN users u ON e.user_id = u.user_id
        WHERE e.deleted_at IS NULL 
          AND (p_branch_id IS NULL OR e.branch_id = p_branch_id)
        ORDER BY e.employee_id DESC;

    
    ELSEIF p_action = 'UPDATE' THEN
        START TRANSACTION;
            UPDATE employees
            SET full_name           = COALESCE(p_full_name, full_name),
                phone               = COALESCE(p_phone, phone),
                email               = COALESCE(p_email, email),
                designation         = COALESCE(p_designation, designation),
                salary              = COALESCE(p_salary, salary),
                address             = COALESCE(p_address, address),
                is_delivery_partner = COALESCE(p_is_delivery_partner, is_delivery_partner),
                vehicle_number      = COALESCE(p_vehicle_number, vehicle_number),
                updated_by          = p_admin_id
            WHERE employee_id = p_employee_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Employee updated' AS message, p_employee_id AS data_id;

    
    ELSEIF p_action = 'TOGGLE_RIDER_AVAILABILITY' THEN
        START TRANSACTION;
            UPDATE employees SET is_available = IF(is_available = 1, 0, 1) WHERE employee_id = p_employee_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Rider availability updated' AS message, p_employee_id AS data_id;

    
    ELSEIF p_action = 'SOFT_DELETE' THEN
        START TRANSACTION;
            UPDATE employees SET deleted_at = NOW(), is_active = 0, updated_by = p_admin_id WHERE employee_id = p_employee_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Employee profile deactivated' AS message, p_employee_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_employee_shifts` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_employee_shifts`(
    IN p_action         VARCHAR(30),       
    IN p_emp_shift_id   BIGINT UNSIGNED,
    IN p_employee_id    BIGINT UNSIGNED,
    IN p_branch_id      BIGINT UNSIGNED,
    IN p_shift_name     VARCHAR(50),
    IN p_start_time     TIME,
    IN p_end_time       TIME,
    IN p_shift_date     DATE
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_action = 'ASSIGN_SHIFT' THEN
        START TRANSACTION;
            INSERT INTO employee_shifts (employee_id, branch_id, shift_name, start_time, end_time, shift_date)
            VALUES (p_employee_id, p_branch_id, TRIM(p_shift_name), p_start_time, p_end_time, p_shift_date)
            ON DUPLICATE KEY UPDATE start_time = p_start_time, end_time = p_end_time;
            SET @shift_id = LAST_INSERT_ID();
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Shift assigned successfully' AS message, @shift_id AS data_id;

    ELSEIF p_action = 'GET_DAILY_ROSTER' THEN
        SELECT es.*, e.employee_code, e.full_name, e.designation, b.branch_name
        FROM employee_shifts es
        JOIN employees e ON es.employee_id = e.employee_id
        JOIN branches b ON es.branch_id = b.branch_id
        WHERE es.shift_date = COALESCE(p_shift_date, CURRENT_DATE())
          AND (p_branch_id IS NULL OR es.branch_id = p_branch_id)
        ORDER BY es.start_time ASC;

    ELSEIF p_action = 'DELETE_SHIFT' THEN
        START TRANSACTION;
            DELETE FROM employee_shifts WHERE emp_shift_id = p_emp_shift_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Shift schedule removed' AS message, p_emp_shift_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_ingredients` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_ingredients`(
    IN p_action           VARCHAR(30),       
    IN p_ingredient_id    BIGINT UNSIGNED,
    IN p_branch_id        BIGINT UNSIGNED,
    IN p_ingredient_code  VARCHAR(30),
    IN p_ingredient_name  VARCHAR(100),
    IN p_unit             VARCHAR(10),       
    IN p_reorder_level    DECIMAL(12,3),
    IN p_cost_per_unit    DECIMAL(10,2),
    IN p_user_id          BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_action = 'CREATE' THEN
        START TRANSACTION;
            INSERT INTO ingredients (
                branch_id, ingredient_code, ingredient_name, unit,
                current_stock, reorder_level, cost_per_unit, is_active, created_by
            ) VALUES (
                p_branch_id, p_ingredient_code, TRIM(p_ingredient_name), p_unit,
                0.000, COALESCE(p_reorder_level, 0.000), COALESCE(p_cost_per_unit, 0.00), 1, p_user_id
            );
            SET @new_ing_id = LAST_INSERT_ID();
        COMMIT;
        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Ingredient registered' AS message, @new_ing_id AS data_id;

    ELSEIF p_action = 'GET_BY_ID' THEN
        SELECT * FROM ingredients WHERE ingredient_id = p_ingredient_id AND deleted_at IS NULL;

    ELSEIF p_action = 'GET_ALL' THEN
        SELECT i.*, b.branch_name,
               IF(i.current_stock <= i.reorder_level, 1, 0) AS is_low_stock
        FROM ingredients i
        JOIN branches b ON i.branch_id = b.branch_id
        WHERE i.branch_id = p_branch_id AND i.deleted_at IS NULL
        ORDER BY i.ingredient_name ASC;

    ELSEIF p_action = 'UPDATE' THEN
        START TRANSACTION;
            UPDATE ingredients
            SET ingredient_code = COALESCE(p_ingredient_code, ingredient_code),
                ingredient_name = COALESCE(p_ingredient_name, ingredient_name),
                unit            = COALESCE(p_unit, unit),
                reorder_level   = COALESCE(p_reorder_level, reorder_level),
                cost_per_unit   = COALESCE(p_cost_per_unit, cost_per_unit),
                updated_by      = p_user_id
            WHERE ingredient_id = p_ingredient_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Ingredient updated' AS message, p_ingredient_id AS data_id;

    ELSEIF p_action = 'SOFT_DELETE' THEN
        START TRANSACTION;
            UPDATE ingredients SET deleted_at = NOW(), is_active = 0, updated_by = p_user_id WHERE ingredient_id = p_ingredient_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Ingredient removed' AS message, p_ingredient_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_menu_categories` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_menu_categories`(
    IN p_action         VARCHAR(30),       
    IN p_category_id    BIGINT UNSIGNED,
    IN p_branch_id      BIGINT UNSIGNED,
    IN p_category_name  VARCHAR(80),
    IN p_display_order  INT
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_action = 'CREATE' THEN
        START TRANSACTION;
            INSERT INTO menu_categories (branch_id, category_name, display_order, is_active)
            VALUES (p_branch_id, TRIM(p_category_name), COALESCE(p_display_order, 0), 1);
            SET @new_cat_id = LAST_INSERT_ID();
        COMMIT;
        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Menu Category created' AS message, @new_cat_id AS data_id;

    ELSEIF p_action = 'GET_BY_BRANCH' THEN
        SELECT * FROM menu_categories
        WHERE branch_id = p_branch_id AND deleted_at IS NULL
        ORDER BY display_order ASC;

    ELSEIF p_action = 'UPDATE' THEN
        START TRANSACTION;
            UPDATE menu_categories
            SET category_name = COALESCE(p_category_name, category_name),
                display_order = COALESCE(p_display_order, display_order)
            WHERE category_id = p_category_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Category updated' AS message, p_category_id AS data_id;

    ELSEIF p_action = 'REORDER' THEN
        START TRANSACTION;
            UPDATE menu_categories SET display_order = p_display_order WHERE category_id = p_category_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Display sequence updated' AS message, p_category_id AS data_id;

    ELSEIF p_action = 'SOFT_DELETE' THEN
        START TRANSACTION;
            UPDATE menu_categories SET deleted_at = NOW(), is_active = 0 WHERE category_id = p_category_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Category removed' AS message, p_category_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_menu_items` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_menu_items`(
    IN p_action               VARCHAR(30),       
    IN p_item_id              BIGINT UNSIGNED,
    IN p_category_id          BIGINT UNSIGNED,
    IN p_sub_category_id      BIGINT UNSIGNED,
    IN p_branch_id            BIGINT UNSIGNED,
    IN p_item_code            VARCHAR(50),
    IN p_hsn_sac_code         VARCHAR(20),
    IN p_item_name            VARCHAR(120),
    IN p_description          VARCHAR(255),
    IN p_base_price           DECIMAL(10,2),
    IN p_tax_rate             DECIMAL(5,2),
    IN p_food_type            VARCHAR(20),       
    IN p_spice_level          VARCHAR(20),       
    IN p_is_chef_special      TINYINT(1),
    IN p_image_url            VARCHAR(255),
    IN p_prep_time_mins       INT,
    IN p_recipe_instructions  TEXT,
    IN p_page                 INT,
    IN p_page_size            INT,
    IN p_search               VARCHAR(100),
    IN p_user_id              BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_offset INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_page IS NULL OR p_page < 1 THEN SET p_page = 1; END IF;
    IF p_page_size IS NULL OR p_page_size < 1 THEN SET p_page_size = 50; END IF;
    SET v_offset = (p_page - 1) * p_page_size;

    
    IF p_action = 'CREATE' THEN
        START TRANSACTION;
            INSERT INTO menu_items (
                category_id, sub_category_id, branch_id, item_code, hsn_sac_code,
                item_name, description, base_price, tax_rate, food_type, spice_level,
                is_available, is_chef_special, image_url, prep_time_mins,
                recipe_instructions, is_active, created_by
            ) VALUES (
                p_category_id, p_sub_category_id, p_branch_id, p_item_code, COALESCE(p_hsn_sac_code, '996331'),
                TRIM(p_item_name), p_description, p_base_price, COALESCE(p_tax_rate, 5.00),
                COALESCE(p_food_type, 'veg'), COALESCE(p_spice_level, 'medium'),
                1, COALESCE(p_is_chef_special, 0), p_image_url, COALESCE(p_prep_time_mins, 15),
                p_recipe_instructions, 1, p_user_id
            );
            SET @new_item_id = LAST_INSERT_ID();

            INSERT INTO audit_logs (user_id, action, table_name, record_id, new_value)
            VALUES (p_user_id, 'CREATE_MENU_ITEM', 'menu_items', @new_item_id, JSON_OBJECT('name', p_item_name, 'price', p_base_price));
        COMMIT;

        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Menu item created successfully' AS message, @new_item_id AS data_id;

    
    ELSEIF p_action = 'GET_BY_ID' THEN
        SELECT m.*, c.category_name, sc.sub_category_name, b.branch_name
        FROM menu_items m
        JOIN menu_categories c ON m.category_id = c.category_id
        LEFT JOIN menu_sub_categories sc ON m.sub_category_id = sc.sub_category_id
        JOIN branches b ON m.branch_id = b.branch_id
        WHERE m.item_id = p_item_id AND m.deleted_at IS NULL;

    
    ELSEIF p_action = 'GET_ALL_POS' THEN
        SELECT 
            m.item_id, m.category_id, c.category_name, m.sub_category_id, sc.sub_category_name,
            m.item_code, m.item_name, m.base_price, m.tax_rate, m.food_type, m.spice_level,
            m.is_available, m.is_chef_special, m.image_url, m.prep_time_mins
        FROM menu_items m
        JOIN menu_categories c ON m.category_id = c.category_id
        LEFT JOIN menu_sub_categories sc ON m.sub_category_id = sc.sub_category_id
        WHERE m.branch_id = p_branch_id
          AND m.deleted_at IS NULL
          AND m.is_active = 1
          AND (p_category_id IS NULL OR m.category_id = p_category_id)
          AND (p_search IS NULL OR m.item_name LIKE CONCAT('%', p_search, '%') OR m.item_code LIKE CONCAT('%', p_search, '%'))
        ORDER BY c.display_order, m.item_name ASC
        LIMIT p_page_size OFFSET v_offset;

    
    ELSEIF p_action = 'UPDATE' THEN
        START TRANSACTION;
            UPDATE menu_items
            SET category_id         = COALESCE(p_category_id, category_id),
                sub_category_id     = COALESCE(p_sub_category_id, sub_category_id),
                item_code           = COALESCE(p_item_code, item_code),
                hsn_sac_code        = COALESCE(p_hsn_sac_code, hsn_sac_code),
                item_name           = COALESCE(p_item_name, item_name),
                description         = COALESCE(p_description, description),
                base_price          = COALESCE(p_base_price, base_price),
                tax_rate            = COALESCE(p_tax_rate, tax_rate),
                food_type           = COALESCE(p_food_type, food_type),
                spice_level         = COALESCE(p_spice_level, spice_level),
                is_chef_special     = COALESCE(p_is_chef_special, is_chef_special),
                image_url           = COALESCE(p_image_url, image_url),
                prep_time_mins      = COALESCE(p_prep_time_mins, prep_time_mins),
                recipe_instructions = COALESCE(p_recipe_instructions, recipe_instructions),
                updated_by          = p_user_id
            WHERE item_id = p_item_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Menu item updated' AS message, p_item_id AS data_id;

    
    ELSEIF p_action = 'TOGGLE_AVAILABILITY' THEN
        START TRANSACTION;
            UPDATE menu_items SET is_available = IF(is_available = 1, 0, 1), updated_by = p_user_id WHERE item_id = p_item_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Item availability toggled' AS message, p_item_id AS data_id;

    
    ELSEIF p_action = 'SOFT_DELETE' THEN
        START TRANSACTION;
            UPDATE menu_items SET deleted_at = NOW(), is_active = 0, updated_by = p_user_id WHERE item_id = p_item_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Menu item removed' AS message, p_item_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_menu_item_options` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_menu_item_options`(
    IN p_action       VARCHAR(30),       
    IN p_option_id    BIGINT UNSIGNED,
    IN p_item_id      BIGINT UNSIGNED,
    IN p_option_type  VARCHAR(20),       
    IN p_option_name  VARCHAR(80),
    IN p_price        DECIMAL(10,2)
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_action = 'CREATE' THEN
        START TRANSACTION;
            INSERT INTO menu_item_options (item_id, option_type, option_name, price)
            VALUES (p_item_id, p_option_type, TRIM(p_option_name), COALESCE(p_price, 0.00));
            SET @new_opt_id = LAST_INSERT_ID();
        COMMIT;
        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Option added to menu item' AS message, @new_opt_id AS data_id;

    ELSEIF p_action = 'GET_BY_ITEM' THEN
        SELECT * FROM menu_item_options WHERE item_id = p_item_id ORDER BY option_type, price ASC;

    ELSEIF p_action = 'UPDATE' THEN
        START TRANSACTION;
            UPDATE menu_item_options
            SET option_name = COALESCE(p_option_name, option_name),
                price       = COALESCE(p_price, price)
            WHERE option_id = p_option_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Option updated' AS message, p_option_id AS data_id;

    ELSEIF p_action = 'DELETE' THEN
        START TRANSACTION;
            DELETE FROM menu_item_options WHERE option_id = p_option_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Option removed' AS message, p_option_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_menu_sub_categories` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_menu_sub_categories`(
    IN p_action            VARCHAR(30),    
    IN p_sub_category_id   BIGINT UNSIGNED,
    IN p_category_id       BIGINT UNSIGNED,
    IN p_branch_id         BIGINT UNSIGNED,
    IN p_sub_category_name VARCHAR(80),
    IN p_display_order     INT
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_action = 'CREATE' THEN
        START TRANSACTION;
            INSERT INTO menu_sub_categories (category_id, branch_id, sub_category_name, display_order, is_active)
            VALUES (p_category_id, p_branch_id, TRIM(p_sub_category_name), COALESCE(p_display_order, 0), 1);
            SET @new_subcat_id = LAST_INSERT_ID();
        COMMIT;
        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Menu Sub-Category created' AS message, @new_subcat_id AS data_id;

    ELSEIF p_action = 'GET_BY_CATEGORY' THEN
        SELECT sc.*, c.category_name
        FROM menu_sub_categories sc
        JOIN menu_categories c ON sc.category_id = c.category_id
        WHERE sc.category_id = p_category_id AND sc.deleted_at IS NULL
        ORDER BY sc.display_order ASC;

    ELSEIF p_action = 'UPDATE' THEN
        START TRANSACTION;
            UPDATE menu_sub_categories
            SET sub_category_name = COALESCE(p_sub_category_name, sub_category_name),
                display_order     = COALESCE(p_display_order, display_order)
            WHERE sub_category_id = p_sub_category_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Sub-Category updated' AS message, p_sub_category_id AS data_id;

    ELSEIF p_action = 'SOFT_DELETE' THEN
        START TRANSACTION;
            UPDATE menu_sub_categories SET deleted_at = NOW(), is_active = 0 WHERE sub_category_id = p_sub_category_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Sub-Category removed' AS message, p_sub_category_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_permissions` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_permissions`(
    IN p_action          VARCHAR(30),       
    IN p_permission_id   BIGINT UNSIGNED,
    IN p_permission_name VARCHAR(100),
    IN p_module          VARCHAR(50),
    IN p_description     VARCHAR(255),
    IN p_role_id         BIGINT UNSIGNED,
    IN p_user_id         BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_action = 'CREATE_PERMISSION' THEN
        START TRANSACTION;
            INSERT INTO permissions (permission_name, module, description, is_active)
            VALUES (TRIM(p_permission_name), COALESCE(p_module, 'General'), p_description, 1);
            SET @new_perm_id = LAST_INSERT_ID();
        COMMIT;
        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Permission registered' AS message, @new_perm_id AS data_id;

    ELSEIF p_action = 'GET_ALL_CATALOG' THEN
        SELECT * FROM permissions WHERE is_active = 1 ORDER BY module, permission_name;

    ELSEIF p_action = 'ASSIGN_ROLE_PERMISSION' THEN
        START TRANSACTION;
            INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by)
            VALUES (p_role_id, p_permission_id, p_user_id);
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Permission assigned to role' AS message, p_permission_id AS data_id;

    ELSEIF p_action = 'REVOKE_ROLE_PERMISSION' THEN
        START TRANSACTION;
            DELETE FROM role_permissions WHERE role_id = p_role_id AND permission_id = p_permission_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Permission revoked from role' AS message, p_permission_id AS data_id;

    ELSEIF p_action = 'GET_ROLE_PERMISSIONS' THEN
        SELECT p.permission_id, p.permission_name, p.module, p.description, rp.granted_at
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE rp.role_id = p_role_id AND p.is_active = 1;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_promotions` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_promotions`(
    IN p_action             VARCHAR(30),       
    IN p_promo_id           BIGINT UNSIGNED,
    IN p_branch_id          BIGINT UNSIGNED,
    IN p_promo_type         VARCHAR(20),       
    IN p_code               VARCHAR(30),
    IN p_title              VARCHAR(120),
    IN p_description        VARCHAR(255),
    IN p_discount_type      VARCHAR(20),       
    IN p_discount_value     DECIMAL(10,2),
    IN p_min_order_amt      DECIMAL(10,2),
    IN p_max_discount_amt   DECIMAL(10,2),
    IN p_usage_limit_total  INT,
    IN p_usage_limit_per_user INT,
    IN p_valid_from         DATE,
    IN p_valid_to           DATE,
    IN p_order_amount       DECIMAL(10,2),     
    IN p_customer_id        BIGINT UNSIGNED,   
    IN p_user_id            BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_exists INT DEFAULT 0;
    DECLARE v_user_usage INT DEFAULT 0;
    DECLARE v_calc_discount DECIMAL(10,2) DEFAULT 0.00;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    
    IF p_action = 'CREATE' THEN
        IF p_promo_type = 'coupon' AND (p_code IS NULL OR TRIM(p_code) = '') THEN
            SELECT 'FAILED' AS status, 400 AS status_code, 'Promo code is required for coupon promotions' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;

        START TRANSACTION;
            INSERT INTO promotions (
                branch_id, promo_type, code, title, description, discount_type,
                discount_value, min_order_amt, max_discount_amt, usage_limit_total,
                usage_limit_per_user, times_used, valid_from, valid_to, is_active, created_by
            ) VALUES (
                p_branch_id, COALESCE(p_promo_type, 'coupon'), UPPER(TRIM(p_code)), TRIM(p_title),
                p_description, p_discount_type, p_discount_value, COALESCE(p_min_order_amt, 0.00),
                p_max_discount_amt, p_usage_limit_total, COALESCE(p_usage_limit_per_user, 1),
                0, p_valid_from, p_valid_to, 1, p_user_id
            );
            SET @new_promo_id = LAST_INSERT_ID();

            INSERT INTO audit_logs (user_id, action, table_name, record_id, new_value)
            VALUES (p_user_id, 'CREATE_PROMOTION', 'promotions', @new_promo_id, JSON_OBJECT('code', p_code, 'discount_value', p_discount_value));
        COMMIT;

        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Promotion created successfully' AS message, @new_promo_id AS data_id;

    
    ELSEIF p_action = 'GET_BY_ID' THEN
        SELECT * FROM promotions WHERE promo_id = p_promo_id AND deleted_at IS NULL;

    
    ELSEIF p_action = 'GET_ALL' THEN
        SELECT * FROM promotions 
        WHERE deleted_at IS NULL 
          AND (p_branch_id IS NULL OR branch_id = p_branch_id OR branch_id IS NULL)
        ORDER BY valid_to DESC;

    
    ELSEIF p_action = 'UPDATE' THEN
        START TRANSACTION;
            UPDATE promotions
            SET title                = COALESCE(p_title, title),
                description          = COALESCE(p_description, description),
                discount_value       = COALESCE(p_discount_value, discount_value),
                min_order_amt        = COALESCE(p_min_order_amt, min_order_amt),
                max_discount_amt     = COALESCE(p_max_discount_amt, max_discount_amt),
                usage_limit_total    = COALESCE(p_usage_limit_total, usage_limit_total),
                usage_limit_per_user = COALESCE(p_usage_limit_per_user, usage_limit_per_user),
                valid_from           = COALESCE(p_valid_from, valid_from),
                valid_to             = COALESCE(p_valid_to, valid_to),
                updated_by           = p_user_id
            WHERE promo_id = p_promo_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Promotion updated successfully' AS message, p_promo_id AS data_id;

    
    ELSEIF p_action = 'VALIDATE_PROMO' THEN
        SELECT p.* INTO @p_id, @p_branch, @p_type, @p_code, @p_title, @p_desc, @p_dtype, @p_dval, @p_min, @p_max, @p_lim_tot, @p_lim_usr, @p_used, @p_banner, @p_from, @p_to, @p_act, @p_del, @p_cat, @p_uat, @p_cby, @p_uby
        FROM promotions p
        WHERE p.code = UPPER(TRIM(p_code)) AND p.deleted_at IS NULL AND p.is_active = 1
        LIMIT 1;

        IF @p_id IS NULL THEN
            SELECT 'FAILED' AS status, 404 AS status_code, 'Invalid coupon code' AS message, 0.00 AS discount_amount, NULL AS promo_id;
            LEAVE proc_label;
        END IF;

        IF CURRENT_DATE() < @p_from OR CURRENT_DATE() > @p_to THEN
            SELECT 'FAILED' AS status, 400 AS status_code, 'Coupon has expired or is not yet active' AS message, 0.00 AS discount_amount, NULL AS promo_id;
            LEAVE proc_label;
        END IF;

        IF @p_branch IS NOT NULL AND @p_branch != p_branch_id THEN
            SELECT 'FAILED' AS status, 400 AS status_code, 'Coupon is not applicable to this branch' AS message, 0.00 AS discount_amount, NULL AS promo_id;
            LEAVE proc_label;
        END IF;

        IF p_order_amount < @p_min THEN
            SELECT 'FAILED' AS status, 400 AS status_code, CONCAT('Minimum order amount of Rs. ', @p_min, ' required') AS message, 0.00 AS discount_amount, NULL AS promo_id;
            LEAVE proc_label;
        END IF;

        IF @p_lim_tot IS NOT NULL AND @p_used >= @p_lim_tot THEN
            SELECT 'FAILED' AS status, 400 AS status_code, 'Coupon usage limit has been reached' AS message, 0.00 AS discount_amount, NULL AS promo_id;
            LEAVE proc_label;
        END IF;

        
        IF @p_dtype = 'percent' THEN
            SET v_calc_discount = (p_order_amount * @p_dval) / 100.00;
            IF @p_max IS NOT NULL AND v_calc_discount > @p_max THEN
                SET v_calc_discount = @p_max;
            END IF;
        ELSE
            SET v_calc_discount = @p_dval;
        END IF;

        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Coupon applied successfully' AS message, v_calc_discount AS discount_amount, @p_id AS promo_id;

    
    ELSEIF p_action = 'SOFT_DELETE' THEN
        START TRANSACTION;
            UPDATE promotions SET deleted_at = NOW(), is_active = 0, updated_by = p_user_id WHERE promo_id = p_promo_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Promotion deleted' AS message, p_promo_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_purchase_orders` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_purchase_orders`(
    IN p_action          VARCHAR(30),       
    IN p_po_id           BIGINT UNSIGNED,
    IN p_branch_id       BIGINT UNSIGNED,
    IN p_supplier_id     BIGINT UNSIGNED,
    IN p_expected_date   DATE,
    IN p_items_json      JSON,              
    IN p_user_id         BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_po_number VARCHAR(30);
    DECLARE v_items_count INT DEFAULT 0;
    DECLARE v_idx INT DEFAULT 0;
    DECLARE v_ing_id BIGINT UNSIGNED;
    DECLARE v_qty DECIMAL(12,3);
    DECLARE v_cost DECIMAL(10,2);
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_total_po_amount DECIMAL(10,2) DEFAULT 0.00;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    
    IF p_action = 'CREATE_PO' THEN
        SET v_items_count = JSON_LENGTH(p_items_json);
        IF v_items_count IS NULL OR v_items_count = 0 THEN
            SELECT 'FAILED' AS status, 400 AS status_code, 'At least one ingredient line item is required' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;

        
        SET v_po_number = CONCAT('PO-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 9999), 4, '0'));

        START TRANSACTION;
            INSERT INTO purchase_orders (
                po_number, supplier_id, branch_id, po_date, expected_date,
                total_amount, status, created_by
            ) VALUES (
                v_po_number, p_supplier_id, p_branch_id, CURRENT_DATE(), p_expected_date,
                0.00, 'pending', p_user_id
            );
            SET @new_po_id = LAST_INSERT_ID();

            
            WHILE v_idx < v_items_count DO
                SET v_ing_id   = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].ingredient_id')));
                SET v_qty      = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].qty')));
                SET v_cost     = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].unit_cost')));
                SET v_subtotal = ROUND(v_qty * v_cost, 2);
                SET v_total_po_amount = v_total_po_amount + v_subtotal;

                INSERT INTO purchase_order_items (po_id, ingredient_id, quantity, unit_price, subtotal)
                VALUES (@new_po_id, v_ing_id, v_qty, v_cost, v_subtotal);

                SET v_idx = v_idx + 1;
            END WHILE;

            
            UPDATE purchase_orders SET total_amount = v_total_po_amount WHERE po_id = @new_po_id;

            INSERT INTO audit_logs (user_id, action, table_name, record_id, new_value)
            VALUES (p_user_id, 'CREATE_PURCHASE_ORDER', 'purchase_orders', @new_po_id, JSON_OBJECT('po_number', v_po_number, 'amount', v_total_po_amount));
        COMMIT;

        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Purchase order drafted successfully' AS message, @new_po_id AS data_id;

    
    ELSEIF p_action = 'GET_PO_DETAILS' THEN
        
        SELECT po.*, s.supplier_name, s.phone AS supplier_phone, b.branch_name
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.supplier_id
        JOIN branches b ON po.branch_id = b.branch_id
        WHERE po.po_id = p_po_id;

        
        SELECT poi.*, i.ingredient_name, i.unit
        FROM purchase_order_items poi
        JOIN ingredients i ON poi.ingredient_id = i.ingredient_id
        WHERE poi.po_id = p_po_id;

    
    ELSEIF p_action = 'CANCEL_PO' THEN
        START TRANSACTION;
            UPDATE purchase_orders SET status = 'cancelled', updated_by = p_user_id WHERE po_id = p_po_id AND status = 'pending';
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Purchase order cancelled' AS message, p_po_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_recipe_ingredients` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_recipe_ingredients`(
    IN p_action         VARCHAR(30),       
    IN p_recipe_ing_id  BIGINT UNSIGNED,
    IN p_item_id        BIGINT UNSIGNED,
    IN p_ingredient_id  BIGINT UNSIGNED,
    IN p_quantity       DECIMAL(12,3)
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_action = 'SET_RECIPE_ITEM' THEN
        START TRANSACTION;
            INSERT INTO recipe_ingredients (item_id, ingredient_id, quantity)
            VALUES (p_item_id, p_ingredient_id, p_quantity)
            ON DUPLICATE KEY UPDATE quantity = p_quantity;
            SET @rec_id = LAST_INSERT_ID();
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Recipe BOM component mapped' AS message, @rec_id AS data_id;

    ELSEIF p_action = 'GET_RECIPE_BY_DISH' THEN
        SELECT ri.*, i.ingredient_name, i.unit, i.cost_per_unit,
               ROUND(ri.quantity * i.cost_per_unit, 2) AS component_cost
        FROM recipe_ingredients ri
        JOIN ingredients i ON ri.ingredient_id = i.ingredient_id
        WHERE ri.item_id = p_item_id;

    ELSEIF p_action = 'REMOVE_RECIPE_ITEM' THEN
        START TRANSACTION;
            DELETE FROM recipe_ingredients WHERE recipe_ing_id = p_recipe_ing_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Recipe component removed' AS message, p_recipe_ing_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_reservations` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_reservations`(
    IN p_action           VARCHAR(30),
    IN p_reservation_id   BIGINT UNSIGNED,
    IN p_customer_id      BIGINT UNSIGNED,
    IN p_table_id         BIGINT UNSIGNED,
    IN p_branch_id        BIGINT UNSIGNED,
    IN p_reservation_date DATE,
    IN p_reservation_time TIME,
    IN p_guests_count     INT,
    IN p_status           VARCHAR(20),
    IN p_notes            VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_conflict INT DEFAULT 0;
    DECLARE v_cust_name VARCHAR(100);
    DECLARE v_cust_phone VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_action = 'BOOK_TABLE' THEN
        SELECT COUNT(*) INTO v_conflict
        FROM reservations
        WHERE table_id = p_table_id
          AND reservation_date = p_reservation_date
          AND status IN ('booked', 'confirmed', 'seated')
          AND ABS(TIMESTAMPDIFF(MINUTE, reservation_time, p_reservation_time)) < 120;

        IF v_conflict > 0 THEN
            SELECT 'FAILED' AS status, 409 AS status_code, 'Table is already booked within this time slot' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;

        SELECT full_name, phone INTO v_cust_name, v_cust_phone
        FROM customers
        WHERE customer_id = p_customer_id
        LIMIT 1;

        START TRANSACTION;
            INSERT INTO reservations (
                customer_id, customer_name, phone, table_id, branch_id, reservation_date, reservation_time,
                guests_count, status, notes
            ) VALUES (
                p_customer_id, COALESCE(v_cust_name, 'Guest'), COALESCE(v_cust_phone, ''),
                p_table_id, COALESCE(p_branch_id, 1), p_reservation_date, p_reservation_time,
                p_guests_count, 'booked', p_notes
            );
            SET @new_res_id = LAST_INSERT_ID();

            UPDATE restaurant_tables SET status = 'reserved' WHERE table_id = p_table_id;
        COMMIT;

        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Table reservation booked' AS message, @new_res_id AS data_id;

    ELSEIF p_action IN ('GET_BY_BRANCH_DATE', 'GET_ALL') THEN
        SELECT r.*,
               COALESCE(c.full_name, r.customer_name) AS customer_name,
               COALESCE(c.phone, r.phone) AS customer_phone,
               COALESCE(t.table_number, CONCAT('T-', r.table_id)) AS table_number,
               COALESCE(t.location, 'Main Hall') AS location
        FROM reservations r
        LEFT JOIN customers c ON r.customer_id = c.customer_id
        LEFT JOIN restaurant_tables t ON r.table_id = t.table_id
        WHERE (p_branch_id IS NULL OR r.branch_id = p_branch_id)
          AND (p_action = 'GET_ALL' OR p_reservation_date IS NULL OR r.reservation_date = p_reservation_date)
        ORDER BY r.reservation_date DESC, r.reservation_time ASC;

    ELSEIF p_action = 'UPDATE_STATUS' THEN
        START TRANSACTION;
            UPDATE reservations SET status = p_status WHERE reservation_id = p_reservation_id;

            IF p_status = 'seated' THEN
                UPDATE restaurant_tables SET status = 'occupied' WHERE table_id = (SELECT table_id FROM reservations WHERE reservation_id = p_reservation_id);
            ELSEIF p_status IN ('cancelled', 'no_show') THEN
                UPDATE restaurant_tables SET status = 'available' WHERE table_id = (SELECT table_id FROM reservations WHERE reservation_id = p_reservation_id);
            END IF;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Reservation status updated' AS message, p_reservation_id AS data_id;

    ELSEIF p_action = 'CANCEL_RESERVATION' THEN
        START TRANSACTION;
            UPDATE reservations SET status = 'cancelled' WHERE reservation_id = p_reservation_id;
            UPDATE restaurant_tables SET status = 'available' WHERE table_id = (SELECT table_id FROM reservations WHERE reservation_id = p_reservation_id);
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Reservation cancelled' AS message, p_reservation_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_restaurant_tables` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_manage_restaurant_tables`(
    IN p_action             VARCHAR(30),
    IN p_table_id           BIGINT UNSIGNED,
    IN p_branch_id          BIGINT UNSIGNED,
    IN p_table_number       VARCHAR(50),
    IN p_capacity           INT,
    IN p_location           VARCHAR(50),
    IN p_qr_code_url        VARCHAR(255),
    IN p_status             VARCHAR(20),
    IN p_assigned_server_id BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_existing_active_id BIGINT UNSIGNED DEFAULT NULL;
    DECLARE v_existing_deleted_id BIGINT UNSIGNED DEFAULT NULL;
    DECLARE v_error_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR 1062
    BEGIN
        ROLLBACK;
        SELECT 'CONFLICT' AS status, 409 AS status_code, 'Table number already exists for this branch.' AS message, NULL AS data_id;
    END;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_action = 'CREATE' THEN
        SELECT table_id INTO v_existing_active_id
        FROM restaurant_tables
        WHERE branch_id = COALESCE(p_branch_id, 1)
          AND table_number = TRIM(p_table_number)
          AND deleted_at IS NULL
        LIMIT 1;

        IF v_existing_active_id IS NOT NULL THEN
            SELECT 'CONFLICT' AS status, 409 AS status_code, CONCAT('Table number ', TRIM(p_table_number), ' already exists for this branch.') AS message, v_existing_active_id AS data_id;
        ELSE
            SELECT table_id INTO v_existing_deleted_id
            FROM restaurant_tables
            WHERE branch_id = COALESCE(p_branch_id, 1)
              AND table_number = TRIM(p_table_number)
              AND deleted_at IS NOT NULL
            LIMIT 1;

            IF v_existing_deleted_id IS NOT NULL THEN
                START TRANSACTION;
                    UPDATE restaurant_tables
                    SET deleted_at = NULL,
                        table_name = TRIM(p_table_number),
                        capacity = COALESCE(p_capacity, 4),
                        capacity_chairs = COALESCE(p_capacity, 4),
                        location = COALESCE(p_location, 'Main Hall'),
                        section_area = COALESCE(p_location, 'Main Hall'),
                        qr_code_url = p_qr_code_url,
                        status = 'available',
                        assigned_server_id = p_assigned_server_id,
                        updated_at = NOW()
                    WHERE table_id = v_existing_deleted_id;
                COMMIT;
                SELECT 'SUCCESS' AS status, 201 AS status_code, 'Table added to floor layout' AS message, v_existing_deleted_id AS data_id;
            ELSE
                START TRANSACTION;
                    INSERT INTO restaurant_tables (
                        branch_id, table_number, table_name, capacity, capacity_chairs,
                        location, section_area, qr_code_url, status, assigned_server_id,
                        created_at, updated_at
                    )
                    VALUES (
                        COALESCE(p_branch_id, 1), TRIM(p_table_number), TRIM(p_table_number),
                        COALESCE(p_capacity, 4), COALESCE(p_capacity, 4),
                        COALESCE(p_location, 'Main Hall'), COALESCE(p_location, 'Main Hall'),
                        p_qr_code_url, 'available', p_assigned_server_id,
                        NOW(), NOW()
                    );
                    SET @new_tbl_id = LAST_INSERT_ID();
                COMMIT;
                SELECT 'SUCCESS' AS status, 201 AS status_code, 'Table added to floor layout' AS message, @new_tbl_id AS data_id;
            END IF;
        END IF;

    ELSEIF p_action = 'GET_BY_BRANCH' THEN
        SELECT t.*,
               sp.full_name AS server_name,
               sp.role_title AS server_role,
               (SELECT o.order_number FROM orders o WHERE o.table_id = t.table_id AND o.status IN ('pending', 'confirmed', 'preparing', 'ready', 'served') ORDER BY o.order_id DESC LIMIT 1) AS active_order_number
        FROM restaurant_tables t
        LEFT JOIN staff_persons sp ON t.assigned_server_id = sp.staff_id
        WHERE t.branch_id = COALESCE(p_branch_id, 1)
          AND t.deleted_at IS NULL
        ORDER BY t.location, t.table_number ASC;

    ELSEIF p_action = 'UPDATE_STATUS' THEN
        START TRANSACTION;
            UPDATE restaurant_tables SET status = p_status, updated_at = NOW() WHERE table_id = p_table_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Table status updated' AS message, p_table_id AS data_id;

    ELSEIF p_action = 'UPDATE_DETAILS' THEN
        IF p_table_number IS NOT NULL AND TRIM(p_table_number) != '' THEN
            SELECT table_id INTO v_existing_active_id
            FROM restaurant_tables
            WHERE branch_id = COALESCE(p_branch_id, 1)
              AND table_number = TRIM(p_table_number)
              AND table_id != p_table_id
              AND deleted_at IS NULL
            LIMIT 1;

            IF v_existing_active_id IS NOT NULL THEN
                SELECT 'CONFLICT' AS status, 409 AS status_code, CONCAT('Table number ', TRIM(p_table_number), ' already exists for another table in this branch.') AS message, NULL AS data_id;
                LEAVE proc_label;
            END IF;
        END IF;

        START TRANSACTION;
            UPDATE restaurant_tables
            SET table_number = COALESCE(TRIM(p_table_number), table_number),
                table_name   = COALESCE(TRIM(p_table_number), table_name),
                capacity     = COALESCE(p_capacity, capacity),
                capacity_chairs = COALESCE(p_capacity, capacity_chairs),
                location     = COALESCE(p_location, location),
                section_area = COALESCE(p_location, section_area),
                qr_code_url  = COALESCE(p_qr_code_url, qr_code_url),
                assigned_server_id = COALESCE(p_assigned_server_id, assigned_server_id),
                updated_at   = NOW()
            WHERE table_id = p_table_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Table layout updated' AS message, p_table_id AS data_id;

    ELSEIF p_action = 'DELETE' THEN
        START TRANSACTION;
            IF EXISTS (SELECT 1 FROM orders WHERE table_id = p_table_id) OR EXISTS (SELECT 1 FROM reservations WHERE table_id = p_table_id) THEN
                UPDATE restaurant_tables SET deleted_at = NOW(), status = 'inactive' WHERE table_id = p_table_id;
            ELSE
                DELETE FROM restaurant_tables WHERE table_id = p_table_id;
            END IF;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Table removed' AS message, p_table_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END; ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_roles` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_roles`(
    IN p_action       VARCHAR(30),
    IN p_role_id      BIGINT UNSIGNED,
    IN p_role_name    VARCHAR(50),
    IN p_description  VARCHAR(255),
    IN p_user_id      BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_exists INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_action = 'CREATE' THEN
        SELECT COUNT(*) INTO v_exists FROM roles WHERE role_name = p_role_name AND deleted_at IS NULL;
        IF v_exists > 0 THEN
            SELECT 'FAILED' AS status, 409 AS status_code, 'Role name already exists' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;

        START TRANSACTION;
            INSERT INTO roles (role_name, description, is_active, created_by)
            VALUES (TRIM(p_role_name), p_description, 1, p_user_id);
            SET @new_role_id = LAST_INSERT_ID();
        COMMIT;

        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Role created successfully' AS message, @new_role_id AS data_id;

    ELSEIF p_action = 'GET_BY_ID' THEN
        SELECT * FROM roles WHERE role_id = p_role_id AND deleted_at IS NULL;

    ELSEIF p_action = 'GET_ALL' THEN
        SELECT * FROM roles WHERE deleted_at IS NULL ORDER BY role_id ASC;

    ELSEIF p_action = 'UPDATE' THEN
        START TRANSACTION;
            UPDATE roles
            SET role_name   = COALESCE(p_role_name, role_name),
                description = COALESCE(p_description, description),
                updated_by  = p_user_id
            WHERE role_id = p_role_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Role updated successfully' AS message, p_role_id AS data_id;

    ELSEIF p_action = 'SOFT_DELETE' THEN
        START TRANSACTION;
            UPDATE roles SET deleted_at = NOW(), is_active = 0, updated_by = p_user_id WHERE role_id = p_role_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Role soft-deleted successfully' AS message, p_role_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_settings` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_settings`(
    IN p_action        VARCHAR(30),       
    IN p_branch_id     BIGINT UNSIGNED,
    IN p_setting_key   VARCHAR(80),
    IN p_setting_value VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_action = 'SET_CONFIG' THEN
        START TRANSACTION;
            INSERT INTO settings (branch_id, setting_key, setting_value)
            VALUES (p_branch_id, TRIM(p_setting_key), p_setting_value)
            ON DUPLICATE KEY UPDATE setting_value = p_setting_value;
            SET @set_id = LAST_INSERT_ID();
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Configuration saved' AS message, @set_id AS data_id;

    ELSEIF p_action = 'GET_CONFIG' THEN
        SELECT setting_value FROM settings 
        WHERE (branch_id = p_branch_id OR branch_id IS NULL) AND setting_key = p_setting_key
        ORDER BY branch_id DESC LIMIT 1;

    ELSEIF p_action = 'GET_ALL_BRANCH_CONFIGS' THEN
        SELECT * FROM settings WHERE branch_id = p_branch_id OR branch_id IS NULL;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_suppliers` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_suppliers`(
    IN p_action          VARCHAR(30),
    IN p_supplier_id     BIGINT UNSIGNED,
    IN p_branch_id       BIGINT UNSIGNED,
    IN p_supplier_name   VARCHAR(150),
    IN p_contact_person  VARCHAR(100),
    IN p_phone           VARCHAR(20),
    IN p_email           VARCHAR(120),
    IN p_address         VARCHAR(255),
    IN p_gst_number      VARCHAR(20),
    IN p_payment_terms   VARCHAR(100),
    IN p_user_id         BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_action = 'CREATE' THEN
        START TRANSACTION;
            INSERT INTO suppliers (
                branch_id, supplier_name, contact_person, phone, email,
                address, gst_number, payment_terms, is_active, created_by
            ) VALUES (
                p_branch_id, TRIM(p_supplier_name), p_contact_person, p_phone, p_email,
                p_address, p_gst_number, COALESCE(p_payment_terms, 'Net 30'), 1, p_user_id
            );
            SET @new_supp_id = LAST_INSERT_ID();
        COMMIT;
        SELECT 'SUCCESS' AS status, 201 AS status_code, 'Supplier registered successfully' AS message, @new_supp_id AS data_id;

    ELSEIF p_action = 'GET_BY_ID' THEN
        SELECT * FROM suppliers WHERE supplier_id = p_supplier_id AND deleted_at IS NULL;

    ELSEIF p_action = 'GET_ALL' THEN
        SELECT s.*, b.branch_name 
        FROM suppliers s
        JOIN branches b ON s.branch_id = b.branch_id
        WHERE s.deleted_at IS NULL AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
        ORDER BY s.supplier_name ASC;

    ELSEIF p_action = 'UPDATE' THEN
        START TRANSACTION;
            UPDATE suppliers
            SET supplier_name   = COALESCE(p_supplier_name, supplier_name),
                contact_person  = COALESCE(p_contact_person, contact_person),
                phone           = COALESCE(p_phone, phone),
                email           = COALESCE(p_email, email),
                address         = COALESCE(p_address, address),
                gst_number      = COALESCE(p_gst_number, gst_number),
                payment_terms   = COALESCE(p_payment_terms, payment_terms),
                updated_by      = p_user_id
            WHERE supplier_id = p_supplier_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Supplier details updated' AS message, p_supplier_id AS data_id;

    ELSEIF p_action = 'SOFT_DELETE' THEN
        START TRANSACTION;
            UPDATE suppliers SET deleted_at = NOW(), is_active = 0, updated_by = p_user_id WHERE supplier_id = p_supplier_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Supplier removed' AS message, p_supplier_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_manage_users` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_manage_users`(
    IN p_action         VARCHAR(30),       
    IN p_user_id        BIGINT UNSIGNED,
    IN p_role_id        BIGINT UNSIGNED,
    IN p_branch_id      BIGINT UNSIGNED,
    IN p_user_name      VARCHAR(60),
    IN p_password_hash  VARCHAR(255),
    IN p_email          VARCHAR(100),
    IN p_phone          VARCHAR(20),
    IN p_pin_code       VARCHAR(10),
    IN p_user_type      VARCHAR(20),
    IN p_page           INT,
    IN p_page_size      INT,
    IN p_search         VARCHAR(100),
    IN p_admin_id       BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_offset INT DEFAULT 0;
    DECLARE v_exists INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Database Error: ', v_error_msg) AS message, NULL AS data_id;
    END;

    IF p_page IS NULL OR p_page < 1 THEN SET p_page = 1; END IF;
    IF p_page_size IS NULL OR p_page_size < 1 THEN SET p_page_size = 20; END IF;
    SET v_offset = (p_page - 1) * p_page_size;

    
    IF p_action = 'CREATE' THEN
        SELECT COUNT(*) INTO v_exists FROM users WHERE (email = p_email OR user_name = p_user_name) AND deleted_at IS NULL;
        IF v_exists > 0 THEN
            SELECT 'FAILED' AS status, 409 AS status_code, 'Username or Email already registered' AS message, NULL AS data_id;
            LEAVE proc_label;
        END IF;

        START TRANSACTION;
            INSERT INTO users (
                role_id, branch_id, user_name, password_hash, email, phone,
                pin_code, user_type, is_active, created_by
            ) VALUES (
                p_role_id, p_branch_id, TRIM(p_user_name), p_password_hash, LOWER(TRIM(p_email)), p_phone,
                p_pin_code, COALESCE(p_user_type, 'cashier'), 1, p_admin_id
            );
            SET @new_user_id = LAST_INSERT_ID();

            INSERT INTO audit_logs (user_id, action, table_name, record_id, new_value)
            VALUES (p_admin_id, 'CREATE_USER', 'users', @new_user_id, JSON_OBJECT('user_name', p_user_name, 'email', p_email, 'role_id', p_role_id));
        COMMIT;

        SELECT 'SUCCESS' AS status, 201 AS status_code, 'User registered successfully' AS message, @new_user_id AS data_id;

    
    ELSEIF p_action = 'GET_BY_ID' THEN
        SELECT u.user_id, u.role_id, r.role_name, u.branch_id, b.branch_name, u.user_name, u.email, u.phone, u.pin_code, u.user_type, u.is_active, u.last_login, u.created_at
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
        LEFT JOIN branches b ON u.branch_id = b.branch_id
        WHERE u.user_id = p_user_id AND u.deleted_at IS NULL;

    
    ELSEIF p_action = 'GET_ALL' THEN
        SELECT 
            u.user_id, u.role_id, r.role_name, u.branch_id, b.branch_name, u.user_name, u.email, u.phone, u.user_type, u.is_active, u.last_login,
            (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND (p_search IS NULL OR user_name LIKE CONCAT('%', p_search, '%') OR email LIKE CONCAT('%', p_search, '%'))) AS total_records
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
        LEFT JOIN branches b ON u.branch_id = b.branch_id
        WHERE u.deleted_at IS NULL
          AND (p_branch_id IS NULL OR u.branch_id = p_branch_id)
          AND (p_search IS NULL OR u.user_name LIKE CONCAT('%', p_search, '%') OR u.email LIKE CONCAT('%', p_search, '%'))
        ORDER BY u.user_id DESC
        LIMIT p_page_size OFFSET v_offset;

    
    ELSEIF p_action = 'UPDATE' THEN
        START TRANSACTION;
            UPDATE users
            SET role_id    = COALESCE(p_role_id, role_id),
                branch_id  = COALESCE(p_branch_id, branch_id),
                phone      = COALESCE(p_phone, phone),
                pin_code   = COALESCE(p_pin_code, pin_code),
                user_type  = COALESCE(p_user_type, user_type),
                updated_by = p_admin_id
            WHERE user_id = p_user_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'User profile updated' AS message, p_user_id AS data_id;

    
    ELSEIF p_action = 'UPDATE_PASSWORD' THEN
        START TRANSACTION;
            UPDATE users SET password_hash = p_password_hash, updated_by = p_admin_id WHERE user_id = p_user_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Password updated successfully' AS message, p_user_id AS data_id;

    
    ELSEIF p_action = 'SOFT_DELETE' THEN
        START TRANSACTION;
            UPDATE users SET deleted_at = NOW(), is_active = 0, updated_by = p_admin_id WHERE user_id = p_user_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'User deactivated' AS message, p_user_id AS data_id;

    
    ELSEIF p_action = 'RESTORE' THEN
        START TRANSACTION;
            UPDATE users SET deleted_at = NULL, is_active = 1, updated_by = p_admin_id WHERE user_id = p_user_id;
        COMMIT;
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'User restored' AS message, p_user_id AS data_id;

    ELSE
        SELECT 'FAILED' AS status, 400 AS status_code, 'Invalid Action' AS message, NULL AS data_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_pos_apply_promotion` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_pos_apply_promotion`(
    IN p_order_id   BIGINT UNSIGNED,
    IN p_promo_code VARCHAR(30),
    IN p_user_id    BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_discount_amt DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_tax_amt DECIMAL(10,2);
    DECLARE v_pkg_charge DECIMAL(10,2);
    DECLARE v_svc_charge DECIMAL(10,2);
    DECLARE v_raw_total DECIMAL(10,2);
    DECLARE v_grand_total DECIMAL(10,2);
    DECLARE v_round_off DECIMAL(10,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Promo Application Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    SELECT subtotal, packaging_charge, service_charge_amt
    INTO v_subtotal, v_pkg_charge, v_svc_charge
    FROM orders WHERE order_id = p_order_id;

    
    SELECT promo_id, discount_type, discount_value, min_order_amt, max_discount_amt
    INTO @pr_id, @pr_type, @pr_val, @pr_min, @pr_max
    FROM promotions
    WHERE code = UPPER(TRIM(p_promo_code)) AND deleted_at IS NULL AND is_active = 1
      AND CURRENT_DATE() BETWEEN valid_from AND valid_to
    LIMIT 1;

    IF @pr_id IS NULL THEN
        SELECT 'FAILED' AS status, 404 AS status_code, 'Invalid or expired coupon' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

    IF v_subtotal < @pr_min THEN
        SELECT 'FAILED' AS status, 400 AS status_code, CONCAT('Minimum order of Rs. ', @pr_min, ' required') AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

    
    IF @pr_type = 'percent' THEN
        SET v_discount_amt = (v_subtotal * @pr_val) / 100.00;
        IF @pr_max IS NOT NULL AND v_discount_amt > @pr_max THEN
            SET v_discount_amt = @pr_max;
        END IF;
    ELSE
        SET v_discount_amt = @pr_val;
    END IF;

    SET v_tax_amt = ROUND(GREATEST(0.00, v_subtotal - v_discount_amt) * 0.05, 2);
    SET v_raw_total = (v_subtotal - v_discount_amt) + v_tax_amt + v_pkg_charge + v_svc_charge;
    SET v_grand_total = ROUND(v_raw_total, 0);
    SET v_round_off = v_grand_total - v_raw_total;

    START TRANSACTION;
        UPDATE orders
        SET promo_id     = @pr_id,
            discount_amt = v_discount_amt,
            tax_amt      = v_tax_amt,
            round_off    = v_round_off,
            total_amt    = v_grand_total,
            updated_by   = p_user_id
        WHERE order_id = p_order_id;

        UPDATE promotions SET times_used = times_used + 1 WHERE promo_id = @pr_id;
    COMMIT;

    SELECT 'SUCCESS' AS status, 200 AS status_code, 'Promotion applied successfully' AS message, v_discount_amt AS discount_applied, v_grand_total AS new_total;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_pos_cancel_void_order` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_pos_cancel_void_order`(
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

    IF p_cancel_reason IS NULL OR TRIM(p_cancel_reason) = '' THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'Cancellation reason is mandatory' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

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
        UPDATE `orders`
        SET status           = 'cancelled',
            cancelled_reason = p_cancel_reason,
            updated_by       = p_user_id,
            updated_at       = NOW()
        WHERE order_id = p_order_id;

        UPDATE `order_items` 
        SET item_status = 'cancelled', 
            updated_at = NOW() 
        WHERE order_id = p_order_id;

        UPDATE `kitchen_orders` 
        SET status = 'cancelled' 
        WHERE order_id = p_order_id;

        UPDATE `invoices` 
        SET payment_status = 'void',
            status = 'VOID',
            updated_at = NOW() 
        WHERE order_id = p_order_id;

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

        INSERT INTO `audit_logs` (user_id, action, table_name, record_id, new_value, created_at)
        VALUES (p_user_id, 'CANCEL_ORDER', 'orders', p_order_id, 
                JSON_OBJECT('reason', p_cancel_reason, 'cancelled_at', NOW()), 
                NOW());

    COMMIT;

    SELECT 'SUCCESS' AS status, 200 AS status_code, 'Order cancelled successfully and table released' AS message, p_order_id AS order_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_pos_create_complete_order` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_pos_create_complete_order`(
    IN p_branch_id          BIGINT UNSIGNED,
    IN p_customer_id        BIGINT UNSIGNED,
    IN p_waiter_id          BIGINT UNSIGNED,
    IN p_table_id           BIGINT UNSIGNED,
    IN p_promo_code         VARCHAR(50),
    IN p_order_type         VARCHAR(20),
    IN p_packaging_charge   DECIMAL(10,2),
    IN p_service_charge_pct DECIMAL(5,2),
    IN p_notes              VARCHAR(255),
    IN p_items_json         JSON,
    IN p_user_id            BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_order_number VARCHAR(30);
    DECLARE v_items_count INT DEFAULT 0;
    DECLARE v_idx INT DEFAULT 0;
    DECLARE v_addons_count INT DEFAULT 0;
    DECLARE v_aidx INT DEFAULT 0;

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

    DECLARE v_option_id BIGINT UNSIGNED;
    DECLARE v_addon_price DECIMAL(10,2);

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

    SET v_items_count = JSON_LENGTH(p_items_json);
    IF v_items_count IS NULL OR v_items_count = 0 THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'Order must contain at least one item' AS message, NULL AS order_id, NULL AS order_number, 0.00 AS total_amount;
        LEAVE proc_label;
    END IF;

    SET v_order_type = LOWER(TRIM(COALESCE(p_order_type, 'dine_in')));
    IF v_order_type NOT IN ('dine_in', 'takeaway', 'delivery') THEN
        IF v_order_type = 'dinein' OR v_order_type = 'dine-in' THEN
            SET v_order_type = 'dine_in';
        ELSE
            SET v_order_type = 'dine_in';
        END IF;
    END IF;

    SET v_order_number = CONCAT('ORD-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(1 + RAND() * 9998), 4, '0'));

    START TRANSACTION;
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

        WHILE v_idx < v_items_count DO
            SET v_item_id    = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].item_id')));
            SET v_variant_id = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].variant_id')));
            SET v_qty        = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].qty'))) AS SIGNED), 1);
            IF v_qty <= 0 THEN SET v_qty = 1; END IF;
            SET v_item_notes = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].notes')));
            SET v_is_comp    = COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].is_complimentary'))) AS SIGNED), 0);

            SET v_base_price = 0.00;
            SET v_dish_name = '';
            SELECT price, dish_name INTO v_base_price, v_dish_name 
            FROM `menu_items` 
            WHERE menu_item_id = v_item_id;

            IF v_dish_name IS NULL OR v_dish_name = '' THEN
                SET v_dish_name = CONCAT('Item #', v_item_id);
            END IF;

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

            INSERT INTO `order_items` (
                order_id, item_id, menu_item_id, item_name, variant_id, quantity, unit_price,
                total_price, is_complimentary, special_notes, item_status, branch_id, created_at
            ) VALUES (
                @new_order_id, v_item_id, v_item_id, v_dish_name, v_variant_id, v_qty, v_unit_price,
                v_line_total, v_is_comp, v_item_notes, 'queued', COALESCE(p_branch_id, 1), NOW()
            );
            SET v_new_oi_id = LAST_INSERT_ID();

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

        SET v_tax_amt = ROUND(GREATEST(0.00, v_subtotal - v_discount_amt) * 0.05, 2);

        IF p_service_charge_pct IS NOT NULL AND p_service_charge_pct > 0 THEN
            SET v_service_charge_amt = ROUND(v_subtotal * (p_service_charge_pct / 100.00), 2);
        END IF;

        SET v_raw_total = (v_subtotal - v_discount_amt) + v_tax_amt + COALESCE(p_packaging_charge, 0.00) + v_service_charge_amt;
        SET v_grand_total = ROUND(v_raw_total, 0);
        SET v_round_off = v_grand_total - v_raw_total;

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

        IF p_table_id IS NOT NULL THEN
            UPDATE `restaurant_tables` SET status = 'occupied', updated_at = NOW() WHERE table_id = p_table_id;
            UPDATE `dining_tables` SET status = 'Occupied', updated_at = NOW() WHERE dining_table_id = p_table_id;
        END IF;

        INSERT INTO `audit_logs` (user_id, action, table_name, record_id, new_value, created_at)
        VALUES (p_user_id, 'CREATE_ORDER', 'orders', @new_order_id, 
                JSON_OBJECT('order_number', v_order_number, 'total', v_grand_total, 'table_id', p_table_id, 'order_type', v_order_type), 
                NOW());

    COMMIT;

    SELECT 'SUCCESS' AS status, 201 AS status_code, 'Order created successfully' AS message, @new_order_id AS order_id, v_order_number AS order_number, v_grand_total AS total_amount;
END; ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_pos_generate_invoice` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_pos_generate_invoice`(
    IN p_order_id BIGINT UNSIGNED,
    IN p_user_id  BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_inv_number VARCHAR(30);
    DECLARE v_branch_id BIGINT UNSIGNED;
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_discount DECIMAL(10,2);
    DECLARE v_taxable_amt DECIMAL(10,2);
    DECLARE v_cgst DECIMAL(10,2);
    DECLARE v_sgst DECIMAL(10,2);
    DECLARE v_tax_amt DECIMAL(10,2);
    DECLARE v_svc_charge DECIMAL(10,2);
    DECLARE v_round_off DECIMAL(10,2);
    DECLARE v_total_amt DECIMAL(10,2);
    DECLARE v_existing_inv_id BIGINT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Invoice Generation Failed: ', v_error_msg) AS message, NULL AS invoice_id;
    END;

    
    SELECT invoice_id INTO v_existing_inv_id FROM invoices WHERE order_id = p_order_id;
    IF v_existing_inv_id IS NOT NULL THEN
        SELECT 'SUCCESS' AS status, 200 AS status_code, 'Invoice already exists' AS message, v_existing_inv_id AS invoice_id;
        SELECT * FROM invoices WHERE invoice_id = v_existing_inv_id;
        LEAVE proc_label;
    END IF;

    SELECT branch_id, subtotal, discount_amt, service_charge_amt, round_off, total_amt
    INTO v_branch_id, v_subtotal, v_discount, v_svc_charge, v_round_off, v_total_amt
    FROM orders WHERE order_id = p_order_id;

    SET v_taxable_amt = GREATEST(0.00, v_subtotal - v_discount);
    
    SET v_cgst = ROUND(v_taxable_amt * 0.025, 2);
    SET v_sgst = ROUND(v_taxable_amt * 0.025, 2);
    SET v_tax_amt = v_cgst + v_sgst;

    
    SET v_inv_number = CONCAT('INV-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 9999), 4, '0'));

    START TRANSACTION;
        INSERT INTO invoices (
            invoice_number, order_id, branch_id, tax_name, tax_percentage,
            taxable_amount, cgst_amount, sgst_amount, tax_amount,
            service_charge, round_off, total_amount, payment_status,
            invoice_date, created_by
        ) VALUES (
            v_inv_number, p_order_id, v_branch_id, 'GST', 5.00,
            v_taxable_amt, v_cgst, v_sgst, v_tax_amt,
            v_svc_charge, v_round_off, v_total_amt, 'pending',
            NOW(), p_user_id
        );
        SET @new_inv_id = LAST_INSERT_ID();
    COMMIT;

    
    SELECT 'SUCCESS' AS status, 201 AS status_code, 'Tax invoice generated' AS message, @new_inv_id AS invoice_id, v_inv_number AS invoice_number;

    
    SELECT i.*, b.branch_name, b.gstin_number AS branch_gstin, b.fssai_license_no, b.address AS branch_address, b.phone AS branch_phone,
           o.order_number, o.order_type, c.full_name AS customer_name, c.phone AS customer_phone, c.gstin AS customer_gstin
    FROM invoices i
    JOIN branches b ON i.branch_id = b.branch_id
    JOIN orders o ON i.order_id = o.order_id
    LEFT JOIN customers c ON o.customer_id = c.customer_id
    WHERE i.invoice_id = @new_inv_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_pos_generate_kot` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_pos_generate_kot`(
    IN p_order_id     BIGINT UNSIGNED,
    IN p_branch_id    BIGINT UNSIGNED,
    IN p_chef_id      BIGINT UNSIGNED,
    IN p_priority     VARCHAR(20),
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

    SELECT branch_id INTO v_branch_id FROM `orders` WHERE order_id = p_order_id;
    IF v_branch_id IS NULL THEN
        SELECT 'FAILED' AS status, 404 AS status_code, 'Order not found' AS message, NULL AS kot_id, NULL AS kot_number;
        LEAVE proc_label;
    END IF;

    SET v_branch_id = COALESCE(p_branch_id, v_branch_id, 1);

    SELECT COUNT(*) INTO v_unassigned_count 
    FROM `order_items` 
    WHERE order_id = p_order_id AND kot_id IS NULL AND item_status = 'queued';

    IF v_unassigned_count = 0 THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'No new items pending for KOT generation' AS message, NULL AS kot_id, NULL AS kot_number;
        LEAVE proc_label;
    END IF;

    SET v_priority = LOWER(TRIM(COALESCE(p_priority, 'normal')));
    IF v_priority NOT IN ('normal', 'high', 'urgent') THEN
        SET v_priority = 'normal';
    END IF;

    SELECT COALESCE(MAX(batch_number), 0) + 1 INTO v_batch FROM `kitchen_orders` WHERE order_id = p_order_id;

    SET v_kot_number = CONCAT('KOT-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(1 + RAND() * 9998), 4, '0'));

    START TRANSACTION;
        INSERT INTO `kitchen_orders` (
            kot_number, order_id, branch_id, chef_id, batch_number,
            status, priority, special_notes, created_at
        ) VALUES (
            v_kot_number, p_order_id, v_branch_id, p_chef_id, v_batch,
            'queued', v_priority, p_notes, NOW()
        );
        SET @new_kot_id = LAST_INSERT_ID();

        UPDATE `order_items`
        SET kot_id = @new_kot_id,
            updated_at = NOW()
        WHERE order_id = p_order_id AND kot_id IS NULL AND item_status = 'queued';

        UPDATE `orders` 
        SET status = 'preparing',
            updated_at = NOW() 
        WHERE order_id = p_order_id AND status IN ('pending', 'confirmed');
    COMMIT;

    SELECT 'SUCCESS' AS status, 201 AS status_code, 'KOT generated successfully' AS message, @new_kot_id AS kot_id, v_kot_number AS kot_number, v_batch AS batch_number;

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
END; ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_pos_settle_invoice_payment` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_pos_settle_invoice_payment`(
    IN p_invoice_id     BIGINT UNSIGNED,
    IN p_payments_json  JSON,              
    IN p_tip_amount     DECIMAL(10,2),
    IN p_received_by    BIGINT UNSIGNED    
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_order_id BIGINT UNSIGNED;
    DECLARE v_table_id BIGINT UNSIGNED;
    DECLARE v_customer_id BIGINT UNSIGNED;
    DECLARE v_invoice_total DECIMAL(10,2);
    DECLARE v_payments_count INT DEFAULT 0;
    DECLARE v_idx INT DEFAULT 0;
    DECLARE v_method VARCHAR(20);
    DECLARE v_amt DECIMAL(10,2);
    DECLARE v_ref VARCHAR(100);
    DECLARE v_total_paid DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_points_earned INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Payment Settlement Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    
    SELECT i.order_id, i.total_amount, o.table_id, o.customer_id
    INTO v_order_id, v_invoice_total, v_table_id, v_customer_id
    FROM invoices i
    JOIN orders o ON i.order_id = o.order_id
    WHERE i.invoice_id = p_invoice_id;

    IF v_order_id IS NULL THEN
        SELECT 'FAILED' AS status, 404 AS status_code, 'Invoice not found' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

    SET v_payments_count = JSON_LENGTH(p_payments_json);
    IF v_payments_count IS NULL OR v_payments_count = 0 THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'At least one payment method is required' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

    START TRANSACTION;
        
        WHILE v_idx < v_payments_count DO
            SET v_method = JSON_UNQUOTE(JSON_EXTRACT(p_payments_json, CONCAT('$[', v_idx, '].method')));
            SET v_amt    = JSON_UNQUOTE(JSON_EXTRACT(p_payments_json, CONCAT('$[', v_idx, '].amount')));
            SET v_ref    = JSON_UNQUOTE(JSON_EXTRACT(p_payments_json, CONCAT('$[', v_idx, '].ref')));
            SET v_total_paid = v_total_paid + v_amt;

            INSERT INTO invoice_payments (
                invoice_id, payment_method, amount_paid, tip_amount,
                txn_reference, payment_status, received_by, paid_at
            ) VALUES (
                p_invoice_id, v_method, v_amt, COALESCE(p_tip_amount, 0.00),
                v_ref, 'success', p_received_by, NOW()
            );

            SET v_idx = v_idx + 1;
        END WHILE;

        
        IF v_total_paid >= v_invoice_total THEN
            
            UPDATE invoices SET payment_status = 'paid' WHERE invoice_id = p_invoice_id;
            UPDATE orders SET status = 'completed', updated_by = p_received_by WHERE order_id = v_order_id;

            
            IF v_table_id IS NOT NULL THEN
                UPDATE restaurant_tables SET status = 'available' WHERE table_id = v_table_id;
            END IF;

            
            IF v_customer_id IS NOT NULL THEN
                SET v_points_earned = FLOOR(v_invoice_total / 100);
                UPDATE customers SET loyalty_points = loyalty_points + v_points_earned WHERE customer_id = v_customer_id;
            END IF;
        ELSE
            UPDATE invoices SET payment_status = 'partially_paid' WHERE invoice_id = p_invoice_id;
        END IF;

        
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_value)
        VALUES (p_received_by, 'SETTLE_PAYMENT', 'invoices', p_invoice_id, JSON_OBJECT('total_paid', v_total_paid, 'status', IF(v_total_paid >= v_invoice_total, 'PAID', 'PARTIAL')));

    COMMIT;

    SELECT 'SUCCESS' AS status, 200 AS status_code, 'Payment settled successfully' AS message, p_invoice_id AS invoice_id, v_total_paid AS total_paid, v_points_earned AS loyalty_points_earned;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_pos_void_order_item` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_pos_void_order_item`(
    IN p_order_item_id BIGINT UNSIGNED,
    IN p_void_reason   VARCHAR(255),
    IN p_user_id       BIGINT UNSIGNED
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_order_id BIGINT UNSIGNED;
    DECLARE v_table_id BIGINT UNSIGNED;
    DECLARE v_new_subtotal DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_discount_amt DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_tax_amt DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_pkg_charge DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_svc_charge DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_raw_total DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_grand_total DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_round_off DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_active_items_count INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Void Item Failed: ', v_error_msg) AS message, NULL AS data_id;
    END;

    
    IF p_void_reason IS NULL OR TRIM(p_void_reason) = '' THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'Void reason is mandatory for auditing' AS message, NULL AS data_id;
        LEAVE proc_label;
    END IF;

    SELECT order_id INTO v_order_id FROM order_items WHERE order_item_id = p_order_item_id;
    SELECT table_id, packaging_charge INTO v_table_id, v_pkg_charge FROM orders WHERE order_id = v_order_id;

    START TRANSACTION;
        
        UPDATE order_items
        SET item_status = 'cancelled',
            special_notes = CONCAT('VOIDED: ', p_void_reason)
        WHERE order_item_id = p_order_item_id;

        
        SELECT COALESCE(SUM(total_price), 0.00) INTO v_new_subtotal
        FROM order_items
        WHERE order_id = v_order_id AND item_status != 'cancelled' AND is_complimentary = 0;

        SELECT COUNT(*) INTO v_active_items_count
        FROM order_items
        WHERE order_id = v_order_id AND item_status != 'cancelled';

        IF v_active_items_count = 0 THEN
            
            UPDATE orders SET status = 'cancelled', cancelled_reason = p_void_reason, subtotal = 0, tax_amt = 0, total_amt = 0 WHERE order_id = v_order_id;
            IF v_table_id IS NOT NULL THEN
                UPDATE restaurant_tables SET status = 'available' WHERE table_id = v_table_id;
            END IF;
        ELSE
            
            SET v_tax_amt = ROUND(v_new_subtotal * 0.05, 2);
            SET v_raw_total = v_new_subtotal + v_tax_amt + v_pkg_charge;
            SET v_grand_total = ROUND(v_raw_total, 0);
            SET v_round_off = v_grand_total - v_raw_total;

            UPDATE orders
            SET subtotal  = v_new_subtotal,
                tax_amt   = v_tax_amt,
                round_off = v_round_off,
                total_amt = v_grand_total
            WHERE order_id = v_order_id;
        END IF;

        
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_value)
        VALUES (p_user_id, 'VOID_ORDER_ITEM', 'order_items', p_order_item_id, JSON_OBJECT('reason', p_void_reason, 'order_id', v_order_id));

    COMMIT;

    SELECT 'SUCCESS' AS status, 200 AS status_code, 'Item voided and order totals recalculated' AS message, v_order_id AS order_id, v_grand_total AS updated_total;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_RecordInvoicePayment` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_RecordInvoicePayment`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_rpt_balance_sheet` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `sp_rpt_balance_sheet`(

    IN p_branch_id BIGINT UNSIGNED,

    IN p_as_of_date DATE

)
BEGIN

    WITH bs_data AS (

        -- 1. ASSETS (Debit Normal Balance: Debit - Credit)

        SELECT 

            '1. ASSETS' AS category_type,

            c.sub_category,

            c.account_code,

            c.account_name,

            ROUND(COALESCE(SUM(l.debit_amount - l.credit_amount), 0.00), 2) AS amount

        FROM acc_chart_of_accounts c

        LEFT JOIN acc_journal_entry_lines l ON c.account_id = l.account_id

        LEFT JOIN acc_journal_entries e ON l.entry_id = e.entry_id 

             AND e.entry_date <= p_as_of_date 

             AND e.is_posted = 1

        WHERE c.branch_id = p_branch_id 

          AND c.account_type = 'asset'

        GROUP BY c.account_id, c.account_code, c.account_name, c.sub_category
 
        UNION ALL
 
        -- 2. LIABILITIES (Credit Normal Balance: Credit - Debit)

        SELECT 

            '2. LIABILITIES' AS category_type,

            c.sub_category,

            c.account_code,

            c.account_name,

            ROUND(COALESCE(SUM(l.credit_amount - l.debit_amount), 0.00), 2) AS amount

        FROM acc_chart_of_accounts c

        LEFT JOIN acc_journal_entry_lines l ON c.account_id = l.account_id

        LEFT JOIN acc_journal_entries e ON l.entry_id = e.entry_id 

             AND e.entry_date <= p_as_of_date 

             AND e.is_posted = 1

        WHERE c.branch_id = p_branch_id 

          AND c.account_type = 'liability'

        GROUP BY c.account_id, c.account_code, c.account_name, c.sub_category
 
        UNION ALL
 
        -- 3. EQUITY (Capital & Retained Earnings)

        SELECT 

            '3. EQUITY' AS category_type,

            c.sub_category,

            c.account_code,

            c.account_name,

            ROUND(COALESCE(SUM(l.credit_amount - l.debit_amount), 0.00), 2) AS amount

        FROM acc_chart_of_accounts c

        LEFT JOIN acc_journal_entry_lines l ON c.account_id = l.account_id

        LEFT JOIN acc_journal_entries e ON l.entry_id = e.entry_id 

             AND e.entry_date <= p_as_of_date 

             AND e.is_posted = 1

        WHERE c.branch_id = p_branch_id 

          AND c.account_type = 'equity'

        GROUP BY c.account_id, c.account_code, c.account_name, c.sub_category
 
        UNION ALL
 
        -- 4. CURRENT YEAR NET PROFIT (Transferred into Equity)

        SELECT 

            '3. EQUITY' AS category_type,

            'Current Year Earnings' AS sub_category,

            '3099' AS account_code,

            'Current Year Restaurant & Bar Net Profit' AS account_name,

            ROUND(COALESCE(SUM(

                CASE 

                    WHEN c.account_type = 'revenue' THEN (l.credit_amount - l.debit_amount)

                    WHEN c.account_type = 'expense' THEN -(l.debit_amount - l.credit_amount)

                    ELSE 0 

                END

            ), 0.00), 2) AS amount

        FROM acc_chart_of_accounts c

        JOIN acc_journal_entry_lines l ON c.account_id = l.account_id

        JOIN acc_journal_entries e ON l.entry_id = e.entry_id 

             AND e.entry_date <= p_as_of_date 

             AND e.is_posted = 1

        WHERE c.branch_id = p_branch_id

    )

    SELECT 

        category_type,

        sub_category,

        account_code,

        account_name,

        amount

    FROM bs_data

    ORDER BY category_type, sub_category, account_code;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_rpt_closing_balance` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `sp_rpt_closing_balance`(
    IN p_branch_id BIGINT UNSIGNED,
    IN p_as_of_date DATE
)
BEGIN
    SELECT 
        c.account_id,
        c.account_code,
        c.account_name,
        c.account_type,
        c.normal_balance,
        COALESCE(SUM(l.debit_amount), 0.00) AS total_cumulative_debit,
        COALESCE(SUM(l.credit_amount), 0.00) AS total_cumulative_credit,
        CASE 
            WHEN c.normal_balance = 'debit' THEN 
                ROUND(COALESCE(SUM(l.debit_amount - l.credit_amount), 0.00), 2)
            ELSE 
                ROUND(COALESCE(SUM(l.credit_amount - l.debit_amount), 0.00), 2)
        END AS net_closing_balance
    FROM acc_chart_of_accounts c
    LEFT JOIN acc_journal_entry_lines l ON c.account_id = l.account_id
    LEFT JOIN acc_journal_entries e ON l.entry_id = e.entry_id AND e.entry_date <= p_as_of_date AND e.is_posted = 1
    WHERE c.branch_id = p_branch_id AND c.is_active = 1
    GROUP BY c.account_id, c.account_code, c.account_name, c.account_type, c.normal_balance
    ORDER BY c.account_code;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_rpt_customer_loyalty_insights` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_rpt_customer_loyalty_insights`(
    IN p_branch_id BIGINT UNSIGNED
)
BEGIN
    
    SELECT 
        c.customer_id,
        c.full_name,
        c.phone,
        c.loyalty_points,
        COUNT(o.order_id) AS total_visits_frequency,
        COALESCE(SUM(o.total_amt), 0.00) AS total_spent_monetary,
        DATEDIFF(CURRENT_DATE(), MAX(o.order_time)) AS days_since_last_visit_recency,
        CASE 
            WHEN COALESCE(SUM(o.total_amt), 0.00) >= 5000 THEN 'VIP Champion'
            WHEN COUNT(o.order_id) >= 5 THEN 'Loyal Regular'
            WHEN DATEDIFF(CURRENT_DATE(), MAX(o.order_time)) > 60 THEN 'At-Risk / Dormant'
            ELSE 'Occasional Patron'
        END AS customer_segment
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id AND o.status = 'completed'
    WHERE (c.registered_branch_id = p_branch_id OR c.registered_branch_id IS NULL)
      AND c.deleted_at IS NULL
    GROUP BY c.customer_id, c.full_name, c.phone, c.loyalty_points
    ORDER BY total_spent_monetary DESC
    LIMIT 100;

    
    SELECT 
        c.customer_id,
        c.full_name,
        c.phone,
        c.dob,
        c.anniversary_date,
        c.loyalty_points,
        CASE 
            WHEN (DAYOFYEAR(c.dob) - DAYOFYEAR(CURRENT_DATE()) BETWEEN 0 AND 7) THEN 'Birthday Upcoming'
            WHEN (DAYOFYEAR(c.anniversary_date) - DAYOFYEAR(CURRENT_DATE()) BETWEEN 0 AND 7) THEN 'Anniversary Upcoming'
            ELSE 'Special Occasion'
        END AS marketing_campaign_target
    FROM customers c
    WHERE c.deleted_at IS NULL
      AND (
          (DAYOFYEAR(c.dob) - DAYOFYEAR(CURRENT_DATE()) BETWEEN 0 AND 7) OR
          (DAYOFYEAR(c.anniversary_date) - DAYOFYEAR(CURRENT_DATE()) BETWEEN 0 AND 7)
      )
    ORDER BY c.full_name ASC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_rpt_daily_item_sales_mix` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_rpt_daily_item_sales_mix`(
    IN p_branch_id BIGINT UNSIGNED,
    IN p_from_date DATE,
    IN p_to_date   DATE
)
BEGIN
    DECLARE v_total_food_revenue DECIMAL(10,2);

    SELECT COALESCE(SUM(oi.total_price), 1.00) INTO v_total_food_revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    WHERE o.branch_id = p_branch_id
      AND DATE(o.order_time) BETWEEN p_from_date AND p_to_date
      AND oi.item_status != 'cancelled';

    SELECT 
        m.item_id,
        m.item_code,
        m.item_name,
        c.category_name,
        m.food_type,
        m.base_price,
        SUM(oi.quantity) AS total_units_sold,
        SUM(oi.total_price) AS total_revenue_generated,
        ROUND((SUM(oi.total_price) / v_total_food_revenue) * 100, 2) AS revenue_contribution_pct
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    JOIN menu_items m ON oi.item_id = m.item_id
    JOIN menu_categories c ON m.category_id = c.category_id
    WHERE o.branch_id = p_branch_id
      AND DATE(o.order_time) BETWEEN p_from_date AND p_to_date
      AND oi.item_status != 'cancelled'
    GROUP BY m.item_id, m.item_code, m.item_name, c.category_name, m.food_type, m.base_price
    ORDER BY total_revenue_generated DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_rpt_employee_payroll_and_hours` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_rpt_employee_payroll_and_hours`(
    IN p_branch_id BIGINT UNSIGNED,
    IN p_month     INT,
    IN p_year      INT
)
BEGIN
    DECLARE v_m INT;
    DECLARE v_y INT;
    SET v_m = COALESCE(p_month, MONTH(CURRENT_DATE()));
    SET v_y = COALESCE(p_year, YEAR(CURRENT_DATE()));

    SELECT 
        e.employee_id,
        e.employee_code,
        e.full_name,
        e.designation,
        e.salary AS monthly_base_salary,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) AS full_days_present,
        COUNT(CASE WHEN a.status = 'half_day' THEN 1 END) AS half_days,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) AS days_absent,
        COALESCE(SUM(a.total_hours), 0.00) AS total_hours_worked,
        COALESCE(SUM(a.overtime_minutes), 0) AS total_overtime_mins,
        
        ROUND(
            (e.salary / 30.0) * (
                COUNT(CASE WHEN a.status = 'present' THEN 1 END) + 
                (COUNT(CASE WHEN a.status = 'half_day' THEN 1 END) * 0.5)
            ), 2
        ) AS estimated_salary_payout
    FROM employees e
    LEFT JOIN attendances a ON e.employee_id = a.employee_id 
         AND MONTH(a.attendance_date) = v_m 
         AND YEAR(a.attendance_date) = v_y
    WHERE e.branch_id = p_branch_id AND e.deleted_at IS NULL
    GROUP BY e.employee_id, e.employee_code, e.full_name, e.designation, e.salary
    ORDER BY e.full_name ASC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_rpt_gst_tax_summary` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_rpt_gst_tax_summary`(
    IN p_branch_id BIGINT UNSIGNED,
    IN p_from_date DATE,
    IN p_to_date   DATE
)
BEGIN
    
    SELECT 
        b.branch_name,
        b.gstin_number AS branch_gstin,
        p_from_date AS report_start,
        p_to_date AS report_end,
        COUNT(i.invoice_id) AS total_invoices_issued,
        COALESCE(SUM(i.taxable_amount), 0.00) AS total_taxable_turnover,
        COALESCE(SUM(i.cgst_amount), 0.00) AS total_cgst_2_5_pct,
        COALESCE(SUM(i.sgst_amount), 0.00) AS total_sgst_2_5_pct,
        COALESCE(SUM(i.tax_amount), 0.00) AS total_gst_collected,
        COALESCE(SUM(i.total_amount), 0.00) AS total_gross_invoiced
    FROM branches b
    LEFT JOIN invoices i ON b.branch_id = i.branch_id 
         AND DATE(i.invoice_date) BETWEEN p_from_date AND p_to_date
         AND i.payment_status = 'paid'
    WHERE b.branch_id = p_branch_id
    GROUP BY b.branch_id, b.branch_name, b.gstin_number;

    
    SELECT 
        i.invoice_number,
        i.invoice_date,
        c.full_name AS customer_name,
        c.gstin AS customer_gstin,
        i.taxable_amount,
        i.cgst_amount,
        i.sgst_amount,
        i.total_amount
    FROM invoices i
    JOIN orders o ON i.order_id = o.order_id
    JOIN customers c ON o.customer_id = c.customer_id
    WHERE i.branch_id = p_branch_id
      AND DATE(i.invoice_date) BETWEEN p_from_date AND p_to_date
      AND i.payment_status = 'paid'
      AND c.gstin IS NOT NULL AND TRIM(c.gstin) != ''
    ORDER BY i.invoice_date ASC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_rpt_inventory_consumption_variance` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_rpt_inventory_consumption_variance`(
    IN p_branch_id BIGINT UNSIGNED,
    IN p_from_date DATE,
    IN p_to_date   DATE
)
BEGIN
    SELECT 
        i.ingredient_id,
        i.ingredient_name,
        i.unit,
        i.cost_per_unit,
        
        COALESCE(
            (SELECT SUM(ri.quantity * oi.quantity)
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.order_id
             JOIN recipe_ingredients ri ON oi.item_id = ri.item_id
             WHERE ri.ingredient_id = i.ingredient_id
               AND o.branch_id = p_branch_id
               AND DATE(o.order_time) BETWEEN p_from_date AND p_to_date
               AND oi.item_status != 'cancelled'), 0.000
        ) AS theoretical_consumption,

        
        COALESCE(
            (SELECT ABS(SUM(it.quantity))
             FROM inventory_transactions it
             WHERE it.ingredient_id = i.ingredient_id
               AND it.branch_id = p_branch_id
               AND it.txn_type IN ('consumption', 'wastage')
               AND DATE(it.txn_date) BETWEEN p_from_date AND p_to_date), 0.000
        ) AS actual_depletion,

        
        ROUND(
            COALESCE(
                (SELECT ABS(SUM(it.quantity))
                 FROM inventory_transactions it
                 WHERE it.ingredient_id = i.ingredient_id
                   AND it.branch_id = p_branch_id
                   AND it.txn_type IN ('consumption', 'wastage')
                   AND DATE(it.txn_date) BETWEEN p_from_date AND p_to_date), 0.000
            ) - 
            COALESCE(
                (SELECT SUM(ri.quantity * oi.quantity)
                 FROM order_items oi
                 JOIN orders o ON oi.order_id = o.order_id
                 JOIN recipe_ingredients ri ON oi.item_id = ri.item_id
                 WHERE ri.ingredient_id = i.ingredient_id
                   AND o.branch_id = p_branch_id
                   AND DATE(o.order_time) BETWEEN p_from_date AND p_to_date
                   AND oi.item_status != 'cancelled'), 0.000
            ), 3
        ) AS variance_qty,

        
        ROUND(
            (
                COALESCE(
                    (SELECT ABS(SUM(it.quantity))
                     FROM inventory_transactions it
                     WHERE it.ingredient_id = i.ingredient_id
                       AND it.branch_id = p_branch_id
                       AND it.txn_type IN ('consumption', 'wastage')
                       AND DATE(it.txn_date) BETWEEN p_from_date AND p_to_date), 0.000
                ) - 
                COALESCE(
                    (SELECT SUM(ri.quantity * oi.quantity)
                     FROM order_items oi
                     JOIN orders o ON oi.order_id = o.order_id
                     JOIN recipe_ingredients ri ON oi.item_id = ri.item_id
                     WHERE ri.ingredient_id = i.ingredient_id
                       AND o.branch_id = p_branch_id
                       AND DATE(o.order_time) BETWEEN p_from_date AND p_to_date
                       AND oi.item_status != 'cancelled'), 0.000
                )
            ) * i.cost_per_unit, 2
        ) AS financial_loss_value
    FROM ingredients i
    WHERE i.branch_id = p_branch_id AND i.deleted_at IS NULL
    ORDER BY financial_loss_value DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_rpt_low_stock_reorder_alert` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_rpt_low_stock_reorder_alert`(
    IN p_branch_id BIGINT UNSIGNED
)
BEGIN
    SELECT 
        i.ingredient_id,
        i.ingredient_code,
        i.ingredient_name,
        i.unit,
        i.current_stock,
        i.reorder_level,
        i.cost_per_unit,
        GREATEST(0.000, (i.reorder_level * 2.0) - i.current_stock) AS suggested_order_qty,
        ROUND(GREATEST(0.000, (i.reorder_level * 2.0) - i.current_stock) * i.cost_per_unit, 2) AS estimated_procurement_cost,
        (SELECT s.supplier_name FROM suppliers s WHERE s.branch_id = i.branch_id AND s.deleted_at IS NULL LIMIT 1) AS default_supplier
    FROM ingredients i
    WHERE i.branch_id = p_branch_id
      AND i.deleted_at IS NULL
      AND i.current_stock <= i.reorder_level
    ORDER BY (i.current_stock - i.reorder_level) ASC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_rpt_opening_balance` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `sp_rpt_opening_balance`(
    IN p_branch_id BIGINT UNSIGNED,
    IN p_as_of_date DATE
)
BEGIN
    SELECT 
        c.account_id,
        c.account_code,
        c.account_name,
        c.account_type,
        c.normal_balance,
        CASE 
            WHEN c.normal_balance = 'debit' THEN 
                GREATEST(COALESCE(SUM(l.debit_amount - l.credit_amount), 0.00), 0.00)
            ELSE 0.00 
        END AS opening_debit,
        CASE 
            WHEN c.normal_balance = 'credit' THEN 
                GREATEST(COALESCE(SUM(l.credit_amount - l.debit_amount), 0.00), 0.00)
            ELSE 0.00 
        END AS opening_credit
    FROM acc_chart_of_accounts c
    LEFT JOIN acc_journal_entry_lines l ON c.account_id = l.account_id
    LEFT JOIN acc_journal_entries e ON l.entry_id = e.entry_id AND e.entry_date < p_as_of_date AND e.is_posted = 1
    WHERE c.branch_id = p_branch_id AND c.is_active = 1
    GROUP BY c.account_id, c.account_code, c.account_name, c.account_type, c.normal_balance
    ORDER BY c.account_code;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_rpt_profit_and_loss_statement` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `sp_rpt_profit_and_loss_statement`(
    IN p_branch_id BIGINT UNSIGNED,
    IN p_from_date DATE,
    IN p_to_date   DATE
)
BEGIN
    DECLARE v_veg_rev DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_nonveg_rev DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_bar_rev DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_service_charges DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_packaging_charges DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_discounts DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_total_revenue DECIMAL(12,2) DEFAULT 0.00;

    DECLARE v_cogs_food DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_cogs_bar DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_total_cogs DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_gross_profit DECIMAL(12,2) DEFAULT 0.00;

    DECLARE v_salaries DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_lpg_utilities DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_maintenance DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_excise_admin DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_depreciation DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_total_operating_exp DECIMAL(12,2) DEFAULT 0.00;

    DECLARE v_operating_profit DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_net_profit DECIMAL(12,2) DEFAULT 0.00;

    -- 1. Primary: Revenues from General Ledger lines (Credits - Debits)
    SELECT 
        COALESCE(SUM(CASE WHEN c.account_code = '4010' THEN (l.credit_amount - l.debit_amount) ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN c.account_code = '4020' THEN (l.credit_amount - l.debit_amount) ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN c.account_code = '4030' THEN (l.credit_amount - l.debit_amount) ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN c.account_code = '4040' THEN (l.credit_amount - l.debit_amount) ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN c.account_code = '4050' THEN (l.credit_amount - l.debit_amount) ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN c.account_code = '4060' THEN (l.debit_amount - l.credit_amount) ELSE 0 END), 0.00)
    INTO v_veg_rev, v_nonveg_rev, v_bar_rev, v_service_charges, v_packaging_charges, v_discounts
    FROM acc_journal_entry_lines l
    JOIN acc_journal_entries e ON l.entry_id = e.entry_id
    JOIN acc_chart_of_accounts c ON l.account_id = c.account_id
    WHERE e.branch_id = p_branch_id 
      AND e.entry_date BETWEEN p_from_date AND p_to_date 
      AND e.is_posted = 1;

    -- 2. Fallback: If not yet posted to GL, aggregate directly from POS orders using o.order_time
    IF (v_veg_rev + v_nonveg_rev + v_bar_rev) = 0 THEN
        SELECT 
            COALESCE(SUM(CASE WHEN (cat.category_name NOT LIKE '%Bar%' AND cat.category_name NOT LIKE '%Liquor%' AND cat.category_name NOT LIKE '%Beverage%') AND m.food_type = 'veg' THEN oi.total_price ELSE 0 END), 0.00),
            COALESCE(SUM(CASE WHEN (cat.category_name NOT LIKE '%Bar%' AND cat.category_name NOT LIKE '%Liquor%' AND cat.category_name NOT LIKE '%Beverage%') AND m.food_type != 'veg' THEN oi.total_price ELSE 0 END), 0.00),
            COALESCE(SUM(CASE WHEN cat.category_name LIKE '%Bar%' OR cat.category_name LIKE '%Liquor%' OR cat.category_name LIKE '%Beverage%' THEN oi.total_price ELSE 0 END), 0.00)
        INTO v_veg_rev, v_nonveg_rev, v_bar_rev
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.order_id
        JOIN menu_items m ON oi.item_id = m.item_id
        JOIN menu_categories cat ON m.category_id = cat.category_id
        WHERE o.branch_id = p_branch_id 
          AND DATE(o.order_time) BETWEEN p_from_date AND p_to_date 
          AND oi.item_status != 'cancelled';

        SELECT 
            COALESCE(SUM(service_charge_amt), 0.00),
            COALESCE(SUM(packaging_charge), 0.00),
            COALESCE(SUM(discount_amt), 0.00)
        INTO v_service_charges, v_packaging_charges, v_discounts
        FROM orders 
        WHERE branch_id = p_branch_id 
          AND DATE(order_time) BETWEEN p_from_date AND p_to_date 
          AND status != 'cancelled';
    END IF;

    SET v_total_revenue = (v_veg_rev + v_nonveg_rev + v_bar_rev + v_service_charges + v_packaging_charges) - v_discounts;

    -- 3. Cost of Goods Sold (COGS)
    -- Kitchen Food ingredients consumed
    SELECT COALESCE(SUM(quantity * unit_cost), 0.00) INTO v_cogs_food
    FROM inventory_transactions 
    WHERE branch_id = p_branch_id 
      AND txn_type = 'consumption' 
      AND DATE(txn_date) BETWEEN p_from_date AND p_to_date;

    -- Bar Liquor poured/dispensed from cellar
    SELECT COALESCE(SUM(ABS(quantity) * unit_cost), 0.00) INTO v_cogs_bar
    FROM bar_inventory_transactions 
    WHERE branch_id = p_branch_id 
      AND transaction_type IN ('cellar_to_counter','direct_bottle_sale') 
      AND DATE(created_at) BETWEEN p_from_date AND p_to_date;

    SET v_total_cogs = v_cogs_food + v_cogs_bar;
    SET v_gross_profit = v_total_revenue - v_total_cogs;

    -- 4. Operating Expenses from acc_expenses table
    SELECT 
        COALESCE(SUM(CASE WHEN c.account_code = '6010' THEN x.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN c.account_code = '6020' THEN x.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN c.account_code = '6030' THEN x.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN c.account_code = '6040' THEN x.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN c.account_code = '6050' THEN x.amount ELSE 0 END), 0.00)
    INTO v_salaries, v_lpg_utilities, v_maintenance, v_excise_admin, v_depreciation
    FROM acc_expenses x
    JOIN acc_chart_of_accounts c ON x.account_id = c.account_id
    WHERE x.branch_id = p_branch_id 
      AND x.expense_date BETWEEN p_from_date AND p_to_date;

    SET v_total_operating_exp = v_salaries + v_lpg_utilities + v_maintenance + v_excise_admin;
    SET v_operating_profit = v_gross_profit - v_total_operating_exp;
    SET v_net_profit = v_operating_profit - v_depreciation;

    -- 5. Format Restaurant & Bar Profit & Loss Statement
    SELECT 
        '1. RESTAURANT & BAR REVENUE' AS section_header,
        v_veg_rev AS food_sales_veg,
        v_nonveg_rev AS food_sales_nonveg,
        (v_veg_rev + v_nonveg_rev) AS total_food_revenue,
        v_bar_rev AS bar_alcohol_revenue,
        v_service_charges AS service_charges_collected,
        v_packaging_charges AS delivery_packaging_charges,
        v_discounts AS discounts_allowed,
        v_total_revenue AS total_net_revenue,
        
        '2. COST OF GOODS SOLD (COGS)' AS cogs_header,
        v_cogs_food AS kitchen_food_ingredients_cost,
        v_cogs_bar AS bar_alcohol_cost,
        v_total_cogs AS total_cogs,
        v_gross_profit AS gross_profit,
        ROUND(CASE WHEN v_total_revenue > 0 THEN (v_gross_profit / v_total_revenue) * 100 ELSE 0 END, 2) AS gross_profit_margin_pct,
        
        '3. OPERATING EXPENSES' AS opex_header,
        v_salaries AS staff_salaries_and_wages,
        v_lpg_utilities AS commercial_lpg_gas_and_power,
        v_maintenance AS kitchen_and_bar_repairs,
        v_excise_admin AS excise_license_and_permits,
        v_total_operating_exp AS total_operating_expenses,
        v_operating_profit AS operating_profit_ebitda,
        
        '4. DEPRECIATION & NET PROFIT' AS net_header,
        v_depreciation AS equipment_depreciation,
        v_net_profit AS net_profit_or_loss,
        ROUND(CASE WHEN v_total_revenue > 0 THEN (v_net_profit / v_total_revenue) * 100 ELSE 0 END, 2) AS net_profit_margin_pct;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_rpt_stock_inventory_report` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `sp_rpt_stock_inventory_report`(
    IN p_branch_id   BIGINT UNSIGNED,
    IN p_from_date   DATE,
    IN p_to_date     DATE,
    IN p_category    VARCHAR(30) -- 'ALL', 'FOOD_PANTRY', 'BAR_LIQUOR'
)
BEGIN
    CREATE TEMPORARY TABLE IF NOT EXISTS tmp_stock_report (
        domain_type       VARCHAR(20),
        product_id        BIGINT UNSIGNED,
        product_code      VARCHAR(50),
        product_name      VARCHAR(150),
        category_name     VARCHAR(80),
        unit_measure      VARCHAR(30),
        opening_stock     DECIMAL(12,3),
        purchase_qty      DECIMAL(12,3),
        sales_consume_qty DECIMAL(12,3),
        breakage_spoilage DECIMAL(12,3),
        adjustments_qty   DECIMAL(12,3),
        closing_stock     DECIMAL(12,3),
        avg_unit_cost     DECIMAL(10,2),
        total_valuation   DECIMAL(12,2),
        reorder_level     DECIMAL(12,3),
        stock_status      VARCHAR(30)
    );
    TRUNCATE TABLE tmp_stock_report;

    -- 1. FOOD PANTRY (Kitchen raw ingredients: Rice, Oil, Spices, Chicken, Vegetables)
    IF p_category IN ('ALL', 'FOOD_PANTRY') THEN
        INSERT INTO tmp_stock_report
        SELECT 
            'FOOD_PANTRY',
            i.ingredient_id,
            COALESCE(i.ingredient_code, CONCAT('ING-', i.ingredient_id)),
            i.ingredient_name,
            'Kitchen Pantry',
            i.unit,
            ROUND(COALESCE(SUM(CASE WHEN t.txn_date < p_from_date THEN 
                CASE 
                    WHEN t.txn_type = 'purchase' THEN t.quantity
                    WHEN t.txn_type IN ('consumption','wastage') THEN -t.quantity
                    ELSE t.quantity 
                END 
            ELSE 0 END), 0.000), 3),
            ROUND(COALESCE(SUM(CASE WHEN t.txn_date BETWEEN p_from_date AND p_to_date AND t.txn_type = 'purchase' THEN t.quantity ELSE 0 END), 0.000), 3),
            ROUND(COALESCE(SUM(CASE WHEN t.txn_date BETWEEN p_from_date AND p_to_date AND t.txn_type = 'consumption' THEN t.quantity ELSE 0 END), 0.000), 3),
            ROUND(COALESCE(SUM(CASE WHEN t.txn_date BETWEEN p_from_date AND p_to_date AND t.txn_type = 'wastage' THEN t.quantity ELSE 0 END), 0.000), 3),
            ROUND(COALESCE(SUM(CASE WHEN t.txn_date BETWEEN p_from_date AND p_to_date AND t.txn_type = 'adjustment' THEN t.quantity ELSE 0 END), 0.000), 3),
            i.current_stock,
            i.cost_per_unit,
            ROUND(i.current_stock * i.cost_per_unit, 2),
            i.reorder_level,
            CASE 
                WHEN i.current_stock <= 0 THEN 'OUT_OF_STOCK'
                WHEN i.current_stock <= i.reorder_level THEN 'REORDER_NOW'
                ELSE 'ADEQUATE'
            END
        FROM ingredients i
        LEFT JOIN inventory_transactions t ON i.ingredient_id = t.ingredient_id
        WHERE i.branch_id = p_branch_id AND i.is_active = 1
        GROUP BY i.ingredient_id, i.ingredient_code, i.ingredient_name, i.unit, i.current_stock, i.cost_per_unit, i.reorder_level;
    END IF;

    -- 2. BAR LIQUOR & BEVERAGE (Sealed Cellar Stock: Whisky, Vodka, Beer Kegs, Wine)
    IF p_category IN ('ALL', 'BAR_LIQUOR') THEN
        INSERT INTO tmp_stock_report
        SELECT 
            'BAR_LIQUOR',
            s.stock_id,
            COALESCE(b.excise_brand_code, CONCAT('BAR-', b.brand_id)),
            CONCAT(b.brand_name, ' (', 
                CASE WHEN sz.volume_ml >= 1000 THEN CONCAT(ROUND(sz.volume_ml/1000, 1), ' L') ELSE CONCAT(ROUND(sz.volume_ml, 0), ' ml') END,
                ' ', sz.package_type, ')'),
            b.liquor_category,
            sz.package_type,
            COALESCE(SUM(CASE WHEN bt.created_at < p_from_date THEN bt.quantity ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN bt.created_at BETWEEN p_from_date AND p_to_date AND bt.transaction_type = 'inward_purchase' THEN bt.quantity ELSE 0 END), 0),
            ABS(COALESCE(SUM(CASE WHEN bt.created_at BETWEEN p_from_date AND p_to_date AND bt.transaction_type IN ('cellar_to_counter','direct_bottle_sale') THEN bt.quantity ELSE 0 END), 0)),
            ABS(COALESCE(SUM(CASE WHEN bt.created_at BETWEEN p_from_date AND p_to_date AND bt.transaction_type = 'breakage_spoilage' THEN bt.quantity ELSE 0 END), 0)),
            COALESCE(SUM(CASE WHEN bt.created_at BETWEEN p_from_date AND p_to_date AND bt.transaction_type = 'audit_adjustment' THEN bt.quantity ELSE 0 END), 0),
            s.sealed_quantity,
            s.avg_cost_price,
            ROUND(s.sealed_quantity * s.avg_cost_price, 2),
            s.min_reorder_level,
            CASE 
                WHEN s.sealed_quantity <= s.min_reorder_level THEN 'REORDER_NOW'
                ELSE 'ADEQUATE'
            END
        FROM bar_inventory_stock s
        JOIN bar_liquor_brands b ON s.brand_id = b.brand_id
        JOIN bar_bottle_sizes sz ON s.size_id = sz.size_id
        LEFT JOIN bar_inventory_transactions bt ON s.brand_id = bt.brand_id AND s.size_id = bt.size_id
        WHERE s.branch_id = p_branch_id
        GROUP BY s.stock_id, b.brand_id, b.brand_name, b.excise_brand_code, b.liquor_category, sz.volume_ml, sz.package_type, s.sealed_quantity, s.avg_cost_price, s.min_reorder_level;
    END IF;

    SELECT * FROM tmp_stock_report ORDER BY domain_type, category_name, product_name;
    DROP TEMPORARY TABLE IF EXISTS tmp_stock_report;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_rpt_table_turnover_and_occupancy` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_rpt_table_turnover_and_occupancy`(
    IN p_branch_id   BIGINT UNSIGNED,
    IN p_report_date DATE
)
BEGIN
    DECLARE v_date DATE;
    SET v_date = COALESCE(p_report_date, CURRENT_DATE());

    SELECT 
        t.table_id,
        t.table_number,
        t.capacity,
        t.location,
        COUNT(o.order_id) AS total_turns_today,
        COALESCE(SUM(o.total_amt), 0.00) AS total_revenue_generated,
        ROUND(AVG(TIMESTAMPDIFF(MINUTE, o.order_time, o.updated_at)), 0) AS avg_dining_duration_mins
    FROM restaurant_tables t
    LEFT JOIN orders o ON t.table_id = o.table_id 
         AND DATE(o.order_time) = v_date
         AND o.status = 'completed'
    WHERE t.branch_id = p_branch_id
    GROUP BY t.table_id, t.table_number, t.capacity, t.location
    ORDER BY total_revenue_generated DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_rpt_trial_balance` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `sp_rpt_trial_balance`(
    IN p_branch_id BIGINT UNSIGNED,
    IN p_from_date DATE,
    IN p_to_date   DATE
)
BEGIN
    SELECT 
        c.account_code,
        c.account_name,
        c.account_type,
        c.normal_balance,
        ROUND(COALESCE(SUM(CASE WHEN e.entry_date < p_from_date THEN l.debit_amount ELSE 0 END), 0.00), 2) AS opening_debit,
        ROUND(COALESCE(SUM(CASE WHEN e.entry_date < p_from_date THEN l.credit_amount ELSE 0 END), 0.00), 2) AS opening_credit,
        ROUND(COALESCE(SUM(CASE WHEN e.entry_date BETWEEN p_from_date AND p_to_date THEN l.debit_amount ELSE 0 END), 0.00), 2) AS period_debit,
        ROUND(COALESCE(SUM(CASE WHEN e.entry_date BETWEEN p_from_date AND p_to_date THEN l.credit_amount ELSE 0 END), 0.00), 2) AS period_credit,
        CASE 
            WHEN c.normal_balance = 'debit' THEN 
                GREATEST(ROUND(COALESCE(SUM(CASE WHEN e.entry_date <= p_to_date THEN (l.debit_amount - l.credit_amount) ELSE 0 END), 0.00), 2), 0.00)
            ELSE 0.00 
        END AS closing_debit,
        CASE 
            WHEN c.normal_balance = 'credit' THEN 
                GREATEST(ROUND(COALESCE(SUM(CASE WHEN e.entry_date <= p_to_date THEN (l.credit_amount - l.debit_amount) ELSE 0 END), 0.00), 2), 0.00)
            ELSE 0.00 
        END AS closing_credit
    FROM acc_chart_of_accounts c
    LEFT JOIN acc_journal_entry_lines l ON c.account_id = l.account_id
    LEFT JOIN acc_journal_entries e ON l.entry_id = e.entry_id AND e.is_posted = 1
    WHERE c.branch_id = p_branch_id AND c.is_active = 1
    GROUP BY c.account_code, c.account_name, c.account_type, c.normal_balance
    ORDER BY c.account_code;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_save_restaurant_settings` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_save_restaurant_settings`(
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

    
    UPDATE `branches` SET
        `branch_name` = p_restaurant_name,
        `phone` = COALESCE(p_contact_number, `phone`),
        `gstin_number` = COALESCE(p_gstin, `gstin_number`)
    WHERE `branch_id` = 1;

    
    CALL `sp_get_restaurant_settings`();
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_SettleOrder` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_SettleOrder`(
    IN p_order_id BIGINT,
    IN p_payment_method VARCHAR(30)
)
BEGIN
    UPDATE `orders`
    SET status = 'Settled', payment_method = p_payment_method, settled_at = NOW(), updated_at = NOW()
    WHERE id = p_order_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_takeaway_place_prepaid_order` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `sp_takeaway_place_prepaid_order`(
    IN p_branch_id           BIGINT UNSIGNED,
    IN p_customer_id         BIGINT UNSIGNED, -- References customers.customer_id
    IN p_items_json          JSON,            -- e.g. [{"item_id": 1, "variant_id": null, "quantity": 2, "notes": "Less oil"}]
    IN p_packaging_charge    DECIMAL(10,2),
    IN p_promo_code          VARCHAR(30),
    IN p_estimated_mins      INT,             -- e.g. 25
    IN p_vehicle_details     VARCHAR(100),    -- Optional vehicle details
    IN p_payment_method      VARCHAR(20),     -- 'upi', 'card', 'netbanking', 'wallet'
    IN p_txn_reference       VARCHAR(100)     -- Payment Gateway Transaction ID
)
proc_label: BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_order_id BIGINT UNSIGNED;
    DECLARE v_order_number VARCHAR(30);
    DECLARE v_invoice_id BIGINT UNSIGNED;
    DECLARE v_invoice_number VARCHAR(30);
    DECLARE v_kot_id BIGINT UNSIGNED;
    DECLARE v_kot_number VARCHAR(30);
    DECLARE v_pickup_token VARCHAR(20);
    DECLARE v_pickup_otp VARCHAR(6);
    DECLARE v_estimated_pickup DATETIME;
    DECLARE v_subtotal DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_tax_amt DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_discount_amt DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_total_amt DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_promo_id BIGINT UNSIGNED DEFAULT NULL;
    DECLARE v_item_count INT;
    DECLARE v_idx INT DEFAULT 0;
    DECLARE v_item_id BIGINT UNSIGNED;
    DECLARE v_variant_id BIGINT UNSIGNED DEFAULT NULL;
    DECLARE v_variant_str VARCHAR(50) DEFAULT NULL;
    DECLARE v_notes_str VARCHAR(255) DEFAULT NULL;
    DECLARE v_qty INT DEFAULT 1;
    DECLARE v_base_price DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_variant_price DECIMAL(10,2) DEFAULT NULL;
    DECLARE v_unit_price DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_item_name VARCHAR(150) DEFAULT '';
    DECLARE v_line_total DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_item_tax_rate DECIMAL(5,2) DEFAULT 5.00;
    DECLARE v_cust_exists INT DEFAULT 0;

    -- Catch SQLEXCEPTION and rollback
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 'ERROR' AS status, 500 AS status_code, CONCAT('Takeaway Order Failed: ', v_error_msg) AS message,
               NULL AS order_id, NULL AS order_number, NULL AS pickup_token, NULL AS pickup_otp, NULL AS total_amount, NULL AS estimated_pickup_time;
    END;

    -- Validate Customer exists in customers table
    IF p_customer_id IS NULL THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'Customer ID is required (Customer phone not found)' AS message,
               NULL AS order_id, NULL AS order_number, NULL AS pickup_token, NULL AS pickup_otp, NULL AS total_amount, NULL AS estimated_pickup_time;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*) INTO v_cust_exists
    FROM customers
    WHERE customer_id = p_customer_id AND is_active = 1 AND deleted_at IS NULL;

    IF v_cust_exists = 0 THEN
        SELECT 'FAILED' AS status, 404 AS status_code, 'Invalid or inactive customer account' AS message,
               NULL AS order_id, NULL AS order_number, NULL AS pickup_token, NULL AS pickup_otp, NULL AS total_amount, NULL AS estimated_pickup_time;
        LEAVE proc_label;
    END IF;

    -- Validate Cart
    IF p_items_json IS NULL OR JSON_LENGTH(p_items_json) = 0 THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'Cart cannot be empty' AS message,
               NULL AS order_id, NULL AS order_number, NULL AS pickup_token, NULL AS pickup_otp, NULL AS total_amount, NULL AS estimated_pickup_time;
        LEAVE proc_label;
    END IF;

    -- 1. Compute Subtotal and Tax across cart items
    SET v_item_count = JSON_LENGTH(p_items_json);
    WHILE v_idx < v_item_count DO
        SET v_item_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].item_id'))) AS UNSIGNED);

        SET v_variant_str = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].variant_id')));
        IF v_variant_str IS NULL OR v_variant_str = 'null' OR TRIM(v_variant_str) = '' THEN
            SET v_variant_id = NULL;
        ELSE
            SET v_variant_id = CAST(v_variant_str AS UNSIGNED);
        END IF;

        SET v_qty = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].quantity'))) AS UNSIGNED);

        SET v_base_price = NULL;
        SELECT price INTO v_base_price
        FROM menu_items
        WHERE menu_item_id = v_item_id AND is_available = 1 AND deleted_at IS NULL
        LIMIT 1;

        IF v_base_price IS NULL THEN
            SELECT 'FAILED' AS status, 404 AS status_code, CONCAT('Menu item ID ', v_item_id, ' not found or is inactive') AS message,
                   NULL AS order_id, NULL AS order_number, NULL AS pickup_token, NULL AS pickup_otp, NULL AS total_amount, NULL AS estimated_pickup_time;
            LEAVE proc_label;
        END IF;

        SET v_unit_price = v_base_price;
        IF v_variant_id IS NOT NULL THEN
            SET v_variant_price = NULL;
            SELECT price INTO v_variant_price FROM menu_item_options WHERE option_id = v_variant_id;
            IF v_variant_price IS NOT NULL THEN
                SET v_unit_price = v_variant_price;
            END IF;
        END IF;

        SET v_line_total = ROUND(v_unit_price * v_qty, 2);
        SET v_subtotal   = v_subtotal + v_line_total;
        SET v_tax_amt    = v_tax_amt + ROUND(v_line_total * (v_item_tax_rate / 100), 2);
        SET v_idx = v_idx + 1;
    END WHILE;

    -- 2. Calculate Discount if promo applied
    IF p_promo_code IS NOT NULL AND TRIM(p_promo_code) != '' THEN
        SELECT promotion_id,
               CASE
                   WHEN COALESCE(discount_percentage, 0) > 0 THEN ROUND(v_subtotal * (discount_percentage / 100), 2)
                   ELSE COALESCE(flat_discount, 0.00)
               END
        INTO v_promo_id, v_discount_amt
        FROM promotions
        WHERE code = TRIM(p_promo_code)
          AND (branch_id IS NULL OR branch_id = p_branch_id)
          AND is_active = 1
          AND (valid_until IS NULL OR NOW() <= valid_until)
        LIMIT 1;

        IF v_discount_amt IS NULL THEN
            SET v_discount_amt = 0.00;
        ELSEIF v_discount_amt > v_subtotal THEN
            SET v_discount_amt = v_subtotal;
        END IF;
    END IF;

    -- 3. Calculate Total Amount
    SET v_total_amt = GREATEST(ROUND(v_subtotal + v_tax_amt + IFNULL(p_packaging_charge, 0.00) - v_discount_amt, 2), 0.00);

    -- 4. Generate Identifiers
    SET v_order_number     = CONCAT('ORD-TK-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', LPAD(FLOOR(RAND() * 900 + 100), 3, '0'));
    SET v_kot_number       = CONCAT('KOT-TK-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', LPAD(FLOOR(RAND() * 900 + 100), 3, '0'));
    SET v_invoice_number   = CONCAT('INV-TK-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', LPAD(FLOOR(RAND() * 900 + 100), 3, '0'));
    SET v_pickup_token     = CONCAT('TK-', DATE_FORMAT(NOW(), '%m%d'), '-', LPAD(FLOOR(RAND() * 9000 + 1000), 4, '0'));
    SET v_pickup_otp       = LPAD(FLOOR(RAND() * 9000 + 1000), 4, '0');
    SET v_estimated_pickup = DATE_ADD(NOW(), INTERVAL IFNULL(p_estimated_mins, 25) MINUTE);

    START TRANSACTION;

    -- Allocate collision-free order_id across orders, restaurant_orders, and invoices
    SELECT GREATEST(
               COALESCE((SELECT MAX(order_id) FROM orders), 0),
               COALESCE((SELECT MAX(order_id) FROM restaurant_orders), 0),
               COALESCE((SELECT MAX(order_id) FROM invoices), 0)
           ) + 1
    INTO v_order_id;

    -- 5. Insert into orders
    INSERT INTO orders (
        order_id, order_number, branch_id, customer_id, promo_id, order_type, status,
        subtotal, discount_amt, tax_amt, packaging_charge, service_charge_amt, total_amt,
        notes, order_time
    ) VALUES (
        v_order_id, v_order_number, p_branch_id, p_customer_id, v_promo_id, 'takeaway', 'confirmed',
        v_subtotal, v_discount_amt, v_tax_amt, IFNULL(p_packaging_charge, 0.00), 0.00, v_total_amt,
        'Online Prepaid Self-Pickup', NOW()
    );

    -- 6. Insert into kitchen_orders
    INSERT INTO kitchen_orders (kot_number, order_id, branch_id, status, priority, special_notes)
    VALUES (v_kot_number, v_order_id, p_branch_id, 'queued', 'high', CONCAT('Takeaway Token: ', v_pickup_token));
    SET v_kot_id = LAST_INSERT_ID();

    -- 7. Insert order_items
    SET v_idx = 0;
    WHILE v_idx < v_item_count DO
        SET v_item_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].item_id'))) AS UNSIGNED);

        SET v_variant_str = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].variant_id')));
        IF v_variant_str IS NULL OR v_variant_str = 'null' OR TRIM(v_variant_str) = '' THEN
            SET v_variant_id = NULL;
        ELSE
            SET v_variant_id = CAST(v_variant_str AS UNSIGNED);
        END IF;

        SET v_qty = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].quantity'))) AS UNSIGNED);

        SET v_notes_str = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].notes')));
        IF v_notes_str = 'null' OR TRIM(v_notes_str) = '' THEN
            SET v_notes_str = NULL;
        END IF;

        SET v_unit_price = 0.00;
        SET v_item_name = '';
        SELECT price, dish_name INTO v_unit_price, v_item_name
        FROM menu_items
        WHERE menu_item_id = v_item_id
        LIMIT 1;

        IF v_variant_id IS NOT NULL THEN
            SET v_variant_price = NULL;
            SELECT price INTO v_variant_price FROM menu_item_options WHERE option_id = v_variant_id;
            IF v_variant_price IS NOT NULL THEN SET v_unit_price = v_variant_price; END IF;
        END IF;

        SET v_line_total = ROUND(v_unit_price * v_qty, 2);

        INSERT INTO order_items (
            order_id, kot_id, item_id, menu_item_id, item_name, variant_id,
            quantity, unit_price, total_price, special_notes, preparation_notes,
            item_status, branch_id
        ) VALUES (
            v_order_id, v_kot_id, v_item_id, v_item_id, COALESCE(v_item_name, ''), v_variant_id,
            v_qty, v_unit_price, v_line_total, v_notes_str, v_notes_str,
            'queued', p_branch_id
        );

        SET v_idx = v_idx + 1;
    END WHILE;

    -- 8. Generate Paid Invoice
    INSERT INTO invoices (
        invoice_number, order_id, branch_id, subtotal, discount_amount,
        taxable_amount, cgst_amount, sgst_amount, tax_amount, service_charge,
        total_amount, paid_amount, amount_paid, payment_status, status, invoice_date
    ) VALUES (
        v_invoice_number, v_order_id, p_branch_id, v_subtotal, v_discount_amt,
        GREATEST(v_subtotal - v_discount_amt, 0.00), ROUND(v_tax_amt / 2, 2), (v_tax_amt - ROUND(v_tax_amt / 2, 2)), v_tax_amt, 0.00,
        v_total_amt, v_total_amt, v_total_amt, 'paid', 'PAID', NOW()
    );
    SET v_invoice_id = LAST_INSERT_ID();

    -- 9. Record Online Prepayment
    INSERT INTO invoice_payments (
        invoice_id, branch_id, payment_method, payment_mode, amount_paid, amount,
        txn_reference, transaction_reference, payment_status, received_by, paid_at
    ) VALUES (
        v_invoice_id, p_branch_id, LOWER(TRIM(p_payment_method)), UPPER(TRIM(p_payment_method)), v_total_amt, v_total_amt,
        p_txn_reference, p_txn_reference, 'success', NULL, NOW()
    );

    -- 10. Insert takeaway_orders
    INSERT INTO takeaway_orders (
        order_id, customer_id, branch_id, pickup_token, pickup_otp,
        estimated_pickup_time, vehicle_details, status
    ) VALUES (
        v_order_id, p_customer_id, p_branch_id, v_pickup_token, v_pickup_otp,
        v_estimated_pickup, p_vehicle_details, 'placed'
    );

    -- 11. Award loyalty points (1 point per 100 spent)
    UPDATE customers
    SET loyalty_points = loyalty_points + FLOOR(v_total_amt / 100)
    WHERE customer_id = p_customer_id;

    COMMIT;

    -- Return full receipt and pickup credentials
    SELECT 'SUCCESS' AS status, 201 AS status_code, 'Prepaid takeaway order placed successfully' AS message,
           v_order_id AS order_id, v_order_number AS order_number,
           v_pickup_token AS pickup_token, v_pickup_otp AS pickup_otp,
           v_total_amt AS total_amount, v_estimated_pickup AS estimated_pickup_time;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_takeaway_verify_and_handover` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `sp_takeaway_verify_and_handover`(
    IN p_branch_id     BIGINT UNSIGNED,
    IN p_pickup_token VARCHAR(20),
    IN p_pickup_otp   VARCHAR(6),
    IN p_staff_emp_id BIGINT UNSIGNED -- Staff handing over (employees.employee_id)
)
proc_label: BEGIN
    DECLARE v_takeaway_id BIGINT UNSIGNED;
    DECLARE v_order_id BIGINT UNSIGNED;
    DECLARE v_current_status VARCHAR(30);

   -- Verify token and OTP against active orders for this branch
    SELECT takeaway_id, order_id, status 
    INTO v_takeaway_id, v_order_id, v_current_status
    FROM takeaway_orders
    WHERE branch_id = p_branch_id
      AND pickup_token = TRIM(p_pickup_token)
      AND pickup_otp = TRIM(p_pickup_otp)
    LIMIT 1;

   -- If no match, return 401
    IF v_takeaway_id IS NULL THEN
        SELECT 'FAILED' AS status, 401 AS status_code, 'Invalid Pickup Token or OTP code' AS message, NULL AS order_id;
        LEAVE proc_label;
    END IF;
    -- Check if already picked up or cancelled
    IF v_current_status = 'picked_up' THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'Order has already been picked up' AS message, v_order_id AS order_id;
        LEAVE proc_label;
    END IF;

   IF v_current_status = 'cancelled' THEN
        SELECT 'FAILED' AS status, 400 AS status_code, 'Order was cancelled' AS message, v_order_id AS order_id;
        LEAVE proc_label;
    END IF;

   START TRANSACTION;
   -- Mark takeaway order as picked up
    UPDATE takeaway_orders
    SET status = 'picked_up',
        actual_picked_up_at = NOW(),
        handed_over_by = p_staff_emp_id
    WHERE takeaway_id = v_takeaway_id;

   -- Complete order header
    UPDATE orders
    SET status = 'completed'
    WHERE order_id = v_order_id;

   -- Mark KOT as served
    UPDATE kitchen_orders
    SET status = 'served',
        completed_at = COALESCE(completed_at, NOW())
    WHERE order_id = v_order_id;

   COMMIT;

   SELECT 'SUCCESS' AS status, 200 AS status_code, 'Takeaway order verified and handed over successfully' AS message, v_order_id AS order_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_ToggleMenuItemAvailability` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_ToggleMenuItemAvailability`(
    IN p_menu_item_id BIGINT,
    IN p_is_available TINYINT(1)
)
BEGIN
    UPDATE `menu_items`
    SET is_available = p_is_available, updated_at = NOW()
    WHERE menu_item_id = p_menu_item_id AND deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_ToggleMenuItemSpecialStatus` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_ToggleMenuItemSpecialStatus`(
    IN p_menu_item_id BIGINT,
    IN p_is_chefs_special TINYINT(1)
)
BEGIN
    UPDATE `menu_items`
    SET is_chefs_special = p_is_chefs_special, updated_at = NOW()
    WHERE menu_item_id = p_menu_item_id AND deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_TransferTable` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_TransferTable`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateCustomer` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_UpdateCustomer`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateDeliveryStatus` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_UpdateDeliveryStatus`(
    IN p_delivery_id BIGINT,
    IN p_status VARCHAR(50)
)
BEGIN
    UPDATE `delivery_orders` SET delivery_status = UPPER(p_status) WHERE delivery_id = p_delivery_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateIngredient` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_UpdateIngredient`(
    IN p_id BIGINT,
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
    UPDATE ingredients
    SET 
        name = IFNULL(p_name, name),
        ingredient_name = IFNULL(p_name, ingredient_name),
        category = IFNULL(p_category, category),
        subcategory = IFNULL(p_subcategory, subcategory),
        supplier = IFNULL(p_supplier, supplier),
        unit = IFNULL(UPPER(p_unit), unit),
        current_stock = IFNULL(p_current_stock, current_stock),
        minimum_threshold = IFNULL(p_minimum_threshold, minimum_threshold),
        reorder_level = IFNULL(p_minimum_threshold, reorder_level),
        unit_cost = IFNULL(p_unit_cost, unit_cost),
        cost_per_unit = IFNULL(p_unit_cost, cost_per_unit),
        mrp = IFNULL(p_mrp, mrp),
        updated_at = NOW()
    WHERE ingredient_id = p_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateKotItemStatus` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_UpdateKotItemStatus`(
    IN p_order_id BIGINT,
    IN p_item_id BIGINT,
    IN p_status VARCHAR(30)
)
BEGIN
    UPDATE `kot_order_items`
    SET item_status = UPPER(p_status), updated_at = NOW()
    WHERE order_id = p_order_id AND (order_item_id = p_item_id OR menu_item_id = p_item_id);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateKotOrderStatus` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_UpdateKotOrderStatus`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateMenuItem` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_UpdateMenuItem`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateOrderDiscount` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_UpdateOrderDiscount`(
    IN p_order_id BIGINT,
    IN p_discount_percent DECIMAL(18,2)
)
BEGIN
    UPDATE `orders` SET discount_percent = p_discount_percent, updated_at = NOW() WHERE id = p_order_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateOrderGuests` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_UpdateOrderGuests`(
    IN p_order_id BIGINT,
    IN p_guests INT
)
BEGIN
    UPDATE `orders` SET guests = p_guests, updated_at = NOW() WHERE id = p_order_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateOrderItemNotes` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_UpdateOrderItemNotes`(
    IN p_order_id BIGINT,
    IN p_item_id BIGINT,
    IN p_notes VARCHAR(255)
)
BEGIN
    UPDATE `order_items` SET notes = p_notes, updated_at = NOW() WHERE id = p_item_id AND order_id = p_order_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdatePoStatus` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_UpdatePoStatus`(
    IN p_po_id BIGINT,
    IN p_status VARCHAR(50)
)
BEGIN
    UPDATE `purchase_orders` SET status = UPPER(p_status), updated_at = NOW() WHERE po_id = p_po_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateReservationStatus` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_UpdateReservationStatus`(
    IN p_reservation_id BIGINT,
    IN p_status VARCHAR(20)
)
BEGIN
    UPDATE `reservations` SET status = UPPER(p_status) WHERE reservation_id = p_reservation_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateStaff` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_UpdateStaff`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateTable` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_UpdateTable`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateUserLastLogin` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_UpdateUserLastLogin`(IN p_user_id BIGINT)
BEGIN
    UPDATE `users`
    SET last_login = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateUserPassword` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_UpdateUserPassword`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_VerifyPasswordResetToken` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`::1` PROCEDURE `sp_VerifyPasswordResetToken`(IN p_reset_id BIGINT)
BEGIN
    UPDATE `password_reset_tokens`
    SET verified_at = NOW()
    WHERE reset_id = p_reset_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `vw_takeaway_live_counter_board`
--

/*!50001 DROP VIEW IF EXISTS `vw_takeaway_live_counter_board`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`127.0.0.1` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_takeaway_live_counter_board` AS select `t`.`takeaway_id` AS `takeaway_id`,`t`.`branch_id` AS `branch_id`,`b`.`branch_name` AS `branch_name`,`t`.`order_id` AS `order_id`,`o`.`order_number` AS `order_number`,`t`.`pickup_token` AS `pickup_token`,`t`.`pickup_otp` AS `pickup_otp`,`c`.`customer_id` AS `customer_id`,`c`.`full_name` AS `customer_name`,`c`.`phone` AS `customer_phone`,`t`.`status` AS `takeaway_status`,`ko`.`status` AS `kitchen_status`,`t`.`estimated_pickup_time` AS `estimated_pickup_time`,timestampdiff(MINUTE,now(),`t`.`estimated_pickup_time`) AS `mins_until_pickup`,`o`.`total_amt` AS `total_amount`,`o`.`total_amt` AS `prepaid_amount`,`inv`.`invoice_number` AS `invoice_number`,`inv`.`payment_status` AS `payment_status`,`t`.`vehicle_details` AS `vehicle_details`,count(`oi`.`order_item_id`) AS `total_items_count`,group_concat(concat(`oi`.`quantity`,'x ',coalesce(nullif(`mi`.`dish_name`,''),nullif(`oi`.`item_name`,''),'Item')) order by `oi`.`order_item_id` ASC separator ', ') AS `ordered_items_summary`,`t`.`created_at` AS `order_placed_at` from (((((((`takeaway_orders` `t` join `orders` `o` on((`t`.`order_id` = `o`.`order_id`))) join `customers` `c` on((`t`.`customer_id` = `c`.`customer_id`))) join `branches` `b` on((`t`.`branch_id` = `b`.`branch_id`))) left join `invoices` `inv` on((`o`.`order_id` = `inv`.`order_id`))) left join `kitchen_orders` `ko` on((`o`.`order_id` = `ko`.`order_id`))) left join `order_items` `oi` on(((`o`.`order_id` = `oi`.`order_id`) and (coalesce(`oi`.`is_deleted`,0) = 0)))) left join `menu_items` `mi` on((coalesce(`oi`.`menu_item_id`,`oi`.`item_id`) = `mi`.`menu_item_id`))) where (`t`.`status` in ('placed','preparing','ready_for_pickup')) group by `t`.`takeaway_id`,`t`.`branch_id`,`b`.`branch_name`,`t`.`order_id`,`o`.`order_number`,`t`.`pickup_token`,`t`.`pickup_otp`,`c`.`customer_id`,`c`.`full_name`,`c`.`phone`,`t`.`status`,`ko`.`status`,`t`.`estimated_pickup_time`,`o`.`total_amt`,`inv`.`invoice_number`,`inv`.`payment_status`,`t`.`vehicle_details`,`t`.`created_at` order by `t`.`estimated_pickup_time` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-11 10:09:29
