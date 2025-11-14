<?php
require 'activity_logger.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// === DB CONNECTION ===
try {
    $pdo = new PDO(
        "mysql:host=localhost;dbname=u773938685_cnergydb;charset=utf8mb4",
        "u773938685_archh29",   // replace with your actual DB user
        "Gwapoko385@"       // replace with your actual password
    );

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    $pdo->setAttribute(PDO::ATTR_STRINGIFY_FETCHES, false);
    // Ensure proper UTF-8 encoding for special characters like peso sign
    $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit;
}
// === HELPER FUNCTIONS ===
function logActivity($pdo, $adminId, $action, $details) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO admin_activity_log (admin_id, action, details, created_at)
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->execute([$adminId, $action, json_encode($details)]);
    } catch (Exception $e) {
        error_log("Failed to log activity: " . $e->getMessage());
    }
}

function castMemberData($data) {
    $intFields = ['id', 'member_id', 'coach_id', 'request_id', 'user_id', 'age'];
    $stringFields = ['fname', 'mname', 'lname', 'email', 'phone', 'status', 'coach_approval', 'staff_approval'];
    $floatFields = ['rating'];
    
    foreach ($intFields as $field) {
        if (isset($data[$field]) && $data[$field] !== null) {
            $data[$field] = (int)$data[$field];
        }
    }
    
    foreach ($stringFields as $field) {
        if (isset($data[$field]) && $data[$field] !== null) {
            $data[$field] = (string)$data[$field];
        }
    }
    
    foreach ($floatFields as $field) {
        if (isset($data[$field]) && $data[$field] !== null) {
            $data[$field] = (float)$data[$field];
        }
    }
    
    return $data;
}

// Function to validate admin/staff user
function validateAdminUser($pdo, $userId) {
    try {
        $stmt = $pdo->prepare("
            SELECT id, user_type_id, fname, lname 
            FROM user 
            WHERE id = ? AND user_type_id IN (1, 2)
        ");
        $stmt->execute([$userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        error_log("Error validating admin user: " . $e->getMessage());
        return false;
    }
}

// === ROUTER ===
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

error_log("Admin API - Action: $action, Method: $method");

switch ($action) {
    case 'pending-requests':
        if ($method === 'GET') getPendingRequests($pdo);
        break;
        
    case 'assigned-members':
        if ($method === 'GET') getAssignedMembers($pdo);
        break;
        
    case 'approve-request':
        if ($method === 'POST') approveRequest($pdo);
        break;
        
    case 'approve-request-with-payment':
        if ($method === 'POST') approveRequestWithPayment($pdo);
        break;
        
    case 'decline-request':
        if ($method === 'POST') declineRequest($pdo);
        break;
        
    case 'request-details':
        if ($method === 'GET' && isset($_GET['request_id'])) {
            getRequestDetails($pdo, (int)$_GET['request_id']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Request ID required']);
        }
        break;
        
    case 'dashboard-stats':
        if ($method === 'GET') getDashboardStats($pdo);
        break;
        
    case 'activity-log':
        if ($method === 'GET') getActivityLog($pdo);
        break;
        
    case 'get-current-user':
        if ($method === 'GET') getCurrentUser($pdo);
        break;
        
    case 'search':
        if ($method === 'GET' && isset($_GET['query'])) {
            searchRequests($pdo, $_GET['query']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Search query required']);
        }
        break;
        
    case 'fix-sales-records':
        if ($method === 'POST') {
            fixSalesRecords($pdo);
        } else {
            echo json_encode(['success' => false, 'message' => 'POST method required']);
        }
        break;
        
    case 'get-sales-record':
        if ($method === 'GET' && isset($_GET['id'])) {
            getSalesRecord($pdo, (int)$_GET['id']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Sales ID required']);
        }
        break;
        
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid endpoint']);
        break;
}

// === FUNCTIONS ===
function getPendingRequests($pdo) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                cml.id as request_id,
                cml.status,
                cml.coach_approval,
                cml.staff_approval,
                cml.requested_at,
                cml.coach_approved_at,
                cml.rate_type,
                cml.remaining_sessions,
                cml.expires_at,
                
                -- Member data
                m.id as member_id,
                m.fname as member_fname,
                m.mname as member_mname,
                m.lname as member_lname,
                m.email as member_email,
                m.bday as member_bday,
                m.created_at as member_joined,
                
                -- Coach data
                c.id as coach_id,
                c.fname as coach_fname,
                c.mname as coach_mname,
                c.lname as coach_lname,
                c.email as coach_email,
                coach_info.bio as coach_bio,
                coach_info.specialty as coach_specialty,
                coach_info.experience as coach_experience,
                coach_info.rating as coach_rating,
                coach_info.certifications as coach_certifications,
                coach_info.monthly_rate as coach_monthly_rate,
                coach_info.session_package_rate as coach_package_rate,
                coach_info.per_session_rate as coach_per_session_rate
                
            FROM coach_member_list cml
            JOIN user m ON cml.member_id = m.id
            JOIN user c ON cml.coach_id = c.id
            LEFT JOIN coaches coach_info ON c.id = coach_info.user_id
            WHERE cml.coach_approval = 'approved' 
            AND cml.staff_approval = 'pending'
            ORDER BY cml.coach_approved_at DESC
        ");
        
        $stmt->execute();
        $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedRequests = [];
        foreach ($requests as $request) {
            $request = castMemberData($request);
            
            // Calculate member age
            $memberAge = 25; // Default
            if ($request['member_bday']) {
                $birthDate = new DateTime($request['member_bday']);
                $today = new DateTime();
                $memberAge = $today->diff($birthDate)->y;
            }
            
            // Parse certifications
            $certifications = [];
            if ($request['coach_certifications']) {
                $certs = json_decode($request['coach_certifications'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($certs)) {
                    $certifications = $certs;
                }
            }
            
            $formattedRequests[] = [
                'id' => $request['request_id'],
                'member' => [
                    'id' => $request['member_id'],
                    'name' => trim($request['member_fname'] . ' ' . $request['member_mname'] . ' ' . $request['member_lname']),
                    'email' => $request['member_email'],
                    'phone' => '+1 (555) 000-0000', // Mock data - add phone field to User table if needed
                    'age' => $memberAge,
                    'goals' => 'General fitness and health', // Mock data - add goals field if needed
                    'experience' => 'Beginner', // Mock data - add experience field if needed
                    'location' => 'Unknown', // Mock data - add location field if needed
                    'avatar' => null,
                    'joined_at' => $request['member_joined']
                ],
                'coach' => [
                    'id' => $request['coach_id'],
                    'name' => trim($request['coach_fname'] . ' ' . $request['coach_mname'] . ' ' . $request['coach_lname']),
                    'email' => $request['coach_email'],
                    'phone' => '+1 (555) 000-0000', // Mock data
                    'specialties' => $request['coach_specialty'] ? explode(',', $request['coach_specialty']) : ['General Fitness'],
                    'experience' => $request['coach_experience'] ?: '1 year',
                    'rating' => (float)($request['coach_rating'] ?: 4.5),
                    'certifications' => $certifications,
                    'location' => 'Unknown', // Mock data
                    'avatar' => null,
                    'bio' => $request['coach_bio'],
                    'monthly_rate' => (float)($request['coach_monthly_rate'] ?: 0.0),
                    'package_rate' => (float)($request['coach_package_rate'] ?: 0.0),
                    'per_session_rate' => (float)($request['coach_per_session_rate'] ?: 0.0)
                ],
                'requestedAt' => $request['requested_at'],
                'coachApprovedAt' => $request['coach_approved_at'],
                'rateType' => $request['rate_type'] ?: 'monthly',
                'remainingSessions' => (int)($request['remaining_sessions'] ?: 0),
                'expiresAt' => $request['expires_at'],
                'status' => 'pending'
            ];
        }
        
        echo json_encode([
            'success' => true,
            'requests' => $formattedRequests,
            'total' => count($formattedRequests)
        ]);
        
    } catch (PDOException $e) {
        error_log("Error in getPendingRequests: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error fetching pending requests: ' . $e->getMessage()
        ]);
    }
}

function getAssignedMembers($pdo) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                cml.id as assignment_id,
                cml.staff_approved_at as assigned_at,
                cml.rate_type,
                cml.remaining_sessions,
                cml.expires_at,
                
                -- Member data
                m.id as member_id,
                m.fname as member_fname,
                m.mname as member_mname,
                m.lname as member_lname,
                m.email as member_email,
                
                -- Coach data
                c.id as coach_id,
                c.fname as coach_fname,
                c.mname as coach_mname,
                c.lname as coach_lname,
                c.email as coach_email,
                coach_info.specialty as coach_specialty,
                coach_info.rating as coach_rating
                
            FROM coach_member_list cml
            JOIN user m ON cml.member_id = m.id
            JOIN user c ON cml.coach_id = c.id
            LEFT JOIN coaches coach_info ON c.id = coach_info.user_id
            WHERE cml.coach_approval = 'approved' 
            AND cml.staff_approval = 'approved'
            ORDER BY cml.staff_approved_at DESC
        ");
        
        $stmt->execute();
        $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedAssignments = [];
        foreach ($assignments as $assignment) {
            $assignment = castMemberData($assignment);
            
            $formattedAssignments[] = [
                'id' => $assignment['assignment_id'],
                'member' => [
                    'id' => $assignment['member_id'],
                    'name' => trim($assignment['member_fname'] . ' ' . $assignment['member_mname'] . ' ' . $assignment['member_lname']),
                    'email' => $assignment['member_email'],
                    'avatar' => null
                ],
                'coach' => [
                    'id' => $assignment['coach_id'],
                    'name' => trim($assignment['coach_fname'] . ' ' . $assignment['coach_mname'] . ' ' . $assignment['coach_lname']),
                    'email' => $assignment['coach_email'],
                    'specialty' => $assignment['coach_specialty'] ?: 'General Fitness',
                    'rating' => (float)($assignment['coach_rating'] ?: 4.5)
                ],
                'assignedAt' => $assignment['assigned_at'],
                'rateType' => $assignment['rate_type'] ?: 'monthly',
                'remainingSessions' => (int)($assignment['remaining_sessions'] ?: 0),
                'expiresAt' => $assignment['expires_at'],
                'status' => 'active'
            ];
        }
        
        echo json_encode([
            'success' => true,
            'assignments' => $formattedAssignments,
            'total' => count($formattedAssignments)
        ]);
        
    } catch (PDOException $e) {
        error_log("Error in getAssignedMembers: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error fetching assigned members: ' . $e->getMessage()
        ]);
    }
}

function approveRequest($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $requestId = $input['request_id'] ?? null;
        $adminId = $input['admin_id'] ?? 1; // Default admin ID
        $staffId = $input['staff_id'] ?? null; // Extract staff_id from POST data
        
        if (!$requestId) {
            echo json_encode([
                'success' => false,
                'message' => 'Request ID is required'
            ]);
            return;
        }
        
        // Validate admin user (admin or staff)
        $adminUser = validateAdminUser($pdo, $adminId);
        if (!$adminUser) {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid admin user or insufficient permissions'
            ]);
            return;
        }
        
        // Start transaction
        $pdo->beginTransaction();
        
        try {
            // Update the request to approved
            $stmt = $pdo->prepare("
                UPDATE coach_member_list 
                SET staff_approval = 'approved',
                    status = 'active',
                    staff_approved_at = NOW(),
                    handled_by_staff = ?
                WHERE id = ? AND coach_approval = 'approved' AND staff_approval = 'pending'
            ");
            
            $result = $stmt->execute([$adminId, $requestId]);
            
            if ($result && $stmt->rowCount() > 0) {
                // Get request details for logging
                $detailStmt = $pdo->prepare("
                    SELECT cml.*,
                           m.fname as member_name, m.email as member_email,
                           c.fname as coach_name, c.email as coach_email
                    FROM coach_member_list cml
                    JOIN user m ON cml.member_id = m.id
                    JOIN user c ON cml.coach_id = c.id
                    WHERE cml.id = ?
                ");
                $detailStmt->execute([$requestId]);
                $requestDetails = $detailStmt->fetch(PDO::FETCH_ASSOC);
                
                // Log the activity using centralized logger
                logStaffActivity($pdo, $staffId, "Approve Coach Assignment", "Coach assignment approved: {$requestDetails['member_name']} assigned to {$requestDetails['coach_name']} by {$adminUser['fname']} {$adminUser['lname']}", "Coach Assignment", [
                    'request_id' => $requestId,
                    'member_id' => $requestDetails['member_id'],
                    'member_name' => $requestDetails['member_name'],
                    'coach_id' => $requestDetails['coach_id'],
                    'coach_name' => $requestDetails['coach_name'],
                    'approved_by' => $adminUser['fname'] . ' ' . $adminUser['lname'],
                    'user_type' => $adminUser['user_type_id'] == 1 ? 'admin' : 'staff'
                ]);
                
                $pdo->commit();
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Coach assignment approved successfully'
                ]);
            } else {
                $pdo->rollback();
                echo json_encode([
                    'success' => false,
                    'message' => 'Request not found or already processed'
                ]);
            }
            
        } catch (Exception $e) {
            $pdo->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("Error in approveRequest: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error approving request: ' . $e->getMessage()
        ]);
    }
}

function approveRequestWithPayment($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $requestId = $input['request_id'] ?? null;
        $adminId = $input['admin_id'] ?? 1;
        $staffId = $input['staff_id'] ?? null; // Extract staff_id from POST data
        $paymentMethod = $input['payment_method'] ?? 'cash';
        $amountReceived = floatval($input['amount_received'] ?? 0);
        $receiptNumber = $input['receipt_number'] ?? null;
        $cashierId = $input['cashier_id'] ?? null;
        $notes = $input['notes'] ?? '';
        
        if (!$requestId) {
            echo json_encode([
                'success' => false,
                'message' => 'Request ID is required'
            ]);
            return;
        }
        
        // Validate admin user (admin or staff)
        $adminUser = validateAdminUser($pdo, $adminId);
        if (!$adminUser) {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid admin user or insufficient permissions'
            ]);
            return;
        }
        
        // Validate payment method
        $validPaymentMethods = ['cash', 'card', 'digital'];
        if (!in_array($paymentMethod, $validPaymentMethods)) {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid payment method'
            ]);
            return;
        }
        
        // For cash payments, validate amount received
        if ($paymentMethod === 'cash' && $amountReceived <= 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Amount received must be greater than 0 for cash payments'
            ]);
            return;
        }
        
        // Start transaction
        $pdo->beginTransaction();
        
        try {
            // Get request details before approving
            $detailStmt = $pdo->prepare("
                SELECT cml.*,
                       m.fname as member_name, m.email as member_email,
                       c.fname as coach_name, c.email as coach_email,
                       coach_info.monthly_rate, coach_info.session_package_rate, coach_info.per_session_rate
                FROM coach_member_list cml
                JOIN user m ON cml.member_id = m.id
                JOIN user c ON cml.coach_id = c.id
                LEFT JOIN coaches coach_info ON c.id = coach_info.user_id
                WHERE cml.id = ?
            ");
            $detailStmt->execute([$requestId]);
            $requestDetails = $detailStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$requestDetails) {
                throw new Exception("Request not found");
            }
            
            // Calculate payment amount based on rate type
            $paymentAmount = 0;
            $rateType = $requestDetails['rate_type'] ?? 'monthly';
            switch ($rateType) {
                case 'monthly':
                    $paymentAmount = $requestDetails['monthly_rate'] ?? 0;
                    break;
                case 'package':
                    $paymentAmount = $requestDetails['session_package_rate'] ?? 0;
                    break;
                case 'per_session':
                    $paymentAmount = $requestDetails['per_session_rate'] ?? 0;
                    break;
                default:
                    $paymentAmount = $requestDetails['monthly_rate'] ?? 0;
            }
            
            // Calculate change for cash payments
            $changeGiven = 0;
            if ($paymentMethod === 'cash') {
                $changeGiven = max(0, $amountReceived - $paymentAmount);
            }
            
            // Generate receipt number if not provided
            if (empty($receiptNumber)) {
                $receiptNumber = generateCoachAssignmentReceiptNumber($pdo);
            }
            
            // Update the request to approved
            $stmt = $pdo->prepare("
                UPDATE coach_member_list 
                SET staff_approval = 'approved',
                    status = 'active',
                    staff_approved_at = NOW(),
                    handled_by_staff = ?
                WHERE id = ? AND coach_approval = 'approved' AND staff_approval = 'pending'
            ");
            
            $result = $stmt->execute([$adminId, $requestId]);
            
            if ($result && $stmt->rowCount() > 0) {
                // Create payment record (only if payment table exists and has required columns)
                try {
                    // Check if payment table exists and has required columns
                    $checkPaymentTable = $pdo->query("SHOW TABLES LIKE 'payment'");
                    if ($checkPaymentTable->rowCount() > 0) {
                        $checkColumns = $pdo->query("SHOW COLUMNS FROM payment");
                        $paymentColumns = $checkColumns->fetchAll(PDO::FETCH_COLUMN);
                        
                        $hasReceiptColumn = in_array('receipt_number', $paymentColumns);
                        $hasStatusColumn = in_array('status', $paymentColumns);
                        $hasCashierColumn = in_array('cashier_id', $paymentColumns);
                        
                        if ($hasReceiptColumn && $hasCashierColumn) {
                            if ($hasStatusColumn) {
                                $paymentStmt = $pdo->prepare("
                                    INSERT INTO payment (subscription_id, amount, payment_date, status, payment_method, receipt_number, cashier_id) 
                                    VALUES (NULL, ?, NOW(), 'completed', ?, ?, ?)
                                ");
                                $paymentStmt->execute([$paymentAmount, $paymentMethod, $receiptNumber, $cashierId]);
                            } else {
                                $paymentStmt = $pdo->prepare("
                                    INSERT INTO payment (subscription_id, amount, payment_date, payment_method, receipt_number, cashier_id) 
                                    VALUES (NULL, ?, NOW(), ?, ?, ?)
                                ");
                                $paymentStmt->execute([$paymentAmount, $paymentMethod, $receiptNumber, $cashierId]);
                            }
                        } else {
                            // Fallback to basic payment record without receipt_number and cashier_id
                            $paymentStmt = $pdo->prepare("
                                INSERT INTO payment (subscription_id, amount, payment_date, payment_method) 
                                VALUES (NULL, ?, NOW(), ?)
                            ");
                            $paymentStmt->execute([$paymentAmount, $paymentMethod]);
                        }
                    }
                } catch (Exception $e) {
                    // If payment table doesn't exist or has issues, continue without creating payment record
                    error_log("Payment record creation failed: " . $e->getMessage());
                }
                
                // Create sales record with proper change calculation
                try {
                    // Check if sales table has the expected columns
                    $checkSalesColumns = $pdo->query("SHOW COLUMNS FROM sales");
                    $salesColumns = $checkSalesColumns->fetchAll(PDO::FETCH_COLUMN);
                    
                    // Map the columns to match your sales table structure from sales.php
                    // Based on your data: 69, 91, 1500.00, 2025-10-01 05:02:22, Coaching, cash, confirmed, NULL, NULL, 0.00, NULL
                    $hasReceiptColumn = in_array('receipt_number', $salesColumns);
                    $hasChangeColumn = in_array('change_given', $salesColumns);  // Correct column name
                    $hasCashierColumn = in_array('cashier_id', $salesColumns);
                    
                    if ($hasReceiptColumn && $hasChangeColumn && $hasCashierColumn) {
                        // Full sales record with all fields - using correct column names from sales.php
                        $salesStmt = $pdo->prepare("
                            INSERT INTO sales (user_id, total_amount, sale_date, sale_type, payment_method, transaction_status, receipt_number, cashier_id, change_given, notes) 
                            VALUES (?, ?, NOW(), 'Coaching', ?, 'confirmed', ?, ?, ?, ?)
                        ");
                        $salesStmt->execute([
                            $requestDetails['member_id'], 
                            $paymentAmount,  // total_amount
                            $paymentMethod, 
                            $receiptNumber, 
                            $adminId,        // cashier_id
                            $changeGiven,    // change_given
                            $notes
                        ]);
                    } else {
                        // Fallback to basic sales record with correct column names
                        $salesStmt = $pdo->prepare("
                            INSERT INTO sales (user_id, total_amount, sale_date, sale_type, payment_method, transaction_status) 
                            VALUES (?, ?, NOW(), 'Coaching', ?, 'confirmed')
                        ");
                        $salesStmt->execute([$requestDetails['member_id'], $paymentAmount, $paymentMethod]);
                        
                        // Get the inserted ID to update with receipt and change info
                        $salesId = $pdo->lastInsertId();
                        
                        // Update with receipt number and change if columns exist
                        if ($hasReceiptColumn) {
                            $updateStmt = $pdo->prepare("UPDATE sales SET receipt_number = ? WHERE id = ?");
                            $updateStmt->execute([$receiptNumber, $salesId]);
                        }
                        
                        if ($hasChangeColumn) {
                            $updateStmt = $pdo->prepare("UPDATE sales SET change_given = ? WHERE id = ?");
                            $updateStmt->execute([$changeGiven, $salesId]);
                        }
                        
                        if ($hasCashierColumn) {
                            $updateStmt = $pdo->prepare("UPDATE sales SET cashier_id = ? WHERE id = ?");
                            $updateStmt->execute([$adminId, $salesId]);
                        }
                    }
                } catch (Exception $e) {
                    // If sales table doesn't exist or has issues, continue without creating sales record
                    error_log("Sales record creation failed: " . $e->getMessage());
                }
                
                // Log the activity using centralized logger
                logStaffActivity($pdo, $staffId, "Approve Coach Assignment with Payment", "Coach assignment approved with payment: {$requestDetails['member_name']} assigned to {$requestDetails['coach_name']} by {$adminUser['fname']} {$adminUser['lname']} - Payment: {$paymentMethod}, Amount: ₱{$paymentAmount}, Received: ₱{$amountReceived}, Change: ₱{$changeGiven}, Receipt: {$receiptNumber}", "Coach Assignment", [
                    'request_id' => $requestId,
                    'member_id' => $requestDetails['member_id'],
                    'member_name' => $requestDetails['member_name'],
                    'coach_id' => $requestDetails['coach_id'],
                    'coach_name' => $requestDetails['coach_name'],
                    'approved_by' => $adminUser['fname'] . ' ' . $adminUser['lname'],
                    'user_type' => $adminUser['user_type_id'] == 1 ? 'admin' : 'staff',
                    'payment_method' => $paymentMethod,
                    'amount_paid' => $paymentAmount,
                    'amount_received' => $amountReceived,
                    'change_given' => $changeGiven,
                    'receipt_number' => $receiptNumber
                ]);
                
                $pdo->commit();
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Coach assignment approved with payment processed successfully',
                    'data' => [
                        'request_id' => $requestId,
                        'member_name' => $requestDetails['member_name'],
                        'coach_name' => $requestDetails['coach_name'],
                        'payment_method' => $paymentMethod,
                        'amount_paid' => $paymentAmount,
                        'amount_received' => $amountReceived,
                        'change_given' => $changeGiven,
                        'receipt_number' => $receiptNumber,
                        'approved_by' => $adminUser['fname'] . ' ' . $adminUser['lname']
                    ]
                ]);
            } else {
                $pdo->rollback();
                echo json_encode([
                    'success' => false,
                    'message' => 'Request not found or already processed'
                ]);
            }
            
        } catch (Exception $e) {
            $pdo->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("Error in approveRequestWithPayment: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error approving request with payment: ' . $e->getMessage()
        ]);
    }
}

function declineRequest($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $requestId = $input['request_id'] ?? null;
        $reason = $input['reason'] ?? 'No reason provided';
        $adminId = $input['admin_id'] ?? 1;
        $staffId = $input['staff_id'] ?? null; // Extract staff_id from POST data
        
        if (!$requestId) {
            echo json_encode([
                'success' => false,
                'message' => 'Request ID is required'
            ]);
            return;
        }
        
        // Validate admin user (admin or staff)
        $adminUser = validateAdminUser($pdo, $adminId);
        if (!$adminUser) {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid admin user or insufficient permissions'
            ]);
            return;
        }
        
        // Start transaction
        $pdo->beginTransaction();
        
        try {
            // Get request details before declining
            $detailStmt = $pdo->prepare("
                SELECT cml.*,
                       m.fname as member_name, m.email as member_email,
                       c.fname as coach_name, c.email as coach_email
                FROM coach_member_list cml
                JOIN user m ON cml.member_id = m.id
                JOIN user c ON cml.coach_id = c.id
                WHERE cml.id = ?
            ");
            $detailStmt->execute([$requestId]);
            $requestDetails = $detailStmt->fetch(PDO::FETCH_ASSOC);
            
            // Update the request to declined
            $stmt = $pdo->prepare("
                UPDATE coach_member_list 
                SET staff_approval = 'rejected',
                    status = 'rejected',
                    staff_approved_at = NOW(),
                    handled_by_staff = ?
                WHERE id = ? AND coach_approval = 'approved' AND staff_approval = 'pending'
            ");
            
            $result = $stmt->execute([$adminId, $requestId]);
            
            if ($result && $stmt->rowCount() > 0) {
                // Log the activity using centralized logger
                logStaffActivity($pdo, $staffId, "Decline Coach Assignment", "Coach assignment declined: {$requestDetails['member_name']} to {$requestDetails['coach_name']} by {$adminUser['fname']} {$adminUser['lname']} - Reason: {$reason}", "Coach Assignment", [
                    'request_id' => $requestId,
                    'member_id' => $requestDetails['member_id'],
                    'member_name' => $requestDetails['member_name'],
                    'coach_id' => $requestDetails['coach_id'],
                    'coach_name' => $requestDetails['coach_name'],
                    'reason' => $reason,
                    'declined_by' => $adminUser['fname'] . ' ' . $adminUser['lname'],
                    'user_type' => $adminUser['user_type_id'] == 1 ? 'admin' : 'staff'
                ]);
                
                $pdo->commit();
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Coach assignment declined'
                ]);
            } else {
                $pdo->rollback();
                echo json_encode([
                    'success' => false,
                    'message' => 'Request not found or already processed'
                ]);
            }
            
        } catch (Exception $e) {
            $pdo->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("Error in declineRequest: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error declining request: ' . $e->getMessage()
        ]);
    }
}

function getRequestDetails($pdo, $requestId) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                cml.*,
                
                -- Member data
                m.id as member_id,
                m.fname as member_fname,
                m.mname as member_mname,
                m.lname as member_lname,
                m.email as member_email,
                m.bday as member_bday,
                m.created_at as member_joined,
                
                -- Coach data
                c.id as coach_id,
                c.fname as coach_fname,
                c.mname as coach_mname,
                c.lname as coach_lname,
                c.email as coach_email,
                coach_info.bio as coach_bio,
                coach_info.specialty as coach_specialty,
                coach_info.experience as coach_experience,
                coach_info.rating as coach_rating,
                coach_info.certifications as coach_certifications,
                coach_info.monthly_rate as coach_monthly_rate,
                coach_info.session_package_rate as coach_package_rate,
                coach_info.per_session_rate as coach_per_session_rate
                
            FROM coach_member_list cml
            JOIN user m ON cml.member_id = m.id
            JOIN user c ON cml.coach_id = c.id
            LEFT JOIN coaches coach_info ON c.id = coach_info.user_id
            WHERE cml.id = ?
        ");
        
        $stmt->execute([$requestId]);
        $request = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$request) {
            echo json_encode([
                'success' => false,
                'message' => 'Request not found'
            ]);
            return;
        }
        
        $request = castMemberData($request);
        
        // Calculate member age
        $memberAge = 25;
        if ($request['member_bday']) {
            $birthDate = new DateTime($request['member_bday']);
            $today = new DateTime();
            $memberAge = $today->diff($birthDate)->y;
        }
        
        // Parse certifications
        $certifications = [];
        if ($request['coach_certifications']) {
            $certs = json_decode($request['coach_certifications'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($certs)) {
                $certifications = $certs;
            }
        }
        
        $formattedRequest = [
            'id' => $request['id'],
            'member' => [
                'id' => $request['member_id'],
                'name' => trim($request['member_fname'] . ' ' . $request['member_mname'] . ' ' . $request['member_lname']),
                'email' => $request['member_email'],
                'phone' => '+1 (555) 000-0000',
                'age' => $memberAge,
                'goals' => 'General fitness and health',
                'experience' => 'Beginner',
                'location' => 'Unknown',
                'avatar' => null,
                'joined_at' => $request['member_joined']
            ],
            'coach' => [
                'id' => $request['coach_id'],
                'name' => trim($request['coach_fname'] . ' ' . $request['coach_mname'] . ' ' . $request['coach_lname']),
                'email' => $request['coach_email'],
                'phone' => '+1 (555) 000-0000',
                'specialties' => $request['coach_specialty'] ? explode(',', $request['coach_specialty']) : ['General Fitness'],
                'experience' => $request['coach_experience'] ?: '1 year',
                'rating' => (float)($request['coach_rating'] ?: 4.5),
                'certifications' => $certifications,
                'location' => 'Unknown',
                'avatar' => null,
                'bio' => $request['coach_bio'],
                'hourly_rate' => (float)($request['coach_hourly_rate'] ?: 50.0)
            ],
            'requestedAt' => $request['requested_at'],
            'coachApprovedAt' => $request['coach_approved_at'],
            'rateType' => $request['rate_type'] ?: 'monthly',
            'remainingSessions' => (int)($request['remaining_sessions'] ?: 0),
            'expiresAt' => $request['expires_at'],
            'status' => $request['staff_approval']
        ];
        
        echo json_encode([
            'success' => true,
            'request' => $formattedRequest
        ]);
        
    } catch (Exception $e) {
        error_log("Error in getRequestDetails: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error fetching request details: ' . $e->getMessage()
        ]);
    }
}

function getDashboardStats($pdo) {
    try {
        // Get pending requests count
        $pendingStmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM coach_member_list 
            WHERE coach_approval = 'approved' AND staff_approval = 'pending'
        ");
        $pendingStmt->execute();
        $pendingCount = $pendingStmt->fetch()['count'];
        
        // Get approved assignments count
        $approvedStmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM coach_member_list 
            WHERE coach_approval = 'approved' AND staff_approval = 'approved'
        ");
        $approvedStmt->execute();
        $approvedCount = $approvedStmt->fetch()['count'];
        
        // Get total coaches count
        $coachesStmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM user 
            WHERE user_type_id = 3
        ");
        $coachesStmt->execute();
        $coachesCount = $coachesStmt->fetch()['count'];
        
        // Get total members count
        $membersStmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM user 
            WHERE user_type_id = 4
        ");
        $membersStmt->execute();
        $membersCount = $membersStmt->fetch()['count'];
        
        echo json_encode([
            'success' => true,
            'stats' => [
                'pending_requests' => (int)$pendingCount,
                'assigned_members' => (int)$approvedCount,
                'total_coaches' => (int)$coachesCount,
                'total_members' => (int)$membersCount
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error in getDashboardStats: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error fetching dashboard stats: ' . $e->getMessage()
        ]);
    }
}

function getActivityLog($pdo) {
    try {
        $limit = $_GET['limit'] ?? 50;
        
        $stmt = $pdo->prepare("
            SELECT 
                aal.*,
                u.fname as admin_name
            FROM admin_activity_log aal
            LEFT JOIN user u ON aal.admin_id = u.id
            ORDER BY aal.created_at DESC
            LIMIT ?
        ");
        $stmt->execute([(int)$limit]);
        $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedActivities = [];
        foreach ($activities as $activity) {
            $details = json_decode($activity['details'], true) ?: [];
            
            $formattedActivities[] = [
                'id' => (int)$activity['id'],
                'admin_name' => $activity['admin_name'] ?: 'Unknown Admin',
                'action' => $activity['action'],
                'details' => $details,
                'created_at' => $activity['created_at']
            ];
        }
        
        echo json_encode([
            'success' => true,
            'activities' => $formattedActivities
        ]);
        
    } catch (Exception $e) {
        error_log("Error in getActivityLog: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error fetching activity log: ' . $e->getMessage()
        ]);
    }
}

function searchRequests($pdo, $query) {
    try {
        $searchTerm = '%' . $query . '%';
        
        $stmt = $pdo->prepare("
            SELECT 
                cml.id as request_id,
                cml.status,
                cml.coach_approval,
                cml.staff_approval,
                cml.requested_at,
                cml.coach_approved_at,
                
                -- Member data
                m.id as member_id,
                m.fname as member_fname,
                m.mname as member_mname,
                m.lname as member_lname,
                m.email as member_email,
                
                -- Coach data
                c.id as coach_id,
                c.fname as coach_fname,
                c.mname as coach_mname,
                c.lname as coach_lname,
                c.email as coach_email,
                coach_info.rating as coach_rating
                
            FROM coach_member_list cml
            JOIN user m ON cml.member_id = m.id
            JOIN user c ON cml.coach_id = c.id
            LEFT JOIN coaches coach_info ON c.id = coach_info.user_id
            WHERE (
                CONCAT(m.fname, ' ', m.mname, ' ', m.lname) LIKE ? OR
                m.email LIKE ? OR
                CONCAT(c.fname, ' ', c.mname, ' ', c.lname) LIKE ? OR
                c.email LIKE ?
            )
            AND cml.coach_approval = 'approved' 
            AND cml.staff_approval = 'pending'
            ORDER BY cml.coach_approved_at DESC
        ");
        
        $stmt->execute([$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
        $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedRequests = [];
        foreach ($requests as $request) {
            $request = castMemberData($request);
            
            $formattedRequests[] = [
                'id' => $request['request_id'],
                'member' => [
                    'id' => $request['member_id'],
                    'name' => trim($request['member_fname'] . ' ' . $request['member_mname'] . ' ' . $request['member_lname']),
                    'email' => $request['member_email'],
                    'avatar' => null
                ],
                'coach' => [
                    'id' => $request['coach_id'],
                    'name' => trim($request['coach_fname'] . ' ' . $request['coach_mname'] . ' ' . $request['coach_lname']),
                    'email' => $request['coach_email'],
                    'rating' => (float)($request['coach_rating'] ?: 4.5)
                ],
                'requestedAt' => $request['requested_at'],
                'coachApprovedAt' => $request['coach_approved_at'],
                'status' => 'pending'
            ];
        }
        
        echo json_encode([
            'success' => true,
            'requests' => $formattedRequests,
            'total' => count($formattedRequests)
        ]);
        
    } catch (Exception $e) {
        error_log("Error in searchRequests: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error searching requests: ' . $e->getMessage()
        ]);
    }
}

// Get current user information
function getCurrentUser($pdo) {
    try {
        // For now, return a default admin user
        // In a real implementation, you would get this from session or JWT token
        $adminUser = validateAdminUser($pdo, 6); // Try to get admin user with ID 6
        
        if ($adminUser) {
            echo json_encode([
                'success' => true,
                'user_id' => (int)$adminUser['id'],
                'user_type' => $adminUser['user_type_id'] == 1 ? 'admin' : 'staff',
                'name' => trim($adminUser['fname'] . ' ' . $adminUser['lname']),
                'email' => $adminUser['email'] ?? '',
                'message' => 'Admin user authenticated'
            ]);
        } else {
            // Fallback to default admin user
            echo json_encode([
                'success' => true,
                'user_id' => 6,
                'user_type' => 'admin',
                'name' => 'Admin User',
                'email' => 'admin@example.com',
                'message' => 'Using default admin user'
            ]);
        }
    } catch (Exception $e) {
        error_log("Error in getCurrentUser: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error getting current user: ' . $e->getMessage()
        ]);
    }
}

// Create admin_activity_log table if it doesn't exist
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS admin_activity_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_id INT NOT NULL,
            action VARCHAR(100) NOT NULL,
            details JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_admin_id (admin_id),
            INDEX idx_created_at (created_at),
            FOREIGN KEY (admin_id) REFERENCES user(id)
        )
    ");
} catch (Exception $e) {
    error_log("Failed to create admin_activity_log table: " . $e->getMessage());
}

// Generate receipt number for coach assignments
function generateCoachAssignmentReceiptNumber($pdo) {
    do {
        $receiptNumber = 'RCP' . date('Ymd') . str_pad(rand(100000, 999999), 6, '0', STR_PAD_LEFT);
        
        // Check sales table for uniqueness (only if receipt_number column exists)
        $count = 0;
        try {
            $salesStmt = $pdo->prepare("SELECT COUNT(*) FROM sales WHERE receipt_number = ?");
            $salesStmt->execute([$receiptNumber]);
            $count = $salesStmt->fetchColumn();
        } catch (Exception $e) {
            // If sales table doesn't have receipt_number column, assume unique
            $count = 0;
        }
    } while ($count > 0);
    
    return $receiptNumber;
}

// Fix existing sales records that have NULL values for receipt number and change amount
function fixSalesRecords($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $adminId = $input['admin_id'] ?? 1;
        
        // Validate admin user
        $adminUser = validateAdminUser($pdo, $adminId);
        if (!$adminUser) {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid admin user or insufficient permissions'
            ]);
            return;
        }
        
        // Check if sales table has the required columns
        $checkSalesColumns = $pdo->query("SHOW COLUMNS FROM sales");
        $salesColumns = $checkSalesColumns->fetchAll(PDO::FETCH_COLUMN);
        
        $hasReceiptColumn = in_array('receipt_number', $salesColumns);
        $hasChangeColumn = in_array('change_given', $salesColumns);  // Correct column name
        $hasCashierColumn = in_array('cashier_id', $salesColumns);
        
        if (!$hasReceiptColumn || !$hasChangeColumn || !$hasCashierColumn) {
            echo json_encode([
                'success' => false,
                'message' => 'Sales table does not have required columns (receipt_number, change_given, cashier_id)'
            ]);
            return;
        }
        
        // Get all sales records that need fixing
        $stmt = $pdo->prepare("
            SELECT id, total_amount, change_given, receipt_number, sale_type, payment_method
            FROM sales 
            WHERE receipt_number IS NULL OR change_given IS NULL
            ORDER BY id ASC
        ");
        $stmt->execute();
        $salesRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $fixedCount = 0;
        $errors = [];
        
        foreach ($salesRecords as $record) {
            try {
                $salesId = $record['id'];
                $totalAmount = $record['total_amount'];
                $changeGiven = $record['change_given'] ?? 0.00; // If change_given is NULL, set to 0
                $receiptNumber = $record['receipt_number'] ?? null;
                
                // Generate receipt number if not set
                if (empty($receiptNumber)) {
                    $receiptNumber = 'RCP' . str_pad($salesId, 6, '0', STR_PAD_LEFT);
                }
                
                // Update the record
                $updateStmt = $pdo->prepare("
                    UPDATE sales 
                    SET change_given = ?, receipt_number = ?
                    WHERE id = ?
                ");
                $updateStmt->execute([$changeGiven, $receiptNumber, $salesId]);
                
                $fixedCount++;
                
            } catch (Exception $e) {
                $errors[] = "Failed to fix sales record ID {$record['id']}: " . $e->getMessage();
            }
        }
        
        // Log the activity
        logStaffActivity($pdo, $adminId, "Fix Sales Records", "Fixed $fixedCount sales records with missing receipt numbers and change amounts", "Sales Management", [
            'fixed_count' => $fixedCount,
            'total_records' => count($salesRecords),
            'errors' => $errors,
            'fixed_by' => $adminUser['fname'] . ' ' . $adminUser['lname']
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => "Fixed $fixedCount sales records",
            'data' => [
                'fixed_count' => $fixedCount,
                'total_records' => count($salesRecords),
                'errors' => $errors
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error in fixSalesRecords: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error fixing sales records: ' . $e->getMessage()
        ]);
    }
}

// Get sales record details
function getSalesRecord($pdo, $salesId) {
    try {
        $stmt = $pdo->prepare("
            SELECT s.*, u.fname, u.lname, u.email
            FROM sales s
            LEFT JOIN user u ON s.user_id = u.id
            WHERE s.id = ?
        ");
        $stmt->execute([$salesId]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$record) {
            echo json_encode([
                'success' => false,
                'message' => 'Sales record not found'
            ]);
            return;
        }
        
        // Calculate change if not set
        $totalAmount = $record['total_amount'] ?? 0;
        $changeGiven = $record['change_given'] ?? 0.00;
        
        // Generate receipt number if not set
        $receiptNumber = $record['receipt_number'] ?? 'RCP' . str_pad($salesId, 6, '0', STR_PAD_LEFT);
        
        $formattedRecord = [
            'id' => (int)$record['id'],
            'user_id' => (int)$record['user_id'],
            'user_name' => trim(($record['fname'] ?? '') . ' ' . ($record['lname'] ?? '')),
            'user_email' => $record['email'] ?? '',
            'total_amount' => (float)$totalAmount,
            'change_given' => (float)$changeGiven,
            'receipt_number' => $receiptNumber,
            'sale_type' => $record['sale_type'] ?? 'Unknown',
            'payment_method' => $record['payment_method'] ?? 'cash',
            'transaction_status' => $record['transaction_status'] ?? 'pending',
            'sale_date' => $record['sale_date'] ?? null,
            'notes' => $record['notes'] ?? null
        ];
        
        echo json_encode([
            'success' => true,
            'record' => $formattedRecord
        ]);
        
    } catch (Exception $e) {
        error_log("Error in getSalesRecord: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error fetching sales record: ' . $e->getMessage()
        ]);
    }
}
?>
