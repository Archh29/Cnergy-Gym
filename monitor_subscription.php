<?php
// Enhanced subscription management API - Complete solution for monitoring, approval, and manual creation
require 'activity_logger.php';

// CORS headers - allow specific origins
$allowed_origins = [
    'https://www.cnergy.site',
    'https://cnergy.site',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Database configuration - Online MySQL Database (matching session.php)
$host = "localhost";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";

// Connect to database
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    // Ensure proper UTF-8 encoding for special characters like peso sign
    $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    // Set MySQL timezone to Philippines
    $pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database connection failed",
        "message" => "Unable to connect to database"
    ]);
    exit;
}

// Get request method and data
$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);

// Get action from URL parameter or data
$action = $_GET['action'] ?? $data['action'] ?? '';

// Process request based on HTTP method and action
try {
    switch ($method) {
        case 'GET':
            if ($action === 'pending') {
                getPendingSubscriptions($pdo);
            } elseif ($action === 'plans') {
                getSubscriptionPlans($pdo);
            } elseif ($action === 'users') {
                getAvailableUsers($pdo);
            } elseif ($action === 'get-subscription' && isset($_GET['id'])) {
                getSubscriptionById($pdo, $_GET['id']);
            } elseif ($action === 'get-payments' && isset($_GET['subscription_id'])) {
                getSubscriptionPayments($pdo, $_GET['subscription_id']);
            } elseif ($action === 'get-subscription-history' && isset($_GET['user_id']) && isset($_GET['plan_id'])) {
                // Start output buffering to catch any unexpected output
                ob_start();
                try {
                    getSubscriptionHistory($pdo, $_GET['user_id'], $_GET['plan_id']);
                    ob_end_flush();
                } catch (Throwable $e) {
                    ob_end_clean();
                    http_response_code(500);
                    error_log("Fatal error in get-subscription-history endpoint: " . $e->getMessage());
                    error_log("Stack trace: " . $e->getTraceAsString());
                    header('Content-Type: application/json');
                    echo json_encode([
                        "success" => false,
                        "error" => "Fatal error",
                        "message" => $e->getMessage(),
                        "file" => $e->getFile(),
                        "line" => $e->getLine()
                    ]);
                }
            } elseif ($action === 'get-user-sales' && isset($_GET['user_id'])) {
                getUserSales($pdo, $_GET['user_id']);
            } elseif ($action === 'get-guest-sales' && isset($_GET['guest_session_id'])) {
                getGuestSessionSales($pdo, $_GET['guest_session_id']);
            } elseif ($action === 'available-plans' && isset($_GET['user_id'])) {
                getAvailablePlansForUser($pdo, $_GET['user_id']);
            } elseif (isset($_GET['user_id'])) {
                getUserSubscriptions($pdo, $_GET['user_id']);
            } else {
                getAllSubscriptions($pdo);
            }
            break;
        case 'POST':
            switch ($action) {
                case 'approve':
                    approveSubscription($pdo, $data);
                    break;
                case 'approve_with_payment':
                    approveSubscriptionWithPayment($pdo, $data);
                    break;
                case 'decline':
                    declineSubscription($pdo, $data);
                    break;
                case 'create_manual':
                    createManualSubscription($pdo, $data);
                    break;
                default:
                    http_response_code(400);
                    echo json_encode([
                        "success" => false,
                        "error" => "Invalid action",
                        "message" => "Supported actions: approve, decline, create_manual"
                    ]);
                    break;
            }
            break;
        case 'PUT':
            updateSubscription($pdo, $data);
            break;
        case 'DELETE':
            deleteSubscription($pdo, $data);
            break;
        default:
            http_response_code(405);
            echo json_encode([
                "success" => false,
                "error" => "Method not allowed",
                "message" => "HTTP method not supported"
            ]);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database error",
        "message" => $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Server error",
        "message" => $e->getMessage()
    ]);
}

function getAllSubscriptions($pdo)
{
    // Get only the most recent subscription per user per plan to prevent duplicates
    // CRITICAL: Only show subscriptions with confirmed payments
    // Check if subscription table has created_at column
    $checkCreatedAt = $pdo->query("SHOW COLUMNS FROM subscription LIKE 'created_at'");
    $hasCreatedAt = $checkCreatedAt->rowCount() > 0;

    $createdAtSelect = $hasCreatedAt
        ? "COALESCE(s.created_at, (SELECT sale.sale_date FROM sales sale WHERE sale.receipt_number = s.receipt_number AND sale.sale_type = 'Subscription' ORDER BY sale.sale_date ASC LIMIT 1), (SELECT sale2.sale_date FROM sales sale2 INNER JOIN sales_details sd ON sd.sale_id = sale2.id WHERE sd.subscription_id = s.id ORDER BY sale2.sale_date ASC LIMIT 1), (SELECT pay.payment_date FROM payment pay WHERE pay.subscription_id = s.id ORDER BY pay.payment_date ASC LIMIT 1), NOW())"
        : "COALESCE((SELECT sale.sale_date FROM sales sale WHERE sale.receipt_number = s.receipt_number AND sale.sale_type = 'Subscription' ORDER BY sale.sale_date ASC LIMIT 1), (SELECT sale2.sale_date FROM sales sale2 INNER JOIN sales_details sd ON sd.sale_id = sale2.id WHERE sd.subscription_id = s.id ORDER BY sale2.sale_date ASC LIMIT 1), (SELECT pay.payment_date FROM payment pay WHERE pay.subscription_id = s.id ORDER BY pay.payment_date ASC LIMIT 1), NOW())";

    $stmt = $pdo->query("
            SELECT s.id, s.start_date, s.end_date, s.discounted_price, s.amount_paid,
                   u.id as user_id, u.fname, u.mname, u.lname, u.email, u.profile_photo_url, u.system_photo_url, u.system_photo_url,
                   p.id as plan_id, p.plan_name, p.price, p.duration_months, p.duration_days,
                   st.id as status_id, st.status_name,
                   {$createdAtSelect} as created_at,
                   CASE 
                       WHEN st.status_name = 'pending_approval' THEN 'Pending Approval'
                       WHEN st.status_name = 'approved' AND s.end_date >= CURDATE() THEN 'Active'
                       WHEN st.status_name = 'approved' AND s.end_date < CURDATE() THEN 'Expired'
                       WHEN st.status_name = 'rejected' THEN 'Declined'
                       WHEN st.status_name = 'cancelled' THEN 'Cancelled'
                       WHEN st.status_name = 'expired' THEN 'Expired'
                       ELSE st.status_name
                   END as display_status
            FROM subscription s
            LEFT JOIN user u ON s.user_id = u.id
            JOIN member_subscription_plan p ON s.plan_id = p.id
            JOIN subscription_status st ON s.status_id = st.id
            WHERE s.id IN (
                SELECT MAX(s2.id) 
                FROM subscription s2
                GROUP BY s2.user_id, s2.plan_id
            )
            AND s.amount_paid > 0  -- CRITICAL: Only show subscriptions with payment
            AND EXISTS (
                SELECT 1 FROM payment pay 
                WHERE pay.subscription_id = s.id
            )  -- CRITICAL: Only show subscriptions with payment records
            ORDER BY s.id DESC
        ");

    $subscriptions = $stmt->fetchAll();

    // Recalculate end_date for Walk In plans and day-based plans
    date_default_timezone_set('Asia/Manila');
    foreach ($subscriptions as &$subscription) {
        $plan_id = $subscription['plan_id'];
        $plan_name = strtolower($subscription['plan_name'] ?? '');
        $duration_days = $subscription['duration_days'] ?? 0;

        // Special handling for Walk In plans (plan_id = 6 or plan_name = 'Walk In')
        // Walk In plans expire at 9 PM PH time on the same day
        if ($plan_id == 6 || $plan_name === 'walk in') {
            try {
                $start_date_obj = new DateTime($subscription['start_date'], new DateTimeZone('Asia/Manila'));
                $end_date_obj = clone $start_date_obj;
                $end_date_obj->setTime(21, 0, 0); // Set to 9 PM (21:00)
                $subscription['end_date'] = $end_date_obj->format('Y-m-d H:i:s');

                // Also update the display_status check for Walk In plans (use datetime comparison)
                $now = new DateTime('now', new DateTimeZone('Asia/Manila'));
                if ($subscription['status_name'] === 'approved' && $end_date_obj >= $now) {
                    $subscription['display_status'] = 'Active';
                } elseif ($subscription['status_name'] === 'approved' && $end_date_obj < $now) {
                    $subscription['display_status'] = 'Expired';
                }
            } catch (Exception $e) {
                error_log("Error recalculating Walk In end_date for subscription {$subscription['id']}: " . $e->getMessage());
            }
        }
        // Handle plans with duration_days (day-based plans)
        elseif (!empty($duration_days) && $duration_days > 0) {
            try {
                $start_date_obj = new DateTime($subscription['start_date'], new DateTimeZone('Asia/Manila'));
                $end_date_obj = clone $start_date_obj;
                $end_date_obj->add(new DateInterval('P' . intval($duration_days) . 'D'));
                $subscription['end_date'] = $end_date_obj->format('Y-m-d');
            } catch (Exception $e) {
                error_log("Error recalculating day-based end_date for subscription {$subscription['id']}: " . $e->getMessage());
            }
        }
    }
    unset($subscription); // Break reference

    // Expand package plans (plan_id 5) into individual plans (1 and 2)
    $expandedSubscriptions = [];
    foreach ($subscriptions as $subscription) {
        // If this is a package plan (plan_id 5), expand it into two rows
        if ($subscription['plan_id'] == 5) {
            try {
                // Get plan details for individual plans
                $plan1Stmt = $pdo->prepare("
                    SELECT id, plan_name, price, duration_months, duration_days
                    FROM member_subscription_plan
                    WHERE id = 1
                ");
                $plan1Stmt->execute();
                $plan1 = $plan1Stmt->fetch();

                $plan2Stmt = $pdo->prepare("
                    SELECT id, plan_name, price, duration_months, duration_days
                    FROM member_subscription_plan
                    WHERE id = 2
                ");
                $plan2Stmt->execute();
                $plan2 = $plan2Stmt->fetch();

                if ($plan1 && $plan2) {
                    // Calculate individual end dates based on each plan's duration
                    date_default_timezone_set('Asia/Manila');
                    $start_date_obj = new DateTime($subscription['start_date'], new DateTimeZone('Asia/Manila'));

                    // Plan 1 (Gym Membership) - typically 1 year duration
                    $end_date_1 = clone $start_date_obj;
                    if ($plan1['duration_months'] > 0) {
                        $end_date_1->add(new DateInterval('P' . intval($plan1['duration_months']) . 'M'));
                    } else {
                        // Default to 1 year if no duration specified
                        $end_date_1->add(new DateInterval('P1Y'));
                    }
                    $end_date_1_str = $end_date_1->format('Y-m-d');

                    // Plan 2 (Monthly Access) - typically 1 month duration
                    $end_date_2 = clone $start_date_obj;
                    if ($plan2['duration_months'] > 0) {
                        $end_date_2->add(new DateInterval('P' . intval($plan2['duration_months']) . 'M'));
                    } else {
                        // Default to 1 month if no duration specified
                        $end_date_2->add(new DateInterval('P1M'));
                    }
                    $end_date_2_str = $end_date_2->format('Y-m-d');

                    // Create subscription row for Plan 1 (Gym Membership)
                    $subscription1 = $subscription;
                    $subscription1['id'] = $subscription['id'] . '_plan1'; // Unique ID
                    $subscription1['plan_id'] = 1;
                    $subscription1['plan_name'] = $plan1['plan_name'];
                    $subscription1['price'] = $plan1['price'];
                    $subscription1['duration_months'] = $plan1['duration_months'];
                    $subscription1['duration_days'] = $plan1['duration_days'];
                    $subscription1['end_date'] = $end_date_1_str;
                    $subscription1['is_package_component'] = true;
                    $subscription1['package_subscription_id'] = $subscription['id'];
                    $subscription1['package_component'] = 'gym_membership';

                    // Update display_status for Plan 1
                    $now = new DateTime('now', new DateTimeZone('Asia/Manila'));
                    if ($subscription['status_name'] === 'approved' && $end_date_1 >= $now) {
                        $subscription1['display_status'] = 'Active';
                    } elseif ($subscription['status_name'] === 'approved' && $end_date_1 < $now) {
                        $subscription1['display_status'] = 'Expired';
                    }

                    // Create subscription row for Plan 2 (Monthly Access)
                    $subscription2 = $subscription;
                    $subscription2['id'] = $subscription['id'] . '_plan2'; // Unique ID
                    $subscription2['plan_id'] = 2;
                    $subscription2['plan_name'] = $plan2['plan_name'];
                    $subscription2['price'] = $plan2['price'];
                    $subscription2['duration_months'] = $plan2['duration_months'];
                    $subscription2['duration_days'] = $plan2['duration_days'];
                    $subscription2['end_date'] = $end_date_2_str;
                    $subscription2['is_package_component'] = true;
                    $subscription2['package_subscription_id'] = $subscription['id'];
                    $subscription2['package_component'] = 'monthly_access';

                    // Update display_status for Plan 2
                    if ($subscription['status_name'] === 'approved' && $end_date_2 >= $now) {
                        $subscription2['display_status'] = 'Active';
                    } elseif ($subscription['status_name'] === 'approved' && $end_date_2 < $now) {
                        $subscription2['display_status'] = 'Expired';
                    }

                    // Add both expanded subscriptions
                    $expandedSubscriptions[] = $subscription1;
                    $expandedSubscriptions[] = $subscription2;
                } else {
                    // If plans not found, keep original package plan
                    $expandedSubscriptions[] = $subscription;
                }
            } catch (Exception $e) {
                error_log("Error expanding package plan {$subscription['id']}: " . $e->getMessage());
                // If error, keep original package plan
                $expandedSubscriptions[] = $subscription;
            }
        } else {
            // Not a package plan, keep as is
            $expandedSubscriptions[] = $subscription;
        }
    }

    // Replace subscriptions with expanded list
    $subscriptions = $expandedSubscriptions;

    // Mark regular subscriptions and get payment info
    foreach ($subscriptions as &$subscription) {
        // Handle case where user might be NULL (if user was deleted)
        if (empty($subscription['user_id']) || empty($subscription['fname'])) {
            // If user data is missing, use subscription ID as identifier
            $subscription['user_id'] = $subscription['user_id'] ?? null;
            $subscription['fname'] = $subscription['fname'] ?? 'Unknown';
            $subscription['mname'] = $subscription['mname'] ?? '';
            $subscription['lname'] = $subscription['lname'] ?? 'User';
            $subscription['email'] = $subscription['email'] ?? null;
        }
        $subscription['is_guest_session'] = false;
        $subscription['subscription_type'] = 'regular';
        // Explicitly set is_package_component to false if not already set to true
        if (!isset($subscription['is_package_component']) || !$subscription['is_package_component']) {
            $subscription['is_package_component'] = false;
        }

        // For package components, use the original package subscription ID for payment lookup
        $paymentSubscriptionId = $subscription['package_subscription_id'] ?? $subscription['id'];

        // Remove the suffix from ID if it's a package component for payment lookup
        if (isset($subscription['is_package_component']) && $subscription['is_package_component']) {
            $paymentSubscriptionId = $subscription['package_subscription_id'];
        }

        try {
            // First, check if payment table has status column
            $checkColumnStmt = $pdo->query("SHOW COLUMNS FROM payment LIKE 'status'");
            $hasStatusColumn = $checkColumnStmt->rowCount() > 0;

            if ($hasStatusColumn) {
                // Query with status filter (check for both 'paid' and 'completed' for backward compatibility)
                $paymentStmt = $pdo->prepare("
                        SELECT COUNT(*) as payment_count, SUM(amount) as total_paid
                        FROM payment 
                        WHERE subscription_id = ? 
                        AND (status = 'paid' OR status = 'completed')
                    ");
            } else {
                // Query without status filter (assume all payments are completed)
                $paymentStmt = $pdo->prepare("
                        SELECT COUNT(*) as payment_count, SUM(amount) as total_paid
                        FROM payment 
                        WHERE subscription_id = ?
                    ");
            }

            $paymentStmt->execute([$paymentSubscriptionId]);
            $paymentInfo = $paymentStmt->fetch();

            $subscription['payments'] = [];
            $subscription['payment_count'] = $paymentInfo['payment_count'] ?? 0;

            // For package components, show the full payment amount (they share the same payment)
            // Or you could split it proportionally if needed
            $subscription['total_paid'] = $paymentInfo['total_paid'] ?? 0;

            // If no payments, set total_paid to 0
            if (!$subscription['total_paid']) {
                $subscription['total_paid'] = 0;
            }
        } catch (Exception $e) {
            // If payment table doesn't exist or has issues, set defaults
            $subscription['payments'] = [];
            $subscription['payment_count'] = 0;
            $subscription['total_paid'] = 0;
        }
    }
    unset($subscription); // Break reference

    // ============================================
    // ADD GUEST SESSIONS (DAY PASS WITHOUT ACCOUNT)
    // ============================================
    try {
        date_default_timezone_set('Asia/Manila');
        $now = new DateTime('now', new DateTimeZone('Asia/Manila'));

        // First, get Day Pass plan details from member_subscription_plan table
        $dayPassPlan = null;
        try {
            $planStmt = $pdo->query("
                SELECT id, plan_name, price, duration_months, duration_days
                FROM member_subscription_plan
                WHERE LOWER(plan_name) LIKE '%day pass%' 
                   OR LOWER(plan_name) LIKE '%walk in%'
                   OR id = 6
                ORDER BY id ASC
                LIMIT 1
            ");
            $dayPassPlan = $planStmt->fetch();
        } catch (Exception $e) {
            error_log("Error fetching Day Pass plan: " . $e->getMessage());
        }

        // Default values if plan not found
        $dayPassPlanId = $dayPassPlan['id'] ?? 6;
        $dayPassPlanName = $dayPassPlan['plan_name'] ?? 'Day Pass';
        $dayPassPrice = floatval($dayPassPlan['price'] ?? 150.00);
        $dayPassDurationMonths = intval($dayPassPlan['duration_months'] ?? 0);
        $dayPassDurationDays = intval($dayPassPlan['duration_days'] ?? 1);

        $guestStmt = $pdo->query("
            SELECT 
                gs.id,
                gs.guest_name,
                gs.guest_type,
                gs.amount_paid,
                gs.valid_until as end_date,
                gs.created_at as start_date,
                gs.created_at,
                gs.status,
                gs.paid,
                gs.receipt_number,
                gs.payment_method,
                gs.qr_token,
                gs.session_code,
                gs.cashier_id,
                gs.change_given
            FROM guest_session gs
            WHERE (gs.status = 'approved' AND gs.paid = 1)
            ORDER BY gs.created_at DESC
        ");

        $guestSessions = $guestStmt->fetchAll();

        // Transform guest sessions to match subscription format
        foreach ($guestSessions as $guest) {
            try {
                // Parse guest name
                $nameParts = explode(' ', trim($guest['guest_name']), 2);
                $fname = $nameParts[0] ?? '';
                $lname = $nameParts[1] ?? '';
                $mname = '';

                // Calculate end_date as 9 PM on the same day as created_at (same as Walk In plans)
                $start_date_obj = new DateTime($guest['created_at'], new DateTimeZone('Asia/Manila'));
                $end_date_obj = clone $start_date_obj;
                $end_date_obj->setTime(21, 0, 0); // Set to 9 PM (21:00)
                $calculated_end_date = $end_date_obj->format('Y-m-d H:i:s');

                // Determine display status based on calculated end date
                $displayStatus = 'Active';
                if ($end_date_obj < $now) {
                    $displayStatus = 'Expired';
                }

                // Create subscription-like object for guest session
                $guestSubscription = [
                    'id' => 'guest_' . $guest['id'],
                    'subscription_id' => null,
                    'guest_session_id' => $guest['id'],
                    'user_id' => null,
                    'fname' => $fname,
                    'mname' => $mname,
                    'lname' => $lname,
                    'email' => null,
                    'plan_id' => $dayPassPlanId,
                    'plan_name' => $dayPassPlanName,
                    'price' => $dayPassPrice,
                    'duration_months' => $dayPassDurationMonths,
                    'duration_days' => $dayPassDurationDays,
                    'start_date' => $guest['created_at'],
                    'end_date' => $calculated_end_date, // Use calculated 9 PM end date
                    'created_at' => $guest['created_at'],
                    'amount_paid' => floatval($guest['amount_paid']),
                    'discounted_price' => null,
                    'status_id' => null,
                    'status_name' => 'approved',
                    'display_status' => $displayStatus,
                    'is_guest_session' => true,
                    'subscription_type' => 'guest',
                    'guest_name' => $guest['guest_name'],
                    'guest_type' => $guest['guest_type'],
                    'receipt_number' => $guest['receipt_number'],
                    'payment_method' => $guest['payment_method'] ?? 'cash',
                    'qr_token' => $guest['qr_token'],
                    'session_code' => $guest['session_code'] ?? null,
                    'cashier_id' => $guest['cashier_id'],
                    'change_given' => floatval($guest['change_given'] ?? 0),
                    'paid' => $guest['paid'],
                    'payment_count' => 1,
                    'total_paid' => floatval($guest['amount_paid']),
                    'payments' => []
                ];

                $subscriptions[] = $guestSubscription;
            } catch (Exception $e) {
                error_log("Error processing guest session {$guest['id']}: " . $e->getMessage());
            }
        }
    } catch (Exception $e) {
        error_log("Error fetching guest sessions: " . $e->getMessage());
    }

    // Sort all subscriptions by created_at descending (newest first)
    // Use ID as secondary sort since guest sessions and subscriptions have different ID ranges
    usort($subscriptions, function ($a, $b) {
        // Primary sort: by created_at descending (newest first)
        $dateA = strtotime($a['created_at'] ?? '1970-01-01');
        $dateB = strtotime($b['created_at'] ?? '1970-01-01');

        if ($dateB !== $dateA) {
            return $dateB - $dateA;
        }

        // Secondary sort: by ID descending (higher ID = newer)
        // Extract numeric ID (handle guest_ prefix and guest_session_id)
        $idA = 0;
        $idB = 0;

        if (isset($a['is_guest_session']) && $a['is_guest_session']) {
            // For guest sessions, use guest_session_id if available
            $idA = isset($a['guest_session_id']) ? intval($a['guest_session_id']) :
                (is_numeric($a['id']) ? intval($a['id']) :
                    (strpos($a['id'] ?? '', 'guest_') === 0 ? intval(str_replace('guest_', '', $a['id'])) : 0));
        } else {
            // For regular subscriptions, use the subscription ID
            $idA = is_numeric($a['id']) ? intval($a['id']) :
                (strpos($a['id'] ?? '', 'guest_') === 0 ? intval(str_replace('guest_', '', $a['id'])) : 0);
        }

        if (isset($b['is_guest_session']) && $b['is_guest_session']) {
            // For guest sessions, use guest_session_id if available
            $idB = isset($b['guest_session_id']) ? intval($b['guest_session_id']) :
                (is_numeric($b['id']) ? intval($b['id']) :
                    (strpos($b['id'] ?? '', 'guest_') === 0 ? intval(str_replace('guest_', '', $b['id'])) : 0));
        } else {
            // For regular subscriptions, use the subscription ID
            $idB = is_numeric($b['id']) ? intval($b['id']) :
                (strpos($b['id'] ?? '', 'guest_') === 0 ? intval(str_replace('guest_', '', $b['id'])) : 0);
        }

        return $idB - $idA;
    });

    echo json_encode([
        "success" => true,
        "subscriptions" => $subscriptions,
        "count" => count($subscriptions),
        "message" => "Subscriptions retrieved successfully"
    ]);
}

function getPendingSubscriptions($pdo)
{
    // Get only the most recent pending request per user per plan to prevent duplicates
    // CRITICAL: Only show pending subscriptions that have payment amount set
    // Use payment_date from payment table as the actual request time, or fallback to subscription ID order
    // Check if subscription table has created_at column
    $checkCreatedAt = $pdo->query("SHOW COLUMNS FROM subscription LIKE 'created_at'");
    $hasCreatedAt = $checkCreatedAt->rowCount() > 0;

    $createdAtSelect = $hasCreatedAt
        ? "COALESCE(s.created_at, (SELECT sale.sale_date FROM sales sale WHERE sale.receipt_number = s.receipt_number AND sale.sale_type = 'Subscription' ORDER BY sale.sale_date ASC LIMIT 1), (SELECT sale2.sale_date FROM sales sale2 INNER JOIN sales_details sd ON sd.sale_id = sale2.id WHERE sd.subscription_id = s.id ORDER BY sale2.sale_date ASC LIMIT 1), (SELECT pay.payment_date FROM payment pay WHERE pay.subscription_id = s.id ORDER BY pay.payment_date ASC LIMIT 1), NOW())"
        : "COALESCE((SELECT sale.sale_date FROM sales sale WHERE sale.receipt_number = s.receipt_number AND sale.sale_type = 'Subscription' ORDER BY sale.sale_date ASC LIMIT 1), (SELECT sale2.sale_date FROM sales sale2 INNER JOIN sales_details sd ON sd.sale_id = sale2.id WHERE sd.subscription_id = s.id ORDER BY sale2.sale_date ASC LIMIT 1), (SELECT pay.payment_date FROM payment pay WHERE pay.subscription_id = s.id ORDER BY pay.payment_date ASC LIMIT 1), NOW())";

    $stmt = $pdo->prepare("
            SELECT s.id as subscription_id, s.start_date, s.end_date,
                   u.id as user_id, u.fname, u.mname, u.lname, u.email, u.profile_photo_url, u.system_photo_url, u.system_photo_url,
                   p.id as plan_id, p.plan_name, p.price, p.duration_months,
                   st.id as status_id, st.status_name,
                   {$createdAtSelect} as created_at
            FROM subscription s
            JOIN user u ON s.user_id = u.id
            JOIN member_subscription_plan p ON s.plan_id = p.id
            JOIN subscription_status st ON s.status_id = st.id
            WHERE st.status_name = 'pending_approval'
            AND s.amount_paid > 0  -- CRITICAL: Only show pending subscriptions with payment amount
            AND s.id IN (
                SELECT MAX(s2.id) 
                FROM subscription s2
                JOIN subscription_status st2 ON s2.status_id = st2.id
                WHERE st2.status_name = 'pending_approval'
                AND s2.amount_paid > 0  -- CRITICAL: Only consider pending subscriptions with payment
                GROUP BY s2.user_id, s2.plan_id
            )
            ORDER BY created_at DESC
        ");

    $stmt->execute();
    $pendingSubscriptions = $stmt->fetchAll();

    // Mark regular subscriptions
    foreach ($pendingSubscriptions as &$sub) {
        $sub['is_guest_session'] = false;
        $sub['subscription_type'] = 'regular';
    }
    unset($sub);

    // ============================================
    // ADD PENDING GUEST SESSIONS (DAY PASS WITHOUT ACCOUNT)
    // ============================================
    try {
        // First, get Day Pass plan details from member_subscription_plan table
        $dayPassPlan = null;
        try {
            $planStmt = $pdo->query("
                SELECT id, plan_name, price, duration_months, duration_days
                FROM member_subscription_plan
                WHERE LOWER(plan_name) LIKE '%day pass%' 
                   OR LOWER(plan_name) LIKE '%walk in%'
                   OR id = 6
                ORDER BY id ASC
                LIMIT 1
            ");
            $dayPassPlan = $planStmt->fetch();
        } catch (Exception $e) {
            error_log("Error fetching Day Pass plan: " . $e->getMessage());
        }

        // Default values if plan not found
        $dayPassPlanId = $dayPassPlan['id'] ?? 6;
        $dayPassPlanName = $dayPassPlan['plan_name'] ?? 'Day Pass';
        $dayPassPrice = floatval($dayPassPlan['price'] ?? 150.00);
        $dayPassDurationMonths = intval($dayPassPlan['duration_months'] ?? 0);
        $dayPassDurationDays = intval($dayPassPlan['duration_days'] ?? 1);

        $guestStmt = $pdo->query("
            SELECT 
                gs.id,
                gs.guest_name,
                gs.guest_type,
                gs.amount_paid,
                gs.valid_until as end_date,
                gs.created_at as start_date,
                gs.created_at,
                gs.status,
                gs.paid,
                gs.receipt_number,
                gs.payment_method,
                gs.qr_token,
                gs.cashier_id,
                gs.change_given
            FROM guest_session gs
            WHERE gs.status = 'pending' 
            OR (gs.status = 'approved' AND gs.paid = 0)
            ORDER BY gs.id DESC
        ");

        $pendingGuestSessions = $guestStmt->fetchAll();

        // Transform pending guest sessions to match subscription format
        foreach ($pendingGuestSessions as $guest) {
            try {
                // Parse guest name
                $nameParts = explode(' ', trim($guest['guest_name']), 2);
                $fname = $nameParts[0] ?? '';
                $lname = $nameParts[1] ?? '';
                $mname = '';

                // Calculate end_date as 9 PM on the same day as created_at (same as Walk In plans)
                date_default_timezone_set('Asia/Manila');
                $start_date_obj = new DateTime($guest['created_at'], new DateTimeZone('Asia/Manila'));
                $end_date_obj = clone $start_date_obj;
                $end_date_obj->setTime(21, 0, 0); // Set to 9 PM (21:00)
                $calculated_end_date = $end_date_obj->format('Y-m-d H:i:s');

                // Create subscription-like object for pending guest session
                $guestSubscription = [
                    'subscription_id' => 'guest_' . $guest['id'],
                    'id' => 'guest_' . $guest['id'],
                    'guest_session_id' => $guest['id'],
                    'user_id' => null,
                    'fname' => $fname,
                    'mname' => $mname,
                    'lname' => $lname,
                    'email' => null,
                    'plan_id' => $dayPassPlanId,
                    'plan_name' => $dayPassPlanName,
                    'price' => $dayPassPrice,
                    'duration_months' => $dayPassDurationMonths,
                    'duration_days' => $dayPassDurationDays,
                    'start_date' => $guest['created_at'],
                    'end_date' => $calculated_end_date, // Use calculated 9 PM end date
                    'created_at' => $guest['created_at'],
                    'status_id' => null,
                    'status_name' => $guest['status'] === 'pending' ? 'pending_approval' : 'pending_payment',
                    'is_guest_session' => true,
                    'subscription_type' => 'guest',
                    'guest_name' => $guest['guest_name'],
                    'guest_type' => $guest['guest_type'],
                    'amount_paid' => floatval($guest['amount_paid']),
                    'receipt_number' => $guest['receipt_number'],
                    'payment_method' => $guest['payment_method'] ?? 'cash',
                    'qr_token' => $guest['qr_token'],
                    'cashier_id' => $guest['cashier_id'],
                    'change_given' => floatval($guest['change_given'] ?? 0),
                    'paid' => $guest['paid']
                ];

                $pendingSubscriptions[] = $guestSubscription;
            } catch (Exception $e) {
                error_log("Error processing pending guest session {$guest['id']}: " . $e->getMessage());
            }
        }
    } catch (Exception $e) {
        error_log("Error fetching pending guest sessions: " . $e->getMessage());
    }

    // Sort all pending subscriptions by created_at descending
    usort($pendingSubscriptions, function ($a, $b) {
        $dateA = strtotime($a['created_at'] ?? '1970-01-01');
        $dateB = strtotime($b['created_at'] ?? '1970-01-01');
        return $dateB - $dateA;
    });

    // Debug logging
    if (count($pendingSubscriptions) > 0) {
        error_log("🔍 DEBUG getPendingSubscriptions - First subscription:");
        error_log("  - Subscription ID: " . $pendingSubscriptions[0]['subscription_id']);
        error_log("  - created_at: " . ($pendingSubscriptions[0]['created_at'] ?? 'NULL'));
        error_log("  - start_date: " . ($pendingSubscriptions[0]['start_date'] ?? 'NULL'));
        error_log("  - end_date: " . ($pendingSubscriptions[0]['end_date'] ?? 'NULL'));
        error_log("  - hasCreatedAt column: " . ($hasCreatedAt ? 'YES' : 'NO'));
    }

    echo json_encode([
        "success" => true,
        "data" => $pendingSubscriptions,
        "count" => count($pendingSubscriptions),
        "message" => "Pending subscriptions retrieved successfully",
        "debug" => [
            "has_created_at_column" => $hasCreatedAt,
            "first_subscription_created_at" => $pendingSubscriptions[0]['created_at'] ?? null,
            "first_subscription_start_date" => $pendingSubscriptions[0]['start_date'] ?? null
        ]
    ]);
}

function getSubscriptionPlans($pdo)
{
    $stmt = $pdo->query("
            SELECT 
                id,
                plan_name,
                price,
                duration_months,
                is_member_only,
                discounted_price
            FROM member_subscription_plan 
            ORDER BY price ASC
        ");

    $plans = $stmt->fetchAll();

    // Add features for each plan
    foreach ($plans as &$plan) {
        $featuresStmt = $pdo->prepare("
                SELECT feature_name, description 
                FROM subscription_feature 
                WHERE plan_id = ?
            ");
        $featuresStmt->execute([$plan['id']]);
        $plan['features'] = $featuresStmt->fetchAll();
    }

    echo json_encode([
        "success" => true,
        "plans" => $plans,
        "count" => count($plans)
    ]);
}

function getAvailableUsers($pdo)
{
    $stmt = $pdo->query("
            SELECT 
                id,
                fname,
                mname,
                lname,
                email,
                account_status
            FROM user 
            WHERE user_type_id = 4 AND account_status = 'approved'
            ORDER BY fname, lname
        ");

    $users = $stmt->fetchAll();

    echo json_encode([
        "success" => true,
        "users" => $users,
        "count" => count($users)
    ]);
}

function getSubscriptionById($pdo, $id)
{
    // Check if this is a guest session ID (starts with "guest_")
    if (strpos($id, 'guest_') === 0) {
        // Extract the actual guest session ID
        $guestId = str_replace('guest_', '', $id);

        try {
            $guestStmt = $pdo->prepare("
                SELECT 
                    gs.id,
                    gs.guest_name,
                    gs.guest_type,
                    gs.amount_paid,
                    gs.valid_until as end_date,
                    gs.created_at as start_date,
                    gs.created_at,
                    gs.status,
                    gs.paid,
                    gs.receipt_number,
                    gs.payment_method,
                    gs.qr_token,
                    gs.cashier_id,
                    gs.change_given
                FROM guest_session gs
                WHERE gs.id = ?
            ");

            $guestStmt->execute([$guestId]);
            $guest = $guestStmt->fetch();

            if (!$guest) {
                http_response_code(404);
                echo json_encode([
                    "success" => false,
                    "error" => "Guest session not found"
                ]);
                return;
            }

            // Get Day Pass plan details from member_subscription_plan table
            $dayPassPlan = null;
            try {
                $planStmt = $pdo->query("
                    SELECT id, plan_name, price, duration_months, duration_days
                    FROM member_subscription_plan
                    WHERE LOWER(plan_name) LIKE '%day pass%' 
                       OR LOWER(plan_name) LIKE '%walk in%'
                       OR id = 6
                    ORDER BY id ASC
                    LIMIT 1
                ");
                $dayPassPlan = $planStmt->fetch();
            } catch (Exception $e) {
                error_log("Error fetching Day Pass plan: " . $e->getMessage());
            }

            // Default values if plan not found
            $dayPassPlanId = $dayPassPlan['id'] ?? 6;
            $dayPassPlanName = $dayPassPlan['plan_name'] ?? 'Day Pass';
            $dayPassPrice = floatval($dayPassPlan['price'] ?? 150.00);
            $dayPassDurationMonths = intval($dayPassPlan['duration_months'] ?? 0);
            $dayPassDurationDays = intval($dayPassPlan['duration_days'] ?? 1);

            // Parse guest name
            $nameParts = explode(' ', trim($guest['guest_name']), 2);
            $fname = $nameParts[0] ?? '';
            $lname = $nameParts[1] ?? '';
            $mname = '';

            // Calculate end_date as 9 PM on the same day as created_at (same as Walk In plans)
            date_default_timezone_set('Asia/Manila');
            $now = new DateTime('now', new DateTimeZone('Asia/Manila'));
            $start_date_obj = new DateTime($guest['created_at'], new DateTimeZone('Asia/Manila'));
            $end_date_obj = clone $start_date_obj;
            $end_date_obj->setTime(21, 0, 0); // Set to 9 PM (21:00)
            $calculated_end_date = $end_date_obj->format('Y-m-d H:i:s');

            // Determine display status based on calculated end date
            $displayStatus = 'Active';
            if ($end_date_obj < $now) {
                $displayStatus = 'Expired';
            }

            // Transform to subscription format
            $subscription = [
                'id' => 'guest_' . $guest['id'],
                'subscription_id' => null,
                'guest_session_id' => $guest['id'],
                'user_id' => null,
                'fname' => $fname,
                'mname' => $mname,
                'lname' => $lname,
                'email' => null,
                'plan_id' => $dayPassPlanId,
                'plan_name' => $dayPassPlanName,
                'price' => $dayPassPrice,
                'duration_months' => $dayPassDurationMonths,
                'duration_days' => $dayPassDurationDays,
                'start_date' => $guest['created_at'],
                'end_date' => $calculated_end_date, // Use calculated 9 PM end date
                'created_at' => $guest['created_at'],
                'amount_paid' => floatval($guest['amount_paid']),
                'discounted_price' => null,
                'status_id' => null,
                'status_name' => $guest['status'] === 'approved' ? 'approved' : $guest['status'],
                'display_status' => $displayStatus,
                'is_guest_session' => true,
                'subscription_type' => 'guest',
                'guest_name' => $guest['guest_name'],
                'guest_type' => $guest['guest_type'],
                'receipt_number' => $guest['receipt_number'],
                'payment_method' => $guest['payment_method'] ?? 'cash',
                'qr_token' => $guest['qr_token'],
                'cashier_id' => $guest['cashier_id'],
                'change_given' => floatval($guest['change_given'] ?? 0),
                'paid' => $guest['paid'],
                'payment_count' => 1,
                'total_paid' => floatval($guest['amount_paid']),
                'payments' => []
            ];

            echo json_encode([
                "success" => true,
                "subscription" => $subscription
            ]);
            return;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error" => "Error fetching guest session: " . $e->getMessage()
            ]);
            return;
        }
    }

    // Regular subscription lookup
    $stmt = $pdo->prepare("
            SELECT s.id, s.user_id, s.plan_id, s.start_date, s.end_date, s.amount_paid, s.discounted_price,
                   u.fname, u.mname, u.lname, u.email, u.profile_photo_url, u.system_photo_url, u.system_photo_url,
                   p.plan_name, p.price, p.duration_months,
                   st.status_name
            FROM subscription s
            JOIN user u ON s.user_id = u.id
            JOIN member_subscription_plan p ON s.plan_id = p.id
            JOIN subscription_status st ON s.status_id = st.id
            WHERE s.id = ?
        ");

    $stmt->execute([$id]);
    $subscription = $stmt->fetch();

    if (!$subscription) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "error" => "Subscription not found"
        ]);
        return;
    }

    // Mark as regular subscription
    $subscription['is_guest_session'] = false;
    $subscription['subscription_type'] = 'regular';

    echo json_encode([
        "success" => true,
        "subscription" => $subscription
    ]);
}

function getUserSubscriptions($pdo, $user_id)
{
    $stmt = $pdo->prepare("
            SELECT 
                s.id,
                s.start_date,
                s.end_date,
                s.discounted_price,
                p.id as plan_id,
                p.plan_name,
                p.price as original_price,
                p.price,
                p.duration_months,
                p.duration_days,
                ss.status_name,
                CASE 
                    WHEN ss.status_name = 'approved' AND s.end_date >= CURDATE() THEN 'Active'
                    WHEN ss.status_name = 'approved' AND s.end_date < CURDATE() THEN 'Expired'
                    ELSE ss.status_name
                END as display_status
            FROM subscription s
            JOIN member_subscription_plan p ON s.plan_id = p.id
            JOIN subscription_status ss ON s.status_id = ss.id
            WHERE s.user_id = ?
            AND s.amount_paid > 0  -- CRITICAL: Only show subscriptions with payment
            AND EXISTS (
                SELECT 1 FROM payment pay 
                WHERE pay.subscription_id = s.id
            )  -- CRITICAL: Only show subscriptions with payment records
            ORDER BY s.start_date DESC
        ");

    $stmt->execute([$user_id]);
    $subscriptions = $stmt->fetchAll();

    // Expand package plans (plan_id 5) into individual plans (1 and 2)
    $expandedSubscriptions = [];
    foreach ($subscriptions as $subscription) {
        // If this is a package plan (plan_id 5), expand it into two rows
        if ($subscription['plan_id'] == 5) {
            try {
                // Get plan details for individual plans
                $plan1Stmt = $pdo->prepare("
                    SELECT id, plan_name, price, duration_months, duration_days
                    FROM member_subscription_plan
                    WHERE id = 1
                ");
                $plan1Stmt->execute();
                $plan1 = $plan1Stmt->fetch();

                $plan2Stmt = $pdo->prepare("
                    SELECT id, plan_name, price, duration_months, duration_days
                    FROM member_subscription_plan
                    WHERE id = 2
                ");
                $plan2Stmt->execute();
                $plan2 = $plan2Stmt->fetch();

                if ($plan1 && $plan2) {
                    // Calculate individual end dates based on each plan's duration
                    date_default_timezone_set('Asia/Manila');
                    $start_date_obj = new DateTime($subscription['start_date'], new DateTimeZone('Asia/Manila'));

                    // Plan 1 (Gym Membership) - typically 1 year duration
                    $end_date_1 = clone $start_date_obj;
                    if ($plan1['duration_months'] > 0) {
                        $end_date_1->add(new DateInterval('P' . intval($plan1['duration_months']) . 'M'));
                    } else {
                        // Default to 1 year if no duration specified
                        $end_date_1->add(new DateInterval('P1Y'));
                    }
                    $end_date_1_str = $end_date_1->format('Y-m-d');

                    // Plan 2 (Monthly Access) - typically 1 month duration
                    $end_date_2 = clone $start_date_obj;
                    if ($plan2['duration_months'] > 0) {
                        $end_date_2->add(new DateInterval('P' . intval($plan2['duration_months']) . 'M'));
                    } else {
                        // Default to 1 month if no duration specified
                        $end_date_2->add(new DateInterval('P1M'));
                    }
                    $end_date_2_str = $end_date_2->format('Y-m-d');

                    // Create subscription row for Plan 1 (Gym Membership)
                    $subscription1 = $subscription;
                    $subscription1['id'] = $subscription['id'] . '_plan1'; // Unique ID
                    $subscription1['plan_id'] = 1;
                    $subscription1['plan_name'] = $plan1['plan_name'];
                    $subscription1['price'] = $plan1['price'];
                    $subscription1['original_price'] = $plan1['price'];
                    $subscription1['duration_months'] = $plan1['duration_months'];
                    $subscription1['duration_days'] = $plan1['duration_days'];
                    $subscription1['end_date'] = $end_date_1_str;
                    $subscription1['is_package_component'] = true;
                    $subscription1['package_subscription_id'] = $subscription['id'];
                    $subscription1['package_component'] = 'gym_membership';

                    // Update display_status for Plan 1
                    $now = new DateTime('now', new DateTimeZone('Asia/Manila'));
                    if ($subscription['status_name'] === 'approved' && $end_date_1 >= $now) {
                        $subscription1['display_status'] = 'Active';
                    } elseif ($subscription['status_name'] === 'approved' && $end_date_1 < $now) {
                        $subscription1['display_status'] = 'Expired';
                    }

                    // Create subscription row for Plan 2 (Monthly Access)
                    $subscription2 = $subscription;
                    $subscription2['id'] = $subscription['id'] . '_plan2'; // Unique ID
                    $subscription2['plan_id'] = 2;
                    $subscription2['plan_name'] = $plan2['plan_name'];
                    $subscription2['price'] = $plan2['price'];
                    $subscription2['original_price'] = $plan2['price'];
                    $subscription2['duration_months'] = $plan2['duration_months'];
                    $subscription2['duration_days'] = $plan2['duration_days'];
                    $subscription2['end_date'] = $end_date_2_str;
                    $subscription2['is_package_component'] = true;
                    $subscription2['package_subscription_id'] = $subscription['id'];
                    $subscription2['package_component'] = 'monthly_access';

                    // Update display_status for Plan 2
                    if ($subscription['status_name'] === 'approved' && $end_date_2 >= $now) {
                        $subscription2['display_status'] = 'Active';
                    } elseif ($subscription['status_name'] === 'approved' && $end_date_2 < $now) {
                        $subscription2['display_status'] = 'Expired';
                    }

                    // Add both expanded subscriptions
                    $expandedSubscriptions[] = $subscription1;
                    $expandedSubscriptions[] = $subscription2;
                } else {
                    // If plans not found, keep original package plan
                    $expandedSubscriptions[] = $subscription;
                }
            } catch (Exception $e) {
                error_log("Error expanding package plan {$subscription['id']}: " . $e->getMessage());
                // If error, keep original package plan
                $expandedSubscriptions[] = $subscription;
            }
        } else {
            // Not a package plan, keep as is
            $expandedSubscriptions[] = $subscription;
        }
    }

    // Replace subscriptions with expanded list
    $subscriptions = $expandedSubscriptions;

    echo json_encode([
        "success" => true,
        "subscriptions" => $subscriptions,
        "count" => count($subscriptions)
    ]);
}

function getAvailablePlansForUser($pdo, $user_id)
{
    // Get user's active subscriptions with plan details
    // CRITICAL: Only consider subscriptions with confirmed payments
    $activeSubscriptionsStmt = $pdo->prepare("
            SELECT s.id, s.plan_id, s.start_date, s.end_date, p.plan_name, p.price, p.duration_months, p.duration_days, ss.status_name
            FROM subscription s
            JOIN subscription_status ss ON s.status_id = ss.id
            JOIN member_subscription_plan p ON s.plan_id = p.id
            WHERE s.user_id = ? 
            AND ss.status_name = 'approved' 
            AND s.end_date >= CURDATE()
            AND s.amount_paid > 0  -- CRITICAL: Only consider subscriptions with payment
            AND EXISTS (
                SELECT 1 FROM payment p 
                WHERE p.subscription_id = s.id
            )  -- CRITICAL: Only consider subscriptions with payment records
            ORDER BY s.plan_id
        ");
    $activeSubscriptionsStmt->execute([$user_id]);
    $activeSubscriptions = $activeSubscriptionsStmt->fetchAll();

    // Check for Plan ID 5 (package) in original subscriptions before expansion
    $originalActivePlanIds = array_column($activeSubscriptions, 'plan_id');
    $hasActivePlan5 = in_array(5, $originalActivePlanIds);

    // Expand package plans (plan_id 5) into individual plans (1 and 2)
    $expandedActiveSubscriptions = [];
    foreach ($activeSubscriptions as $subscription) {
        // If this is a package plan (plan_id 5), expand it into two rows
        if ($subscription['plan_id'] == 5) {
            try {
                // Get plan details for individual plans
                $plan1Stmt = $pdo->prepare("
                    SELECT id, plan_name, price, duration_months, duration_days
                    FROM member_subscription_plan
                    WHERE id = 1
                ");
                $plan1Stmt->execute();
                $plan1 = $plan1Stmt->fetch();

                $plan2Stmt = $pdo->prepare("
                    SELECT id, plan_name, price, duration_months, duration_days
                    FROM member_subscription_plan
                    WHERE id = 2
                ");
                $plan2Stmt->execute();
                $plan2 = $plan2Stmt->fetch();

                if ($plan1 && $plan2) {
                    // Calculate individual end dates based on each plan's duration
                    date_default_timezone_set('Asia/Manila');
                    $start_date_obj = new DateTime($subscription['start_date'], new DateTimeZone('Asia/Manila'));

                    // Plan 1 (Gym Membership) - typically 1 year duration
                    $end_date_1 = clone $start_date_obj;
                    if ($plan1['duration_months'] > 0) {
                        $end_date_1->add(new DateInterval('P' . intval($plan1['duration_months']) . 'M'));
                    } else {
                        // Default to 1 year if no duration specified
                        $end_date_1->add(new DateInterval('P1Y'));
                    }
                    $end_date_1_str = $end_date_1->format('Y-m-d');

                    // Plan 2 (Monthly Access) - typically 1 month duration
                    $end_date_2 = clone $start_date_obj;
                    if ($plan2['duration_months'] > 0) {
                        $end_date_2->add(new DateInterval('P' . intval($plan2['duration_months']) . 'M'));
                    } else {
                        // Default to 1 month if no duration specified
                        $end_date_2->add(new DateInterval('P1M'));
                    }
                    $end_date_2_str = $end_date_2->format('Y-m-d');

                    // Create subscription row for Plan 1 (Gym Membership)
                    $subscription1 = $subscription;
                    $subscription1['id'] = $subscription['id'] . '_plan1'; // Unique ID
                    $subscription1['plan_id'] = 1;
                    $subscription1['plan_name'] = $plan1['plan_name'];
                    $subscription1['price'] = $plan1['price'];
                    $subscription1['duration_months'] = $plan1['duration_months'];
                    $subscription1['duration_days'] = $plan1['duration_days'];
                    $subscription1['end_date'] = $end_date_1_str;
                    $subscription1['is_package_component'] = true;
                    $subscription1['package_subscription_id'] = $subscription['id'];
                    $subscription1['package_component'] = 'gym_membership';
                    $subscription1['display_status'] = 'Active';

                    // Create subscription row for Plan 2 (Monthly Access)
                    $subscription2 = $subscription;
                    $subscription2['id'] = $subscription['id'] . '_plan2'; // Unique ID
                    $subscription2['plan_id'] = 2;
                    $subscription2['plan_name'] = $plan2['plan_name'];
                    $subscription2['price'] = $plan2['price'];
                    $subscription2['duration_months'] = $plan2['duration_months'];
                    $subscription2['duration_days'] = $plan2['duration_days'];
                    $subscription2['end_date'] = $end_date_2_str;
                    $subscription2['is_package_component'] = true;
                    $subscription2['package_subscription_id'] = $subscription['id'];
                    $subscription2['package_component'] = 'monthly_access';
                    $subscription2['display_status'] = 'Active';

                    // Add both expanded subscriptions
                    $expandedActiveSubscriptions[] = $subscription1;
                    $expandedActiveSubscriptions[] = $subscription2;
                } else {
                    // If plans not found, keep original package plan
                    $expandedActiveSubscriptions[] = $subscription;
                }
            } catch (Exception $e) {
                error_log("Error expanding package plan {$subscription['id']}: " . $e->getMessage());
                // If error, keep original package plan
                $expandedActiveSubscriptions[] = $subscription;
            }
        } else {
            // Not a package plan, keep as is
            $expandedActiveSubscriptions[] = $subscription;
        }
    }

    // Replace active subscriptions with expanded list
    $activeSubscriptions = $expandedActiveSubscriptions;
    $activePlanIds = array_column($activeSubscriptions, 'plan_id');

    // Note: $hasActivePlan5 was already determined from original subscriptions before expansion

    // Check if Plan ID 1 exists (either standalone or from Plan ID 5 package)
    $hasActiveMemberFee = in_array(1, $activePlanIds) || $hasActivePlan5;

    // Check if user has active monthly subscription (Premium or Standard)
    $hasActiveMonthlySubscription = in_array(2, $activePlanIds) || in_array(3, $activePlanIds);

    // Check if user has ONLY Plan ID 6 active (for Plan ID 5 availability)
    $hasOnlyPlan6 = count($activePlanIds) === 1 && in_array(6, $activePlanIds);
    $hasNoActivePlans = count($activePlanIds) === 0;

    // Get all subscription plans
    $plansStmt = $pdo->query("
            SELECT 
                id,
                plan_name,
                price,
                duration_months,
                duration_days,
                is_member_only,
                discounted_price
            FROM member_subscription_plan 
            ORDER BY price ASC
        ");
    $allPlans = $plansStmt->fetchAll();

    $plansWithAvailability = [];

    foreach ($allPlans as $plan) {
        $planId = $plan['id'];
        $planNameLower = strtolower($plan['plan_name'] ?? '');
        $isPlanActive = in_array($planId, $activePlanIds);

        // Check if this is a Gym Session/Day Pass plan
        $isGymSessionPlan = ($planId == 6 ||
            $planNameLower === 'walk in' ||
            $planNameLower === 'day pass' ||
            $planNameLower === 'gym session' ||
            $planNameLower === 'session');

        // Initialize plan with availability info
        $plan['is_available'] = true;
        $plan['unavailable_reason'] = null;

        // Plan ID 5 (Gym Membership + 1 Month Package)
        if ($planId == 5) {
            // Available if: user has no active plans OR only Plan ID 6 is active
            if ($hasNoActivePlans || $hasOnlyPlan6) {
                $plan['is_available'] = true;
            } else {
                $plan['is_available'] = false;
                $plan['unavailable_reason'] = "Only available for new clients with no active subscriptions (except Gym Session)";
            }
        }
        // Plan ID 1 (Gym Membership) - Always available for advance payment/renewal
        elseif ($planId == 1) {
            $plan['is_available'] = true;
            // No reason needed - always available
        }
        // Plan ID 2 (Member Plan Monthly / Monthly Access Premium) - Requires active membership
        elseif ($planId == 2) {
            // Check if this plan is already active (allow renewal/advance payment)
            $isPlanActive = in_array(2, $activePlanIds);

            if ($isPlanActive) {
                // If plan is active, allow renewal/advance payment
                $plan['is_available'] = true;
            } else {
                // If plan is NOT active: Requires active membership (Plan ID 1 or Plan ID 5)
                if (!$hasActiveMemberFee && !$hasActivePlan5) {
                    $plan['is_available'] = false;
                    $plan['unavailable_reason'] = "Cannot select: Monthly Access Premium requires an active Gym Membership. Please avail Gym Membership (Plan ID 1) or Gym Membership + 1 Month Access Package (Plan ID 5) first.";
                } else {
                    // User has membership, allow Monthly Access Premium
                    $plan['is_available'] = true;
                }
            }
        }
        // Plan ID 3 (Non-Member Plan Monthly)
        elseif ($planId == 3) {
            // If plan is active, allow renewal
            if ($isPlanActive) {
                $plan['is_available'] = true;
            } else {
                // If plan is NOT active: Locked if user has membership fee OR combination package
                if ($hasActiveMemberFee || $hasActivePlan5) {
                    $plan['is_available'] = false;
                    $plan['unavailable_reason'] = $hasActivePlan5
                        ? "Cannot select: User has the Membership + 1 Month Access package which includes membership. Consider the Member Monthly Plan for better value with member discounts."
                        : "Cannot select: User already has Gym Membership (Plan ID 1). Consider the Member Monthly Plan for better value with member discounts.";
                }
                // Locked if user has active monthly plan
                elseif ($hasActiveMonthlySubscription) {
                    $plan['is_available'] = false;
                    $plan['unavailable_reason'] = "Cannot select: User has an active monthly subscription. Please wait for it to expire before switching plans.";
                } else {
                    $plan['is_available'] = true;
                }
            }
        }
        // Plan ID 6 (Gym Session / Day Pass)
        elseif ($isGymSessionPlan) {
            // If plan is active, allow renewal
            if ($isPlanActive) {
                $plan['is_available'] = true;
            } else {
                // If plan is NOT active: Locked if user has active monthly plans (2, 3, or 5)
                if ($hasActiveMonthlySubscription || $hasActivePlan5) {
                    $plan['is_available'] = false;
                    $plan['unavailable_reason'] = $hasActivePlan5
                        ? "Cannot select: User has the Membership + 1 Month Access package which includes monthly access. Day Pass is not available while you have monthly access."
                        : "Cannot select: User has an active monthly subscription. Please wait for it to expire before purchasing a Day Pass.";
                }
                // Locked if user has active day pass
                elseif (in_array(6, $activePlanIds)) {
                    $plan['is_available'] = false;
                    $plan['unavailable_reason'] = "Cannot select: User already has an active Day Pass. Please wait for it to expire before purchasing another one.";
                } else {
                    $plan['is_available'] = true;
                }
            }
        }
        // Other plans - Always available (for advance payment/renewal)
        else {
            $plan['is_available'] = true;
            // No reason needed - always available
        }

        $plansWithAvailability[] = $plan;
    }

    echo json_encode([
        "success" => true,
        "plans" => $plansWithAvailability,
        "count" => count($plansWithAvailability),
        "active_plan_ids" => $activePlanIds,
        "active_subscriptions" => $activeSubscriptions,
        "has_active_member_fee" => $hasActiveMemberFee
    ]);
}

function createManualSubscription($pdo, $data)
{
    // Validate required fields
    $required_fields = ['user_id', 'plan_id', 'start_date', 'amount_paid'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "Missing required field: $field"
            ]);
            return;
        }
    }

    $user_id = $data['user_id'];
    $plan_id = $data['plan_id'];
    $start_date = $data['start_date'];
    $payment_amount = floatval($data['amount_paid']); // Frontend sends 'amount_paid'
    $discount_type = $data['discount_type'] ?? 'none';
    $created_by = $data['created_by'] ?? 'admin';
    $quantity = isset($data['quantity']) ? intval($data['quantity']) : 1; // Quantity for advance payment/renewal

    // Automatically check user discount eligibility for plan_id 2, 3, or 5 (Monthly plans or package with monthly access)
    // Plan ID 5 includes Monthly Access Premium, so discount should apply
    // Only override if discount_type is 'none' and plan is eligible
    if ($discount_type === 'none' && ($plan_id == 2 || $plan_id == 3 || $plan_id == 5)) {
        try {
            $discountStmt = $pdo->prepare("
                SELECT discount_type
                FROM user_discount_eligibility
                WHERE user_id = ? 
                AND is_active = 1
                AND (expires_at IS NULL OR expires_at >= CURDATE())
                ORDER BY 
                    CASE discount_type 
                        WHEN 'senior' THEN 1 
                        WHEN 'student' THEN 2 
                    END
                LIMIT 1
            ");
            $discountStmt->execute([$user_id]);
            $userDiscount = $discountStmt->fetch();

            if ($userDiscount && !empty($userDiscount['discount_type'])) {
                $discount_type = $userDiscount['discount_type'];
            }
        } catch (Exception $e) {
            error_log("Error checking user discount eligibility: " . $e->getMessage());
            // Continue with 'none' if there's an error
        }
    }

    // Get PayMongo payment fields
    $paymentIntentId = $data['payment_intent_id'] ?? null;
    $paymentLinkId = $data['payment_link_id'] ?? null;

    // Auto-detect payment method: if payment_link_id or payment_intent_id exists, it's a digital/PayMongo payment
    // Otherwise, use the provided payment_method or default to 'cash'
    if (!empty($paymentLinkId) || !empty($paymentIntentId)) {
        $paymentMethod = $data['payment_method'] ?? 'digital'; // PayMongo payment = digital
    } else {
        $paymentMethod = $data['payment_method'] ?? 'cash';
    }

    // Normalize payment method: digital -> gcash (both are GCash)
    if (strtolower($paymentMethod) === 'digital') {
        $paymentMethod = 'gcash';
    }

    // Get reference number for GCash payments
    $referenceNumber = null;
    if (strtolower($paymentMethod) === 'gcash' || strtolower($paymentMethod) === 'digital') {
        $referenceNumber = $data['reference_number'] ?? null;
    }

    // CRITICAL: Validate payment details before creating subscription
    $amountReceived = floatval($data['amount_received'] ?? $payment_amount);
    $transactionStatus = $data['transaction_status'] ?? 'confirmed';

    // Payment validation - prevent unpaid subscriptions from being created
    if ($payment_amount <= 0) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "Invalid payment amount",
            "message" => "Payment amount must be greater than 0"
        ]);
        return;
    }

    // For cash payments, validate amount received
    if ($paymentMethod === 'cash' && $amountReceived < $payment_amount) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "Insufficient payment",
            "message" => "Amount received (₱" . number_format($amountReceived, 2) . ") is less than required amount (₱" . number_format($payment_amount, 2) . "). Please collect ₱" . number_format($payment_amount - $amountReceived, 2) . " more."
        ]);
        return;
    }

    // Validate transaction status
    if ($transactionStatus !== 'confirmed' && $transactionStatus !== 'completed') {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "Payment not confirmed",
            "message" => "Transaction must be confirmed before creating subscription"
        ]);
        return;
    }

    $pdo->beginTransaction();

    try {
        // Verify user exists and is a customer
        $userStmt = $pdo->prepare("SELECT id, fname, lname, email, user_type_id, account_status, profile_photo_url, system_photo_url FROM user WHERE id = ?");
        $userStmt->execute([$user_id]);
        $user = $userStmt->fetch();

        if (!$user)
            throw new Exception("User not found");
        if ($user['user_type_id'] != 4)
            throw new Exception("Subscriptions can only be created for customers");
        if ($user['account_status'] !== 'approved')
            throw new Exception("User account must be approved first");

        // Verify plan exists - also fetch duration_days for Walk In plans
        $planStmt = $pdo->prepare("SELECT id, plan_name, price, duration_months, duration_days FROM member_subscription_plan WHERE id = ?");
        $planStmt->execute([$plan_id]);
        $plan = $planStmt->fetch();

        if (!$plan)
            throw new Exception("Subscription plan not found");

        // Set timezone to Philippines
        date_default_timezone_set('Asia/Manila');

        // Special handling for Walk In/Day Pass/Gym Session plans (plan_id = 6 or plan_name = 'Walk In' or 'Day Pass' or 'Gym Session')
        // For Day Pass plans, always use current date/time in Philippines timezone
        $planNameLower = strtolower($plan['plan_name']);
        if ($plan_id == 6 || $planNameLower === 'walk in' || $planNameLower === 'day pass' || $planNameLower === 'gym session') {
            // Use current date/time in Philippines timezone for Day Pass
            $start_date_obj = new DateTime('now', new DateTimeZone('Asia/Manila'));
            $end_date_obj = clone $start_date_obj;
            $end_date_obj->setTime(21, 0, 0); // Set to 9 PM (21:00)
            $end_date = $end_date_obj->format('Y-m-d H:i:s');
            // Format start_date for database (use current date/time)
            $start_date = $start_date_obj->format('Y-m-d H:i:s');
        }
        // Handle plans with duration_days (day-based plans)
        elseif (!empty($plan['duration_days']) && $plan['duration_days'] > 0) {
            // For other plans, use the provided start_date
            $start_date_obj = new DateTime($start_date, new DateTimeZone('Asia/Manila'));
            $end_date_obj = clone $start_date_obj;
            $end_date_obj->add(new DateInterval('P' . intval($plan['duration_days']) . 'D'));
            $end_date = $end_date_obj->format('Y-m-d');
        }
        // Handle regular monthly plans
        else {
            // For other plans, use the provided start_date
            $start_date_obj = new DateTime($start_date, new DateTimeZone('Asia/Manila'));

            // Use quantity if provided, otherwise calculate from payment amount
            $actualMonths = 1; // Default to 1 month

            if ($quantity >= 1) {
                // Use quantity directly (for Plan ID 1, 2, 3 advance payment/renewal)
                if ($plan_id == 1) {
                    // Plan ID 1: quantity is in years, convert to months
                    // Even if quantity is 1, it means 1 year = 12 months
                    $actualMonths = $quantity * 12;
                } else {
                    // Plan ID 2, 3: quantity is in months
                    $actualMonths = $quantity;
                }
            } else {
                // Fallback: Calculate from payment amount if quantity not provided
                $planPrice = floatval($plan['price']);
                if ($planPrice > 0) {
                    // Calculate how many months the payment covers
                    $monthsPaid = floor($payment_amount / $planPrice);
                    if ($monthsPaid > 0) {
                        $actualMonths = $monthsPaid;
                        // For Plan ID 1, if monthsPaid is 1, it should be 12 months (1 year)
                        if ($plan_id == 1 && $actualMonths == 1) {
                            $actualMonths = 12;
                        }
                    } else {
                        // If payment is less than plan price, use plan's duration_months
                        // For Plan ID 1, default to 12 months (1 year)
                        if ($plan_id == 1) {
                            $actualMonths = 12;
                        } else {
                            $actualMonths = $plan['duration_months'] ?? 1;
                        }
                    }
                } else {
                    // If plan price is 0, use plan's duration_months
                    // For Plan ID 1, default to 12 months (1 year)
                    if ($plan_id == 1) {
                        $actualMonths = 12;
                    } else {
                        $actualMonths = $plan['duration_months'] ?? 1;
                    }
                }
            }

            // Calculate end date based on actual months
            $end_date_obj = clone $start_date_obj;
            $end_date_obj->add(new DateInterval('P' . $actualMonths . 'M'));
            $end_date = $end_date_obj->format('Y-m-d');
        }

        // Get approved status ID for manual subscriptions
        $statusStmt = $pdo->prepare("SELECT id FROM subscription_status WHERE status_name = 'approved'");
        $statusStmt->execute();
        $status = $statusStmt->fetch();

        if (!$status) {
            throw new Exception("Approved status not found in database");
        }

        // Check for existing active subscriptions
        // CRITICAL: Only consider subscriptions with confirmed payments
        // For Plan ID 1, 2, 3: Allow renewal/advance payment by extending end_date
        // For other plans: Prevent duplicates
        $existingStmt = $pdo->prepare("
                SELECT s.id, s.plan_id, s.end_date, ss.status_name, p.plan_name
                FROM subscription s 
                JOIN subscription_status ss ON s.status_id = ss.id 
                JOIN member_subscription_plan p ON s.plan_id = p.id
                WHERE s.user_id = ? 
                AND s.plan_id = ?
                AND ss.status_name = 'approved' 
                AND s.end_date >= CURDATE()
                AND s.amount_paid > 0  -- CRITICAL: Only consider subscriptions with payment
                AND EXISTS (
                    SELECT 1 FROM payment p 
                    WHERE p.subscription_id = s.id
                )  -- CRITICAL: Only consider subscriptions with payment records
            ");
        $existingStmt->execute([$user_id, $plan_id]);
        $existingSubscription = $existingStmt->fetch();

        // For Plan ID 1, 2, 3: Allow renewal/advance payment by extending end_date
        if ($existingSubscription && ($plan_id == 1 || $plan_id == 2 || $plan_id == 3)) {
            // Calculate extension months
            $extensionMonths = 0;
            if ($quantity >= 1) {
                // Use quantity directly (for Plan ID 1, 2, 3 advance payment/renewal)
                if ($plan_id == 1) {
                    // Plan ID 1: quantity is in years, convert to months
                    // Even if quantity is 1, it means 1 year = 12 months
                    $extensionMonths = $quantity * 12;
                } else {
                    // Plan ID 2, 3: quantity is in months
                    $extensionMonths = $quantity;
                }
            } else {
                // Fallback: Calculate from payment amount (only if quantity is not provided or is 0)
                $planPrice = floatval($plan['price']);
                if ($planPrice > 0) {
                    $extensionMonths = floor($payment_amount / $planPrice);
                    // For Plan ID 1, if calculated months is 1, it should be 12 months (1 year)
                    if ($plan_id == 1 && $extensionMonths == 1) {
                        $extensionMonths = 12;
                    }
                }
            }

            if ($extensionMonths > 0) {
                // Extend existing subscription's end_date
                $existingEndDate = new DateTime($existingSubscription['end_date'], new DateTimeZone('Asia/Manila'));
                $newEndDate = clone $existingEndDate;
                $newEndDate->add(new DateInterval('P' . $extensionMonths . 'M'));
                $end_date = $newEndDate->format('Y-m-d');

                // Update existing subscription
                $updateStmt = $pdo->prepare("
                    UPDATE subscription 
                    SET end_date = ?, 
                        amount_paid = amount_paid + ?,
                        discounted_price = discounted_price + ?
                    WHERE id = ?
                ");
                $updateStmt->execute([$end_date, $payment_amount, $payment_amount, $existingSubscription['id']]);
                $subscription_id = $existingSubscription['id'];

                // Create payment record for the renewal
                // (Payment record creation code will be handled below)
                $isRenewal = true;
            } else {
                throw new Exception("Invalid quantity or payment amount for renewal");
            }
        } elseif ($existingSubscription) {
            // For other plans (not 1, 2, 3): Prevent duplicates
            throw new Exception("User already has an active subscription to this plan: {$existingSubscription['plan_name']} (expires: {$existingSubscription['end_date']})");
        } else {
            // Check if there's an expired subscription for the same user/plan
            // If found, update it instead of creating a new one
            $expiredStmt = $pdo->prepare("
                SELECT s.id, s.plan_id, s.start_date, s.end_date, s.amount_paid, ss.status_name, p.plan_name
                FROM subscription s 
                JOIN subscription_status ss ON s.status_id = ss.id 
                JOIN member_subscription_plan p ON s.plan_id = p.id
                WHERE s.user_id = ? 
                AND s.plan_id = ?
                AND ss.status_name = 'approved' 
                AND s.end_date < CURDATE()
                AND s.amount_paid > 0
                AND EXISTS (
                    SELECT 1 FROM payment p 
                    WHERE p.subscription_id = s.id
                )
                ORDER BY s.end_date DESC
                LIMIT 1
            ");
            $expiredStmt->execute([$user_id, $plan_id]);
            $expiredSubscription = $expiredStmt->fetch();

            if ($expiredSubscription) {
                // Update expired subscription instead of creating new one
                $isRenewal = true;
                $subscription_id = $expiredSubscription['id'];

                // Use the expired subscription's end_date as the new start_date
                $expiredEndDate = new DateTime($expiredSubscription['end_date'], new DateTimeZone('Asia/Manila'));
                $start_date_obj = clone $expiredEndDate;
                $start_date = $start_date_obj->format('Y-m-d');

                // Recalculate end_date based on the new start_date
                if ($plan_id == 6 || $planNameLower === 'walk in' || $planNameLower === 'day pass' || $planNameLower === 'gym session') {
                    // Already handled above - these use current date/time
                } elseif (!empty($plan['duration_days']) && $plan['duration_days'] > 0) {
                    $end_date_obj = clone $start_date_obj;
                    $end_date_obj->add(new DateInterval('P' . intval($plan['duration_days']) . 'D'));
                    $end_date = $end_date_obj->format('Y-m-d');
                } else {
                    // Recalculate end_date for regular plans based on actualMonths
                    $end_date_obj = clone $start_date_obj;
                    $end_date_obj->add(new DateInterval('P' . $actualMonths . 'M'));
                    $end_date = $end_date_obj->format('Y-m-d');
                }
            } else {
                // No expired subscription found, create new one
                $isRenewal = false;

                // If creating a new subscription of the same plan type, check if there's any previous subscription
                // (active or expired) and use its end_date as the start_date for the new subscription
                // This ensures new subscriptions start when the previous one ends, not overlapping
                $previousStmt = $pdo->prepare("
                    SELECT s.id, s.plan_id, s.end_date, ss.status_name, p.plan_name
                    FROM subscription s 
                    JOIN subscription_status ss ON s.status_id = ss.id 
                    JOIN member_subscription_plan p ON s.plan_id = p.id
                    WHERE s.user_id = ? 
                    AND s.plan_id = ?
                    AND ss.status_name = 'approved' 
                    AND s.amount_paid > 0
                    AND EXISTS (
                        SELECT 1 FROM payment p 
                        WHERE p.subscription_id = s.id
                    )
                    ORDER BY s.end_date DESC
                    LIMIT 1
                ");
                $previousStmt->execute([$user_id, $plan_id]);
                $previousSubscription = $previousStmt->fetch();

                // If there's a previous subscription of the same plan type, use its end_date as start_date
                if ($previousSubscription) {
                    $previousEndDate = new DateTime($previousSubscription['end_date'], new DateTimeZone('Asia/Manila'));
                    // Use the end_date of the previous subscription as the start_date for the new one
                    $start_date = $previousEndDate->format('Y-m-d');
                    $start_date_obj = new DateTime($start_date, new DateTimeZone('Asia/Manila'));

                    // Recalculate end_date based on the new start_date
                    if ($plan_id == 6 || $planNameLower === 'walk in' || $planNameLower === 'day pass' || $planNameLower === 'gym session') {
                        // Already handled above - these use current date/time
                    } elseif (!empty($plan['duration_days']) && $plan['duration_days'] > 0) {
                        $end_date_obj = clone $start_date_obj;
                        $end_date_obj->add(new DateInterval('P' . intval($plan['duration_days']) . 'D'));
                        $end_date = $end_date_obj->format('Y-m-d');
                    } else {
                        // Recalculate end_date for regular plans based on actualMonths
                        $end_date_obj = clone $start_date_obj;
                        $end_date_obj->add(new DateInterval('P' . $actualMonths . 'M'));
                        $end_date = $end_date_obj->format('Y-m-d');
                    }
                }
            }
        }

        // Check for existing pending requests to prevent duplicates
        // CRITICAL: Only consider pending subscriptions with payment amount
        $pendingStmt = $pdo->prepare("
                SELECT s.id, s.plan_id, ss.status_name, p.plan_name
                FROM subscription s 
                JOIN subscription_status ss ON s.status_id = ss.id 
                JOIN member_subscription_plan p ON s.plan_id = p.id
                WHERE s.user_id = ? 
                AND s.plan_id = ?
                AND ss.status_name = 'pending_approval'
                AND s.amount_paid > 0  -- CRITICAL: Only consider pending subscriptions with payment
            ");
        $pendingStmt->execute([$user_id, $plan_id]);
        $pendingSubscription = $pendingStmt->fetch();

        if ($pendingSubscription) {
            throw new Exception("User already has a pending request for this plan: {$pendingSubscription['plan_name']}. Please wait for approval or decline the existing request first.");
        }

        // POS fields for subscription (already validated above)
        $changeGiven = max(0, $amountReceived - $payment_amount);
        $receiptNumber = $data['receipt_number'] ?? generateSubscriptionReceiptNumber($pdo);
        $cashierId = $data['cashier_id'] ?? null;

        // If renewing an expired subscription, update it here
        // Check if this is a renewal of an expired subscription (not an active subscription extension)
        if (isset($isRenewal) && $isRenewal && isset($subscription_id) && !isset($existingSubscription)) {
            // Update the expired subscription with new dates and amounts
            $updateStmt = $pdo->prepare("
                UPDATE subscription 
                SET start_date = ?,
                    end_date = ?,
                    amount_paid = amount_paid + ?,
                    discounted_price = discounted_price + ?,
                    payment_method = ?,
                    receipt_number = ?,
                    discount_type = ?
                WHERE id = ?
            ");
            $updateStmt->execute([
                $start_date,
                $end_date,
                $payment_amount,
                $payment_amount,
                $paymentMethod,
                $receiptNumber,
                $discount_type,
                $subscription_id
            ]);
        }
        // Only create new subscription if not a renewal
        elseif (!isset($isRenewal) || !$isRenewal) {
            // Create subscription - use Philippines timezone for created_at if column exists
            $checkCreatedAt = $pdo->query("SHOW COLUMNS FROM subscription LIKE 'created_at'");
            $hasCreatedAt = $checkCreatedAt->rowCount() > 0;

            $phTime = new DateTime('now', new DateTimeZone('Asia/Manila'));
            $phTimeString = $phTime->format('Y-m-d H:i:s');

            if ($hasCreatedAt) {
                $subscriptionStmt = $pdo->prepare("
                        INSERT INTO subscription (user_id, plan_id, status_id, start_date, end_date, discounted_price, discount_type, amount_paid, payment_method, receipt_number, cashier_id, change_given, created_at) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                $subscriptionStmt->execute([$user_id, $plan_id, $status['id'], $start_date, $end_date, $payment_amount, $discount_type, $payment_amount, $paymentMethod, $receiptNumber, $cashierId, $changeGiven, $phTimeString]);
            } else {
                $subscriptionStmt = $pdo->prepare("
                        INSERT INTO subscription (user_id, plan_id, status_id, start_date, end_date, discounted_price, discount_type, amount_paid, payment_method, receipt_number, cashier_id, change_given) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                $subscriptionStmt->execute([$user_id, $plan_id, $status['id'], $start_date, $end_date, $payment_amount, $discount_type, $payment_amount, $paymentMethod, $receiptNumber, $cashierId, $changeGiven]);
            }
            $subscription_id = $pdo->lastInsertId();
        }

        // Create payment record - only for confirmed payments
        try {
            // Check payment table columns for PayMongo support
            $checkPaymentColumns = $pdo->query("SHOW COLUMNS FROM payment");
            $paymentColumns = $checkPaymentColumns->fetchAll(PDO::FETCH_COLUMN);

            $hasStatusColumn = in_array('status', $paymentColumns);
            $hasPaymentMethod = in_array('payment_method', $paymentColumns);
            $hasPaymentIntentId = in_array('payment_intent_id', $paymentColumns);
            $hasPaymentLinkId = in_array('payment_link_id', $paymentColumns);

            // Only create payment record if transaction is confirmed/completed
            // Use Philippines timezone for accurate timestamp
            if ($transactionStatus === 'confirmed' || $transactionStatus === 'completed') {
                $phTime = new DateTime('now', new DateTimeZone('Asia/Manila'));
                $phTimeString = $phTime->format('Y-m-d H:i:s');

                // Build payment insert query based on available columns
                $paymentFields = ['subscription_id', 'amount', 'payment_date'];
                $paymentValues = [$subscription_id, $payment_amount, $phTimeString];

                if ($hasStatusColumn) {
                    $paymentFields[] = 'status';
                    $paymentValues[] = 'paid';
                }

                if ($hasPaymentMethod) {
                    $paymentFields[] = 'payment_method';
                    $paymentValues[] = $paymentMethod;
                }

                if ($hasPaymentIntentId && $paymentIntentId) {
                    $paymentFields[] = 'payment_intent_id';
                    $paymentValues[] = $paymentIntentId;
                }

                if ($hasPaymentLinkId && $paymentLinkId) {
                    $paymentFields[] = 'payment_link_id';
                    $paymentValues[] = $paymentLinkId;
                }

                $paymentPlaceholders = implode(', ', array_fill(0, count($paymentValues), '?'));
                $paymentFieldsStr = implode(', ', $paymentFields);

                $paymentStmt = $pdo->prepare("
                        INSERT INTO payment ($paymentFieldsStr) 
                        VALUES ($paymentPlaceholders)
                    ");

                $paymentStmt->execute($paymentValues);
                $payment_id = $pdo->lastInsertId();
            } else {
                // If payment is not confirmed, don't create payment record
                $payment_id = null;
                throw new Exception("Payment not confirmed - subscription creation cancelled");
            }
        } catch (Exception $e) {
            // If payment table doesn't exist or payment not confirmed, rollback transaction
            if (strpos($e->getMessage(), 'Payment not confirmed') !== false) {
                throw $e; // Re-throw payment confirmation errors
            }
            $payment_id = null;
        }

        // Create sales record - only for confirmed payments
        // Use Philippines timezone for accurate timestamp
        if ($transactionStatus === 'confirmed' || $transactionStatus === 'completed') {
            $phTime = new DateTime('now', new DateTimeZone('Asia/Manila'));
            $phTimeString = $phTime->format('Y-m-d H:i:s');

            // Check if sales table has reference_number column
            $checkSalesColumns = $pdo->query("SHOW COLUMNS FROM sales");
            $salesColumns = $checkSalesColumns->fetchAll(PDO::FETCH_COLUMN);
            $hasReferenceNumber = in_array('reference_number', $salesColumns);

            if ($hasReferenceNumber) {
                $salesStmt = $pdo->prepare("
                        INSERT INTO sales (user_id, total_amount, sale_date, sale_type, payment_method, transaction_status, receipt_number, cashier_id, change_given, reference_number) 
                        VALUES (?, ?, ?, 'Subscription', ?, 'confirmed', ?, ?, ?, ?)
                    ");
                $salesStmt->execute([$user_id, $payment_amount, $phTimeString, $paymentMethod, $receiptNumber, $cashierId, $changeGiven, $referenceNumber]);
            } else {
                $salesStmt = $pdo->prepare("
                        INSERT INTO sales (user_id, total_amount, sale_date, sale_type, payment_method, transaction_status, receipt_number, cashier_id, change_given) 
                        VALUES (?, ?, ?, 'Subscription', ?, 'confirmed', ?, ?, ?)
                    ");
                $salesStmt->execute([$user_id, $payment_amount, $phTimeString, $paymentMethod, $receiptNumber, $cashierId, $changeGiven]);
            }
            $sale_id = $pdo->lastInsertId();

            // Create sales details
            // Get quantity from request data, default to 1 if not provided
            $quantity = isset($data['quantity']) ? intval($data['quantity']) : 1;
            if ($quantity <= 0) {
                $quantity = 1; // Ensure quantity is at least 1
            }

            $salesDetailStmt = $pdo->prepare("
                    INSERT INTO sales_details (sale_id, subscription_id, quantity, price) 
                    VALUES (?, ?, ?, ?)
                ");
            $salesDetailStmt->execute([$sale_id, $subscription_id, $quantity, $payment_amount]);
        } else {
            $sale_id = null;
        }

        // Calculate duration in months from payment amount (more accurate than end_date)
        // This ensures we show the correct duration even if end_date calculation was wrong
        $planPrice = floatval($plan['price']);
        $totalMonths = 1; // Default to 1 month

        if ($planPrice > 0) {
            // Calculate how many months the payment covers
            $monthsPaid = floor($payment_amount / $planPrice);
            if ($monthsPaid > 0) {
                $totalMonths = $monthsPaid;
            } else {
                // If payment is less than plan price, use plan's duration_months
                $totalMonths = $plan['duration_months'];
            }
        } else {
            // If plan price is 0, calculate from dates
            $start_date_obj = new DateTime($start_date);
            $end_date_obj = new DateTime($end_date);
            $interval = $start_date_obj->diff($end_date_obj);
            $totalMonths = ($interval->y * 12) + $interval->m;
            if ($interval->d > 0) {
                $totalMonths += 1; // Round up if there are extra days
            }
        }

        // Log activity using centralized logger
        $staffId = $data['staff_id'] ?? null;
        error_log("DEBUG: Received staff_id: " . ($staffId ?? 'NULL') . " from request data");
        error_log("DEBUG: Full request data: " . json_encode($data));
        error_log("DEBUG: Payment amount: {$payment_amount}, Plan price: {$planPrice}, Calculated months: {$totalMonths}");
        $durationText = $totalMonths > 0 ? " ({$totalMonths} month" . ($totalMonths > 1 ? 's' : '') . ")" : "";
        logStaffActivity($pdo, $staffId, "Create Manual Subscription", "Manual subscription created: {$plan['plan_name']}{$durationText} for {$user['fname']} {$user['lname']} by {$created_by}", "Subscription Management", [
            'subscription_id' => $subscription_id,
            'user_id' => $user_id,
            'user_name' => $user['fname'] . ' ' . $user['lname'],
            'plan_name' => $plan['plan_name'],
            'amount_paid' => $payment_amount,
            'created_by' => $created_by,
            'duration_months' => $totalMonths
        ]);

        // Create notification for the user about their subscription
        try {
            // Get success notification type ID (default to 3 if not found)
            $notificationTypeStmt = $pdo->prepare("SELECT id FROM notification_type WHERE type_name = 'success' LIMIT 1");
            $notificationTypeStmt->execute();
            $notificationType = $notificationTypeStmt->fetch();
            $successTypeId = $notificationType ? $notificationType['id'] : 3;

            // Format dates for display
            $startDateFormatted = date('M d, Y', strtotime($start_date));
            $endDateFormatted = date('M d, Y', strtotime($end_date));

            // Create clear and professional notification message
            $notificationMessage = "Your {$plan['plan_name']} subscription has been successfully activated. Valid from {$startDateFormatted} to {$endDateFormatted}. Start enjoying your membership benefits today.";

            // Insert notification
            $notificationStmt = $pdo->prepare("
                INSERT INTO notification (user_id, message, status_id, type_id, timestamp) 
                VALUES (?, ?, 1, ?, NOW())
            ");
            $notificationStmt->execute([$user_id, $notificationMessage, $successTypeId]);
        } catch (Exception $e) {
            // Log error but don't fail the transaction
            error_log("Failed to create notification for subscription: " . $e->getMessage());
        }

        $pdo->commit();

        echo json_encode([
            "success" => true,
            "message" => "Manual subscription created successfully",
            "data" => [
                "subscription_id" => $subscription_id,
                "payment_id" => $payment_id,
                "sale_id" => $sale_id,
                "user_name" => $user['fname'] . ' ' . $user['lname'],
                "user_email" => $user['email'],
                "plan_name" => $plan['plan_name'],
                "start_date" => $start_date,
                "end_date" => $end_date,
                "amount_paid" => $payment_amount,
                "discount_type" => $discount_type,
                "payment_method" => $paymentMethod,
                "receipt_number" => $receiptNumber,
                "change_given" => $changeGiven,
                "existing_subscription_warning" => $existingSubscription ? "User had an active subscription ending on " . $existingSubscription['end_date'] : null
            ]
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "Failed to create subscription",
            "message" => $e->getMessage()
        ]);
    }
}

function approveSubscription($pdo, $data)
{
    if (!isset($data['subscription_id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Missing subscription_id", "message" => "subscription_id is required"]);
        return;
    }

    $subscriptionId = $data['subscription_id'];
    $approvedBy = $data['approved_by'] ?? 'Admin';

    $pdo->beginTransaction();

    try {
        $checkStmt = $pdo->prepare("
                SELECT s.id, s.user_id, s.plan_id, s.start_date, s.end_date, st.status_name,
                       u.fname, u.lname, u.email, u.profile_photo_url, u.system_photo_url,
                       p.plan_name, p.price, p.duration_months, p.duration_days
                FROM subscription s
                JOIN subscription_status st ON s.status_id = st.id
                JOIN user u ON s.user_id = u.id
                JOIN member_subscription_plan p ON s.plan_id = p.id
                WHERE s.id = ?
            ");
        $checkStmt->execute([$subscriptionId]);
        $subscription = $checkStmt->fetch();

        if (!$subscription)
            throw new Exception("Subscription not found.");
        if ($subscription['status_name'] !== 'pending_approval')
            throw new Exception("Subscription is not in pending status. Current status: " . $subscription['status_name']);

        $statusStmt = $pdo->prepare("SELECT id FROM subscription_status WHERE status_name = 'approved'");
        $statusStmt->execute();
        $approvedStatus = $statusStmt->fetch();

        if (!$approvedStatus)
            throw new Exception("Approved status not found in database.");

        // Recalculate end_date for Walk In plans or if duration_days is set
        // Set timezone to Philippines
        date_default_timezone_set('Asia/Manila');
        $start_date_obj = new DateTime($subscription['start_date'], new DateTimeZone('Asia/Manila'));
        $plan_id = $subscription['plan_id'];

        // Special handling for Walk In plans (plan_id = 6 or plan_name = 'Walk In')
        // Walk In plans expire at 9 PM PH time on the same day
        if ($plan_id == 6 || strtolower($subscription['plan_name']) === 'walk in') {
            $end_date_obj = clone $start_date_obj;
            $end_date_obj->setTime(21, 0, 0); // Set to 9 PM (21:00)
            $corrected_end_date = $end_date_obj->format('Y-m-d H:i:s');
        }
        // Handle plans with duration_days (day-based plans)
        elseif (!empty($subscription['duration_days']) && $subscription['duration_days'] > 0) {
            $end_date_obj = clone $start_date_obj;
            $end_date_obj->add(new DateInterval('P' . intval($subscription['duration_days']) . 'D'));
            $corrected_end_date = $end_date_obj->format('Y-m-d');
        }
        // For regular plans, use existing end_date (already calculated correctly)
        else {
            $corrected_end_date = $subscription['end_date'];
        }

        $updateStmt = $pdo->prepare("UPDATE subscription SET status_id = ?, end_date = ? WHERE id = ?");
        $updateStmt->execute([$approvedStatus['id'], $corrected_end_date, $subscriptionId]);

        // Handle package plan logic - if plan ID 5 is approved, create hidden individual plans
        if ($subscription['plan_id'] == 5) {
            // Create hidden individual plans (1 and 2) with same user and dates
            $individualPlans = [1, 2];
            foreach ($individualPlans as $planId) {
                // Check if individual plan already exists for this user and date
                $existingStmt = $pdo->prepare("
                        SELECT id FROM subscription 
                        WHERE user_id = ? AND plan_id = ? AND start_date = ?
                    ");
                $existingStmt->execute([$subscription['user_id'], $planId, $subscription['start_date']]);

                if (!$existingStmt->fetch()) {
                    // Create hidden individual plan subscription
                    $hiddenStmt = $pdo->prepare("
                            INSERT INTO subscription 
                            (user_id, plan_id, discount_type, status_id, start_date, end_date, 
                             discounted_price, amount_paid, payment_method, receipt_number, cashier_id, change_given)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ");
                    $hiddenStmt->execute([
                        $subscription['user_id'],
                        $planId,
                        $subscription['discount_type'] ?? 'none',
                        $approvedStatus['id'], // Same approved status
                        $subscription['start_date'],
                        $subscription['end_date'],
                        $subscription['discounted_price'] ?? null,
                        0, // Hidden plans show 0 payment
                        $subscription['payment_method'] ?? 'cash',
                        $subscription['receipt_number'] ?? null,
                        $subscription['cashier_id'] ?? null,
                        $subscription['change_given'] ?? 0
                    ]);
                }
            }
        }

        // Create payment record when subscription is approved (since approval means payment is received)
        try {
            // Check payment table columns for PayMongo support
            $checkPaymentColumns = $pdo->query("SHOW COLUMNS FROM payment");
            $paymentColumns = $checkPaymentColumns->fetchAll(PDO::FETCH_COLUMN);

            $hasStatusColumn = in_array('status', $paymentColumns);
            $hasPaymentMethod = in_array('payment_method', $paymentColumns);
            $hasPaymentIntentId = in_array('payment_intent_id', $paymentColumns);
            $hasPaymentLinkId = in_array('payment_link_id', $paymentColumns);

            // Get subscription details for payment amount and receipt number
            $subDetailsStmt = $pdo->prepare("
                    SELECT s.discounted_price, s.amount_paid, s.payment_method, s.receipt_number, p.price 
                    FROM subscription s 
                    JOIN member_subscription_plan p ON s.plan_id = p.id 
                    WHERE s.id = ?
                ");
            $subDetailsStmt->execute([$subscriptionId]);
            $subDetails = $subDetailsStmt->fetch();

            $paymentAmount = $subDetails['amount_paid'] ?? $subDetails['discounted_price'] ?? $subDetails['price'] ?? 0;
            $subPaymentMethod = $subDetails['payment_method'] ?? 'cash';
            $subscriptionReceiptNumber = $subDetails['receipt_number'] ?? null;

            // Get PayMongo payment fields from request data
            $paymentIntentId = $data['payment_intent_id'] ?? null;
            $paymentLinkId = $data['payment_link_id'] ?? null;

            // Build payment insert query based on available columns
            // Use Philippines timezone for accurate timestamp
            $phTime = new DateTime('now', new DateTimeZone('Asia/Manila'));
            $phTimeString = $phTime->format('Y-m-d H:i:s');

            $paymentFields = ['subscription_id', 'amount', 'payment_date'];
            $paymentValues = [$subscriptionId, $paymentAmount, $phTimeString];

            if ($hasStatusColumn) {
                $paymentFields[] = 'status';
                $paymentValues[] = 'paid';
            }

            if ($hasPaymentMethod) {
                $paymentFields[] = 'payment_method';
                $paymentValues[] = $subPaymentMethod;
            }

            if ($hasPaymentIntentId && $paymentIntentId) {
                $paymentFields[] = 'payment_intent_id';
                $paymentValues[] = $paymentIntentId;
            }

            if ($hasPaymentLinkId && $paymentLinkId) {
                $paymentFields[] = 'payment_link_id';
                $paymentValues[] = $paymentLinkId;
            }

            $paymentPlaceholders = implode(', ', array_fill(0, count($paymentValues), '?'));
            $paymentFieldsStr = implode(', ', $paymentFields);

            $paymentStmt = $pdo->prepare("
                    INSERT INTO payment ($paymentFieldsStr) 
                    VALUES ($paymentPlaceholders)
                ");

            $paymentStmt->execute($paymentValues);
            $payment_id = $pdo->lastInsertId();
            error_log("Payment record created successfully. Payment ID: $payment_id, Subscription ID: $subscriptionId, Amount: $paymentAmount, Method: $subPaymentMethod");

            // Also create sales record - use subscription's receipt_number if available, otherwise generate a new one
            $receiptNumber = $subscriptionReceiptNumber ?? generateSubscriptionReceiptNumber($pdo);
            $salesStmt = $pdo->prepare("
                    INSERT INTO sales (user_id, total_amount, sale_date, sale_type, payment_method, transaction_status, receipt_number, cashier_id, change_given) 
                    VALUES (?, ?, NOW(), 'Subscription', ?, 'confirmed', ?, ?, 0.00)
                ");
            $salesStmt->execute([$subscription['user_id'], $paymentAmount, $subPaymentMethod, $receiptNumber, $data['staff_id'] ?? null]);
            $sale_id = $pdo->lastInsertId();
            error_log("Sales record created successfully. Sale ID: $sale_id, Subscription ID: $subscriptionId, Amount: $paymentAmount, Method: $subPaymentMethod");

        } catch (Exception $e) {
            // Log the error for debugging
            error_log("ERROR: Failed to create payment/sales record for subscription $subscriptionId: " . $e->getMessage());
            error_log("ERROR: Payment/sales record creation trace: " . $e->getTraceAsString());
            // Re-throw the exception to prevent transaction from committing without payment record
            throw new Exception("Failed to create payment/sales record: " . $e->getMessage());
        }

        $pdo->commit();

        // Calculate duration in months from payment amount (more accurate than end_date)
        $planPrice = floatval($subscription['price']);
        $paymentAmount = floatval($subscription['amount_paid'] ?? $subscription['discounted_price'] ?? $subscription['price'] ?? 0);
        $totalMonths = 1; // Default to 1 month

        if ($planPrice > 0 && $paymentAmount > 0) {
            // Calculate how many months the payment covers
            $monthsPaid = floor($paymentAmount / $planPrice);
            if ($monthsPaid > 0) {
                $totalMonths = $monthsPaid;
            } else {
                // If payment is less than plan price, calculate from dates
                $start_date_obj = new DateTime($subscription['start_date']);
                $end_date_obj = new DateTime($subscription['end_date']);
                $interval = $start_date_obj->diff($end_date_obj);
                $totalMonths = ($interval->y * 12) + $interval->m;
                if ($interval->d > 0) {
                    $totalMonths += 1;
                }
            }
        } else {
            // If plan price is 0, calculate from dates
            $start_date_obj = new DateTime($subscription['start_date']);
            $end_date_obj = new DateTime($subscription['end_date']);
            $interval = $start_date_obj->diff($end_date_obj);
            $totalMonths = ($interval->y * 12) + $interval->m;
            if ($interval->d > 0) {
                $totalMonths += 1;
            }
        }

        // Log activity using centralized logger
        $staffId = $data['staff_id'] ?? null;
        error_log("DEBUG Approve Subscription: Payment amount: {$paymentAmount}, Plan price: {$planPrice}, Calculated months: {$totalMonths}");
        $durationText = $totalMonths > 0 ? " ({$totalMonths} month" . ($totalMonths > 1 ? 's' : '') . ")" : "";
        logStaffActivity($pdo, $staffId, "Approve Subscription", "Subscription approved: {$subscription['plan_name']}{$durationText} for {$subscription['fname']} {$subscription['lname']} by {$approvedBy}", "Subscription Management", [
            'subscription_id' => $subscriptionId,
            'user_id' => $subscription['user_id'],
            'user_name' => $subscription['fname'] . ' ' . $subscription['lname'],
            'plan_name' => $subscription['plan_name'],
            'approved_by' => $approvedBy,
            'duration_months' => $totalMonths
        ]);

        echo json_encode([
            "success" => true,
            "subscription_id" => $subscriptionId,
            "status" => "approved",
            "message" => "Subscription approved successfully",
            "data" => [
                "subscription_id" => $subscriptionId,
                "user_name" => trim($subscription['fname'] . ' ' . $subscription['lname']),
                "user_email" => $subscription['email'],
                "plan_name" => $subscription['plan_name'],
                "status" => "approved",
                "approved_at" => date('Y-m-d H:i:s'),
                "approved_by" => $approvedBy
            ]
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Approval failed", "message" => $e->getMessage()]);
    }
}

function approveSubscriptionWithPayment($pdo, $data)
{
    if (!isset($data['subscription_id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Missing subscription_id", "message" => "subscription_id is required"]);
        return;
    }

    $subscriptionId = $data['subscription_id'];
    $approvedBy = $data['approved_by'] ?? 'Admin';
    $amountReceived = floatval($data['amount_received'] ?? 0);
    $notes = $data['notes'] ?? '';
    $receiptNumber = $data['receipt_number'] ?? null; // Allow custom receipt number from frontend
    $cashierId = $data['cashier_id'] ?? null;

    // Get PayMongo payment fields
    $paymentIntentId = $data['payment_intent_id'] ?? null;
    $paymentLinkId = $data['payment_link_id'] ?? null;

    // Auto-detect payment method: if payment_link_id or payment_intent_id exists, it's a digital/PayMongo payment
    // Otherwise, use the provided payment_method or default to 'cash'
    if (!empty($paymentLinkId) || !empty($paymentIntentId)) {
        $paymentMethod = $data['payment_method'] ?? 'digital'; // PayMongo payment = digital
    } else {
        $paymentMethod = $data['payment_method'] ?? 'cash';
    }

    // Validate payment method - accept gcash and digital (both are GCash)
    $validPaymentMethods = ['cash', 'card', 'digital', 'gcash'];
    if (!in_array(strtolower($paymentMethod), array_map('strtolower', $validPaymentMethods))) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid payment method", "message" => "Payment method must be one of: cash, card, gcash, or digital"]);
        return;
    }
    // Normalize payment method: digital -> gcash
    if (strtolower($paymentMethod) === 'digital') {
        $paymentMethod = 'gcash';
    }

    // Get reference number for GCash payments
    $referenceNumber = null;
    if (strtolower($paymentMethod) === 'gcash' || strtolower($paymentMethod) === 'digital') {
        $referenceNumber = $data['reference_number'] ?? null;
    }

    // For cash payments, validate amount received
    if ($paymentMethod === 'cash' && $amountReceived <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid amount received", "message" => "Amount received must be greater than 0 for cash payments"]);
        return;
    }

    // CRITICAL: Validate payment confirmation before approving subscription
    $transactionStatus = $data['transaction_status'] ?? 'confirmed';
    if ($transactionStatus !== 'confirmed' && $transactionStatus !== 'completed') {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "Payment not confirmed",
            "message" => "Transaction must be confirmed before approving subscription"
        ]);
        return;
    }

    $pdo->beginTransaction();

    try {
        $checkStmt = $pdo->prepare("
                SELECT s.id, s.user_id, s.plan_id, st.status_name,
                       u.fname, u.lname, u.email,
                       p.plan_name, p.price, p.duration_months, p.duration_days,
                       s.amount_paid, s.discounted_price,
                       s.start_date, s.end_date, s.discount_type, s.payment_method, 
                       s.receipt_number, s.cashier_id, s.change_given
                FROM subscription s
                JOIN subscription_status st ON s.status_id = st.id
                JOIN user u ON s.user_id = u.id
                JOIN member_subscription_plan p ON s.plan_id = p.id
                WHERE s.id = ?
            ");
        $checkStmt->execute([$subscriptionId]);
        $subscription = $checkStmt->fetch();

        if (!$subscription)
            throw new Exception("Subscription not found.");
        if ($subscription['status_name'] !== 'pending_approval')
            throw new Exception("Subscription is not in pending status. Current status: " . $subscription['status_name']);

        $statusStmt = $pdo->prepare("SELECT id FROM subscription_status WHERE status_name = 'approved'");
        $statusStmt->execute();
        $approvedStatus = $statusStmt->fetch();

        if (!$approvedStatus)
            throw new Exception("Approved status not found in database.");

        // Calculate payment details
        $paymentAmount = $subscription['amount_paid'] ?? $subscription['discounted_price'] ?? $subscription['price'] ?? 0;
        $changeGiven = max(0, $amountReceived - $paymentAmount);

        // Recalculate end_date for Walk In plans or if duration_days is set
        // Set timezone to Philippines
        date_default_timezone_set('Asia/Manila');
        $start_date_obj = new DateTime($subscription['start_date'], new DateTimeZone('Asia/Manila'));
        $plan_id = $subscription['plan_id'];

        // Special handling for Walk In plans (plan_id = 6 or plan_name = 'Walk In')
        // Walk In plans expire at 9 PM PH time on the same day
        if ($plan_id == 6 || strtolower($subscription['plan_name']) === 'walk in') {
            $end_date_obj = clone $start_date_obj;
            $end_date_obj->setTime(21, 0, 0); // Set to 9 PM (21:00)
            $corrected_end_date = $end_date_obj->format('Y-m-d H:i:s');
        }
        // Handle plans with duration_days (day-based plans)
        elseif (!empty($subscription['duration_days']) && $subscription['duration_days'] > 0) {
            $end_date_obj = clone $start_date_obj;
            $end_date_obj->add(new DateInterval('P' . intval($subscription['duration_days']) . 'D'));
            $corrected_end_date = $end_date_obj->format('Y-m-d');
        }
        // For regular plans, use existing end_date (already calculated correctly)
        else {
            $corrected_end_date = $subscription['end_date'];
        }

        // Generate receipt number if not provided
        if (empty($receiptNumber)) {
            $receiptNumber = generateSubscriptionReceiptNumber($pdo);
        }

        // Check if this is a package plan that needs to be split
        $isPackagePlan = $subscription['plan_id'] == 5; // Assuming plan ID 5 is the package plan

        if ($isPackagePlan) {
            // For package plans, keep the package plan visible and create hidden individual plans
            // First, update the package plan status and end_date if corrected
            $updateStmt = $pdo->prepare("UPDATE subscription SET status_id = ?, end_date = ? WHERE id = ?");
            $updateStmt->execute([$approvedStatus['id'], $corrected_end_date, $subscriptionId]);

            // Create hidden individual plans (1 and 2) with same user and dates
            $individualPlans = [1, 2];

            // Use subscription dates or fallback to current date
            $startDate = $subscription['start_date'] ?? date('Y-m-d');
            $endDate = $subscription['end_date'] ?? date('Y-m-d', strtotime('+1 month'));

            foreach ($individualPlans as $planId) {
                // Check if individual plan already exists for this user and date
                $existingStmt = $pdo->prepare("
                        SELECT id FROM subscription 
                        WHERE user_id = ? AND plan_id = ? AND start_date = ?
                    ");
                $existingStmt->execute([$subscription['user_id'], $planId, $startDate]);

                if (!$existingStmt->fetch()) {
                    // Create hidden individual plan subscription
                    $hiddenStmt = $pdo->prepare("
                            INSERT INTO subscription 
                            (user_id, plan_id, discount_type, status_id, start_date, end_date, 
                             discounted_price, amount_paid, payment_method, receipt_number, cashier_id, change_given)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ");
                    $hiddenStmt->execute([
                        $subscription['user_id'],
                        $planId,
                        $subscription['discount_type'] ?? 'none',
                        $approvedStatus['id'], // Same approved status
                        $startDate,
                        $endDate,
                        $subscription['discounted_price'] ?? null,
                        0, // Hidden plans show 0 payment
                        $paymentMethod,
                        $receiptNumber,
                        $cashierId,
                        $changeGiven
                    ]);
                }
            }
        } else {
            // For regular plans, update the status, payment method, and end_date if corrected
            $updateStmt = $pdo->prepare("UPDATE subscription SET status_id = ?, payment_method = ?, end_date = ? WHERE id = ?");
            $updateStmt->execute([$approvedStatus['id'], $paymentMethod, $corrected_end_date, $subscriptionId]);
        }

        // Create payment record with POS data and PayMongo fields - only for confirmed payments
        try {
            // Only create payment record if transaction is confirmed/completed
            if ($transactionStatus === 'confirmed' || $transactionStatus === 'completed') {
                // Check payment table columns
                $checkPaymentColumns = $pdo->query("SHOW COLUMNS FROM payment");
                $paymentColumns = $checkPaymentColumns->fetchAll(PDO::FETCH_COLUMN);

                $hasStatusColumn = in_array('status', $paymentColumns);
                $hasPaymentMethod = in_array('payment_method', $paymentColumns);
                $hasPaymentIntentId = in_array('payment_intent_id', $paymentColumns);
                $hasPaymentLinkId = in_array('payment_link_id', $paymentColumns);
                $hasPosColumns = $hasPaymentMethod &&
                    in_array('receipt_number', $paymentColumns) &&
                    in_array('cashier_id', $paymentColumns);

                // Build payment insert query based on available columns
                // Use Philippines timezone for accurate timestamp
                $phTime = new DateTime('now', new DateTimeZone('Asia/Manila'));
                $phTimeString = $phTime->format('Y-m-d H:i:s');

                $paymentFields = ['subscription_id', 'amount', 'payment_date'];
                $paymentValues = [$subscriptionId, $paymentAmount, $phTimeString];

                if ($hasStatusColumn) {
                    $paymentFields[] = 'status';
                    $paymentValues[] = 'paid';
                }

                if ($hasPaymentMethod) {
                    $paymentFields[] = 'payment_method';
                    $paymentValues[] = $paymentMethod;
                }

                if ($hasPaymentIntentId && $paymentIntentId) {
                    $paymentFields[] = 'payment_intent_id';
                    $paymentValues[] = $paymentIntentId;
                }

                if ($hasPaymentLinkId && $paymentLinkId) {
                    $paymentFields[] = 'payment_link_id';
                    $paymentValues[] = $paymentLinkId;
                }

                if ($hasPosColumns) {
                    $paymentFields[] = 'receipt_number';
                    $paymentValues[] = $receiptNumber;
                    $paymentFields[] = 'cashier_id';
                    $paymentValues[] = $cashierId;
                }

                $paymentPlaceholders = implode(', ', array_fill(0, count($paymentValues), '?'));
                $paymentFieldsStr = implode(', ', $paymentFields);

                $paymentStmt = $pdo->prepare("
                        INSERT INTO payment ($paymentFieldsStr) 
                        VALUES ($paymentPlaceholders)
                    ");
                $paymentStmt->execute($paymentValues);
                $payment_id = $pdo->lastInsertId();
                error_log("Payment record created successfully. Payment ID: $payment_id, Subscription ID: $subscriptionId, Amount: $paymentAmount, Method: $paymentMethod");
            } else {
                throw new Exception("Payment not confirmed - subscription approval cancelled");
            }

            // Also create sales record with POS data - only for confirmed payments
            try {
                if ($transactionStatus === 'confirmed' || $transactionStatus === 'completed') {
                    // Check if sales table has POS columns
                    $checkSalesColumns = $pdo->query("SHOW COLUMNS FROM sales");
                    $salesColumns = $checkSalesColumns->fetchAll(PDO::FETCH_COLUMN);

                    $hasPosColumns = in_array('payment_method', $salesColumns) &&
                        in_array('amount_received', $salesColumns) &&
                        in_array('change_given', $salesColumns) &&
                        in_array('receipt_number', $salesColumns);
                    $hasReferenceNumber = in_array('reference_number', $salesColumns);

                    // Get reference number for GCash payments
                    $referenceNumber = null;
                    if (strtolower($paymentMethod) === 'gcash' || strtolower($paymentMethod) === 'digital') {
                        $referenceNumber = $data['reference_number'] ?? null;
                    }

                    if ($hasPosColumns) {
                        if ($hasReferenceNumber) {
                            $salesStmt = $pdo->prepare("
                                    INSERT INTO sales (user_id, total_amount, sale_date, sale_type, payment_method, amount_received, change_given, receipt_number, cashier_id, notes, transaction_status, reference_number) 
                                    VALUES (?, ?, NOW(), 'Subscription', ?, ?, ?, ?, ?, ?, 'confirmed', ?)
                                ");
                            $salesStmt->execute([$subscription['user_id'], $paymentAmount, $paymentMethod, $amountReceived, $changeGiven, $receiptNumber, $cashierId, $notes, $referenceNumber]);
                        } else {
                            $salesStmt = $pdo->prepare("
                                    INSERT INTO sales (user_id, total_amount, sale_date, sale_type, payment_method, amount_received, change_given, receipt_number, cashier_id, notes, transaction_status) 
                                    VALUES (?, ?, NOW(), 'Subscription', ?, ?, ?, ?, ?, ?, 'confirmed')
                                ");
                            $salesStmt->execute([$subscription['user_id'], $paymentAmount, $paymentMethod, $amountReceived, $changeGiven, $receiptNumber, $cashierId, $notes]);
                        }
                        $sale_id = $pdo->lastInsertId();
                        error_log("Sales record created successfully. Sale ID: $sale_id, Subscription ID: $subscriptionId, Amount: $paymentAmount, Method: $paymentMethod, Receipt: $receiptNumber");
                    } else {
                        // Fallback to basic sales record with receipt number
                        if ($hasReferenceNumber) {
                            $salesStmt = $pdo->prepare("
                                    INSERT INTO sales (user_id, total_amount, sale_date, sale_type, payment_method, transaction_status, receipt_number, cashier_id, change_given, reference_number) 
                                    VALUES (?, ?, NOW(), 'Subscription', ?, 'confirmed', ?, ?, ?, ?)
                                ");
                            $salesStmt->execute([$subscription['user_id'], $paymentAmount, $paymentMethod, $receiptNumber, $cashierId, $changeGiven, $referenceNumber]);
                        } else {
                            $salesStmt = $pdo->prepare("
                                    INSERT INTO sales (user_id, total_amount, sale_date, sale_type, payment_method, transaction_status, receipt_number, cashier_id, change_given) 
                                    VALUES (?, ?, NOW(), 'Subscription', ?, 'confirmed', ?, ?, ?)
                                ");
                            $salesStmt->execute([$subscription['user_id'], $paymentAmount, $paymentMethod, $receiptNumber, $cashierId, $changeGiven]);
                        }
                        $sale_id = $pdo->lastInsertId();
                        error_log("Sales record created successfully (fallback). Sale ID: $sale_id, Subscription ID: $subscriptionId, Amount: $paymentAmount, Method: $paymentMethod, Receipt: $receiptNumber");
                    }
                }
            } catch (Exception $e) {
                // Log the error but don't fail the entire transaction for sales record
                error_log("WARNING: Sales record creation failed for subscription $subscriptionId: " . $e->getMessage());
                error_log("WARNING: Sales record creation trace: " . $e->getTraceAsString());
                // Don't throw - payment record is more critical than sales record
            }

        } catch (Exception $e) {
            // If payment table doesn't exist or payment not confirmed, rollback transaction
            if (strpos($e->getMessage(), 'Payment not confirmed') !== false) {
                throw $e; // Re-throw payment confirmation errors
            }
            // Log the error for debugging
            error_log("ERROR: Failed to create payment record for subscription $subscriptionId: " . $e->getMessage());
            error_log("ERROR: Payment record creation trace: " . $e->getTraceAsString());
            // Re-throw the exception to prevent transaction from committing without payment record
            throw new Exception("Failed to create payment record: " . $e->getMessage());
        }

        $pdo->commit();

        // Calculate duration in months from payment amount (more accurate than end_date)
        $planPrice = floatval($subscription['price']);
        $totalMonths = 1; // Default to 1 month

        if ($planPrice > 0 && $paymentAmount > 0) {
            // Calculate how many months the payment covers
            $monthsPaid = floor($paymentAmount / $planPrice);
            if ($monthsPaid > 0) {
                $totalMonths = $monthsPaid;
            } else {
                // If payment is less than plan price, calculate from dates
                $start_date_obj = new DateTime($subscription['start_date']);
                $end_date_obj = new DateTime($subscription['end_date']);
                $interval = $start_date_obj->diff($end_date_obj);
                $totalMonths = ($interval->y * 12) + $interval->m;
                if ($interval->d > 0) {
                    $totalMonths += 1;
                }
            }
        } else {
            // If plan price is 0, calculate from dates
            $start_date_obj = new DateTime($subscription['start_date']);
            $end_date_obj = new DateTime($subscription['end_date']);
            $interval = $start_date_obj->diff($end_date_obj);
            $totalMonths = ($interval->y * 12) + $interval->m;
            if ($interval->d > 0) {
                $totalMonths += 1;
            }
        }

        // Log activity using centralized logger
        $staffId = $data['staff_id'] ?? null;
        error_log("DEBUG Approve with Payment: Payment amount: {$paymentAmount}, Plan price: {$planPrice}, Calculated months: {$totalMonths}");
        // Simplified message format with duration
        $memberName = "{$subscription['fname']} {$subscription['lname']}";
        $durationText = $totalMonths > 0 ? " ({$totalMonths} month" . ($totalMonths > 1 ? 's' : '') . ")" : "";
        $message = "{$subscription['plan_name']}{$durationText} for {$memberName} • Payment: {$paymentMethod} • Amount: ₱{$paymentAmount} • Received: ₱{$amountReceived} • Change: ₱{$changeGiven} • Receipt: {$receiptNumber}";
        logStaffActivity($pdo, $staffId, "Approve Subscription with Payment", $message, "Subscription Management", [
            'subscription_id' => $subscriptionId,
            'user_id' => $subscription['user_id'],
            'user_name' => $subscription['fname'] . ' ' . $subscription['lname'],
            'plan_name' => $subscription['plan_name'],
            'approved_by' => $approvedBy,
            'payment_method' => $paymentMethod,
            'amount_paid' => $paymentAmount,
            'amount_received' => $amountReceived,
            'change_given' => $changeGiven,
            'receipt_number' => $receiptNumber,
            'duration_months' => $totalMonths
        ]);

        $message = $isPackagePlan ?
            "Package subscription approved and split into individual plans (Membership + Access). Payment processed successfully." :
            "Subscription approved and payment processed successfully";

        echo json_encode([
            "success" => true,
            "subscription_id" => $subscriptionId,
            "status" => "approved",
            "message" => $message,
            "is_package_plan" => $isPackagePlan,
            "receipt_number" => $receiptNumber,
            "payment_method" => $paymentMethod,
            "change_given" => $changeGiven,
            "data" => [
                "subscription_id" => $subscriptionId,
                "user_name" => trim($subscription['fname'] . ' ' . $subscription['lname']),
                "user_email" => $subscription['email'],
                "plan_name" => $subscription['plan_name'],
                "status" => "approved",
                "approved_at" => date('Y-m-d H:i:s'),
                "approved_by" => $approvedBy,
                "payment_method" => $paymentMethod,
                "amount_paid" => $paymentAmount,
                "amount_received" => $amountReceived,
                "change_given" => $changeGiven,
                "receipt_number" => $receiptNumber,
                "is_package_plan" => $isPackagePlan
            ]
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Approval with payment failed", "message" => $e->getMessage()]);
    }
}

function declineSubscription($pdo, $data)
{
    if (!isset($data['subscription_id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Missing subscription_id", "message" => "subscription_id is required"]);
        return;
    }

    $subscriptionId = $data['subscription_id'];
    $declinedBy = $data['declined_by'] ?? 'Admin';
    $declineReason = $data['decline_reason'] ?? '';

    $pdo->beginTransaction();

    try {
        $checkStmt = $pdo->prepare("
                SELECT s.id, s.user_id, s.plan_id, st.status_name,
                       u.fname, u.lname, u.email,
                       p.plan_name, p.price
                FROM subscription s
                JOIN subscription_status st ON s.status_id = st.id
                JOIN user u ON s.user_id = u.id
                JOIN member_subscription_plan p ON s.plan_id = p.id
                WHERE s.id = ?
            ");
        $checkStmt->execute([$subscriptionId]);
        $subscription = $checkStmt->fetch();

        if (!$subscription)
            throw new Exception("Subscription not found.");
        if ($subscription['status_name'] !== 'pending_approval')
            throw new Exception("Subscription is not in pending status. Current status: " . $subscription['status_name']);

        // Try 'rejected' first, then 'declined' as fallback
        $statusStmt = $pdo->prepare("SELECT id FROM subscription_status WHERE status_name = 'rejected'");
        $statusStmt->execute();
        $declinedStatus = $statusStmt->fetch();

        if (!$declinedStatus) {
            $statusStmt = $pdo->prepare("SELECT id FROM subscription_status WHERE status_name = 'declined'");
            $statusStmt->execute();
            $declinedStatus = $statusStmt->fetch();
        }

        if (!$declinedStatus)
            throw new Exception("Declined/Rejected status not found in database.");

        $updateStmt = $pdo->prepare("UPDATE subscription SET status_id = ? WHERE id = ?");
        $updateStmt->execute([$declinedStatus['id'], $subscriptionId]);

        $pdo->commit();

        // Log activity using centralized logger
        $staffId = $data['staff_id'] ?? null;
        logStaffActivity($pdo, $staffId, "Decline Subscription", "Subscription declined: {$subscription['plan_name']} for {$subscription['fname']} {$subscription['lname']} by {$declinedBy} - Reason: {$declineReason}", "Subscription Management", [
            'subscription_id' => $subscriptionId,
            'user_id' => $subscription['user_id'],
            'user_name' => $subscription['fname'] . ' ' . $subscription['lname'],
            'plan_name' => $subscription['plan_name'],
            'decline_reason' => $declineReason,
            'declined_by' => $declinedBy
        ]);

        echo json_encode([
            "success" => true,
            "subscription_id" => $subscriptionId,
            "status" => "declined",
            "message" => "Subscription declined successfully",
            "data" => [
                "subscription_id" => $subscriptionId,
                "user_name" => trim($subscription['fname'] . ' ' . $subscription['lname']),
                "user_email" => $subscription['email'],
                "plan_name" => $subscription['plan_name'],
                "status" => "declined",
                "decline_reason" => $declineReason,
                "declined_at" => date('Y-m-d H:i:s'),
                "declined_by" => $declinedBy
            ]
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Decline failed", "message" => $e->getMessage()]);
    }
}

function updateSubscription($pdo, $data)
{
    if (!isset($data['id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Missing ID", "message" => "Subscription ID is required"]);
        return;
    }

    $id = $data['id'];

    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare("UPDATE subscription SET user_id = ?, plan_id = ?, status_id = ?, start_date = ?, end_date = ? WHERE id = ?");
        $stmt->execute([$data['user_id'], $data['plan_id'], $data['status_id'], $data['start_date'], $data['end_date'], $id]);

        $pdo->commit();

        echo json_encode([
            "success" => true,
            "subscription_id" => $id,
            "message" => "Subscription updated successfully"
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Update failed", "message" => $e->getMessage()]);
    }
}

function deleteSubscription($pdo, $data)
{
    if (!isset($data['id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Missing ID", "message" => "Subscription ID is required"]);
        return;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM subscription WHERE id = ?");
        $stmt->execute([$data['id']]);

        echo json_encode([
            "success" => true,
            "subscription_id" => $data['id'],
            "message" => "Subscription deleted successfully"
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Delete failed", "message" => $e->getMessage()]);
    }
}

// POS Functions for Subscriptions
function generateSubscriptionReceiptNumber($pdo)
{
    do {
        $receiptNumber = 'SUB' . date('Ymd') . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM sales WHERE receipt_number = ?");
        $stmt->execute([$receiptNumber]);
        $count = $stmt->fetchColumn();
    } while ($count > 0);

    return $receiptNumber;
}
function getSubscriptionPayments($pdo, $subscription_id)
{
    try {
        // Check if payment table has status column
        $checkColumnStmt = $pdo->query("SHOW COLUMNS FROM payment LIKE 'status'");
        $hasStatusColumn = $checkColumnStmt->rowCount() > 0;

        if ($hasStatusColumn) {
            // Query with status filter
            $stmt = $pdo->prepare("
                SELECT 
                    id,
                    subscription_id,
                    amount,
                    payment_method,
                    payment_date,
                    receipt_number,
                    reference_number,
                    change_given,
                    amount_received,
                    created_at,
                    status
                FROM payment 
                WHERE subscription_id = ? 
                AND (status = 'paid' OR status = 'completed')
                ORDER BY payment_date ASC, id ASC
            ");
        } else {
            // Query without status filter
            $stmt = $pdo->prepare("
                SELECT 
                    id,
                    subscription_id,
                    amount,
                    payment_method,
                    payment_date,
                    receipt_number,
                    reference_number,
                    change_given,
                    amount_received,
                    created_at
                FROM payment 
                WHERE subscription_id = ?
                ORDER BY payment_date ASC, id ASC
            ");
        }

        $stmt->execute([$subscription_id]);
        $payments = $stmt->fetchAll();

        echo json_encode([
            "success" => true,
            "payments" => $payments,
            "count" => count($payments)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Database error",
            "message" => $e->getMessage()
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Error fetching payments",
            "message" => $e->getMessage()
        ]);
    }
}

function getUserSales($pdo, $user_id)
{
    header('Content-Type: application/json');

    try {
        $user_id = intval($user_id);

        if ($user_id <= 0) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "Invalid parameters",
                "message" => "user_id must be a positive integer"
            ]);
            return;
        }

        // Get all sales for this user, including subscription sales
        $stmt = $pdo->prepare("
            SELECT 
                s.id,
                s.user_id,
                s.total_amount,
                s.sale_date,
                s.sale_type,
                s.payment_method,
                s.transaction_status,
                s.receipt_number,
                s.reference_number,
                s.cashier_id,
                s.change_given,
                s.notes,
                sd.id AS detail_id,
                sd.subscription_id,
                sd.product_id,
                sd.quantity,
                sd.price AS detail_price,
                sub.plan_id,
                sub.amount_paid AS subscription_amount_paid,
                sub.payment_method AS subscription_payment_method,
                msp.plan_name,
                msp.price AS plan_price
            FROM sales s
            LEFT JOIN sales_details sd ON s.id = sd.sale_id
            LEFT JOIN subscription sub ON sd.subscription_id = sub.id
            LEFT JOIN member_subscription_plan msp ON sub.plan_id = msp.id
            WHERE s.user_id = ?
            AND s.sale_type = 'Subscription'
            ORDER BY sub.plan_id ASC, s.sale_date DESC
        ");

        $stmt->execute([$user_id]);
        $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Check payment table columns
        $checkPaymentColumns = $pdo->query("SHOW COLUMNS FROM payment");
        $paymentColumns = $checkPaymentColumns->fetchAll(PDO::FETCH_COLUMN);
        $hasStatusColumn = in_array('status', $paymentColumns);
        $hasReceiptNumber = in_array('receipt_number', $paymentColumns);
        $hasReferenceNumber = in_array('reference_number', $paymentColumns);
        $hasAmountReceived = in_array('amount_received', $paymentColumns);
        $hasChangeGiven = in_array('change_given', $paymentColumns);
        $hasPaymentMethod = in_array('payment_method', $paymentColumns);

        // Also get payments for these subscriptions
        foreach ($sales as &$sale) {
            if ($sale['subscription_id']) {
                // Build payment query based on available columns
                $paymentFields = ['id', 'subscription_id', 'amount', 'payment_date'];
                if ($hasPaymentMethod) {
                    $paymentFields[] = 'payment_method';
                }
                if ($hasReceiptNumber) {
                    $paymentFields[] = 'receipt_number';
                }
                if ($hasReferenceNumber) {
                    $paymentFields[] = 'reference_number';
                }
                if ($hasAmountReceived) {
                    $paymentFields[] = 'amount_received';
                }
                if ($hasChangeGiven) {
                    $paymentFields[] = 'change_given';
                }
                if ($hasStatusColumn) {
                    $paymentFields[] = 'status';
                }

                $paymentFieldsStr = implode(', ', $paymentFields);
                $whereClause = "WHERE subscription_id = ?";
                if ($hasStatusColumn) {
                    $whereClause .= " AND (status = 'paid' OR status = 'completed')";
                }

                $paymentStmt = $pdo->prepare("
                    SELECT $paymentFieldsStr
                    FROM payment
                    $whereClause
                    ORDER BY payment_date DESC
                ");
                $paymentStmt->execute([$sale['subscription_id']]);
                $sale['payments'] = $paymentStmt->fetchAll(PDO::FETCH_ASSOC);

                // Get payment method and reference number from payment table if not in sales table
                if (!empty($sale['payments'])) {
                    $firstPayment = $sale['payments'][0];

                    // If payment_method is not set in sales, get it from payment table
                    if (empty($sale['payment_method']) && !empty($firstPayment['payment_method'])) {
                        $sale['payment_table_payment_method'] = $firstPayment['payment_method'];
                    }

                    // If reference_number is not in sales table but exists in payment table, use it
                    if (empty($sale['reference_number']) && !empty($firstPayment['reference_number'])) {
                        $sale['payment_reference_number'] = $firstPayment['reference_number'];
                    }
                }
            } else {
                $sale['payments'] = [];
            }
        }
        unset($sale);

        echo json_encode([
            "success" => true,
            "sales" => $sales,
            "count" => count($sales)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        error_log("Error in getUserSales (PDOException): " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        echo json_encode([
            "success" => false,
            "error" => "Database error",
            "message" => $e->getMessage()
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        error_log("Error in getUserSales (Exception): " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        echo json_encode([
            "success" => false,
            "error" => "Error fetching sales",
            "message" => $e->getMessage()
        ]);
    }
}

function getGuestSessionSales($pdo, $guest_session_id)
{
    header('Content-Type: application/json');

    try {
        $guest_session_id = intval($guest_session_id);

        if ($guest_session_id <= 0) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "Invalid parameters",
                "message" => "guest_session_id must be a positive integer"
            ]);
            return;
        }

        // Get sales for this guest session
        $stmt = $pdo->prepare("
            SELECT 
                s.id,
                s.user_id,
                s.total_amount,
                s.sale_date,
                s.sale_type,
                s.payment_method,
                s.transaction_status,
                s.receipt_number,
                s.reference_number,
                s.cashier_id,
                s.change_given,
                s.notes,
                sd.id AS detail_id,
                sd.guest_session_id,
                sd.quantity,
                sd.price AS detail_price,
                gs.guest_name,
                gs.reference_number AS guest_reference_number,
                gs.session_code,
                msp.plan_name,
                msp.price AS plan_price
            FROM sales s
            LEFT JOIN sales_details sd ON s.id = sd.sale_id
            LEFT JOIN guest_session gs ON sd.guest_session_id = gs.id
            LEFT JOIN member_subscription_plan msp ON msp.id = 6
            WHERE sd.guest_session_id = ?
            AND s.sale_type = 'Guest'
            ORDER BY s.sale_date DESC
        ");

        $stmt->execute([$guest_session_id]);
        $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Add reference_number from guest_session if not in sales
        foreach ($sales as &$sale) {
            if (empty($sale['reference_number']) && !empty($sale['guest_reference_number'])) {
                $sale['reference_number'] = $sale['guest_reference_number'];
            }
            // Set plan_name for guest sessions
            if (empty($sale['plan_name'])) {
                $sale['plan_name'] = 'Gym Session';
            }
        }
        unset($sale);

        echo json_encode([
            "success" => true,
            "sales" => $sales,
            "count" => count($sales)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        error_log("Error in getGuestSessionSales (PDOException): " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "error" => "Database error",
            "message" => $e->getMessage()
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        error_log("Error in getGuestSessionSales (Exception): " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "error" => "Error fetching sales",
            "message" => $e->getMessage()
        ]);
    }
}

function getSubscriptionHistory($pdo, $user_id, $plan_id)
{
    // Ensure we're outputting JSON
    header('Content-Type: application/json');

    try {
        // Validate input parameters
        $user_id = intval($user_id);
        $plan_id = intval($plan_id);

        if ($user_id <= 0 || $plan_id <= 0) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "Invalid parameters",
                "message" => "user_id and plan_id must be positive integers"
            ]);
            return;
        }

        // Check which columns exist in subscription table
        $checkSubColumns = $pdo->query("SHOW COLUMNS FROM subscription");
        $subColumns = $checkSubColumns->fetchAll(PDO::FETCH_COLUMN);
        $hasReceiptNumber = in_array('receipt_number', $subColumns);
        $hasPaymentMethod = in_array('payment_method', $subColumns);
        $hasCreatedAt = in_array('created_at', $subColumns);
        $hasQuantity = in_array('quantity', $subColumns);
        $hasDiscountedPrice = in_array('discounted_price', $subColumns);

        // Build subscription query based on available columns
        $subFields = ['s.id', 's.start_date', 's.end_date', 's.amount_paid'];
        if ($hasDiscountedPrice) {
            $subFields[] = 's.discounted_price';
        } else {
            $subFields[] = 'NULL as discounted_price';
        }
        if ($hasReceiptNumber) {
            $subFields[] = 's.receipt_number';
        } else {
            $subFields[] = 'NULL as receipt_number';
        }
        if ($hasPaymentMethod) {
            $subFields[] = 's.payment_method';
        } else {
            $subFields[] = 'NULL as payment_method';
        }
        if ($hasCreatedAt) {
            $subFields[] = 's.created_at';
        } else {
            $subFields[] = 'NULL as created_at';
        }
        if ($hasQuantity) {
            $subFields[] = 's.quantity';
        } else {
            $subFields[] = '1 as quantity';
        }
        $subFields[] = 'p.plan_name';
        $subFields[] = 'p.price as plan_price';
        $subFields[] = 'st.status_name';
        $subFields[] = "CASE 
                    WHEN st.status_name = 'pending_approval' THEN 'Pending Approval'
                    WHEN st.status_name = 'approved' AND s.end_date >= CURDATE() THEN 'Active'
                    WHEN st.status_name = 'approved' AND s.end_date < CURDATE() THEN 'Expired'
                    WHEN st.status_name = 'rejected' THEN 'Declined'
                    WHEN st.status_name = 'cancelled' THEN 'Cancelled'
                    WHEN st.status_name = 'expired' THEN 'Expired'
                    ELSE st.status_name
                END as display_status";

        $subFieldsStr = implode(', ', $subFields);

        // Get all subscriptions for this user and plan_id, ordered by start_date
        // Include all subscriptions regardless of payment status to show complete history
        $stmt = $pdo->prepare("
            SELECT $subFieldsStr
            FROM subscription s
            JOIN member_subscription_plan p ON s.plan_id = p.id
            JOIN subscription_status st ON s.status_id = st.id
            WHERE s.user_id = ? 
            AND s.plan_id = ?
            ORDER BY s.start_date ASC, s.id ASC
        ");

        $stmt->execute([$user_id, $plan_id]);
        $subscriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // If no subscriptions found, return empty array
        if (empty($subscriptions)) {
            echo json_encode([
                "success" => true,
                "subscriptions" => [],
                "count" => 0
            ]);
            return;
        }

        // Check if payment table exists and has status column
        $paymentTableExists = false;
        $hasStatusColumn = false;

        try {
            $checkTableStmt = $pdo->query("SHOW TABLES LIKE 'payment'");
            $paymentTableExists = $checkTableStmt->rowCount() > 0;

            if ($paymentTableExists) {
                try {
                    $checkColumnStmt = $pdo->query("SHOW COLUMNS FROM payment LIKE 'status'");
                    $hasStatusColumn = $checkColumnStmt->rowCount() > 0;
                } catch (Exception $e) {
                    error_log("Error checking payment table status column: " . $e->getMessage());
                    $hasStatusColumn = false;
                }
            }
        } catch (Exception $e) {
            error_log("Error checking payment table existence: " . $e->getMessage());
            $paymentTableExists = false;
        }

        // For each subscription, get its payment transactions
        foreach ($subscriptions as &$subscription) {
            try {
                $subscription['payments'] = [];
                $subscription['payment_count'] = 0;

                // Only try to fetch payments if payment table exists
                if ($paymentTableExists && isset($subscription['id'])) {
                    try {
                        // Check which payment columns exist
                        $checkPaymentColumns = $pdo->query("SHOW COLUMNS FROM payment");
                        $paymentColumns = $checkPaymentColumns->fetchAll(PDO::FETCH_COLUMN);
                        $hasReceiptNumber = in_array('receipt_number', $paymentColumns);
                        $hasReferenceNumber = in_array('reference_number', $paymentColumns);
                        $hasAmountReceived = in_array('amount_received', $paymentColumns);
                        $hasChangeGiven = in_array('change_given', $paymentColumns);
                        $hasPaymentMethod = in_array('payment_method', $paymentColumns);
                        $hasCreatedAt = in_array('created_at', $paymentColumns);

                        // Build payment query based on available columns
                        $paymentFields = ['id', 'subscription_id', 'amount', 'payment_date'];
                        if ($hasPaymentMethod) {
                            $paymentFields[] = 'payment_method';
                        }
                        if ($hasReceiptNumber) {
                            $paymentFields[] = 'receipt_number';
                        }
                        if ($hasReferenceNumber) {
                            $paymentFields[] = 'reference_number';
                        }
                        if ($hasAmountReceived) {
                            $paymentFields[] = 'amount_received';
                        }
                        if ($hasChangeGiven) {
                            $paymentFields[] = 'change_given';
                        }
                        if ($hasCreatedAt) {
                            $paymentFields[] = 'created_at';
                        }
                        if ($hasStatusColumn) {
                            $paymentFields[] = 'status';
                        }

                        $paymentFieldsStr = implode(', ', $paymentFields);
                        $whereClause = "WHERE subscription_id = ?";
                        if ($hasStatusColumn) {
                            $whereClause .= " AND (status = 'paid' OR status = 'completed')";
                        }

                        $paymentStmt = $pdo->prepare("
                            SELECT $paymentFieldsStr
                            FROM payment 
                            $whereClause
                            ORDER BY payment_date ASC, id ASC
                        ");

                        $paymentStmt->execute([$subscription['id']]);
                        $subscription['payments'] = $paymentStmt->fetchAll(PDO::FETCH_ASSOC);
                        $subscription['payment_count'] = count($subscription['payments']);
                    } catch (PDOException $e) {
                        error_log("PDO Error fetching payments for subscription {$subscription['id']}: " . $e->getMessage());
                        $subscription['payments'] = [];
                        $subscription['payment_count'] = 0;
                    }
                }

                // Calculate total_paid from payments, or fall back to subscription's amount_paid
                $paymentsTotal = 0;
                if (!empty($subscription['payments']) && is_array($subscription['payments'])) {
                    try {
                        $amounts = array_column($subscription['payments'], 'amount');
                        if (!empty($amounts) && is_array($amounts)) {
                            $paymentsTotal = array_sum(array_map('floatval', $amounts));
                        }
                    } catch (Exception $e) {
                        error_log("Error calculating payments total: " . $e->getMessage());
                        $paymentsTotal = 0;
                    }
                }

                $subscriptionAmountPaid = floatval($subscription['amount_paid'] ?? 0);

                // Use the higher value between payments total and subscription amount_paid
                // This handles cases where payments might not be recorded but amount_paid is set
                $subscription['total_paid'] = max($paymentsTotal, $subscriptionAmountPaid);

                // If both are 0, keep it as 0
                if ($subscription['total_paid'] == 0 && $paymentsTotal == 0 && $subscriptionAmountPaid == 0) {
                    $subscription['total_paid'] = 0;
                }
            } catch (Exception $e) {
                // If payment fetching fails for a subscription, set defaults
                $subId = isset($subscription['id']) ? $subscription['id'] : 'unknown';
                error_log("Error processing subscription {$subId}: " . $e->getMessage());
                $subscription['payments'] = [];
                $subscription['payment_count'] = 0;
                $subscription['total_paid'] = floatval($subscription['amount_paid'] ?? 0);
            }
        }
        unset($subscription);

        // Ensure all subscriptions have required fields
        foreach ($subscriptions as &$sub) {
            if (!isset($sub['payments'])) {
                $sub['payments'] = [];
            }
            if (!isset($sub['payment_count'])) {
                $sub['payment_count'] = 0;
            }
            if (!isset($sub['total_paid'])) {
                $sub['total_paid'] = floatval($sub['amount_paid'] ?? 0);
            }
            // Ensure all fields are properly set
            $sub['id'] = isset($sub['id']) ? intval($sub['id']) : 0;
            $sub['start_date'] = isset($sub['start_date']) ? $sub['start_date'] : null;
            $sub['end_date'] = isset($sub['end_date']) ? $sub['end_date'] : null;
            $sub['amount_paid'] = isset($sub['amount_paid']) ? floatval($sub['amount_paid']) : 0;
            $sub['plan_name'] = isset($sub['plan_name']) ? $sub['plan_name'] : 'Unknown Plan';
            $sub['status_name'] = isset($sub['status_name']) ? $sub['status_name'] : 'unknown';
            $sub['display_status'] = isset($sub['display_status']) ? $sub['display_status'] : $sub['status_name'];
        }
        unset($sub);

        // Convert to JSON with proper error handling
        $jsonResponse = json_encode([
            "success" => true,
            "subscriptions" => $subscriptions,
            "count" => count($subscriptions)
        ], JSON_UNESCAPED_UNICODE);

        if ($jsonResponse === false) {
            $errorMsg = json_last_error_msg();
            error_log("JSON encoding failed: " . $errorMsg);
            error_log("Data that failed to encode: " . print_r($subscriptions, true));
            throw new Exception("JSON encoding failed: " . $errorMsg);
        }

        echo $jsonResponse;
    } catch (PDOException $e) {
        http_response_code(500);
        error_log("PDO Error in getSubscriptionHistory: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        header('Content-Type: application/json');
        $errorResponse = json_encode([
            "success" => false,
            "error" => "Database error",
            "message" => $e->getMessage(),
            "file" => basename($e->getFile()),
            "line" => $e->getLine()
        ]);
        if ($errorResponse === false) {
            echo '{"success":false,"error":"Database error","message":"Failed to encode error response"}';
        } else {
            echo $errorResponse;
        }
    } catch (Exception $e) {
        http_response_code(500);
        error_log("Error in getSubscriptionHistory: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        header('Content-Type: application/json');
        $errorResponse = json_encode([
            "success" => false,
            "error" => "Error fetching subscription history",
            "message" => $e->getMessage(),
            "file" => basename($e->getFile()),
            "line" => $e->getLine()
        ]);
        if ($errorResponse === false) {
            echo '{"success":false,"error":"Error fetching subscription history","message":"Failed to encode error response"}';
        } else {
            echo $errorResponse;
        }
    }
}

?>