<?php
// SMTP Connection Test for CNERGY GYM
// This will test if the SMTP connection works

$smtpHost = 'smtp.hostinger.com';
$smtpPort = 465;
$smtpUsername = 'cnergyfitnessgym@cnergy.site';
$smtpPassword = 'Gwapoko385@';

echo "<h1>SMTP Connection Test</h1>";

// Test 1: Basic SSL connection
echo "<h2>1. Testing SSL SMTP Connection</h2>";
$context = stream_context_create([
    'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false,
        'allow_self_signed' => true
    ]
]);

$socket = stream_socket_client("ssl://{$smtpHost}:{$smtpPort}", $errno, $errstr, 30, STREAM_CLIENT_CONNECT, $context);

if (!$socket) {
    echo "<p style='color: red;'><strong>SSL Connection Failed:</strong> $errstr ($errno)</p>";
    echo "<p>Possible issues:</p>";
    echo "<ul>";
    echo "<li>Firewall blocking port 465</li>";
    echo "<li>SMTP server down</li>";
    echo "<li>SSL/TLS issues</li>";
    echo "<li>Wrong host/port</li>";
    echo "</ul>";
    exit;
} else {
    echo "<p style='color: green;'><strong>SSL Connection Successful!</strong></p>";
}

// Test 2: Read initial response
echo "<h2>2. Testing Server Response</h2>";
$response = fgets($socket, 515);
echo "<p><strong>Server Response:</strong> " . htmlspecialchars($response) . "</p>";

if (substr($response, 0, 3) != '220') {
    echo "<p style='color: red;'><strong>Server Error:</strong> Unexpected response</p>";
    fclose($socket);
    exit;
}

// Test 3: EHLO command
echo "<h2>3. Testing EHLO Command</h2>";
fputs($socket, "EHLO " . $_SERVER['HTTP_HOST'] . "\r\n");
$response = fgets($socket, 515);
echo "<p><strong>EHLO Response:</strong> " . htmlspecialchars($response) . "</p>";

// Test 4: Authentication (SSL connection is already encrypted)
echo "<h2>4. Testing Authentication</h2>";
fputs($socket, "AUTH LOGIN\r\n");
$response = fgets($socket, 515);
echo "<p><strong>AUTH LOGIN Response:</strong> " . htmlspecialchars($response) . "</p>";

if (substr($response, 0, 3) != '334') {
    echo "<p style='color: red;'><strong>AUTH LOGIN Failed:</strong> " . htmlspecialchars($response) . "</p>";
    fclose($socket);
    exit;
}

// Send username
fputs($socket, base64_encode($smtpUsername) . "\r\n");
$response = fgets($socket, 515);
echo "<p><strong>Username Response:</strong> " . htmlspecialchars($response) . "</p>";

if (substr($response, 0, 3) != '334') {
    echo "<p style='color: red;'><strong>Username Authentication Failed:</strong> " . htmlspecialchars($response) . "</p>";
    fclose($socket);
    exit;
}

// Send password
fputs($socket, base64_encode($smtpPassword) . "\r\n");
$response = fgets($socket, 515);
echo "<p><strong>Password Response:</strong> " . htmlspecialchars($response) . "</p>";

if (substr($response, 0, 3) != '235') {
    echo "<p style='color: red;'><strong>Password Authentication Failed:</strong> " . htmlspecialchars($response) . "</p>";
    echo "<p>Possible issues:</p>";
    echo "<ul>";
    echo "<li>Wrong password</li>";
    echo "<li>Account locked</li>";
    echo "<li>SMTP not enabled for this account</li>";
    echo "</ul>";
    fclose($socket);
    exit;
} else {
    echo "<p style='color: green;'><strong>Authentication Successful!</strong></p>";
}

// Test 5: Send test email
echo "<h2>5. Testing Email Send</h2>";
fputs($socket, "MAIL FROM: <" . $smtpUsername . ">\r\n");
$response = fgets($socket, 515);
echo "<p><strong>MAIL FROM Response:</strong> " . htmlspecialchars($response) . "</p>";

if (substr($response, 0, 3) != '250') {
    echo "<p style='color: red;'><strong>MAIL FROM Failed:</strong> " . htmlspecialchars($response) . "</p>";
    fclose($socket);
    exit;
}

// Test with your email
fputs($socket, "RCPT TO: <" . $smtpUsername . ">\r\n");
$response = fgets($socket, 515);
echo "<p><strong>RCPT TO Response:</strong> " . htmlspecialchars($response) . "</p>";

if (substr($response, 0, 3) != '250') {
    echo "<p style='color: red;'><strong>RCPT TO Failed:</strong> " . htmlspecialchars($response) . "</p>";
    fclose($socket);
    exit;
}

echo "<p style='color: green;'><strong>SMTP Test Completed Successfully!</strong></p>";
echo "<p>Your SMTP configuration is working correctly.</p>";

fputs($socket, "QUIT\r\n");
fclose($socket);

echo "<h2>Next Steps:</h2>";
echo "<ul>";
echo "<li>If all tests passed, try creating an announcement again</li>";
echo "<li>Check the error logs for more specific error messages</li>";
echo "<li>Make sure your Hostinger email account is active</li>";
echo "</ul>";
?>
