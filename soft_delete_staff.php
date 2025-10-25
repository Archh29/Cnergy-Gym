<?php
// Soft Delete Staff Implementation
// This file handles soft deletion of staff members

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, DELETE, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Database connection
$host = 'localhost';
$dbname = 'u773938685_cnergydb';
$username = 'u773938685_archh29';
$password = 'Archh29@123';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

try {
    switch ($method) {
        case 'DELETE':
            handleSoftDelete($pdo, $input);
            break;
        case 'PUT':
            handleRestore($pdo, $input);
            break;
        case 'GET':
            handleGetStaff($pdo);
            break;
        default:
            http_response_code(405);
            echo json_encode(["error" => "Method not allowed"]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}

function handleSoftDelete($pdo, $data)
{
    if (!isset($data['staff_id']) || !isset($data['deleted_by'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields: staff_id and deleted_by"]);
        return;
    }

    $staffId = $data['staff_id'];
    $deletedBy = $data['deleted_by'];
    $reason = $data['reason'] ?? 'Staff member deactivated by administrator';

    // Validate that the staff member exists and is not already deleted
    $stmt = $pdo->prepare("SELECT id, fname, lname FROM user WHERE id = ? AND user_type_id = 2 AND is_deleted = 0");
    $stmt->execute([$staffId]);
    $staff = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$staff) {
        http_response_code(404);
        echo json_encode(["error" => "Staff member not found or already deleted"]);
        return;
    }

    // Validate that the deleter exists
    $stmt = $pdo->prepare("SELECT id, fname, lname FROM user WHERE id = ? AND user_type_id IN (1, 2)");
    $stmt->execute([$deletedBy]);
    $deleter = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$deleter) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid deleter user"]);
        return;
    }

    try {
        $pdo->beginTransaction();

        // Soft delete the staff member
        $stmt = $pdo->prepare("
            UPDATE user 
            SET 
                is_deleted = 1,
                deleted_at = NOW(),
                deleted_by = ?,
                account_status = 'deactivated'
            WHERE id = ? AND user_type_id = 2 AND is_deleted = 0
        ");
        $stmt->execute([$deletedBy, $staffId]);

        if ($stmt->rowCount() === 0) {
            throw new Exception("Failed to soft delete staff member");
        }

        // Log the deletion
        $stmt = $pdo->prepare("
            INSERT INTO account_deactivation_log (user_id, deactivated_by, reason, deactivated_at) 
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->execute([$staffId, $deletedBy, $reason]);

        $pdo->commit();

        echo json_encode([
            "success" => true,
            "message" => "Staff member {$staff['fname']} {$staff['lname']} has been deactivated successfully",
            "staff_id" => $staffId,
            "deleted_by" => $deleter['fname'] . ' ' . $deleter['lname']
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleRestore($pdo, $data)
{
    if (!isset($data['staff_id']) || !isset($data['restored_by'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields: staff_id and restored_by"]);
        return;
    }

    $staffId = $data['staff_id'];
    $restoredBy = $data['restored_by'];

    // Validate that the staff member exists and is deleted
    $stmt = $pdo->prepare("SELECT id, fname, lname FROM user WHERE id = ? AND user_type_id = 2 AND is_deleted = 1");
    $stmt->execute([$staffId]);
    $staff = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$staff) {
        http_response_code(404);
        echo json_encode(["error" => "Deleted staff member not found"]);
        return;
    }

    // Validate that the restorer exists
    $stmt = $pdo->prepare("SELECT id, fname, lname FROM user WHERE id = ? AND user_type_id IN (1, 2)");
    $stmt->execute([$restoredBy]);
    $restorer = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$restorer) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid restorer user"]);
        return;
    }

    try {
        $pdo->beginTransaction();

        // Restore the staff member
        $stmt = $pdo->prepare("
            UPDATE user 
            SET 
                is_deleted = 0,
                deleted_at = NULL,
                deleted_by = NULL,
                account_status = 'active'
            WHERE id = ? AND user_type_id = 2 AND is_deleted = 1
        ");
        $stmt->execute([$staffId]);

        if ($stmt->rowCount() === 0) {
            throw new Exception("Failed to restore staff member");
        }

        $pdo->commit();

        echo json_encode([
            "success" => true,
            "message" => "Staff member {$staff['fname']} {$staff['lname']} has been restored successfully",
            "staff_id" => $staffId,
            "restored_by" => $restorer['fname'] . ' ' . $restorer['lname']
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleGetStaff($pdo)
{
    $includeDeleted = $_GET['include_deleted'] ?? false;
    $deletedOnly = $_GET['deleted_only'] ?? false;

    if ($deletedOnly) {
        // Get only deleted staff
        $stmt = $pdo->prepare("
            SELECT 
                u.*,
                ut.type_name as user_type_name,
                g.gender_name,
                CONCAT(deleter.fname, ' ', deleter.lname) as deleted_by_name,
                adl.reason as deletion_reason,
                adl.deactivated_at
            FROM user u
            LEFT JOIN usertype ut ON u.user_type_id = ut.id
            LEFT JOIN gender g ON u.gender_id = g.id
            LEFT JOIN user deleter ON u.deleted_by = deleter.id
            LEFT JOIN account_deactivation_log adl ON u.id = adl.user_id
            WHERE u.user_type_id = 2 AND u.is_deleted = 1
            ORDER BY u.deleted_at DESC
        ");
        $stmt->execute();
    } else {
        // Get active staff (default)
        $whereClause = "u.user_type_id = 2 AND u.is_deleted = 0";

        if ($includeDeleted) {
            $whereClause = "u.user_type_id = 2";
        }

        $stmt = $pdo->prepare("
            SELECT 
                u.*,
                ut.type_name as user_type_name,
                g.gender_name
            FROM user u
            LEFT JOIN usertype ut ON u.user_type_id = ut.id
            LEFT JOIN gender g ON u.gender_id = g.id
            WHERE $whereClause
            ORDER BY u.fname, u.lname
        ");
        $stmt->execute();
    }

    $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "staff" => $staff,
        "count" => count($staff)
    ]);
}
?>
