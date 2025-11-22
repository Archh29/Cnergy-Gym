<?php
// Forgot Password API for Staff/Admin (Web App) - OTP-based password reset
// Handles: request OTP, verify OTP, and reset password
// This is separate from forgot_password.php which is for users/coaches (mobile app)

// Suppress error display but log them
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Set error handler to ensure JSON output on fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        header("Content-Type: application/json; charset=UTF-8");
        echo json_encode([
            "success" => false,
            "error" => "Internal server error occurred"
        ]);
    }
});

// Set CORS headers FIRST - absolutely no output before this
if (!headers_sent()) {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, OPTIONS, GET");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
    header("Access-Control-Allow-Credentials: false");
    header("Access-Control-Max-Age: 86400");
}

// Handle CORS preflight OPTIONS request - MUST be handled before any other processing
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Clear any output buffers
    while (ob_get_level()) {
        ob_end_clean();
    }
    http_response_code(200);
    header("Content-Type: text/plain; charset=UTF-8");
    header("Content-Length: 0");
    exit(0);
}

// Set content type for actual requests
header("Content-Type: application/json; charset=UTF-8");

// Database configuration
$host = "localhost";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (PDOException $e) {
    error_log('Forgot Password Staff Database connection failed: ' . $e->getMessage());
    http_response_code(500);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode(["success" => false, "error" => "Database connection failed"]);
    exit;
}

// Include email service
$emailServicePath = __DIR__ . '/email_service.php';
if (!file_exists($emailServicePath)) {
    error_log('email_service.php not found at: ' . $emailServicePath);
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Email service not available"]);
    exit;
}
try {
    require_once $emailServicePath;
    if (!class_exists('EmailService')) {
        throw new Exception('EmailService class not found after including file');
    }
} catch (Exception $e) {
    error_log('Error including email_service.php: ' . $e->getMessage());
    http_response_code(500);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode(["success" => false, "error" => "Email service initialization failed"]);
    exit;
}

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        "success" => false,
        "error" => "Method not allowed. Only POST requests are accepted."
    ]);
    exit;
}

// Process POST request
try {
    $rawInput = file_get_contents('php://input');
    if (empty($rawInput)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Request body is empty"]);
            exit;
        }
        
        $data = json_decode($rawInput, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid JSON: " . json_last_error_msg()]);
            exit;
        }
        
        $action = $data['action'] ?? 'request_otp'; // request_otp, verify_otp, reset_password
        
        date_default_timezone_set('Asia/Manila');
        
        // ========================================
        // ACTION 1: REQUEST OTP
        // ========================================
        if ($action === 'request_otp') {
            if (!isset($data['email']) || empty(trim($data['email']))) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Email is required"
                ]);
                exit;
            }
            
            $email = trim(strtolower($data['email']));
            
            // Find user by email - ONLY for admin and staff (user_type_id 1 or 2)
            $stmt = $pdo->prepare("
                SELECT id, fname, lname, email, user_type_id, account_status, is_deleted
                FROM user 
                WHERE LOWER(email) = LOWER(?) 
                AND user_type_id IN (1, 2)
                AND is_deleted = 0
            ");
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            
            // Always return success message (security best practice - don't reveal if email exists)
            if (!$user) {
                error_log("Password reset requested for non-existent or invalid staff/admin email: $email");
                http_response_code(200);
                echo json_encode([
                    "success" => true,
                    "message" => "If an account with that email exists, an OTP has been sent to your email address."
                ]);
                exit;
            }
            
            // Check if account is approved or active
            if ($user['account_status'] !== 'approved' && $user['account_status'] !== 'active') {
                error_log("Password reset requested for non-approved staff/admin account: $email (status: " . $user['account_status'] . ")");
                http_response_code(200);
                echo json_encode([
                    "success" => true,
                    "message" => "If an account with that email exists, an OTP has been sent to your email address."
                ]);
                exit;
            }
            
            // Generate 6-digit OTP
            $otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
            
            // Set expiration time (15 minutes from now)
            $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));
            
            // Delete any existing unused OTPs for this user
            $deleteStmt = $pdo->prepare("
                DELETE FROM password_reset_tokens 
                WHERE user_id = ? AND used = 0 AND expires_at > NOW()
            ");
            $deleteStmt->execute([$user['id']]);
            
            // Insert new OTP
            $insertStmt = $pdo->prepare("
                INSERT INTO password_reset_tokens (user_id, email, token, expires_at, used, created_at)
                VALUES (?, ?, ?, ?, 0, NOW())
            ");
            $insertStmt->execute([$user['id'], $user['email'], $otp, $expiresAt]);
            
            // Send OTP via email
            try {
                if (!class_exists('EmailService')) {
                    throw new Exception('EmailService class not found');
                }
                $emailService = new EmailService();
                $userName = trim($user['fname'] . ' ' . $user['lname']);
                $emailResult = $emailService->sendPasswordResetOTP($user['email'], $userName, $otp);
                
                if ($emailResult['success']) {
                    error_log("Password reset OTP sent successfully to staff/admin: $email");
                    http_response_code(200);
                    echo json_encode([
                        "success" => true,
                        "message" => "An OTP has been sent to your email address. Please check your inbox and enter the 6-digit code to reset your password.",
                        "email" => $email
                    ]);
                } else {
                    error_log("Failed to send password reset OTP to staff/admin: $email - " . ($emailResult['message'] ?? 'Unknown error'));
                    http_response_code(200);
                    echo json_encode([
                        "success" => true,
                        "message" => "If an account with that email exists, an OTP has been sent to your email address."
                    ]);
                }
            } catch (Exception $emailException) {
                error_log("Email service error: " . $emailException->getMessage());
                // Still return success to user (don't reveal email sending failure)
                http_response_code(200);
                echo json_encode([
                    "success" => true,
                    "message" => "If an account with that email exists, an OTP has been sent to your email address."
                ]);
            }
        }
        
        // ========================================
        // ACTION 2: VERIFY OTP
        // ========================================
        else if ($action === 'verify_otp') {
            if (!isset($data['email']) || !isset($data['otp'])) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Email and OTP are required"
                ]);
                exit;
            }
            
            $email = trim(strtolower($data['email']));
            $otp = trim($data['otp']);
            
            // Validate OTP format (6 digits)
            if (!preg_match('/^\d{6}$/', $otp)) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Invalid OTP format. OTP must be 6 digits."
                ]);
                exit;
            }
            
            // Find valid, unused, non-expired OTP for staff/admin only
            $stmt = $pdo->prepare("
                SELECT prt.id, prt.user_id, prt.email, prt.token, prt.expires_at, prt.used
                FROM password_reset_tokens prt
                JOIN user u ON prt.user_id = u.id
                WHERE LOWER(prt.email) = LOWER(?)
                AND prt.token = ?
                AND prt.used = 0
                AND prt.expires_at > NOW()
                AND u.user_type_id IN (1, 2)
                AND u.is_deleted = 0
                AND (u.account_status = 'approved' OR u.account_status = 'active')
                ORDER BY prt.created_at DESC
                LIMIT 1
            ");
            $stmt->execute([$email, $otp]);
            $tokenRecord = $stmt->fetch();
            
            if (!$tokenRecord) {
                error_log("Invalid OTP attempt for staff/admin email: $email, OTP: $otp");
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Invalid or expired OTP. Please request a new one."
                ]);
                exit;
            }
            
            // Mark OTP as used
            $updateStmt = $pdo->prepare("
                UPDATE password_reset_tokens 
                SET used = 1 
                WHERE id = ?
            ");
            $updateStmt->execute([$tokenRecord['id']]);
            
            // Generate a secure reset token for the next step (password reset)
            $resetToken = bin2hex(random_bytes(32));
            
            // Store reset token (update the token field with the reset token)
            $tokenUpdateStmt = $pdo->prepare("
                UPDATE password_reset_tokens 
                SET token = ?, expires_at = DATE_ADD(NOW(), INTERVAL 1 HOUR)
                WHERE id = ?
            ");
            $tokenUpdateStmt->execute([$resetToken, $tokenRecord['id']]);
            
            error_log("OTP verified successfully for staff/admin email: $email");
            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "OTP verified successfully. You can now reset your password.",
                "reset_token" => $resetToken,
                "email" => $email
            ]);
        }
        
        // ========================================
        // ACTION 3: RESET PASSWORD
        // ========================================
        else if ($action === 'reset_password') {
            if (!isset($data['email']) || !isset($data['reset_token']) || !isset($data['password'])) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Email, reset token, and new password are required"
                ]);
                exit;
            }
            
            $email = trim(strtolower($data['email']));
            $resetToken = trim($data['reset_token']);
            $newPassword = $data['password'];
            
            // Validate password
            if (strlen($newPassword) < 8) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Password must be at least 8 characters long"
                ]);
                exit;
            }
            
            // Find valid reset token for staff/admin only
            $stmt = $pdo->prepare("
                SELECT prt.id, prt.user_id, prt.email, prt.token, prt.expires_at, prt.used
                FROM password_reset_tokens prt
                JOIN user u ON prt.user_id = u.id
                WHERE LOWER(prt.email) = LOWER(?)
                AND prt.token = ?
                AND prt.used = 1
                AND prt.expires_at > NOW()
                AND u.user_type_id IN (1, 2)
                AND u.is_deleted = 0
                AND (u.account_status = 'approved' OR u.account_status = 'active')
                ORDER BY prt.created_at DESC
                LIMIT 1
            ");
            $stmt->execute([$email, $resetToken]);
            $tokenRecord = $stmt->fetch();
            
            if (!$tokenRecord) {
                error_log("Invalid reset token attempt for staff/admin email: $email");
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Invalid or expired reset token. Please request a new password reset."
                ]);
                exit;
            }
            
            // Hash new password
            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
            
            // Update user password
            $updateStmt = $pdo->prepare("
                UPDATE user 
                SET password = ? 
                WHERE id = ? AND email = ?
            ");
            $updateStmt->execute([$hashedPassword, $tokenRecord['user_id'], $email]);
            
            // Mark reset token as completely used (set used to 2 to indicate password was reset)
            $markUsedStmt = $pdo->prepare("
                UPDATE password_reset_tokens 
                SET used = 2 
                WHERE id = ?
            ");
            $markUsedStmt->execute([$tokenRecord['id']]);
            
            // Delete all other unused tokens for this user
            $deleteStmt = $pdo->prepare("
                DELETE FROM password_reset_tokens 
                WHERE user_id = ? AND used = 0
            ");
            $deleteStmt->execute([$tokenRecord['user_id']]);
            
            error_log("Password reset successfully for staff/admin user ID: " . $tokenRecord['user_id']);
            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "Password has been reset successfully. You can now login with your new password."
            ]);
        }
        
        // ========================================
        // INVALID ACTION
        // ========================================
        else {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "Invalid action. Supported actions: request_otp, verify_otp, reset_password"
            ]);
        }
        
    } catch (PDOException $e) {
        error_log("Database error in forgot_password_staff.php: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Database error occurred. Please try again later."
        ]);
        exit;
    } catch (Exception $e) {
        error_log("Error in forgot_password_staff.php: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "An error occurred. Please try again later."
        ]);
        exit;
    }
