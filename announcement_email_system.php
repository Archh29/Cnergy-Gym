<?php
// Announcement Email System for CNERGY GYM
// Sends announcements to all users when admin creates them

class AnnouncementEmailService {
    private $isConfigured = false;
    private $fromEmail = 'cnergyfitnessgym@cnergy.site';
    private $fromName = 'CNERGY GYM';
    
    public function __construct() {
        $this->isConfigured = true; // Always configured since we use built-in mail()
        error_log("AnnouncementEmailService initialized with built-in mail() function");
    }
    
    /**
     * Send announcement email to all users
     * @param string $subject - Announcement subject
     * @param string $message - Announcement message
     * @param string $announcementType - Type of announcement (general, maintenance, promotion, etc.)
     * @param int $adminId - ID of admin who created the announcement
     * @return array - Success/failure response
     */
    public function sendAnnouncementToAllUsers($subject, $message, $announcementType = 'general', $adminId = null) {
        if (!$this->isConfigured) {
            return ['success' => false, 'message' => 'Email service not properly configured'];
        }
        
        try {
            // Get all users from database
            $users = $this->getAllUsers();
            
            if (empty($users)) {
                return ['success' => false, 'message' => 'No users found in database'];
            }
            
            $results = [
                'total_users' => count($users),
                'emails_sent' => 0,
                'emails_failed' => 0,
                'details' => []
            ];
            
            // Send email to each user
            foreach ($users as $user) {
                $emailResult = $this->sendAnnouncementEmail(
                    $user['email'],
                    $user['fname'] . ' ' . $user['lname'],
                    $subject,
                    $message,
                    $announcementType,
                    $user['user_type']
                );
                
                if ($emailResult['success']) {
                    $results['emails_sent']++;
                    $results['details'][] = [
                        'user_id' => $user['id'],
                        'email' => $user['email'],
                        'name' => $user['fname'] . ' ' . $user['lname'],
                        'user_type' => $user['user_type'],
                        'status' => 'sent'
                    ];
                } else {
                    $results['emails_failed']++;
                    $results['details'][] = [
                        'user_id' => $user['id'],
                        'email' => $user['email'],
                        'name' => $user['fname'] . ' ' . $user['lname'],
                        'user_type' => $user['user_type'],
                        'status' => 'failed',
                        'error' => $emailResult['message']
                    ];
                }
            }
            
            // Log the announcement activity
            $this->logAnnouncementActivity($adminId, $subject, $results);
            
            error_log("Announcement sent to " . $results['emails_sent'] . " users, " . $results['emails_failed'] . " failed");
            
            return [
                'success' => true,
                'message' => 'Announcement sent to ' . $results['emails_sent'] . ' users',
                'results' => $results
            ];
            
        } catch (Exception $e) {
            error_log("Announcement sending failed: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to send announcement: ' . $e->getMessage()];
        }
    }
    
    /**
     * Send announcement email to specific user types
     * @param string $subject - Announcement subject
     * @param string $message - Announcement message
     * @param array $userTypes - Array of user types to send to (e.g., ['customer', 'staff'])
     * @param string $announcementType - Type of announcement
     * @param int $adminId - ID of admin who created the announcement
     * @return array - Success/failure response
     */
    public function sendAnnouncementToUserTypes($subject, $message, $userTypes = ['admin', 'staff', 'coach', 'customer'], $announcementType = 'general', $adminId = null) {
        if (!$this->isConfigured) {
            return ['success' => false, 'message' => 'Email service not properly configured'];
        }
        
        try {
            // Get users by type from database
            $users = $this->getUsersByType($userTypes);
            
            if (empty($users)) {
                return ['success' => false, 'message' => 'No users found for specified types'];
            }
            
            $results = [
                'total_users' => count($users),
                'emails_sent' => 0,
                'emails_failed' => 0,
                'details' => []
            ];
            
            // Send email to each user
            foreach ($users as $user) {
                $emailResult = $this->sendAnnouncementEmail(
                    $user['email'],
                    $user['fname'] . ' ' . $user['lname'],
                    $subject,
                    $message,
                    $announcementType,
                    $user['user_type']
                );
                
                if ($emailResult['success']) {
                    $results['emails_sent']++;
                    $results['details'][] = [
                        'user_id' => $user['id'],
                        'email' => $user['email'],
                        'name' => $user['fname'] . ' ' . $user['lname'],
                        'user_type' => $user['user_type'],
                        'status' => 'sent'
                    ];
                } else {
                    $results['emails_failed']++;
                    $results['details'][] = [
                        'user_id' => $user['id'],
                        'email' => $user['email'],
                        'name' => $user['fname'] . ' ' . $user['lname'],
                        'user_type' => $user['user_type'],
                        'status' => 'failed',
                        'error' => $emailResult['message']
                    ];
                }
            }
            
            // Log the announcement activity
            $this->logAnnouncementActivity($adminId, $subject, $results);
            
            error_log("Announcement sent to " . $results['emails_sent'] . " users of types: " . implode(', ', $userTypes));
            
            return [
                'success' => true,
                'message' => 'Announcement sent to ' . $results['emails_sent'] . ' users',
                'results' => $results
            ];
            
        } catch (Exception $e) {
            error_log("Announcement sending failed: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to send announcement: ' . $e->getMessage()];
        }
    }
    
    /**
     * Send announcement email to a single user
     * @param string $userEmail - User's email address
     * @param string $userName - User's name
     * @param string $subject - Announcement subject
     * @param string $message - Announcement message
     * @param string $announcementType - Type of announcement
     * @param string $userType - User's type
     * @return array - Success/failure response
     */
    private function sendAnnouncementEmail($userEmail, $userName, $subject, $message, $announcementType = 'general', $userType = 'customer') {
        if (!$this->isConfigured) {
            return ['success' => false, 'message' => 'Email service not properly configured'];
        }
        
        try {
            // Create email content
            $emailSubject = 'CNERGY GYM - ' . $subject;
            $htmlBody = $this->createAnnouncementEmailTemplate($userName, $subject, $message, $announcementType, $userType);
            $textBody = $this->createAnnouncementPlainText($userName, $subject, $message, $announcementType, $userType);
            
            // Email headers and message
            $emailData = $this->createEmailHeaders($userEmail, $userName, $htmlBody, $textBody);
            
            // Add some debugging
            error_log("Attempting to send announcement email to: " . $userEmail);
            error_log("Email subject: " . $emailSubject);
            
            // Send email using PHP's built-in mail() function
            $success = mail($userEmail, $emailSubject, $emailData['message'], $emailData['headers']);
            
            if ($success) {
                error_log("Announcement email sent successfully to: " . $userEmail);
                return ['success' => true, 'message' => 'Announcement email sent successfully'];
            } else {
                error_log("Failed to send announcement email to: " . $userEmail);
                return ['success' => false, 'message' => 'Failed to send announcement email - mail() function returned false'];
            }
            
        } catch (Exception $e) {
            error_log("Announcement email sending failed to " . $userEmail . ": " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to send announcement email: ' . $e->getMessage()];
        }
    }
    
    /**
     * Get all users from database
     * @return array - Array of user data
     */
    private function getAllUsers() {
        try {
            // Include database connection
            require_once 'db.php';
            
            $query = "
                SELECT 
                    u.id,
                    u.email,
                    u.fname,
                    u.lname,
                    u.user_type_id,
                    ut.type_name as user_type
                FROM user u
                LEFT JOIN usertype ut ON u.user_type_id = ut.id
                WHERE u.account_status = 'approved'
                ORDER BY u.fname, u.lname
            ";
            
            $result = $conn->query($query);
            
            if (!$result) {
                throw new Exception("Database query failed: " . $conn->error);
            }
            
            $users = [];
            while ($row = $result->fetch_assoc()) {
                $users[] = $row;
            }
            
            return $users;
            
        } catch (Exception $e) {
            error_log("Failed to get all users: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Get users by type from database
     * @param array $userTypes - Array of user types to filter by
     * @return array - Array of user data
     */
    private function getUsersByType($userTypes) {
        try {
            // Include database connection
            require_once 'db.php';
            
            $placeholders = implode(',', array_fill(0, count($userTypes), '?'));
            $query = "
                SELECT 
                    u.id,
                    u.email,
                    u.fname,
                    u.lname,
                    u.user_type_id,
                    ut.type_name as user_type
                FROM user u
                LEFT JOIN usertype ut ON u.user_type_id = ut.id
                WHERE u.account_status = 'approved'
                AND ut.type_name IN ($placeholders)
                ORDER BY u.fname, u.lname
            ";
            
            $stmt = $conn->prepare($query);
            $stmt->bind_param(str_repeat('s', count($userTypes)), ...$userTypes);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $users = [];
            while ($row = $result->fetch_assoc()) {
                $users[] = $row;
            }
            
            return $users;
            
        } catch (Exception $e) {
            error_log("Failed to get users by type: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Log announcement activity in the database
     * @param int $adminId - ID of admin who created the announcement
     * @param string $subject - Announcement subject
     * @param array $results - Results of email sending
     */
    private function logAnnouncementActivity($adminId, $subject, $results) {
        try {
            // Include database connection
            require_once 'db.php';
            
            $activity = "Announcement sent: '{$subject}' - Sent to {$results['emails_sent']} users, {$results['emails_failed']} failed";
            
            $query = "INSERT INTO activity_log (user_id, activity, timestamp) VALUES (?, ?, NOW())";
            $stmt = $conn->prepare($query);
            $stmt->bind_param('is', $adminId, $activity);
            $stmt->execute();
            
        } catch (Exception $e) {
            error_log("Failed to log announcement activity: " . $e->getMessage());
        }
    }
    
    /**
     * Create email headers for announcement emails
     * @param string $toEmail - Recipient email
     * @param string $toName - Recipient name
     * @param string $htmlBody - HTML email body
     * @param string $textBody - Plain text email body
     * @return array - Headers and message data
     */
    private function createEmailHeaders($toEmail, $toName, $htmlBody, $textBody) {
        $boundary = md5(uniqid(time()));
        
        $headers = "From: {$this->fromName} <{$this->fromEmail}>\r\n";
        $headers .= "Reply-To: {$this->fromEmail}\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
        $headers .= "X-Priority: 3\r\n";
        
        // Create multipart message body
        $message = "--{$boundary}\r\n";
        $message .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
        $message .= $textBody . "\r\n\r\n";
        
        $message .= "--{$boundary}\r\n";
        $message .= "Content-Type: text/html; charset=UTF-8\r\n";
        $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
        $message .= $htmlBody . "\r\n\r\n";
        
        $message .= "--{$boundary}--\r\n";
        
        return ['headers' => $headers, 'message' => $message];
    }
    
    /**
     * Create HTML template for announcement emails
     * @param string $userName - User's name
     * @param string $subject - Announcement subject
     * @param string $message - Announcement message
     * @param string $announcementType - Type of announcement
     * @param string $userType - User's type
     * @return string - HTML email template
     */
    private function createAnnouncementEmailTemplate($userName, $subject, $message, $announcementType = 'general', $userType = 'customer') {
        $currentYear = date('Y');
        $announcementDate = date('F j, Y');
        $announcementTime = date('g:i A');
        
        // Get announcement type styling
        $typeConfig = $this->getAnnouncementTypeConfig($announcementType);
        
        return "
        <!DOCTYPE html>
        <html lang='en'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Announcement - CNERGY GYM</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333333;
                    background-color: #f8f9fa;
                }
                
                .email-container {
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                
                .header {
                    background: linear-gradient(135deg, {$typeConfig['primary_color']} 0%, {$typeConfig['secondary_color']} 100%);
                    padding: 40px 30px;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }
                
                .logo h1 {
                    color: #ffffff;
                    font-size: 32px;
                    font-weight: 700;
                    margin-bottom: 8px;
                    letter-spacing: 2px;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                
                .logo p {
                    color: #ffffff;
                    font-size: 16px;
                    font-weight: 400;
                    opacity: 0.95;
                    margin: 0;
                }
                
                .announcement-badge {
                    display: inline-block;
                    background: rgba(255, 255, 255, 0.2);
                    color: #ffffff;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-top: 16px;
                }
                
                .content {
                    padding: 40px 30px;
                }
                
                .greeting-section {
                    text-align: center;
                    margin-bottom: 40px;
                }
                
                .greeting-title {
                    font-size: 28px;
                    font-weight: 600;
                    color: #2c3e50;
                    margin-bottom: 16px;
                }
                
                .greeting-subtitle {
                    font-size: 18px;
                    color: #7f8c8d;
                    margin-bottom: 24px;
                }
                
                .announcement-card {
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    border-radius: 12px;
                    padding: 32px;
                    margin: 32px 0;
                    border-left: 4px solid {$typeConfig['primary_color']};
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                
                .announcement-title {
                    color: {$typeConfig['primary_color']};
                    font-size: 24px;
                    font-weight: 600;
                    margin-bottom: 20px;
                    text-align: center;
                }
                
                .announcement-message {
                    font-size: 16px;
                    color: #34495e;
                    line-height: 1.7;
                    text-align: justify;
                    margin-bottom: 20px;
                }
                
                .announcement-meta {
                    background: rgba(255, 255, 255, 0.8);
                    border-radius: 8px;
                    padding: 16px;
                    margin-top: 20px;
                }
                
                .meta-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    padding: 4px 0;
                }
                
                .meta-label {
                    font-weight: 600;
                    color: #2c3e50;
                }
                
                .meta-value {
                    color: #7f8c8d;
                }
                
                .type-badge {
                    display: inline-block;
                    background: {$typeConfig['primary_color']};
                    color: #ffffff;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .action-section {
                    background: #ffffff;
                    border: 2px solid {$typeConfig['primary_color']};
                    border-radius: 12px;
                    padding: 32px;
                    margin: 32px 0;
                    text-align: center;
                }
                
                .action-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #2c3e50;
                    margin-bottom: 16px;
                }
                
                .action-button {
                    display: inline-block;
                    background: linear-gradient(135deg, {$typeConfig['primary_color']} 0%, {$typeConfig['secondary_color']} 100%);
                    color: #ffffff;
                    padding: 16px 32px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 16px;
                    margin: 16px 0;
                    transition: transform 0.2s ease;
                }
                
                .action-button:hover {
                    transform: translateY(-2px);
                }
                
                .contact-section {
                    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                    border-radius: 12px;
                    padding: 24px;
                    margin: 32px 0;
                    text-align: center;
                }
                
                .contact-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #1565c0;
                    margin-bottom: 16px;
                }
                
                .contact-info {
                    color: #1976d2;
                    font-size: 14px;
                    line-height: 1.6;
                }
                
                .contact-info strong {
                    color: #0d47a1;
                }
                
                .footer {
                    background: #2c3e50;
                    color: #ecf0f1;
                    text-align: center;
                    padding: 32px 30px;
                }
                
                .footer-brand {
                    font-size: 20px;
                    font-weight: 700;
                    margin-bottom: 8px;
                    letter-spacing: 1px;
                }
                
                .footer-tagline {
                    font-size: 14px;
                    opacity: 0.8;
                    margin-bottom: 16px;
                }
                
                .footer-copyright {
                    font-size: 12px;
                    opacity: 0.6;
                    margin-bottom: 8px;
                }
                
                .footer-disclaimer {
                    font-size: 11px;
                    opacity: 0.5;
                    line-height: 1.4;
                    max-width: 400px;
                    margin: 0 auto;
                }
            </style>
        </head>
        <body>
            <div class='email-container'>
                <!-- Header -->
                <div class='header'>
                    <div class='logo'>
                        <h1>CNERGY GYM</h1>
                        <p>Transform Your Fitness Journey</p>
                        <div class='announcement-badge'>{$typeConfig['badge_text']}</div>
                    </div>
                </div>
                
                <!-- Main Content -->
                <div class='content'>
                    <!-- Greeting Section -->
                    <div class='greeting-section'>
                        <h2 class='greeting-title'>Hello, " . htmlspecialchars($userName) . "!</h2>
                        <p class='greeting-subtitle'>Important announcement from CNERGY GYM</p>
                    </div>
                    
                    <!-- Announcement Card -->
                    <div class='announcement-card'>
                        <h3 class='announcement-title'>" . htmlspecialchars($subject) . "</h3>
                        <div class='announcement-message'>
                            " . nl2br(htmlspecialchars($message)) . "
                        </div>
                        
                        <div class='announcement-meta'>
                            <div class='meta-row'>
                                <span class='meta-label'>Type:</span>
                                <span class='type-badge'>{$typeConfig['type_name']}</span>
                            </div>
                            <div class='meta-row'>
                                <span class='meta-label'>Date:</span>
                                <span class='meta-value'>" . $announcementDate . "</span>
                            </div>
                            <div class='meta-row'>
                                <span class='meta-label'>Time:</span>
                                <span class='meta-value'>" . $announcementTime . "</span>
                            </div>
                            <div class='meta-row'>
                                <span class='meta-label'>Recipient:</span>
                                <span class='meta-value'>" . htmlspecialchars($userName) . " (" . ucfirst($userType) . ")</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Section -->
                    <div class='action-section'>
                        <h3 class='action-title'>Stay Connected</h3>
                        <p>Keep up with the latest updates and announcements from CNERGY GYM.</p>
                        <a href='#' class='action-button'>Visit Our Website</a>
                        <p style='font-size: 14px; color: #7f8c8d; margin-top: 16px;'>
                            Follow us on social media for more updates and fitness tips
                        </p>
                    </div>
                    
                    <!-- Contact Information -->
                    <div class='contact-section'>
                        <h3 class='contact-title'>Need Help?</h3>
                        <div class='contact-info'>
                            <p><strong>Address:</strong> 123 Fitness Street, Gym City, GC 12345</p>
                            <p><strong>Phone:</strong> (555) 123-4567</p>
                            <p><strong>Email:</strong> cnergyfitnessgym@cnergy.site</p>
                            <p><strong>Business Hours:</strong> Mon-Fri: 6AM-10PM, Sat-Sun: 7AM-9PM</p>
                        </div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class='footer'>
                    <div class='footer-brand'>CNERGY GYM</div>
                    <div class='footer-tagline'>Transform Your Fitness Journey</div>
                    <div class='footer-copyright'>&copy; $currentYear CNERGY GYM. All rights reserved.</div>
                    <div class='footer-disclaimer'>
                        This announcement was sent to " . htmlspecialchars($userName) . " as a valued member of CNERGY GYM.
                        If you have any questions about this announcement, please contact us.
                    </div>
                </div>
            </div>
        </body>
        </html>";
    }
    
    /**
     * Create plain text version of announcement email
     * @param string $userName - User's name
     * @param string $subject - Announcement subject
     * @param string $message - Announcement message
     * @param string $announcementType - Type of announcement
     * @param string $userType - User's type
     * @return string - Plain text email content
     */
    private function createAnnouncementPlainText($userName, $subject, $message, $announcementType = 'general', $userType = 'customer') {
        $currentYear = date('Y');
        $announcementDate = date('F j, Y');
        $announcementTime = date('g:i A');
        
        $typeConfig = $this->getAnnouncementTypeConfig($announcementType);
        
        return "
        CNERGY GYM - ANNOUNCEMENT
        =========================
        
        Hello $userName!
        
        Important announcement from CNERGY GYM
        
        ANNOUNCEMENT DETAILS:
        ====================
        Subject: $subject
        Type: {$typeConfig['type_name']}
        Date: $announcementDate
        Time: $announcementTime
        Recipient: $userName (" . ucfirst($userType) . ")
        
        MESSAGE:
        ========
        $message
        
        STAY CONNECTED:
        ===============
        Keep up with the latest updates and announcements from CNERGY GYM.
        
        GYM INFORMATION:
        ================
        Address: 123 Fitness Street, Gym City, GC 12345
        Phone: (555) 123-4567
        Email: cnergyfitnessgym@cnergy.site
        
        BUSINESS HOURS:
        ==============
        Monday - Friday: 6:00 AM - 10:00 PM
        Saturday - Sunday: 7:00 AM - 9:00 PM
        
        Thank you for being a valued member of CNERGY GYM!
        Transform Your Fitness Journey
        
        ---
        This announcement was sent to $userName as a valued member of CNERGY GYM.
        If you have any questions about this announcement, please contact us.
        
        &copy; $currentYear CNERGY GYM. All rights reserved.
        ";
    }
    
    /**
     * Get announcement type configuration
     * @param string $announcementType - Type of announcement
     * @return array - Configuration for the announcement type
     */
    private function getAnnouncementTypeConfig($announcementType) {
        $configs = [
            'general' => [
                'type_name' => 'General Announcement',
                'badge_text' => 'Important Notice',
                'primary_color' => '#FF6B35',
                'secondary_color' => '#FF8E53'
            ],
            'maintenance' => [
                'type_name' => 'Maintenance Notice',
                'badge_text' => 'Maintenance Alert',
                'primary_color' => '#ffc107',
                'secondary_color' => '#ffca28'
            ],
            'promotion' => [
                'type_name' => 'Promotional Offer',
                'badge_text' => 'Special Offer',
                'primary_color' => '#28a745',
                'secondary_color' => '#34ce57'
            ],
            'emergency' => [
                'type_name' => 'Emergency Notice',
                'badge_text' => 'Emergency Alert',
                'primary_color' => '#dc3545',
                'secondary_color' => '#e74c3c'
            ],
            'event' => [
                'type_name' => 'Event Announcement',
                'badge_text' => 'Upcoming Event',
                'primary_color' => '#6f42c1',
                'secondary_color' => '#8e44ad'
            ],
            'policy' => [
                'type_name' => 'Policy Update',
                'badge_text' => 'Policy Change',
                'primary_color' => '#17a2b8',
                'secondary_color' => '#20c997'
            ]
        ];
        
        return $configs[$announcementType] ?? $configs['general'];
    }
}

// Usage Examples:
/*
// Example 1: Send announcement to all users
$announcementService = new AnnouncementEmailService();
$result = $announcementService->sendAnnouncementToAllUsers(
    'Gym Maintenance Scheduled',
    'We will be performing routine maintenance on our equipment this Saturday from 6 AM to 12 PM. The gym will remain open during this time, but some equipment may be temporarily unavailable. We apologize for any inconvenience.',
    'maintenance',
    1 // Admin ID
);

// Example 2: Send announcement to specific user types
$result = $announcementService->sendAnnouncementToUserTypes(
    'New Group Fitness Classes',
    'We are excited to announce new group fitness classes starting next week! Join us for Yoga, Pilates, and High-Intensity Interval Training sessions. Classes are included with your membership.',
    ['customer', 'staff'], // Send to customers and staff
    'promotion',
    1 // Admin ID
);

// Example 3: Send general announcement to all users
$result = $announcementService->sendAnnouncementToAllUsers(
    'Welcome to CNERGY GYM!',
    'Thank you for being a valued member of our fitness community. We are committed to providing you with the best fitness experience possible.',
    'general',
    1 // Admin ID
);
*/

// API Endpoint for creating announcements
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['subject']) || !isset($input['message'])) {
            throw new Exception('Subject and message are required');
        }
        
        $subject = $input['subject'];
        $message = $input['message'];
        $announcementType = $input['announcement_type'] ?? 'general';
        $userTypes = $input['user_types'] ?? ['customer'];
        $adminId = $input['admin_id'] ?? null;
        
        $announcementService = new AnnouncementEmailService();
        
        if (isset($input['send_to_all']) && $input['send_to_all']) {
            $result = $announcementService->sendAnnouncementToAllUsers($subject, $message, $announcementType, $adminId);
        } else {
            $result = $announcementService->sendAnnouncementToUserTypes($subject, $message, $userTypes, $announcementType, $adminId);
        }
        
        echo json_encode($result);
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
