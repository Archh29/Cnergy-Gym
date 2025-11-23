<?php
// Set timezone to Philippines
date_default_timezone_set('Asia/Manila');

session_start();
require 'activity_logger.php';

// Helper function to get staff_id from multiple sources
function getStaffIdFromRequest($data = null)
{
    // First, try from request data
    if ($data && isset($data['staff_id']) && !empty($data['staff_id'])) {
        return $data['staff_id'];
    }

    // Second, try from session
    if (isset($_SESSION['user_id']) && !empty($_SESSION['user_id'])) {
        return $_SESSION['user_id'];
    }

    // Third, try from GET parameters
    if (isset($_GET['staff_id']) && !empty($_GET['staff_id'])) {
        return $_GET['staff_id'];
    }

    // Fourth, try from POST parameters
    if (isset($_POST['staff_id']) && !empty($_POST['staff_id'])) {
        return $_POST['staff_id'];
    }

    // Last resort: return null (will be logged as system)
    return null;
}

// Database configuration - Online MySQL Database
$host = "127.0.0.1:3306";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    // Ensure proper UTF-8 encoding for special characters like peso sign
    $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    // Set MySQL timezone to Philippines
    $pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    die('Database connection failed: ' . $e->getMessage());
}

// CORS headers for API compatibility
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check if this is an API request (JSON response)
$isApiRequest = isset($_GET['api']) ||
    (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) ||
    (isset($_GET['action']) && in_array($_GET['action'], ['get_all_sessions', 'get_session', 'cleanup_expired'])) ||
    (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') ||
    (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) ||
    (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'POST' && !empty(file_get_contents('php://input')));

// Debug: Force API mode for JSON requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty(file_get_contents('php://input'))) {
    $isApiRequest = true;
}

// Debug logging removed for production

// For API requests, handle JSON input/output
if ($isApiRequest) {
    handleApiRequest($pdo);
    exit();
}

// For regular web interface, continue with HTML output

// Handle actions
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$isApiRequest) {
    $action = $_POST['action'] ?? '';

    switch ($action) {
        case 'approve':
            approveSession($_POST['session_id']);
            break;
        case 'reject':
            rejectSession($_POST['session_id']);
            break;
        case 'mark_paid':
            markPaid($_POST['session_id']);
            break;
    }
}

// API Request Handler
function handleApiRequest($pdo)
{
    try {
        $method = $_SERVER['REQUEST_METHOD'];

        switch ($method) {
            case 'GET':
                $action = $_GET['action'] ?? '';
                handleApiGetRequest($pdo, $action);
                break;
            case 'POST':
                $input = json_decode(file_get_contents('php://input'), true);
                $action = $input['action'] ?? '';
                handleApiPostRequest($pdo, $action, $input);
                break;
            default:
                http_response_code(405);
                echo json_encode(['success' => false, 'message' => 'Method not allowed']);
                break;
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    }
}

function handleApiGetRequest($pdo, $action)
{
    switch ($action) {
        case 'get_all_sessions':
            getAllGuestSessions($pdo);
            break;
        case 'get_session':
            getGuestSession($pdo);
            break;
        case 'cleanup_expired':
            cleanupExpiredSessions($pdo);
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
}

function handleApiPostRequest($pdo, $action, $input)
{
    switch ($action) {
        case 'approve_session':
            approveGuestSession($pdo, $input);
            break;
        case 'approve_session_with_payment':
            approveGuestSessionWithPayment($pdo, $input);
            break;
        case 'reject_session':
            rejectGuestSession($pdo, $input);
            break;
        case 'mark_paid':
            markGuestSessionPaid($pdo, $input);
            break;
        case 'create_guest_session':
            createGuestSession($pdo, $input);
            break;
        case 'update_guest_session':
            updateGuestSession($pdo, $input);
            break;
        case 'delete_guest_session':
            deleteGuestSession($pdo, $input);
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
}

// Web Interface Functions
function approveSession($sessionId)
{
    global $pdo;
    $stmt = $pdo->prepare("UPDATE guest_session SET status = 'approved' WHERE id = ?");
    $stmt->execute([$sessionId]);
    header('Location: guest_session_admin.php?message=approved');
    exit;
}

function rejectSession($sessionId)
{
    global $pdo;
    $stmt = $pdo->prepare("UPDATE guest_session SET status = 'rejected' WHERE id = ?");
    $stmt->execute([$sessionId]);
    header('Location: guest_session_admin.php?message=rejected');
    exit;
}

function markPaid($sessionId)
{
    global $pdo;
    $stmt = $pdo->prepare("UPDATE guest_session SET paid = 1, status = 'approved' WHERE id = ?");
    $stmt->execute([$sessionId]);
    header('Location: guest_session_admin.php?message=paid');
    exit;
}

// API Functions
function getAllGuestSessions($pdo)
{
    try {
        // First, clean up expired pending sessions
        cleanupExpiredPendingSessions($pdo);

        $stmt = $pdo->prepare("
            SELECT *, payment_method, payment_link_id, receipt_number, cashier_id, change_given FROM guest_session 
            ORDER BY created_at DESC
        ");
        $stmt->execute();
        $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Process sessions to add computed fields
        $processedSessions = array_map(function ($session) {
            $session['is_expired'] = isSessionExpired($session['valid_until']);
            $session['computed_status'] = getComputedStatus($session);
            return $session;
        }, $sessions);

        echo json_encode([
            'success' => true,
            'data' => $processedSessions,
            'count' => count($processedSessions)
        ]);

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function cleanupExpiredPendingSessions($pdo)
{
    try {
        // Delete pending sessions that have expired (valid_until < now)
        $stmt = $pdo->prepare("
            DELETE FROM guest_session 
            WHERE status = 'pending' 
            AND valid_until < NOW()
        ");
        $stmt->execute();

        $deletedCount = $stmt->rowCount();
        if ($deletedCount > 0) {
            logActivity($pdo, null, "Auto-deleted $deletedCount expired pending guest sessions");
        }

    } catch (Exception $e) {
        error_log("Failed to cleanup expired pending sessions: " . $e->getMessage());
    }
}

function cleanupExpiredSessions($pdo)
{
    try {
        // Delete all expired sessions (both pending and approved)
        $stmt = $pdo->prepare("
            DELETE FROM guest_session 
            WHERE valid_until < NOW()
        ");
        $stmt->execute();

        $deletedCount = $stmt->rowCount();

        echo json_encode([
            'success' => true,
            'message' => "Cleaned up $deletedCount expired sessions",
            'deleted_count' => $deletedCount
        ]);

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function isSessionExpired($validUntil)
{
    return strtotime($validUntil) < time();
}

function getComputedStatus($session)
{
    $isExpired = isSessionExpired($session['valid_until']);

    if ($session['status'] === 'pending') {
        return 'pending';
    } elseif ($session['status'] === 'approved' && $session['paid'] == 0) {
        return 'awaiting_payment';
    } elseif ($session['status'] === 'approved' && $session['paid'] == 1) {
        return $isExpired ? 'expired' : 'active';
    } elseif ($session['status'] === 'rejected') {
        return 'rejected';
    }

    return $session['status'];
}

function getGuestSession($pdo)
{
    try {
        $sessionId = $_GET['session_id'] ?? '';

        if (empty($sessionId)) {
            throw new Exception('Session ID is required');
        }

        $stmt = $pdo->prepare("
            SELECT * FROM guest_session WHERE id = ?
        ");
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$session) {
            echo json_encode([
                'success' => false,
                'message' => 'Session not found'
            ]);
            return;
        }

        echo json_encode([
            'success' => true,
            'data' => $session
        ]);

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function approveGuestSession($pdo, $data)
{
    try {
        $sessionId = $data['session_id'] ?? '';

        if (empty($sessionId)) {
            throw new Exception('Session ID is required');
        }

        // Auto-approve and mark as paid when approving
        $stmt = $pdo->prepare("
            UPDATE guest_session 
            SET status = 'approved', paid = 1 
            WHERE id = ?
        ");
        $stmt->execute([$sessionId]);

        if ($stmt->rowCount() === 0) {
            throw new Exception('Session not found');
        }

        // Get updated session
        $stmt = $pdo->prepare("SELECT * FROM guest_session WHERE id = ?");
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        // Log activity using centralized logger (same as monitor_subscription.php)
        $staffId = getStaffIdFromRequest($data);
        logStaffActivity($pdo, $staffId, "Approve Guest Session", "Guest session approved and marked as paid: {$session['guest_name']} (ID: $sessionId) - Amount: ₱{$session['amount_paid']}", "Guest Management");

        echo json_encode([
            'success' => true,
            'message' => 'Guest session approved and marked as paid successfully',
            'data' => $session
        ]);

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function approveGuestSessionWithPayment($pdo, $data)
{
    try {
        $sessionId = $data['session_id'] ?? '';
        $amountReceived = floatval($data['amount_received'] ?? 0);
        $notes = $data['notes'] ?? '';

        if (empty($sessionId)) {
            throw new Exception('Session ID is required');
        }

        // Get the session to calculate change
        $stmt = $pdo->prepare("SELECT * FROM guest_session WHERE id = ?");
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$session) {
            throw new Exception('Session not found');
        }

        // Get PayMongo payment link ID (from request or existing session)
        $paymentLinkId = $data['payment_link_id'] ?? $session['payment_link_id'] ?? null;

        // Auto-detect payment method: if payment_link_id exists, it's a digital/PayMongo payment
        // Otherwise, use the provided payment_method or default to 'cash'
        if (!empty($paymentLinkId)) {
            $paymentMethod = $data['payment_method'] ?? 'digital'; // PayMongo payment = digital
        } else {
            $paymentMethod = $data['payment_method'] ?? 'cash';
        }

        $amountPaid = floatval($session['amount_paid']);
        $changeGiven = max(0, $amountReceived - $amountPaid);
        $receiptNumber = $data['receipt_number'] ?? generateGuestReceiptNumber($pdo);
        $cashierId = $data['cashier_id'] ?? null;

        // Update session with payment details and approve (including PayMongo payment link ID)
        $stmt = $pdo->prepare("
            UPDATE guest_session 
            SET status = 'approved', 
                paid = 1, 
                payment_method = ?, 
                payment_link_id = ?,
                change_given = ?, 
                receipt_number = ?, 
                cashier_id = ?
            WHERE id = ?
        ");
        $stmt->execute([$paymentMethod, $paymentLinkId, $changeGiven, $receiptNumber, $cashierId, $sessionId]);

        // Create sales record for guest transaction
        try {
            // Use transaction to ensure both sales and sales_details are created together
            $pdo->beginTransaction();

            $salesStmt = $pdo->prepare("
                INSERT INTO sales (user_id, total_amount, sale_date, sale_type, payment_method, transaction_status, receipt_number, cashier_id, change_given, notes) 
                VALUES (NULL, ?, NOW(), 'Guest', ?, 'confirmed', ?, ?, ?, ?)
            ");
            $salesStmt->execute([$amountPaid, $paymentMethod, $receiptNumber, $cashierId, $changeGiven, $notes]);
            $saleId = $pdo->lastInsertId();

            // Create sales_details entry to link guest_session to sale
            if ($saleId) {
                try {
                    $salesDetailsStmt = $pdo->prepare("
                        INSERT INTO sales_details (sale_id, guest_session_id, quantity, price) 
                        VALUES (?, ?, 1, ?)
                    ");
                    $salesDetailsStmt->execute([$saleId, $sessionId, $amountPaid]);
                    error_log("Successfully created sales_details for guest session: Sale ID: $saleId, Guest Session ID: $sessionId");
                } catch (Exception $e2) {
                    // Log the error but don't fail the entire transaction
                    error_log("Failed to create sales_details for guest: " . $e2->getMessage());
                    error_log("Sales details error details: " . $e2->getTraceAsString());
                }
            }

            // Commit the transaction
            $pdo->commit();

            // Log successful sales creation
            error_log("Successfully created guest sales record: Amount: $amountPaid, Receipt: $receiptNumber, Sale ID: $saleId, Guest Session ID: $sessionId");
        } catch (Exception $e) {
            // Rollback on error
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            // Log the error but don't fail the entire transaction
            error_log("Failed to create sales record for guest: " . $e->getMessage());
            error_log("Sales table structure might be different. Error details: " . $e->getTraceAsString());
        }

        // Get updated session
        $stmt = $pdo->prepare("SELECT * FROM guest_session WHERE id = ?");
        $stmt->execute([$sessionId]);
        $updatedSession = $stmt->fetch(PDO::FETCH_ASSOC);

        // Log activity using centralized logger (same as monitor_subscription.php)
        $staffId = getStaffIdFromRequest($data);
        logStaffActivity($pdo, $staffId, "Approve Guest Session with Payment", "Guest session approved with payment: {$session['guest_name']} (ID: $sessionId) - Amount: ₱$amountPaid, Payment: $paymentMethod, Received: ₱$amountReceived, Change: ₱$changeGiven, Receipt: $receiptNumber", "Guest Management");

        echo json_encode([
            'success' => true,
            'message' => 'Guest session approved and payment processed successfully',
            'data' => $updatedSession,
            'receipt_number' => $receiptNumber,
            'payment_method' => $paymentMethod,
            'change_given' => $changeGiven
        ]);

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function rejectGuestSession($pdo, $data)
{
    try {
        $sessionId = $data['session_id'] ?? '';

        if (empty($sessionId)) {
            throw new Exception('Session ID is required');
        }

        $stmt = $pdo->prepare("
            UPDATE guest_session 
            SET status = 'rejected' 
            WHERE id = ?
        ");
        $stmt->execute([$sessionId]);

        if ($stmt->rowCount() === 0) {
            throw new Exception('Session not found');
        }

        // Get updated session
        $stmt = $pdo->prepare("SELECT * FROM guest_session WHERE id = ?");
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        // Log activity using centralized logger (same as monitor_subscription.php)
        $staffId = getStaffIdFromRequest($data);
        logStaffActivity($pdo, $staffId, "Reject Guest Session", "Guest session rejected: {$session['guest_name']} (ID: $sessionId)", "Guest Management");

        echo json_encode([
            'success' => true,
            'message' => 'Guest session rejected successfully',
            'data' => $session
        ]);

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function markGuestSessionPaid($pdo, $data)
{
    try {
        $sessionId = $data['session_id'] ?? '';

        if (empty($sessionId)) {
            throw new Exception('Session ID is required');
        }

        $stmt = $pdo->prepare("
            UPDATE guest_session 
            SET paid = 1, status = 'approved' 
            WHERE id = ?
        ");
        $stmt->execute([$sessionId]);

        if ($stmt->rowCount() === 0) {
            throw new Exception('Session not found');
        }

        // Get updated session
        $stmt = $pdo->prepare("SELECT * FROM guest_session WHERE id = ?");
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        // Log activity using centralized logger (same as monitor_subscription.php)
        $staffId = getStaffIdFromRequest($data);
        logStaffActivity($pdo, $staffId, "Confirm Guest Payment", "Guest session payment confirmed: {$session['guest_name']} (ID: $sessionId) - Amount: ₱{$session['amount_paid']}", "Guest Management");

        echo json_encode([
            'success' => true,
            'message' => 'Payment confirmed successfully',
            'data' => $session
        ]);

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function createGuestSession($pdo, $data)
{
    try {
        // Validate input data
        if (!is_array($data)) {
            throw new Exception('Invalid data format');
        }

        // Validate required fields
        if (!isset($data['guest_name']) || !isset($data['guest_type']) || !isset($data['amount_paid'])) {
            throw new Exception('Missing required fields: guest_name, guest_type, amount_paid');
        }

        $guestName = trim($data['guest_name']);
        $guestType = $data['guest_type'];
        $amountPaid = floatval($data['amount_paid']);

        // POS fields
        $paymentLinkId = $data['payment_link_id'] ?? null; // PayMongo payment link ID

        // Auto-detect payment method: if payment_link_id exists, it's a digital/PayMongo payment
        // Otherwise, use the provided payment_method or default to 'cash'
        if (!empty($paymentLinkId)) {
            $paymentMethod = $data['payment_method'] ?? 'digital'; // PayMongo payment = digital
        } else {
            $paymentMethod = $data['payment_method'] ?? 'cash';
        }

        $amountReceived = $data['amount_received'] ?? $amountPaid;
        $changeGiven = max(0, $amountReceived - $amountPaid);
        $receiptNumber = $data['receipt_number'] ?? generateGuestReceiptNumber($pdo);
        $cashierId = $data['cashier_id'] ?? null;
        $notes = $data['notes'] ?? ''; // Transaction notes

        // Validate guest name
        if (empty($guestName)) {
            throw new Exception('Guest name cannot be empty');
        }

        // Validate guest type
        $validTypes = ['walkin', 'trial', 'guest'];
        if (!in_array($guestType, $validTypes)) {
            throw new Exception('Invalid guest type. Must be one of: ' . implode(', ', $validTypes));
        }

        // Validate amount
        if ($amountPaid < 0) {
            throw new Exception('Amount cannot be negative');
        }

        // Generate unique QR token
        $qrToken = generateUniqueQRToken($pdo);

        // Calculate valid until (9 PM PH time on the same day, or next day if already past 9 PM)
        date_default_timezone_set('Asia/Manila');
        $now = new DateTime('now', new DateTimeZone('Asia/Manila'));
        $validUntil = clone $now;
        $validUntil->setTime(21, 0, 0); // Set to 9 PM (21:00)
        
        // If current time is already past 9 PM, set to 9 PM next day
        if ($now >= $validUntil) {
            $validUntil->modify('+1 day');
        }
        
        $validUntilStr = $validUntil->format('Y-m-d H:i:s');

        // Insert guest session with POS fields and PayMongo payment link ID
        $stmt = $pdo->prepare("
            INSERT INTO guest_session (guest_name, guest_type, amount_paid, qr_token, valid_until, paid, status, created_at, payment_method, payment_link_id, receipt_number, cashier_id, change_given)
            VALUES (?, ?, ?, ?, ?, 1, 'approved', NOW(), ?, ?, ?, ?, ?)
        ");

        $stmt->execute([$guestName, $guestType, $amountPaid, $qrToken, $validUntilStr, $paymentMethod, $paymentLinkId, $receiptNumber, $cashierId, $changeGiven]);

        $sessionId = $pdo->lastInsertId();

        // Create sales record for guest transaction
        // IMPORTANT: Do NOT use a transaction here because guest_session is already committed
        // If we use a transaction and it fails, we'll have a guest_session without a sales record
        try {
            $salesStmt = $pdo->prepare("
                INSERT INTO sales (user_id, total_amount, sale_date, sale_type, payment_method, transaction_status, receipt_number, cashier_id, change_given, notes) 
                VALUES (NULL, ?, NOW(), 'Guest', ?, 'confirmed', ?, ?, ?, ?)
            ");
            $salesStmt->execute([$amountPaid, $paymentMethod, $receiptNumber, $cashierId, $changeGiven, $notes]);
            $saleId = $pdo->lastInsertId();

            error_log("✅ Created sales record: Sale ID: $saleId, Receipt: $receiptNumber, Amount: $amountPaid");

            // Create sales_details entry to link guest_session to sale
            if ($saleId) {
                try {
                    $salesDetailsStmt = $pdo->prepare("
                        INSERT INTO sales_details (sale_id, guest_session_id, quantity, price) 
                        VALUES (?, ?, 1, ?)
                    ");
                    $salesDetailsStmt->execute([$saleId, $sessionId, $amountPaid]);
                    error_log("✅ Created sales_details: Sale ID: $saleId, Guest Session ID: $sessionId");
                } catch (Exception $e2) {
                    error_log("❌ Failed to create sales_details: " . $e2->getMessage());
                    error_log("Error details: " . $e2->getTraceAsString());
                    // Try to continue anyway - the sales record exists
                }
            } else {
                error_log("❌ ERROR: Sale ID is null after insert!");
            }

            // Verify the sales record was created
            $verifyStmt = $pdo->prepare("SELECT id, sale_type, receipt_number, total_amount FROM sales WHERE id = ?");
            $verifyStmt->execute([$saleId]);
            $verifySale = $verifyStmt->fetch();
            if ($verifySale) {
                error_log("✅ Verified sales record exists: ID={$verifySale['id']}, Type={$verifySale['sale_type']}, Receipt={$verifySale['receipt_number']}, Amount={$verifySale['total_amount']}");
            } else {
                error_log("❌ ERROR: Sales record not found after creation! Sale ID: $saleId");
            }

            // Verify sales_details was created
            $verifyDetailsStmt = $pdo->prepare("SELECT id, sale_id, guest_session_id FROM sales_details WHERE sale_id = ? AND guest_session_id = ?");
            $verifyDetailsStmt->execute([$saleId, $sessionId]);
            $verifyDetails = $verifyDetailsStmt->fetch();
            if ($verifyDetails) {
                error_log("✅ Verified sales_details exists: Sale ID={$verifyDetails['sale_id']}, Guest Session ID={$verifyDetails['guest_session_id']}");
            } else {
                error_log("❌ ERROR: sales_details not found! Sale ID: $saleId, Guest Session ID: $sessionId");
            }
        } catch (Exception $e) {
            error_log("❌ CRITICAL: Failed to create sales record for guest: " . $e->getMessage());
            error_log("Error details: " . $e->getTraceAsString());
            error_log("Guest Session ID: $sessionId, Receipt: $receiptNumber");
            // Don't throw - allow guest session creation to succeed even if sales record fails
        }

        // Get the created session
        $stmt = $pdo->prepare("
            SELECT * FROM guest_session WHERE id = ?
        ");
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        // Log activity using centralized logger (same as monitor_subscription.php)
        $staffId = getStaffIdFromRequest($data);
        logStaffActivity($pdo, $staffId, "Create Guest POS Session", "Guest POS session created: $guestName ($guestType) - Amount: ₱$amountPaid, Payment: $paymentMethod, Receipt: $receiptNumber, Change: ₱$changeGiven", "Guest Management");

        echo json_encode([
            'success' => true,
            'message' => 'Guest POS session created successfully',
            'data' => $session,
            'receipt_number' => $receiptNumber,
            'payment_method' => $paymentMethod,
            'change_given' => $changeGiven
        ]);

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateGuestSession($pdo, $data)
{
    try {
        $sessionId = $data['session_id'] ?? '';
        $guestName = $data['guest_name'] ?? '';
        $guestType = $data['guest_type'] ?? '';
        $amountPaid = $data['amount_paid'] ?? '';

        if (empty($sessionId)) {
            throw new Exception('Session ID is required');
        }

        // Build update query dynamically
        $updateFields = [];
        $params = [];

        if (!empty($guestName)) {
            $updateFields[] = "guest_name = ?";
            $params[] = $guestName;
        }

        if (!empty($guestType)) {
            $validTypes = ['walkin', 'trial', 'guest'];
            if (!in_array($guestType, $validTypes)) {
                throw new Exception('Invalid guest type. Must be one of: ' . implode(', ', $validTypes));
            }
            $updateFields[] = "guest_type = ?";
            $params[] = $guestType;
        }

        if (!empty($amountPaid)) {
            $amountPaid = floatval($amountPaid);
            if ($amountPaid < 0) {
                throw new Exception('Amount cannot be negative');
            }
            $updateFields[] = "amount_paid = ?";
            $params[] = $amountPaid;
        }

        if (empty($updateFields)) {
            throw new Exception('No fields to update');
        }

        $params[] = $sessionId;

        $sql = "UPDATE guest_session SET " . implode(', ', $updateFields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        if ($stmt->rowCount() === 0) {
            throw new Exception('Session not found or no changes made');
        }

        // Get updated session
        $stmt = $pdo->prepare("SELECT * FROM guest_session WHERE id = ?");
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        // Log activity using centralized logger (same as monitor_subscription.php)
        $staffId = getStaffIdFromRequest($data);
        logStaffActivity($pdo, $staffId, "Update Guest Session", "Guest session updated: {$session['guest_name']} (ID: $sessionId)", "Guest Management");

        echo json_encode([
            'success' => true,
            'message' => 'Guest session updated successfully',
            'data' => $session
        ]);

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function deleteGuestSession($pdo, $data)
{
    try {
        $sessionId = $data['session_id'] ?? '';

        if (empty($sessionId)) {
            throw new Exception('Session ID is required');
        }

        // Get session details before deletion for logging
        $stmt = $pdo->prepare("SELECT * FROM guest_session WHERE id = ?");
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$session) {
            throw new Exception('Session not found');
        }

        // Delete the session
        $stmt = $pdo->prepare("DELETE FROM guest_session WHERE id = ?");
        $stmt->execute([$sessionId]);

        // Log activity using centralized logger (same as monitor_subscription.php)
        $staffId = getStaffIdFromRequest($data);
        logStaffActivity($pdo, $staffId, "Delete Guest Session", "Guest session deleted: {$session['guest_name']} (ID: $sessionId)", "Guest Management");

        echo json_encode([
            'success' => true,
            'message' => 'Guest session deleted successfully'
        ]);

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function generateUniqueQRToken($pdo)
{
    do {
        $token = 'GUEST_' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 12));

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM guest_session WHERE qr_token = ?");
        $stmt->execute([$token]);
        $count = $stmt->fetchColumn();
    } while ($count > 0);

    return $token;
}

function generateGuestReceiptNumber($pdo)
{
    do {
        $receiptNumber = 'GST' . date('Ymd') . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM guest_session WHERE receipt_number = ?");
        $stmt->execute([$receiptNumber]);
        $count = $stmt->fetchColumn();
    } while ($count > 0);

    return $receiptNumber;
}

function logActivity($pdo, $userId, $activity)
{
    try {
        $stmt = $pdo->prepare("
            INSERT INTO activity_log (user_id, activity, timestamp)
            VALUES (?, ?, NOW())
        ");
        $stmt->execute([$userId, $activity]);
    } catch (Exception $e) {
        // Log error but don't fail the main operation
        error_log("Failed to log activity: " . $e->getMessage());
    }
}

// Get all guest sessions
$stmt = $pdo->prepare("
    SELECT * FROM guest_session 
    ORDER BY created_at DESC
");
$stmt->execute();
$sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

$message = $_GET['message'] ?? '';
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Guest Session Management</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margi n: 20px;
            background-color: #f5f5f5;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        h1 {
            color: #333;
            border-bottom: 2px solid #FF6B35;
            padding-bottom: 10px;
        }

        .message {
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
        }

        .success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .table th,
        .table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1p x solid #ddd;
        }

        .table th {
            background-color: #f8f9fa;
            font- weight: bold;
        }

        .status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }

        .status.pending {
            background-color: #fff3cd;
            color: #856404;
        }

        .status.approved {
            background-color: #d4edda;
            color: #155724;
        }

        .status.rejected {
            background-color: #f8d7da;
            color: #721c24;
        }

        .btn {
            padding: 6px 12px;
            margin: 2px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .btn-success {
            background-color: #28a745;
            color: white;
        }

        .btn-danger {
            background-color: #dc3545;
            color: white;
        }

        .btn-primary {
            background-color: #007bff;
            color: white;
        }

        .btn:hover {
            opacity: 0.8;
        }

        .qr-token {
            font-family: monospace;
            font-size: 11px;
            background-color: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>Guest Session Management</h1>

        <?php if ($message): ?>
            <div class="message success">
                <?php
                switch ($message) {
                    case 'approved':
                        echo 'Session approved successfully!';
                        break;
                    case 'rejected':
                        echo 'Session rejected successfully!';
                        break;
                    case 'paid':
                        echo 'Payment confirmed successfully!';
                        break;
                }
                ?>
            </div>
        <?php endif; ?>

        <table class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Guest Name</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Paid</th>
                    <th>QR Token</th>
                    <th>Created</th>
                    <th>Valid Until</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($sessions as $session): ?>
                    <tr>
                        <td>
                            <?= htmlspecialchars($session['id']) ?>
                        </td>
                        <td>
                            <?= htmlspecialchars($session['guest_name']) ?>
                        </td>
                        <td>
                            <?= strtoupper(htmlspecialchars($session['guest_type'])) ?>
                        </td>
                        <td>₱
                            <?= number_format($session['amount_paid'], 2) ?>
                        </td>
                        <td>
                            <span class="status <?= $session['status'] ?>">
                                <?= strtoupper($session['status']) ?>
                            </span>
                        </td>
                        <td>
                            <?= $session['paid'] ? '✅ Yes' : '❌ No' ?>
                        </td>
                        <td>
                            <span class="qr-token">
                                <?= htmlspecialchars($session['qr_token']) ?>
                            </span>
                        </td>
                        <td>
                            <?= date('M j, Y H:i', strtotime($session['created_at'])) ?>
                        </td>
                        <td>
                            <?= date('M j, Y H:i', strtotime($session['valid_until'])) ?>
                        </td>
                        <td>
                            <?php if ($session['status'] === 'pending'): ?>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="approve">
                                    <input type="hidden" name="session_id" value="<?= $session['id'] ?>">
                                    <button type="submit" class="btn btn-success">Approve</button>
                                </form>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="reject">
                                    <input type="hidden" name="session_id" value="<?= $session['id'] ?>">
                                    <button type="submit" class="btn btn-danger">Reject</button>
                                </form>
                            <?php endif; ?>

                            <?php if ($session['status'] === 'approved' && !$session['paid']): ?>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="mark_paid">
                                    <input type="hidden" name="session_id" value="<?= $session['id'] ?>">
                                    <button type="submit" class="btn btn-primary">Mark Paid</button>
                                </form>
                            <?php endif; ?>

                            <?php if ($session['status'] === 'approved' && $session['paid']): ?>
                                <span style="color: green; font-weight: bold;">✅ Ready</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <?php if (empty($sessions)): ?>
            <p style="text-align: center; color: #666; margin: 40px 0;">No guest sessions found.</p>
        <?php endif; ?>
    </div>
</body>

</html>