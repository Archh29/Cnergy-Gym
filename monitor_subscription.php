<?php
// Set timezone to Philippines
date_default_timezone_set('Asia/Manila');

// Enhanced subscription management API - Complete solution for monitoring, approval, and manual creation
// Set headers for CORS and JSON response
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Database configuration

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
                case 'decline':
                    declineSubscription($pdo, $data);
                    break;
                case 'create_manual':
                    createManualSubscription($pdo, $data);
                    break;
                case 'fix_day_pass':
                    fixDayPassSubscriptions($pdo);
                    break;
                default:
                    http_response_code(400);
                    echo json_encode([
                        "success" => false,
                        "error" => "Invalid action",
                        "message" => "Supported actions: approve, decline, create_manual, fix_day_pass"
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
    $stmt = $pdo->query("
        SELECT s.id, s.start_date, s.end_date, s.discounted_price, s.discount_type, s.amount_paid,
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
        $paymentStmt = $pdo->prepare("
            SELECT COUNT(*) as payment_count, SUM(amount) as total_paid
            FROM payment 
            WHERE subscription_id = ?
        ");
        $paymentStmt->execute([$subscription['id']]);
        $paymentInfo = $paymentStmt->fetch();

        $subscription['payments'] = [];
        $subscription['payment_count'] = $paymentInfo['payment_count'] ?? 0;
        $subscription['total_paid'] = $paymentInfo['total_paid'] ?? 0;

        // Use amount_paid for revenue tracking instead of discounted_price
        $subscription['revenue_amount'] = $subscription['amount_paid'] ?? $subscription['discounted_price'];
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
            account_status,
            user_type_id
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

function getAvailablePlansForUser($pdo, $user_id)
{
    try {
        // Get user's existing active subscriptions
        $existingStmt = $pdo->prepare("
            SELECT s.plan_id, s.end_date, ss.status_name, p.plan_name
            FROM subscription s
            JOIN subscription_status ss ON s.status_id = ss.id
            JOIN member_subscription_plan p ON s.plan_id = p.id
            WHERE s.user_id = ? 
            AND ss.status_name = 'approved' 
            AND s.end_date >= CURDATE()
            ORDER BY s.plan_id
        ");
        $existingStmt->execute([$user_id]);
        $existingSubscriptions = $existingStmt->fetchAll();

        // Check if user has active Plan ID 1 (member fee)
        $hasActiveMemberFee = false;
        $activePlanIds = [];

        foreach ($existingSubscriptions as $sub) {
            $activePlanIds[] = $sub['plan_id'];
            if ($sub['plan_id'] == 1) {
                $hasActiveMemberFee = true;
            }
        }

        // Get all available plans
        $allPlansStmt = $pdo->query("
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
        $allPlans = $allPlansStmt->fetchAll();

        // Filter plans based on business rules
        $availablePlans = [];

        foreach ($allPlans as $plan) {
            $planId = $plan['id'];

            // Skip if user already has active subscription to this plan
            if (in_array($planId, $activePlanIds)) {
                continue;
            }

            // Apply business rules for Plan ID 2 and 3
            if ($planId == 2) {
                // Plan ID 2 (Monthly with membership) - only available if user has active Plan ID 1
                if ($hasActiveMemberFee) {
                    $availablePlans[] = $plan;
                }
            } elseif ($planId == 3) {
                // Plan ID 3 (Monthly standalone) - only available if user has NO active Plan ID 1
                if (!$hasActiveMemberFee) {
                    $availablePlans[] = $plan;
                }
            } else {
                // Other plans (like Plan ID 1) - available if not already subscribed
                $availablePlans[] = $plan;
            }
        }

        // If no plans are available, show all plans except duplicates (fallback)
        if (empty($availablePlans)) {
            foreach ($allPlans as $plan) {
                $planId = $plan['id'];
                if (!in_array($planId, $activePlanIds)) {
                    $availablePlans[] = $plan;
                }
            }
        }

        echo json_encode([
            "success" => true,
            "available_plans" => $availablePlans,
            "existing_subscriptions" => $existingSubscriptions,
            "has_active_member_fee" => $hasActiveMemberFee,
            "count" => count($availablePlans),
            "debug_info" => [
                "user_id" => $user_id,
                "all_plans_count" => count($allPlans),
                "active_plan_ids" => $activePlanIds,
                "all_plans" => $allPlans
            ]
        ]);
    } catch (Exception $e) {
        error_log("Error in getAvailablePlansForUser: " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "error" => "Failed to get available plans",
            "message" => $e->getMessage(),
            "debug_info" => [
                "user_id" => $user_id,
                "error" => $e->getMessage()
            ]
        ]);
    }
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

function createManualSubscription($pdo, $data)
{
    // Validate required fields
    $required_fields = ['user_id', 'plan_id', 'start_date'];
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
    $discount_type = $data['discount_type'] ?? 'none';
    $amount_paid = $data['amount_paid'] ?? null;
    $payment_method = $data['payment_method'] ?? 'cash';
    $notes = $data['notes'] ?? '';
    $created_by = $data['created_by'] ?? 'admin';

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
        $planStmt = $pdo->prepare("SELECT id, plan_name, price, duration_months, duration_days, discounted_price FROM member_subscription_plan WHERE id = ?");
        $planStmt->execute([$plan_id]);
        $plan = $planStmt->fetch();

        if (!$plan)
            throw new Exception("Subscription plan not found");

        // Calculate discounted_price and amount_paid
        $discounted_price = $plan['discounted_price'] ?? $plan['price'];

        // If discount_type is 'none', amount_paid equals discounted_price
        if ($discount_type === 'none') {
            $amount_paid = $discounted_price;
        } else {
            // For other discount types, amount_paid must be provided
            if ($amount_paid === null || $amount_paid === '') {
                throw new Exception("Amount paid is required when applying discounts");
            }
            $amount_paid = (float) $amount_paid;
        }

        // Calculate end date - use duration_days if set (for Day Pass), otherwise use duration_months
        $start_date_obj = new DateTime($start_date);
        $end_date_obj = clone $start_date_obj;

        if (!empty($plan['duration_days']) && $plan['duration_days'] > 0) {
            // Use days for Day Pass plans
            $end_date_obj->add(new DateInterval('P' . $plan['duration_days'] . 'D'));
        } else {
            // Use months for regular subscription plans
            $duration_months = $plan['duration_months'] ?? 1; // Default to 1 month if not set
            $end_date_obj->add(new DateInterval('P' . $duration_months . 'M'));
        }
        $end_date = $end_date_obj->format('Y-m-d');

        // Get approved status ID
        $statusStmt = $pdo->prepare("SELECT id FROM subscription_status WHERE status_name = 'approved'");
        $statusStmt->execute();
        $status = $statusStmt->fetch();

        if (!$status) {
            throw new Exception("Approved status not found in database");
        }

        // Check for existing active subscriptions to the same plan
        $duplicateStmt = $pdo->prepare("
            SELECT s.id, s.plan_id, s.end_date, ss.status_name, p.plan_name
            FROM subscription s 
            JOIN subscription_status ss ON s.status_id = ss.id 
            JOIN member_subscription_plan p ON s.plan_id = p.id
            WHERE s.user_id = ? 
            AND s.plan_id = ?
            AND ss.status_name = 'approved' 
            AND s.end_date >= CURDATE()
        ");
        $duplicateStmt->execute([$user_id, $plan_id]);
        $duplicateSubscription = $duplicateStmt->fetch();

        if ($duplicateSubscription) {
            throw new Exception("User already has an active subscription to {$duplicateSubscription['plan_name']} (Plan ID: {$plan_id}). Cannot create duplicate subscription.");
        }

        // Check for existing active subscriptions (for warning)
        $existingStmt = $pdo->prepare("
            SELECT s.id, s.plan_id, s.end_date, ss.status_name, p.plan_name
            FROM subscription s 
            JOIN subscription_status ss ON s.status_id = ss.id 
            JOIN member_subscription_plan p ON s.plan_id = p.id
            WHERE s.user_id = ? 
            AND ss.status_name = 'approved' 
            AND s.end_date >= CURDATE()
            ORDER BY s.end_date DESC
        ");
        $existingStmt->execute([$user_id]);
        $existingSubscriptions = $existingStmt->fetchAll();

        // Create subscription
        $subscriptionStmt = $pdo->prepare("
            INSERT INTO subscription (user_id, plan_id, status_id, start_date, end_date, discounted_price, discount_type, amount_paid) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $subscriptionStmt->execute([$user_id, $plan_id, $status['id'], $start_date, $end_date, $discounted_price, $discount_type, $amount_paid]);
        $subscription_id = $pdo->lastInsertId();

        // Create payment record
        $paymentStmt = $pdo->prepare("
            INSERT INTO payment (subscription_id, amount, payment_date) 
            VALUES (?, ?, NOW())
        ");
        $paymentStmt->execute([$subscription_id, $amount_paid]);
        $payment_id = $pdo->lastInsertId();

        // Create sales record
        $salesStmt = $pdo->prepare("
            INSERT INTO sales (user_id, total_amount, sale_date, sale_type) 
            VALUES (?, ?, NOW(), 'Subscription')
        ");
        $salesStmt->execute([$user_id, $amount_paid]);
        $sale_id = $pdo->lastInsertId();

        // Create sales details
        $salesDetailStmt = $pdo->prepare("
            INSERT INTO sales_details (sale_id, subscription_id, quantity, price) 
            VALUES (?, ?, 1, ?)
        ");
        $salesDetailStmt->execute([$sale_id, $subscription_id, $amount_paid]);

        // Log activity (optional - if activity_log table exists)
        try {
            $activityStmt = $pdo->prepare("
                INSERT INTO activity_log (user_id, activity, timestamp) 
                VALUES (?, ?, NOW())
            ");
            $activity_message = "Manual subscription created: {$plan['plan_name']} for {$user['fname']} {$user['lname']} by {$created_by}";
            $activityStmt->execute([null, $activity_message]);
        } catch (Exception $e) {
            // Activity log is optional, don't fail the transaction
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
                "discounted_price" => $discounted_price,
                "discount_type" => $discount_type,
                "amount_paid" => $amount_paid,
                "payment_method" => $payment_method,
                "notes" => $notes,
                "existing_subscriptions" => $existingSubscriptions,
                "existing_subscription_warning" => count($existingSubscriptions) > 0 ? "User has " . count($existingSubscriptions) . " active subscription(s)" : null
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

        $pdo->commit();

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

function fixDayPassSubscriptions($pdo)
{
    try {
        // Find all subscriptions with Day Pass plans (plans with duration_days > 0)
        $stmt = $pdo->prepare("
            SELECT s.id, s.start_date, s.end_date, p.id as plan_id, p.plan_name, p.duration_days, p.duration_months
            FROM subscription s
            JOIN member_subscription_plan p ON s.plan_id = p.id
            WHERE (p.duration_days > 0 OR LOWER(p.plan_name) LIKE '%day pass%' OR LOWER(p.plan_name) LIKE '%daypass%')
            AND s.start_date IS NOT NULL
        ");
        $stmt->execute();
        $subscriptions = $stmt->fetchAll();

        $fixed = 0;
        $errors = [];

        foreach ($subscriptions as $sub) {
            try {
                $start_date = new DateTime($sub['start_date']);
                $end_date = clone $start_date;

                // Use duration_days if available, otherwise default to 1 day for Day Pass
                $duration_days = !empty($sub['duration_days']) && $sub['duration_days'] > 0
                    ? $sub['duration_days']
                    : 1;

                $end_date->add(new DateInterval('P' . $duration_days . 'D'));
                $new_end_date = $end_date->format('Y-m-d');

                // Only update if the end_date is different
                if ($new_end_date !== $sub['end_date']) {
                    $updateStmt = $pdo->prepare("UPDATE subscription SET end_date = ? WHERE id = ?");
                    $updateStmt->execute([$new_end_date, $sub['id']]);
                    $fixed++;
                }
            } catch (Exception $e) {
                $errors[] = "Subscription ID {$sub['id']}: " . $e->getMessage();
            }
        }

        echo json_encode([
            "success" => true,
            "message" => "Day Pass subscriptions fixed successfully",
            "fixed_count" => $fixed,
            "total_checked" => count($subscriptions),
            "errors" => $errors
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Failed to fix Day Pass subscriptions",
            "message" => $e->getMessage()
        ]);
    }
}
?>