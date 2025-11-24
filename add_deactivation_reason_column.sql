-- Add deactivation_reason column to user table
-- This column will store the reason when an account is deactivated
-- NOTE: If you get "Duplicate column name" error, the column already exists
--       Just comment out or skip the ALTER TABLE statement below and run the trigger update

-- Uncomment the following lines ONLY if the column doesn't exist yet:
-- ALTER TABLE `user` 
-- ADD COLUMN `deactivation_reason` TEXT NULL DEFAULT NULL 
-- COMMENT 'Reason for account deactivation' 
-- AFTER `account_status`;

-- Update the trigger to include the reason in the notification if available
-- Note: We cannot modify NEW values in AFTER triggers, so clearing deactivation_reason
-- is handled in the API when reactivating accounts
DELIMITER $$
DROP TRIGGER IF EXISTS `log_account_deactivation`$$
CREATE TRIGGER `log_account_deactivation` AFTER UPDATE ON `user` FOR EACH ROW 
BEGIN
    -- Check if status changed to deactivated
    IF OLD.account_status != 'deactivated' AND NEW.account_status = 'deactivated' THEN
        -- Send notification to the deactivated user
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            NEW.id, 
            IF(
                NEW.deactivation_reason IS NOT NULL AND NEW.deactivation_reason != '',
                CONCAT('Your account has been deactivated. Reason: ', NEW.deactivation_reason, '. Please contact gym administration for more information.'),
                'Your account has been deactivated. Please contact gym administration for more information.'
            ),
            1, -- Unread
            2, -- Warning
            NOW()
        );
    END IF;
END$$
DELIMITER ;

