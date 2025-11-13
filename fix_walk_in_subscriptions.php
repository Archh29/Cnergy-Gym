<?php
/**
 * Fix Walk In Subscriptions - Update end_date for existing Walk In subscriptions
 * This script corrects Walk In subscriptions that have incorrect end_date values (1 month instead of same day 9 PM)
 */

// Database configuration - Remote Database
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
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage() . "\n");
}

// Set timezone to Philippines
date_default_timezone_set('Asia/Manila');

echo "=== Fix Walk In Subscriptions ===\n\n";

// Find all Walk In subscriptions (plan_id = 6)
$stmt = $pdo->prepare("
    SELECT s.id, s.user_id, s.plan_id, s.start_date, s.end_date, 
           p.plan_name, u.fname, u.lname
    FROM subscription s
    JOIN member_subscription_plan p ON s.plan_id = p.id
    JOIN user u ON s.user_id = u.id
    WHERE s.plan_id = 6
    ORDER BY s.id DESC
");

$stmt->execute();
$walkInSubscriptions = $stmt->fetchAll();

if (empty($walkInSubscriptions)) {
    echo "No Walk In subscriptions found.\n";
    exit;
}

echo "Found " . count($walkInSubscriptions) . " Walk In subscription(s).\n\n";

$fixedCount = 0;
$skippedCount = 0;

foreach ($walkInSubscriptions as $subscription) {
    $subscriptionId = $subscription['id'];
    $startDate = $subscription['start_date'];
    $currentEndDate = $subscription['end_date'];
    $userName = $subscription['fname'] . ' ' . $subscription['lname'];
    
    // Calculate correct end_date (9 PM on the same day)
    try {
        $start_date_obj = new DateTime($startDate, new DateTimeZone('Asia/Manila'));
        $end_date_obj = clone $start_date_obj;
        $end_date_obj->setTime(21, 0, 0); // Set to 9 PM (21:00)
        $correctEndDate = $end_date_obj->format('Y-m-d H:i:s');
        
        // Check if end_date needs to be fixed
        // If current end_date is more than 1 day from start_date, it's likely wrong
        $currentEndDateObj = new DateTime($currentEndDate, new DateTimeZone('Asia/Manila'));
        $daysDiff = $start_date_obj->diff($currentEndDateObj)->days;
        
        if ($daysDiff > 1 || $currentEndDate !== $correctEndDate) {
            // Update the subscription
            $updateStmt = $pdo->prepare("UPDATE subscription SET end_date = ? WHERE id = ?");
            $updateStmt->execute([$correctEndDate, $subscriptionId]);
            
            echo "✓ Fixed subscription ID {$subscriptionId} for {$userName}\n";
            echo "  Start: {$startDate}\n";
            echo "  Old End: {$currentEndDate}\n";
            echo "  New End: {$correctEndDate}\n\n";
            
            $fixedCount++;
        } else {
            echo "- Skipped subscription ID {$subscriptionId} for {$userName} (already correct)\n";
            $skippedCount++;
        }
    } catch (Exception $e) {
        echo "✗ Error processing subscription ID {$subscriptionId}: " . $e->getMessage() . "\n\n";
    }
}

echo "\n=== Summary ===\n";
echo "Fixed: {$fixedCount} subscription(s)\n";
echo "Skipped: {$skippedCount} subscription(s) (already correct)\n";
echo "Total: " . count($walkInSubscriptions) . " subscription(s)\n";

