<?php

// Dynamic CORS - allow only trusted origins and echo exact Origin

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

$allowed_origins = [
    'https://www.cnergy.site',
    'https://cnergy.site',
    'https://api.cnergy.site',
    'http://localhost:3000',
];

if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    header("Access-Control-Allow-Origin: https://www.cnergy.site");
}

header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Include the announcement email service
require_once 'announcement_email_system.php';

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// DB
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
    // Set timezone to Philippines
    $pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

try {
    switch ($method) {
        case 'GET':
            // GET single
            if (isset($_GET['id']) && is_numeric($_GET['id'])) {
                $id = (int) $_GET['id'];
                $stmt = $pdo->prepare("SELECT id, title, content, date_posted, start_date, end_date, status, priority FROM `announcement` WHERE id = ?");
                $stmt->execute([$id]);
                $announcement = $stmt->fetch();

                if (!$announcement) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'message' => 'Announcement not found']);
                    break;
                }

                // Format dates properly
                if ($announcement['start_date'] && $announcement['start_date'] !== '0000-00-00') {
                    $announcement['start_date'] = date('Y-m-d', strtotime($announcement['start_date']));
                } else {
                    $announcement['start_date'] = null;
                }

                if ($announcement['end_date'] && $announcement['end_date'] !== '0000-00-00' && $announcement['end_date'] !== null) {
                    $announcement['end_date'] = date('Y-m-d', strtotime($announcement['end_date']));
                } else {
                    $announcement['end_date'] = null;
                }

                echo json_encode(['success' => true, 'announcement' => $announcement]);
                break;
            }

            // GET list (always return { announcements: [...] })
            $where = [];
            $params = [];
            if (!empty($_GET['status'])) {
                $where[] = 'status = ?';
                $params[] = $_GET['status'];
            }
            if (!empty($_GET['priority'])) {
                $where[] = 'priority = ?';
                $params[] = $_GET['priority'];
            }

            $sql = "SELECT id, title, content, date_posted, start_date, end_date, status, priority FROM `announcement`";
            if (!empty($where)) {
                $sql .= ' WHERE ' . implode(' AND ', $where);
            }
            $sql .= ' ORDER BY date_posted DESC, id DESC';

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll() ?: [];

            // Format dates properly for all announcements
            foreach ($rows as &$row) {
                if ($row['start_date'] && $row['start_date'] !== '0000-00-00') {
                    $row['start_date'] = date('Y-m-d', strtotime($row['start_date']));
                } else {
                    $row['start_date'] = null;
                }

                if ($row['end_date'] && $row['end_date'] !== '0000-00-00' && $row['end_date'] !== null) {
                    $row['end_date'] = date('Y-m-d', strtotime($row['end_date']));
                } else {
                    $row['end_date'] = null;
                }
            }

            echo json_encode(['success' => true, 'announcements' => $rows]);
            break;

        case 'POST':
            if (!is_array($input) || empty($input['title']) || empty($input['content'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Title and content are required']);
                break;
            }

            $title = trim($input['title']);
            $content = trim($input['content']);
            $status = $input['status'] ?? 'active';
            $priority = $input['priority'] ?? 'low';

            // Handle start_date - required field
            $start_date = null;
            if (isset($input['start_date']) && !empty($input['start_date']) && $input['start_date'] !== 'null') {
                $start_date = $input['start_date'];
                // Validate date format (YYYY-MM-DD)
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start_date)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Invalid start_date format. Expected YYYY-MM-DD']);
                    break;
                }
            } else {
                // Default to today if not provided
                $start_date = date('Y-m-d');
            }

            // Handle end_date - optional, auto-calculate if not provided
            $end_date = null;
            if (isset($input['end_date']) && !empty($input['end_date']) && $input['end_date'] !== 'null' && $input['end_date'] !== '') {
                $end_date = $input['end_date'];
                // Validate date format (YYYY-MM-DD)
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $end_date)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Invalid end_date format. Expected YYYY-MM-DD']);
                    break;
                }
            } else {
                // Auto-calculate end_date as 30 days from start_date if not provided
                if ($start_date) {
                    $startTimestamp = strtotime($start_date);
                    $endTimestamp = strtotime('+30 days', $startTimestamp);
                    $end_date = date('Y-m-d', $endTimestamp);
                }
            }

            $send_email = $input['send_email'] ?? true; // Default to true
            $admin_id = $input['admin_id'] ?? null;
            $announcement_type = $input['announcement_type'] ?? 'general';
            $user_types = $input['user_types'] ?? ['admin', 'staff', 'coach', 'customer'];

            // Insert with start_date and end_date
            $stmt = $pdo->prepare("INSERT INTO `announcement` (title, content, start_date, end_date, status, priority) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$title, $content, $start_date, $end_date, $status, $priority]);

            $newId = (int) $pdo->lastInsertId();

            $stmt = $pdo->prepare("SELECT id, title, content, date_posted, start_date, end_date, status, priority FROM `announcement` WHERE id = ?");
            $stmt->execute([$newId]);
            $row = $stmt->fetch();

            // Format dates properly
            if ($row['start_date'] && $row['start_date'] !== '0000-00-00') {
                $row['start_date'] = date('Y-m-d', strtotime($row['start_date']));
            } else {
                $row['start_date'] = null;
            }

            if ($row['end_date'] && $row['end_date'] !== '0000-00-00' && $row['end_date'] !== null) {
                $row['end_date'] = date('Y-m-d', strtotime($row['end_date']));
            } else {
                $row['end_date'] = null;
            }

            // Send email notification if requested
            $emailResult = null;
            if ($send_email && $status === 'active') {
                try {
                    $announcementService = new AnnouncementEmailService();

                    if (isset($input['send_to_all']) && $input['send_to_all']) {
                        $emailResult = $announcementService->sendAnnouncementToAllUsers($title, $content, $announcement_type, $admin_id);
                    } else {
                        $emailResult = $announcementService->sendAnnouncementToUserTypes($title, $content, $user_types, $announcement_type, $admin_id);
                    }
                } catch (Exception $e) {
                    error_log("Failed to send announcement emails: " . $e->getMessage());
                    $emailResult = ['success' => false, 'message' => $e->getMessage()];
                }
            }

            http_response_code(201);
            $response = ['success' => true, 'announcement' => $row];
            if ($emailResult !== null) {
                $response['email_result'] = $emailResult;
            }
            echo json_encode($response);
            break;

        case 'PUT':
            if (!is_array($input) || empty($input['id']) || !is_numeric($input['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Valid id is required']);
                break;
            }

            $id = (int) $input['id'];

            $fields = [];
            $params = [];

            if (isset($input['title'])) {
                $fields[] = 'title = ?';
                $params[] = trim($input['title']);
            }
            if (isset($input['content'])) {
                $fields[] = 'content = ?';
                $params[] = trim($input['content']);
            }
            if (isset($input['status'])) {
                $fields[] = 'status = ?';
                $params[] = $input['status'];
            }
            if (isset($input['priority'])) {
                $fields[] = 'priority = ?';
                $params[] = $input['priority'];
            }

            // Handle start_date
            if (isset($input['start_date']) && !empty($input['start_date']) && $input['start_date'] !== 'null') {
                $start_date = $input['start_date'];
                // Validate date format (YYYY-MM-DD)
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $start_date)) {
                    $fields[] = 'start_date = ?';
                    $params[] = $start_date;
                }
            }

            // Handle end_date
            if (isset($input['end_date'])) {
                if (!empty($input['end_date']) && $input['end_date'] !== 'null' && $input['end_date'] !== '') {
                    $end_date = $input['end_date'];
                    // Validate date format (YYYY-MM-DD)
                    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $end_date)) {
                        $fields[] = 'end_date = ?';
                        $params[] = $end_date;
                    }
                } else {
                    // Set to NULL if empty string or null
                    $fields[] = 'end_date = ?';
                    $params[] = null;
                }
            }

            if (empty($fields)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'No fields to update']);
                break;
            }

            $params[] = $id;
            $sql = 'UPDATE `announcement` SET ' . implode(', ', $fields) . ' WHERE id = ?';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            $stmt = $pdo->prepare("SELECT id, title, content, date_posted, start_date, end_date, status, priority FROM `announcement` WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();

            if (!$row) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Announcement not found']);
                break;
            }

            // Format dates properly
            if ($row['start_date'] && $row['start_date'] !== '0000-00-00') {
                $row['start_date'] = date('Y-m-d', strtotime($row['start_date']));
            } else {
                $row['start_date'] = null;
            }

            if ($row['end_date'] && $row['end_date'] !== '0000-00-00' && $row['end_date'] !== null) {
                $row['end_date'] = date('Y-m-d', strtotime($row['end_date']));
            } else {
                $row['end_date'] = null;
            }

            echo json_encode(['success' => true, 'announcement' => $row]);
            break;

        case 'DELETE':
            if (!is_array($input) || empty($input['id']) || !is_numeric($input['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Valid id is required']);
                break;
            }

            $id = (int) $input['id'];
            $stmt = $pdo->prepare("DELETE FROM `announcement` WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Announcement deleted']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
            break;
    }
} catch (Throwable $e) {
    error_log('Announcement API Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>