<?php
// Announcement Email System for CNERGY GYM
// Sends announcements to all users when admin creates them

class AnnouncementEmailService {
    private $isConfigured = false;
    private $fromEmail = 'cnergyfitnessgym@cnergy.site';
    private $fromName = 'CNERGY GYM';
    private $smtpHost = 'smtp.hostinger.com';
    private $smtpPort = 465;
    private $smtpUsername = 'cnergyfitnessgym@cnergy.site';
    private $smtpPassword = 'Gwapoko385@';
    
    public function __construct() {
        $this->isConfigured = true;
        error_log("AnnouncementEmailService initialized with Hostinger SMTP");
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
            
            error_log("Found " . count($users) . " users in database");
            
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
                error_log("Processing user: " . $user['email'] . " (" . $user['fname'] . ' ' . $user['lname'] . ")");
                
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
                
                // Add a small delay between emails to prevent spam detection
                usleep(100000); // 0.1 second delay
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
                error_log("Processing user: " . $user['email'] . " (" . $user['fname'] . ' ' . $user['lname'] . ")");
                
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
                
                // Add a small delay between emails to prevent spam detection
                usleep(100000); // 0.1 second delay
            }
            
            // Log the announcement activity
            $this->logAnnouncementActivity($adminId, $subject, $results);
            
            error_log("Announcement sent to " . $results['emails_sent'] . " users of types: " . implode(', ', $userTypes));
            error_log("Total users processed: " . $results['total_users'] . ", Emails sent: " . $results['emails_sent'] . ", Emails failed: " . $results['emails_failed']);
            
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
     * Send email using SMTP
     * @param string $toEmail - Recipient email
     * @param string $toName - Recipient name
     * @param string $subject - Email subject
     * @param string $htmlBody - HTML email body
     * @param string $textBody - Plain text email body
     * @return array - Success/failure response
     */
    private function sendEmailViaSMTP($toEmail, $toName, $subject, $htmlBody, $textBody) {
        try {
            // Create SSL SMTP connection (port 465)
            $context = stream_context_create([
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                ]
            ]);
            
            $socket = stream_socket_client("ssl://{$this->smtpHost}:{$this->smtpPort}", $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $context);
            if (!$socket) {
                throw new Exception("SSL SMTP connection failed: $errstr ($errno)");
            }
            
            // Set socket timeout
            stream_set_timeout($socket, 10);
            
            // Read initial response with timeout check
            $response = fgets($socket, 515);
            if ($response === false) {
                throw new Exception("SMTP connection timeout - no response from server");
            }
            if (substr($response, 0, 3) != '220') {
                throw new Exception("SMTP server error: $response");
            }
            
            // Send EHLO command
            fputs($socket, "EHLO " . $_SERVER['HTTP_HOST'] . "\r\n");
            $response = fgets($socket, 515);
            
            // Authenticate
            fputs($socket, "AUTH LOGIN\r\n");
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) != '334') {
                throw new Exception("AUTH LOGIN failed: $response");
            }
            
            fputs($socket, base64_encode($this->smtpUsername) . "\r\n");
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) != '334') {
                throw new Exception("Username authentication failed: $response");
            }
            
            fputs($socket, base64_encode($this->smtpPassword) . "\r\n");
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) != '235') {
                throw new Exception("Password authentication failed: $response");
            }
            
            // Send MAIL FROM
            fputs($socket, "MAIL FROM: <" . $this->fromEmail . ">\r\n");
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) != '250') {
                throw new Exception("MAIL FROM failed: $response");
            }
            
            // Send RCPT TO
            fputs($socket, "RCPT TO: <" . $toEmail . ">\r\n");
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) != '250') {
                throw new Exception("RCPT TO failed: $response");
            }
            
            // Send DATA
            fputs($socket, "DATA\r\n");
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) != '354') {
                throw new Exception("DATA command failed: $response");
            }
            
            // Send email headers and body
            $emailData = $this->createEmailHeaders($toEmail, $toName, $htmlBody, $textBody);
            fputs($socket, $emailData['headers'] . "\r\n" . $emailData['message'] . "\r\n.\r\n");
            
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) != '250') {
                throw new Exception("Email sending failed: $response");
            }
            
            // Quit
            fputs($socket, "QUIT\r\n");
            fclose($socket);
            
            return ['success' => true, 'message' => 'Email sent successfully via SMTP'];
            
        } catch (Exception $e) {
            if (isset($socket)) {
                fclose($socket);
            }
            error_log("SMTP sending failed: " . $e->getMessage());
            return ['success' => false, 'message' => 'SMTP sending failed: ' . $e->getMessage()];
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
            
            // Try SMTP first, fallback to PHP mail() if it fails
            $result = $this->sendEmailViaSMTP($userEmail, $userName, $emailSubject, $htmlBody, $textBody);
            
            if ($result['success']) {
                error_log("Announcement email sent successfully to: " . $userEmail . " via SMTP");
                return ['success' => true, 'message' => 'Announcement email sent successfully via SMTP'];
            } else {
                error_log("SMTP failed for " . $userEmail . ", trying PHP mail() fallback: " . $result['message']);
                
                // Fallback to PHP mail() function
                $emailData = $this->createEmailHeaders($userEmail, $userName, $htmlBody, $textBody);
                $success = mail($userEmail, $emailSubject, $emailData['message'], $emailData['headers']);
                
                if ($success) {
                    error_log("Announcement email sent successfully to: " . $userEmail . " via PHP mail() fallback");
                    return ['success' => true, 'message' => 'Announcement email sent successfully via PHP mail() fallback'];
                } else {
                    error_log("Both SMTP and PHP mail() failed for: " . $userEmail);
                    return ['success' => false, 'message' => 'Failed to send announcement email - both SMTP and PHP mail() failed'];
                }
            }
            
        } catch (Exception $e) {
            error_log("Announcement email sending failed to " . $userEmail . ": " . $e->getMessage());
            error_log("SMTP Error Details: " . print_r($e, true));
            return ['success' => false, 'message' => 'Failed to send announcement email: ' . $e->getMessage()];
        }
    }
    
    /**
     * Get all users from database
     * @return array - Array of user data
     */
    private function getAllUsers() {
        try {
            // Use the same database connection as announcement.php
            global $pdo;
            
            if (!$pdo) {
                throw new Exception("Database connection not available");
            }
            
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
            
            $stmt = $pdo->prepare($query);
            $stmt->execute();
            
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            error_log("Database query returned " . count($users) . " users");
            
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
            // Use the same database connection as announcement.php
            global $pdo;
            
            if (!$pdo) {
                throw new Exception("Database connection not available");
            }
            
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
            
            $stmt = $pdo->prepare($query);
            $stmt->execute($userTypes);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
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
            // Use the same database connection as announcement.php
            global $pdo;
            
            if (!$pdo) {
                throw new Exception("Database connection not available");
            }
            
            $activity = "Announcement sent: '{$subject}' - Sent to {$results['emails_sent']} users, {$results['emails_failed']} failed";
            
            $query = "INSERT INTO activity_log (user_id, activity, timestamp) VALUES (?, ?, NOW())";
            $stmt = $pdo->prepare($query);
            $stmt->execute([$adminId, $activity]);
            
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
        $headers .= "Message-ID: <" . time() . "." . md5($toEmail) . "@cnergy.site>\r\n";
        $headers .= "Date: " . date('r') . "\r\n";
        $headers .= "List-Unsubscribe: <mailto:unsubscribe@cnergy.site>\r\n";
        $headers .= "X-Spam-Check: OK\r\n";
        
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
*/

?>
