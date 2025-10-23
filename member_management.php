<?php
// Database configuration
$host = "localhost";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    // Ensure proper UTF-8 encoding for special characters like peso sign
    $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (PDOException $e) {
    error_log('Member Management Database connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
    exit();
}

require 'activity_logger.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Ensure PDO throws exceptions so we can return proper JSON errors
if (isset($pdo) && $pdo instanceof PDO) {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
}

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond($payload, $code = 200)
{
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

try {
    // GET: all members (user_type_id = 4)
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['id'])) {
        $stmt = $pdo->query('SELECT id, fname, mname, lname, email, gender_id, bday, user_type_id, account_status, created_at FROM `user` WHERE user_type_id = 4 ORDER BY id DESC');
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
        respond($members);
    }

    // GET: single member by id
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT id, fname, mname, lname, email, gender_id, bday, user_type_id, account_status, created_at FROM `user` WHERE id = ?');
        $stmt->execute([$_GET['id']]);
        $member = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$member) {
            respond(['error' => 'Member not found'], 404);
        }
        respond($member);
    }

    // POST: add new member
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            respond(['error' => 'Invalid JSON'], 400);
        }

        foreach (['fname', 'mname', 'lname', 'email', 'password', 'gender_id', 'bday'] as $k) {
            if (!isset($input[$k])) {
                respond(['error' => 'Missing required fields'], 400);
            }
        }

        // CRITICAL: Check if email already exists across ALL user types
        $stmt = $pdo->prepare('SELECT id, user_type_id FROM `user` WHERE email = ?');
        $stmt->execute([$input['email']]);
        $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existingUser) {
            $userTypes = [1 => 'Admin', 2 => 'Staff', 3 => 'Coach', 4 => 'Member'];
            $existingUserType = $userTypes[$existingUser['user_type_id']] ?? 'Unknown';
            respond([
                'error' => 'Email already exists',
                'message' => "Email '{$input['email']}' is already registered as a {$existingUserType}. Please use a different email address."
            ], 400);
        }

        $account_status = isset($input['account_status']) ? $input['account_status'] : 'approved';

        $stmt = $pdo->prepare('INSERT INTO `user` (user_type_id, fname, mname, lname, email, password, gender_id, bday, failed_attempt, account_status) 
                               VALUES (4, ?, ?, ?, ?, ?, ?, ?, 0, ?)');
        $stmt->execute([
            $input['fname'],
            $input['mname'],
            $input['lname'],
            $input['email'],
            password_hash($input['password'], PASSWORD_DEFAULT),
            $input['gender_id'],
            $input['bday'],
            $account_status
        ]);

        $newId = $pdo->lastInsertId();
        $stmt = $pdo->prepare('SELECT id, fname, mname, lname, email, gender_id, bday, account_status, created_at FROM `user` WHERE id = ?');
        $stmt->execute([$newId]);
        $newMember = $stmt->fetch(PDO::FETCH_ASSOC);

        // Log activity using centralized logger (same as monitor_subscription.php)
        $staffId = $input['staff_id'] ?? null;
        error_log("DEBUG Member Add - staffId: " . ($staffId ?? 'NULL') . " from request data");
        logStaffActivity($pdo, $staffId, "Add Member", "New member added - {$input['fname']} {$input['lname']} ({$input['email']})", "Member Management");

        respond(['message' => 'Member added successfully', 'member' => $newMember], 201);
    }

    // PUT: update member (either status-only or full update)
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $rawInput = file_get_contents('php://input');
        error_log("Raw Input: " . $rawInput);
        $input = json_decode($rawInput, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            respond(['error' => 'Invalid JSON format', 'details' => json_last_error_msg()], 400);
        }

        // Status-only update
        if (isset($input['id'], $input['account_status']) && !isset($input['fname'], $input['mname'], $input['lname'], $input['email'], $input['gender_id'], $input['bday'])) {
            error_log("DEBUG: Status-only update detected for ID: " . $input['id'] . ", Status: " . $input['account_status']);

            // Get member details for logging
            $stmt = $pdo->prepare('SELECT fname, lname FROM `user` WHERE id = ?');
            $stmt->execute([$input['id']]);
            $member = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$member) {
                respond(['error' => 'Member not found'], 404);
            }

            $stmt = $pdo->prepare('UPDATE `user` SET account_status = ? WHERE id = ?');
            $stmt->execute([$input['account_status'], $input['id']]);

            // Log activity using centralized logger (same as monitor_subscription.php)
            $staffId = $input['staff_id'] ?? null;
            error_log("DEBUG Member Status Update - staffId: " . ($staffId ?? 'NULL') . " from request data");
            logStaffActivity($pdo, $staffId, "Update Member Status", "Member account {$input['account_status']}: {$member['fname']} {$member['lname']} (ID: {$input['id']})", "Member Management");

            respond(['message' => 'Account status updated successfully']);
        }

        // Full update requires core fields
        error_log("DEBUG: Full update detected. Input keys: " . implode(', ', array_keys($input)));
        foreach (['id', 'fname', 'mname', 'lname', 'email', 'gender_id', 'bday'] as $k) {
            if (!isset($input[$k])) {
                error_log("DEBUG: Missing required field: " . $k);
                respond(['error' => 'Missing required fields: ' . $k], 400);
            }
        }

        if (!empty($input['password'])) {
            $stmt = $pdo->prepare('UPDATE `user` SET fname = ?, mname = ?, lname = ?, email = ?, gender_id = ?, bday = ?, account_status = ?, password = ? WHERE id = ?');
            $stmt->execute([
                $input['fname'],
                $input['mname'],
                $input['lname'],
                $input['email'],
                $input['gender_id'],
                $input['bday'],
                isset($input['account_status']) ? $input['account_status'] : 'approved',
                password_hash($input['password'], PASSWORD_DEFAULT),
                $input['id']
            ]);
        } else {
            $stmt = $pdo->prepare('UPDATE `user` SET fname = ?, mname = ?, lname = ?, email = ?, gender_id = ?, bday = ?, account_status = ? WHERE id = ?');
            $stmt->execute([
                $input['fname'],
                $input['mname'],
                $input['lname'],
                $input['email'],
                $input['gender_id'],
                $input['bday'],
                isset($input['account_status']) ? $input['account_status'] : 'approved',
                $input['id']
            ]);
        }

        // Log activity using centralized logger (same as monitor_subscription.php)
        $staffId = $input['staff_id'] ?? null;
        error_log("DEBUG Member Update - staffId: " . ($staffId ?? 'NULL') . " from request data");
        logStaffActivity($pdo, $staffId, "Update Member", "Member updated - {$input['fname']} {$input['lname']} (ID: {$input['id']})", "Member Management");

        respond(['message' => 'Member updated successfully']);
    }

    // DELETE: delete member with proper foreign key handling
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        try {
            error_log("DELETE request received");
            // Handle both URL parameter (?id=15) and JSON input
            $memberId = null;

            if (isset($_GET['id'])) {
                // URL parameter format: DELETE /member_management.php?id=15
                $memberId = $_GET['id'];
            } else {
                // JSON input format
                $input = json_decode(file_get_contents('php://input'), true);
                if ($input && isset($input['id'])) {
                    $memberId = $input['id'];
                }
            }

            if (!$memberId || !is_numeric($memberId)) {
                respond(['error' => 'Invalid or missing member ID'], 400);
            }

            // Get member details for logging before deletion
            $stmt = $pdo->prepare('SELECT fname, lname FROM `user` WHERE id = ?');
            $stmt->execute([$memberId]);
            $member = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$member) {
                respond(['error' => 'Member not found'], 404);
            }

            $pdo->beginTransaction();

            try {
                // Disable foreign key checks temporarily
                $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');

                // Delete all related records first (in correct order to avoid foreign key constraints)
                // Use try-catch for each deletion to handle cases where tables don't exist

                // 1. Delete coach assignments (if member was assigned to coaches)
                try {
                    $deleteCoachAssignments = $pdo->prepare("DELETE FROM coach_member_list WHERE member_id = ?");
                    $deleteCoachAssignments->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete coach assignments: " . $e->getMessage());
                }

                // 2. Delete notifications
                try {
                    $deleteNotifications = $pdo->prepare("DELETE FROM notification WHERE user_id = ?");
                    $deleteNotifications->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete notifications: " . $e->getMessage());
                }

                // 3. Delete attendance records
                try {
                    $deleteAttendance = $pdo->prepare("DELETE FROM attendance WHERE user_id = ?");
                    $deleteAttendance->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete attendance: " . $e->getMessage());
                }

                // 4. Delete subscription records
                try {
                    $deleteSubscriptions = $pdo->prepare("DELETE FROM subscriptions WHERE user_id = ?");
                    $deleteSubscriptions->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete subscriptions: " . $e->getMessage());
                }

                // 5. Delete sales records (if member made purchases)
                try {
                    $deleteSales = $pdo->prepare("DELETE FROM sales WHERE user_id = ?");
                    $deleteSales->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete sales: " . $e->getMessage());
                }

                // 6. Delete payment records
                try {
                    $deletePayments = $pdo->prepare("DELETE FROM payments WHERE user_id = ?");
                    $deletePayments->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete payments: " . $e->getMessage());
                }

                // 7. Delete member schedules
                try {
                    $deleteSchedules = $pdo->prepare("DELETE FROM member_schedules WHERE user_id = ?");
                    $deleteSchedules->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete member schedules: " . $e->getMessage());
                }

                // 8. Delete member sessions
                try {
                    $deleteSessions = $pdo->prepare("DELETE FROM member_sessions WHERE user_id = ?");
                    $deleteSessions->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete member sessions: " . $e->getMessage());
                }

                // 9. Delete from Members table (if it exists)
                try {
                    $deleteMember = $pdo->prepare("DELETE FROM members WHERE user_id = ?");
                    $deleteMember->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete from members table: " . $e->getMessage());
                }

                // 10. Finally delete from User table
                $stmt = $pdo->prepare('DELETE FROM `user` WHERE id = ? AND user_type_id = 4');
                $stmt->execute([$memberId]);

                // Re-enable foreign key checks
                $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

                $pdo->commit();

                // Log activity using centralized logger (same as monitor_subscription.php)
                $staffId = isset($input['staff_id']) ? $input['staff_id'] : null;
                error_log("DEBUG Member Delete - staffId: " . ($staffId ?? 'NULL') . " from request data");
                logStaffActivity($pdo, $staffId, "Delete Member", "Member deleted - {$member['fname']} {$member['lname']} (ID: {$memberId})", "Member Management");

                respond(['message' => 'Member and all related data deleted successfully']);

            } catch (PDOException $e) {
                $pdo->rollBack();
                error_log('Member deletion error: ' . $e->getMessage());
                error_log('Member deletion error code: ' . $e->getCode());
                error_log('Member deletion error info: ' . print_r($e->errorInfo, true));

                // Provide more specific error message based on error code
                $errorMessage = 'Failed to delete member. ';
                if ($e->getCode() == 23000) {
                    $errorMessage .= 'This member has related data that prevents deletion. All related records have been attempted to be removed.';
                } else {
                    $errorMessage .= 'Database error occurred during deletion.';
                }

                respond([
                    'error' => 'Database error: ' . $e->getMessage(),
                    'message' => $errorMessage,
                    'error_code' => $e->getCode()
                ], 500);
            }
        } catch (Exception $e) {
            error_log('DELETE section error: ' . $e->getMessage());
            respond(['error' => 'Unexpected error: ' . $e->getMessage()], 500);
        }
    }

    // If we reach here, it means the request didn't match any of the expected patterns
    error_log("DEBUG: PUT request didn't match expected patterns. Input: " . json_encode($input));
    respond(['error' => 'Invalid request format'], 400);

    respond(['error' => 'Method not allowed'], 405);
} catch (Throwable $e) {
    error_log('API error: ' . $e->getMessage());
    respond(['error' => 'Server error'], 500);
}
?>