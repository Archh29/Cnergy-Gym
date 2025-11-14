<?php
// Set timezone to Philippines
date_default_timezone_set('Asia/Manila');

session_start();
require 'activity_logger.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	http_response_code(204);
	exit;
}

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
			PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
		]
	);
	// Ensure proper UTF-8 encoding for special characters like peso sign
	$pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
	// Set MySQL timezone to Philippines
	$pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
	http_response_code(500);
	echo json_encode(["error" => "Database connection failed"]);
	exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);
$action = $_GET['action'] ?? '';

// Debug logging for staff_id
error_log("DEBUG Sales API - Method: $method, Action: $action");
error_log("DEBUG Sales API - GET staff_id: " . ($_GET['staff_id'] ?? 'NULL'));
error_log("DEBUG Sales API - POST data: " . json_encode($data));
error_log("DEBUG Sales API - data[staff_id]: " . ($data['staff_id'] ?? 'NULL'));

try {
	switch ($method) {
		case 'GET':
			handleGetRequest($pdo, $action);
			break;
		case 'POST':
			handlePostRequest($pdo, $action, $data);
			break;
		case 'PUT':
			handlePutRequest($pdo, $action, $data);
			break;
		case 'DELETE':
			handleDeleteRequest($pdo, $action, $data);
			break;
		default:
			http_response_code(405);
			echo json_encode(["error" => "Invalid request method"]);
			break;
	}
} catch (PDOException $e) {
	http_response_code(500);
	echo json_encode(["error" => "Database error occurred: " . $e->getMessage()]);
}

function handleGetRequest($pdo, $action)
{
	switch ($action) {
		case 'products':
			getProductsData($pdo);
			break;
		case 'sales':
			getSalesData($pdo);
			break;
		case 'analytics':
			getAnalyticsData($pdo);
			break;
		case 'coach_sales':
			getCoachSales($pdo);
			break;
		default:
			getAllData($pdo);
			break;
	}
}

function handlePostRequest($pdo, $action, $data)
{
	switch ($action) {
		case 'sale':
			createSale($pdo, $data);
			break;
		case 'product':
			addProduct($pdo, $data);
			break;
		case 'pos_sale':
			createPOSSale($pdo, $data);
			break;
		case 'confirm_transaction':
			confirmTransaction($pdo, $data);
			break;
		case 'edit_transaction':
			editTransaction($pdo, $data);
			break;
		default:
			http_response_code(400);
			echo json_encode(["error" => "Invalid action for POST request"]);
			break;
	}
}

function handlePutRequest($pdo, $action, $data)
{
	switch ($action) {
		case 'stock':
			updateProductStock($pdo, $data);
			break;
		case 'product':
			updateProduct($pdo, $data);
			break;
		case 'restore':
			restoreProduct($pdo, $data);
			break;
		default:
			http_response_code(400);
			echo json_encode(["error" => "Invalid action for PUT request"]);
			break;
	}
}

function handleDeleteRequest($pdo, $action, $data)
{
	switch ($action) {
		case 'product':
			archiveProduct($pdo, $data);
			break;
		default:
			http_response_code(400);
			echo json_encode(["error" => "Invalid action for DELETE request"]);
			break;
	}
}


function getProductsData($pdo)
{
	// Check if viewing archived products
	$showArchived = isset($_GET['archived']) && $_GET['archived'] == '1';

	// Check if is_archived column exists
	try {
		$checkColumnStmt = $pdo->query("SHOW COLUMNS FROM `product` LIKE 'is_archived'");
		$hasArchivedColumn = $checkColumnStmt->rowCount() > 0;
	} catch (Exception $e) {
		$hasArchivedColumn = false;
	}

	if ($hasArchivedColumn) {
		if ($showArchived) {
			// Show only archived products
			$stmt = $pdo->prepare("
				SELECT id, name, price, stock, category, is_archived
				FROM product
				WHERE is_archived = 1
				ORDER BY category, name ASC
			");
		} else {
			// Show only non-archived products (default)
			$stmt = $pdo->prepare("
				SELECT id, name, price, stock, category, COALESCE(is_archived, 0) as is_archived
				FROM product
				WHERE COALESCE(is_archived, 0) = 0
				ORDER BY category, name ASC
			");
		}
		$stmt->execute();
		$products = $stmt->fetchAll(PDO::FETCH_ASSOC);
	} else {
		// If column doesn't exist yet, show all products
		$stmt = $pdo->query("
			SELECT id, name, price, stock, category, 0 as is_archived
			FROM product
			ORDER BY category, name ASC
		");
		$products = $stmt->fetchAll(PDO::FETCH_ASSOC);
	}

	// Convert to proper types
	foreach ($products as &$product) {
		$product['id'] = (int) $product['id'];
		$product['price'] = (float) $product['price'];
		$product['stock'] = (int) $product['stock'];
		$product['is_archived'] = isset($product['is_archived']) ? (int) $product['is_archived'] : 0;
	}

	echo json_encode(["products" => $products]);
}

function getSalesData($pdo)
{
	// Debug: Check if any guest sales exist in database
	try {
		$testStmt = $pdo->query("SELECT COUNT(*) as count FROM sales WHERE sale_type IN ('Guest', 'Walk-in', 'Walkin', 'Day Pass')");
		$testResult = $testStmt->fetch();
		error_log("DEBUG sales_api: Total guest sales in database: " . ($testResult['count'] ?? 0));

		// Also check recent guest sales
		$recentStmt = $pdo->query("SELECT id, sale_type, receipt_number, sale_date, total_amount FROM sales WHERE sale_type IN ('Guest', 'Walk-in', 'Walkin', 'Day Pass') ORDER BY sale_date DESC LIMIT 5");
		$recentSales = $recentStmt->fetchAll();
		if (!empty($recentSales)) {
			error_log("DEBUG sales_api: Recent guest sales in DB: " . json_encode($recentSales));
		} else {
			error_log("DEBUG sales_api: No guest sales found in database!");
		}
	} catch (Exception $e) {
		error_log("DEBUG sales_api: Error checking guest sales: " . $e->getMessage());
	}

	$saleType = $_GET['sale_type'] ?? '';
	$dateFilter = $_GET['date_filter'] ?? '';
	$month = $_GET['month'] ?? '';
	$year = $_GET['year'] ?? '';
	$customDate = $_GET['custom_date'] ?? '';

	// Build date WHERE conditions (reusable for both queries)
	$dateWhereConditions = [];
	$dateParams = [];

	// Handle custom date first (highest priority)
	if ($customDate) {
		$dateWhereConditions[] = "DATE(s.sale_date) = ?";
		$dateParams[] = $customDate;
	} elseif ($month && $month !== 'all' && $year && $year !== 'all') {
		// Specific month and year
		$dateWhereConditions[] = "MONTH(s.sale_date) = ? AND YEAR(s.sale_date) = ?";
		$dateParams[] = $month;
		$dateParams[] = $year;
	} elseif ($month && $month !== 'all') {
		// Specific month (current year)
		$dateWhereConditions[] = "MONTH(s.sale_date) = ? AND YEAR(s.sale_date) = YEAR(CURDATE())";
		$dateParams[] = $month;
	} elseif ($year && $year !== 'all') {
		// Specific year
		$dateWhereConditions[] = "YEAR(s.sale_date) = ?";
		$dateParams[] = $year;
	} elseif ($dateFilter && $dateFilter !== 'all') {
		// Default date filters
		switch ($dateFilter) {
			case 'today':
				$dateWhereConditions[] = "DATE(s.sale_date) = CURDATE()";
				break;
			case 'week':
				$dateWhereConditions[] = "s.sale_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)";
				break;
			case 'month':
				$dateWhereConditions[] = "MONTH(s.sale_date) = MONTH(CURDATE()) AND YEAR(s.sale_date) = YEAR(CURDATE())";
				break;
			case 'year':
				$dateWhereConditions[] = "YEAR(s.sale_date) = YEAR(CURDATE())";
				break;
		}
	}

	// Build WHERE conditions for main query
	$whereConditions = [];
	$params = [];

	if ($saleType && $saleType !== 'all') {
		$whereConditions[] = "s.sale_type = ?";
		$params[] = $saleType;
	}

	// Add date conditions to main query
	$whereConditions = array_merge($whereConditions, $dateWhereConditions);
	$params = array_merge($params, $dateParams);

	$whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";

	// CRITICAL: First, get ALL guest sales separately to ensure they're never missed
	// Build WHERE clause for guest sales (same date filters, but always include guest types)
	$guestWhereConditions = ["s.sale_type IN ('Guest', 'Walk-in', 'Walkin', 'Day Pass')"];
	$guestParams = [];

	// Apply same date filters to guest sales
	if (!empty($dateWhereConditions)) {
		$guestWhereConditions = array_merge($guestWhereConditions, $dateWhereConditions);
		$guestParams = array_merge($guestParams, $dateParams);
	}

	$guestWhereClause = "WHERE " . implode(" AND ", $guestWhereConditions);

	$guestSalesQuery = "
		SELECT s.id, s.user_id, s.total_amount, s.sale_date, s.sale_type,
		       COALESCE(s.payment_method, 'cash') AS payment_method, 
		       s.transaction_status, s.receipt_number, s.cashier_id, s.change_given, s.notes,
		       sd.id AS detail_id, sd.product_id, sd.subscription_id, sd.guest_session_id, sd.quantity, sd.price AS detail_price,
		       NULL AS product_name, NULL AS product_price, NULL AS product_category,
		       NULL AS plan_id, NULL AS subscription_user_id, NULL AS subscription_amount_paid, NULL AS subscription_discounted_price, NULL AS subscription_payment_method,
		       NULL AS payment_table_payment_method,
		       NULL AS plan_name, NULL AS plan_price, NULL AS duration_months,
		       NULL AS member_fullname,
		       NULL AS subscription_member_fullname,
		       NULL AS coach_id,
		       NULL AS coach_fullname,
		       gs.guest_name
		FROM `sales` s
		LEFT JOIN `sales_details` sd ON s.id = sd.sale_id
		LEFT JOIN `guest_session` gs ON (
			(sd.guest_session_id IS NOT NULL AND sd.guest_session_id = gs.id)
			OR (s.receipt_number = gs.receipt_number AND s.receipt_number IS NOT NULL)
		)
		$guestWhereClause
		ORDER BY s.sale_date DESC
	";

	// Main query for non-guest sales
	$stmt = $pdo->prepare("
		SELECT s.id, s.user_id, s.total_amount, s.sale_date, s.sale_type,
		       CASE 
		           WHEN s.sale_type = 'Subscription' AND pay.payment_method IS NOT NULL AND pay.payment_method != '' 
		               THEN pay.payment_method
		           WHEN s.sale_type = 'Subscription' AND sub.payment_method IS NOT NULL AND sub.payment_method != '' 
		               THEN sub.payment_method
		           WHEN s.payment_method IS NOT NULL AND s.payment_method != '' 
		               THEN s.payment_method
		           ELSE 'cash'
		       END AS payment_method, s.transaction_status, s.receipt_number, s.cashier_id, s.change_given, s.notes,
		       sd.id AS detail_id, sd.product_id, sd.subscription_id, sd.guest_session_id, sd.quantity, sd.price AS detail_price,
		       p.name AS product_name, p.price AS product_price, p.category AS product_category,
		       sub.plan_id, sub.user_id AS subscription_user_id, sub.amount_paid AS subscription_amount_paid, sub.discounted_price AS subscription_discounted_price, sub.payment_method AS subscription_payment_method,
		       pay.payment_method AS payment_table_payment_method,
		       msp.plan_name, msp.price AS plan_price, msp.duration_months,
		       CONCAT_WS(' ', u.fname, u.mname, u.lname) AS member_fullname,
		       CONCAT_WS(' ', u_sub.fname, u_sub.mname, u_sub.lname) AS subscription_member_fullname,
		       cml.coach_id,
		       CONCAT_WS(' ', u_coach.fname, u_coach.mname, u_coach.lname) AS coach_fullname,
		       NULL AS guest_name
		FROM `sales` s
		LEFT JOIN `sales_details` sd ON s.id = sd.sale_id
		LEFT JOIN `product` p ON sd.product_id = p.id
		LEFT JOIN `subscription` sub ON sd.subscription_id = sub.id
		LEFT JOIN `payment` pay ON (
			sub.id = pay.subscription_id 
			AND s.sale_type = 'Subscription'
			AND pay.id = (
				SELECT pay2.id 
				FROM `payment` pay2 
				WHERE pay2.subscription_id = sub.id 
				AND pay2.payment_method IS NOT NULL 
				AND pay2.payment_method != ''
				ORDER BY pay2.payment_date DESC, pay2.id DESC 
				LIMIT 1
			)
		)
		LEFT JOIN `member_subscription_plan` msp ON sub.plan_id = msp.id
		LEFT JOIN `user` u ON s.user_id = u.id
		LEFT JOIN `user` u_sub ON sub.user_id = u_sub.id
		LEFT JOIN `coach_member_list` cml ON s.user_id = cml.member_id 
			AND s.sale_type = 'Coaching'
			AND cml.status = 'active'
			AND cml.coach_approval = 'approved'
			AND cml.staff_approval = 'approved'
			AND (cml.expires_at IS NULL OR cml.expires_at >= DATE(s.sale_date))
			AND DATE(cml.staff_approved_at) <= DATE(s.sale_date)
			AND cml.id = (
				SELECT cml2.id
				FROM `coach_member_list` cml2
				WHERE cml2.member_id = s.user_id
					AND cml2.status = 'active'
					AND cml2.coach_approval = 'approved'
					AND cml2.staff_approval = 'approved'
					AND (cml2.expires_at IS NULL OR cml2.expires_at >= DATE(s.sale_date))
					AND DATE(cml2.staff_approved_at) <= DATE(s.sale_date)
				ORDER BY cml2.staff_approved_at DESC
				LIMIT 1
			)
		LEFT JOIN `user` u_coach ON cml.coach_id = u_coach.id
		WHERE s.sale_type NOT IN ('Guest', 'Walk-in', 'Walkin', 'Day Pass')
		" . ($whereClause ? " AND " . str_replace("WHERE ", "", $whereClause) : "") . "
		ORDER BY s.sale_date DESC
	");

	$stmt->execute($params);

	// Get guest sales separately
	$guestStmt = $pdo->prepare($guestSalesQuery);
	$guestStmt->execute($guestParams);
	$guestSalesData = $guestStmt->fetchAll();

	error_log("DEBUG sales_api: Guest sales query: " . $guestSalesQuery);
	error_log("DEBUG sales_api: Guest params: " . json_encode($guestParams));
	error_log("DEBUG sales_api: Found " . count($guestSalesData) . " guest sales from dedicated query");

	// Log each guest sale found
	foreach ($guestSalesData as $gs) {
		error_log("DEBUG sales_api GUEST SALE: ID={$gs['id']}, Type={$gs['sale_type']}, Receipt={$gs['receipt_number']}, Guest Name=" . ($gs['guest_name'] ?? 'NULL'));
	}

	$salesData = $stmt->fetchAll();

	// Merge guest sales with main sales data
	// Remove any duplicates (in case a guest sale was already in main query)
	$mainSaleIds = array_column($salesData, 'id');
	$uniqueGuestSales = [];
	foreach ($guestSalesData as $gs) {
		if (!in_array($gs['id'], $mainSaleIds)) {
			$uniqueGuestSales[] = $gs;
		} else {
			error_log("DEBUG sales_api: Guest sale ID {$gs['id']} already in main query, skipping duplicate");
		}
	}

	$salesData = array_merge($salesData, $uniqueGuestSales);

	error_log("DEBUG sales_api: Total rows after merging: " . count($salesData) . " (main: " . (count($salesData) - count($uniqueGuestSales)) . ", unique guest: " . count($uniqueGuestSales) . ")");

	// Debug: Log raw query results for guest sales
	$guestSalesInRawData = 0;
	foreach ($salesData as $row) {
		if (in_array($row['sale_type'], ['Guest', 'Walk-in', 'Walkin', 'Day Pass'])) {
			$guestSalesInRawData++;
			error_log("DEBUG sales_api RAW: Found guest sale row - Sale ID: {$row['id']}, Type: {$row['sale_type']}, Receipt: " . ($row['receipt_number'] ?? 'N/A') . ", Guest Name from JOIN: " . ($row['guest_name'] ?? 'NULL') . ", Guest Session ID from details: " . ($row['guest_session_id'] ?? 'NULL'));
		}
	}
	error_log("DEBUG sales_api: Found $guestSalesInRawData guest sales in raw query results out of " . count($salesData) . " total rows");

	$salesGrouped = [];

	foreach ($salesData as $row) {
		$saleId = $row['id'];

		if (!isset($salesGrouped[$saleId])) {
			// Get member name - prefer from sales.user_id, fallback to subscription.user_id
			// For subscription sales, always prefer subscription.user_id since it's more reliable
			$memberName = null;
			if ($row['sale_type'] === 'Subscription' && !empty($row['subscription_member_fullname'])) {
				// For subscription sales, prefer subscription_member_fullname (from subscription.user_id)
				$memberName = trim($row['subscription_member_fullname']);
			} else if (!empty($row['member_fullname'])) {
				// For other sales, use member_fullname (from sales.user_id)
				$memberName = trim($row['member_fullname']);
			} else if (!empty($row['subscription_member_fullname'])) {
				// Fallback to subscription_member_fullname if member_fullname is empty
				$memberName = trim($row['subscription_member_fullname']);
			}

			// Get guest name for guest/walk-in sales
			$guestName = !empty($row['guest_name']) ? trim($row['guest_name']) : null;

			// Get user_id - prefer from sales, fallback to subscription
			$userId = $row['user_id'] ?? $row['subscription_user_id'] ?? null;

			// Get coach name for coaching sales
			$coachName = !empty($row['coach_fullname']) ? trim($row['coach_fullname']) : null;
			$coachId = !empty($row['coach_id']) ? (int) $row['coach_id'] : null;

			// For guest/walk-in sales, use guest_name instead of user_name
			$displayName = null;
			if (in_array($row['sale_type'], ['Guest', 'Walk-in', 'Walkin', 'Day Pass'])) {
				$displayName = $guestName ?: $memberName; // Fallback to memberName if guestName is empty
				// Debug log for guest sales
				if (empty($guestName)) {
					error_log("DEBUG sales_api: Guest sale (ID: $saleId) has no guest_name from JOIN. Receipt: " . ($row['receipt_number'] ?? 'N/A'));
				}
			} else {
				$displayName = $memberName;
			}

			// Get payment method - prioritize payment table (source of truth), then subscription table, then sales table
			$paymentMethod = null;
			if ($row['sale_type'] === 'Subscription') {
				// For subscription sales, prioritize payment table first (most accurate), then subscription table, then sales table
				if (!empty($row['payment_table_payment_method'])) {
					$paymentMethod = $row['payment_table_payment_method'];
				} else if (!empty($row['subscription_payment_method'])) {
					$paymentMethod = $row['subscription_payment_method'];
				} else if (!empty($row['payment_method'])) {
					// Fallback to sales table payment_method if payment and subscription tables don't have it
					$paymentMethod = $row['payment_method'];
				} else {
					$paymentMethod = 'cash';
				}
			} else if (!empty($row['payment_method'])) {
				// For other sales, use sales table payment_method
				$paymentMethod = $row['payment_method'];
			} else {
				// Fallback to cash
				$paymentMethod = 'cash';
			}

			// Normalize payment method: digital -> gcash, ensure lowercase
			$paymentMethod = strtolower(trim($paymentMethod));
			if ($paymentMethod === 'digital') {
				$paymentMethod = 'gcash';
			}
			// Log for debugging subscription sales
			if ($row['sale_type'] === 'Subscription') {
				$rawPaymentMethod = $row['payment_method'] ?? null;
				$subPaymentMethod = $row['subscription_payment_method'] ?? null;
				error_log("DEBUG sales_api: Sale ID {$row['id']}, Payment method from DB: " . var_export($rawPaymentMethod, true) . ", Subscription PM: " . var_export($subPaymentMethod, true) . ", Final normalized: '$paymentMethod', Receipt: " . ($row['receipt_number'] ?? 'N/A'));
			}

			$salesGrouped[$saleId] = [
				'id' => $row['id'],
				'total_amount' => (float) $row['total_amount'],
				'sale_date' => $row['sale_date'],
				'sale_type' => $row['sale_type'],
				'payment_method' => $paymentMethod, // Use normalized value
				'transaction_status' => $row['transaction_status'],
				'receipt_number' => $row['receipt_number'],
				'cashier_id' => $row['cashier_id'],
				'change_given' => (float) $row['change_given'],
				'notes' => $row['notes'],
				'user_id' => $userId,
				'user_name' => $displayName, // This will be guest_name for guest sales
				'guest_name' => $guestName, // Also store separately for clarity
				'coach_id' => $coachId,
				'coach_name' => $coachName,
				'sales_details' => []
			];

			// For subscription sales, store plan info at sale level even if no sales_details
			// NOTE: This is a temporary value - it will be overwritten later by subscription lookup to ensure accuracy
			if ($row['sale_type'] === 'Subscription' && !empty($row['plan_name'])) {
				$salesGrouped[$saleId]['plan_name'] = $row['plan_name'];
				$salesGrouped[$saleId]['plan_id'] = $row['plan_id'];
				$salesGrouped[$saleId]['plan_price'] = !empty($row['plan_price']) ? (float) $row['plan_price'] : null;
				$salesGrouped[$saleId]['duration_months'] = !empty($row['duration_months']) ? (int) $row['duration_months'] : null;
				$salesGrouped[$saleId]['duration_days'] = !empty($row['duration_days']) ? (int) $row['duration_days'] : null;
				$salesGrouped[$saleId]['subscription_amount_paid'] = !empty($row['subscription_amount_paid']) ? (float) $row['subscription_amount_paid'] : null;
				$salesGrouped[$saleId]['subscription_discounted_price'] = !empty($row['subscription_discounted_price']) ? (float) $row['subscription_discounted_price'] : null;
			}
		} else {
			// If coach info wasn't set in first row but exists in this row, update it
			if (empty($salesGrouped[$saleId]['coach_name']) && !empty($row['coach_fullname'])) {
				$salesGrouped[$saleId]['coach_name'] = trim($row['coach_fullname']);
				$salesGrouped[$saleId]['coach_id'] = !empty($row['coach_id']) ? (int) $row['coach_id'] : null;
			}
			// If guest info wasn't set but exists in this row, update it
			if (empty($salesGrouped[$saleId]['guest_name']) && !empty($row['guest_name'])) {
				$salesGrouped[$saleId]['guest_name'] = trim($row['guest_name']);
				// Update user_name for guest sales
				if (in_array($salesGrouped[$saleId]['sale_type'], ['Guest', 'Walk-in', 'Walkin', 'Day Pass'])) {
					$salesGrouped[$saleId]['user_name'] = trim($row['guest_name']);
				}
			}

			// For guest sales, if guest_name is still empty, try to fetch it directly from guest_session
			if (in_array($salesGrouped[$saleId]['sale_type'], ['Guest', 'Walk-in', 'Walkin', 'Day Pass']) && empty($salesGrouped[$saleId]['guest_name'])) {
				// Try to get guest_name from sales_details -> guest_session
				$guestSessionId = null;
				if (!empty($salesGrouped[$saleId]['sales_details']) && is_array($salesGrouped[$saleId]['sales_details'])) {
					foreach ($salesGrouped[$saleId]['sales_details'] as $detail) {
						if (!empty($detail['guest_session_id'])) {
							$guestSessionId = $detail['guest_session_id'];
							break;
						}
					}
				}

				// If we have guest_session_id, fetch guest_name directly
				if ($guestSessionId) {
					try {
						$gsStmt = $pdo->prepare("SELECT guest_name FROM guest_session WHERE id = ? LIMIT 1");
						$gsStmt->execute([$guestSessionId]);
						$guestSession = $gsStmt->fetch();
						if ($guestSession && !empty($guestSession['guest_name'])) {
							$salesGrouped[$saleId]['guest_name'] = trim($guestSession['guest_name']);
							$salesGrouped[$saleId]['user_name'] = trim($guestSession['guest_name']);
						}
					} catch (Exception $e) {
						error_log("Failed to fetch guest_name for sale $saleId: " . $e->getMessage());
					}
				}

				// If still no guest_name, try matching by receipt_number
				if (empty($salesGrouped[$saleId]['guest_name']) && !empty($salesGrouped[$saleId]['receipt_number'])) {
					try {
						$gsStmt = $pdo->prepare("SELECT guest_name FROM guest_session WHERE receipt_number = ? LIMIT 1");
						$gsStmt->execute([$salesGrouped[$saleId]['receipt_number']]);
						$guestSession = $gsStmt->fetch();
						if ($guestSession && !empty($guestSession['guest_name'])) {
							$salesGrouped[$saleId]['guest_name'] = trim($guestSession['guest_name']);
							$salesGrouped[$saleId]['user_name'] = trim($guestSession['guest_name']);
						}
					} catch (Exception $e) {
						error_log("Failed to fetch guest_name by receipt_number for sale $saleId: " . $e->getMessage());
					}
				}
			}
			// For subscription sales, update plan info if not set and available in this row
			// NOTE: This will be overwritten later by the subscription lookup to ensure accuracy
			if ($salesGrouped[$saleId]['sale_type'] === 'Subscription' && empty($salesGrouped[$saleId]['plan_name']) && !empty($row['plan_name'])) {
				$salesGrouped[$saleId]['plan_name'] = $row['plan_name'];
				$salesGrouped[$saleId]['plan_id'] = $row['plan_id'];
				$salesGrouped[$saleId]['plan_price'] = !empty($row['plan_price']) ? (float) $row['plan_price'] : null;
				$salesGrouped[$saleId]['duration_months'] = !empty($row['duration_months']) ? (int) $row['duration_months'] : null;
				$salesGrouped[$saleId]['duration_days'] = !empty($row['duration_days']) ? (int) $row['duration_days'] : null;
				$salesGrouped[$saleId]['subscription_amount_paid'] = !empty($row['subscription_amount_paid']) ? (float) $row['subscription_amount_paid'] : null;
				$salesGrouped[$saleId]['subscription_discounted_price'] = !empty($row['subscription_discounted_price']) ? (float) $row['subscription_discounted_price'] : null;
			}
		}

		if ($row['detail_id']) {
			$detail = [
				'id' => $row['detail_id'],
				'quantity' => $row['quantity'],
				'price' => (float) $row['detail_price']
			];

			if ($row['product_id']) {
				$detail['product_id'] = $row['product_id'];
				$detail['product'] = [
					'id' => $row['product_id'],
					'name' => $row['product_name'],
					'price' => (float) $row['product_price'],
					'category' => $row['product_category']
				];
			}

			if ($row['subscription_id']) {
				$detail['subscription_id'] = $row['subscription_id'];
				$detail['subscription'] = [
					'plan_id' => $row['plan_id'],
					'plan_name' => $row['plan_name'],
					'plan_price' => !empty($row['plan_price']) ? (float) $row['plan_price'] : null,
					'duration_months' => !empty($row['duration_months']) ? (int) $row['duration_months'] : null,
					'duration_days' => !empty($row['duration_days']) ? (int) $row['duration_days'] : null,
					'amount_paid' => !empty($row['subscription_amount_paid']) ? (float) $row['subscription_amount_paid'] : null,
					'discounted_price' => !empty($row['subscription_discounted_price']) ? (float) $row['subscription_discounted_price'] : null
				];
				// Also store plan info at sale level for easy access in frontend
				if (!isset($salesGrouped[$saleId]['plan_name']) && !empty($row['plan_name'])) {
					$salesGrouped[$saleId]['plan_name'] = $row['plan_name'];
					$salesGrouped[$saleId]['plan_id'] = $row['plan_id'];
					$salesGrouped[$saleId]['plan_price'] = !empty($row['plan_price']) ? (float) $row['plan_price'] : null;
					$salesGrouped[$saleId]['duration_months'] = !empty($row['duration_months']) ? (int) $row['duration_months'] : null;
					$salesGrouped[$saleId]['subscription_amount_paid'] = !empty($row['subscription_amount_paid']) ? (float) $row['subscription_amount_paid'] : null;
					$salesGrouped[$saleId]['subscription_discounted_price'] = !empty($row['subscription_discounted_price']) ? (float) $row['subscription_discounted_price'] : null;
				}
			}

			// Include guest_session_id in detail if present
			if ($row['guest_session_id']) {
				$detail['guest_session_id'] = $row['guest_session_id'];
			}

			$salesGrouped[$saleId]['sales_details'][] = $detail;
		}
	}

	// For ALL subscription sales, ensure we have plan info - query subscription table directly
	// This ensures we always get the correct plan_name from the subscription's actual plan_id
	// Wrap in try-catch to prevent errors from breaking sales retrieval
	try {
		foreach ($salesGrouped as $saleId => $sale) {
			// Process ALL subscription sales to ALWAYS get the correct plan_name from subscription table
			// This ensures plan_name matches what's shown in monitoring subscription
			if (strtolower($sale['sale_type']) === 'subscription' && !empty($sale['user_id'])) {
				// ALWAYS query subscription table to get the correct plan_name
				// Even if plan_name is already set, we want to overwrite it with the correct one
				// Check if sales_details has subscription_id first
				$subscriptionId = null;
				if (!empty($sale['sales_details']) && is_array($sale['sales_details'])) {
					foreach ($sale['sales_details'] as $detail) {
						if (!empty($detail['subscription_id'])) {
							$subscriptionId = $detail['subscription_id'];
							break;
						}
					}
				}

				// If we found subscription_id in sales_details, use it directly (most reliable)
				if ($subscriptionId) {
					// First get subscription details
					$subStmt = $pdo->prepare("
						SELECT sub.id, sub.plan_id, sub.user_id, sub.amount_paid, sub.discounted_price, sub.start_date, sub.end_date, sub.payment_method,
						       msp.plan_name, msp.price AS plan_price, msp.duration_months, msp.duration_days,
						       CONCAT_WS(' ', u.fname, u.mname, u.lname) AS user_fullname
						FROM `subscription` sub
						JOIN `member_subscription_plan` msp ON sub.plan_id = msp.id
						LEFT JOIN `user` u ON sub.user_id = u.id
						WHERE sub.id = ?
						LIMIT 1
					");
					$subStmt->execute([$subscriptionId]);
					$subscription = $subStmt->fetch();

					// Get payment method from payment table (most accurate source)
					if ($subscription) {
						$payStmt = $pdo->prepare("
							SELECT payment_method 
							FROM `payment` 
							WHERE subscription_id = ? 
							AND payment_method IS NOT NULL 
							AND payment_method != ''
							ORDER BY payment_date DESC, id DESC
							LIMIT 1
						");
						$payStmt->execute([$subscriptionId]);
						$paymentRecord = $payStmt->fetch();
						if ($paymentRecord && !empty($paymentRecord['payment_method'])) {
							// Override subscription payment_method with payment table value (source of truth)
							$subscription['payment_method'] = $paymentRecord['payment_method'];
						}
					}

					if ($subscription && !empty($subscription['plan_name'])) {
						// Always update plan_name from subscription (most accurate source)
						$salesGrouped[$saleId]['plan_name'] = $subscription['plan_name'];
						$salesGrouped[$saleId]['plan_id'] = $subscription['plan_id'];
						$salesGrouped[$saleId]['plan_price'] = !empty($subscription['plan_price']) ? (float) $subscription['plan_price'] : null;
						$salesGrouped[$saleId]['duration_months'] = !empty($subscription['duration_months']) ? (int) $subscription['duration_months'] : null;
						$salesGrouped[$saleId]['duration_days'] = !empty($subscription['duration_days']) ? (int) $subscription['duration_days'] : null;
						$salesGrouped[$saleId]['subscription_amount_paid'] = !empty($subscription['amount_paid']) ? (float) $subscription['amount_paid'] : null;
						$salesGrouped[$saleId]['subscription_discounted_price'] = !empty($subscription['discounted_price']) ? (float) $subscription['discounted_price'] : null;
						// Update payment_method from payment table (most accurate source), then subscription table
						$finalPaymentMethod = null;
						if (!empty($subscription['payment_method'])) {
							// Payment table value was already fetched and overridden above, so use it
							$finalPaymentMethod = $subscription['payment_method'];
						}
						if ($finalPaymentMethod) {
							$subPaymentMethod = strtolower(trim($finalPaymentMethod));
							if ($subPaymentMethod === 'digital') {
								$subPaymentMethod = 'gcash';
							}
							// Always use payment table payment_method for subscription sales (it's the source of truth)
							$salesGrouped[$saleId]['payment_method'] = $subPaymentMethod;
							error_log("DEBUG sales_api: Sale ID $saleId, Updated payment_method from payment/subscription table (by ID): '$subPaymentMethod'");
						}
						// Update user_name and user_id from subscription if not set or incorrect
						if (!empty($subscription['user_fullname'])) {
							// Always update user_name from subscription (more reliable)
							$currentUserName = strtolower(trim($salesGrouped[$saleId]['user_name'] ?? ''));
							if (
								empty($salesGrouped[$saleId]['user_name']) ||
								$currentUserName === 'gym membership' ||
								$currentUserName === strtolower(trim($subscription['plan_name']))
							) {
								$salesGrouped[$saleId]['user_name'] = trim($subscription['user_fullname']);
							}
						}
						if (!empty($subscription['user_id']) && empty($salesGrouped[$saleId]['user_id'])) {
							$salesGrouped[$saleId]['user_id'] = $subscription['user_id'];
						}
						continue;
					}
				}

				// If no subscription_id found, try matching by user_id, amount, and date (more accurate)
				// Strategy 1: Match subscription by user_id, amount (within 10 peso), and same day
				$subStmt = $pdo->prepare("
					SELECT sub.id, sub.plan_id, sub.user_id, sub.amount_paid, sub.discounted_price, sub.start_date, sub.end_date, sub.payment_method,
					       msp.plan_name, msp.price AS plan_price, msp.duration_months, msp.duration_days,
					       CONCAT_WS(' ', u.fname, u.mname, u.lname) AS user_fullname
					FROM `subscription` sub
					JOIN `member_subscription_plan` msp ON sub.plan_id = msp.id
					LEFT JOIN `user` u ON sub.user_id = u.id
					WHERE sub.user_id = ?
					  AND DATE(sub.start_date) = DATE(?)
					  AND (ABS(COALESCE(sub.amount_paid, 0) - ?) <= 10 OR ABS(COALESCE(sub.discounted_price, 0) - ?) <= 10)
					ORDER BY ABS(COALESCE(sub.amount_paid, sub.discounted_price, 0) - ?) ASC, sub.start_date DESC, sub.id DESC
					LIMIT 1
				");
				$subStmt->execute([
					$sale['user_id'],
					$sale['sale_date'],
					$sale['total_amount'],
					$sale['total_amount'],
					$sale['total_amount']
				]);
				$subscription = $subStmt->fetch();

				// Strategy 2: If no exact date/amount match, try matching by amount and date range
				if (!$subscription || empty($subscription['plan_name'])) {
					$subStmt = $pdo->prepare("
						SELECT sub.id, sub.plan_id, sub.user_id, sub.amount_paid, sub.discounted_price, sub.start_date, sub.end_date, sub.payment_method,
						       msp.plan_name, msp.price AS plan_price, msp.duration_months, msp.duration_days,
						       CONCAT_WS(' ', u.fname, u.mname, u.lname) AS user_fullname
						FROM `subscription` sub
						JOIN `member_subscription_plan` msp ON sub.plan_id = msp.id
						LEFT JOIN `user` u ON sub.user_id = u.id
						WHERE sub.user_id = ?
						  AND (ABS(COALESCE(sub.amount_paid, 0) - ?) <= 10 OR ABS(COALESCE(sub.discounted_price, 0) - ?) <= 10)
						  AND sub.start_date >= DATE_SUB(?, INTERVAL 14 DAY)
						  AND sub.start_date <= DATE_ADD(?, INTERVAL 14 DAY)
						ORDER BY ABS(COALESCE(sub.amount_paid, sub.discounted_price, 0) - ?) ASC, ABS(DATEDIFF(sub.start_date, ?)) ASC, sub.start_date DESC
						LIMIT 1
					");
					$subStmt->execute([
						$sale['user_id'],
						$sale['total_amount'],
						$sale['total_amount'],
						$sale['sale_date'],
						$sale['sale_date'],
						$sale['total_amount'],
						$sale['sale_date']
					]);
					$subscription = $subStmt->fetch();
				}

				// Strategy 3: If still no match, try by date only (same day or within 7 days)
				if (!$subscription || empty($subscription['plan_name'])) {
					$subStmt = $pdo->prepare("
						SELECT sub.id, sub.plan_id, sub.user_id, sub.amount_paid, sub.discounted_price, sub.start_date, sub.end_date, sub.payment_method,
						       msp.plan_name, msp.price AS plan_price, msp.duration_months, msp.duration_days,
						       CONCAT_WS(' ', u.fname, u.mname, u.lname) AS user_fullname
						FROM `subscription` sub
						JOIN `member_subscription_plan` msp ON sub.plan_id = msp.id
						LEFT JOIN `user` u ON sub.user_id = u.id
						WHERE sub.user_id = ?
						  AND sub.start_date >= DATE_SUB(?, INTERVAL 7 DAY)
						  AND sub.start_date <= DATE_ADD(?, INTERVAL 7 DAY)
						ORDER BY ABS(DATEDIFF(sub.start_date, ?)) ASC, sub.start_date DESC
						LIMIT 1
					");
					$subStmt->execute([
						$sale['user_id'],
						$sale['sale_date'],
						$sale['sale_date'],
						$sale['sale_date']
					]);
					$subscription = $subStmt->fetch();
				}

				// Strategy 4: Last resort - find most recent subscription for this user (within 60 days)
				if (!$subscription || empty($subscription['plan_name'])) {
					$subStmt = $pdo->prepare("
						SELECT sub.id, sub.plan_id, sub.user_id, sub.amount_paid, sub.discounted_price, sub.start_date, sub.end_date, sub.payment_method,
						       msp.plan_name, msp.price AS plan_price, msp.duration_months, msp.duration_days,
						       CONCAT_WS(' ', u.fname, u.mname, u.lname) AS user_fullname
						FROM `subscription` sub
						JOIN `member_subscription_plan` msp ON sub.plan_id = msp.id
						LEFT JOIN `user` u ON sub.user_id = u.id
						WHERE sub.user_id = ?
						  AND sub.start_date >= DATE_SUB(?, INTERVAL 60 DAY)
						  AND sub.start_date <= DATE_ADD(?, INTERVAL 14 DAY)
						ORDER BY sub.start_date DESC
						LIMIT 1
					");
					$subStmt->execute([
						$sale['user_id'],
						$sale['sale_date'],
						$sale['sale_date']
					]);
					$subscription = $subStmt->fetch();
				}

				// If we found a subscription, ALWAYS update plan_name and payment_method from payment/subscription table (most accurate)
				if ($subscription && !empty($subscription['plan_name'])) {
					// ALWAYS overwrite plan_name from subscription table (this is the source of truth)
					// This ensures plan_name matches what's shown in monitoring subscription
					$salesGrouped[$saleId]['plan_name'] = $subscription['plan_name'];
					$salesGrouped[$saleId]['plan_id'] = $subscription['plan_id'];
					$salesGrouped[$saleId]['plan_price'] = !empty($subscription['plan_price']) ? (float) $subscription['plan_price'] : null;
					$salesGrouped[$saleId]['duration_months'] = !empty($subscription['duration_months']) ? (int) $subscription['duration_months'] : null;
					$salesGrouped[$saleId]['duration_days'] = !empty($subscription['duration_days']) ? (int) $subscription['duration_days'] : null;
					$salesGrouped[$saleId]['subscription_amount_paid'] = !empty($subscription['amount_paid']) ? (float) $subscription['amount_paid'] : null;
					$salesGrouped[$saleId]['subscription_discounted_price'] = !empty($subscription['discounted_price']) ? (float) $subscription['discounted_price'] : null;
					// Get payment method from payment table (most accurate source)
					$finalPaymentMethod = null;
					if (!empty($subscription['id'])) {
						$payStmt = $pdo->prepare("
							SELECT payment_method 
							FROM `payment` 
							WHERE subscription_id = ? 
							AND payment_method IS NOT NULL 
							AND payment_method != ''
							ORDER BY payment_date DESC, id DESC
							LIMIT 1
						");
						$payStmt->execute([$subscription['id']]);
						$paymentRecord = $payStmt->fetch();
						if ($paymentRecord && !empty($paymentRecord['payment_method'])) {
							$finalPaymentMethod = $paymentRecord['payment_method'];
						}
					}
					// Fallback to subscription table payment_method if payment table doesn't have it
					if (!$finalPaymentMethod && !empty($subscription['payment_method'])) {
						$finalPaymentMethod = $subscription['payment_method'];
					}
					// Update payment_method from payment/subscription table (payment table is source of truth)
					if ($finalPaymentMethod) {
						$subPaymentMethod = strtolower(trim($finalPaymentMethod));
						if ($subPaymentMethod === 'digital') {
							$subPaymentMethod = 'gcash';
						}
						// Always use payment table payment_method for subscription sales (it's the source of truth)
						$salesGrouped[$saleId]['payment_method'] = $subPaymentMethod;
						error_log("DEBUG sales_api: Sale ID $saleId, Updated payment_method from payment/subscription table (by matching): '$subPaymentMethod'");
					}
					// Update user_name from subscription (always use subscription's user)
					if (!empty($subscription['user_fullname'])) {
						$salesGrouped[$saleId]['user_name'] = trim($subscription['user_fullname']);
					}
					// Update user_id from subscription
					if (!empty($subscription['user_id'])) {
						$salesGrouped[$saleId]['user_id'] = $subscription['user_id'];
					}
				} else if (!empty($sale['plan_id'])) {
					// If no subscription found but we have a plan_id, query plan directly as fallback
					// This ensures we at least have the plan_name from the plan table
					$planStmt = $pdo->prepare("
						SELECT id, plan_name, price, duration_months, duration_days, discounted_price
						FROM member_subscription_plan
						WHERE id = ?
						LIMIT 1
					");
					$planStmt->execute([$sale['plan_id']]);
					$plan = $planStmt->fetch();
					if ($plan && !empty($plan['plan_name'])) {
						// Update plan_name from plan table (fallback if subscription not found)
						$salesGrouped[$saleId]['plan_name'] = $plan['plan_name'];
						$salesGrouped[$saleId]['plan_id'] = $plan['id'];
						$salesGrouped[$saleId]['plan_price'] = !empty($plan['price']) ? (float) $plan['price'] : null;
						$salesGrouped[$saleId]['duration_months'] = !empty($plan['duration_months']) ? (int) $plan['duration_months'] : null;
						$salesGrouped[$saleId]['duration_days'] = !empty($plan['duration_days']) ? (int) $plan['duration_days'] : null;
					}
				}
			}

			// Process guest sessions to set plan_name
			if (in_array($sale['sale_type'], ['Guest', 'Walk-in', 'Walkin', 'Day Pass'])) {
				// For guest sessions, set plan_name to "Gym Session"
				// Guest sessions are always "Gym Session" plan
				// Always set plan_name for guest sessions (even if already set, ensure it's correct)
				// Try to get plan_name from member_subscription_plan where plan_id = 6 (Gym Session)
				$planStmt = $pdo->prepare("
					SELECT id, plan_name, price, duration_months, duration_days
					FROM member_subscription_plan
					WHERE id = 6 OR LOWER(plan_name) IN ('gym session', 'day pass', 'walk in', 'session')
					LIMIT 1
				");
				$planStmt->execute();
				$gymSessionPlan = $planStmt->fetch();

				if ($gymSessionPlan && !empty($gymSessionPlan['plan_name'])) {
					$salesGrouped[$saleId]['plan_name'] = $gymSessionPlan['plan_name'];
					$salesGrouped[$saleId]['plan_id'] = $gymSessionPlan['id'];
					$salesGrouped[$saleId]['plan_price'] = !empty($gymSessionPlan['price']) ? (float) $gymSessionPlan['price'] : null;
					$salesGrouped[$saleId]['duration_months'] = !empty($gymSessionPlan['duration_months']) ? (int) $gymSessionPlan['duration_months'] : null;
					$salesGrouped[$saleId]['duration_days'] = !empty($gymSessionPlan['duration_days']) ? (int) $gymSessionPlan['duration_days'] : null;
				} else {
					// Fallback to "Gym Session" if plan not found
					$salesGrouped[$saleId]['plan_name'] = 'Gym Session';
					$salesGrouped[$saleId]['plan_id'] = 6;
				}
			}
		}
	} catch (Exception $e) {
		// Log error but don't break sales retrieval
		error_log("Error fetching subscription plan info for sales: " . $e->getMessage());
	}

	// Debug: Log guest sales count
	$guestSalesCount = 0;
	foreach ($salesGrouped as $sale) {
		if (in_array($sale['sale_type'], ['Guest', 'Walk-in', 'Walkin', 'Day Pass'])) {
			$guestSalesCount++;
			error_log("DEBUG sales_api: Found guest sale - ID: {$sale['id']}, Type: {$sale['sale_type']}, Guest Name: " . ($sale['guest_name'] ?? 'N/A') . ", User Name: " . ($sale['user_name'] ?? 'N/A') . ", Receipt: " . ($sale['receipt_number'] ?? 'N/A'));
		}
	}
	error_log("DEBUG sales_api: Total guest sales found: $guestSalesCount out of " . count($salesGrouped) . " total sales");

	// Fallback: Directly query for guest sales that might have been missed
	// This ensures we catch any guest sales that weren't returned by the main query
	try {
		$existingSaleIds = !empty($salesGrouped) ? array_keys($salesGrouped) : [];
		$fallbackQuery = "
			SELECT s.id, s.user_id, s.total_amount, s.sale_date, s.sale_type, 
			       s.payment_method, s.transaction_status, s.receipt_number, s.cashier_id, s.change_given, s.notes,
			       sd.guest_session_id, gs.guest_name
			FROM sales s
			LEFT JOIN sales_details sd ON s.id = sd.sale_id
			LEFT JOIN guest_session gs ON (sd.guest_session_id = gs.id OR s.receipt_number = gs.receipt_number)
			WHERE s.sale_type IN ('Guest', 'Walk-in', 'Walkin', 'Day Pass')
		";

		if (!empty($existingSaleIds)) {
			$placeholders = implode(',', array_fill(0, count($existingSaleIds), '?'));
			$fallbackQuery .= " AND s.id NOT IN ($placeholders)";
			$fallbackStmt = $pdo->prepare($fallbackQuery);
			$fallbackStmt->execute($existingSaleIds);
		} else {
			$fallbackStmt = $pdo->prepare($fallbackQuery);
			$fallbackStmt->execute();
		}

		$fallbackSales = $fallbackStmt->fetchAll();

		if (!empty($fallbackSales)) {
			error_log("DEBUG sales_api FALLBACK: Found " . count($fallbackSales) . " guest sales that were missed by main query");
			foreach ($fallbackSales as $fallbackRow) {
				$fallbackSaleId = $fallbackRow['id'];
				if (!isset($salesGrouped[$fallbackSaleId])) {
					// Get guest_name if not already set
					$fallbackGuestName = $fallbackRow['guest_name'];
					if (empty($fallbackGuestName) && !empty($fallbackRow['guest_session_id'])) {
						$gsStmt = $pdo->prepare("SELECT guest_name FROM guest_session WHERE id = ? LIMIT 1");
						$gsStmt->execute([$fallbackRow['guest_session_id']]);
						$gs = $gsStmt->fetch();
						if ($gs) {
							$fallbackGuestName = $gs['guest_name'];
						}
					}
					if (empty($fallbackGuestName) && !empty($fallbackRow['receipt_number'])) {
						$gsStmt = $pdo->prepare("SELECT guest_name FROM guest_session WHERE receipt_number = ? LIMIT 1");
						$gsStmt->execute([$fallbackRow['receipt_number']]);
						$gs = $gsStmt->fetch();
						if ($gs) {
							$fallbackGuestName = $gs['guest_name'];
						}
					}

					// Get plan info for guest sales
					$planStmt = $pdo->prepare("SELECT id, plan_name, price, duration_months, duration_days FROM member_subscription_plan WHERE id = 6 OR LOWER(plan_name) IN ('gym session', 'day pass', 'walk in', 'session') LIMIT 1");
					$planStmt->execute();
					$gymSessionPlan = $planStmt->fetch();

					$salesGrouped[$fallbackSaleId] = [
						'id' => $fallbackSaleId,
						'total_amount' => (float) $fallbackRow['total_amount'],
						'sale_date' => $fallbackRow['sale_date'],
						'sale_type' => $fallbackRow['sale_type'],
						'payment_method' => strtolower($fallbackRow['payment_method'] ?? 'cash'),
						'transaction_status' => $fallbackRow['transaction_status'],
						'receipt_number' => $fallbackRow['receipt_number'],
						'cashier_id' => $fallbackRow['cashier_id'],
						'change_given' => (float) ($fallbackRow['change_given'] ?? 0),
						'notes' => $fallbackRow['notes'],
						'user_id' => null,
						'user_name' => $fallbackGuestName ?: 'Guest',
						'guest_name' => $fallbackGuestName,
						'coach_id' => null,
						'coach_name' => null,
						'plan_name' => $gymSessionPlan ? $gymSessionPlan['plan_name'] : 'Gym Session',
						'plan_id' => $gymSessionPlan ? $gymSessionPlan['id'] : 6,
						'plan_price' => $gymSessionPlan ? (float) ($gymSessionPlan['price'] ?? 0) : null,
						'sales_details' => []
					];

					// Add sales_details if available
					if (!empty($fallbackRow['guest_session_id'])) {
						$salesGrouped[$fallbackSaleId]['sales_details'][] = [
							'guest_session_id' => $fallbackRow['guest_session_id'],
							'quantity' => 1,
							'price' => (float) $fallbackRow['total_amount']
						];
					}

					error_log("DEBUG sales_api FALLBACK: Added missing guest sale - ID: $fallbackSaleId, Guest Name: " . ($fallbackGuestName ?? 'N/A'));
				}
			}
		}
	} catch (Exception $e) {
		error_log("Error in fallback guest sales query: " . $e->getMessage());
	}

	// Final count after fallback
	$finalGuestCount = 0;
	foreach ($salesGrouped as $sale) {
		if (in_array($sale['sale_type'], ['Guest', 'Walk-in', 'Walkin', 'Day Pass'])) {
			$finalGuestCount++;
		}
	}
	error_log("DEBUG sales_api FINAL: Total guest sales after fallback: $finalGuestCount out of " . count($salesGrouped) . " total sales");

	// CRITICAL FINAL CHECK: Query ALL guest sales one more time to ensure nothing is missed
	// This is a safety net - directly query the sales table for any guest sales
	// Apply same date filters as the main query
	try {
		$finalCheckWhereConditions = ["sale_type IN ('Guest', 'Walk-in', 'Walkin', 'Day Pass')"];
		$finalCheckParams = [];

		// Apply same date filters
		if ($customDate) {
			$finalCheckWhereConditions[] = "DATE(sale_date) = ?";
			$finalCheckParams[] = $customDate;
		} elseif ($month && $month !== 'all' && $year && $year !== 'all') {
			$finalCheckWhereConditions[] = "MONTH(sale_date) = ? AND YEAR(sale_date) = ?";
			$finalCheckParams[] = $month;
			$finalCheckParams[] = $year;
		} elseif ($month && $month !== 'all') {
			$finalCheckWhereConditions[] = "MONTH(sale_date) = ? AND YEAR(sale_date) = YEAR(CURDATE())";
			$finalCheckParams[] = $month;
		} elseif ($year && $year !== 'all') {
			$finalCheckWhereConditions[] = "YEAR(sale_date) = ?";
			$finalCheckParams[] = $year;
		} elseif ($dateFilter && $dateFilter !== 'all') {
			switch ($dateFilter) {
				case 'today':
					$finalCheckWhereConditions[] = "DATE(sale_date) = CURDATE()";
					break;
				case 'week':
					$finalCheckWhereConditions[] = "sale_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)";
					break;
				case 'month':
					$finalCheckWhereConditions[] = "MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())";
					break;
				case 'year':
					$finalCheckWhereConditions[] = "YEAR(sale_date) = YEAR(CURDATE())";
					break;
			}
		}

		$finalCheckWhereClause = "WHERE " . implode(" AND ", $finalCheckWhereConditions);
		$finalCheckQuery = "SELECT id FROM sales $finalCheckWhereClause";
		$finalCheckStmt = $pdo->prepare($finalCheckQuery);
		$finalCheckStmt->execute($finalCheckParams);
		$allGuestSaleIds = $finalCheckStmt->fetchAll(PDO::FETCH_COLUMN);
		$existingSaleIds = array_keys($salesGrouped);
		$missingGuestSaleIds = array_diff($allGuestSaleIds, $existingSaleIds);

		if (!empty($missingGuestSaleIds)) {
			error_log("DEBUG sales_api FINAL CHECK: Found " . count($missingGuestSaleIds) . " guest sales that are missing from results!");
			error_log("DEBUG sales_api FINAL CHECK: Missing sale IDs: " . implode(', ', $missingGuestSaleIds));

			// Fetch the missing guest sales
			$placeholders = implode(',', array_fill(0, count($missingGuestSaleIds), '?'));
			$missingQuery = "
				SELECT s.id, s.user_id, s.total_amount, s.sale_date, s.sale_type, 
				       COALESCE(s.payment_method, 'cash') AS payment_method, 
				       s.transaction_status, s.receipt_number, s.cashier_id, s.change_given, s.notes,
				       sd.guest_session_id, gs.guest_name
				FROM sales s
				LEFT JOIN sales_details sd ON s.id = sd.sale_id
				LEFT JOIN guest_session gs ON (sd.guest_session_id = gs.id OR s.receipt_number = gs.receipt_number)
				WHERE s.id IN ($placeholders)
			";
			$missingStmt = $pdo->prepare($missingQuery);
			$missingStmt->execute($missingGuestSaleIds);
			$missingSales = $missingStmt->fetchAll();

			foreach ($missingSales as $missingRow) {
				$missingSaleId = $missingRow['id'];

				// Get guest_name
				$missingGuestName = $missingRow['guest_name'];
				if (empty($missingGuestName) && !empty($missingRow['guest_session_id'])) {
					$gsStmt = $pdo->prepare("SELECT guest_name FROM guest_session WHERE id = ? LIMIT 1");
					$gsStmt->execute([$missingRow['guest_session_id']]);
					$gs = $gsStmt->fetch();
					if ($gs) {
						$missingGuestName = $gs['guest_name'];
					}
				}
				if (empty($missingGuestName) && !empty($missingRow['receipt_number'])) {
					$gsStmt = $pdo->prepare("SELECT guest_name FROM guest_session WHERE receipt_number = ? LIMIT 1");
					$gsStmt->execute([$missingRow['receipt_number']]);
					$gs = $gsStmt->fetch();
					if ($gs) {
						$missingGuestName = $gs['guest_name'];
					}
				}

				// Get plan info
				$planStmt = $pdo->prepare("SELECT id, plan_name, price, duration_months, duration_days FROM member_subscription_plan WHERE id = 6 OR LOWER(plan_name) IN ('gym session', 'day pass', 'walk in', 'session') LIMIT 1");
				$planStmt->execute();
				$gymSessionPlan = $planStmt->fetch();

				$salesGrouped[$missingSaleId] = [
					'id' => $missingSaleId,
					'total_amount' => (float) $missingRow['total_amount'],
					'sale_date' => $missingRow['sale_date'],
					'sale_type' => $missingRow['sale_type'],
					'payment_method' => strtolower($missingRow['payment_method'] ?? 'cash'),
					'transaction_status' => $missingRow['transaction_status'],
					'receipt_number' => $missingRow['receipt_number'],
					'cashier_id' => $missingRow['cashier_id'],
					'change_given' => (float) ($missingRow['change_given'] ?? 0),
					'notes' => $missingRow['notes'],
					'user_id' => null,
					'user_name' => $missingGuestName ?: 'Guest',
					'guest_name' => $missingGuestName,
					'coach_id' => null,
					'coach_name' => null,
					'plan_name' => $gymSessionPlan ? $gymSessionPlan['plan_name'] : 'Gym Session',
					'plan_id' => $gymSessionPlan ? $gymSessionPlan['id'] : 6,
					'plan_price' => $gymSessionPlan ? (float) ($gymSessionPlan['price'] ?? 0) : null,
					'sales_details' => []
				];

				// Add sales_details if available
				if (!empty($missingRow['guest_session_id'])) {
					$salesGrouped[$missingSaleId]['sales_details'][] = [
						'guest_session_id' => $missingRow['guest_session_id'],
						'quantity' => 1,
						'price' => (float) $missingRow['total_amount']
					];
				}

				error_log("DEBUG sales_api FINAL CHECK: Added missing guest sale - ID: $missingSaleId, Guest Name: " . ($missingGuestName ?? 'N/A'));
			}
		} else {
			error_log("DEBUG sales_api FINAL CHECK: All guest sales are present in results");
		}
	} catch (Exception $e) {
		error_log("DEBUG sales_api FINAL CHECK ERROR: " . $e->getMessage());
	}

	// Final count after final check
	$finalFinalGuestCount = 0;
	foreach ($salesGrouped as $sale) {
		if (in_array($sale['sale_type'], ['Guest', 'Walk-in', 'Walkin', 'Day Pass'])) {
			$finalFinalGuestCount++;
		}
	}
	error_log("DEBUG sales_api FINAL FINAL: Total guest sales after final check: $finalFinalGuestCount out of " . count($salesGrouped) . " total sales");

	echo json_encode(["sales" => array_values($salesGrouped)]);
}

function getAnalyticsData($pdo)
{
	$period = $_GET['period'] ?? 'today';
	$saleType = $_GET['sale_type'] ?? 'all';
	$month = $_GET['month'] ?? '';
	$year = $_GET['year'] ?? '';
	$customDate = $_GET['custom_date'] ?? '';

	// Build date condition based on period and filters
	$dateCondition = "";
	$params = [];

	// Handle custom date first (highest priority)
	if ($customDate) {
		$dateCondition = "DATE(sale_date) = ?";
		$params[] = $customDate;
	} elseif ($month && $month !== 'all' && $year && $year !== 'all') {
		// Specific month and year
		$dateCondition = "MONTH(sale_date) = ? AND YEAR(sale_date) = ?";
		$params[] = $month;
		$params[] = $year;
	} elseif ($month && $month !== 'all') {
		// Specific month (current year)
		$dateCondition = "MONTH(sale_date) = ? AND YEAR(sale_date) = YEAR(CURDATE())";
		$params[] = $month;
	} elseif ($year && $year !== 'all') {
		// Specific year
		$dateCondition = "YEAR(sale_date) = ?";
		$params[] = $year;
	} else {
		// Default period filters
		switch ($period) {
			case 'today':
				$dateCondition = "DATE(sale_date) = CURDATE()";
				break;
			case 'week':
				$dateCondition = "sale_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)";
				break;
			case 'month':
				$dateCondition = "MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())";
				break;
			case 'year':
				$dateCondition = "YEAR(sale_date) = YEAR(CURDATE())";
				break;
			default:
				$dateCondition = "DATE(sale_date) = CURDATE()";
		}
	}

	// Build sale type condition
	$saleTypeCondition = "";
	if ($saleType !== 'all') {
		$saleTypeCondition = " AND sale_type = ?";
		$params[] = $saleType;
	}

	// Get period sales (filtered by sale type if specified)
	$stmt = $pdo->prepare("
		SELECT COALESCE(SUM(total_amount), 0) AS period_sales
		FROM `sales`
		WHERE $dateCondition $saleTypeCondition
	");
	$stmt->execute($params);
	$periodSales = $stmt->fetch()['period_sales'];

	// Get products sold in period (only for product sales)
	$productParams = $params;
	$productCondition = $saleTypeCondition;
	if ($saleType === 'all') {
		$productCondition .= " AND s.sale_type = 'Product'";
	} elseif ($saleType !== 'Product') {
		$productCondition = " AND s.sale_type = 'Product'";
		$productParams = [];
	}

	$stmt = $pdo->prepare("
		SELECT COALESCE(SUM(sd.quantity), 0) AS products_sold_period
		FROM `sales` s
		JOIN `sales_details` sd ON s.id = sd.sale_id
		WHERE $dateCondition $productCondition
	");
	$stmt->execute($productParams);
	$productsSoldPeriod = $stmt->fetch()['products_sold_period'];

	// Get all sales types from the sales table
	// Try multiple possible sale_type values for coach and walk-in
	// NOTE: Coach assignments are stored as 'Coaching' in the database
	// Build params array for this query (excluding saleType param)
	$salesBreakdownParams = [];

	// Build date params (same logic as before, but we need to rebuild the params array without the saleType param)
	if ($customDate) {
		$salesBreakdownParams[] = $customDate;
	} elseif ($month && $month !== 'all' && $year && $year !== 'all') {
		$salesBreakdownParams[] = $month;
		$salesBreakdownParams[] = $year;
	} elseif ($month && $month !== 'all') {
		$salesBreakdownParams[] = $month;
	} elseif ($year && $year !== 'all') {
		$salesBreakdownParams[] = $year;
	}

	$whereClause = $dateCondition ? "WHERE $dateCondition" : "";

	$stmt = $pdo->prepare("
		SELECT 
			COALESCE(SUM(CASE WHEN sale_type = 'Product' THEN total_amount ELSE 0 END), 0) AS product_sales,
			COALESCE(SUM(CASE WHEN sale_type = 'Subscription' THEN total_amount ELSE 0 END), 0) AS subscription_sales,
			COALESCE(SUM(CASE WHEN sale_type IN ('Coaching', 'Coach Assignment', 'Coach') THEN total_amount ELSE 0 END), 0) AS coach_assignment_sales,
			COALESCE(SUM(CASE WHEN sale_type IN ('Walk-in', 'Walkin', 'Guest', 'Day Pass') THEN total_amount ELSE 0 END), 0) AS walkin_sales
		FROM `sales`
		$whereClause
	");
	$stmt->execute($salesBreakdownParams);
	$salesBreakdown = $stmt->fetch();
	$coachSales = (float) $salesBreakdown['coach_assignment_sales'];
	$walkinSales = (float) $salesBreakdown['walkin_sales'];

	// Get low stock items (only relevant for product sales) - exclude archived products
	$stmt = $pdo->prepare("
		SELECT COUNT(*) AS low_stock_count
		FROM `product`
		WHERE stock <= 10
		AND (is_archived = 0 OR is_archived IS NULL)
	");
	$stmt->execute();
	$lowStockItems = $stmt->fetch()['low_stock_count'];

	// Get total revenue (all time)
	$stmt = $pdo->prepare("
		SELECT COALESCE(SUM(total_amount), 0) AS total_revenue
		FROM `sales`
	");
	$stmt->execute();
	$totalRevenue = $stmt->fetch()['total_revenue'];

	echo json_encode([
		"analytics" => [
			"todaysSales" => (float) $periodSales,
			"productsSoldToday" => (int) $productsSoldPeriod,
			"lowStockItems" => (int) $lowStockItems,
			"monthlyRevenue" => (float) $totalRevenue,
			"productSales" => (float) $salesBreakdown['product_sales'],
			"subscriptionSales" => (float) $salesBreakdown['subscription_sales'],
			"coachAssignmentSales" => (float) $coachSales,
			"walkinSales" => (float) $walkinSales,
			"totalSales" => (float) $periodSales
		]
	]);
}

function getAllData($pdo)
{
	$products = [];

	$stmt = $pdo->query("SELECT * FROM `product` ORDER BY category, name");
	$products = $stmt->fetchAll();

	echo json_encode([
		"products" => $products ?: []
	]);
}

function createSale($pdo, $data)
{
	if (!isset($data['total_amount'], $data['sale_type'], $data['sales_details'])) {
		http_response_code(400);
		echo json_encode(["error" => "Missing required fields"]);
		return;
	}

	// POS fields with defaults
	$paymentMethod = $data['payment_method'] ?? 'cash';
	$transactionStatus = $data['transaction_status'] ?? 'confirmed';
	$receiptNumber = $data['receipt_number'] ?? generateReceiptNumber($pdo);
	$cashierId = $data['cashier_id'] ?? $data['staff_id'] ?? $_GET['staff_id'] ?? $_SESSION['user_id'] ?? null;
	$changeGiven = $data['change_given'] ?? 0.00;
	$notes = $data['notes'] ?? '';

	// Debug logging for cashier_id
	error_log("Sales API - Cashier ID: $cashierId, Data cashier_id: " . ($data['cashier_id'] ?? 'null') . ", Data staff_id: " . ($data['staff_id'] ?? 'null') . ", GET staff_id: " . ($_GET['staff_id'] ?? 'null') . ", Session user_id: " . ($_SESSION['user_id'] ?? 'null'));

	$pdo->beginTransaction();

	try {
		$stmt = $pdo->prepare("
			INSERT INTO `sales` (user_id, total_amount, sale_type, sale_date, payment_method, transaction_status, receipt_number, cashier_id, change_given, notes)
			VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)
		");
		$stmt->execute([
			$data['user_id'] ?? null,
			$data['total_amount'],
			$data['sale_type'],
			$paymentMethod,
			$transactionStatus,
			$receiptNumber,
			$cashierId,
			$changeGiven,
			$notes
		]);

		$saleId = $pdo->lastInsertId();

		foreach ($data['sales_details'] as $detail) {
			$stmt = $pdo->prepare("
				INSERT INTO `sales_details` (sale_id, product_id, subscription_id, quantity, price)
				VALUES (?, ?, ?, ?, ?)
			");
			$stmt->execute([
				$saleId,
				$detail['product_id'] ?? null,
				$detail['subscription_id'] ?? null,
				$detail['quantity'] ?? null,
				$detail['price']
			]);

			if (isset($detail['product_id']) && isset($detail['quantity'])) {
				$stmt = $pdo->prepare("
					UPDATE `product`
					SET stock = stock - ?
					WHERE id = ? AND stock >= ?
				");
				$stmt->execute([
					$detail['quantity'],
					$detail['product_id'],
					$detail['quantity']
				]);

				if ($stmt->rowCount() === 0) {
					throw new Exception("Insufficient stock for product ID: " . $detail['product_id']);
				}
			}
		}

		$pdo->commit();

		// Get product names for logging
		$productNames = [];
		foreach ($data['sales_details'] as $detail) {
			if (isset($detail['product_id'])) {
				$productStmt = $pdo->prepare("SELECT name FROM product WHERE id = ?");
				$productStmt->execute([$detail['product_id']]);
				$product = $productStmt->fetch();
				if ($product) {
					$productNames[] = $product['name'] . " (x{$detail['quantity']})";
				}
			}
		}
		$productList = !empty($productNames) ? implode(", ", $productNames) : "Subscription/Service";

		// Log activity using centralized logger (same as monitor_subscription.php)
		$staffId = $data['staff_id'] ?? null;
		error_log("DEBUG Sales - staffId: " . ($staffId ?? 'NULL') . " from request data");
		error_log("DEBUG Sales - Full request data: " . json_encode($data));
		logStaffActivity($pdo, $staffId, "Process POS Sale", "POS Sale completed: {$productList} - Total: ₱{$data['total_amount']}, Payment: {$paymentMethod}, Receipt: {$receiptNumber}", "Sales");

		http_response_code(201);
		echo json_encode([
			"success" => "Sale created successfully",
			"sale_id" => $saleId,
			"receipt_number" => $receiptNumber,
			"payment_method" => $paymentMethod,
			"transaction_status" => $transactionStatus
		]);

	} catch (Exception $e) {
		$pdo->rollBack();
		http_response_code(400);
		echo json_encode(["error" => $e->getMessage()]);
	}
}

function addProduct($pdo, $data)
{
	if (!isset($data['name'], $data['price'], $data['stock'])) {
		http_response_code(400);
		echo json_encode(["error" => "Missing required fields"]);
		return;
	}

	$category = $data['category'] ?? 'Uncategorized';
	$stmt = $pdo->prepare("INSERT INTO `product` (name, price, stock, category) VALUES (?, ?, ?, ?)");
	$stmt->execute([
		$data['name'],
		$data['price'],
		$data['stock'],
		$category
	]);

	$productId = $pdo->lastInsertId();

	// Log activity using dedicated logging file
	$userId = $_SESSION['user_id'] ?? null;
	$logUrl = "https://api.cnergy.site/log_activity.php?action=Add%20Product&details=" . urlencode("New product added: {$data['name']} - Price: ₱{$data['price']}, Stock: {$data['stock']}, Category: {$category}");
	if ($userId) {
		$logUrl .= "&user_id=" . $userId;
	}
	file_get_contents($logUrl);

	http_response_code(201);
	echo json_encode(["success" => "Product added successfully", "product_id" => $productId]);
}

function updateProductStock($pdo, $data)
{
	if (!isset($data['product_id'], $data['quantity'], $data['type'])) {
		http_response_code(400);
		echo json_encode(["error" => "Missing required fields"]);
		return;
	}

	$quantity = (int) $data['quantity'];
	$productId = (int) $data['product_id'];
	$type = $data['type']; // 'add' or 'remove'

	if ($type === 'add') {
		$stmt = $pdo->prepare("UPDATE `product` SET stock = stock + ? WHERE id = ?");
	} else {
		$stmt = $pdo->prepare("UPDATE `product` SET stock = GREATEST(0, stock - ?) WHERE id = ?");
	}

	$stmt->execute([$quantity, $productId]);

	if ($stmt->rowCount() > 0) {
		// Log activity using dedicated logging file
		$productStmt = $pdo->prepare("SELECT name FROM product WHERE id = ?");
		$productStmt->execute([$productId]);
		$product = $productStmt->fetch();
		$productName = $product ? $product['name'] : "Product ID: {$productId}";

		$userId = $_SESSION['user_id'] ?? null;
		$logUrl = "https://api.cnergy.site/log_activity.php?action=Update%20Stock&details=" . urlencode("Stock updated for {$productName}: {$type} {$quantity} units");
		if ($userId) {
			$logUrl .= "&user_id=" . $userId;
		}
		file_get_contents($logUrl);

		echo json_encode(["success" => "Stock updated successfully"]);
	} else {
		http_response_code(404);
		echo json_encode(["error" => "Product not found"]);
	}
}

function updateProduct($pdo, $data)
{
	if (!isset($data['id'], $data['name'], $data['price'])) {
		http_response_code(400);
		echo json_encode(["error" => "Missing required fields"]);
		return;
	}

	$category = $data['category'] ?? 'Uncategorized';
	$stmt = $pdo->prepare("UPDATE `product` SET name = ?, price = ?, category = ? WHERE id = ?");
	$stmt->execute([
		$data['name'],
		$data['price'],
		$category,
		$data['id']
	]);

	if ($stmt->rowCount() > 0) {
		// Log activity using dedicated logging file
		$userId = $_SESSION['user_id'] ?? null;
		$logUrl = "https://api.cnergy.site/log_activity.php?action=Update%20Product&details=" . urlencode("Product updated: {$data['name']} - Price: ₱{$data['price']}, Category: {$category}");
		if ($userId) {
			$logUrl .= "&user_id=" . $userId;
		}
		file_get_contents($logUrl);

		echo json_encode(["success" => "Product updated successfully"]);
	} else {
		http_response_code(404);
		echo json_encode(["error" => "Product not found"]);
	}
}

function archiveProduct($pdo, $data)
{
	if (!isset($data['id']) || !is_numeric($data['id'])) {
		http_response_code(400);
		echo json_encode(["error" => "Invalid product ID"]);
		return;
	}

	try {
		// Get product details before archiving for logging
		$productStmt = $pdo->prepare("SELECT name, price, category FROM product WHERE id = ?");
		$productStmt->execute([$data['id']]);
		$product = $productStmt->fetch();

		if (!$product) {
			throw new Exception("Product not found");
		}

		// Archive the product instead of deleting (preserve sales data)
		// First check if is_archived column exists, if not, add it
		$checkColumnStmt = $pdo->query("SHOW COLUMNS FROM `product` LIKE 'is_archived'");
		if ($checkColumnStmt->rowCount() == 0) {
			// Add is_archived column if it doesn't exist
			$pdo->exec("ALTER TABLE `product` ADD COLUMN `is_archived` TINYINT(1) DEFAULT 0");
			$pdo->exec("ALTER TABLE `product` ADD INDEX `idx_is_archived` (`is_archived`)");
		}

		// Update product to archived status
		$stmt = $pdo->prepare("UPDATE `product` SET `is_archived` = 1 WHERE id = ?");
		$stmt->execute([$data['id']]);

		if ($stmt->rowCount() > 0) {
			// Log activity
			$productName = $product['name'];
			$userId = $_SESSION['user_id'] ?? null;
			$logUrl = "https://api.cnergy.site/log_activity.php?action=Archive%20Product&details=" . urlencode("Product archived: {$productName} - Price: ₱{$product['price']}, Category: {$product['category']}");
			if ($userId) {
				$logUrl .= "&user_id=" . $userId;
			}
			file_get_contents($logUrl);

			echo json_encode(["success" => "Product archived successfully"]);
		} else {
			throw new Exception("Product not found");
		}
	} catch (Exception $e) {
		http_response_code(404);
		echo json_encode(["error" => $e->getMessage()]);
	}
}

function restoreProduct($pdo, $data)
{
	if (!isset($data['id']) || !is_numeric($data['id'])) {
		http_response_code(400);
		echo json_encode(["error" => "Invalid product ID"]);
		return;
	}

	try {
		// Check if is_archived column exists, if not, add it
		$checkColumnStmt = $pdo->query("SHOW COLUMNS FROM `product` LIKE 'is_archived'");
		if ($checkColumnStmt->rowCount() == 0) {
			// Add is_archived column if it doesn't exist
			$pdo->exec("ALTER TABLE `product` ADD COLUMN `is_archived` TINYINT(1) DEFAULT 0");
			$pdo->exec("ALTER TABLE `product` ADD INDEX `idx_is_archived` (`is_archived`)");
		}

		// Get product details before restoring for logging
		$productStmt = $pdo->prepare("SELECT name, price, category FROM product WHERE id = ?");
		$productStmt->execute([$data['id']]);
		$product = $productStmt->fetch();

		if (!$product) {
			throw new Exception("Product not found");
		}

		// Restore the product (set is_archived to 0)
		$stmt = $pdo->prepare("UPDATE `product` SET `is_archived` = 0 WHERE id = ?");
		$stmt->execute([$data['id']]);

		if ($stmt->rowCount() > 0) {
			// Log activity
			$productName = $product['name'];
			$userId = $_SESSION['user_id'] ?? null;
			$logUrl = "https://api.cnergy.site/log_activity.php?action=Restore%20Product&details=" . urlencode("Product restored: {$productName} - Price: ₱{$product['price']}, Category: {$product['category']}");
			if ($userId) {
				$logUrl .= "&user_id=" . $userId;
			}
			file_get_contents($logUrl);

			echo json_encode(["success" => "Product restored successfully"]);
		} else {
			throw new Exception("Product not found");
		}
	} catch (Exception $e) {
		http_response_code(404);
		echo json_encode(["error" => $e->getMessage()]);
	}
}

// POS Functions
function generateReceiptNumber($pdo)
{
	do {
		$receiptNumber = 'RCP' . date('Ymd') . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);

		$stmt = $pdo->prepare("SELECT COUNT(*) FROM sales WHERE receipt_number = ?");
		$stmt->execute([$receiptNumber]);
		$count = $stmt->fetchColumn();
	} while ($count > 0);

	return $receiptNumber;
}

function createPOSSale($pdo, $data)
{
	// Enhanced POS sale with transaction confirmation
	if (!isset($data['total_amount'], $data['sale_type'], $data['sales_details'], $data['payment_method'])) {
		http_response_code(400);
		echo json_encode(["error" => "Missing required POS fields"]);
		return;
	}

	$paymentMethod = $data['payment_method'];
	$amountReceived = $data['amount_received'] ?? $data['total_amount'];
	$changeGiven = max(0, $amountReceived - $data['total_amount']);
	$receiptNumber = generateReceiptNumber($pdo);
	$cashierId = $data['cashier_id'] ?? $data['staff_id'] ?? $_GET['staff_id'] ?? $_SESSION['user_id'] ?? null;
	$notes = $data['notes'] ?? '';

	$pdo->beginTransaction();

	try {
		$stmt = $pdo->prepare("
			INSERT INTO `sales` (user_id, total_amount, sale_type, sale_date, payment_method, transaction_status, receipt_number, cashier_id, change_given, notes)
			VALUES (?, ?, ?, NOW(), ?, 'confirmed', ?, ?, ?, ?)
		");
		$stmt->execute([
			$data['user_id'] ?? null,
			$data['total_amount'],
			$data['sale_type'],
			$paymentMethod,
			$receiptNumber,
			$cashierId,
			$changeGiven,
			$notes
		]);

		$saleId = $pdo->lastInsertId();

		foreach ($data['sales_details'] as $detail) {
			$stmt = $pdo->prepare("
				INSERT INTO `sales_details` (sale_id, product_id, subscription_id, quantity, price)
				VALUES (?, ?, ?, ?, ?)
			");
			$stmt->execute([
				$saleId,
				$detail['product_id'] ?? null,
				$detail['subscription_id'] ?? null,
				$detail['quantity'] ?? null,
				$detail['price']
			]);

			if (isset($detail['product_id']) && isset($detail['quantity'])) {
				$stmt = $pdo->prepare("
					UPDATE `product`
					SET stock = stock - ?
					WHERE id = ? AND stock >= ?
				");
				$stmt->execute([
					$detail['quantity'],
					$detail['product_id'],
					$detail['quantity']
				]);

				if ($stmt->rowCount() === 0) {
					throw new Exception("Insufficient stock for product ID: " . $detail['product_id']);
				}
			}
		}

		$pdo->commit();

		// Log activity using centralized logger (same as monitor_subscription.php)
		$staffId = $data['staff_id'] ?? null;
		error_log("DEBUG Sales POS - staffId: " . ($staffId ?? 'NULL') . " from request data");
		error_log("DEBUG Sales POS - Full request data: " . json_encode($data));
		logStaffActivity($pdo, $staffId, "Process POS Sale", "POS Sale completed: Total: ₱{$data['total_amount']}, Payment: {$paymentMethod}, Receipt: {$receiptNumber}, Change: ₱{$changeGiven}", "Sales");

		http_response_code(201);
		echo json_encode([
			"success" => "POS transaction completed successfully",
			"sale_id" => $saleId,
			"receipt_number" => $receiptNumber,
			"payment_method" => $paymentMethod,
			"change_given" => $changeGiven,
			"transaction_status" => "confirmed"
		]);

	} catch (Exception $e) {
		$pdo->rollBack();
		http_response_code(400);
		echo json_encode(["error" => $e->getMessage()]);
	}
}

function confirmTransaction($pdo, $data)
{
	if (!isset($data['sale_id'])) {
		http_response_code(400);
		echo json_encode(["error" => "Sale ID is required"]);
		return;
	}

	$saleId = $data['sale_id'];
	$paymentMethod = $data['payment_method'] ?? 'cash';
	$amountReceived = $data['amount_received'] ?? null;

	try {
		// Get current sale details
		$stmt = $pdo->prepare("SELECT total_amount, change_given FROM sales WHERE id = ?");
		$stmt->execute([$saleId]);
		$sale = $stmt->fetch();

		if (!$sale) {
			throw new Exception("Sale not found");
		}

		$changeGiven = 0;
		if ($amountReceived !== null) {
			$changeGiven = max(0, $amountReceived - $sale['total_amount']);
		}

		$stmt = $pdo->prepare("
			UPDATE sales 
			SET payment_method = ?, transaction_status = 'confirmed', change_given = ?
			WHERE id = ?
		");
		$stmt->execute([$paymentMethod, $changeGiven, $saleId]);

		// Log activity
		$userId = $_SESSION['user_id'] ?? null;
		$logUrl = "https://api.cnergy.site/log_activity.php?action=Confirm%20Transaction&details=" . urlencode("Transaction confirmed - Sale ID: {$saleId}, Payment: {$paymentMethod}, Change: ₱{$changeGiven}");
		if ($userId) {
			$logUrl .= "&user_id=" . $userId;
		}
		file_get_contents($logUrl);

		echo json_encode([
			"success" => "Transaction confirmed successfully",
			"sale_id" => $saleId,
			"payment_method" => $paymentMethod,
			"change_given" => $changeGiven
		]);

	} catch (Exception $e) {
		http_response_code(400);
		echo json_encode(["error" => $e->getMessage()]);
	}
}

function editTransaction($pdo, $data)
{
	if (!isset($data['sale_id'])) {
		http_response_code(400);
		echo json_encode(["error" => "Sale ID is required"]);
		return;
	}

	$saleId = $data['sale_id'];
	$pdo->beginTransaction();

	try {
		// Update sale details
		$updateFields = [];
		$params = [];

		if (isset($data['payment_method'])) {
			$updateFields[] = "payment_method = ?";
			$params[] = $data['payment_method'];
		}

		if (isset($data['amount_received'])) {
			$stmt = $pdo->prepare("SELECT total_amount FROM sales WHERE id = ?");
			$stmt->execute([$saleId]);
			$sale = $stmt->fetch();

			if ($sale) {
				$changeGiven = max(0, $data['amount_received'] - $sale['total_amount']);
				$updateFields[] = "change_given = ?";
				$params[] = $changeGiven;
			}
		}

		if (isset($data['notes'])) {
			$updateFields[] = "notes = ?";
			$params[] = $data['notes'];
		}

		if (!empty($updateFields)) {
			$params[] = $saleId;
			$stmt = $pdo->prepare("UPDATE sales SET " . implode(", ", $updateFields) . " WHERE id = ?");
			$stmt->execute($params);
		}

		$pdo->commit();

		// Log activity
		$userId = $_SESSION['user_id'] ?? null;
		$logUrl = "https://api.cnergy.site/log_activity.php?action=Edit%20Transaction&details=" . urlencode("Transaction edited - Sale ID: {$saleId}");
		if ($userId) {
			$logUrl .= "&user_id=" . $userId;
		}
		file_get_contents($logUrl);

		echo json_encode([
			"success" => "Transaction updated successfully",
			"sale_id" => $saleId
		]);

	} catch (Exception $e) {
		$pdo->rollBack();
		http_response_code(400);
		echo json_encode(["error" => $e->getMessage()]);
	}
}

function getCoachSales($pdo)
{
	// Get all coaches info.
	$stmt = $pdo->query("SELECT * FROM coaches");
	$coaches = $stmt->fetchAll();

	$out = [];
	foreach ($coaches as $coach) {
		// core profile info for frontend
		$coachObj = [
			'user_id' => $coach['user_id'],
			'id' => $coach['id'],
			'name' => trim(($coach['specialty'] ? $coach['specialty'] . ' ' : '') . $coach['id']), // or use join to users for real names
			'specialty' => $coach['specialty'],
			'monthly_rate' => $coach['monthly_rate'],
			'per_session_rate' => $coach['per_session_rate'],
			'rating' => $coach['rating'],
			'image_url' => $coach['image_url'],
			// add more fields if frontend needs them
		];
		// Get sales for this coach (may be none)
		$salesStmt = $pdo->prepare("SELECT sale_id, item, amount, sale_date, rate_type FROM coach_sales WHERE coach_user_id = ? ORDER BY sale_date DESC");
		if ($salesStmt->execute([$coach['user_id']])) {
			$rows = $salesStmt->fetchAll();
			foreach ($rows as &$row) {
				$row['amount'] = floatval($row['amount']);
			}
			$coachObj['sales'] = $rows;
		} else {
			$coachObj['sales'] = [];
		}
		$out[] = $coachObj;
	}
	echo json_encode(['coaches' => $out], JSON_UNESCAPED_UNICODE);
}
?>