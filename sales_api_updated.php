<?php
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
			deleteProduct($pdo, $data);
			break;
		default:
			http_response_code(400);
			echo json_encode(["error" => "Invalid action for DELETE request"]);
			break;
	}
}


function getProductsData($pdo)
{
	$stmt = $pdo->query("SELECT * FROM `product` ORDER BY category, name");
	$products = $stmt->fetchAll();
	echo json_encode(["products" => $products ?: []]);
}

function getSalesData($pdo)
{
	$saleType = $_GET['sale_type'] ?? '';
	$dateFilter = $_GET['date_filter'] ?? '';
	$month = $_GET['month'] ?? '';
	$year = $_GET['year'] ?? '';
	$customDate = $_GET['custom_date'] ?? '';

	// Build WHERE conditions
	$whereConditions = [];
	$params = [];

	if ($saleType && $saleType !== 'all') {
		$whereConditions[] = "s.sale_type = ?";
		$params[] = $saleType;
	}

	// Handle custom date first (highest priority)
	if ($customDate) {
		$whereConditions[] = "DATE(s.sale_date) = ?";
		$params[] = $customDate;
	} elseif ($month && $month !== 'all' && $year && $year !== 'all') {
		// Specific month and year
		$whereConditions[] = "MONTH(s.sale_date) = ? AND YEAR(s.sale_date) = ?";
		$params[] = $month;
		$params[] = $year;
	} elseif ($month && $month !== 'all') {
		// Specific month (current year)
		$whereConditions[] = "MONTH(s.sale_date) = ? AND YEAR(s.sale_date) = YEAR(CURDATE())";
		$params[] = $month;
	} elseif ($year && $year !== 'all') {
		// Specific year
		$whereConditions[] = "YEAR(s.sale_date) = ?";
		$params[] = $year;
	} elseif ($dateFilter && $dateFilter !== 'all') {
		// Default date filters
		switch ($dateFilter) {
			case 'today':
				$whereConditions[] = "DATE(s.sale_date) = CURDATE()";
				break;
			case 'week':
				$whereConditions[] = "s.sale_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)";
				break;
			case 'month':
				$whereConditions[] = "MONTH(s.sale_date) = MONTH(CURDATE()) AND YEAR(s.sale_date) = YEAR(CURDATE())";
				break;
			case 'year':
				$whereConditions[] = "YEAR(s.sale_date) = YEAR(CURDATE())";
				break;
		}
	}

	$whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";

	$stmt = $pdo->prepare("
		SELECT s.id, s.user_id, s.total_amount, s.sale_date, s.sale_type,
		       s.payment_method, s.transaction_status, s.receipt_number, s.cashier_id, s.change_given, s.notes,
		       sd.id AS detail_id, sd.product_id, sd.subscription_id, sd.guest_session_id, sd.quantity, sd.price AS detail_price,
		       p.name AS product_name, p.price AS product_price, p.category AS product_category,
		       sub.plan_id, sub.user_id AS subscription_user_id,
		       msp.plan_name,
		       CONCAT_WS(' ', u.fname, u.mname, u.lname) AS member_fullname,
		       CONCAT_WS(' ', u_sub.fname, u_sub.mname, u_sub.lname) AS subscription_member_fullname,
		       cml.coach_id,
		       CONCAT_WS(' ', u_coach.fname, u_coach.mname, u_coach.lname) AS coach_fullname,
		       gs.guest_name
		FROM `sales` s
		LEFT JOIN `sales_details` sd ON s.id = sd.sale_id
		LEFT JOIN `product` p ON sd.product_id = p.id
		LEFT JOIN `subscription` sub ON sd.subscription_id = sub.id
		LEFT JOIN `member_subscription_plan` msp ON sub.plan_id = msp.id
		LEFT JOIN `user` u ON s.user_id = u.id
		LEFT JOIN `user` u_sub ON sub.user_id = u_sub.id
		LEFT JOIN `guest_session` gs ON (
			(sd.guest_session_id IS NOT NULL AND sd.guest_session_id = gs.id)
			OR (s.sale_type IN ('Guest', 'Walk-in', 'Walkin', 'Day Pass') AND s.receipt_number = gs.receipt_number AND s.receipt_number IS NOT NULL)
		)
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
		$whereClause
		ORDER BY s.sale_date DESC
	");

	$stmt->execute($params);

	$salesData = $stmt->fetchAll();
	$salesGrouped = [];

	foreach ($salesData as $row) {
		$saleId = $row['id'];

		if (!isset($salesGrouped[$saleId])) {
			// Get member name - prefer from sales.user_id, fallback to subscription.user_id
			$memberName = !empty($row['member_fullname']) ? trim($row['member_fullname']) : null;
			if (empty($memberName) && !empty($row['subscription_member_fullname'])) {
				$memberName = trim($row['subscription_member_fullname']);
			}
			
			// Get guest name for guest/walk-in sales
			$guestName = !empty($row['guest_name']) ? trim($row['guest_name']) : null;
			
			// Get user_id - prefer from sales, fallback to subscription
			$userId = $row['user_id'] ?? $row['subscription_user_id'] ?? null;
			
			// Get coach name for coaching sales
			$coachName = !empty($row['coach_fullname']) ? trim($row['coach_fullname']) : null;
			$coachId = !empty($row['coach_id']) ? (int)$row['coach_id'] : null;
			
			// For guest/walk-in sales, use guest_name instead of user_name
			$displayName = null;
			if (in_array($row['sale_type'], ['Guest', 'Walk-in', 'Walkin', 'Day Pass'])) {
				$displayName = $guestName;
			} else {
				$displayName = $memberName;
			}
			
			$salesGrouped[$saleId] = [
				'id' => $row['id'],
				'total_amount' => (float) $row['total_amount'],
				'sale_date' => $row['sale_date'],
				'sale_type' => $row['sale_type'],
				'payment_method' => $row['payment_method'],
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
		} else {
			// If coach info wasn't set in first row but exists in this row, update it
			if (empty($salesGrouped[$saleId]['coach_name']) && !empty($row['coach_fullname'])) {
				$salesGrouped[$saleId]['coach_name'] = trim($row['coach_fullname']);
				$salesGrouped[$saleId]['coach_id'] = !empty($row['coach_id']) ? (int)$row['coach_id'] : null;
			}
			// If guest info wasn't set but exists in this row, update it
			if (empty($salesGrouped[$saleId]['guest_name']) && !empty($row['guest_name'])) {
				$salesGrouped[$saleId]['guest_name'] = trim($row['guest_name']);
				// Update user_name for guest sales
				if (in_array($salesGrouped[$saleId]['sale_type'], ['Guest', 'Walk-in', 'Walkin', 'Day Pass'])) {
					$salesGrouped[$saleId]['user_name'] = trim($row['guest_name']);
				}
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
					'plan_name' => $row['plan_name']
				];
				// Also store plan info at sale level for easy access in frontend
				if (!isset($salesGrouped[$saleId]['plan_name']) && !empty($row['plan_name'])) {
					$salesGrouped[$saleId]['plan_name'] = $row['plan_name'];
					$salesGrouped[$saleId]['plan_id'] = $row['plan_id'];
				}
			}

			$salesGrouped[$saleId]['sales_details'][] = $detail;
		}
	}

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

	// Get low stock items (only relevant for product sales)
	$stmt = $pdo->prepare("
		SELECT COUNT(*) AS low_stock_count
		FROM `product`
		WHERE stock <= 10
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

function deleteProduct($pdo, $data)
{
	if (!isset($data['id']) || !is_numeric($data['id'])) {
		http_response_code(400);
		echo json_encode(["error" => "Invalid product ID"]);
		return;
	}

	// Begin transaction to ensure data integrity
	$pdo->beginTransaction();

	try {
		// Get product details before deletion for logging
		$productStmt = $pdo->prepare("SELECT name, price, category FROM product WHERE id = ?");
		$productStmt->execute([$data['id']]);
		$product = $productStmt->fetch();

		if (!$product) {
			throw new Exception("Product not found");
		}

		// First, delete all sales_details that reference this product
		$deleteDetailsStmt = $pdo->prepare("DELETE FROM `sales_details` WHERE product_id = ?");
		$deleteDetailsStmt->execute([$data['id']]);

		// Now delete the product
		$stmt = $pdo->prepare("DELETE FROM `product` WHERE id = ?");
		$stmt->execute([$data['id']]);

		if ($stmt->rowCount() > 0) {
			// Commit the transaction
			$pdo->commit();

			// Log activity using dedicated logging file
			$productName = $product['name'];
			$userId = $_SESSION['user_id'] ?? null;
			$logUrl = "https://api.cnergy.site/log_activity.php?action=Delete%20Product&details=" . urlencode("Product deleted: {$productName} - Price: ₱{$product['price']}, Category: {$product['category']}");
			if ($userId) {
				$logUrl .= "&user_id=" . $userId;
			}
			file_get_contents($logUrl);

			echo json_encode(["success" => "Product deleted successfully"]);
		} else {
			throw new Exception("Product not found");
		}
	} catch (Exception $e) {
		// Rollback transaction on error
		$pdo->rollBack();
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

function getCoachSales($pdo) {
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