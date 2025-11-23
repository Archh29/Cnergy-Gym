<?php
// User Settings API - For updating current user's password and profile
header('Content-Type: application/json; charset=UTF-8');

// CORS headers
$allowedOrigins = [
    'https://www.cnergy.site',
    'https://cnergy.site',
    'http://localhost:3000',
    'http://localhost',
    'http://127.0.0.1:3000',
];

$origin = trim($_SERVER['HTTP_ORIGIN'] ?? '');
if (!empty($origin)) {
    if (in_array($origin, $allowedOrigins, true)) {
        $corsOrigin = $origin;
    } elseif (stripos($origin, 'localhost') !== false || stripos($origin, '127.0.0.1') !== false) {
        $corsOrigin = $origin;
    } elseif (stripos($origin, 'cnergy.site') !== false) {
        $corsOrigin = $origin;
    } else {
        $corsOrigin = 'https://www.cnergy.site';
    }
} else {
    $corsOrigin = 'https://www.cnergy.site';
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: $corsOrigin");
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(204);
    exit;
}

header("Access-Control-Allow-Origin: $corsOrigin");
header('Access-Control-Allow-Credentials: true');
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

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

    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);

    if ($method === 'GET') {
        // Get current user info
        $user_id = $_GET['user_id'] ?? null;
        
        if (!$user_id || !is_numeric($user_id)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "User ID is required"
            ]);
            exit;
        }

        $user_id = (int)$user_id;
        
        $stmt = $pdo->prepare("
            SELECT 
                id, fname, mname, lname, email, profile_photo_url, 
                account_status, user_type_id, gender_id, bday
            FROM `user` 
            WHERE id = ?
        ");
        $stmt->execute([$user_id]);
        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(404);
            echo json_encode([
                "success" => false,
                "error" => "User not found"
            ]);
            exit;
        }

        echo json_encode([
            "success" => true,
            "user" => $user
        ]);

    } elseif ($method === 'POST' && isset($_FILES['profile_photo'])) {
        // Handle profile photo upload
        $user_id = $_POST['user_id'] ?? null;
        
        if (!$user_id || !is_numeric($user_id)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "User ID is required"
            ]);
            exit;
        }

        $user_id = (int)$user_id;

        // Verify user exists
        $stmt = $pdo->prepare("SELECT id FROM `user` WHERE id = ?");
        $stmt->execute([$user_id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode([
                "success" => false,
                "error" => "User not found"
            ]);
            exit;
        }

        // Handle file upload
        if (isset($_FILES['profile_photo']) && $_FILES['profile_photo']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['profile_photo'];
            $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
            
            if (!in_array($fileExtension, $allowedExtensions)) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Invalid file type. Only JPG, PNG, or GIF allowed."
                ]);
                exit;
            }
            
            // Validate file size (max 5MB)
            if ($file['size'] > 5 * 1024 * 1024) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "File too large. Maximum size is 5MB."
                ]);
                exit;
            }
            
            // Create upload directory if it doesn't exist
            $uploadDir = 'uploads/profile/';
            if (!file_exists($uploadDir)) {
                if (!mkdir($uploadDir, 0755, true)) {
                    http_response_code(500);
                    echo json_encode([
                        "success" => false,
                        "error" => "Failed to create upload directory"
                    ]);
                    exit;
                }
            }
            
            // Generate unique filename
            $uniqueFilename = 'profile_' . $user_id . '_' . time() . '_' . uniqid() . '.' . $fileExtension;
            $uploadPath = $uploadDir . $uniqueFilename;
            
            // Move uploaded file
            if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
                // Update user's profile_photo_url
                $stmt = $pdo->prepare("UPDATE `user` SET profile_photo_url = ? WHERE id = ?");
                $stmt->execute([$uploadPath, $user_id]);
                
                echo json_encode([
                    "success" => true,
                    "message" => "Profile photo uploaded successfully",
                    "profile_photo_url" => $uploadPath
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "error" => "Failed to upload file"
                ]);
            }
        } else {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "No file uploaded or upload error"
            ]);
        }

    } elseif ($method === 'PUT') {
        // Update current user's profile/password
        $user_id = $input['user_id'] ?? null;
        
        if (!$user_id || !is_numeric($user_id)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "User ID is required"
            ]);
            exit;
        }

        $user_id = (int)$user_id;

        // Verify user exists
        $stmt = $pdo->prepare("SELECT id, password FROM `user` WHERE id = ?");
        $stmt->execute([$user_id]);
        $currentUser = $stmt->fetch();

        if (!$currentUser) {
            http_response_code(404);
            echo json_encode([
                "success" => false,
                "error" => "User not found"
            ]);
            exit;
        }

        // If changing password, verify current password
        if (!empty($input['new_password'])) {
            $current_password = $input['current_password'] ?? '';
            
            if (empty($current_password)) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Current password is required to change password"
                ]);
                exit;
            }

            // Verify current password
            if (!password_verify($current_password, $currentUser['password'])) {
                http_response_code(401);
                echo json_encode([
                    "success" => false,
                    "error" => "Current password is incorrect"
                ]);
                exit;
            }

            // Validate new password
            $new_password = $input['new_password'];
            if (strlen($new_password) < 8) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Password must be at least 8 characters long"
                ]);
                exit;
            }

            if (!preg_match('/[A-Z]/', $new_password)) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Password must contain at least one uppercase letter"
                ]);
                exit;
            }

            if (!preg_match('/[0-9]/', $new_password)) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Password must contain at least one number"
                ]);
                exit;
            }

            if (!preg_match('/[^A-Za-z0-9]/', $new_password)) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Password must contain at least one special character"
                ]);
                exit;
            }

            // Update password
            $hashedPassword = password_hash($new_password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE `user` SET password = ? WHERE id = ?");
            $stmt->execute([$hashedPassword, $user_id]);
        }

        // Update profile fields
        $updateFields = [];
        $updateValues = [];

        if (isset($input['fname'])) {
            $updateFields[] = "fname = ?";
            $updateValues[] = trim($input['fname']);
        }

        if (isset($input['mname'])) {
            $updateFields[] = "mname = ?";
            $updateValues[] = trim($input['mname']);
        }

        if (isset($input['lname'])) {
            $updateFields[] = "lname = ?";
            $updateValues[] = trim($input['lname']);
        }

        if (isset($input['email'])) {
            // Check if email already exists (excluding current user)
            $emailCheck = $pdo->prepare("SELECT id FROM `user` WHERE email = ? AND id != ?");
            $emailCheck->execute([trim($input['email']), $user_id]);
            if ($emailCheck->fetch()) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Email already exists"
                ]);
                exit;
            }
            $updateFields[] = "email = ?";
            $updateValues[] = trim($input['email']);
        }

        if (isset($input['profile_photo_url'])) {
            $updateFields[] = "profile_photo_url = ?";
            $updateValues[] = trim($input['profile_photo_url']);
        }

        if (isset($input['bday'])) {
            $updateFields[] = "bday = ?";
            $updateValues[] = $input['bday'];
        }

        if (isset($input['gender_id'])) {
            $updateFields[] = "gender_id = ?";
            $updateValues[] = (int)$input['gender_id'];
        }

        // Execute update if there are fields to update
        if (!empty($updateFields)) {
            $updateValues[] = $user_id;
            $sql = "UPDATE `user` SET " . implode(", ", $updateFields) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($updateValues);
        }

        // Get updated user info
        $stmt = $pdo->prepare("
            SELECT 
                id, fname, mname, lname, email, profile_photo_url, 
                account_status, user_type_id, gender_id, bday
            FROM `user` 
            WHERE id = ?
        ");
        $stmt->execute([$user_id]);
        $updatedUser = $stmt->fetch();

        echo json_encode([
            "success" => true,
            "message" => "Profile updated successfully",
            "user" => $updatedUser
        ]);

    } else {
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "error" => "Method not allowed"
        ]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database error: " . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Error: " . $e->getMessage()
    ]);
}
?>

