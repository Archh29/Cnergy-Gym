<?php
/**
 * Database Reset Script - Preserves Exercise Data
 * 
 * This script will delete all data from the database EXCEPT:
 * - exercises (or exercise)
 * - muscle (or muscles)
 * - musclegroup (or muscle_groups)
 * - muscle_parts
 * - exercise_muscle (junction table)
 * - Any other exercise-related tables
 * 
 * WARNING: This will permanently delete all data from non-exercise tables!
 * Make sure you have a backup before running this script.
 */

// Database configuration
$host = "localhost";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";

// Connect to database
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage() . "\n");
}

// Tables to preserve (exercise-related)
$preservedTables = [
    'exercise',
    'exercises',
    'muscle',
    'muscles',
    'musclegroup',
    'muscle_groups',
    'muscle_parts',
    'exercise_muscle',
    'exercise_muscles',
    'program_workout_exercise', // Junction table for programs and exercises
    'explore_program_workout', // Might contain exercise references
];

// Get all tables in the database
$stmt = $pdo->query("SHOW TABLES");
$allTables = $stmt->fetchAll(PDO::FETCH_COLUMN);

echo "=== Database Reset Script ===\n\n";
echo "Found " . count($allTables) . " tables in database.\n\n";

// Identify which tables to preserve (case-insensitive)
$tablesToPreserve = [];
$tablesToDelete = [];

foreach ($allTables as $table) {
    $tableLower = strtolower($table);
    $shouldPreserve = false;
    
    // Check if table name contains exercise-related keywords
    foreach ($preservedTables as $preserved) {
        if (strpos($tableLower, strtolower($preserved)) !== false) {
            $shouldPreserve = true;
            break;
        }
    }
    
    if ($shouldPreserve) {
        $tablesToPreserve[] = $table;
    } else {
        $tablesToDelete[] = $table;
    }
}

echo "Tables to PRESERVE (" . count($tablesToPreserve) . "):\n";
foreach ($tablesToPreserve as $table) {
    echo "  ✓ $table\n";
}

echo "\nTables to DELETE DATA FROM (" . count($tablesToDelete) . "):\n";
foreach ($tablesToDelete as $table) {
    echo "  ✗ $table\n";
}

echo "\n";

// Ask for confirmation (for CLI usage)
if (php_sapi_name() === 'cli') {
    echo "WARNING: This will permanently delete all data from the tables listed above!\n";
    echo "Type 'YES' to continue, or anything else to cancel: ";
    $handle = fopen("php://stdin", "r");
    $line = trim(fgets($handle));
    fclose($handle);
    
    if ($line !== 'YES') {
        echo "Operation cancelled.\n";
        exit(0);
    }
} else {
    // For web usage, check for confirmation parameter
    if (!isset($_GET['confirm']) || $_GET['confirm'] !== 'yes') {
        echo "<h1>Database Reset Script</h1>";
        echo "<p><strong>WARNING:</strong> This will permanently delete all data from non-exercise tables!</p>";
        echo "<p>Tables to preserve: " . count($tablesToPreserve) . "</p>";
        echo "<p>Tables to delete from: " . count($tablesToDelete) . "</p>";
        echo "<p><a href='?confirm=yes' style='color: red; font-weight: bold;'>Click here to proceed with deletion</a></p>";
        exit;
    }
}

// Disable foreign key checks temporarily
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

$deletedCount = 0;
$errors = [];

echo "\nStarting deletion process...\n\n";

foreach ($tablesToDelete as $table) {
    try {
        // Get row count before deletion
        $countStmt = $pdo->query("SELECT COUNT(*) as count FROM `$table`");
        $rowCount = $countStmt->fetch()['count'];
        
        // Delete all data from table
        $pdo->exec("DELETE FROM `$table`");
        
        // Reset auto-increment counter
        $pdo->exec("ALTER TABLE `$table` AUTO_INCREMENT = 1");
        
        echo "  ✓ Deleted $rowCount rows from `$table`\n";
        $deletedCount++;
    } catch (PDOException $e) {
        $errorMsg = "Error deleting from `$table`: " . $e->getMessage();
        echo "  ✗ $errorMsg\n";
        $errors[] = $errorMsg;
    }
}

// Re-enable foreign key checks
$pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

echo "\n=== Summary ===\n";
echo "Successfully deleted data from $deletedCount tables.\n";

if (count($errors) > 0) {
    echo "\nErrors encountered:\n";
    foreach ($errors as $error) {
        echo "  - $error\n";
    }
}

echo "\nOperation completed!\n";
echo "Exercise-related tables have been preserved.\n";

?>

