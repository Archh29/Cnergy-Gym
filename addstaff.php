<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
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
    switch ($method) {
        case 'GET':
            // Fetch all staff users
            if (isset($_GET['id'])) {
                // Fetch a specific staff member by ID
                try {
                    $stmt = $pdo->prepare("SELECT * FROM user WHERE id = ? AND user_type_id = 2");
                    $stmt->execute([$_GET['id']]);
                    $staff = $stmt->fetch(PDO::FETCH_ASSOC);

                    if ($staff) {
                        $staff['user_type'] = 'Staff';
                        $staff['gender'] = $staff['gender_id'] == 1 ? 'Male' : 'Female';
                    }
                } catch (PDOException $e) {
                    $stmt = $pdo->prepare("SELECT * FROM User WHERE id = ? AND user_type_id = 2");
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
                    // First, let's try a simple query to get staff users
                    $stmt = $pdo->prepare("SELECT * FROM user WHERE user_type_id = 2");
                    $stmt->execute();
                    $staffs = $stmt->fetchAll(PDO::FETCH_ASSOC);

                    // Add default values for missing fields
                    foreach ($staffs as &$staff) {
                        $staff['user_type'] = 'Staff';
                        $staff['gender'] = $staff['gender_id'] == 1 ? 'Male' : 'Female';
                    }

                } catch (PDOException $e) {
                    // If that fails, try with 'User' table (uppercase)
                    $stmt = $pdo->prepare("SELECT * FROM User WHERE user_type_id = 2");
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

        case 'POST':
            // Create a new staff member
            if (!isset($data['email'], $data['password'], $data['gender_id'], $data['fname'], $data['lname'], $data['bday'])) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required user fields"]);
                exit;
            }

            // Always set user_type_id to 2 (Staff)
            $data['user_type_id'] = 2;

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
                $data['fname'],
                $data['mname'] ?? null,
                $data['lname'],
                $data['bday']
            ]);

            $id_user = $pdo->lastInsertId();
            echo json_encode(["success" => "Staff member created successfully", "id_user" => $id_user]);
            break;

        case 'PUT':
            // Update an existing staff member
            if (!isset($data['id'], $data['email'], $data['gender_id'], $data['fname'], $data['lname'], $data['bday'])) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required fields"]);
                exit;
            }

            // Always set user_type_id to 2 (Staff)
            $data['user_type_id'] = 2;

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
            if (!empty($data['password'])) {
                $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
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
                    $data['fname'],
                    $data['mname'] ?? null,
                    $data['lname'],
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
                    $data['fname'],
                    $data['mname'] ?? null,
                    $data['lname'],
                    $data['bday'],
                    $data['id']
                ]);
            }

            echo json_encode(["success" => "Staff member updated successfully"]);
            break;

        case 'DELETE':
            // Get ID from request
            $staffId = $_GET['id'] ?? $data['id'] ?? null;

            if (!$staffId || !is_numeric($staffId)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid staff ID']);
                exit;
            }

            // Simple delete
            try {
                $stmt = $pdo->prepare('DELETE FROM user WHERE id = ? AND user_type_id = 2');
                $stmt->execute([$staffId]);

                if ($stmt->rowCount() > 0) {
                    echo json_encode(['success' => true, 'message' => 'Staff deleted successfully']);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Staff not found']);
                }
            } catch (PDOException $e) {
                // Try uppercase table
                try {
                    $stmt = $pdo->prepare('DELETE FROM User WHERE id = ? AND user_type_id = 2');
                    $stmt->execute([$staffId]);

                    if ($stmt->rowCount() > 0) {
                        echo json_encode(['success' => true, 'message' => 'Staff deleted successfully']);
                    } else {
                        http_response_code(404);
                        echo json_encode(['error' => 'Staff not found']);
                    }
                } catch (PDOException $e2) {
                    http_response_code(500);
                    echo json_encode(['error' => 'Database error: ' . $e2->getMessage()]);
                }
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