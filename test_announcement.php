<?php
// Test file for the announcement email system
// This file demonstrates how to use the announcement system

// Include the announcement email service
require_once 'announcement_email_system.php';

// Test data
$testAnnouncements = [
    [
        'title' => 'Gym Maintenance Scheduled',
        'message' => 'We will be performing routine maintenance on our equipment this Saturday from 6 AM to 12 PM. The gym will remain open during this time, but some equipment may be temporarily unavailable. We apologize for any inconvenience.',
        'type' => 'maintenance',
        'admin_id' => 1
    ],
    [
        'title' => 'New Group Fitness Classes',
        'message' => 'We are excited to announce new group fitness classes starting next week! Join us for Yoga, Pilates, and High-Intensity Interval Training sessions. Classes are included with your membership.',
        'type' => 'promotion',
        'admin_id' => 1
    ],
    [
        'title' => 'Welcome to CNERGY GYM!',
        'message' => 'Thank you for being a valued member of our fitness community. We are committed to providing you with the best fitness experience possible.',
        'type' => 'general',
        'admin_id' => 1
    ]
];

// Function to test announcement sending
function testAnnouncement($announcementData, $sendToAll = true, $userTypes = ['customer']) {
    echo "<h3>Testing: " . $announcementData['title'] . "</h3>";
    echo "<p><strong>Type:</strong> " . $announcementData['type'] . "</p>";
    echo "<p><strong>Message:</strong> " . substr($announcementData['message'], 0, 100) . "...</p>";
    
    $announcementService = new AnnouncementEmailService();
    
    try {
        if ($sendToAll) {
            $result = $announcementService->sendAnnouncementToAllUsers(
                $announcementData['title'],
                $announcementData['message'],
                $announcementData['type'],
                $announcementData['admin_id']
            );
        } else {
            $result = $announcementService->sendAnnouncementToUserTypes(
                $announcementData['title'],
                $announcementData['message'],
                $userTypes,
                $announcementData['type'],
                $announcementData['admin_id']
            );
        }
        
        echo "<div style='background-color: " . ($result['success'] ? '#d4edda' : '#f8d7da') . "; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
        echo "<p><strong>Result:</strong> " . ($result['success'] ? 'SUCCESS' : 'FAILED') . "</p>";
        echo "<p><strong>Message:</strong> " . $result['message'] . "</p>";
        
        if (isset($result['results'])) {
            echo "<p><strong>Emails Sent:</strong> " . $result['results']['emails_sent'] . "</p>";
            echo "<p><strong>Emails Failed:</strong> " . $result['results']['emails_failed'] . "</p>";
            echo "<p><strong>Total Users:</strong> " . $result['results']['total_users'] . "</p>";
        }
        echo "</div>";
        
    } catch (Exception $e) {
        echo "<div style='background-color: #f8d7da; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
        echo "<p><strong>Error:</strong> " . $e->getMessage() . "</p>";
        echo "</div>";
    }
    
    echo "<hr>";
}

// HTML output
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CNERGY GYM - Announcement Email System Test</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #FF6B35;
            text-align: center;
            margin-bottom: 30px;
        }
        h2 {
            color: #2c3e50;
            border-bottom: 2px solid #FF6B35;
            padding-bottom: 10px;
        }
        .test-section {
            margin: 20px 0;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .btn {
            background: #FF6B35;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
            text-decoration: none;
            display: inline-block;
        }
        .btn:hover {
            background: #FF8E53;
        }
        .info {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏋️ CNERGY GYM - Announcement Email System Test</h1>
        
        <div class="info">
            <h3>System Information</h3>
            <p><strong>Email Service:</strong> PHP Built-in mail() function</p>
            <p><strong>From Email:</strong> cnergyfitnessgym@cnergy.site</p>
            <p><strong>Database:</strong> u773938685_cnergydb</p>
            <p><strong>Test Mode:</strong> This will send real emails to all users in the database</p>
        </div>

        <h2>Test Announcements</h2>
        <p>Click the buttons below to test different types of announcements:</p>

        <div class="test-section">
            <h3>Test 1: Send to All Users</h3>
            <p>This will send the announcement to ALL user types (admin, staff, coach, customer) in the database.</p>
            <a href="?test=all" class="btn">Test Send to All Users</a>
        </div>

        <div class="test-section">
            <h3>Test 2: Send to Specific User Types</h3>
            <p>This will send the announcement only to customers.</p>
            <a href="?test=customers" class="btn">Test Send to Customers Only</a>
        </div>

        <div class="test-section">
            <h3>Test 3: Send to Staff and Customers</h3>
            <p>This will send the announcement to both staff and customers.</p>
            <a href="?test=staff_customers" class="btn">Test Send to Staff & Customers</a>
        </div>

        <?php
        if (isset($_GET['test'])) {
            echo "<h2>Test Results</h2>";
            
            switch ($_GET['test']) {
                case 'all':
                    echo "<h3>Testing: Send to All Users</h3>";
                    foreach ($testAnnouncements as $announcement) {
                        testAnnouncement($announcement, true);
                    }
                    break;
                    
                case 'customers':
                    echo "<h3>Testing: Send to Customers Only</h3>";
                    foreach ($testAnnouncements as $announcement) {
                        testAnnouncement($announcement, false, ['customer']);
                    }
                    break;
                    
                case 'staff_customers':
                    echo "<h3>Testing: Send to Staff & Customers</h3>";
                    foreach ($testAnnouncements as $announcement) {
                        testAnnouncement($announcement, false, ['staff', 'customer']);
                    }
                    break;
            }
        }
        ?>

        <div class="info">
            <h3>Usage Instructions</h3>
            <p><strong>For Frontend Integration:</strong></p>
            <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto;">
// Example POST request to create announcement with email
fetch('/announcement.php', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        title: 'Gym Maintenance Scheduled',
        content: 'We will be performing routine maintenance...',
        status: 'active',
        priority: 'high',
        send_email: true,
        admin_id: 1,
        announcement_type: 'maintenance',
        send_to_all: true,
        user_types: ['customer', 'staff']
    })
})
.then(response => response.json())
.then(data => {
    console.log('Announcement created:', data);
    if (data.email_result) {
        console.log('Email results:', data.email_result);
    }
});
            </pre>
        </div>

        <div class="info">
            <h3>Available Announcement Types</h3>
            <ul>
                <li><strong>general</strong> - General announcements</li>
                <li><strong>maintenance</strong> - Maintenance notices</li>
                <li><strong>promotion</strong> - Promotional offers</li>
                <li><strong>emergency</strong> - Emergency notices</li>
                <li><strong>event</strong> - Event announcements</li>
                <li><strong>policy</strong> - Policy updates</li>
            </ul>
        </div>

        <div class="info">
            <h3>Available User Types</h3>
            <ul>
                <li><strong>admin</strong> - Administrators</li>
                <li><strong>staff</strong> - Staff members</li>
                <li><strong>coach</strong> - Coaches</li>
                <li><strong>customer</strong> - Customers/Members</li>
            </ul>
        </div>
    </div>
</body>
</html>
