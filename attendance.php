<?php
// Set timezone to Philippines
date_default_timezone_set('Asia/Manila');

require 'activity_logger.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

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
    // Set MySQL timezone to Philippines to match PHP timezone
    $pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Handle method override for servers that don't properly detect HTTP methods
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Read the raw input once and store it
$rawInput = file_get_contents('php://input');

// Check for POST data in multiple ways (server compatibility)
$hasPostData = !empty($rawInput) ||
    !empty($_POST) ||
    isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false ||
    isset($_SERVER['HTTP_CONTENT_TYPE']) && strpos($_SERVER['HTTP_CONTENT_TYPE'], 'application/json') !== false;

// If we have POST data, treat as POST regardless of detected method
if ($hasPostData) {
    $method = 'POST';
}

// Handle method override headers
if (isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
    $method = $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'];
} elseif (isset($_POST['_method'])) {
    $method = $_POST['_method'];
} elseif (isset($_GET['_method'])) {
    $method = $_GET['_method'];
}

$action = $_GET['action'] ?? '';

error_log("Request method: " . $method);
error_log("Request action: " . $action);
error_log("SERVER REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("SERVER CONTENT_TYPE: " . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));
error_log("SERVER HTTP_METHOD: " . ($_SERVER['HTTP_METHOD'] ?? 'not set'));

try {
    // Workaround for server that doesn't properly handle HTTP methods
    // Check if we have POST data first
    if ($hasPostData) {
        handlePostRequest($pdo, $rawInput);
    } else {
        // Handle as GET request
        handleGetRequest($pdo, $action);
    }
} catch (Throwable $e) {
    error_log("Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}

function handleGetRequest(PDO $pdo, string $action): void
{
    switch ($action) {
        case 'members':
            getMembers($pdo);
            break;
        case 'attendance':
            getAttendance($pdo);
            break;
        case 'qr_scan':
            // Handle QR scan via GET as workaround for server issues
            $qrData = $_GET['qr_data'] ?? '';
            if (empty($qrData)) {
                http_response_code(400);
                echo json_encode(['error' => 'QR data is required']);
                return;
            }
            handleQRScan($pdo, ['qr_data' => $qrData]);
            break;
        default:
            if (isset($_GET['members'])) {
                getMembers($pdo);
            } elseif (isset($_GET['view']) && $_GET['view'] === 'attendance') {
                getAttendance($pdo);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid action']);
            }
    }
}

function handlePostRequest(PDO $pdo, string $rawInput = ''): void
{
    // Use the raw input passed from main function, or read it if not provided
    if (empty($rawInput)) {
        $rawInput = file_get_contents('php://input');
    }

    error_log("Raw POST input: " . $rawInput);

    $input = json_decode($rawInput, true);
    if (!is_array($input)) {
        error_log("JSON decode failed: " . json_last_error_msg());
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON input', 'raw_input' => $rawInput]);
        return;
    }

    $action = $input['action'] ?? 'checkin';
    error_log("POST action: " . $action);

    switch ($action) {
        case 'checkin':
            recordAttendance($pdo, $input);
            break;
        case 'checkout':
            checkoutAttendance($pdo, $input);
            break;
        case 'qr_scan':
            handleQRScan($pdo, $input);
            break;
        default:
            if (isset($input['id']) || isset($input['user_id'])) {
                $input['user_id'] = $input['user_id'] ?? $input['id'];
                recordAttendance($pdo, $input);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid action or missing user_id']);
            }
    }
}

function getMembers(PDO $pdo): void
{
    $sql = "SELECT u.id, u.fname, u.lname, u.email, ut.type_name AS user_type
            FROM `user` u
            JOIN `usertype` ut ON u.user_type_id = ut.id
            WHERE u.user_type_id IN (3, 4)
            ORDER BY u.fname, u.lname";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $members = $stmt->fetchAll();

    echo json_encode($members ?: []);
}

function getAttendance(PDO $pdo): void
{
    try {
        // Get date filter if provided
        $dateFilter = $_GET['date'] ?? '';
        $whereClause = '';
        $params = [];

        if (!empty($dateFilter)) {
            $whereClause = "WHERE DATE(a.check_in) = ?";
            $params[] = $dateFilter;
        }

        // Get regular member attendance with plan information
        // Only users with monthly access (plan_id 2, 3, 5, 6) can have attendance
        $memberSql = "SELECT a.id, a.user_id, a.check_in, a.check_out,
                             CONCAT(u.fname, ' ', u.lname) AS name,
                             u.email,
                             'member' AS user_type,
                             (SELECT p.plan_name 
                              FROM subscription s
                              JOIN member_subscription_plan p ON s.plan_id = p.id
                              WHERE s.user_id = u.id 
                              AND s.status_id = 2 
                              AND s.end_date > NOW()
                              AND s.plan_id IN (2, 3, 5, 6)
                              ORDER BY s.end_date DESC
                              LIMIT 1) AS plan_name,
                             (SELECT s.plan_id 
                              FROM subscription s
                              WHERE s.user_id = u.id 
                              AND s.status_id = 2 
                              AND s.end_date > NOW()
                              AND s.plan_id IN (2, 3, 5, 6)
                              ORDER BY s.end_date DESC
                              LIMIT 1) AS plan_id,
                             CASE WHEN a.check_out IS NOT NULL
                                  THEN TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out)
                                  ELSE NULL
                             END AS duration_minutes
                      FROM `attendance` a
                      JOIN `user` u ON a.user_id = u.id
                      " . $whereClause . "
                      ORDER BY a.check_in DESC
                      LIMIT 50";

        $stmt = $pdo->prepare($memberSql);
        $stmt->execute($params);
        $memberAttendance = $stmt->fetchAll();

        // Get guest session attendance (approved and paid guests)
        $guestWhereClause = "WHERE gs.status = 'approved' AND gs.paid = 1";
        $guestParams = [];

        if (!empty($dateFilter)) {
            $guestWhereClause .= " AND DATE(gs.created_at) = ?";
            $guestParams[] = $dateFilter;
        }

        $guestSql = "SELECT gs.id, gs.id AS user_id, gs.created_at AS check_in, 
                        gs.valid_until AS check_out,
                        gs.guest_name AS name,
                        CONCAT(gs.guest_name, ' (', gs.guest_type, ')') AS email,
                        'guest' AS user_type,
                        CASE WHEN gs.valid_until < NOW()
                             THEN TIMESTAMPDIFF(MINUTE, gs.created_at, gs.valid_until)
                             ELSE NULL
                        END AS duration_minutes
                 FROM `guest_session` gs
                 " . $guestWhereClause . "
                 ORDER BY gs.created_at DESC
                 LIMIT 50";

        $stmt = $pdo->prepare($guestSql);
        $stmt->execute($guestParams);
        $guestAttendance = $stmt->fetchAll();

        // Combine and format all attendance
        $allAttendance = array_merge($memberAttendance, $guestAttendance);

        // Sort by check_in time (most recent first)
        usort($allAttendance, function ($a, $b) {
            return strtotime($b['check_in']) - strtotime($a['check_in']);
        });

        $formatted = array_map(function ($r) {
            $duration = null;
            if ($r['duration_minutes'] !== null) {
                $hours = floor($r['duration_minutes'] / 60);
                $mins = $r['duration_minutes'] % 60;
                $duration = $hours > 0 ? "{$hours}h {$mins}m" : "{$mins}m";
            }

            // Helper function to format datetime from database (already in PH timezone)
            $formatDateTime = function ($datetimeStr) {
                if (!$datetimeStr || $datetimeStr === '0000-00-00 00:00:00') {
                    return null;
                }
                // Create DateTime object, treating the database value as PH timezone
                $dt = new DateTime($datetimeStr, new DateTimeZone('Asia/Manila'));
                return $dt->format('M j, Y g:i A');
            };

            $checkOut = null;
            if ($r['user_type'] === 'guest') {
                // For guests, check if session has expired
                if ($r['check_out']) {
                    $checkOutTime = new DateTime($r['check_out'], new DateTimeZone('Asia/Manila'));
                    if ($checkOutTime->getTimestamp() < time()) {
                        $checkOut = $formatDateTime($r['check_out']) . ' (Expired)';
                    } else {
                        $checkOut = "Still in gym (Guest)";
                    }
                } else {
                    $checkOut = "Still in gym (Guest)";
                }
            } else {
                $checkOut = $r['check_out'] ? $formatDateTime($r['check_out']) : "Still in gym";
            }

            // Determine user type based on plan_name or plan_id
            // Plan ID 2 = Monthly with membership (Premium)
            // Plan ID 3 = Monthly standalone (Standard)
            // Plan IDs 5, 6 = Other monthly access plans (check plan_name)
            $planName = $r['plan_name'] ?? '';
            $planId = $r['plan_id'] ?? null;
            $planNameLower = strtolower($planName);

            // Determine if premium or standard
            $isPremium = false;
            $isStandard = false;

            if ($planId == 2) {
                // Plan ID 2 is always premium (Monthly with membership)
                $isPremium = true;
            } elseif ($planId == 3) {
                // Plan ID 3 is always standard (Monthly standalone)
                $isStandard = true;
            } elseif (!empty($planName)) {
                // For other plans (5, 6), check plan_name
                if (strpos($planNameLower, 'premium') !== false) {
                    $isPremium = true;
                } elseif (strpos($planNameLower, 'standard') !== false) {
                    $isStandard = true;
                } else {
                    // Default: if plan_name contains "monthly" or "access", check if it has "with membership" (premium) or not (standard)
                    if (strpos($planNameLower, 'monthly') !== false || strpos($planNameLower, 'access') !== false) {
                        if (strpos($planNameLower, 'with membership') !== false || strpos($planNameLower, 'membership') !== false) {
                            $isPremium = true;
                        } else {
                            $isStandard = true;
                        }
                    }
                }
            }

            return [
                'id' => $r['id'],
                'name' => $r['name'],
                'check_in' => $r['check_in'] ? $formatDateTime($r['check_in']) : null,
                'check_out' => $checkOut,
                'user_id' => $r['user_id'],
                'email' => $r['email'],
                'duration' => $duration,
                'user_type' => $r['user_type'],
                'plan_name' => $planName,
                'plan_id' => $planId,
                'is_premium' => $isPremium,
                'is_standard' => $isStandard,
            ];
        }, $allAttendance);

        echo json_encode($formatted ?: []);
    } catch (Exception $e) {
        error_log('Error in getAttendance: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch attendance data: ' . $e->getMessage()]);
    }
}

function handleQRScan(PDO $pdo, array $input): void
{
    $qrData = $input['qr_data'] ?? $input['scanned_data'] ?? '';
    if ($qrData === '') {
        echo json_encode(['success' => false, 'message' => 'QR data is required']);
        return;
    }

    // Debug logging removed

    // Guest QR scanning removed - guests will be handled through admin approval workflow

    $userId = null;
    if (strpos($qrData, 'CNERGY_ATTENDANCE:') === 0) {
        $userId = str_replace('CNERGY_ATTENDANCE:', '', $qrData);
    } elseif (is_numeric($qrData)) {
        $userId = $qrData;
    } elseif (strpos($qrData, '|') !== false) {
        $userId = explode('|', $qrData)[0];
    } else {
        // Use the already decoded JSON if available, otherwise decode again
        if (!isset($decoded)) {
            $decoded = json_decode($qrData, true);
        }
        if (is_array($decoded)) {
            // Only extract user_id if it's not a guest session
            if (!isset($decoded['session_id']) && !isset($decoded['qr_token'])) {
                $userId = $decoded['id'] ?? $decoded['user_id'] ?? null;
            }
        }
    }

    if (!$userId || !is_numeric($userId)) {
        echo json_encode(['success' => false, 'message' => 'Invalid QR code format']);
        return;
    }

    $userStmt = $pdo->prepare("SELECT id, fname, lname FROM `user` WHERE id = ?");
    $userStmt->execute([(int) $userId]);
    $user = $userStmt->fetch();

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        return;
    }

    // Check if user has an active gym access plan (IDs 2, 3, 5, 6)
    try {
        $planStmt = $pdo->prepare("
            SELECT s.id, s.plan_id, s.start_date, s.end_date, s.status_id,
                   p.plan_name, p.duration_months, p.duration_days
            FROM subscription s
            JOIN member_subscription_plan p ON s.plan_id = p.id
            WHERE s.user_id = ? 
            AND s.plan_id IN (2, 3, 5, 6)
            AND s.status_id = 2
            AND s.end_date > NOW()
            ORDER BY s.end_date DESC
            LIMIT 1
        ");
        $planStmt->execute([(int) $userId]);
        $activePlan = $planStmt->fetch();

        // Debug logging
        error_log("DEBUG: User ID: " . (int) $userId);
        error_log("DEBUG: Active plan found: " . ($activePlan ? 'YES' : 'NO'));
        if ($activePlan) {
            error_log("DEBUG: Plan details - ID: " . $activePlan['id'] . ", Plan ID: " . $activePlan['plan_id'] . ", Status: " . $activePlan['status_id'] . ", End Date: " . $activePlan['end_date']);
        }
    } catch (Exception $e) {
        error_log("ERROR in plan validation query: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Database error during plan validation: ' . $e->getMessage()]);
        return;
    }

    if (!$activePlan) {
        // Check if user has any expired plans to show expiration info
        try {
            $expiredPlanStmt = $pdo->prepare("
                SELECT s.end_date, p.plan_name
                FROM subscription s
                JOIN member_subscription_plan p ON s.plan_id = p.id
                WHERE s.user_id = ? 
                AND s.plan_id IN (2, 3, 5, 6)
                AND s.status_id = 2
                ORDER BY s.end_date DESC
                LIMIT 1
            ");
            $expiredPlanStmt->execute([(int) $userId]);
            $expiredPlan = $expiredPlanStmt->fetch();
        } catch (Exception $e) {
            error_log("ERROR in expired plan query: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Database error during expired plan check']);
            return;
        }

        if ($expiredPlan) {
            $expiredDate = date('M j, Y', strtotime($expiredPlan['end_date']));
            echo json_encode([
                'success' => false,
                'message' => "❌ {$user['fname']} {$user['lname']} - Gym access expired on {$expiredDate}",
                'type' => 'expired_plan',
                'user_name' => $user['fname'] . ' ' . $user['lname'],
                'expired_date' => $expiredDate,
                'plan_name' => $expiredPlan['plan_name']
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => "❌ {$user['fname']} {$user['lname']} - No active gym access plan found",
                'type' => 'no_plan',
                'user_name' => $user['fname'] . ' ' . $user['lname']
            ]);
        }
        return;
    }

    // First, check for any active sessions and clean up duplicates
    $allActiveStmt = $pdo->prepare("SELECT id, check_in FROM `attendance` WHERE user_id = ? AND check_out IS NULL ORDER BY check_in DESC");
    $allActiveStmt->execute([(int) $userId]);
    $allActiveSessions = $allActiveStmt->fetchAll();

    error_log("DEBUG: Found " . count($allActiveSessions) . " active sessions for user " . $userId);

    // If multiple active sessions exist, close all but the most recent one
    if (count($allActiveSessions) > 1) {
        error_log("DEBUG: Multiple active sessions found, cleaning up duplicates");
        $mostRecentSession = $allActiveSessions[0]; // Most recent is first due to ORDER BY check_in DESC

        // Close all sessions except the most recent one
        for ($i = 1; $i < count($allActiveSessions); $i++) {
            $duplicateId = $allActiveSessions[$i]['id'];
            // Use PHP date() to ensure correct timezone (Asia/Manila)
            $currentDateTime = date('Y-m-d H:i:s');
            $closeStmt = $pdo->prepare("UPDATE `attendance` SET check_out = ? WHERE id = ?");
            $closeStmt->execute([$currentDateTime, $duplicateId]);
            error_log("DEBUG: Closed duplicate session ID: " . $duplicateId);
        }

        $activeSession = $mostRecentSession;
    } elseif (count($allActiveSessions) == 1) {
        $activeSession = $allActiveSessions[0];
    } else {
        $activeSession = null;
    }

    // Also clean up any completed duplicate records (same check-in time)
    if ($activeSession) {
        $sessionTime = $activeSession['check_in'];
        $cleanupStmt = $pdo->prepare("
            SELECT id FROM `attendance` 
            WHERE user_id = ? 
            AND check_in = ? 
            AND check_out IS NOT NULL 
            AND id != ?
            ORDER BY id ASC
        ");
        $cleanupStmt->execute([(int) $userId, $sessionTime, $activeSession['id']]);
        $duplicateCompleted = $cleanupStmt->fetchAll();

        if (count($duplicateCompleted) > 0) {
            error_log("DEBUG: Found " . count($duplicateCompleted) . " completed duplicate records, cleaning up");
            foreach ($duplicateCompleted as $dup) {
                $deleteStmt = $pdo->prepare("DELETE FROM `attendance` WHERE id = ?");
                $deleteStmt->execute([$dup['id']]);
                error_log("DEBUG: Deleted duplicate completed record ID: " . $dup['id']);
            }
        }
    }

    // Debug logging
    error_log("DEBUG: Active session found: " . ($activeSession ? 'YES' : 'NO'));
    if ($activeSession) {
        error_log("DEBUG: Active session ID: " . $activeSession['id'] . ", Check-in: " . $activeSession['check_in']);
    }

    if ($activeSession) {
        $sessionDate = date('Y-m-d', strtotime($activeSession['check_in']));
        $currentDate = date('Y-m-d');
        $checkInTime = strtotime($activeSession['check_in']);
        $currentTime = time();
        $timeDifference = $currentTime - $checkInTime;

        error_log("DEBUG: Session date: " . $sessionDate . ", Current date: " . $currentDate);
        error_log("DEBUG: Session date < current date: " . ($sessionDate < $currentDate ? 'YES' : 'NO'));
        error_log("DEBUG: Time since check-in: " . $timeDifference . " seconds");

        if ($sessionDate < $currentDate) {
            // Auto checkout old session only (don't create new checkin)
            $updateStmt = $pdo->prepare("UPDATE `attendance` SET check_out = ? WHERE id = ?");
            $oldCheckoutTime = date('Y-m-d 23:59:59', strtotime($sessionDate));
            $updateStmt->execute([$oldCheckoutTime, $activeSession['id']]);

            $durationStmt = $pdo->prepare("SELECT TIMESTAMPDIFF(MINUTE, check_in, check_out) AS duration_minutes FROM `attendance` WHERE id = ?");
            $durationStmt->execute([$activeSession['id']]);
            $durationResult = $durationStmt->fetch();
            $minsTotal = (int) $durationResult['duration_minutes'];
            $duration_hours = floor($minsTotal / 60);
            $duration_mins = $minsTotal % 60;
            $formatted_duration = $duration_hours > 0 ? "{$duration_hours}h {$duration_mins}m" : "{$duration_mins}m";

            // Log activity using centralized logger (same as monitor_subscription.php)
            $staffId = $input['staff_id'] ?? null;
            error_log("DEBUG Attendance Auto Checkout - staffId: " . ($staffId ?? 'NULL') . " from request data");
            logStaffActivity($pdo, $staffId, "Auto Checkout", "Member {$user['fname']} {$user['lname']} auto checked out from " . date('M j', strtotime($sessionDate)) . " ({$formatted_duration})", "Attendance");

            echo json_encode([
                'success' => true,
                'action' => 'auto_checkout',
                'message' => $user['fname'] . ' ' . $user['lname'] . ' - Auto checked out from ' . date('M j', strtotime($sessionDate)) . ' (' . $formatted_duration . '). Please scan again to check in for today.',
                'user_name' => $user['fname'] . ' ' . $user['lname'],
                'old_session_date' => date('M j, Y', strtotime($sessionDate)),
                'old_session_duration' => $formatted_duration,
                'plan_info' => [
                    'plan_name' => $activePlan['plan_name'],
                    'expires_on' => date('M j, Y', strtotime($activePlan['end_date'])),
                    'days_remaining' => max(0, floor((strtotime($activePlan['end_date']) - time()) / (60 * 60 * 24)))
                ]
            ]);
        } else {
            // Check 30-second cooldown for checkout
            if ($timeDifference < 30) {
                $remainingTime = 30 - $timeDifference;
                error_log("DEBUG: Checkout cooldown active - " . $remainingTime . " seconds remaining");
                echo json_encode([
                    'success' => false,
                    'message' => "⏰ Please wait {$remainingTime} seconds before checking out",
                    'type' => 'cooldown',
                    'remaining_seconds' => $remainingTime
                ]);
                return;
            }

            error_log("DEBUG: Performing checkout for today's session");
            // Use PHP date() to ensure correct timezone (Asia/Manila) - capture before update
            $currentDateTime = date('Y-m-d H:i:s');
            $checkoutTimeFormatted = date('M j, Y g:i A');

            $updateStmt = $pdo->prepare("UPDATE `attendance` SET check_out = ? WHERE id = ?");
            $updateStmt->execute([$currentDateTime, $activeSession['id']]);

            $durationStmt = $pdo->prepare("SELECT TIMESTAMPDIFF(MINUTE, check_in, check_out) AS duration_minutes FROM `attendance` WHERE id = ?");
            $durationStmt->execute([$activeSession['id']]);
            $durationResult = $durationStmt->fetch();
            $minsTotal = (int) $durationResult['duration_minutes'];
            $duration_hours = floor($minsTotal / 60);
            $duration_mins = $minsTotal % 60;
            $formatted_duration = $duration_hours > 0 ? "{$duration_hours}h {$duration_mins}m" : "{$duration_mins}m";

            // Log activity using centralized logger (same as monitor_subscription.php)
            $staffId = $input['staff_id'] ?? null;
            error_log("DEBUG Attendance Checkout - staffId: " . ($staffId ?? 'NULL') . " from request data");
            logStaffActivity($pdo, $staffId, "Member Checkout", "Member {$user['fname']} {$user['lname']} checked out successfully! Session: {$formatted_duration}", "Attendance");

            echo json_encode([
                'success' => true,
                'action' => 'auto_checkout',
                'message' => $user['fname'] . ' ' . $user['lname'] . ' checked out successfully! Session: ' . $formatted_duration,
                'user_name' => $user['fname'] . ' ' . $user['lname'],
                'check_out' => $checkoutTimeFormatted,
                'check_out_time' => $checkoutTimeFormatted,
                'checkout_time' => $checkoutTimeFormatted,
                'duration' => $formatted_duration,
                'plan_info' => [
                    'plan_name' => $activePlan['plan_name'],
                    'expires_on' => date('M j, Y', strtotime($activePlan['end_date'])),
                    'days_remaining' => max(0, floor((strtotime($activePlan['end_date']) - time()) / (60 * 60 * 24)))
                ]
            ]);
        }
    } else {
        error_log("DEBUG: No active session found, checking if user already attended today");

        // Check if user already has attendance record for today (one per day limit)
        $todayAttendanceStmt = $pdo->prepare("
            SELECT id, check_in, check_out 
            FROM `attendance` 
            WHERE user_id = ? 
            AND DATE(check_in) = CURDATE()
            ORDER BY check_in DESC 
            LIMIT 1
        ");
        $todayAttendanceStmt->execute([(int) $userId]);
        $todayAttendance = $todayAttendanceStmt->fetch();

        if ($todayAttendance) {
            if ($todayAttendance['check_out'] === null) {
                // User has active session for today but it wasn't detected above (race condition)
                error_log("DEBUG: User has active session for today but wasn't detected, aborting");
                echo json_encode([
                    'success' => false,
                    'message' => 'You already have an active session for today',
                    'type' => 'already_checked_in'
                ]);
                return;
            } else {
                // User already completed attendance for today
                $checkOutTime = date('M j, Y g:i A', strtotime($todayAttendance['check_out']));
                error_log("DEBUG: User already attended today, completed at: " . $checkOutTime);
                echo json_encode([
                    'success' => false,
                    'message' => "You have already completed your attendance for today (checked out at {$checkOutTime})",
                    'type' => 'already_attended_today',
                    'check_out_time' => $checkOutTime
                ]);
                return;
            }
        }

        // Double-check that no active session exists (race condition protection)
        $finalCheckStmt = $pdo->prepare("SELECT id FROM `attendance` WHERE user_id = ? AND check_out IS NULL LIMIT 1");
        $finalCheckStmt->execute([(int) $userId]);
        $finalCheck = $finalCheckStmt->fetch();

        if ($finalCheck) {
            error_log("DEBUG: Race condition detected - active session found during final check, aborting new checkin");
            echo json_encode([
                'success' => false,
                'message' => 'Session conflict detected. Please try again.',
                'type' => 'session_conflict'
            ]);
            return;
        }

        // Use PHP date() to ensure correct timezone (Asia/Manila)
        $currentDateTime = date('Y-m-d H:i:s');
        $insertStmt = $pdo->prepare("INSERT INTO `attendance` (user_id, check_in) VALUES (?, ?)");
        $insertStmt->execute([(int) $userId, $currentDateTime]);
        $attendanceId = $pdo->lastInsertId();

        // Log activity using centralized logger (same as monitor_subscription.php)
        $staffId = $input['staff_id'] ?? null;
        error_log("DEBUG Attendance Checkin - staffId: " . ($staffId ?? 'NULL') . " from request data");
        logStaffActivity($pdo, $staffId, "Member Checkin", "Member {$user['fname']} {$user['lname']} checked in successfully!", "Attendance");

        echo json_encode([
            'success' => true,
            'action' => 'checkin',
            'message' => $user['fname'] . ' ' . $user['lname'] . ' checked in successfully!',
            'attendance_id' => $attendanceId,
            'user_name' => $user['fname'] . ' ' . $user['lname'],
            'check_in' => date('M j, Y g:i A'),
            'plan_info' => [
                'plan_name' => $activePlan['plan_name'],
                'expires_on' => date('M j, Y', strtotime($activePlan['end_date'])),
                'days_remaining' => max(0, floor((strtotime($activePlan['end_date']) - time()) / (60 * 60 * 24)))
            ]
        ]);
    }
}

function recordAttendance(PDO $pdo, array $input): void
{
    $userId = $input['user_id'] ?? null;
    if (!$userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User ID is required']);
        return;
    }

    $userStmt = $pdo->prepare("SELECT id, fname, lname FROM `user` WHERE id = ?");
    $userStmt->execute([(int) $userId]);
    $user = $userStmt->fetch();
    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        return;
    }

    $activeStmt = $pdo->prepare("SELECT id FROM `attendance` WHERE user_id = ? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1");
    $activeStmt->execute([(int) $userId]);
    if ($activeStmt->fetch()) {
        echo json_encode(['success' => false, 'message' => $user['fname'] . ' ' . $user['lname'] . ' is already checked in']);
        return;
    }

    // Use PHP date() to ensure correct timezone (Asia/Manila)
    $currentDateTime = date('Y-m-d H:i:s');
    $insertStmt = $pdo->prepare("INSERT INTO `attendance` (user_id, check_in) VALUES (?, ?)");
    $insertStmt->execute([(int) $userId, $currentDateTime]);
    $attendanceId = $pdo->lastInsertId();

    // Log activity using centralized logger (same as monitor_subscription.php)
    $staffId = $input['staff_id'] ?? null;
    error_log("DEBUG Attendance Record - staffId: " . ($staffId ?? 'NULL') . " from request data");
    logStaffActivity($pdo, $staffId, "Record Attendance", "Attendance recorded for member {$user['fname']} {$user['lname']}", "Attendance");

    echo json_encode([
        'success' => true,
        'message' => 'Attendance recorded successfully',
        'attendance_id' => $attendanceId,
        'user_name' => $user['fname'] . ' ' . $user['lname'],
        'check_in' => date('M j, Y g:i A')
    ]);
}

function checkoutAttendance(PDO $pdo, array $input): void
{
    $userId = $input['user_id'] ?? null;
    if (!$userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User ID is required']);
        return;
    }

    $activeStmt = $pdo->prepare("SELECT id FROM `attendance` WHERE user_id = ? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1");
    $activeStmt->execute([(int) $userId]);
    $activeSession = $activeStmt->fetch();
    if (!$activeSession) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No active session found for this user']);
        return;
    }

    // Use PHP date() to ensure correct timezone (Asia/Manila) - capture before update
    $currentDateTime = date('Y-m-d H:i:s');
    $checkoutTimeFormatted = date('M j, Y g:i A');

    $updateStmt = $pdo->prepare("UPDATE `attendance` SET check_out = ? WHERE id = ?");
    $updateStmt->execute([$currentDateTime, $activeSession['id']]);

    $userStmt = $pdo->prepare("SELECT fname, lname FROM `user` WHERE id = ?");
    $userStmt->execute([(int) $userId]);
    $user = $userStmt->fetch();

    // Log activity using centralized logger (same as monitor_subscription.php)
    $staffId = $input['staff_id'] ?? null;
    error_log("DEBUG Attendance Checkout Record - staffId: " . ($staffId ?? 'NULL') . " from request data");
    logStaffActivity($pdo, $staffId, "Record Checkout", "Checkout recorded for member {$user['fname']} {$user['lname']}", "Attendance");

    echo json_encode([
        'success' => true,
        'message' => 'Checkout recorded successfully',
        'user_name' => $user['fname'] . ' ' . $user['lname'],
        'check_out' => $checkoutTimeFormatted,
        'check_out_time' => $checkoutTimeFormatted,
        'checkout_time' => $checkoutTimeFormatted
    ]);
}

// Guest session QR scanning function removed - guests will be handled through admin approval workflow
