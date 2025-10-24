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

// Database configuration - Remote Database
$host = "localhost";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";


// Connect to database
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
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
    $stmt = $pdo->query("
        SELECT s.id, s.start_date, s.end_date, s.discounted_price, s.amount_paid,
               u.id as user_id, u.fname, u.mname, u.lname, u.email,
               p.id as plan_id, p.plan_name, p.price, p.duration_months,
               st.id as status_id, st.status_name,
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
        JOIN user u ON s.user_id = u.id
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
        ORDER BY 
            CASE 
                WHEN st.status_name = 'pending_approval' THEN 1
                WHEN st.status_name = 'approved' THEN 2
                ELSE 3
            END,
            s.start_date DESC
    ");

    $subscriptions = $stmt->fetchAll();

    // Get payment information for each subscription
    foreach ($subscriptions as &$subscription) {
        try {
            // First, check if payment table has status column
            $checkColumnStmt = $pdo->query("SHOW COLUMNS FROM payment LIKE 'status'");
            $hasStatusColumn = $checkColumnStmt->rowCount() > 0;

            if ($hasStatusColumn) {
                // Query with status filter
                $paymentStmt = $pdo->prepare("
                    SELECT COUNT(*) as payment_count, SUM(amount) as total_paid
                    FROM payment 
                    WHERE subscription_id = ? 
                    AND status = 'completed'
                ");
            } else {
                // Query without status filter (assume all payments are completed)
                $paymentStmt = $pdo->prepare("
                    SELECT COUNT(*) as payment_count, SUM(amount) as total_paid
                    FROM payment 
                    WHERE subscription_id = ?
                ");
            }

            $paymentStmt->execute([$subscription['id']]);
            $paymentInfo = $paymentStmt->fetch();

            $subscription['payments'] = [];
            $subscription['payment_count'] = $paymentInfo['payment_count'] ?? 0;
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
    $stmt = $pdo->prepare("
        SELECT s.id as subscription_id, s.start_date, s.end_date,
               u.id as user_id, u.fname, u.mname, u.lname, u.email,
               p.id as plan_id, p.plan_name, p.price, p.duration_months,
               st.id as status_id, st.status_name,
               s.start_date as created_at
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
        ORDER BY s.start_date ASC
    ");

    $stmt->execute();
    $pendingSubscriptions = $stmt->fetchAll();

    echo json_encode([
        "success" => true,
        "data" => $pendingSubscriptions,
        "count" => count($pendingSubscriptions),
        "message" => "Pending subscriptions retrieved successfully"
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
    $stmt = $pdo->prepare("
        SELECT s.id, s.user_id, s.plan_id, s.start_date, s.end_date, s.amount_paid, s.discounted_price,
               u.fname, u.mname, u.lname, u.email,
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
            p.plan_name,
            p.price as original_price,
            p.duration_months,
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
        SELECT s.plan_id, s.end_date, p.plan_name, ss.status_name
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
    $activePlanIds = array_column($activeSubscriptions, 'plan_id');

    // Get all subscription plans
    $plansStmt = $pdo->query("
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
    $allPlans = $plansStmt->fetchAll();

    $availablePlans = [];
    $hasActiveMemberFee = in_array(1, $activePlanIds);

    foreach ($allPlans as $plan) {
        $planId = $plan['id'];
        $isPlanActive = in_array($planId, $activePlanIds);

        // Plan 1 (Member Fee) - available if not active
        if ($planId == 1) {
            if (!$isPlanActive) {
                $availablePlans[] = $plan;
            }
        }
        // Plan 2 (Member Plan Monthly) - only available if Plan 1 is active AND Plan 2 is not active
        elseif ($planId == 2) {
            if ($hasActiveMemberFee && !$isPlanActive) {
                $availablePlans[] = $plan;
            }
        }
        // Plan 3 (Non-Member Plan Monthly) - available if no Plan 1 is active AND Plan 3 is not active
        elseif ($planId == 3) {
            if (!$hasActiveMemberFee && !$isPlanActive) {
                $availablePlans[] = $plan;
            }
        }
        // Other plans - available if not active
        else {
            if (!$isPlanActive) {
                $availablePlans[] = $plan;
            }
        }
    }

    echo json_encode([
        "success" => true,
        "plans" => $availablePlans,
        "count" => count($availablePlans),
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
    $discount_type = $data['discount_type'] ?? 'regular'; // Use original discount keys
    $created_by = $data['created_by'] ?? 'admin';

    // CRITICAL: Validate payment details before creating subscription
    $paymentMethod = $data['payment_method'] ?? 'cash';
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
        $userStmt = $pdo->prepare("SELECT id, fname, lname, email, user_type_id, account_status FROM user WHERE id = ?");
        $userStmt->execute([$user_id]);
        $user = $userStmt->fetch();

        if (!$user)
            throw new Exception("User not found");
        if ($user['user_type_id'] != 4)
            throw new Exception("Subscriptions can only be created for customers");
        if ($user['account_status'] !== 'approved')
            throw new Exception("User account must be approved first");

        // Verify plan exists
        $planStmt = $pdo->prepare("SELECT id, plan_name, price, duration_months FROM member_subscription_plan WHERE id = ?");
        $planStmt->execute([$plan_id]);
        $plan = $planStmt->fetch();

        if (!$plan)
            throw new Exception("Subscription plan not found");

        // Calculate end date
        $start_date_obj = new DateTime($start_date);
        $end_date_obj = clone $start_date_obj;
        $end_date_obj->add(new DateInterval('P' . $plan['duration_months'] . 'M'));
        $end_date = $end_date_obj->format('Y-m-d');

        // Get approved status ID for manual subscriptions
        $statusStmt = $pdo->prepare("SELECT id FROM subscription_status WHERE status_name = 'approved'");
        $statusStmt->execute();
        $status = $statusStmt->fetch();

        if (!$status) {
            throw new Exception("Approved status not found in database");
        }

        // Check for existing active subscriptions to prevent duplicates
        // CRITICAL: Only consider subscriptions with confirmed payments
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

        if ($existingSubscription) {
            throw new Exception("User already has an active subscription to this plan: {$existingSubscription['plan_name']} (expires: {$existingSubscription['end_date']})");
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

        // Create subscription
        $subscriptionStmt = $pdo->prepare("
            INSERT INTO subscription (user_id, plan_id, status_id, start_date, end_date, discounted_price, discount_type, amount_paid, payment_method, receipt_number, cashier_id, change_given) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $subscriptionStmt->execute([$user_id, $plan_id, $status['id'], $start_date, $end_date, $payment_amount, $discount_type, $payment_amount, $paymentMethod, $receiptNumber, $cashierId, $changeGiven]);
        $subscription_id = $pdo->lastInsertId();

        // Create payment record - only for confirmed payments
        try {
            // Check if payment table has status column
            $checkColumnStmt = $pdo->query("SHOW COLUMNS FROM payment LIKE 'status'");
            $hasStatusColumn = $checkColumnStmt->rowCount() > 0;

            // Only create payment record if transaction is confirmed/completed
            if ($transactionStatus === 'confirmed' || $transactionStatus === 'completed') {
                if ($hasStatusColumn) {
                    $paymentStmt = $pdo->prepare("
                        INSERT INTO payment (subscription_id, amount, payment_date, status) 
                        VALUES (?, ?, NOW(), 'completed')
                    ");
                } else {
                    $paymentStmt = $pdo->prepare("
                        INSERT INTO payment (subscription_id, amount, payment_date) 
                        VALUES (?, ?, NOW())
                    ");
                }

                $paymentStmt->execute([$subscription_id, $payment_amount]);
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
        if ($transactionStatus === 'confirmed' || $transactionStatus === 'completed') {
            $salesStmt = $pdo->prepare("
                INSERT INTO sales (user_id, total_amount, sale_date, sale_type, payment_method, transaction_status, receipt_number, cashier_id, change_given) 
                VALUES (?, ?, NOW(), 'Subscription', ?, 'confirmed', ?, ?, ?)
            ");
            $salesStmt->execute([$user_id, $payment_amount, $paymentMethod, $receiptNumber, $cashierId, $changeGiven]);
            $sale_id = $pdo->lastInsertId();

            // Create sales details
            $salesDetailStmt = $pdo->prepare("
                INSERT INTO sales_details (sale_id, subscription_id, quantity, price) 
                VALUES (?, ?, 1, ?)
            ");
            $salesDetailStmt->execute([$sale_id, $subscription_id, $payment_amount]);
        } else {
            $sale_id = null;
        }

        // Log activity using centralized logger
        $staffId = $data['staff_id'] ?? null;
        error_log("DEBUG: Received staff_id: " . ($staffId ?? 'NULL') . " from request data");
        error_log("DEBUG: Full request data: " . json_encode($data));
        logStaffActivity($pdo, $staffId, "Create Manual Subscription", "Manual subscription created: {$plan['plan_name']} for {$user['fname']} {$user['lname']} by {$created_by}", "Subscription Management", [
            'subscription_id' => $subscription_id,
            'user_id' => $user_id,
            'user_name' => $user['fname'] . ' ' . $user['lname'],
            'plan_name' => $plan['plan_name'],
            'amount_paid' => $payment_amount,
            'created_by' => $created_by
        ]);

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

        $statusStmt = $pdo->prepare("SELECT id FROM subscription_status WHERE status_name = 'approved'");
        $statusStmt->execute();
        $approvedStatus = $statusStmt->fetch();

        if (!$approvedStatus)
            throw new Exception("Approved status not found in database.");

        $updateStmt = $pdo->prepare("UPDATE subscription SET status_id = ? WHERE id = ?");
        $updateStmt->execute([$approvedStatus['id'], $subscriptionId]);

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
            // Check if payment table has status column
            $checkColumnStmt = $pdo->query("SHOW COLUMNS FROM payment LIKE 'status'");
            $hasStatusColumn = $checkColumnStmt->rowCount() > 0;

            // Get subscription details for payment amount
            $subDetailsStmt = $pdo->prepare("
                SELECT s.discounted_price, s.amount_paid, p.price 
                FROM subscription s 
                JOIN member_subscription_plan p ON s.plan_id = p.id 
                WHERE s.id = ?
            ");
            $subDetailsStmt->execute([$subscriptionId]);
            $subDetails = $subDetailsStmt->fetch();

            $paymentAmount = $subDetails['amount_paid'] ?? $subDetails['discounted_price'] ?? $subDetails['price'] ?? 0;

            if ($hasStatusColumn) {
                $paymentStmt = $pdo->prepare("
                    INSERT INTO payment (subscription_id, amount, payment_date, status) 
                    VALUES (?, ?, NOW(), 'completed')
                ");
            } else {
                $paymentStmt = $pdo->prepare("
                    INSERT INTO payment (subscription_id, amount, payment_date) 
                    VALUES (?, ?, NOW())
                ");
            }

            $paymentStmt->execute([$subscriptionId, $paymentAmount]);

            // Also create sales record
            $salesStmt = $pdo->prepare("
                INSERT INTO sales (user_id, total_amount, sale_date, sale_type) 
                VALUES (?, ?, NOW(), 'Subscription')
            ");
            $salesStmt->execute([$subscription['user_id'], $paymentAmount]);

        } catch (Exception $e) {
            // If payment table doesn't exist or has issues, continue without creating payment
        }

        $pdo->commit();

        // Log activity using centralized logger
        $staffId = $data['staff_id'] ?? null;
        logStaffActivity($pdo, $staffId, "Approve Subscription", "Subscription approved: {$subscription['plan_name']} for {$subscription['fname']} {$subscription['lname']} by {$approvedBy}", "Subscription Management", [
            'subscription_id' => $subscriptionId,
            'user_id' => $subscription['user_id'],
            'user_name' => $subscription['fname'] . ' ' . $subscription['lname'],
            'plan_name' => $subscription['plan_name'],
            'approved_by' => $approvedBy
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
    $paymentMethod = $data['payment_method'] ?? 'cash';
    $amountReceived = floatval($data['amount_received'] ?? 0);
    $notes = $data['notes'] ?? '';
    $receiptNumber = $data['receipt_number'] ?? null; // Allow custom receipt number from frontend
    $cashierId = $data['cashier_id'] ?? null;

    // Validate payment method
    $validPaymentMethods = ['cash', 'card', 'digital'];
    if (!in_array($paymentMethod, $validPaymentMethods)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid payment method", "message" => "Payment method must be one of: " . implode(', ', $validPaymentMethods)]);
        return;
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
                   p.plan_name, p.price, s.amount_paid, s.discounted_price,
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

        // Generate receipt number if not provided
        if (empty($receiptNumber)) {
            $receiptNumber = generateSubscriptionReceiptNumber($pdo);
        }

        // Check if this is a package plan that needs to be split
        $isPackagePlan = $subscription['plan_id'] == 5; // Assuming plan ID 5 is the package plan

        if ($isPackagePlan) {
            // For package plans, keep the package plan visible and create hidden individual plans
            // First, update the package plan status
            $updateStmt = $pdo->prepare("UPDATE subscription SET status_id = ? WHERE id = ?");
            $updateStmt->execute([$approvedStatus['id'], $subscriptionId]);

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
            // For regular plans, just update the status
            $updateStmt = $pdo->prepare("UPDATE subscription SET status_id = ? WHERE id = ?");
            $updateStmt->execute([$approvedStatus['id'], $subscriptionId]);
        }

        // Create payment record with POS data - only for confirmed payments
        try {
            // Only create payment record if transaction is confirmed/completed
            if ($transactionStatus === 'confirmed' || $transactionStatus === 'completed') {
                // Check payment table columns
                $checkPaymentColumns = $pdo->query("SHOW COLUMNS FROM payment");
                $paymentColumns = $checkPaymentColumns->fetchAll(PDO::FETCH_COLUMN);

                $hasStatusColumn = in_array('status', $paymentColumns);
                $hasPosColumns = in_array('payment_method', $paymentColumns) &&
                    in_array('receipt_number', $paymentColumns) &&
                    in_array('cashier_id', $paymentColumns);

                if ($hasStatusColumn && $hasPosColumns) {
                    $paymentStmt = $pdo->prepare("
                        INSERT INTO payment (subscription_id, amount, payment_date, status, payment_method, receipt_number, cashier_id) 
                        VALUES (?, ?, NOW(), 'completed', ?, ?, ?)
                    ");
                    $paymentStmt->execute([$subscriptionId, $paymentAmount, $paymentMethod, $receiptNumber, $cashierId]);
                } elseif ($hasPosColumns) {
                    $paymentStmt = $pdo->prepare("
                        INSERT INTO payment (subscription_id, amount, payment_date, payment_method, receipt_number, cashier_id) 
                        VALUES (?, ?, NOW(), ?, ?, ?)
                    ");
                    $paymentStmt->execute([$subscriptionId, $paymentAmount, $paymentMethod, $receiptNumber, $cashierId]);
                } elseif ($hasStatusColumn) {
                    $paymentStmt = $pdo->prepare("
                        INSERT INTO payment (subscription_id, amount, payment_date, status) 
                        VALUES (?, ?, NOW(), 'completed')
                    ");
                    $paymentStmt->execute([$subscriptionId, $paymentAmount]);
                } else {
                    $paymentStmt = $pdo->prepare("
                        INSERT INTO payment (subscription_id, amount, payment_date) 
                        VALUES (?, ?, NOW())
                    ");
                    $paymentStmt->execute([$subscriptionId, $paymentAmount]);
                }
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

                    if ($hasPosColumns) {
                        $salesStmt = $pdo->prepare("
                            INSERT INTO sales (user_id, total_amount, sale_date, sale_type, payment_method, amount_received, change_given, receipt_number, cashier_id, notes, transaction_status) 
                            VALUES (?, ?, NOW(), 'Subscription', ?, ?, ?, ?, ?, ?, 'confirmed')
                        ");
                        $salesStmt->execute([$subscription['user_id'], $paymentAmount, $paymentMethod, $amountReceived, $changeGiven, $receiptNumber, $cashierId, $notes]);
                    } else {
                        // Fallback to basic sales record
                        $salesStmt = $pdo->prepare("
                            INSERT INTO sales (user_id, total_amount, sale_date, sale_type) 
                            VALUES (?, ?, NOW(), 'Subscription')
                        ");
                        $salesStmt->execute([$subscription['user_id'], $paymentAmount]);
                    }
                }
            } catch (Exception $e) {
                // If sales table doesn't exist or has issues, continue without creating sales record
                error_log("Sales record creation failed: " . $e->getMessage());
            }

        } catch (Exception $e) {
            // If payment table doesn't exist or payment not confirmed, rollback transaction
            if (strpos($e->getMessage(), 'Payment not confirmed') !== false) {
                throw $e; // Re-throw payment confirmation errors
            }
            // If payment table doesn't exist or has issues, continue without creating payment
        }

        $pdo->commit();

        // Log activity using centralized logger
        $staffId = $data['staff_id'] ?? null;
        logStaffActivity($pdo, $staffId, "Approve Subscription with Payment", "Subscription approved with payment: {$subscription['plan_name']} for {$subscription['fname']} {$subscription['lname']} by {$approvedBy} - Payment: {$paymentMethod}, Amount: ₱{$paymentAmount}, Received: ₱{$amountReceived}, Change: ₱{$changeGiven}, Receipt: {$receiptNumber}", "Subscription Management", [
            'subscription_id' => $subscriptionId,
            'user_id' => $subscription['user_id'],
            'user_name' => $subscription['fname'] . ' ' . $subscription['lname'],
            'plan_name' => $subscription['plan_name'],
            'approved_by' => $approvedBy,
            'payment_method' => $paymentMethod,
            'amount_paid' => $paymentAmount,
            'amount_received' => $amountReceived,
            'change_given' => $changeGiven,
            'receipt_number' => $receiptNumber
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

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscription WHERE receipt_number = ?");
        $stmt->execute([$receiptNumber]);
        $count = $stmt->fetchColumn();
    } while ($count > 0);

    return $receiptNumber;
}
?>