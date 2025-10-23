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
            // Fetch all coaches
            if (isset($_GET['id'])) {
                // Fetch a specific coach by ID
                try {
                    $stmt = $pdo->prepare("SELECT c.*, u.email, u.password, u.user_type_id, u.gender_id, u.fname, u.mname, u.lname, u.bday, u.account_status FROM coaches c JOIN user u ON c.user_id = u.id WHERE c.id = ?");
                    $stmt->execute([$_GET['id']]);
                    $coach = $stmt->fetch(PDO::FETCH_ASSOC);

                    if ($coach) {
                        $coach['user_type'] = 'Coach';
                        $coach['gender'] = $coach['gender_id'] == 1 ? 'Male' : 'Female';
                    }
                } catch (PDOException $e) {
                    $stmt = $pdo->prepare("SELECT c.*, u.email, u.password, u.user_type_id, u.gender_id, u.fname, u.mname, u.lname, u.bday, u.account_status FROM Coaches c JOIN User u ON c.user_id = u.id WHERE c.id = ?");
                    $stmt->execute([$_GET['id']]);
                    $coach = $stmt->fetch(PDO::FETCH_ASSOC);

                    if ($coach) {
                        $coach['user_type'] = 'Coach';
                        $coach['gender'] = $coach['gender_id'] == 1 ? 'Male' : 'Female';
                    }
                }
                echo json_encode($coach ?: []);
            } else {
                // Fetch all coaches
                try {
                    $stmt = $pdo->prepare("SELECT c.*, u.email, u.password, u.user_type_id, u.gender_id, u.fname, u.mname, u.lname, u.bday, u.account_status FROM coaches c JOIN user u ON c.user_id = u.id");
                    $stmt->execute();
                    $coaches = $stmt->fetchAll(PDO::FETCH_ASSOC);

                    // Add default values for missing fields
                    foreach ($coaches as &$coach) {
                        $coach['user_type'] = 'Coach';
                        $coach['gender'] = $coach['gender_id'] == 1 ? 'Male' : 'Female';
                        $coach['bio'] = $coach['bio'] ?? '';
                        $coach['specialty'] = $coach['specialty'] ?? 'General Training';
                        $coach['experience'] = $coach['experience'] ?? 'Not specified';
                        $coach['rating'] = $coach['rating'] ?? 0.0;
                        $coach['total_clients'] = $coach['total_clients'] ?? 0;
                        $coach['per_session_rate'] = $coach['per_session_rate'] ?? 0.0;
                        $coach['monthly_rate'] = $coach['monthly_rate'] ?? 0.0;
                        $coach['certifications'] = $coach['certifications'] ?? '';
                        $coach['is_available'] = $coach['is_available'] ?? true;
                        $coach['image_url'] = $coach['image_url'] ?? '';
                        $coach['account_status'] = $coach['account_status'] ?? 'approved';
                    }

                } catch (PDOException $e) {
                    // If that fails, try with 'Coaches' and 'User' table (uppercase)
                    $stmt = $pdo->prepare("SELECT c.*, u.email, u.password, u.user_type_id, u.gender_id, u.fname, u.mname, u.lname, u.bday, u.account_status FROM Coaches c JOIN User u ON c.user_id = u.id");
                    $stmt->execute();
                    $coaches = $stmt->fetchAll(PDO::FETCH_ASSOC);

                    // Add default values for missing fields
                    foreach ($coaches as &$coach) {
                        $coach['user_type'] = 'Coach';
                        $coach['gender'] = $coach['gender_id'] == 1 ? 'Male' : 'Female';
                        $coach['bio'] = $coach['bio'] ?? '';
                        $coach['specialty'] = $coach['specialty'] ?? 'General Training';
                        $coach['experience'] = $coach['experience'] ?? 'Not specified';
                        $coach['rating'] = $coach['rating'] ?? 0.0;
                        $coach['total_clients'] = $coach['total_clients'] ?? 0;
                        $coach['per_session_rate'] = $coach['per_session_rate'] ?? 0.0;
                        $coach['monthly_rate'] = $coach['monthly_rate'] ?? 0.0;
                        $coach['certifications'] = $coach['certifications'] ?? '';
                        $coach['is_available'] = $coach['is_available'] ?? true;
                        $coach['image_url'] = $coach['image_url'] ?? '';
                        $coach['account_status'] = $coach['account_status'] ?? 'approved';
                    }
                }
                echo json_encode(["coaches" => $coaches ?: []]);
            }
            break;

        case 'POST':
            // Create a new coach
            if (!isset($data['email'], $data['password'], $data['gender_id'], $data['fname'], $data['lname'], $data['bday'])) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required user fields"]);
                exit;
            }

            // Always set user_type_id to 3 (Coach)
            $data['user_type_id'] = 3;

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

            $pdo->beginTransaction();

            try {
                // Insert into user table
                try {
                    $stmt = $pdo->prepare("INSERT INTO user (email, password, user_type_id, gender_id, fname, mname, lname, bday, account_status) 
                                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                } catch (PDOException $e) {
                    $stmt = $pdo->prepare("INSERT INTO User (email, password, user_type_id, gender_id, fname, mname, lname, bday, account_status) 
                                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
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
                    'approved'
                ]);

                $id_user = $pdo->lastInsertId();

                // Insert into coaches table
                try {
                    $stmt = $pdo->prepare("INSERT INTO coaches (user_id, bio, specialty, experience, rating, total_clients, per_session_rate, monthly_rate, certifications, is_available, image_url) 
                                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                } catch (PDOException $e) {
                    $stmt = $pdo->prepare("INSERT INTO Coaches (user_id, bio, specialty, experience, rating, total_clients, per_session_rate, monthly_rate, certifications, is_available, image_url) 
                                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                }
                $stmt->execute([
                    $id_user,
                    $data['bio'] ?? '',
                    $data['specialty'] ?? 'General Training',
                    $data['experience'] ?? 'Not specified',
                    $data['rating'] ?? 0.0,
                    $data['total_clients'] ?? 0,
                    $data['per_session_rate'] ?? 0.0,
                    $data['monthly_rate'] ?? 0.0,
                    $data['certifications'] ?? '',
                    $data['is_available'] ?? true,
                    $data['image_url'] ?? ''
                ]);

                $pdo->commit();
                echo json_encode(["success" => "Coach created successfully", "id_user" => $id_user]);

            } catch (PDOException $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'PUT':
            // Update an existing coach
            if (!isset($data['id'], $data['email'], $data['gender_id'], $data['fname'], $data['lname'], $data['bday'])) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required fields"]);
                exit;
            }

            // Always set user_type_id to 3 (Coach)
            $data['user_type_id'] = 3;

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

            $pdo->beginTransaction();

            try {
                // Update user table - handle password update if provided
                if (!empty($data['password'])) {
                    $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
                    try {
                        $stmt = $pdo->prepare("UPDATE user SET email = ?, password = ?, user_type_id = ?, gender_id = ?, fname = ?, mname = ?, lname = ?, bday = ?, account_status = ? WHERE id = ?");
                    } catch (PDOException $e) {
                        $stmt = $pdo->prepare("UPDATE User SET email = ?, password = ?, user_type_id = ?, gender_id = ?, fname = ?, mname = ?, lname = ?, bday = ?, account_status = ? WHERE id = ?");
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
                        $data['account_status'] ?? 'approved',
                        $data['id']
                    ]);
                } else {
                    try {
                        $stmt = $pdo->prepare("UPDATE user SET email = ?, user_type_id = ?, gender_id = ?, fname = ?, mname = ?, lname = ?, bday = ?, account_status = ? WHERE id = ?");
                    } catch (PDOException $e) {
                        $stmt = $pdo->prepare("UPDATE User SET email = ?, user_type_id = ?, gender_id = ?, fname = ?, mname = ?, lname = ?, bday = ?, account_status = ? WHERE id = ?");
                    }
                    $stmt->execute([
                        $data['email'],
                        $data['user_type_id'],
                        $data['gender_id'],
                        $data['fname'],
                        $data['mname'] ?? null,
                        $data['lname'],
                        $data['bday'],
                        $data['account_status'] ?? 'approved',
                        $data['id']
                    ]);
                }

                // Update coaches table
                try {
                    $stmt = $pdo->prepare("UPDATE coaches SET bio = ?, specialty = ?, experience = ?, rating = ?, total_clients = ?, per_session_rate = ?, monthly_rate = ?, certifications = ?, is_available = ?, image_url = ? WHERE user_id = ?");
                } catch (PDOException $e) {
                    $stmt = $pdo->prepare("UPDATE Coaches SET bio = ?, specialty = ?, experience = ?, rating = ?, total_clients = ?, per_session_rate = ?, monthly_rate = ?, certifications = ?, is_available = ?, image_url = ? WHERE user_id = ?");
                }
                $stmt->execute([
                    $data['bio'] ?? '',
                    $data['specialty'] ?? 'General Training',
                    $data['experience'] ?? 'Not specified',
                    $data['rating'] ?? 0.0,
                    $data['total_clients'] ?? 0,
                    $data['per_session_rate'] ?? 0.0,
                    $data['monthly_rate'] ?? 0.0,
                    $data['certifications'] ?? '',
                    $data['is_available'] ?? true,
                    $data['image_url'] ?? '',
                    $data['id']
                ]);

                $pdo->commit();
                echo json_encode(["success" => "Coach updated successfully"]);

            } catch (PDOException $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'DELETE':
            // Handle both URL parameter (?id=15) and JSON input
            $coachId = null;

            if (isset($_GET['id'])) {
                // URL parameter format: DELETE /addcoach.php?id=15
                $coachId = $_GET['id'];
            } else {
                // JSON input format
                if ($data && isset($data['id'])) {
                    $coachId = $data['id'];
                }
            }

            if (!$coachId || !is_numeric($coachId)) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Invalid or missing coach ID',
                    'debug' => [
                        'get_id' => $_GET['id'] ?? 'not set',
                        'json_id' => $data['id'] ?? 'not set',
                        'raw_input' => file_get_contents('php://input')
                    ]
                ]);
                exit;
            }

            // Get coach details for logging before deletion
            try {
                $stmt = $pdo->prepare('SELECT fname, lname FROM user WHERE id = ?');
                $stmt->execute([$coachId]);
            } catch (PDOException $e) {
                $stmt = $pdo->prepare('SELECT fname, lname FROM User WHERE id = ?');
                $stmt->execute([$coachId]);
            }
            $coach = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$coach) {
                http_response_code(404);
                echo json_encode(['error' => 'Coach not found']);
                exit;
            }

            $pdo->beginTransaction();

            try {
                // Disable foreign key checks temporarily
                $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');

                // Delete all related records first (in correct order to avoid foreign key constraints)
                // Use try-catch for each deletion to handle cases where tables don't exist

                // 1. Delete coach assignments first
                try {
                    $deleteAssignments = $pdo->prepare("DELETE FROM coach_member_list WHERE coach_id = ?");
                    $deleteAssignments->execute([$coachId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete coach assignments: " . $e->getMessage());
                }

                // 2. Delete from coaches table
                try {
                    $deleteCoach = $pdo->prepare("DELETE FROM coaches WHERE user_id = ?");
                    $deleteCoach->execute([$coachId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete from coaches table: " . $e->getMessage());
                }

                // 3. Delete from member_programhdr table (the one causing the error)
                try {
                    $deletePrograms = $pdo->prepare("DELETE FROM member_programhdr WHERE created_by = ?");
                    $deletePrograms->execute([$coachId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete from member_programhdr: " . $e->getMessage());
                }

                // 4. Finally delete from User table
                try {
                    $stmt = $pdo->prepare('DELETE FROM user WHERE id = ? AND user_type_id = 3');
                    $stmt->execute([$coachId]);
                } catch (PDOException $e) {
                    $stmt = $pdo->prepare('DELETE FROM User WHERE id = ? AND user_type_id = 3');
                    $stmt->execute([$coachId]);
                }

                // Re-enable foreign key checks
                $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

                $pdo->commit();

                // Log activity using dedicated logging file
                $logUrl = "https://api.cnergy.site/log_activity.php?action=Delete%20Coach&details=" . urlencode("Coach removed from system: {$coach['fname']} {$coach['lname']}");
                file_get_contents($logUrl);

                echo json_encode([
                    'success' => true,
                    'message' => 'Coach and all related data deleted successfully'
                ]);

            } catch (PDOException $e) {
                $pdo->rollBack();
                error_log('Coach deletion error: ' . $e->getMessage());
                error_log('Coach deletion error code: ' . $e->getCode());
                error_log('Coach deletion error info: ' . print_r($e->errorInfo, true));

                // Provide more specific error message based on error code
                $errorMessage = 'Failed to delete coach. ';
                if ($e->getCode() == 23000) {
                    $errorMessage .= 'This coach has related data that prevents deletion. All related records have been attempted to be removed.';
                } else {
                    $errorMessage .= 'Database error occurred during deletion.';
                }

                http_response_code(500);
                echo json_encode([
                    'error' => 'Database error: ' . $e->getMessage(),
                    'message' => $errorMessage,
                    'error_code' => $e->getCode()
                ]);
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