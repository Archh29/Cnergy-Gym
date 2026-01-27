<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);

try {
    // Check for archived query parameter
    if ($method === 'GET' && isset($_GET['archived']) && $_GET['archived'] === '1') {
        $method = 'GET_ARCHIVED';
    }

    switch ($method) {
        case 'GET':
            // Fetch all staff users
            if (isset($_GET['id'])) {
                // Fetch a specific staff member by ID (exclude deleted)
                try {
                    $stmt = $pdo->prepare("SELECT * FROM user WHERE id = ? AND user_type_id = 2 AND (is_deleted = 0 OR is_deleted IS NULL)");
                    $stmt->execute([$_GET['id']]);
                    $staff = $stmt->fetch(PDO::FETCH_ASSOC);

                    if ($staff) {
                        $staff['user_type'] = 'Staff';
                        $staff['gender'] = $staff['gender_id'] == 1 ? 'Male' : 'Female';
                    }
                } catch (PDOException $e) {
                    $stmt = $pdo->prepare("SELECT * FROM User WHERE id = ? AND user_type_id = 2 AND (is_deleted = 0 OR is_deleted IS NULL)");
                    $stmt->execute([$_GET['id']]);
                    $staff = $stmt->fetch(PDO::FETCH_ASSOC);

                    if ($staff) {
                        $staff['user_type'] = 'Staff';
                        $staff['gender'] = $staff['gender_id'] == 1 ? 'Male' : 'Female';
                    }
                }
                echo json_encode($staff ?: []);
            } else {
                // Fetch all staff users - simplified approach
                try {
                    // First, let's try a simple query to get staff users (exclude deleted)
                    $stmt = $pdo->prepare("SELECT * FROM user WHERE user_type_id = 2 AND (is_deleted = 0 OR is_deleted IS NULL)");
                    $stmt->execute();
                    $staffs = $stmt->fetchAll(PDO::FETCH_ASSOC);

                    // Add default values for missing fields
                    foreach ($staffs as &$staff) {
                        $staff['user_type'] = 'Staff';
                        $staff['gender'] = $staff['gender_id'] == 1 ? 'Male' : 'Female';
                    }

                } catch (PDOException $e) {
                    // If that fails, try with 'User' table (uppercase)
                    $stmt = $pdo->prepare("SELECT * FROM User WHERE user_type_id = 2 AND (is_deleted = 0 OR is_deleted IS NULL)");
                    $stmt->execute();
                    $staffs = $stmt->fetchAll(PDO::FETCH_ASSOC);

                    // Add default values for missing fields
                    foreach ($staffs as &$staff) {
                        $staff['user_type'] = 'Staff';
                        $staff['gender'] = $staff['gender_id'] == 1 ? 'Male' : 'Female';
                    }
                }
                echo json_encode(["staff" => $staffs ?: []]);
            }
            break;

        case 'GET_ARCHIVED':
            // Fetch archived staff users (is_deleted = 1)
            try {
                $stmt = $pdo->prepare("SELECT * FROM user WHERE user_type_id = 2 AND is_deleted = 1");
                $stmt->execute();
                $staffs = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($staffs as &$staff) {
                    $staff['user_type'] = 'Staff';
                    $staff['gender'] = $staff['gender_id'] == 1 ? 'Male' : 'Female';
                }
            } catch (PDOException $e) {
                $stmt = $pdo->prepare("SELECT * FROM User WHERE user_type_id = 2 AND is_deleted = 1");
                $stmt->execute();
                $staffs = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($staffs as &$staff) {
                    $staff['user_type'] = 'Staff';
                    $staff['gender'] = $staff['gender_id'] == 1 ? 'Male' : 'Female';
                }
            }
            echo json_encode(["staff" => $staffs ?: []]);
            break;

        case 'POST':
            // Create a new staff member
            if (!isset($data['email'], $data['password'], $data['fname'], $data['lname'], $data['bday'])) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required user fields"]);
                exit;
            }

            // Always set user_type_id to 2 (Staff)
            $data['user_type_id'] = 2;

            // Set default gender_id if not provided (1 = Male)
            if (!isset($data['gender_id'])) {
                $data['gender_id'] = 1;
            }

            // Handle middle name - convert null/empty to empty string (database doesn't allow NULL)
            $mname = '';
            if (array_key_exists('mname', $data) && $data['mname'] !== null && $data['mname'] !== '') {
                $trimmed = trim($data['mname']);
                if ($trimmed !== '') {
                    $mname = $trimmed;
                }
            }

            // Hash password for security
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);

            // CRITICAL: Check if email already exists across ALL user types
            try {
                $stmt = $pdo->prepare("SELECT id, user_type_id FROM user WHERE email = ?");
                $stmt->execute([$data['email']]);
            } catch (PDOException $e) {
                $stmt = $pdo->prepare("SELECT id, user_type_id FROM User WHERE email = ?");
                $stmt->execute([$data['email']]);
            }
            $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existingUser) {
                $userTypes = [1 => 'Admin', 2 => 'Staff', 3 => 'Coach', 4 => 'Member'];
                $existingUserType = $userTypes[$existingUser['user_type_id']] ?? 'Unknown';
                http_response_code(400);
                echo json_encode([
                    "error" => "Email already exists",
                    "message" => "Email '{$data['email']}' is already registered as a {$existingUserType}. Please use a different email address."
                ]);
                exit;
            }

            // Insert into user table
            try {
                $stmt = $pdo->prepare("INSERT INTO user (email, password, user_type_id, gender_id, fname, mname, lname, bday) 
                                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            } catch (PDOException $e) {
                $stmt = $pdo->prepare("INSERT INTO User (email, password, user_type_id, gender_id, fname, mname, lname, bday) 
                                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            }
            $stmt->execute([
                $data['email'],
                $hashedPassword,
                $data['user_type_id'],
                $data['gender_id'],
                trim($data['fname']),
                $mname, // Empty string instead of null
                trim($data['lname']),
                $data['bday']
            ]);

            $id_user = $pdo->lastInsertId();
            echo json_encode(["success" => "Staff member created successfully", "id_user" => $id_user]);
            break;

        case 'PUT':
            // Update an existing staff member
            if (!isset($data['id'], $data['email'], $data['fname'], $data['lname'], $data['bday'])) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required fields"]);
                exit;
            }

            // Always set user_type_id to 2 (Staff)
            $data['user_type_id'] = 2;

            // Set default gender_id if not provided (1 = Male)
            if (!isset($data['gender_id'])) {
                $data['gender_id'] = 1;
            }

            // Handle optional middle name - convert null/empty to empty string (database doesn't allow NULL)
            $mname = '';
            if (isset($data['mname']) && $data['mname'] !== null && $data['mname'] !== '') {
                $trimmed = trim($data['mname']);
                if ($trimmed !== '') {
                    $mname = $trimmed;
                }
            }

            // CRITICAL: Check if email already exists across ALL user types (excluding current user)
            try {
                $stmt = $pdo->prepare("SELECT id, user_type_id FROM user WHERE email = ? AND id != ?");
                $stmt->execute([$data['email'], $data['id']]);
            } catch (PDOException $e) {
                $stmt = $pdo->prepare("SELECT id, user_type_id FROM User WHERE email = ? AND id != ?");
                $stmt->execute([$data['email'], $data['id']]);
            }
            $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existingUser) {
                $userTypes = [1 => 'Admin', 2 => 'Staff', 3 => 'Coach', 4 => 'Member'];
                $existingUserType = $userTypes[$existingUser['user_type_id']] ?? 'Unknown';
                http_response_code(400);
                echo json_encode([
                    "error" => "Email already exists",
                    "message" => "Email '{$data['email']}' is already registered as a {$existingUserType}. Please use a different email address."
                ]);
                exit;
            }

            // Update user table - handle password update if provided
            // Accept either `password` or `new_password` from client.
            $newPasswordRaw = '';
            if (isset($data['new_password'])) {
                $newPasswordRaw = (string)$data['new_password'];
            } elseif (isset($data['password'])) {
                $newPasswordRaw = (string)$data['password'];
            }

            $newPassword = trim($newPasswordRaw);
            $passwordWillUpdate = ($newPassword !== '');

            if ($passwordWillUpdate) {
                $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
                try {
                    $stmt = $pdo->prepare("UPDATE user SET email = ?, password = ?, user_type_id = ?, gender_id = ?, fname = ?, mname = ?, lname = ?, bday = ? WHERE id = ?");
                } catch (PDOException $e) {
                    $stmt = $pdo->prepare("UPDATE User SET email = ?, password = ?, user_type_id = ?, gender_id = ?, fname = ?, mname = ?, lname = ?, bday = ? WHERE id = ?");
                }
                $stmt->execute([
                    $data['email'],
                    $hashedPassword,
                    $data['user_type_id'],
                    $data['gender_id'],
                    trim($data['fname']),
                    $mname, // Empty string if not provided
                    trim($data['lname']),
                    $data['bday'],
                    $data['id']
                ]);
            } else {
                try {
                    $stmt = $pdo->prepare("UPDATE user SET email = ?, user_type_id = ?, gender_id = ?, fname = ?, mname = ?, lname = ?, bday = ? WHERE id = ?");
                } catch (PDOException $e) {
                    $stmt = $pdo->prepare("UPDATE User SET email = ?, user_type_id = ?, gender_id = ?, fname = ?, mname = ?, lname = ?, bday = ? WHERE id = ?");
                }
                $stmt->execute([
                    $data['email'],
                    $data['user_type_id'],
                    $data['gender_id'],
                    trim($data['fname']),
                    $mname, // Empty string if not provided
                    trim($data['lname']),
                    $data['bday'],
                    $data['id']
                ]);
            }

            echo json_encode([
                "success" => "Staff member updated successfully",
                "password_updated" => $passwordWillUpdate
            ]);
            break;

        case 'DELETE':
            // Get ID from request
            $staffId = $_GET['id'] ?? $data['id'] ?? null;

            if (!$staffId || !is_numeric($staffId)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid staff ID']);
                exit;
            }

            // Soft delete (hide staff instead of actually deleting)
            $deleted = false;
            $errorMessage = '';

            try {
                $stmt = $pdo->prepare('UPDATE user SET is_deleted = 1 WHERE id = ? AND user_type_id = 2');
                $stmt->execute([$staffId]);
                $deleted = $stmt->rowCount() > 0;
            } catch (PDOException $e) {
                $errorMessage = $e->getMessage();
                // Try uppercase table
                try {
                    $stmt = $pdo->prepare('UPDATE User SET is_deleted = 1 WHERE id = ? AND user_type_id = 2');
                    $stmt->execute([$staffId]);
                    $deleted = $stmt->rowCount() > 0;
                } catch (PDOException $e2) {
                    http_response_code(500);
                    echo json_encode([
                        'error' => 'Database error: ' . $e2->getMessage(),
                        'debug' => [
                            'original_error' => $errorMessage,
                            'staff_id' => $staffId
                        ]
                    ]);
                    exit;
                }
            }

            if ($deleted) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Staff member has been deactivated and hidden from the list'
                ]);
            } else {
                http_response_code(404);
                echo json_encode([
                    'error' => 'Staff not found or already deactivated',
                    'staff_id' => $staffId
                ]);
            }
            break;

        case 'PATCH':
            // Restore archived staff member (set is_deleted = 0)
            $staffId = $_GET['id'] ?? $data['id'] ?? null;
            $action = $_GET['action'] ?? $data['action'] ?? 'restore';

            if (!$staffId || !is_numeric($staffId)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid staff ID']);
                exit;
            }

            if ($action === 'restore') {
                try {
                    $stmt = $pdo->prepare('UPDATE user SET is_deleted = 0 WHERE id = ? AND user_type_id = 2');
                    $stmt->execute([$staffId]);
                } catch (PDOException $e) {
                    try {
                        $stmt = $pdo->prepare('UPDATE User SET is_deleted = 0 WHERE id = ? AND user_type_id = 2');
                        $stmt->execute([$staffId]);
                    } catch (PDOException $e2) {
                        http_response_code(500);
                        echo json_encode(['error' => 'Database error: ' . $e2->getMessage()]);
                        exit;
                    }
                }

                if ($stmt->rowCount() > 0) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'Staff member restored successfully'
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Staff not found']);
                }
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid action']);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(["error" => "Invalid request method"]);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error occurred", "details" => $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Server error occurred", "details" => $e->getMessage()]);
}
?>