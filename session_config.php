<?php
/**
 * Session Configuration for Cross-Domain Support
 * Include this file at the top of login.php and session.php
 * 
 * IMPORTANT: This file must not output anything (no whitespace, no BOM)
 */

function configureSession() {
    // Determine the domain based on the current host
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $domain = '';
    
    // Extract base domain (e.g., cnergy.site from api.cnergy.site)
    if (preg_match('/(?:www\.)?([^.]+\.[^.]+)$/', $host, $matches)) {
        $baseDomain = $matches[1];
        // Use base domain for cookie (works for api.cnergy.site, www.cnergy.site, cnergy.site)
        $domain = $baseDomain;
    } else {
        // Fallback to cnergy.site
        $domain = 'cnergy.site';
    }
    
    // Configure session cookie settings BEFORE session_start()
    // This is critical for cross-domain session support
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_secure', '1'); // Only over HTTPS
    ini_set('session.cookie_samesite', 'None'); // Allow cross-site cookies
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_path', '/');
    
    // Set session cookie parameters
    // Note: For SameSite=None, Secure must be true (HTTPS only)
    session_set_cookie_params([
        'lifetime' => 0, // Session cookie (expires when browser closes)
        'path' => '/',
        'domain' => $domain, // Base domain (cnergy.site) works for all subdomains
        'secure' => true, // Only over HTTPS (required for SameSite=None)
        'httponly' => true, // Prevent JavaScript access
        'samesite' => 'None' // Allow cross-site requests (required for CORS with credentials)
    ]);
    
    // Start session if not already started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

// Auto-configure if this file is included directly
if (basename(__FILE__) === basename($_SERVER['PHP_SELF'])) {
    // This file was accessed directly, just configure
    configureSession();
}
?>

