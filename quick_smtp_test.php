<?php
// Quick SMTP Test - Check if connection works
$smtpHost = 'smtp.hostinger.com';
$smtpPort = 465;

echo "<h1>Quick SMTP Connection Test</h1>";

// Test basic SSL connection
echo "<h2>Testing SSL Connection to Hostinger</h2>";
echo "<p><strong>Host:</strong> $smtpHost</p>";
echo "<p><strong>Port:</strong> $smtpPort</p>";

$context = stream_context_create([
    'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false,
        'allow_self_signed' => true
    ]
]);

$start_time = microtime(true);
$socket = stream_socket_client("ssl://{$smtpHost}:{$smtpPort}", $errno, $errstr, 5, STREAM_CLIENT_CONNECT, $context);
$end_time = microtime(true);
$connection_time = round(($end_time - $start_time) * 1000, 2);

if (!$socket) {
    echo "<p style='color: red;'><strong>❌ Connection Failed</strong></p>";
    echo "<p><strong>Error:</strong> $errstr ($errno)</p>";
    echo "<p><strong>Connection Time:</strong> {$connection_time}ms</p>";
    
    echo "<h3>Possible Issues:</h3>";
    echo "<ul>";
    echo "<li><strong>Firewall:</strong> Port 465 might be blocked</li>";
    echo "<li><strong>Network:</strong> Internet connection issues</li>";
    echo "<li><strong>Server:</strong> Hostinger SMTP server might be down</li>";
    echo "<li><strong>SSL:</strong> SSL/TLS configuration issues</li>";
    echo "</ul>";
    
    echo "<h3>Alternative Solutions:</h3>";
    echo "<ul>";
    echo "<li><strong>Use PHP mail():</strong> Fallback to basic mail function</li>";
    echo "<li><strong>Try different port:</strong> Test port 587 with TLS</li>";
    echo "<li><strong>Contact Hostinger:</strong> Check if SMTP is enabled</li>";
    echo "<li><strong>Use different service:</strong> Try SendGrid or Mailgun</li>";
    echo "</ul>";
} else {
    echo "<p style='color: green;'><strong>✅ Connection Successful!</strong></p>";
    echo "<p><strong>Connection Time:</strong> {$connection_time}ms</p>";
    
    // Test server response
    stream_set_timeout($socket, 5);
    $response = fgets($socket, 515);
    
    if ($response !== false) {
        echo "<p><strong>Server Response:</strong> " . htmlspecialchars($response) . "</p>";
        echo "<p style='color: green;'><strong>✅ Server is responding</strong></p>";
    } else {
        echo "<p style='color: orange;'><strong>⚠️ No response from server</strong></p>";
    }
    
    fclose($socket);
    
    echo "<h3>Next Steps:</h3>";
    echo "<ul>";
    echo "<li><strong>Test authentication:</strong> Run the full SMTP test</li>";
    echo "<li><strong>Try sending email:</strong> Test the announcement system</li>";
    echo "<li><strong>Check credentials:</strong> Verify username/password</li>";
    echo "</ul>";
}

echo "<hr>";
echo "<h2>Connection Details</h2>";
echo "<p><strong>PHP Version:</strong> " . phpversion() . "</p>";
echo "<p><strong>OpenSSL:</strong> " . (extension_loaded('openssl') ? 'Available' : 'Not Available') . "</p>";
echo "<p><strong>Socket Functions:</strong> " . (function_exists('stream_socket_client') ? 'Available' : 'Not Available') . "</p>";
echo "<p><strong>Current Time:</strong> " . date('Y-m-d H:i:s') . "</p>";
?>

