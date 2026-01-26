-- Add system photo URL column to user table for face tracking and identification
-- This is separate from profile_photo_url which is used for mobile app profile pictures

ALTER TABLE `user` 
ADD COLUMN `system_photo_url` VARCHAR(500) DEFAULT NULL 
COMMENT 'File path to system photo for face tracking and identification (separate from mobile app profile photo)' 
AFTER `parent_consent_file_url`;
