-- ============================================================================
-- VIEW SUBSCRIPTION PLANS BEFORE DATABASE RESET
-- Run this query BEFORE running the reset script to see all plan IDs
-- ============================================================================

-- View all subscription plans with their details
SELECT 
    id AS plan_id,
    plan_name,
    price,
    duration_months,
    duration_days,
    created_at
FROM `member_subscription_plan` 
ORDER BY id;

-- Count total plans
SELECT COUNT(*) as total_plans FROM `member_subscription_plan`;

-- View plans grouped by type (if you have a category or type column)
-- SELECT plan_name, COUNT(*) as count FROM `member_subscription_plan` GROUP BY plan_name;

