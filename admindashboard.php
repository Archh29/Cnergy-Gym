<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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

    // Get time period parameter
    $period = $_GET['period'] ?? 'today';

    // Define date conditions based on period
    // Note: For 'today' revenue, we convert UTC to Philippine time (+8 hours)
    $dateConditions = [
        'today' => [
            'sales' => "DATE(DATE_ADD(sale_date, INTERVAL 8 HOUR)) = CURDATE()",
            'attendance' => "DATE(check_in) = CURDATE()",
            'membership' => "DATE(s.start_date) = CURDATE()",
            'revenue' => "DATE(DATE_ADD(sale_date, INTERVAL 8 HOUR)) = CURDATE()"
        ],
        'week' => [
            'sales' => "sale_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)",
            'attendance' => "check_in >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)",
            'membership' => "s.start_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)",
            'revenue' => "sale_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)"
        ],
        'month' => [
            'sales' => "MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())",
            'attendance' => "MONTH(check_in) = MONTH(CURDATE()) AND YEAR(check_in) = YEAR(CURDATE())",
            'membership' => "MONTH(s.start_date) = MONTH(CURDATE()) AND YEAR(s.start_date) = YEAR(CURDATE())",
            'revenue' => "MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())"
        ],
        'year' => [
            'sales' => "YEAR(sale_date) = YEAR(CURDATE())",
            'attendance' => "YEAR(check_in) = YEAR(CURDATE())",
            'membership' => "YEAR(s.start_date) = YEAR(CURDATE())",
            'revenue' => "YEAR(sale_date) = YEAR(CURDATE())"
        ]
    ];

    $conditions = $dateConditions[$period] ?? $dateConditions['today'];

    // --- SUMMARY STATS ---
    try {
        // Get current period data
        $currentStats = [
            "members" => [
                "active" => $pdo->query("SELECT COUNT(DISTINCT s.user_id) FROM `subscription` s WHERE s.plan_id = 1 AND s.end_date >= CURDATE()")->fetchColumn(),
                "total" => $pdo->query("SELECT COUNT(DISTINCT s.user_id) FROM `subscription` s WHERE s.plan_id = 1")->fetchColumn(),
            ],
            "totalUsers" => [
                "active" => $pdo->query("SELECT COUNT(*) FROM `user` WHERE account_status='approved'")->fetchColumn(),
                "total" => $pdo->query("SELECT COUNT(*) FROM `user`")->fetchColumn(),
            ],
            "salesToday" => $pdo->query("SELECT IFNULL(SUM(total_amount),0) FROM `sales` WHERE {$conditions['sales']}")->fetchColumn(),
            "activeSubscriptions" => $pdo->query("SELECT COUNT(*) FROM `subscription` WHERE plan_id IN (2, 3) AND end_date >= CURDATE()")->fetchColumn(),
            "checkinsToday" => $pdo->query("SELECT COUNT(*) FROM `attendance` WHERE {$conditions['attendance']}")->fetchColumn(),
            "upcomingExpirations" => $pdo->query("SELECT COUNT(*) FROM `subscription` WHERE end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)")->fetchColumn(),
        ];

        // Get previous period data for trend calculation
        $previousStats = [
            "members" => [
                "active" => $pdo->query("SELECT COUNT(DISTINCT s.user_id) FROM `subscription` s WHERE s.plan_id = 1 AND s.end_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND s.end_date < CURDATE()")->fetchColumn(),
                "total" => $pdo->query("SELECT COUNT(DISTINCT s.user_id) FROM `subscription` s WHERE s.plan_id = 1 AND s.start_date < DATE_SUB(CURDATE(), INTERVAL 1 DAY)")->fetchColumn(),
            ],
            "totalUsers" => [
                "active" => $pdo->query("SELECT COUNT(*) FROM `user` WHERE account_status='approved'")->fetchColumn(),
                "total" => $pdo->query("SELECT COUNT(*) FROM `user`")->fetchColumn(),
            ],
            "salesToday" => $pdo->query("SELECT IFNULL(SUM(total_amount),0) FROM `sales` WHERE DATE(DATE_ADD(sale_date, INTERVAL 8 HOUR)) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)")->fetchColumn(),
            "activeSubscriptions" => $pdo->query("SELECT COUNT(*) FROM `subscription` WHERE plan_id IN (2, 3) AND end_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND end_date < CURDATE()")->fetchColumn(),
            "checkinsToday" => $pdo->query("SELECT COUNT(*) FROM `attendance` WHERE DATE(check_in) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)")->fetchColumn(),
            "upcomingExpirations" => $pdo->query("SELECT COUNT(*) FROM `subscription` WHERE end_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(DATE_SUB(CURDATE(), INTERVAL 1 DAY), INTERVAL 7 DAY)")->fetchColumn(),
        ];

        // Calculate trends
        $summaryStats = [];
        foreach ($currentStats as $key => $current) {
            if (is_array($current)) {
                $summaryStats[$key] = [];
                foreach ($current as $subKey => $currentValue) {
                    $previousValue = $previousStats[$key][$subKey] ?? 0;
                    $trend = $previousValue > 0 ? (($currentValue - $previousValue) / $previousValue) * 100 : 0;
                    $summaryStats[$key][$subKey] = [
                        'value' => $currentValue,
                        'trend' => round($trend, 1),
                        'isPositive' => $trend >= 0
                    ];
                }
            } else {
                $previousValue = $previousStats[$key] ?? 0;
                $trend = $previousValue > 0 ? (($current - $previousValue) / $previousValue) * 100 : 0;
                $summaryStats[$key] = [
                    'value' => $current,
                    'trend' => round($trend, 1),
                    'isPositive' => $trend >= 0
                ];
            }
        }
    } catch (PDOException $e) {
        throw new Exception("Error in summary stats: " . $e->getMessage());
    }

    // --- MEMBERSHIP DATA ---
    $membershipQuery = "";
    switch ($period) {
        case 'today':
            $membershipQuery = "
                SELECT DATE_FORMAT(s.start_date,'%H:00') AS name, COUNT(DISTINCT s.user_id) AS members
                FROM `subscription` s
                WHERE s.plan_id = 1 AND {$conditions['membership']}
                GROUP BY HOUR(s.start_date)
                ORDER BY s.start_date ASC
            ";
            break;
        case 'week':
            $membershipQuery = "
                SELECT DATE_FORMAT(s.start_date,'%a') AS name, COUNT(DISTINCT s.user_id) AS members
                FROM `subscription` s
                WHERE s.plan_id = 1 AND {$conditions['membership']}
                GROUP BY DAYOFWEEK(s.start_date)
                ORDER BY s.start_date ASC
            ";
            break;
        case 'month':
            $membershipQuery = "
                SELECT DATE_FORMAT(s.start_date,'%d') AS name, COUNT(DISTINCT s.user_id) AS members
                FROM `subscription` s
                WHERE s.plan_id = 1 AND {$conditions['membership']}
                GROUP BY DAY(s.start_date)
                ORDER BY s.start_date ASC
            ";
            break;
        case 'year':
            $membershipQuery = "
                SELECT DATE_FORMAT(s.start_date,'%b') AS name, COUNT(DISTINCT s.user_id) AS members
                FROM `subscription` s
                WHERE s.plan_id = 1 AND {$conditions['membership']}
                GROUP BY MONTH(s.start_date)
                ORDER BY s.start_date ASC
            ";
            break;
    }
    try {
        $membershipData = $pdo->query($membershipQuery)->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        throw new Exception("Error in membership data query: " . $e->getMessage() . " Query: " . $membershipQuery);
    }

    // If no data for today, provide some sample data for demonstration
    if (empty($membershipData) && $period === 'today') {
        $membershipData = [
            ['name' => '00:00', 'members' => 0],
            ['name' => '06:00', 'members' => 0],
            ['name' => '12:00', 'members' => 0],
            ['name' => '18:00', 'members' => 0]
        ];
    }

    // --- REVENUE DATA ---
    $revenueQuery = "";
    switch ($period) {
        case 'today':
            // CRITICAL FIX: Convert UTC time to Philippine time (+8 hours) before formatting
            // This ensures the hour displayed matches Philippine timezone
            $revenueQuery = "
                SELECT DATE_FORMAT(DATE_ADD(sale_date, INTERVAL 8 HOUR),'%H:00') AS name, IFNULL(SUM(total_amount),0) AS revenue
                FROM `sales`
                WHERE DATE(DATE_ADD(sale_date, INTERVAL 8 HOUR)) = CURDATE()
                GROUP BY HOUR(DATE_ADD(sale_date, INTERVAL 8 HOUR))
                ORDER BY DATE_ADD(sale_date, INTERVAL 8 HOUR) ASC
            ";
            break;
        case 'week':
            $revenueQuery = "
                SELECT DATE_FORMAT(sale_date,'%a') AS name, IFNULL(SUM(total_amount),0) AS revenue
                FROM `sales`
                WHERE {$conditions['revenue']}
                GROUP BY DAYOFWEEK(sale_date)
                ORDER BY sale_date ASC
            ";
            break;
        case 'month':
            $revenueQuery = "
                SELECT DATE_FORMAT(sale_date,'%d') AS name, IFNULL(SUM(total_amount),0) AS revenue
                FROM `sales`
                WHERE {$conditions['revenue']}
                GROUP BY DAY(sale_date)
                ORDER BY sale_date ASC
            ";
            break;
        case 'year':
            $revenueQuery = "
                SELECT DATE_FORMAT(sale_date,'%b') AS name, IFNULL(SUM(total_amount),0) AS revenue
                FROM `sales`
                WHERE {$conditions['revenue']}
                GROUP BY MONTH(sale_date)
                ORDER BY sale_date ASC
            ";
            break;
    }
    try {
        $revenueData = $pdo->query($revenueQuery)->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        throw new Exception("Error in revenue data query: " . $e->getMessage() . " Query: " . $revenueQuery);
    }

    // If no data for today, provide some sample data for demonstration
    if (empty($revenueData) && $period === 'today') {
        $revenueData = [
            ['name' => '00:00', 'revenue' => 0],
            ['name' => '06:00', 'revenue' => 0],
            ['name' => '12:00', 'revenue' => 0],
            ['name' => '18:00', 'revenue' => 0]
        ];
    }

    // --- RETURN JSON ---
    echo json_encode([
        "success" => true,
        "summaryStats" => $summaryStats,
        "membershipData" => $membershipData,
        "revenueData" => $revenueData
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database error: " . $e->getMessage(),
        "file" => $e->getFile(),
        "line" => $e->getLine(),
        "trace" => $e->getTraceAsString(),
        "debug_info" => [
            "period" => $period ?? 'not_set',
            "conditions" => $conditions ?? 'not_set'
        ]
    ]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "General error: " . $e->getMessage(),
        "file" => $e->getFile(),
        "line" => $e->getLine(),
        "trace" => $e->getTraceAsString(),
        "debug_info" => [
            "period" => $period ?? 'not_set',
            "conditions" => $conditions ?? 'not_set'
        ]
    ]);
    exit();
}
