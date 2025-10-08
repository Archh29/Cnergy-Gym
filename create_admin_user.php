<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS headers - allow specific origins
$allowed_origins = [
    'https://www.cnergy.site',
    'https://cnergy.site',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Database connection using PDO (same as existing codebase)
$host = "localhost";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
    exit;
}

try {
    // Check if user already exists (note: table name is lowercase 'user')
    $stmt = $pdo->prepare("SELECT id, account_status FROM user WHERE email = ?");
    $stmt->execute(["admin@gmail.com"]);
    $existingUser = $stmt->fetch();
    
    if ($existingUser) {
        // User exists, check if we need to update account status
        if ($existingUser['account_status'] === 'pending') {
            // Update account status to approved
            $stmt = $pdo->prepare("UPDATE user SET account_status = 'approved' WHERE id = ?");
            $stmt->execute([$existingUser['id']]);
            
            echo json_encode([
                "success" => true,
                "message" => "Admin user already exists and has been approved!",
                "user_id" => $existingUser['id'],
                "email" => "admin@gmail.com",
                "action" => "updated_status"
            ]);
        } else {
            echo json_encode([
                "success" => true,
                "message" => "Admin user already exists and is approved!",
                "user_id" => $existingUser['id'],
                "email" => "admin@gmail.com",
                "account_status" => $existingUser['account_status'],
                "action" => "already_exists"
            ]);
        }
        exit;
    }
    
    // Verify that user_type_id and gender_id exist (note: table names are lowercase)
    $stmt = $pdo->prepare("SELECT id FROM usertype WHERE id = ?");
    $stmt->execute([1]);
    if (!$stmt->fetch()) {
        throw new Exception("UserType with ID 1 does not exist");
    }
    
    $stmt = $pdo->prepare("SELECT id FROM gender WHERE id = ?");
    $stmt->execute([1]);
    if (!$stmt->fetch()) {
        throw new Exception("Gender with ID 1 does not exist");
    }
    
    // Prepare user data
    $fname = "Francis Baron";
    $mname = "Bongado";
    $lname = "Uyguangco";
    $email = "admin@gmail.com";
    $hashedPassword = password_hash("Gwapoko385@", PASSWORD_BCRYPT);
    $user_type_id = 1;
    $gender_id = 1;
    $bday = "2002-08-29";
    $created_at = date("Y-m-d H:i:s");
    
    // Insert into user table using PDO (note: table name is lowercase 'user')
    $sql = "INSERT INTO user (user_type_id, gender_id, email, password, failed_attempt, last_attempt, fname, mname, lname, bday, created_at, account_status) 
            VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, ?, 'approved')";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $user_type_id, 
        $gender_id, 
        $email, 
        $hashedPassword, 
        $fname, 
        $mname, 
        $lname, 
        $bday, 
        $created_at
    ]);
    
    $userId = $pdo->lastInsertId();
    
    echo json_encode([
        "success" => true,
        "message" => "Admin user created successfully!",
        "user_id" => $userId,
        "email" => $email,
        "name" => "$fname $mname $lname",
        "action" => "created"
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database error: " . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ]);
}
?>
