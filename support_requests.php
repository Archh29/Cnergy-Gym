<?php
// Support Requests API - Fetch support requests for admin viewing
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
    error_log('Support Requests Database connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
    exit();
}

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Function to send JSON response
function respond($payload, $code = 200) {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

try {
    // GET: Fetch all support requests
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Check if table exists, if not return empty array
        $tableCheck = $pdo->query("SHOW TABLES LIKE 'support_requests'");
        if ($tableCheck->rowCount() === 0) {
            respond([]);
        }

        // Fetch all support requests ordered by created_at descending (newest first)
        $stmt = $pdo->query('
            SELECT id, user_email, subject, message, source, created_at 
            FROM support_requests 
            ORDER BY created_at DESC
        ');
        $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

        respond($requests);
    } else {
        respond(['error' => 'Method not allowed'], 405);
    }
} catch (PDOException $e) {
    error_log('Support Requests Error: ' . $e->getMessage());
    respond(['error' => 'Database error occurred'], 500);
}
?>

