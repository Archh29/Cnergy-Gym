-- Simple Soft Delete for Staff
-- Just add one field to hide deleted staff instead of actually deleting them

-- Add soft delete field to user table
ALTER TABLE `user` ADD COLUMN `is_deleted` TINYINT(1) DEFAULT 0;

-- Add index for better performance
ALTER TABLE `user` ADD INDEX `idx_is_deleted` (`is_deleted`);

-- That's it! Now when you "delete" staff, just set is_deleted = 1
-- Example: UPDATE user SET is_deleted = 1 WHERE id = [staff_id];

-- And when you query staff, add WHERE is_deleted = 0
-- Example: SELECT * FROM user WHERE user_type_id = 2 AND is_deleted = 0;
