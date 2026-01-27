<?php
// Set timezone to Philippines
date_default_timezone_set('Asia/Manila');

// Database configuration
$host = "localhost";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Set MySQL timezone to Philippines
    $pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
    error_log('Staff Monitoring Database connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
    exit();
}

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

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);
$action = $_GET['action'] ?? '';

try {
    switch ($method) {
        case 'GET':
            handleGetRequest($pdo, $action);
            break;
        default:
            http_response_code(405);
            echo json_encode(["error" => "Invalid request method"]);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error occurred: " . $e->getMessage()]);
}

function handleGetRequest($pdo, $action)
{
    switch ($action) {
        case 'staff_activities':
            getStaffActivitiesFromAPI($pdo);
            break;
        case 'staff_performance':
            getStaffPerformance($pdo);
            break;
        case 'activity_details':
            getActivityDetails($pdo);
            break;
        case 'staff_summary':
            getStaffSummary($pdo);
            break;
        case 'staff_list':
            getStaffList($pdo);
            break;
        default:
            getStaffActivitiesFromAPI($pdo);
            break;
    }
}

function getStaffActivitiesFromAPI($pdo)
{
    try {
        // Check if activity_log table exists and has data
        $stmt = $pdo->query("SHOW TABLES LIKE 'activity_log'");
        $tableExists = $stmt->fetch();

        if (!$tableExists) {
            echo json_encode(["error" => "activity_log table does not exist"]);
            return;
        }

        // Check row count
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM activity_log");
        $rowCount = $stmt->fetch()['count'];

        $filters = [
            'staff_id' => $_GET['staff_id'] ?? 'all',
            'category' => $_GET['category'] ?? 'all',
            'date_filter' => $_GET['date_filter'] ?? 'all',
            'limit' => $_GET['limit'] ?? 50
        ];

        // Build the query.
        // IMPORTANT: Admin Activity Logs should show only real Admin/Staff actors (no NULL "System User"
        // and no member/other accounts).
        $whereConditions = [];
        $params = [];

        // Always restrict to real staff/admin actions
        $whereConditions[] = "al.user_id IS NOT NULL";
        $whereConditions[] = "u.user_type_id IN (1, 2)";

        // Add filters
        if ($filters['staff_id'] !== 'all') {
            $whereConditions[] = "al.user_id = ?";
            $params[] = $filters['staff_id'];
        }

        if ($filters['category'] !== 'all') {
            // Filter by category name (e.g., "User Management", "Coach Management", etc.)
            $category = $filters['category'];
            $categoryCondition = "";

            switch ($category) {
                case 'Coach Management':
                    $categoryCondition = "(al.activity LIKE '%Add Coach%' OR al.activity LIKE '%Delete Coach%' OR al.activity LIKE '%Update Coach%')";
                    break;
                case 'Subscription Management':
                    $categoryCondition = "(al.activity LIKE '%Approve Subscription%' OR al.activity LIKE '%subscription%')";
                    break;
                case 'Guest Management':
                    $categoryCondition = "(al.activity LIKE '%Guest session%' OR al.activity LIKE '%guest%')";
                    break;
                case 'Coach Assignment':
                    $categoryCondition = "(al.activity LIKE '%Coach Assignment%' OR al.activity LIKE '%coach assignment%')";
                    break;
                case 'Sales':
                    $categoryCondition = "(al.activity LIKE '%POS Sale%' OR al.activity LIKE '%sale%' OR al.activity LIKE '%Process POS%')";
                    break;
                case 'Product Management':
                    $categoryCondition = "(al.activity LIKE '%Add Product%' OR al.activity LIKE '%product%')";
                    break;
                case 'Inventory Management':
                    $categoryCondition = "(al.activity LIKE '%Stock updated%' OR al.activity LIKE '%inventory%')";
                    break;
                case 'User Management':
                    $categoryCondition = "(al.activity LIKE '%Add Member%' OR al.activity LIKE '%Delete Member%' OR al.activity LIKE '%Update Member%' OR al.activity LIKE '%Member Check%')";
                    break;
                default:
                    // If category doesn't match known categories, search in activity text
                    $categoryCondition = "al.activity LIKE ?";
                    $params[] = '%' . $category . '%';
                    break;
            }

            if (!empty($categoryCondition)) {
                $whereConditions[] = $categoryCondition;
            }
        }

        if ($filters['date_filter'] !== 'all') {
            // Get current Philippines time
            $phTime = new DateTime('now', new DateTimeZone('Asia/Manila'));

            switch ($filters['date_filter']) {
                case 'today':
                    $today = $phTime->format('Y-m-d');
                    $whereConditions[] = "DATE(al.timestamp) = ?";
                    $params[] = $today;
                    break;
                case 'week':
                    $weekStart = clone $phTime;
                    $weekStart->modify('-' . $phTime->format('w') . ' days')->setTime(0, 0, 0);
                    $whereConditions[] = "al.timestamp >= ?";
                    $params[] = $weekStart->format('Y-m-d H:i:s');
                    break;
                case 'month':
                    $month = $phTime->format('Y-m');
                    $whereConditions[] = "DATE_FORMAT(al.timestamp, '%Y-%m') = ?";
                    $params[] = $month;
                    break;
                case 'year':
                    $year = $phTime->format('Y');
                    $whereConditions[] = "YEAR(al.timestamp) = ?";
                    $params[] = $year;
                    break;
                case 'custom':
                    // Handle custom single date
                    if (isset($_GET['custom_date']) && !empty($_GET['custom_date'])) {
                        $customDate = $_GET['custom_date'];
                        $whereConditions[] = "DATE(al.timestamp) = ?";
                        $params[] = $customDate;
                    }
                    break;
                case 'range':
                    // Handle custom date range
                    if (isset($_GET['date_from']) && !empty($_GET['date_from'])) {
                        $whereConditions[] = "DATE(al.timestamp) >= ?";
                        $params[] = $_GET['date_from'];
                    }
                    if (isset($_GET['date_to']) && !empty($_GET['date_to'])) {
                        $whereConditions[] = "DATE(al.timestamp) <= ?";
                        $params[] = $_GET['date_to'];
                    }
                    break;
            }
        }

        $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
        $limit = isset($filters['limit']) ? (int) $filters['limit'] : 50;

        // Staff/Admin-only activity feed
        $stmt = $pdo->prepare("
            SELECT 
                al.id,
                al.user_id,
                al.activity,
                al.timestamp,
                u.fname as fname,
                u.lname as lname,
                u.email as email,
                ut.type_name as user_type,
                CASE 
                    WHEN al.activity LIKE '%Add Coach%' OR al.activity LIKE '%Delete Coach%' OR al.activity LIKE '%Update Coach%' THEN 'Coach Management'
                    WHEN al.activity LIKE '%Approve Subscription%' OR al.activity LIKE '%subscription%' THEN 'Subscription Management'
                    WHEN al.activity LIKE '%Guest session%' OR al.activity LIKE '%guest%' THEN 'Guest Management'
                    WHEN al.activity LIKE '%Coach Assignment%' OR al.activity LIKE '%coach assignment%' THEN 'Coach Assignment'
                    WHEN al.activity LIKE '%POS Sale%' OR al.activity LIKE '%sale%' OR al.activity LIKE '%Process POS%' THEN 'Sales'
                    WHEN al.activity LIKE '%Add Product%' OR al.activity LIKE '%product%' THEN 'Product Management'
                    WHEN al.activity LIKE '%Stock updated%' OR al.activity LIKE '%inventory%' THEN 'Inventory Management'
                    WHEN al.activity LIKE '%Add Member%' OR al.activity LIKE '%Delete Member%' OR al.activity LIKE '%Update Member%' OR al.activity LIKE '%Member Check%' THEN 'User Management'
                    ELSE 'Other'
                END as activity_category
            FROM activity_log al
            LEFT JOIN user u ON al.user_id = u.id
            LEFT JOIN usertype ut ON u.user_type_id = ut.id
            $whereClause
            ORDER BY al.timestamp DESC
            LIMIT $limit
        ");

        $stmt->execute($params);
        $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Count activities with and without user_id
        $withUserId = 0;
        $withoutUserId = 0;
        foreach ($activities as $activity) {
            if ($activity['user_id']) {
                $withUserId++;
            } else {
                $withoutUserId++;
            }
        }

        // Get current database date for debugging (in Philippines timezone)
        $phTime = new DateTime('now', new DateTimeZone('Asia/Manila'));
        try {
            $stmt = $pdo->query("SELECT CURDATE() as current_date, NOW() as current_datetime");
            $currentDate = $stmt->fetch();
        } catch (Exception $e) {
            $currentDate = ['current_date' => 'error', 'current_datetime' => 'error'];
        }
        $currentDate['ph_current_date'] = $phTime->format('Y-m-d');
        $currentDate['ph_current_datetime'] = $phTime->format('Y-m-d H:i:s');

        echo json_encode([
            "activities" => $activities,
            "debug" => [
                "table_exists" => $tableExists ? true : false,
                "row_count" => $rowCount,
                "activities_count" => count($activities),
                "activities_with_user_id" => $withUserId,
                "activities_without_user_id" => $withoutUserId,
                "sample_activity" => count($activities) > 0 ? $activities[0] : null,
                "filters_applied" => $filters,
                "current_date" => $currentDate['current_date'],
                "current_datetime" => $currentDate['current_datetime'],
                "ph_current_date" => $currentDate['ph_current_date'],
                "ph_current_datetime" => $currentDate['ph_current_datetime']
            ]
        ]);
    } catch (Exception $e) {
        echo json_encode(["error" => "Failed to get staff activities: " . $e->getMessage()]);
    }
}

function getStaffPerformance($pdo)
{
    $period = $_GET['period'] ?? 'month';

    // Build date condition based on period
    $dateCondition = "";
    switch ($period) {
        case 'today':
            $dateCondition = "DATE(al.timestamp) = CURDATE()";
            break;
        case 'week':
            $dateCondition = "al.timestamp >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)";
            break;
        case 'month':
            $dateCondition = "MONTH(al.timestamp) = MONTH(CURDATE()) AND YEAR(al.timestamp) = YEAR(CURDATE())";
            break;
        case 'year':
            $dateCondition = "YEAR(al.timestamp) = YEAR(CURDATE())";
            break;
        default:
            $dateCondition = "MONTH(al.timestamp) = MONTH(CURDATE()) AND YEAR(al.timestamp) = YEAR(CURDATE())";
    }

    $stmt = $pdo->prepare("
        SELECT 
            u.id as staff_id,
            CONCAT(u.fname, ' ', u.lname) as staff_name,
            u.email as email,
            ut.type_name as user_type,
            COUNT(al.id) as total_activities,
            COUNT(CASE WHEN al.activity LIKE '%Add Coach%' OR al.activity LIKE '%Delete Coach%' OR al.activity LIKE '%Update Coach%' THEN 1 END) as coach_management,
            COUNT(CASE WHEN al.activity LIKE '%Approve Subscription%' THEN 1 END) as subscription_management,
            COUNT(CASE WHEN al.activity LIKE '%Guest session%' THEN 1 END) as guest_management,
            COUNT(CASE WHEN al.activity LIKE '%Coach Assignment%' THEN 1 END) as coach_assignments,
            COUNT(CASE WHEN al.activity LIKE '%POS Sale%' OR al.activity LIKE '%Process POS%' THEN 1 END) as sales_activities,
            COUNT(CASE WHEN al.activity LIKE '%Add Product%' OR al.activity LIKE '%Stock updated%' THEN 1 END) as inventory_management,
            MAX(al.timestamp) as last_activity
        FROM activity_log al
        LEFT JOIN user u ON al.user_id = u.id
        LEFT JOIN usertype ut ON u.user_type_id = ut.id
        WHERE $dateCondition
          AND al.user_id IS NOT NULL
          AND u.user_type_id IN (1, 2)
        GROUP BY u.id, u.fname, u.lname, u.email, ut.type_name
        ORDER BY total_activities DESC
    ");

    $stmt->execute();
    $performance = $stmt->fetchAll();

    echo json_encode(["performance" => $performance]);
}

function getActivityDetails($pdo)
{
    $activityId = $_GET['activity_id'] ?? '';

    if (!$activityId) {
        http_response_code(400);
        echo json_encode(["error" => "Activity ID is required"]);
        return;
    }

    $stmt = $pdo->prepare("
        SELECT 
            al.id,
            al.user_id,
            al.activity,
            al.timestamp,
            COALESCE(u.fname, 'System') as fname,
            COALESCE(u.lname, 'User') as lname,
            COALESCE(u.email, 'system@cnergy.com') as email,
            COALESCE(ut.type_name, 'system') as user_type,
            CASE 
                WHEN al.activity LIKE '%Add Coach%' THEN 'Coach Management'
                WHEN al.activity LIKE '%Delete Coach%' THEN 'Coach Management'
                WHEN al.activity LIKE '%Update Coach%' THEN 'Coach Management'
                WHEN al.activity LIKE '%Approve Subscription%' THEN 'Subscription Management'
                WHEN al.activity LIKE '%Guest session%' THEN 'Guest Management'
                WHEN al.activity LIKE '%Coach Assignment%' THEN 'Coach Assignment'
                WHEN al.activity LIKE '%POS Sale%' OR al.activity LIKE '%Process POS%' THEN 'Sales'
                WHEN al.activity LIKE '%Add Product%' THEN 'Product Management'
                WHEN al.activity LIKE '%Stock updated%' THEN 'Inventory Management'
                WHEN al.activity LIKE '%Add Member%' OR al.activity LIKE '%Delete Member%' OR al.activity LIKE '%Update Member%' OR al.activity LIKE '%Member Check%' THEN 'User Management'
                ELSE 'Other'
            END as activity_category
        FROM activity_log al
        LEFT JOIN user u ON al.user_id = u.id
        LEFT JOIN usertype ut ON u.user_type_id = ut.id
        WHERE al.id = ?
    ");

    $stmt->execute([$activityId]);
    $activity = $stmt->fetch();

    if (!$activity) {
        http_response_code(404);
        echo json_encode(["error" => "Activity not found"]);
        return;
    }

    echo json_encode(["activity" => $activity]);
}

function getStaffSummary($pdo)
{
    try {
        // Get date filter from request (default to 'today')
        $dateFilter = $_GET['date_filter'] ?? 'today';
        $monthFilter = $_GET['month'] ?? 'all';
        $yearFilter = $_GET['year'] ?? 'all';
        $customDate = $_GET['custom_date'] ?? null;
        $dateFrom = $_GET['date_from'] ?? null;
        $dateTo = $_GET['date_to'] ?? null;

        $stats = getActivityStats($pdo, $dateFilter, $monthFilter, $yearFilter, $customDate, $dateFrom, $dateTo);

        // Get staff counts
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(DISTINCT u.id) as total_staff,
                COUNT(DISTINCT CASE WHEN u.user_type_id = 1 THEN u.id END) as total_admins,
                COUNT(DISTINCT CASE WHEN u.user_type_id = 2 THEN u.id END) as total_staff_members
            FROM user u
            WHERE u.user_type_id IN (1, 2)
        ");

        $stmt->execute();
        $staffCounts = $stmt->fetch();

        // Build date condition for most active staff based on filter
        $dateCondition = "";
        $params = [];
        $phTime = new DateTime('now', new DateTimeZone('Asia/Manila'));

        if ($dateFilter === 'custom' && !empty($customDate)) {
            $dateCondition = "DATE(al.timestamp) = ?";
            $params[] = $customDate;
        } else if ($dateFilter === 'range') {
            if (!empty($dateFrom)) {
                $dateCondition = "DATE(al.timestamp) >= ?";
                $params[] = $dateFrom;
            }
            if (!empty($dateTo)) {
                if ($dateCondition) {
                    $dateCondition .= " AND DATE(al.timestamp) <= ?";
                } else {
                    $dateCondition = "DATE(al.timestamp) <= ?";
                }
                $params[] = $dateTo;
            }
        } else if ($dateFilter !== 'all') {
            switch ($dateFilter) {
                case 'today':
                    $today = $phTime->format('Y-m-d');
                    $dateCondition = "DATE(al.timestamp) = ?";
                    $params[] = $today;
                    break;
                case 'week':
                    $weekStart = clone $phTime;
                    $weekStart->modify('-' . $phTime->format('w') . ' days')->setTime(0, 0, 0);
                    $dateCondition = "al.timestamp >= ?";
                    $params[] = $weekStart->format('Y-m-d H:i:s');
                    break;
                case 'month':
                    $month = $phTime->format('Y-m');
                    $dateCondition = "DATE_FORMAT(al.timestamp, '%Y-%m') = ?";
                    $params[] = $month;
                    break;
                case 'year':
                    $year = $phTime->format('Y');
                    $dateCondition = "YEAR(al.timestamp) = ?";
                    $params[] = $year;
                    break;
            }
        } else if ($monthFilter !== 'all' || $yearFilter !== 'all') {
            if ($monthFilter !== 'all' && $monthFilter !== '' && !empty($monthFilter)) {
                $dateCondition = "MONTH(al.timestamp) = ?";
                $params[] = (int) $monthFilter;
                if ($yearFilter !== 'all' && $yearFilter !== '' && !empty($yearFilter)) {
                    $dateCondition .= " AND YEAR(al.timestamp) = ?";
                    $params[] = (int) $yearFilter;
                }
            } else if ($yearFilter !== 'all' && $yearFilter !== '' && !empty($yearFilter)) {
                $dateCondition = "YEAR(al.timestamp) = ?";
                $params[] = (int) $yearFilter;
            }
        }

        // Get most active staff based on date filter
        $whereClause = $dateCondition ? "WHERE $dateCondition" : "WHERE 1=1";
        $whereClause .= " AND al.user_id IS NOT NULL AND u.user_type_id IN (1, 2)";
        $sql = "
            SELECT 
                CONCAT(u.fname, ' ', u.lname) as staff_name,
                COUNT(al.id) as activity_count
            FROM activity_log al
            LEFT JOIN user u ON al.user_id = u.id
            $whereClause
            GROUP BY u.id, u.fname, u.lname
            ORDER BY activity_count DESC
            LIMIT 1
        ";

        $stmt = $pdo->prepare($sql);
        if (!empty($params)) {
            $stmt->execute($params);
        } else {
            $stmt->execute();
        }
        $mostActive = $stmt->fetch();

        $summary = [
            "total_staff" => $staffCounts['total_staff'] ?? 0,
            "total_admins" => $staffCounts['total_admins'] ?? 0,
            "total_staff_members" => $staffCounts['total_staff_members'] ?? 0,
            "total_activities_today" => $stats['filtered_activities'] ?? 0,
            "activities_today" => $stats['filtered_activities'] ?? 0,
            "activities_this_week" => $stats['week_activities'] ?? 0,
            "activities_this_month" => $stats['month_activities'] ?? 0,
            "most_active_staff_today" => $mostActive ? $mostActive['staff_name'] : 'No activities',
            "most_active_count" => $mostActive ? $mostActive['activity_count'] : 0,
            "category_breakdown" => $stats['category_breakdown'] ?? [],
            "top_staff" => $stats['top_staff'] ?? [],
            "date_filter" => $dateFilter
        ];

        echo json_encode(["summary" => $summary]);
    } catch (Exception $e) {
        echo json_encode(["error" => "Failed to get staff summary: " . $e->getMessage()]);
    }
}

function getActivityStats($pdo, $dateFilter = 'today', $monthFilter = 'all', $yearFilter = 'all', $customDate = null, $dateFrom = null, $dateTo = null)
{
    try {
        // Get today's activities
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as today_activities
            FROM activity_log 
            WHERE DATE(timestamp) = CURDATE()
        ");
        $stmt->execute();
        $today = $stmt->fetch()['today_activities'];

        // Get this week's activities
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as week_activities
            FROM activity_log 
            WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
        ");
        $stmt->execute();
        $week = $stmt->fetch()['week_activities'];

        // Get this month's activities (ALWAYS current month, regardless of filter)
        // This is used for the "This Month" card which should always show current month's total
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as month_activities
            FROM activity_log 
            WHERE MONTH(timestamp) = MONTH(CURDATE()) AND YEAR(timestamp) = YEAR(CURDATE())
        ");
        $stmt->execute();
        $currentMonthActivities = $stmt->fetch()['month_activities'];

        // Calculate filtered activities based on date filter
        $filteredActivities = 0;
        $dateCondition = "";
        $params = [];
        $phTime = new DateTime('now', new DateTimeZone('Asia/Manila'));

        if ($dateFilter === 'custom' && !empty($customDate)) {
            $dateCondition = "DATE(timestamp) = ?";
            $params[] = $customDate;
        } else if ($dateFilter === 'range') {
            if (!empty($dateFrom)) {
                $dateCondition = "DATE(timestamp) >= ?";
                $params[] = $dateFrom;
            }
            if (!empty($dateTo)) {
                if ($dateCondition) {
                    $dateCondition .= " AND DATE(timestamp) <= ?";
                } else {
                    $dateCondition = "DATE(timestamp) <= ?";
                }
                $params[] = $dateTo;
            }
        } else if ($dateFilter !== 'all') {
            switch ($dateFilter) {
                case 'today':
                    $todayDate = $phTime->format('Y-m-d');
                    $dateCondition = "DATE(timestamp) = ?";
                    $params[] = $todayDate;
                    break;
                case 'week':
                    $weekStart = clone $phTime;
                    $weekStart->modify('-' . $phTime->format('w') . ' days')->setTime(0, 0, 0);
                    $dateCondition = "timestamp >= ?";
                    $params[] = $weekStart->format('Y-m-d H:i:s');
                    break;
                case 'month':
                    $filterMonth = $phTime->format('Y-m');
                    $dateCondition = "DATE_FORMAT(timestamp, '%Y-%m') = ?";
                    $params[] = $filterMonth;
                    break;
                case 'year':
                    $year = $phTime->format('Y');
                    $dateCondition = "YEAR(timestamp) = ?";
                    $params[] = $year;
                    break;
            }
        } else if ($monthFilter !== 'all' || $yearFilter !== 'all') {
            if ($monthFilter !== 'all' && $monthFilter !== '' && !empty($monthFilter)) {
                $dateCondition = "MONTH(timestamp) = ?";
                $params[] = (int) $monthFilter;
                if ($yearFilter !== 'all' && $yearFilter !== '' && !empty($yearFilter)) {
                    $dateCondition .= " AND YEAR(timestamp) = ?";
                    $params[] = (int) $yearFilter;
                }
            } else if ($yearFilter !== 'all' && $yearFilter !== '' && !empty($yearFilter)) {
                $dateCondition = "YEAR(timestamp) = ?";
                $params[] = (int) $yearFilter;
            }
        }

        if ($dateCondition) {
            $whereClause = "WHERE $dateCondition";
            $sql = "SELECT COUNT(*) as filtered_count FROM activity_log $whereClause";
            $stmt = $pdo->prepare($sql);
            if (!empty($params)) {
                $stmt->execute($params);
            } else {
                $stmt->execute();
            }
            $filteredActivities = $stmt->fetch()['filtered_count'];
        } else {
            // If no date condition, check the filter type
            if ($dateFilter === 'all') {
                // Count all activities when filter is 'all'
                $stmt = $pdo->prepare("SELECT COUNT(*) as all_count FROM activity_log");
                $stmt->execute();
                $filteredActivities = $stmt->fetch()['all_count'];
            } else {
                // Default to today for other cases
                $filteredActivities = $today;
            }
        }

        // Activities by type
        $stats['category_breakdown'] = [
            ['category' => 'All Activities', 'count' => $currentMonthActivities]
        ];

        // Get top staff today
        $stmt = $pdo->prepare("
            SELECT 
                CONCAT(u.fname, ' ', u.lname) as staff_name,
                COUNT(al.id) as activity_count
            FROM activity_log al
            LEFT JOIN user u ON al.user_id = u.id
            WHERE DATE(al.timestamp) = CURDATE()
              AND al.user_id IS NOT NULL
              AND u.user_type_id IN (1, 2)
            GROUP BY u.id, u.fname, u.lname
            ORDER BY activity_count DESC
            LIMIT 5
        ");
        $stmt->execute();
        $topStaff = $stmt->fetchAll();

        return [
            'today_activities' => $today,
            'week_activities' => $week,
            'month_activities' => $currentMonthActivities,
            'filtered_activities' => $filteredActivities,
            'category_breakdown' => $stats['category_breakdown'],
            'top_staff' => $topStaff
        ];
    } catch (Exception $e) {
        error_log('Error getting activity stats: ' . $e->getMessage());
        return [
            'today_activities' => 0,
            'week_activities' => 0,
            'month_activities' => 0,
            'filtered_activities' => 0,
            'category_breakdown' => [],
            'top_staff' => []
        ];
    }
}

function getStaffList($pdo)
{
    try {
        $stmt = $pdo->prepare("
            SELECT 
                u.id,
                u.fname,
                u.lname,
                u.email,
                ut.type_name as user_type
            FROM user u
            LEFT JOIN usertype ut ON u.user_type_id = ut.id
            WHERE u.user_type_id IN (1, 2)
            ORDER BY u.fname, u.lname
        ");

        $stmt->execute();
        $staff = $stmt->fetchAll();

        echo json_encode(["staff" => $staff]);
    } catch (Exception $e) {
        echo json_encode(["error" => "Failed to get staff list: " . $e->getMessage()]);
    }
}
?>