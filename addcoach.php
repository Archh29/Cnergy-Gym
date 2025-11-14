<?php
// Database configuration
$host = "localhost";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    error_log('Add Coach Database connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
    exit();
}

session_start();
require 'activity_logger.php';

// Helper function to get staff_id from multiple sources
function getStaffIdFromRequest($data = null) {
    // First, try from request data
    if ($data && isset($data['staff_id']) && !empty($data['staff_id'])) {
        return $data['staff_id'];
    }
    
    // Second, try from session
    if (isset($_SESSION['user_id']) && !empty($_SESSION['user_id'])) {
        return $_SESSION['user_id'];
    }
    
    // Third, try from GET parameters
    if (isset($_GET['staff_id']) && !empty($_GET['staff_id'])) {
        return $_GET['staff_id'];
    }
    
    // Fourth, try from POST parameters
    if (isset($_POST['staff_id']) && !empty($_POST['staff_id'])) {
        return $_POST['staff_id'];
    }
    
    // Last resort: return null (will be logged as system)
    return null;
}

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

// Log activity
function logActivity($pdo, $activity, $details) {
    try {
        $stmt = $pdo->prepare("INSERT INTO activity_log (activity, timestamp) VALUES (?, NOW())");
        $stmt->execute([$activity . ': ' . $details]);
    } catch (PDOException $e) {
        // Silent fail
    }
}

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['log'])) {
                $stmt = $pdo->query("SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 10");
                echo json_encode(["logs" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
                exit;
            }
            
            if (isset($_GET['stats'])) {
                // Get comprehensive coach statistics
                $stats = [];
                
                // Total coaches
                $stmt = $pdo->query("SELECT COUNT(*) FROM user WHERE user_type_id = 3");
                $stats['totalCoaches'] = $stmt->fetchColumn();
                
                // Available coaches
                $stmt = $pdo->query("
                    SELECT COUNT(*) FROM user u 
                    LEFT JOIN coaches c ON u.id = c.user_id 
                    WHERE u.user_type_id = 3 AND c.is_available = 1
                ");
                $stats['availableCoaches'] = $stmt->fetchColumn();
                
                // Average rating
                $stmt = $pdo->query("
                    SELECT AVG(c.rating) FROM user u 
                    LEFT JOIN coaches c ON u.id = c.user_id 
                    WHERE u.user_type_id = 3 AND c.rating > 0
                ");
                $stats['averageRating'] = round($stmt->fetchColumn() ?: 0, 1);
                
                // Average per session rate
                $stmt = $pdo->query("
                    SELECT AVG(c.per_session_rate) FROM user u 
                    LEFT JOIN coaches c ON u.id = c.user_id 
                    WHERE u.user_type_id = 3 AND c.per_session_rate > 0
                ");
                $stats['averagePerSessionRate'] = round($stmt->fetchColumn() ?: 0, 0);
                
                // Total clients across all coaches
                $stmt = $pdo->query("
                    SELECT SUM(c.total_clients) FROM user u 
                    LEFT JOIN coaches c ON u.id = c.user_id 
                    WHERE u.user_type_id = 3
                ");
                $stats['totalClients'] = $stmt->fetchColumn() ?: 0;
                
                // Coaches by specialty
                $stmt = $pdo->query("
                    SELECT c.specialty, COUNT(*) as count 
                    FROM user u 
                    LEFT JOIN coaches c ON u.id = c.user_id 
                    WHERE u.user_type_id = 3 AND c.specialty IS NOT NULL
                    GROUP BY c.specialty 
                    ORDER BY count DESC
                ");
                $stats['specialtyDistribution'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Recent activity logs with filtering
                $filter = $_GET['filter'] ?? 'all';
                $whereClause = "WHERE activity LIKE '%Coach%'";
                
                switch ($filter) {
                    case 'today':
                        $whereClause .= " AND DATE(timestamp) = CURDATE()";
                        break;
                    case 'week':
                        $whereClause .= " AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
                        break;
                    case 'month':
                        $whereClause .= " AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
                        break;
                    case 'year':
                        $whereClause .= " AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
                        break;
                }
                
                $stmt = $pdo->query("
                    SELECT activity, timestamp 
                    FROM activity_log 
                    $whereClause
                    ORDER BY timestamp DESC 
                    LIMIT 50
                ");
                $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Make activity messages more user-friendly
                $userFriendlyActivities = array_map(function($activity) {
                    $message = $activity['activity'];
                    
                    // Remove database IDs and make messages user-friendly
                    $message = preg_replace('/\bID:\s*\d+\b/', '', $message);
                    $message = preg_replace('/\bwith ID:\s*\d+\b/', '', $message);
                    $message = preg_replace('/\bdeleted with ID:\s*\d+\b/', 'removed from system', $message);
                    $message = preg_replace('/\bCoach deleted with ID:\s*\d+\b/', 'Coach removed from system', $message);
                    $message = preg_replace('/\bCoach updated:\s*\d+\b/', 'Coach profile updated', $message);
                    $message = preg_replace('/\bAdd Coach:\s*New coach\s+([^(]+)\s*\(([^)]+)\)\s*registered/', 'New coach $1 ($2) joined the team', $message);
                    $message = preg_replace('/\bUpdate Coach:\s*Coach profile updated/', 'Coach profile updated', $message);
                    $message = preg_replace('/\bDelete Coach:\s*Coach removed from system/', 'Coach removed from system', $message);
                    
                    // Clean up extra spaces
                    $message = preg_replace('/\s+/', ' ', trim($message));
                    
                    return [
                        'activity' => $message,
                        'timestamp' => $activity['timestamp']
                    ];
                }, $activities);
                
                $stats['recentActivities'] = $userFriendlyActivities;
                
                echo json_encode(["stats" => $stats]);
                exit;
            }
            
            if (isset($_GET['id'])) {
                // Get single coach with joined data from User and Coaches tables
                $stmt = $pdo->prepare("
                    SELECT 
                        u.id, u.fname, u.mname, u.lname, u.email, u.gender_id, u.bday, u.user_type_id, u.account_status,
                        c.id as coach_id, c.bio, c.specialty, c.experience, c.rating, c.total_clients, 
                        c.image_url, c.per_session_rate, c.session_package_rate as package_rate, c.session_package_count as package_sessions, c.monthly_rate,
                        c.certifications, c.is_available, c.created_at
                    FROM user u
                    LEFT JOIN coaches c ON u.id = c.user_id
                    WHERE u.id = ? AND u.user_type_id = 3
                ");
                $stmt->execute([$_GET['id']]);
                $coach = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($coach) {
                    // Parse JSON certifications if exists
                    if ($coach['certifications']) {
                        $coach['certifications'] = json_decode($coach['certifications'], true) ?: $coach['certifications'];
                    }
                }
                
                echo json_encode($coach ?: []);
            } else {
                // Get all coaches with joined data from User and Coaches tables
                $stmt = $pdo->prepare("
                    SELECT 
                        u.id, u.fname, u.mname, u.lname, u.email, u.gender_id, u.bday, u.user_type_id, u.account_status,
                        c.id as coach_id, c.bio, c.specialty, c.experience, c.rating, c.total_clients, 
                        c.image_url, c.per_session_rate, c.session_package_rate as package_rate, c.session_package_count as package_sessions, c.monthly_rate,
                        c.certifications, c.is_available, c.created_at
                    FROM user u
                    LEFT JOIN coaches c ON u.id = c.user_id
                    WHERE u.user_type_id = 3
                    ORDER BY u.id DESC
                ");
                $stmt->execute();
                $coaches = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Process certifications for each coach
                foreach ($coaches as &$coach) {
                    if ($coach['certifications']) {
                        $decodedCerts = json_decode($coach['certifications'], true);
                        if (json_last_error() === JSON_ERROR_NONE) {
                            $coach['certifications'] = $decodedCerts;
                        }
                    }
                    
                    // Ensure numeric fields are properly typed
                    $coach['rating'] = (float)$coach['rating'];
                    $coach['per_session_rate'] = (float)$coach['per_session_rate'];
                    $coach['package_rate'] = $coach['package_rate'] ? (float)$coach['package_rate'] : null;
                    $coach['package_sessions'] = $coach['package_sessions'] ? (int)$coach['package_sessions'] : null;
                    $coach['monthly_rate'] = $coach['monthly_rate'] ? (float)$coach['monthly_rate'] : null;
                    $coach['total_clients'] = (int)$coach['total_clients'];
                    // Handle is_available: NULL or missing should default to true (available)
                    // MySQL TINYINT(1) returns as string "0" or "1", or NULL
                    if ($coach['is_available'] === null || $coach['is_available'] === '') {
                        $coach['is_available'] = true;
                    } else {
                        // Convert string "0"/"1" or int 0/1 to boolean
                        $coach['is_available'] = (bool)(int)$coach['is_available'];
                    }
                }
                
                echo json_encode(["coaches" => $coaches]);
            }
            break;

        case 'POST':
            // Validate required User table fields
            if (!isset($data['fname'], $data['mname'], $data['lname'], $data['email'], $data['password'], $data['gender_id'], $data['bday'])) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required user fields"]);
                exit;
            }
            
            // Validate required Coach table fields
            if (!isset($data['specialty'], $data['experience'], $data['per_session_rate'])) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required coach fields (specialty, experience, per_session_rate)"]);
                exit;
            }

            $pdo->beginTransaction();

            // CRITICAL: Check if email already exists across ALL user types
            $stmt = $pdo->prepare("SELECT id, user_type_id FROM user WHERE email = ?");
            $stmt->execute([$data['email']]);
            $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingUser) {
                $userTypes = [1 => 'Admin', 2 => 'Staff', 3 => 'Coach', 4 => 'Member'];
                $existingUserType = $userTypes[$existingUser['user_type_id']] ?? 'Unknown';
                http_response_code(400);
                echo json_encode([
                    "error" => "Email already exists",
                    "message" => "Email '{$data['email']}' is already registered as a {$existingUserType}. Please use a different email address."
                ]);
                $pdo->rollBack();
                exit;
            }

            // Insert into User table
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("
                INSERT INTO user (user_type_id, fname, mname, lname, email, password, gender_id, bday, failed_attempt, account_status)
                VALUES (3, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            ");
            $stmt->execute([
                $data['fname'],
                $data['mname'],
                $data['lname'],
                $data['email'],
                $hashedPassword,
                $data['gender_id'],
                $data['bday'],
                $data['account_status'] ?? 'approved'
            ]);

            $userId = $pdo->lastInsertId();

            // Prepare coach data with defaults
            $bio = $data['bio'] ?? '';
            
            // Handle specialty - support multiple specialties
            $specialty = null;
            if (isset($data['specialty']) && !empty(trim($data['specialty']))) {
                if (is_array($data['specialty'])) {
                    // If it's already an array, filter out empty values and join
                    $specialtyArray = array_filter(array_map('trim', $data['specialty']));
                    $specialty = !empty($specialtyArray) ? implode(', ', $specialtyArray) : null;
                } else {
                    // If it's a string, split by common delimiters and clean up
                    $specialtyArray = preg_split('/[,;\n\r]+/', trim($data['specialty']));
                    $specialtyArray = array_map('trim', $specialtyArray);
                    $specialtyArray = array_filter($specialtyArray); // Remove empty elements
                    $specialty = !empty($specialtyArray) ? implode(', ', $specialtyArray) : null;
                }
            }
            
            $experience = $data['experience'];
            $rating = 0.0; // Default rating for new coaches
            $totalClients = 0; // Default client count
            $imageUrl = $data['image_url'] ?? '';
            $perSessionRate = (float)$data['per_session_rate'];
            $packageRate = isset($data['package_rate']) && $data['package_rate'] !== '' ? (float)$data['package_rate'] : null;
            $packageSessions = isset($data['package_sessions']) && $data['package_sessions'] !== '' ? (int)$data['package_sessions'] : null;
            $monthlyRate = isset($data['monthly_rate']) && $data['monthly_rate'] !== '' ? (float)$data['monthly_rate'] : null;
            $isAvailable = isset($data['is_available']) ? (bool)$data['is_available'] : true;
            
            // Handle certifications - convert to JSON if it's a string, null if empty
            $certifications = null;
            if (isset($data['certifications']) && !empty(trim($data['certifications']))) {
                if (is_array($data['certifications'])) {
                    $certifications = json_encode($data['certifications']);
                } else {
                    // If it's a string, try to split by common delimiters and create JSON array
                    $certArray = preg_split('/[,;\n\r]+/', trim($data['certifications']));
                    $certArray = array_map('trim', $certArray);
                    $certArray = array_filter($certArray); // Remove empty elements
                    if (!empty($certArray)) {
                        $certifications = json_encode($certArray);
                    }
                }
            }

            // Insert into Coaches table with all fields
            $stmtCoach = $pdo->prepare("
                INSERT INTO coaches (user_id, bio, specialty, experience, rating, total_clients, image_url, per_session_rate, session_package_rate, session_package_count, monthly_rate, certifications, is_available)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtCoach->execute([
                $userId,
                $bio,
                $specialty,
                $experience,
                $rating,
                $totalClients,
                $imageUrl,
                $perSessionRate, // per_session_rate
                $packageRate,    // session_package_rate
                $packageSessions,
                $monthlyRate,
                $certifications,
                $isAvailable
            ]);

            $pdo->commit();
            
            // Log activity using centralized logger (after user is created)
            $staffId = getStaffIdFromRequest($data);
            logStaffActivity($pdo, $staffId, "Add Coach", "New coach {$data['fname']} {$data['lname']} ({$data['specialty']}) joined the team", "Coach Management", [
                'coach_id' => $userId,
                'coach_name' => $data['fname'] . ' ' . $data['lname'],
                'coach_email' => $data['email'],
                'specialty' => $data['specialty'],
                'experience' => $data['experience'],
                'per_session_rate' => $data['per_session_rate']
            ]);
            
            http_response_code(201);
            echo json_encode(["success" => true, "id" => $userId, "coach_id" => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            if (!isset($data['id'], $data['fname'], $data['mname'], $data['lname'], $data['email'], $data['gender_id'], $data['bday'], $data['user_type_id'])) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required user fields"]);
                exit;
            }

        // Log activity using centralized logger
            $staffId = getStaffIdFromRequest($data);
            logStaffActivity($pdo, $staffId, "Update Coach", "Coach profile updated: {$data['fname']} {$data['lname']}", "Coach Management");

            $pdo->beginTransaction();

            // CRITICAL: Check if email already exists across ALL user types (excluding current user)
            $stmt = $pdo->prepare("SELECT id, user_type_id FROM user WHERE email = ? AND id != ?");
            $stmt->execute([$data['email'], $data['id']]);
            $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingUser) {
                $userTypes = [1 => 'Admin', 2 => 'Staff', 3 => 'Coach', 4 => 'Member'];
                $existingUserType = $userTypes[$existingUser['user_type_id']] ?? 'Unknown';
                http_response_code(400);
                echo json_encode([
                    "error" => "Email already exists",
                    "message" => "Email '{$data['email']}' is already registered as a {$existingUserType}. Please use a different email address."
                ]);
                $pdo->rollBack();
                exit;
            }

            // Update User table
            $userQuery = 'UPDATE user SET fname = ?, mname = ?, lname = ?, email = ?, gender_id = ?, bday = ?, account_status = ? WHERE id = ? AND user_type_id = 3';
            $userParams = [$data['fname'], $data['mname'], $data['lname'], $data['email'], $data['gender_id'], $data['bday'], $data['account_status'] ?? 'approved', $data['id']];

            // Handle password update if provided
            if (!empty($data['password'])) {
                $userQuery = 'UPDATE user SET fname = ?, mname = ?, lname = ?, email = ?, gender_id = ?, bday = ?, password = ?, account_status = ? WHERE id = ? AND user_type_id = 3';
                $userParams = [$data['fname'], $data['mname'], $data['lname'], $data['email'], $data['gender_id'], $data['bday'], password_hash($data['password'], PASSWORD_DEFAULT), $data['account_status'] ?? 'approved', $data['id']];
            }

            $stmt = $pdo->prepare($userQuery);
            $stmt->execute($userParams);

            // Update Coaches table if coach-specific data is provided
            if (isset($data['specialty']) || isset($data['experience']) || isset($data['per_session_rate']) || 
                isset($data['bio']) || isset($data['image_url']) || isset($data['certifications']) || 
                isset($data['is_available']) || isset($data['monthly_rate']) || isset($data['package_rate']) || 
                isset($data['package_sessions'])) {
                
                // Check if coach record exists
                $checkStmt = $pdo->prepare("SELECT id FROM coaches WHERE user_id = ?");
                $checkStmt->execute([$data['id']]);
                
                if ($checkStmt->fetchColumn()) {
                    // Update existing coach record
                    $coachFields = [];
                    $coachParams = [];
                    
                    if (isset($data['bio'])) {
                        $coachFields[] = 'bio = ?';
                        $coachParams[] = $data['bio'];
                    }
                    
                    if (isset($data['specialty'])) {
                        // Handle specialty - support multiple specialties
                        $specialty = null;
                        if (!empty(trim($data['specialty']))) {
                            if (is_array($data['specialty'])) {
                                // If it's already an array, filter out empty values and join
                                $specialtyArray = array_filter(array_map('trim', $data['specialty']));
                                $specialty = !empty($specialtyArray) ? implode(', ', $specialtyArray) : null;
                            } else {
                                // If it's a string, split by common delimiters and clean up
                                $specialtyArray = preg_split('/[,;\n\r]+/', trim($data['specialty']));
                                $specialtyArray = array_map('trim', $specialtyArray);
                                $specialtyArray = array_filter($specialtyArray); // Remove empty elements
                                $specialty = !empty($specialtyArray) ? implode(', ', $specialtyArray) : null;
                            }
                        }
                        $coachFields[] = 'specialty = ?';
                        $coachParams[] = $specialty;
                    }
                    
                    if (isset($data['experience'])) {
                        $coachFields[] = 'experience = ?';
                        $coachParams[] = $data['experience'];
                    }
                    
                    if (isset($data['per_session_rate'])) {
                        $coachFields[] = 'per_session_rate = ?';
                        $coachParams[] = (float)$data['per_session_rate'];
                    }
                    
                    if (isset($data['package_rate'])) {
                        $coachFields[] = 'session_package_rate = ?';
                        $coachParams[] = $data['package_rate'] !== '' ? (float)$data['package_rate'] : null;
                    }
                    
                    if (isset($data['package_sessions'])) {
                        $coachFields[] = 'session_package_count = ?';
                        $coachParams[] = $data['package_sessions'] !== '' ? (int)$data['package_sessions'] : null;
                    }
                    
                    if (isset($data['monthly_rate'])) {
                        $coachFields[] = 'monthly_rate = ?';
                        $coachParams[] = $data['monthly_rate'] !== '' ? (float)$data['monthly_rate'] : null;
                    }
                    
                    if (isset($data['image_url'])) {
                        $coachFields[] = 'image_url = ?';
                        $coachParams[] = $data['image_url'];
                    }
                    
                    if (isset($data['certifications'])) {
                        $certifications = null;
                        if (!empty(trim($data['certifications']))) {
                            if (is_array($data['certifications'])) {
                                $certifications = json_encode($data['certifications']);
                            } else {
                                $certArray = preg_split('/[,;\n\r]+/', trim($data['certifications']));
                                $certArray = array_map('trim', $certArray);
                                $certArray = array_filter($certArray);
                                if (!empty($certArray)) {
                                    $certifications = json_encode($certArray);
                                }
                            }
                        }
                        $coachFields[] = 'certifications = ?';
                        $coachParams[] = $certifications;
                    }
                    
                    if (isset($data['is_available'])) {
                        $coachFields[] = 'is_available = ?';
                        $coachParams[] = (bool)$data['is_available'];
                    }
                    
                    if (!empty($coachFields)) {
                        $coachParams[] = $data['id']; // Add user_id for WHERE clause
                        $coachQuery = 'UPDATE coaches SET ' . implode(', ', $coachFields) . ' WHERE user_id = ?';
                        $coachStmt = $pdo->prepare($coachQuery);
                        $coachStmt->execute($coachParams);
                    }
                } else {
                    // Create new coach record if it doesn't exist
                    $bio = $data['bio'] ?? '';
                    
                    // Handle specialty - support multiple specialties
                    $specialty = null;
                    if (isset($data['specialty']) && !empty(trim($data['specialty']))) {
                        if (is_array($data['specialty'])) {
                            // If it's already an array, filter out empty values and join
                            $specialtyArray = array_filter(array_map('trim', $data['specialty']));
                            $specialty = !empty($specialtyArray) ? implode(', ', $specialtyArray) : null;
                        } else {
                            // If it's a string, split by common delimiters and clean up
                            $specialtyArray = preg_split('/[,;\n\r]+/', trim($data['specialty']));
                            $specialtyArray = array_map('trim', $specialtyArray);
                            $specialtyArray = array_filter($specialtyArray); // Remove empty elements
                            $specialty = !empty($specialtyArray) ? implode(', ', $specialtyArray) : null;
                        }
                    }
                    
                    $experience = $data['experience'] ?? 'Not specified';
                    $perSessionRate = isset($data['per_session_rate']) ? (float)$data['per_session_rate'] : 0.0;
                    $packageRate = isset($data['package_rate']) && $data['package_rate'] !== '' ? (float)$data['package_rate'] : null;
                    $packageSessions = isset($data['package_sessions']) && $data['package_sessions'] !== '' ? (int)$data['package_sessions'] : null;
                    $monthlyRate = isset($data['monthly_rate']) && $data['monthly_rate'] !== '' ? (float)$data['monthly_rate'] : null;
                    $imageUrl = $data['image_url'] ?? '';
                    $isAvailable = isset($data['is_available']) ? (bool)$data['is_available'] : true;
                    
                    $certifications = null;
                    if (isset($data['certifications']) && !empty(trim($data['certifications']))) {
                        if (is_array($data['certifications'])) {
                            $certifications = json_encode($data['certifications']);
                        } else {
                            $certArray = preg_split('/[,;\n\r]+/', trim($data['certifications']));
                            $certArray = array_map('trim', $certArray);
                            $certArray = array_filter($certArray);
                            if (!empty($certArray)) {
                                $certifications = json_encode($certArray);
                            }
                        }
                    }
                    
                    $insertCoachStmt = $pdo->prepare("
                        INSERT INTO coaches (user_id, bio, specialty, experience, rating, total_clients, image_url, per_session_rate, session_package_rate, session_package_count, monthly_rate, certifications, is_available)
                        VALUES (?, ?, ?, ?, 0.0, 0, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $insertCoachStmt->execute([
                        $data['id'],
                        $bio,
                        $specialty,
                        $experience,
                        $imageUrl,
                        $perSessionRate, // per_session_rate
                        $packageRate,    // session_package_rate
                        $packageSessions,
                        $monthlyRate,
                        $certifications,
                        $isAvailable
                    ]);
                }
            }

            $pdo->commit();
            echo json_encode(["success" => true]);
            break;

        case 'DELETE':
            if (!isset($data['id']) || !is_numeric($data['id'])) {
                http_response_code(400);
                echo json_encode(["error" => "Invalid ID"]);
                exit;
            }

            // Log activity using centralized logger
            // Get coach details before deletion for logging
            $coachStmt = $pdo->prepare("SELECT fname, lname, email FROM user WHERE id = ?");
            $coachStmt->execute([$data['id']]);
            $coach = $coachStmt->fetch();
            $coachName = $coach ? $coach['fname'] . ' ' . $coach['lname'] : 'Unknown Coach';
            
            $staffId = getStaffIdFromRequest($data);
            logStaffActivity($pdo, $staffId, "Delete Coach", "Coach removed from system: {$coachName}", "Coach Management");

            $pdo->beginTransaction();

            try {
                // Disable foreign key checks temporarily
                $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
                
                // Delete all related records first (in correct order to avoid foreign key constraints)
                
                // 1. Delete coach assignments
                $deleteAssignments = $pdo->prepare("DELETE FROM coach_member_list WHERE coach_id = ?");
                $deleteAssignments->execute([$data['id']]);
                
                // 2. Delete notifications
                $deleteNotifications = $pdo->prepare("DELETE FROM notification WHERE user_id = ?");
                $deleteNotifications->execute([$data['id']]);
                
                // 3. Delete from member_programhdr table (the one causing the error)
                try {
                    $deletePrograms = $pdo->prepare("DELETE FROM member_programhdr WHERE created_by = ?");
                    $deletePrograms->execute([$data['id']]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete from member_programhdr: " . $e->getMessage());
                }
                
                // 4. Delete from Coaches table
                $stmt = $pdo->prepare("DELETE FROM coaches WHERE user_id = ?");
                $stmt->execute([$data['id']]);

                // 5. Finally delete from User table
                $stmt = $pdo->prepare("DELETE FROM user WHERE id = ? AND user_type_id = 3");
                $stmt->execute([$data['id']]);

                // Re-enable foreign key checks
                $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
                
                $pdo->commit();
                echo json_encode([
                    "success" => true, 
                    "message" => "Coach and all related data deleted successfully"
                ]);
                
            } catch (PDOException $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode([
                    "error" => "Database error: " . $e->getMessage(),
                    "message" => "Failed to delete coach. This coach may have related data that needs to be handled first."
                ]);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(["error" => "Invalid request method"]);
            break;
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
?>