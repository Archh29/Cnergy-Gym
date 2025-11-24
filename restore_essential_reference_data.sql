-- ============================================================================
-- RESTORE ESSENTIAL REFERENCE DATA AFTER DATABASE RESET
-- 
-- This script restores essential reference tables that are needed for the
-- system to function, but were deleted during the database reset.
-- 
-- Run this AFTER running reset_database_except_exercises.sql
-- ============================================================================

-- ============================================================================
-- 1. RESTORE SUBSCRIPTION STATUS TABLE
-- ============================================================================
-- This table is REQUIRED for subscriptions to work
-- The system looks for status_name = 'approved' to create subscriptions

CREATE TABLE IF NOT EXISTS `subscription_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `status_name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `status_name` (`status_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert essential subscription statuses
INSERT INTO `subscription_status` (`id`, `status_name`) VALUES
(1, 'pending_approval'),
(2, 'approved'),
(3, 'rejected'),
(4, 'cancelled'),
(5, 'expired')
ON DUPLICATE KEY UPDATE `status_name` = VALUES(`status_name`);

-- Set auto-increment to continue from 6
ALTER TABLE `subscription_status` AUTO_INCREMENT = 6;

-- ============================================================================
-- 2. RESTORE SUBSCRIPTION PLANS TABLE
-- ============================================================================
-- This table contains the subscription plan definitions

CREATE TABLE IF NOT EXISTS `member_subscription_plan` (
  `id` int(11) NOT NULL,
  `plan_name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `is_member_only` tinyint(1) DEFAULT 0,
  `discounted_price` decimal(10,2) DEFAULT NULL,
  `duration_months` int(11) DEFAULT 1,
  `duration_days` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert subscription plans (from your backup)
INSERT INTO `member_subscription_plan` (`id`, `plan_name`, `price`, `is_member_only`, `discounted_price`, `duration_months`, `duration_days`) VALUES
(1, 'Gym Membership', 500.00, 0, NULL, 12, 0),
(2, 'Monthly Access (Premium)', 999.00, 1, NULL, 1, 0),
(3, 'Monthly Access (Standard)', 1300.00, 0, NULL, 1, 0),
(5, 'Gym Membership + 1 Month Access', 1499.00, 0, NULL, 1, 0),
(6, 'Gym Session', 150.00, 0, NULL, 0, 1)
ON DUPLICATE KEY UPDATE 
  `plan_name` = VALUES(`plan_name`),
  `price` = VALUES(`price`),
  `is_member_only` = VALUES(`is_member_only`),
  `discounted_price` = VALUES(`discounted_price`),
  `duration_months` = VALUES(`duration_months`),
  `duration_days` = VALUES(`duration_days`);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check subscription statuses
SELECT * FROM `subscription_status` ORDER BY id;

-- Check subscription plans
SELECT * FROM `member_subscription_plan` ORDER BY id;

-- Verify "approved" status exists (this is critical!)
SELECT id, status_name FROM `subscription_status` WHERE status_name = 'approved';






