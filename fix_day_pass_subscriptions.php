<?php
// Set timezone to Philippines
date_default_timezone_set('Asia/Manila');

// Database configuration
$host = "localhost";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";

// Connect to database
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    // Set MySQL timezone to Philippines
    $pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

echo "Fixing Day Pass subscriptions...\n\n";

try {
    // Find all subscriptions with Day Pass plans (plans with duration_days > 0)
    $stmt = $pdo->prepare("
        SELECT s.id, s.start_date, s.end_date, p.id as plan_id, p.plan_name, p.duration_days, p.duration_months
        FROM subscription s
        JOIN member_subscription_plan p ON s.plan_id = p.id
        WHERE (p.duration_days > 0 OR LOWER(p.plan_name) LIKE '%day pass%' OR LOWER(p.plan_name) LIKE '%daypass%')
        AND s.start_date IS NOT NULL
    ");
    $stmt->execute();
    $subscriptions = $stmt->fetchAll();

    $fixed = 0;
    $errors = [];

    foreach ($subscriptions as $sub) {
        try {
            $start_date = new DateTime($sub['start_date']);
            $end_date = clone $start_date;

            // Use duration_days if available, otherwise default to 1 day for Day Pass
            $duration_days = !empty($sub['duration_days']) && $sub['duration_days'] > 0
                ? $sub['duration_days']
                : 1;

            $end_date->add(new DateInterval('P' . $duration_days . 'D'));
            $new_end_date = $end_date->format('Y-m-d');

            // Only update if the end_date is different
            if ($new_end_date !== $sub['end_date']) {
                echo "Fixing Subscription ID {$sub['id']} ({$sub['plan_name']}):\n";
                echo "  Start Date: {$sub['start_date']}\n";
                echo "  Old End Date: {$sub['end_date']}\n";
                echo "  New End Date: {$new_end_date}\n";
                echo "  Duration: {$duration_days} day(s)\n\n";

                $updateStmt = $pdo->prepare("UPDATE subscription SET end_date = ? WHERE id = ?");
                $updateStmt->execute([$new_end_date, $sub['id']]);
                $fixed++;
            } else {
                echo "Subscription ID {$sub['id']} ({$sub['plan_name']}) is already correct.\n";
            }
        } catch (Exception $e) {
            $errorMsg = "Subscription ID {$sub['id']}: " . $e->getMessage();
            echo "ERROR: $errorMsg\n";
            $errors[] = $errorMsg;
        }
    }

    echo "\n" . str_repeat("=", 50) . "\n";
    echo "Summary:\n";
    echo "Total checked: " . count($subscriptions) . "\n";
    echo "Fixed: $fixed\n";
    echo "Errors: " . count($errors) . "\n";

    if (!empty($errors)) {
        echo "\nErrors:\n";
        foreach ($errors as $error) {
            echo "  - $error\n";
        }
    }

    echo "\nDone!\n";

} catch (Exception $e) {
    echo "ERROR: Failed to fix Day Pass subscriptions: " . $e->getMessage() . "\n";
    exit(1);
}
?>