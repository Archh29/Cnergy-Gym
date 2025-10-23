-- ============================================================================
-- ADD DEACTIVATED STATUS TO USER ACCOUNTS
-- Purpose: Prevent account sharing by allowing admin/staff to deactivate accounts
-- Date: 2025-01-15
-- ============================================================================

-- Step 1: Modify the account_status ENUM to include 'deactivated'
ALTER TABLE `user` 
MODIFY COLUMN `account_status` ENUM('pending', 'approved', 'rejected', 'deactivated') 
DEFAULT 'pending';

-- Step 2: Add an index on account_status for faster queries
CREATE INDEX idx_account_status ON `user`(account_status);

-- Step 3: Create a log table to track deactivations (optional but recommended)
CREATE TABLE IF NOT EXISTS `account_deactivation_log` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `deactivated_by` INT(11) NOT NULL,
  `reason` TEXT,
  `deactivated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `deactivated_by` (`deactivated_by`),
  CONSTRAINT `fk_deactivation_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deactivation_staff` FOREIGN KEY (`deactivated_by`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Create a trigger to log deactivations automatically
DELIMITER $$
CREATE TRIGGER `log_account_deactivation` 
AFTER UPDATE ON `user` 
FOR EACH ROW 
BEGIN
    -- Check if status changed to deactivated
    IF OLD.account_status != 'deactivated' AND NEW.account_status = 'deactivated' THEN
        -- Send notification to the deactivated user
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            NEW.id, 
            '⚠️ Your account has been deactivated. Please contact gym administration for more information.',
            1, -- Unread
            2, -- Warning
            NOW()
        );
    END IF;
END$$
DELIMITER ;

-- Step 5: Verify the changes
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    COLUMN_DEFAULT 
FROM 
    INFORMATION_SCHEMA.COLUMNS 
WHERE 
    TABLE_NAME = 'user' 
    AND COLUMN_NAME = 'account_status';

-- Expected output should show: enum('pending','approved','rejected','deactivated')

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Deactivate a user account (account sharing detected)
-- UPDATE `user` SET `account_status` = 'deactivated' WHERE `id` = 123;

-- Example 2: Reactivate a previously deactivated account
-- UPDATE `user` SET `account_status` = 'approved' WHERE `id` = 123;

-- Example 3: Find all deactivated accounts
-- SELECT id, email, fname, lname, account_status, created_at 
-- FROM `user` 
-- WHERE account_status = 'deactivated';

-- Example 4: View deactivation history
-- SELECT 
--     d.id, 
--     u.email as deactivated_user,
--     s.email as deactivated_by_staff,
--     d.reason,
--     d.deactivated_at
-- FROM account_deactivation_log d
-- JOIN `user` u ON d.user_id = u.id
-- JOIN `user` s ON d.deactivated_by = s.id
-- ORDER BY d.deactivated_at DESC;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback these changes (use with caution):
-- ALTER TABLE `user` 
-- MODIFY COLUMN `account_status` ENUM('pending', 'approved', 'rejected') 
-- DEFAULT 'pending';
-- DROP TABLE IF EXISTS `account_deactivation_log`;
-- DROP TRIGGER IF EXISTS `log_account_deactivation`;


