<?php
header('Content-Type: application/json; charset=UTF-8');

// CORS handling
$allowedOrigins = [
    'https://www.cnergy.site',
    'https://cnergy.site',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Vary: Origin');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'activity_logger.php';

// Database connection
$host = "localhost";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database connection failed: " . $e->getMessage()
    ]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Get request data
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$data = array_merge($_POST, $input);

// Helper function to validate admin/staff
function validateAdminStaff($pdo, $userId) {
    try {
        if (!$userId || !is_numeric($userId)) {
            error_log("validateAdminStaff: Invalid userId provided: " . var_export($userId, true));
            return false;
        }
        
        $stmt = $pdo->prepare("
            SELECT id, user_type_id, fname, lname 
            FROM user 
            WHERE id = ? AND user_type_id IN (1, 2)
        ");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if ($user === false) {
            error_log("validateAdminStaff: User not found or not admin/staff - User ID: $userId");
            return false;
        }
        
        // Check if user is deleted (optional check)
        $checkDeletedStmt = $pdo->prepare("SELECT is_deleted FROM user WHERE id = ?");
        $checkDeletedStmt->execute([$userId]);
        $deletedCheck = $checkDeletedStmt->fetch();
        if ($deletedCheck && ($deletedCheck['is_deleted'] == 1 || $deletedCheck['is_deleted'] === true)) {
            error_log("validateAdminStaff: User is deleted - User ID: $userId");
            return false;
        }
        
        return true;
    } catch (Exception $e) {
        error_log("validateAdminStaff: Error validating user - " . $e->getMessage());
        return false;
    }
}

// GET: Get discount eligibility for a user
if ($method === 'GET' && $action === 'get') {
    $userId = $_GET['user_id'] ?? null;
    
    if (!$userId || !is_numeric($userId)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "User ID is required"
        ]);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT 
                ude.id,
                ude.user_id,
                ude.discount_type,
                ude.verified_at,
                ude.expires_at,
                ude.verified_by,
                ude.is_active,
                ude.notes,
                ude.created_at,
                u.fname as verified_by_fname,
                u.lname as verified_by_lname
            FROM user_discount_eligibility ude
            LEFT JOIN user u ON ude.verified_by = u.id
            WHERE ude.user_id = ?
            ORDER BY ude.created_at DESC
        ");
        $stmt->execute([$userId]);
        $eligibilities = $stmt->fetchAll();
        
        echo json_encode([
            "success" => true,
            "data" => $eligibilities
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Failed to fetch discount eligibility: " . $e->getMessage()
        ]);
    }
    exit();
}

// POST: Add or update discount eligibility
if ($method === 'POST' && $action === 'add') {
    $userId = $data['user_id'] ?? null;
    $discountType = $data['discount_type'] ?? null;
    $verifiedBy = $data['verified_by'] ?? null;
    $expiresAt = $data['expires_at'] ?? null;
    $notes = $data['notes'] ?? null;
    
    // Validation
    if (!$userId || !is_numeric($userId)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "User ID is required"
        ]);
        exit();
    }
    
    if (!in_array($discountType, ['student', 'senior'])) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "Invalid discount type. Must be 'student' or 'senior'"
        ]);
        exit();
    }
    
    if (!$verifiedBy) {
        error_log("user_discount.php add: verified_by is missing or empty");
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "Admin/Staff ID (verified_by) is required"
        ]);
        exit();
    }
    
    if (!validateAdminStaff($pdo, $verifiedBy)) {
        error_log("user_discount.php add: Permission validation failed - verified_by: $verifiedBy");
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "error" => "Invalid admin/staff user or insufficient permissions. User must be admin (type 1) or staff (type 2)."
        ]);
        exit();
    }
    
    // Verify user exists
    $userStmt = $pdo->prepare("SELECT id, fname, lname FROM user WHERE id = ?");
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch();
    
    if (!$user) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "error" => "User not found"
        ]);
        exit();
    }
    
    try {
        $pdo->beginTransaction();
        
        // Deactivate any existing active discount of the same type for this user
        $deactivateStmt = $pdo->prepare("
            UPDATE user_discount_eligibility 
            SET is_active = 0 
            WHERE user_id = ? AND discount_type = ? AND is_active = 1
        ");
        $deactivateStmt->execute([$userId, $discountType]);
        
        // Insert new discount eligibility
        $insertStmt = $pdo->prepare("
            INSERT INTO user_discount_eligibility 
            (user_id, discount_type, verified_by, expires_at, notes, is_active, verified_at)
            VALUES (?, ?, ?, ?, ?, 1, NOW())
        ");
        $insertStmt->execute([
            $userId,
            $discountType,
            $verifiedBy,
            $expiresAt ?: null,
            $notes ?: null
        ]);
        
        $discountId = $pdo->lastInsertId();
        
        // Log activity
        logStaffActivity(
            $pdo,
            $verifiedBy,
            "Tag User for Discount",
            "Tagged {$user['fname']} {$user['lname']} (ID: $userId) as " . ucfirst($discountType) . " discount eligible",
            "Discount Management"
        );
        
        $pdo->commit();
        
        echo json_encode([
            "success" => true,
            "message" => "Discount eligibility added successfully",
            "data" => [
                "id" => $discountId,
                "user_id" => $userId,
                "discount_type" => $discountType
            ]
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Failed to add discount eligibility: " . $e->getMessage()
        ]);
    }
    exit();
}

// POST: Remove/deactivate discount eligibility
if ($method === 'POST' && $action === 'remove') {
    $discountId = $data['discount_id'] ?? null;
    $userId = $data['user_id'] ?? null;
    $verifiedBy = $data['verified_by'] ?? null;
    
    if (!$discountId || !is_numeric($discountId)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "Discount ID is required"
        ]);
        exit();
    }
    
    if (!$verifiedBy) {
        error_log("user_discount.php add: verified_by is missing or empty");
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "Admin/Staff ID (verified_by) is required"
        ]);
        exit();
    }
    
    if (!validateAdminStaff($pdo, $verifiedBy)) {
        error_log("user_discount.php add: Permission validation failed - verified_by: $verifiedBy");
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "error" => "Invalid admin/staff user or insufficient permissions. User must be admin (type 1) or staff (type 2)."
        ]);
        exit();
    }
    
    try {
        $pdo->beginTransaction();
        
        // Get discount info for logging
        $discountStmt = $pdo->prepare("
            SELECT ude.*, u.fname, u.lname 
            FROM user_discount_eligibility ude
            JOIN user u ON ude.user_id = u.id
            WHERE ude.id = ?
        ");
        $discountStmt->execute([$discountId]);
        $discount = $discountStmt->fetch();
        
        if (!$discount) {
            http_response_code(404);
            echo json_encode([
                "success" => false,
                "error" => "Discount eligibility not found"
            ]);
            exit();
        }
        
        // Deactivate the discount
        $updateStmt = $pdo->prepare("
            UPDATE user_discount_eligibility 
            SET is_active = 0 
            WHERE id = ?
        ");
        $updateStmt->execute([$discountId]);
        
        // Log activity
        logStaffActivity(
            $pdo,
            $verifiedBy,
            "Remove Discount Tag",
            "Removed " . ucfirst($discount['discount_type']) . " discount eligibility from {$discount['fname']} {$discount['lname']} (ID: {$discount['user_id']})",
            "Discount Management"
        );
        
        $pdo->commit();
        
        echo json_encode([
            "success" => true,
            "message" => "Discount eligibility removed successfully"
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Failed to remove discount eligibility: " . $e->getMessage()
        ]);
    }
    exit();
}

// GET: Get active discount eligibility for a user (for subscription creation)
if ($method === 'GET' && $action === 'get_active') {
    $userId = $_GET['user_id'] ?? null;
    
    if (!$userId || !is_numeric($userId)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "User ID is required"
        ]);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("
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
        $stmt->execute([$userId]);
        $eligibility = $stmt->fetch();
        
        echo json_encode([
            "success" => true,
            "discount_type" => $eligibility ? $eligibility['discount_type'] : null
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Failed to fetch active discount: " . $e->getMessage()
        ]);
    }
    exit();
}

// Invalid action
http_response_code(400);
echo json_encode([
    "success" => false,
    "error" => "Invalid action or method"
]);

