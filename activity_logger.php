<?php
/**
 * Activity Logger
 * Centralized logging function for staff/admin activities
 * 
 * @param PDO $pdo Database connection
 * @param int|null $staffId Staff/Admin user ID (can be null for system actions)
 * @param string $action Action name (e.g., "Approve Coach Assignment")
 * @param string $description Detailed description of the action
 * @param string $category Category name (e.g., "Coach Assignment", "Sales", "Subscription Management")
 * @param array $details Additional details as associative array (optional)
 * @return bool True on success, false on failure
 */
function logStaffActivity($pdo, $staffId, $action, $description, $category = "General", $details = []) {
    try {
        // Ensure activity_log table exists
        $checkTable = $pdo->query("SHOW TABLES LIKE 'activity_log'");
        if ($checkTable->rowCount() == 0) {
            // Create activity_log table if it doesn't exist
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS activity_log (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NULL,
                    activity VARCHAR(255) NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_user_id (user_id),
                    INDEX idx_timestamp (timestamp)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
        }
        
        // Build the activity message
        $activityMessage = $action;
        if (!empty($description)) {
            $activityMessage .= ": " . $description;
        }
        
        // Prepare the insert statement
        $stmt = $pdo->prepare("
            INSERT INTO activity_log (user_id, activity, timestamp)
            VALUES (?, ?, NOW())
        ");
        
        // Execute with staffId (can be null) and activity message
        $stmt->execute([$staffId, $activityMessage]);
        
        return true;
    } catch (Exception $e) {
        // Log error but don't break the main flow
        error_log("Error logging staff activity: " . $e->getMessage());
        error_log("Action: $action, Staff ID: " . ($staffId ?? 'NULL'));
        return false;
    }
}

