[1mdiff --cc guest_session_admin.php[m
[1mindex 383ddf8,42f78c1..0000000[m
[1m--- a/guest_session_admin.php[m
[1m+++ b/guest_session_admin.php[m
[36m@@@ -651,11 -673,11 +683,15 @@@[m [mfunction createGuestSession($pdo, $data[m
  [m
          // Insert guest session with POS fields and PayMongo payment link ID[m
          $stmt = $pdo->prepare("[m
[31m-             INSERT INTO guest_session (guest_name, guest_type, amount_paid, qr_token, valid_until, paid, status, created_at, payment_method, payment_link_id, receipt_number, cashier_id, change_given)[m
[31m-             VALUES (?, ?, ?, ?, ?, 1, 'approved', NOW(), ?, ?, ?, ?, ?)[m
[32m+             INSERT INTO guest_session (guest_name, guest_type, amount_paid, qr_token, valid_until, paid, status, created_at, payment_method, payment_link_id, receipt_number, cashier_id, change_given, reference_number)[m
[32m+             VALUES (?, ?, ?, ?, ?, 1, 'approved', NOW(), ?, ?, ?, ?, ?, ?)[m
          ");[m
  [m
[32m++<<<<<<< HEAD[m
[32m +        $stmt->execute([$guestName, $guestType, $amountPaid, $qrToken, $validUntilStr, $paymentMethod, $paymentLinkId, $receiptNumber, $cashierId, $changeGiven]);[m
[32m++=======[m
[32m+         $stmt->execute([$guestName, $guestType, $amountPaid, $qrToken, $validUntil, $paymentMethod, $paymentLinkId, $receiptNumber, $cashierId, $changeGiven, $referenceNumber]);[m
[32m++>>>>>>> 3becf21b267ede957633d374e54560d59371cc9c[m
  [m
          $sessionId = $pdo->lastInsertId();[m
  [m
