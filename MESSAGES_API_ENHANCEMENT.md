# Messages API Enhancement for Admin Chat

## Issue
The current `conversations` endpoint in `messages.php` only returns conversations from `coach_member_list` table, which requires an approved relationship. Users who message admin directly from the mobile app might not have this relationship, so their messages don't appear in the conversations list.

## Solution
Add a new endpoint to `messages.php` that queries the `messages` table directly to find all users who have sent messages to admin.

## Code to Add to messages.php

Add this new case to the switch statement in `messages.php`:

```php
case 'get_admin_conversations':
    getAdminConversations($pdo);
    break;
```

Add this function to `messages.php`:

```php
// Get all conversations for admin - includes users who messaged admin directly
function getAdminConversations($pdo) {
    try {
        if (!isset($_GET['admin_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Admin ID is required']);
            exit();
        }

        $adminId = (int)$_GET['admin_id'];
        
        // Verify admin user exists and is actually an admin
        $adminCheck = $pdo->prepare("SELECT id, user_type_id FROM user WHERE id = ? AND user_type_id = 1");
        $adminCheck->execute([$adminId]);
        $admin = $adminCheck->fetch();
        
        if (!$admin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'User is not an admin']);
            exit();
        }

        // Get all unique users who have sent messages to admin
        // Messages can have receiver_id = 1 (admin user_type_id) OR receiver_id = adminId (specific admin user)
        $sql = "
            SELECT DISTINCT
                m.sender_id as other_user_id,
                u.fname,
                u.lname,
                u.email,
                u.user_type_id,
                (
                    SELECT message 
                    FROM messages m2 
                    WHERE (m2.sender_id = m.sender_id AND (m2.receiver_id = ? OR m2.receiver_id = 1))
                       OR (m2.sender_id = ? AND m2.receiver_id = m.sender_id)
                    ORDER BY m2.timestamp DESC 
                    LIMIT 1
                ) as last_message,
                (
                    SELECT timestamp 
                    FROM messages m2 
                    WHERE (m2.sender_id = m.sender_id AND (m2.receiver_id = ? OR m2.receiver_id = 1))
                       OR (m2.sender_id = ? AND m2.receiver_id = m.sender_id)
                    ORDER BY m2.timestamp DESC 
                    LIMIT 1
                ) as last_message_time,
                (
                    SELECT COUNT(*) 
                    FROM messages m2 
                    WHERE m2.sender_id = m.sender_id 
                      AND (m2.receiver_id = ? OR m2.receiver_id = 1)
                      AND m2.is_read = 0
                ) as unread_count,
                (
                    SELECT id 
                    FROM conversations 
                    WHERE (participant1_id = ? AND participant2_id = m.sender_id)
                       OR (participant1_id = m.sender_id AND participant2_id = ?)
                    LIMIT 1
                ) as conversation_id
            FROM messages m
            INNER JOIN user u ON m.sender_id = u.id
            WHERE (m.receiver_id = ? OR m.receiver_id = 1)
              AND m.sender_id != ?
              AND u.user_type_id != 1
            GROUP BY m.sender_id, u.fname, u.lname, u.email, u.user_type_id
            ORDER BY last_message_time DESC
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $adminId, $adminId, // for last_message subquery
            $adminId, $adminId, // for last_message_time subquery
            $adminId, // for unread_count subquery
            $adminId, $adminId, // for conversation_id subquery
            $adminId, // for receiver_id in WHERE
            $adminId  // for sender_id != in WHERE
        ]);
        
        $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format conversations to match the expected structure
        $formattedConversations = [];
        foreach ($conversations as $conv) {
            $formattedConversations[] = [
                'id' => (int)($conv['conversation_id'] ?? 0),
                'participant1_id' => $adminId,
                'participant2_id' => (int)$conv['other_user_id'],
                'created_at' => formatDateTimeToISO($conv['last_message_time']),
                'last_message' => $conv['last_message'] ?? '',
                'last_message_time' => formatDateTimeToISO($conv['last_message_time']),
                'unread_count' => (int)($conv['unread_count'] ?? 0),
                'other_user' => [
                    'id' => (int)$conv['other_user_id'],
                    'fname' => $conv['fname'] ?? '',
                    'lname' => $conv['lname'] ?? '',
                    'email' => $conv['email'] ?? '',
                    'user_type_id' => (int)$conv['user_type_id'],
                    'is_online' => 0
                ],
                'is_support_request' => false
            ];
        }
        
        echo json_encode([
            'success' => true,
            'conversations' => $formattedConversations
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error fetching admin conversations: ' . $e->getMessage()
        ]);
    }
}
```

## Alternative: Simpler Query

If the above is too complex, use this simpler version:

```php
function getAdminConversations($pdo) {
    try {
        if (!isset($_GET['admin_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Admin ID is required']);
            exit();
        }

        $adminId = (int)$_GET['admin_id'];
        
        // Get all unique senders who have sent messages to admin
        // Check both receiver_id = adminId and receiver_id = 1 (admin user_type_id)
        $sql = "
            SELECT DISTINCT
                m.sender_id,
                u.fname,
                u.lname,
                u.email,
                u.user_type_id
            FROM messages m
            INNER JOIN user u ON m.sender_id = u.id
            WHERE (m.receiver_id = ? OR m.receiver_id = 1)
              AND m.sender_id != ?
              AND u.user_type_id != 1
            ORDER BY m.timestamp DESC
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$adminId, $adminId]);
        $senders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $conversations = [];
        foreach ($senders as $sender) {
            $senderId = (int)$sender['sender_id'];
            
            // Get last message
            $lastMsgStmt = $pdo->prepare("
                SELECT message, timestamp 
                FROM messages 
                WHERE ((sender_id = ? AND (receiver_id = ? OR receiver_id = 1))
                    OR (sender_id = ? AND receiver_id = ?))
                ORDER BY timestamp DESC 
                LIMIT 1
            ");
            $lastMsgStmt->execute([$senderId, $adminId, $adminId, $senderId]);
            $lastMsg = $lastMsgStmt->fetch();
            
            // Get unread count
            $unreadStmt = $pdo->prepare("
                SELECT COUNT(*) as unread_count 
                FROM messages 
                WHERE sender_id = ? 
                  AND (receiver_id = ? OR receiver_id = 1)
                  AND is_read = 0
            ");
            $unreadStmt->execute([$senderId, $adminId]);
            $unread = $unreadStmt->fetch();
            
            // Get or create conversation
            $convStmt = $pdo->prepare("
                SELECT id FROM conversations 
                WHERE (participant1_id = ? AND participant2_id = ?)
                   OR (participant1_id = ? AND participant2_id = ?)
                LIMIT 1
            ");
            $participant1 = min($adminId, $senderId);
            $participant2 = max($adminId, $senderId);
            $convStmt->execute([$participant1, $participant2, $participant2, $participant1]);
            $conv = $convStmt->fetch();
            
            $conversations[] = [
                'id' => $conv ? (int)$conv['id'] : 0,
                'participant1_id' => $adminId,
                'participant2_id' => $senderId,
                'created_at' => formatDateTimeToISO($lastMsg['timestamp'] ?? null),
                'last_message' => $lastMsg['message'] ?? '',
                'last_message_time' => formatDateTimeToISO($lastMsg['timestamp'] ?? null),
                'unread_count' => (int)($unread['unread_count'] ?? 0),
                'other_user' => [
                    'id' => $senderId,
                    'fname' => $sender['fname'] ?? '',
                    'lname' => $sender['lname'] ?? '',
                    'email' => $sender['email'] ?? '',
                    'user_type_id' => (int)$sender['user_type_id'],
                    'is_online' => 0
                ],
                'is_support_request' => false
            ];
        }
        
        echo json_encode([
            'success' => true,
            'conversations' => $conversations
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error: ' . $e->getMessage()
        ]);
    }
}
```

## Frontend Update

The frontend is already set up to use this endpoint. It will try:
1. First: `get_admin_conversations` endpoint (if you add it)
2. Fallback: `conversations` endpoint (existing)

## Testing

After adding the endpoint to `messages.php`:

1. Test URL: `https://api.cnergy.site/messages.php?action=get_admin_conversations&admin_id={userId}`
2. Should return all users who have sent messages to admin
3. Frontend will automatically use this endpoint

## Notes

- This endpoint queries the `messages` table directly
- It finds all users who sent messages to admin (receiver_id = 1 or receiver_id = adminId)
- It excludes admin users (user_type_id != 1)
- It includes last message, timestamp, and unread count
- It creates virtual conversations if no conversation record exists

