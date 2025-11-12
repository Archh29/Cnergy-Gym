<?php
// Dynamic CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = [
    'https://www.cnergy.site',
    'https://cnergy.site',
    'https://api.cnergy.site',
    'http://localhost:3000'
];

if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    // Fallback (no credentials with wildcard)
    header("Access-Control-Allow-Origin: https://www.cnergy.site");
}
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Database configuration
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
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// Ensure $input is always an array
if (!is_array($input)) {
    $input = [];
}

// Helper function to ensure is_archived column exists
function ensureArchivedColumn($pdo)
{
    try {
        $checkColumnStmt = $pdo->query("SHOW COLUMNS FROM `programs` LIKE 'is_archived'");
        $hasArchivedColumn = $checkColumnStmt->rowCount() > 0;

        if (!$hasArchivedColumn) {
            try {
                $pdo->exec("ALTER TABLE `programs` ADD COLUMN `is_archived` TINYINT(1) DEFAULT 0");
            } catch (PDOException $e) {
                // Column might already exist or there's a permission issue
                error_log("Warning: Could not add is_archived column: " . $e->getMessage());
            }
        }
        return true;
    } catch (Exception $e) {
        error_log("Error checking is_archived column: " . $e->getMessage());
        return false;
    }
}

try {
    switch ($method) {
        case 'GET':
            // Ensure is_archived column exists
            ensureArchivedColumn($pdo);

            // Get archived filter (0 = active, 1 = archived)
            $archived = isset($_GET['archived']) ? (int) $_GET['archived'] : 0;
            $staff_id = isset($_GET['staff_id']) ? (int) $_GET['staff_id'] : null;

            // Build query with archived filter
            $whereConditions = ["COALESCE(is_archived, 0) = ?"];
            $params = [$archived];

            // Add staff_id filter if provided (if created_by column exists)
            if ($staff_id !== null) {
                try {
                    $checkColumnStmt = $pdo->query("SHOW COLUMNS FROM `programs` LIKE 'created_by'");
                    if ($checkColumnStmt->rowCount() > 0) {
                        $whereConditions[] = "created_by = ?";
                        $params[] = $staff_id;
                    }
                } catch (Exception $e) {
                    // Column doesn't exist, skip staff_id filter
                }
            }

            $whereClause = "WHERE " . implode(" AND ", $whereConditions);

            // Get all programs with their exercises
            $stmt = $pdo->prepare("SELECT id, name, description, COALESCE(is_archived, 0) as is_archived FROM programs $whereClause ORDER BY name ASC");
            $stmt->execute($params);
            $programs = $stmt->fetchAll();

            // Get exercises and difficulty for each program
            foreach ($programs as &$program) {
                // Get difficulty from programhdr (check both admin and staff created)
                $stmt = $pdo->prepare("SELECT difficulty FROM programhdr WHERE program_id = ? ORDER BY created_by DESC LIMIT 1");
                $stmt->execute([$program['id']]);
                $programHdr = $stmt->fetch();
                $program['difficulty'] = $programHdr['difficulty'] ?? 'Beginner';
                $stmt = $pdo->prepare("
                    SELECT epw.details 
                    FROM explore_program_workout epw 
                    WHERE epw.program_id = ?
                ");
                $stmt->execute([$program['id']]);
                $workouts = $stmt->fetchAll();

                $exercises = [];
                foreach ($workouts as $workout) {
                    $details = json_decode($workout['details'], true);
                    if ($details && isset($details['exercise_id'])) {
                        $exercises[] = [
                            'exercise_id' => $details['exercise_id'],
                            'exercise_name' => $details['exercise_name'] ?? 'Unknown Exercise',
                            'weight' => $details['weight'] ?? null,
                            'reps' => $details['reps'] ?? null,
                            'sets' => $details['sets'] ?? null,
                            'repsPerSet' => isset($details['repsPerSet']) && is_array($details['repsPerSet']) ? $details['repsPerSet'] : [],
                            'color' => $details['color'] ?? '#3B82F6'
                        ];
                    }
                }
                $program['exercises'] = $exercises;
            }

            echo json_encode([
                'success' => true,
                'programs' => $programs
            ]);
            break;

        case 'POST':
            // Create new program with exercises
            if (!isset($input['name']) || empty(trim($input['name']))) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Program name is required'
                ]);
                break;
            }

            $name = trim($input['name']);
            $description = isset($input['description']) ? trim($input['description']) : null;
            $difficulty = isset($input['difficulty']) ? trim($input['difficulty']) : 'Beginner';
            $exercises = isset($input['exercises']) && is_array($input['exercises']) ? $input['exercises'] : [];

            // Validate exercises
            if (empty($exercises)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'At least one exercise is required'
                ]);
                break;
            }

            // Check if program name already exists (only check active programs, not archived ones)
            $stmt = $pdo->prepare("SELECT id FROM programs WHERE name = ? AND COALESCE(is_archived, 0) = 0");
            $stmt->execute([$name]);
            if ($stmt->fetch()) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Program name already exists'
                ]);
                break;
            }

            // Start transaction
            $pdo->beginTransaction();

            try {
                // Insert program
                $stmt = $pdo->prepare("INSERT INTO programs (name, description) VALUES (?, ?)");
                $stmt->execute([$name, $description]);
                $programId = $pdo->lastInsertId();

                // Create programhdr entry for admin template
                $stmt = $pdo->prepare("
                    INSERT INTO programhdr 
                    (program_id, header_name, description, color, tags, goal, notes, difficulty, total_sessions, scheduled_days, created_by, type, name, duration, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $programId,
                    $name,
                    $description,
                    '#3B82F6',
                    '[]',
                    $name,
                    $description,
                    $difficulty,
                    0,
                    '[]',
                    1, // Admin user ID
                    'template',
                    $name,
                    30,
                    1
                ]);
                $programHdrId = $pdo->lastInsertId();

                // Create program_workout entry
                $workoutDetails = json_encode([
                    'name' => $name,
                    'description' => $description,
                    'difficulty' => $difficulty,
                    'goal' => $name,
                    'duration' => '30 days',
                    'created_at' => date('Y-m-d H:i:s'),
                    'is_template' => true,
                    'template_id' => $programHdrId
                ]);
                $stmt = $pdo->prepare("INSERT INTO program_workout (program_hdr_id, workout_details) VALUES (?, ?)");
                $stmt->execute([$programHdrId, $workoutDetails]);
                $programWorkoutId = $pdo->lastInsertId();

                // Insert exercises for the program in both explore_program_workout and program_workout_exercise
                foreach ($exercises as $exercise) {
                    // Insert into explore_program_workout (for backward compatibility)
                    $details = json_encode([
                        'exercise_id' => $exercise['exercise_id'],
                        'exercise_name' => $exercise['exercise_name'],
                        'weight' => $exercise['weight'] ?? null,
                        'reps' => $exercise['reps'] ?? null,
                        'sets' => $exercise['sets'] ?? null,
                        'repsPerSet' => isset($exercise['repsPerSet']) && is_array($exercise['repsPerSet']) ? $exercise['repsPerSet'] : [],
                        'color' => $exercise['color'] ?? '#3B82F6'
                    ]);

                    $stmt = $pdo->prepare("INSERT INTO explore_program_workout (program_id, details) VALUES (?, ?)");
                    $stmt->execute([$programId, $details]);

                    // Insert into program_workout_exercise (for workout preview system)
                    $stmt = $pdo->prepare("
                        INSERT INTO program_workout_exercise 
                        (program_workout_id, exercise_id, sets, reps, weight, notes)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ");
                    $stmt->execute([
                        $programWorkoutId,
                        $exercise['exercise_id'],
                        $exercise['sets'] ?? 3,
                        $exercise['reps'] ?? 10,
                        $exercise['weight'] ?? 0.0,
                        'Admin created exercise'
                    ]);
                }

                $pdo->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Program created successfully',
                    'program_id' => $programId
                ]);
            } catch (Exception $e) {
                $pdo->rollback();
                throw $e;
            }
            break;

        case 'PUT':
            // Ensure is_archived column exists
            ensureArchivedColumn($pdo);

            // Check if this is an archive/restore action
            $action = null;
            if (isset($input['action']) && !empty($input['action'])) {
                $action = strtolower(trim($input['action']));
            }

            if ($action === 'archive' || $action === 'restore') {
                // Handle archive/restore
                if (!isset($input['id']) || empty($input['id'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Program ID is required'
                    ]);
                    break;
                }

                $id = (int) $input['id'];

                // Verify program exists
                $stmt = $pdo->prepare("SELECT id FROM programs WHERE id = ?");
                $stmt->execute([$id]);
                if (!$stmt->fetch()) {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Program not found'
                    ]);
                    break;
                }

                // Archive or restore
                if ($action === 'archive') {
                    $stmt = $pdo->prepare("UPDATE programs SET is_archived = 1 WHERE id = ?");
                    $stmt->execute([$id]);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Program archived successfully'
                    ]);
                } else { // restore
                    $stmt = $pdo->prepare("UPDATE programs SET is_archived = 0 WHERE id = ?");
                    $stmt->execute([$id]);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Program restored successfully'
                    ]);
                }
                break;
            }

            // Regular update (not archive/restore)
            if (!isset($input['id']) || !isset($input['name']) || empty(trim($input['name']))) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Program ID and name are required'
                ]);
                break;
            }

            $id = $input['id'];
            $name = trim($input['name']);
            $description = isset($input['description']) ? trim($input['description']) : null;
            $difficulty = isset($input['difficulty']) ? trim($input['difficulty']) : 'Beginner';
            $exercises = isset($input['exercises']) && is_array($input['exercises']) ? $input['exercises'] : [];

            // Validate exercises
            if (empty($exercises)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'At least one exercise is required'
                ]);
                break;
            }

            // Check if program exists
            $stmt = $pdo->prepare("SELECT id FROM programs WHERE id = ?");
            $stmt->execute([$id]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Program not found'
                ]);
                break;
            }

            // Check if name already exists for other active programs (exclude archived programs)
            $stmt = $pdo->prepare("SELECT id FROM programs WHERE name = ? AND id != ? AND COALESCE(is_archived, 0) = 0");
            $stmt->execute([$name, $id]);
            if ($stmt->fetch()) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Program name already exists'
                ]);
                break;
            }

            // Start transaction
            $pdo->beginTransaction();

            try {
                // Update program
                $stmt = $pdo->prepare("UPDATE programs SET name = ?, description = ? WHERE id = ?");
                $stmt->execute([$name, $description, $id]);

                // Get the programhdr_id for this program (check both admin and staff)
                $stmt = $pdo->prepare("SELECT id, created_by FROM programhdr WHERE program_id = ? ORDER BY created_by DESC LIMIT 1");
                $stmt->execute([$id]);
                $programHdr = $stmt->fetch();

                if ($programHdr) {
                    $programHdrId = $programHdr['id'];

                    // Update programhdr
                    $stmt = $pdo->prepare("
                        UPDATE programhdr 
                        SET header_name = ?, description = ?, goal = ?, notes = ?, name = ?, difficulty = ?
                        WHERE id = ?
                    ");
                    $stmt->execute([$name, $description, $name, $description, $name, $difficulty, $programHdrId]);

                    // Update program_workout
                    $workoutDetails = json_encode([
                        'name' => $name,
                        'description' => $description,
                        'difficulty' => $difficulty,
                        'goal' => $name,
                        'duration' => '30 days',
                        'created_at' => date('Y-m-d H:i:s'),
                        'is_template' => true,
                        'template_id' => $programHdrId
                    ]);
                    $stmt = $pdo->prepare("UPDATE program_workout SET workout_details = ? WHERE program_hdr_id = ?");
                    $stmt->execute([$workoutDetails, $programHdrId]);

                    // Delete existing exercises from program_workout_exercise
                    $stmt = $pdo->prepare("DELETE FROM program_workout_exercise WHERE program_workout_id = (SELECT id FROM program_workout WHERE program_hdr_id = ?)");
                    $stmt->execute([$programHdrId]);
                }

                // Delete existing exercises from explore_program_workout
                $stmt = $pdo->prepare("DELETE FROM explore_program_workout WHERE program_id = ?");
                $stmt->execute([$id]);

                // Insert new exercises
                foreach ($exercises as $exercise) {
                    // Insert into explore_program_workout (for backward compatibility)
                    $details = json_encode([
                        'exercise_id' => $exercise['exercise_id'],
                        'exercise_name' => $exercise['exercise_name'],
                        'weight' => $exercise['weight'] ?? null,
                        'reps' => $exercise['reps'] ?? null,
                        'sets' => $exercise['sets'] ?? null,
                        'repsPerSet' => isset($exercise['repsPerSet']) && is_array($exercise['repsPerSet']) ? $exercise['repsPerSet'] : [],
                        'color' => $exercise['color'] ?? '#3B82F6'
                    ]);

                    $stmt = $pdo->prepare("INSERT INTO explore_program_workout (program_id, details) VALUES (?, ?)");
                    $stmt->execute([$id, $details]);

                    // Insert into program_workout_exercise (for workout preview system)
                    if ($programHdr) {
                        $stmt = $pdo->prepare("
                            INSERT INTO program_workout_exercise 
                            (program_workout_id, exercise_id, sets, reps, weight, notes)
                            VALUES ((SELECT id FROM program_workout WHERE program_hdr_id = ?), ?, ?, ?, ?, ?)
                        ");
                        $stmt->execute([
                            $programHdrId,
                            $exercise['exercise_id'],
                            $exercise['sets'] ?? 3,
                            $exercise['reps'] ?? 10,
                            $exercise['weight'] ?? 0.0,
                            'Admin created exercise'
                        ]);
                    }
                }

                $pdo->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Program updated successfully'
                ]);
            } catch (Exception $e) {
                $pdo->rollback();
                throw $e;
            }
            break;

        case 'DELETE':
            // Delete program
            if (!isset($input['id'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Program ID is required'
                ]);
                break;
            }

            $id = $input['id'];

            // Check if program exists
            $stmt = $pdo->prepare("SELECT id FROM programs WHERE id = ?");
            $stmt->execute([$id]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Program not found'
                ]);
                break;
            }

            // Start transaction
            $pdo->beginTransaction();

            try {
                // Delete related workouts first
                $stmt = $pdo->prepare("DELETE FROM explore_program_workout WHERE program_id = ?");
                $stmt->execute([$id]);

                // Delete the program
                $stmt = $pdo->prepare("DELETE FROM programs WHERE id = ?");
                $stmt->execute([$id]);

                $pdo->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Program deleted successfully'
                ]);
            } catch (Exception $e) {
                $pdo->rollback();
                throw $e;
            }
            break;

        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed'
            ]);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>