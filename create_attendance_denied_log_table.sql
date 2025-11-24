-- Create table for tracking denied attendance attempts
-- This table stores logs when users try to check in but are denied
-- (e.g., expired subscription, no active plan, etc.)

CREATE TABLE IF NOT EXISTS `attendance_denied_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL COMMENT 'User ID who attempted check-in (NULL for guests)',
  `guest_session_id` int(11) DEFAULT NULL COMMENT 'Guest session ID if applicable',
  `denial_reason` varchar(50) NOT NULL COMMENT 'Reason for denial: expired_plan, no_plan, guest_expired, guest_error, etc.',
  `attempted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the attendance attempt was made',
  `expired_date` date DEFAULT NULL COMMENT 'Expiration date if plan expired',
  `plan_name` varchar(255) DEFAULT NULL COMMENT 'Plan name if applicable',
  `message` text DEFAULT NULL COMMENT 'Full denial message for reference',
  `entry_method` enum('qr','manual','unknown') DEFAULT 'unknown' COMMENT 'How the attendance was attempted',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_guest_session_id` (`guest_session_id`),
  KEY `idx_denial_reason` (`denial_reason`),
  KEY `idx_attempted_at` (`attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Logs of denied attendance attempts';

