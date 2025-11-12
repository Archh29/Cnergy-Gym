<?php
// Database configuration
$host = "localhost";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";

// Connect to database
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    // Ensure proper UTF-8 encoding
    $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (PDOException $e) {
    http_response_code(500);
    error_log("Database connection failed in member_management.php: " . $e->getMessage());
    echo json_encode(["error" => "Database connection failed"]);
    exit;
}

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Get all members
if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['id'])) {
    try {
        // Updated to include account_status - using lowercase 'user' table name
        $stmt = $pdo->query('SELECT id, fname, mname, lname, email, gender_id, bday, user_type_id, account_status FROM user WHERE user_type_id = 4');
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($members);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        error_log("Database error in member_management.php GET: " . $e->getMessage());
        echo json_encode(['error' => 'Server error']);
        exit;
    }
}

// Get a single member by ID
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['id'])) {
    try {
        $stmt = $pdo->prepare('SELECT id, fname, mname, lname, email, gender_id, bday, user_type_id, account_status FROM user WHERE id = ?');
        $stmt->execute([$_GET['id']]);
        $member = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$member) {
            http_response_code(404);
            echo json_encode(['error' => 'Member not found']);
            exit;
        }
        echo json_encode($member);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        error_log("Database error in member_management.php GET by ID: " . $e->getMessage());
        echo json_encode(['error' => 'Server error']);
        exit;
    }
}

// Add a new member
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON']);
            exit;
        }

        // Validate required fields
        if (!isset($input['fname'], $input['mname'], $input['lname'], $input['email'], $input['password'], $input['gender_id'], $input['bday'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            exit;
        }

        // Set default account status if not provided
        $account_status = isset($input['account_status']) ? $input['account_status'] : 'pending';

        // Insert with all required fields including account_status
        // Note: Using lowercase 'user' table name to match database schema
        $stmt = $pdo->prepare('INSERT INTO user (user_type_id, fname, mname, lname, email, password, gender_id, bday, failed_attempt, account_status) 
                               VALUES (4, ?, ?, ?, ?, ?, ?, ?, 0, ?)');
        $stmt->execute([
            $input['fname'],
            $input['mname'],
            $input['lname'],
            $input['email'],
            password_hash($input['password'], PASSWORD_DEFAULT),
            $input['gender_id'],
            $input['bday'],
            $account_status
        ]);

        // Fetch the newly added member
        $newMemberId = $pdo->lastInsertId();
        $stmt = $pdo->prepare('SELECT id, fname, mname, lname, email, gender_id, bday, account_status FROM user WHERE id = ?');
        $stmt->execute([$newMemberId]);
        $newMember = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode(['message' => 'Member added successfully', 'member' => $newMember]);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        error_log("Database error in member_management.php POST: " . $e->getMessage());
        echo json_encode(['error' => 'Server error', 'details' => $e->getMessage()]);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        error_log("Error in member_management.php POST: " . $e->getMessage());
        echo json_encode(['error' => 'Server error', 'details' => $e->getMessage()]);
        exit;
    }
}

// Update a member
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $rawInput = file_get_contents('php://input');
        error_log("Raw Input: " . $rawInput);
        $input = json_decode($rawInput, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON format', 'details' => json_last_error_msg()]);
            exit;
        }

        // Check if this is just an account status update
        if (isset($input['id']) && isset($input['account_status']) && count($input) == 2) {
            // Simple account status update - using lowercase 'user' table name
            $stmt = $pdo->prepare('UPDATE user SET account_status = ? WHERE id = ?');
            $stmt->execute([$input['account_status'], $input['id']]);
            echo json_encode(['message' => 'Account status updated successfully']);
            exit;
        }

        // Full member update - validate required fields
        if (!isset($input['id'], $input['fname'], $input['mname'], $input['lname'], $input['email'], $input['gender_id'], $input['bday'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            exit;
        }

        // Update query with all required fields including account_status - using lowercase 'user' table name
        $query = 'UPDATE user SET fname = ?, mname = ?, lname = ?, email = ?, gender_id = ?, bday = ?, account_status = ? WHERE id = ?';
        $params = [
            $input['fname'],
            $input['mname'],
            $input['lname'],
            $input['email'],
            $input['gender_id'],
            $input['bday'],
            isset($input['account_status']) ? $input['account_status'] : 'pending',
            $input['id']
        ];

        // Add password to update if provided
        if (!empty($input['password'])) {
            $query = 'UPDATE user SET fname = ?, mname = ?, lname = ?, email = ?, gender_id = ?, bday = ?, account_status = ?, password = ? WHERE id = ?';
            $params = [
                $input['fname'],
                $input['mname'],
                $input['lname'],
                $input['email'],
                $input['gender_id'],
                $input['bday'],
                isset($input['account_status']) ? $input['account_status'] : 'pending',
                password_hash($input['password'], PASSWORD_DEFAULT),
                $input['id']
            ];
        }

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        echo json_encode(['message' => 'Member updated successfully']);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        error_log("Database error in member_management.php PUT: " . $e->getMessage());
        echo json_encode(['error' => 'Server error', 'details' => $e->getMessage()]);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        error_log("Error in member_management.php PUT: " . $e->getMessage());
        echo json_encode(['error' => 'Server error', 'details' => $e->getMessage()]);
        exit;
    }
}

// Delete a member
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !isset($input['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON or missing id']);
            exit;
        }

        // Using lowercase 'user' table name
        $stmt = $pdo->prepare('DELETE FROM user WHERE id = ?');
        $stmt->execute([$input['id']]);
        echo json_encode(['message' => 'Member deleted successfully']);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        error_log("Database error in member_management.php DELETE: " . $e->getMessage());
        echo json_encode(['error' => 'Server error', 'details' => $e->getMessage()]);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        error_log("Error in member_management.php DELETE: " . $e->getMessage());
        echo json_encode(['error' => 'Server error', 'details' => $e->getMessage()]);
        exit;
    }
}
?>