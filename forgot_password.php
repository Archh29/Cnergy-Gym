<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Enable CORS
header("Access-Control-Allow-Origin: https://www.cnergy.site");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Database connection
    $host = "localhost";
    $dbname = "u773938685_cnergydb";
    $username = "u773938685_archh29";
    $password = "Gwapoko385@";
    
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4", 
        $username, 
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        exit();
    }

    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
        exit();
    }

    if (!isset($input['email']) || empty($input['email'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Email is required']);
        exit();
    }

    $email = trim($input['email']);

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'error' => 'Invalid email format']);
        exit();
    }

    // Check if user exists and is admin or staff (user_type_id 1 or 2)
    $stmt = $pdo->prepare("
        SELECT u.id, u.fname, u.lname, u.email, ut.type_name 
        FROM `user` u 
        LEFT JOIN `usertype` ut ON u.user_type_id = ut.id 
        WHERE u.email = :email 
        AND u.user_type_id IN (1, 2) 
        AND u.account_status = 'active'
    ");
    
    $stmt->bindParam(':email', $email, PDO::PARAM_STR);
    $stmt->execute();
    $user = $stmt->fetch();

    if (!$user) {
        // Don't reveal if email exists or not for security
        echo json_encode([
            'success' => true, 
            'message' => 'If an account with that email exists, a password reset link has been sent.'
        ]);
        exit();
    }

    // Generate reset token
    $resetToken = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour')); // Token expires in 1 hour

    // Create password_reset_tokens table if it doesn't exist
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `user_id` int(11) NOT NULL,
            `email` varchar(255) NOT NULL,
            `token` varchar(64) NOT NULL,
            `expires_at` datetime NOT NULL,
            `used` tinyint(1) DEFAULT 0,
            `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `token` (`token`),
            KEY `email` (`email`),
            KEY `expires_at` (`expires_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    // Delete any existing tokens for this user
    $deleteStmt = $pdo->prepare("DELETE FROM password_reset_tokens WHERE user_id = :user_id");
    $deleteStmt->bindParam(':user_id', $user['id'], PDO::PARAM_INT);
    $deleteStmt->execute();

    // Insert new reset token
    $insertStmt = $pdo->prepare("
        INSERT INTO password_reset_tokens (user_id, email, token, expires_at) 
        VALUES (:user_id, :email, :token, :expires_at)
    ");
    
    $insertStmt->bindParam(':user_id', $user['id'], PDO::PARAM_INT);
    $insertStmt->bindParam(':email', $email, PDO::PARAM_STR);
    $insertStmt->bindParam(':token', $resetToken, PDO::PARAM_STR);
    $insertStmt->bindParam(':expires_at', $expiresAt, PDO::PARAM_STR);
    $insertStmt->execute();

    // Generate reset URL
    $resetUrl = "https://www.cnergy.site/reset-password?token=" . $resetToken . "&email=" . urlencode($email);

    // Include password reset email functions
    require_once 'password_reset_email.php';

    // Send password reset email
    $userName = $user['fname'] . ' ' . $user['lname'];
    $emailSent = sendPasswordResetEmail($email, $userName, $resetUrl, 60);

    if ($emailSent) {
        echo json_encode([
            'success' => true,
            'message' => 'Password reset link has been sent to your email address. Please check your inbox and follow the instructions to reset your password.'
        ]);
    } else {
        // If email fails, still provide the reset URL for development
        error_log("Email sending failed for {$email}, providing reset URL for development");
        echo json_encode([
            'success' => true,
            'message' => 'Password reset link generated. Email sending failed, but you can use this link: ' . $resetUrl,
            'reset_url' => $resetUrl // For development fallback
        ]);
    }

} catch (PDOException $e) {
    error_log("Database error in forgot_password.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error occurred']);
    exit();
} catch (Exception $e) {
    error_log("General error in forgot_password.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An error occurred']);
    exit();
}
?>
