-- SQL script to clean up broken coaching assignment data
-- This removes package assignments and entries with NULL/missing end dates

-- Remove package type assignments from coach_assignments table
DELETE FROM coach_assignments 
WHERE rate_type = 'package' OR assignment_type = 'package';

-- Remove assignments with NULL or missing end dates (broken data)
DELETE FROM coach_assignments 
WHERE expires_at IS NULL 
   OR expires_at = '' 
   OR expires_at = '0000-00-00 00:00:00';

-- Remove coaching sales with package type
DELETE FROM sales 
WHERE sale_type IN ('Coaching', 'Coach Assignment', 'Coach')
  AND id IN (
    SELECT DISTINCT s.id 
    FROM sales s
    LEFT JOIN coach_assignments ca ON s.user_id = ca.member_id AND s.coach_id = ca.coach_id
    WHERE ca.rate_type = 'package' OR ca.assignment_type = 'package'
  );

-- Optional: Show summary of what will be cleaned
-- Run these SELECT queries first to see what will be deleted:

-- SELECT COUNT(*) as package_assignments FROM coach_assignments 
-- WHERE rate_type = 'package' OR assignment_type = 'package';

-- SELECT COUNT(*) as null_end_dates FROM coach_assignments 
-- WHERE expires_at IS NULL OR expires_at = '' OR expires_at = '0000-00-00 00:00:00';
