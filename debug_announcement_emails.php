<?php
// Debug script for announcement email system
// This will help us see what's happening with email delivery

require_once 'announcement_email_system.php';

// Database connection (same as announcement.php)
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
    die("Database connection failed: " . $e->getMessage());
}

echo "<h1>CNERGY GYM - Announcement Email Debug</h1>";

// Test 1: Check how many users are in the database
echo "<h2>1. Database User Check</h2>";
$query = "
    SELECT 
        u.id,
        u.email,
        u.fname,
        u.lname,
        u.user_type_id,
        ut.type_name as user_type,
        u.account_status
    FROM user u
    LEFT JOIN usertype ut ON u.user_type_id = ut.id
    WHERE u.account_status = 'approved'
    ORDER BY u.fname, u.lname
";

$stmt = $pdo->prepare($query);
$stmt->execute();
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<p><strong>Total approved users found:</strong> " . count($users) . "</p>";

if (count($users) > 0) {
    echo "<h3>User List:</h3>";
    echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
    echo "<tr><th>ID</th><th>Name</th><th>Email</th><th>User Type</th><th>Status</th></tr>";
    
    foreach ($users as $user) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($user['id']) . "</td>";
        echo "<td>" . htmlspecialchars($user['fname'] . ' ' . $user['lname']) . "</td>";
        echo "<td>" . htmlspecialchars($user['email']) . "</td>";
        echo "<td>" . htmlspecialchars($user['user_type']) . "</td>";
        echo "<td>" . htmlspecialchars($user['account_status']) . "</td>";
        echo "</tr>";
    }
    echo "</table>";
} else {
    echo "<p style='color: red;'><strong>No approved users found!</strong></p>";
}

// Test 2: Test email service
echo "<h2>2. Email Service Test</h2>";
$announcementService = new AnnouncementEmailService();

// Test with a simple announcement
$testSubject = "Test Announcement - " . date('Y-m-d H:i:s');
$testMessage = "This is a test announcement to check email delivery. If you receive this, the system is working correctly!";

echo "<p><strong>Test Subject:</strong> " . htmlspecialchars($testSubject) . "</p>";
echo "<p><strong>Test Message:</strong> " . htmlspecialchars($testMessage) . "</p>";

echo "<p><strong>Sending test announcement...</strong></p>";

$result = $announcementService->sendAnnouncementToAllUsers(
    $testSubject,
    $testMessage,
    'general',
    1 // Admin ID
);

echo "<h3>Email Sending Results:</h3>";
echo "<pre>" . print_r($result, true) . "</pre>";

// Test 3: Check email configuration
echo "<h2>3. Email Configuration Check</h2>";
echo "<p><strong>PHP Mail Function:</strong> " . (function_exists('mail') ? 'Available' : 'Not Available') . "</p>";
echo "<p><strong>PHP Version:</strong> " . phpversion() . "</p>";
echo "<p><strong>Server:</strong> " . $_SERVER['SERVER_SOFTWARE'] . "</p>";

// Test 4: Check recent activity logs
echo "<h2>4. Recent Activity Logs</h2>";
$query = "SELECT * FROM activity_log WHERE activity LIKE '%Announcement%' ORDER BY timestamp DESC LIMIT 10";
$stmt = $pdo->prepare($query);
$stmt->execute();
$activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($activities) > 0) {
    echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
    echo "<tr><th>ID</th><th>User ID</th><th>Activity</th><th>Timestamp</th></tr>";
    
    foreach ($activities as $activity) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($activity['id']) . "</td>";
        echo "<td>" . htmlspecialchars($activity['user_id']) . "</td>";
        echo "<td>" . htmlspecialchars($activity['activity']) . "</td>";
        echo "<td>" . htmlspecialchars($activity['timestamp']) . "</td>";
        echo "</tr>";
    }
    echo "</table>";
} else {
    echo "<p>No recent announcement activities found.</p>";
}

echo "<h2>5. Recommendations</h2>";
echo "<ul>";
echo "<li><strong>Check Error Logs:</strong> Look at your server's error logs for any email-related errors</li>";
echo "<li><strong>Email Server Configuration:</strong> Ensure your server can send emails to external domains</li>";
echo "<li><strong>Spam Filters:</strong> Check if emails are being caught by spam filters</li>";
echo "<li><strong>Email Provider Limits:</strong> Some email providers limit bulk emails</li>";
echo "<li><strong>DNS Records:</strong> Ensure proper SPF, DKIM, and DMARC records are set up</li>";
echo "</ul>";

echo "<p><strong>Next Steps:</strong></p>";
echo "<ol>";
echo "<li>Run this debug script after creating an announcement</li>";
echo "<li>Check the 'Email Sending Results' section to see how many emails were sent</li>";
echo "<li>Check your server's error logs for any email delivery issues</li>";
echo "<li>Test with different email providers (Gmail, Yahoo, Outlook, etc.)</li>";
echo "</ol>";
?>

