<?php
// CRITICAL: Set CORS headers FIRST, before any output or session_start()
// This file MUST NOT have any output (including whitespace or BOM) before headers

// CORS allowed origins - NEVER use '*' when credentials are included
$allowedOrigins = [
	'https://www.cnergy.site',
	'https://cnergy.site',
	'http://localhost:3000',
	'http://localhost',
	'http://127.0.0.1:3000',
];

// Get origin from request
$origin = trim($_SERVER['HTTP_ORIGIN'] ?? '');

// Determine CORS origin - MUST be specific, never '*'
$corsOrigin = null;

if (!empty($origin)) {
	// Check exact match first
	if (in_array($origin, $allowedOrigins, true)) {
		$corsOrigin = $origin;
	}
	// Allow any localhost for development
	elseif (stripos($origin, 'localhost') !== false || stripos($origin, '127.0.0.1') !== false) {
		$corsOrigin = $origin;
	}
	// Allow cnergy.site domains
	elseif (stripos($origin, 'cnergy.site') !== false) {
		$corsOrigin = $origin;
	}
}

// Fallback: Try to get from referer if no origin header
if (empty($corsOrigin) && !empty($_SERVER['HTTP_REFERER'])) {
	$refererParts = parse_url($_SERVER['HTTP_REFERER']);
	if ($refererParts && isset($refererParts['scheme']) && isset($refererParts['host'])) {
		$extractedOrigin = $refererParts['scheme'] . '://' . $refererParts['host'];
		if (isset($refererParts['port']) && $refererParts['port']) {
			$extractedOrigin .= ':' . $refererParts['port'];
		}
		if (stripos($extractedOrigin, 'localhost') !== false || stripos($extractedOrigin, '127.0.0.1') !== false) {
			$corsOrigin = $extractedOrigin;
		} elseif (in_array($extractedOrigin, $allowedOrigins, true)) {
			$corsOrigin = $extractedOrigin;
		}
	}
}

// Final fallback - use default based on context
if (empty($corsOrigin)) {
	$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
	if (stripos($host, 'localhost') !== false || stripos($host, '127.0.0.1') !== false) {
		$corsOrigin = 'http://localhost:3000';
	} else {
		$corsOrigin = 'https://www.cnergy.site';
	}
}

// CRITICAL SAFETY CHECK: Never allow '*' when credentials are used
if (empty($corsOrigin) || $corsOrigin === '*') {
	$corsOrigin = 'http://localhost:3000';
}

// Handle OPTIONS preflight request FIRST
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	header("Access-Control-Allow-Origin: $corsOrigin");
	header('Access-Control-Allow-Credentials: true');
	header('Vary: Origin');
	header('Access-Control-Allow-Methods: GET, OPTIONS');
	header('Access-Control-Allow-Headers: Content-Type, Authorization');
	http_response_code(204);
	exit;
}

// Set CORS headers for actual request (BEFORE session_start)
header("Access-Control-Allow-Origin: $corsOrigin");
header('Access-Control-Allow-Credentials: true');
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Start session after headers are set
session_start();

// Database connection
$host = "localhost";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";

try {
	$pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
	$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
	error_log("Database connection error: " . $e->getMessage());
	http_response_code(500);
	echo json_encode([
		'error' => 'Database connection failed',
		'details' => $e->getMessage(),
		'authenticated' => false
	]);
	exit;
}

// Validate session function
function validateSession($pdo) {
	if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_role'])) {
		return ['error' => 'No active session', 'authenticated' => false];
	}

	$user_id = $_SESSION['user_id'];
	$session_role = $_SESSION['user_role'];

	if (!is_numeric($user_id)) {
		session_destroy();
		return ['error' => 'Invalid session data', 'authenticated' => false];
	}

	$allowed_roles = ['admin', 'staff'];
	if (!in_array($session_role, $allowed_roles)) {
		session_destroy();
		return ['error' => 'Invalid user role', 'authenticated' => false];
	}

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
			session_destroy();
			return ['error' => 'User not found', 'authenticated' => false];
		}

		if ($user['user_type'] !== $session_role) {
			$_SESSION['user_role'] = $user['user_type'];
			$session_role = $user['user_type'];
		}

		if (isset($_SESSION['last_activity'])) {
			$timeout = 8 * 60 * 60; // 8 hours
			if (time() - $_SESSION['last_activity'] > $timeout) {
				session_destroy();
				return ['error' => 'Session expired', 'authenticated' => false];
			}
		}

		$_SESSION['last_activity'] = time();

		return [
			'user_role' => $session_role,
			'user_id' => (int)$user_id,
			'authenticated' => true
		];

	} catch (PDOException $e) {
		error_log("Session validation error: " . $e->getMessage());
		return ['error' => 'Database error', 'authenticated' => false];
	}
}

// Validate session and return result
$result = validateSession($pdo);

if (isset($result['error'])) {
	http_response_code(401);
} else {
	http_response_code(200);
}

echo json_encode($result);
