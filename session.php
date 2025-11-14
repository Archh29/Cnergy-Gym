<?php
session_start();

// CORS (reflect exact origin; required with credentials)
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
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	http_response_code(204);
	exit;
}

// Database connection with correct credentials
$host = "localhost";
$dbname = "u773938685_cnergydb";      
$username = "u773938685_archh29";  
$password = "Gwapoko385@"; 

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    // If database connection fails, return detailed error
    error_log("Database connection error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Database connection failed', 
        'details' => $e->getMessage()
    ]);
    exit;
}

// Security validation function
function validateSession($pdo) {
    // Check if session has required data
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_role'])) {
        return ['error' => 'No active session', 'authenticated' => false];
    }
    
    $user_id = $_SESSION['user_id'];
    $session_role = $_SESSION['user_role'];
    
    // Validate user_id is numeric
    if (!is_numeric($user_id)) {
        session_destroy();
        return ['error' => 'Invalid session data', 'authenticated' => false];
    }
    
    // Validate role is one of the allowed roles
    $allowed_roles = ['admin', 'staff'];
    if (!in_array($session_role, $allowed_roles)) {
        session_destroy();
        return ['error' => 'Invalid user role', 'authenticated' => false];
    }
    
    // Verify user exists and is active in database
    try {
        $stmt = $pdo->prepare("
            SELECT u.id, u.user_type_id, ut.type_name as user_type
            FROM user u
            LEFT JOIN usertype ut ON u.user_type_id = ut.id
            WHERE u.id = ?
        ");
        $stmt->execute([$user_id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            // User doesn't exist in database
            session_destroy();
            return ['error' => 'User not found', 'authenticated' => false];
        }
        
        // Verify role matches database
        if ($user['user_type'] !== $session_role) {
            // Role changed in database, update session
            $_SESSION['user_role'] = $user['user_type'];
            $session_role = $user['user_type'];
        }
        
        // Check for session timeout (optional - 8 hours)
        if (isset($_SESSION['last_activity'])) {
            $timeout = 8 * 60 * 60; // 8 hours in seconds
            if (time() - $_SESSION['last_activity'] > $timeout) {
                session_destroy();
                return ['error' => 'Session expired', 'authenticated' => false];
            }
        }
        
        // Update last activity
        $_SESSION['last_activity'] = time();
        
        return [
            'user_role' => $session_role,
            'user_id' => $user_id,
            'authenticated' => true
        ];
        
    } catch (PDOException $e) {
        // Database error
        error_log("Session validation error: " . $e->getMessage());
        return ['error' => 'Database error', 'authenticated' => false];
    }
}

// Validate session and return result
$result = validateSession($pdo);

if (isset($result['error'])) {
    http_response_code(401);
}

echo json_encode($result);