<?php
// ⚠️ CRITICAL: Set CORS headers FIRST, before any output
// Enable error reporting (but don't display - log only to prevent output)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// CORS allowed origins
$allowedOrigins = [
	'https://www.cnergy.site',
	'https://cnergy.site',
	'http://localhost:3000',
	'http://localhost',
	'http://127.0.0.1:3000',
];

// Get origin from request headers
$origin = trim($_SERVER['HTTP_ORIGIN'] ?? '');

// Determine which origin to use for CORS
// Priority: 1) Exact match in allowed list, 2) Localhost detection, 3) Default

if (!empty($origin)) {
	// Check if origin is exactly in allowed list
	if (in_array($origin, $allowedOrigins, true)) {
		$corsOrigin = $origin;
	}
	// Allow any localhost origin for development (more permissive)
	elseif (stripos($origin, 'localhost') !== false || stripos($origin, '127.0.0.1') !== false) {
		$corsOrigin = $origin;
	}
	// Production origins
	elseif (stripos($origin, 'cnergy.site') !== false) {
		$corsOrigin = $origin;
	}
	// Unknown origin - default to production
	else {
		$corsOrigin = 'https://www.cnergy.site';
	}
} else {
	// No origin header - try to extract from referer
	if (!empty($_SERVER['HTTP_REFERER'])) {
		$refererParts = parse_url($_SERVER['HTTP_REFERER']);
		if ($refererParts && isset($refererParts['scheme']) && isset($refererParts['host'])) {
			$extractedOrigin = $refererParts['scheme'] . '://' . $refererParts['host'];
			if (isset($refererParts['port']) && $refererParts['port']) {
				$extractedOrigin .= ':' . $refererParts['port'];
			}
			// Check if it's localhost
			if (stripos($extractedOrigin, 'localhost') !== false || stripos($extractedOrigin, '127.0.0.1') !== false) {
				$corsOrigin = $extractedOrigin;
			} elseif (in_array($extractedOrigin, $allowedOrigins, true)) {
				$corsOrigin = $extractedOrigin;
			}
		}
	}
	
	// If still no origin, use default based on server
	if (empty($corsOrigin)) {
		$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
		if (stripos($host, 'localhost') !== false || stripos($host, '127.0.0.1') !== false) {
			$corsOrigin = 'http://localhost:3000'; // Development default
		} else {
			$corsOrigin = 'https://www.cnergy.site'; // Production default
		}
	}
}

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	header("Access-Control-Allow-Origin: $corsOrigin");
	header('Access-Control-Allow-Credentials: true');
	header('Vary: Origin');
	header('Access-Control-Allow-Methods: GET, OPTIONS');
	header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
	http_response_code(204);
	exit;
}

// Set CORS headers for actual GET request
header("Access-Control-Allow-Origin: $corsOrigin");
header('Access-Control-Allow-Credentials: true');
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

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

    // Get user ID from query parameter or POST data
    $user_id = $_GET['user_id'] ?? $_POST['user_id'] ?? $_REQUEST['user_id'] ?? null;
    
    // Trim and validate user_id
    if ($user_id !== null) {
        $user_id = trim($user_id);
        if ($user_id === '' || $user_id === '0') {
            $user_id = null;
        }
    }
    
    if (!$user_id || !is_numeric($user_id)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "User ID is required and must be a valid number"
        ]);
        exit();
    }
    
    // Convert to integer
    $user_id = (int)$user_id;

    // Fetch user information with user type
    $stmt = $pdo->prepare("
        SELECT 
            u.id,
            u.fname,
            u.mname,
            u.lname,
            u.email,
            u.account_status,
            ut.type_name as user_type_name
        FROM `user` u
        LEFT JOIN `usertype` ut ON u.user_type_id = ut.id
        WHERE u.id = :user_id
    ");
    
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "error" => "User not found"
        ]);
        exit();
    }

    // Return user information
    echo json_encode([
        "success" => true,
        "user" => [
            "id" => $user['id'],
            "fname" => $user['fname'],
            "mname" => $user['mname'],
            "lname" => $user['lname'],
            "email" => $user['email'],
            "account_status" => $user['account_status'],
            "user_type_name" => $user['user_type_name'] ?: 'User'
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "error" => "Database error: " . $e->getMessage()
    ]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "error" => "General error: " . $e->getMessage()
    ]);
    exit();
}