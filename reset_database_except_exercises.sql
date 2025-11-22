-- ============================================================================
-- DATABASE RESET SCRIPT - Preserves Exercise Data
-- 
-- WARNING: This script will permanently delete all data from tables
-- EXCEPT exercise-related tables (exercises, muscle, musclegroup, etc.)
-- 
-- IMPORTANT: 
-- 1. BACKUP YOUR DATABASE BEFORE RUNNING THIS SCRIPT!
-- 2. Review the list of tables below to ensure they match your database
-- 3. Comment out or remove DELETE statements for tables that don't exist
-- 4. Uncomment DELETE statements for optional tables (like chat_*) if they exist
-- ============================================================================

-- ============================================================================
-- STEP 0: Check which tables exist in your database
-- Run this query first to see all tables:
-- SHOW TABLES;
-- Then comment out DELETE statements for tables that don't exist
-- ============================================================================

-- ============================================================================
-- STEP 0.5: View subscription plans before deletion
-- Run this query to see all subscription plan IDs and names:
-- ============================================================================
SELECT id, plan_name, price, duration_months, duration_days 
FROM `member_subscription_plan` 
ORDER BY id;

-- ============================================================================
-- View other important data before deletion (optional):
-- ============================================================================
-- SELECT COUNT(*) as total_users FROM `user`;
-- SELECT COUNT(*) as total_subscriptions FROM `subscription`;
-- SELECT COUNT(*) as total_sales FROM `sales`;
-- SELECT COUNT(*) as total_products FROM `product`;

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- DELETE DATA FROM ALL TABLES (except exercise-related)
-- IMPORTANT: Delete from child tables FIRST, then parent tables
-- ============================================================================

-- ============================================================================
-- STEP 1: Delete from child/referencing tables first
-- ============================================================================

-- Activity Logs (references user)
DELETE FROM `activity_log`;
ALTER TABLE `activity_log` AUTO_INCREMENT = 1;

DELETE FROM `admin_activity_log`;
ALTER TABLE `admin_activity_log` AUTO_INCREMENT = 1;

-- Account Deactivation Log (references user)
DELETE FROM `account_deactivation_log`;
ALTER TABLE `account_deactivation_log` AUTO_INCREMENT = 1;

-- Password Reset Tokens (references user)
DELETE FROM `password_reset_tokens`;
ALTER TABLE `password_reset_tokens` AUTO_INCREMENT = 1;

-- User Discounts (references user)
DELETE FROM `user_discount_eligibility`;
ALTER TABLE `user_discount_eligibility` AUTO_INCREMENT = 1;

-- Payments (references subscription and user)
DELETE FROM `payment`;
ALTER TABLE `payment` AUTO_INCREMENT = 1;

-- Sales Details (references sales, product, subscription, guest_session)
DELETE FROM `sales_details`;
ALTER TABLE `sales_details` AUTO_INCREMENT = 1;

-- Sales (references user)
DELETE FROM `sales`;
ALTER TABLE `sales` AUTO_INCREMENT = 1;

-- Subscriptions (references user, plan, status)
DELETE FROM `subscription`;
ALTER TABLE `subscription` AUTO_INCREMENT = 1;

-- Coach Member List (references user/coaches)
DELETE FROM `coach_member_list`;
ALTER TABLE `coach_member_list` AUTO_INCREMENT = 1;

-- Attendance (references user)
DELETE FROM `attendance`;
ALTER TABLE `attendance` AUTO_INCREMENT = 1;

-- Guest Sessions (references user)
DELETE FROM `guest_session`;
ALTER TABLE `guest_session` AUTO_INCREMENT = 1;

-- Support Requests (may reference user)
DELETE FROM `support_requests`;
ALTER TABLE `support_requests` AUTO_INCREMENT = 1;

-- Chat/Messaging (if exists - uncomment only if these tables exist)
-- DELETE FROM `chat_messages`;
-- ALTER TABLE `chat_messages` AUTO_INCREMENT = 1;

-- DELETE FROM `chat_rooms`;
-- ALTER TABLE `chat_rooms` AUTO_INCREMENT = 1;

-- Programs (DELETE programs, but preserve exercise-related junction table)
-- Note: program_workout_exercise is preserved (exercise-related)
-- Delete in order: child tables first, then parent tables
-- Complete dependency chain: member_workout_exercise → member_program_workout → member_programhdr → programhdr → programs

-- Delete member_workout_exercise first (references member_program_workout)
DELETE FROM `member_workout_exercise`;
ALTER TABLE `member_workout_exercise` AUTO_INCREMENT = 1;

-- Delete member_program_workout (references member_programhdr, but is referenced by member_workout_exercise)
DELETE FROM `member_program_workout`;
ALTER TABLE `member_program_workout` AUTO_INCREMENT = 1;

-- Delete member_programhdr (references programhdr, but is referenced by member_program_workout)
DELETE FROM `member_programhdr`;
ALTER TABLE `member_programhdr` AUTO_INCREMENT = 1;

-- Delete program_workout (child of programhdr)
DELETE FROM `program_workout`;
ALTER TABLE `program_workout` AUTO_INCREMENT = 1;

-- Note: program_workout_exercise is preserved (exercise-related - DO NOT DELETE)

DELETE FROM `programhdr`;
ALTER TABLE `programhdr` AUTO_INCREMENT = 1;

DELETE FROM `programs`;
ALTER TABLE `programs` AUTO_INCREMENT = 1;

-- ============================================================================
-- STEP 2: Delete from parent/referenced tables
-- ============================================================================

-- Products (referenced by sales_details)
DELETE FROM `product`;
ALTER TABLE `product` AUTO_INCREMENT = 1;

-- Subscription Plans (referenced by subscription)
DELETE FROM `member_subscription_plan`;
ALTER TABLE `member_subscription_plan` AUTO_INCREMENT = 1;

-- Subscription Status (referenced by subscription)
DELETE FROM `subscription_status`;
ALTER TABLE `subscription_status` AUTO_INCREMENT = 1;

-- Coaches (referenced by coach_member_list)
DELETE FROM `coaches`;
ALTER TABLE `coaches` AUTO_INCREMENT = 1;

-- Users (referenced by many tables - delete last)
DELETE FROM `user`;
ALTER TABLE `user` AUTO_INCREMENT = 1;

-- Any other tables you want to reset
-- Add them here following the same pattern:
-- DELETE FROM `table_name`;
-- ALTER TABLE `table_name` AUTO_INCREMENT = 1;

-- ============================================================================
-- PRESERVED TABLES (DO NOT DELETE FROM THESE):
-- ============================================================================
-- exercise (or exercises) - Actual workout exercises
-- muscle (or muscles) - Muscle definitions
-- musclegroup (or muscle_groups) - Muscle group definitions
-- muscle_parts - Muscle part definitions
-- exercise_muscle (junction table) - Links exercises to muscles
-- program_workout_exercise (junction table) - Links programs to exercises (PRESERVED)
-- explore_program_workout (if it contains exercise references)
--
-- NOTE: Programs themselves (programs, programhdr, program_workout, member_programhdr)
-- are DELETED, but program_workout_exercise is preserved because it contains
-- exercise data that should be kept.

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- VERIFICATION QUERIES (Run these after the reset to verify)
-- ============================================================================

-- Check preserved tables still have data
-- SELECT COUNT(*) as exercise_count FROM `exercises`;
-- SELECT COUNT(*) as muscle_count FROM `muscle`;
-- SELECT COUNT(*) as musclegroup_count FROM `musclegroup`;

-- Check deleted tables are empty
-- SELECT COUNT(*) as user_count FROM `user`; -- Should be 0
-- SELECT COUNT(*) as subscription_count FROM `subscription`; -- Should be 0
-- SELECT COUNT(*) as sales_count FROM `sales`; -- Should be 0

