<?php
// ADD THESE CASES TO THE SWITCH STATEMENT IN admin_coach.php

// In the switch statement, add these cases:

case 'unassigned-members':
    if ($method === 'GET') getUnassignedMembers($pdo);
    break;

case 'assign-coach':
    if ($method === 'POST') assignCoach($pdo);
    break;

case 'available-members':
    if ($method === 'GET') getAvailableMembers($pdo);
    break;

// ADD THESE FUNCTIONS TO admin_coach.php:

function getUnassignedMembers($pdo) {
    try {
        // Get members with plan_id 1 (gym membership) who don't have an active coach assignment
        $stmt = $pdo->prepare("
            SELECT DISTINCT
                u.id,
                u.fname,
                u.mname,
                u.lname,
                u.email,
                u.account_status,
                p.plan_name
            FROM user u
            INNER JOIN subscription s ON u.id = s.user_id
            INNER JOIN member_subscription_plan p ON s.plan_id = p.id
            LEFT JOIN coach_member_list cml ON u.id = cml.member_id 
                AND cml.coach_approval = 'approved' 
                AND cml.staff_approval = 'approved'
                AND (cml.status = 'active' OR cml.status IS NULL)
                AND (cml.expires_at IS NULL OR cml.expires_at >= CURDATE())
            WHERE p.id = 1
                AND u.user_type_id = 4
                AND u.account_status = 'approved'
                AND s.status_id = 2  -- approved subscription status
                AND s.end_date >= CURDATE()  -- active subscription
                AND cml.id IS NULL  -- no active coach assignment
            ORDER BY u.fname, u.lname
        ");
        
        $stmt->execute();
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedMembers = [];
        foreach ($members as $member) {
            $formattedMembers[] = [
                'id' => (int)$member['id'],
                'name' => trim($member['fname'] . ' ' . ($member['mname'] ?? '') . ' ' . $member['lname']),
                'email' => $member['email'],
                'plan_name' => $member['plan_name'] ?? 'Gym Membership'
            ];
        }
        
        echo json_encode([
            'success' => true,
            'members' => $formattedMembers,
            'total' => count($formattedMembers)
        ]);
        
    } catch (PDOException $e) {
        error_log("Error in getUnassignedMembers: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error fetching unassigned members: ' . $e->getMessage()
        ]);
    }
}

function assignCoach($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $memberId = $input['member_id'] ?? null;
        $coachId = $input['coach_id'] ?? null;
        $adminId = $input['admin_id'] ?? 1;
        $staffId = $input['staff_id'] ?? null;
        
        if (!$memberId || !$coachId) {
            echo json_encode([
                'success' => false,
                'message' => 'Member ID and Coach ID are required'
            ]);
            return;
        }
        
        // Validate admin user (admin or staff)
        $adminUser = validateAdminUser($pdo, $adminId);
        if (!$adminUser) {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid admin user or insufficient permissions'
            ]);
            return;
        }
        
        // Validate member exists and has plan_id 1
        $memberStmt = $pdo->prepare("
            SELECT u.id, u.fname, u.lname, u.email
            FROM user u
            INNER JOIN subscription s ON u.id = s.user_id
            WHERE u.id = ? 
                AND u.user_type_id = 4
                AND s.plan_id = 1
                AND s.status_id = 2
                AND s.end_date >= CURDATE()
        ");
        $memberStmt->execute([$memberId]);
        $member = $memberStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$member) {
            echo json_encode([
                'success' => false,
                'message' => 'Member not found or does not have an active gym membership (Plan ID 1)'
            ]);
            return;
        }
        
        // Validate coach exists
        $coachStmt = $pdo->prepare("
            SELECT u.id, u.fname, u.lname, u.email
            FROM user u
            WHERE u.id = ? AND u.user_type_id = 3
        ");
        $coachStmt->execute([$coachId]);
        $coach = $coachStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$coach) {
            echo json_encode([
                'success' => false,
                'message' => 'Coach not found'
            ]);
            return;
        }
        
        // Check if member already has an active assignment with this coach
        $existingStmt = $pdo->prepare("
            SELECT id FROM coach_member_list
            WHERE member_id = ? 
                AND coach_id = ?
                AND coach_approval = 'approved'
                AND staff_approval = 'approved'
                AND (status = 'active' OR status IS NULL)
                AND (expires_at IS NULL OR expires_at >= CURDATE())
        ");
        $existingStmt->execute([$memberId, $coachId]);
        if ($existingStmt->fetch()) {
            echo json_encode([
                'success' => false,
                'message' => 'Member already has an active assignment with this coach'
            ]);
            return;
        }
        
        // Start transaction
        $pdo->beginTransaction();
        
        try {
            // Get coach's default rate (monthly rate if available)
            $coachInfoStmt = $pdo->prepare("
                SELECT monthly_rate, session_package_rate, per_session_rate
                FROM coaches
                WHERE user_id = ?
            ");
            $coachInfoStmt->execute([$coachId]);
            $coachInfo = $coachInfoStmt->fetch(PDO::FETCH_ASSOC);
            
            // Calculate expiration date (30 days from now for monthly)
            $expiresAt = date('Y-m-d', strtotime('+30 days'));
            
            // Insert new coach assignment
            $insertStmt = $pdo->prepare("
                INSERT INTO coach_member_list (
                    coach_id, 
                    member_id, 
                    status, 
                    coach_approval, 
                    staff_approval, 
                    requested_at,
                    coach_approved_at,
                    staff_approved_at,
                    handled_by_coach,
                    handled_by_staff,
                    expires_at,
                    remaining_sessions,
                    rate_type
                ) VALUES (?, ?, 'active', 'approved', 'approved', NOW(), NOW(), NOW(), ?, ?, ?, 18, 'monthly')
            ");
            
            $insertStmt->execute([
                $coachId,
                $memberId,
                $coachId,  // handled_by_coach
                $adminId,  // handled_by_staff
                $expiresAt,
            ]);
            
            $assignmentId = $pdo->lastInsertId();
            
            // Log the activity using centralized logger
            logStaffActivity($pdo, $staffId, "Assign Coach", "Coach assigned to member: {$member['fname']} {$member['lname']} assigned to {$coach['fname']} {$coach['lname']} by {$adminUser['fname']} {$adminUser['lname']}", "Coach Assignment", [
                'assignment_id' => $assignmentId,
                'member_id' => $memberId,
                'member_name' => $member['fname'] . ' ' . $member['lname'],
                'coach_id' => $coachId,
                'coach_name' => $coach['fname'] . ' ' . $coach['lname'],
                'assigned_by' => $adminUser['fname'] . ' ' . $adminUser['lname'],
                'user_type' => $adminUser['user_type_id'] == 1 ? 'admin' : 'staff'
            ]);
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Coach assigned successfully',
                'data' => [
                    'assignment_id' => $assignmentId,
                    'member_name' => $member['fname'] . ' ' . $member['lname'],
                    'coach_name' => $coach['fname'] . ' ' . $coach['lname'],
                    'expires_at' => $expiresAt
                ]
            ]);
            
        } catch (Exception $e) {
            $pdo->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("Error in assignCoach: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error assigning coach: ' . $e->getMessage()
        ]);
    }
}

// Function to get all available members with gym membership (for manual selection)
function getAvailableMembers($pdo) {
    try {
        // Get all members with plan_id 1 (gym membership) regardless of coach assignment status
        $stmt = $pdo->prepare("
            SELECT DISTINCT
                u.id,
                u.fname,
                u.mname,
                u.lname,
                u.email,
                u.account_status,
                p.plan_name
            FROM user u
            INNER JOIN subscription s ON u.id = s.user_id
            INNER JOIN member_subscription_plan p ON s.plan_id = p.id
            WHERE p.id = 1
                AND u.user_type_id = 4
                AND u.account_status = 'approved'
                AND s.status_id = 2  -- approved subscription status
                AND s.end_date >= CURDATE()  -- active subscription
            ORDER BY u.fname, u.lname
        ");
        
        $stmt->execute();
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedMembers = [];
        foreach ($members as $member) {
            $formattedMembers[] = [
                'id' => (int)$member['id'],
                'name' => trim($member['fname'] . ' ' . ($member['mname'] ?? '') . ' ' . $member['lname']),
                'email' => $member['email'],
                'plan_name' => $member['plan_name'] ?? 'Gym Membership'
            ];
        }
        
        echo json_encode([
            'success' => true,
            'members' => $formattedMembers,
            'total' => count($formattedMembers)
        ]);
        
    } catch (PDOException $e) {
        error_log("Error in getAvailableMembers: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error fetching available members: ' . $e->getMessage()
        ]);
    }
}

// Also update getDashboardStats to include unassigned_members count:

// In getDashboardStats function, add this query:
// Get unassigned members count (members with plan_id 1 who don't have active coach)
$unassignedStmt = $pdo->prepare("
    SELECT COUNT(DISTINCT u.id) as count
    FROM user u
    INNER JOIN subscription s ON u.id = s.user_id
    INNER JOIN member_subscription_plan p ON s.plan_id = p.id
    LEFT JOIN coach_member_list cml ON u.id = cml.member_id 
        AND cml.coach_approval = 'approved' 
        AND cml.staff_approval = 'approved'
        AND (cml.status = 'active' OR cml.status IS NULL)
        AND (cml.expires_at IS NULL OR cml.expires_at >= CURDATE())
    WHERE p.id = 1
        AND u.user_type_id = 4
        AND u.account_status = 'approved'
        AND s.status_id = 2
        AND s.end_date >= CURDATE()
        AND cml.id IS NULL
");
$unassignedStmt->execute();
$unassignedCount = $unassignedStmt->fetch()['count'];

// Then in the return statement, add:
'unassigned_members' => (int)$unassignedCount,
'assigned_members' => (int)$approvedCount,  // Rename from approved_assignments

?>

