-- Add parent consent file URL column to user table for users under 18
-- This stores the file path to the uploaded parent consent letter/waiver

ALTER TABLE `user` 
ADD COLUMN `parent_consent_file_url` VARCHAR(500) DEFAULT NULL 
COMMENT 'File path to parent consent letter/waiver for users under 18 years old' 
AFTER `profile_photo_url`;

