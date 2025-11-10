<?php
/**
 * TEMPLATE: What your login.php should look like
 * 
 * IMPORTANT: Your login.php MUST include session_config.php and set the session
 * for session.php to work properly.
 */

// Include session configuration (MUST BE AT THE TOP, BEFORE ANY OUTPUT)
require_once __DIR__ . '/session_config.php';
configureSession();

// Set CORS headers (same as session.php)
$allowedOrigins = [
    'https://www.cnergy.site',
    'https://cnergy.site',
    'http://localhost:3000',
    'http://localhost',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: https://www.cnergy.site');
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Database connection
$host = "localhost";
$dbname = "u773938685_cnergydb";      
$username = "u773938685_archh29";  
$password = "Gwapoko385@"; 

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Handle login POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and password are required']);
        exit;
    }
    
    try {
        // Verify user credentials
        $stmt = $pdo->prepare("
            SELECT u.id, u.email, u.password, u.user_type_id, ut.type_name as user_type
            FROM user u
            LEFT JOIN usertype ut ON u.user_type_id = ut.id
            WHERE u.email = ? AND u.account_status = 'approved'
        ");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user || !password_verify($password, $user['password'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid email or password']);
            exit;
        }
        
        // Check if user is admin or staff
        $userType = strtolower($user['user_type'] ?? '');
        if (!in_array($userType, ['admin', 'staff'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied. Only admin and staff can login.']);
            exit;
        }
        
        // ⭐ CRITICAL: Set session variables
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $userType;
        $_SESSION['last_activity'] = time();
        
        // Regenerate session ID for security
        session_regenerate_id(true);
        
        // Determine redirect URL based on user type
        $redirect = '/' . $userType . 'dashboard';
        
        // Return success response with user_id (IMPORTANT for frontend)
        echo json_encode([
            'success' => true,
            'redirect' => $redirect,
            'user_role' => $userType,
            'user_id' => $user['id'], // ⭐ IMPORTANT: Include user_id in response
            'message' => 'Login successful'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>

