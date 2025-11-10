# Admin Chat - Floating Message Button Implementation

## Overview
A floating message button has been added to the admin dashboard that allows admins to receive and respond to messages from users. This integrates with the existing messaging system used by the mobile app.

## Features

### 1. Floating Message Button
- **Location**: Fixed position at bottom-right corner of the screen
- **Design**: Orange gradient circular button with message icon
- **Unread Badge**: Shows count of unread messages (pulsing animation)
- **Responsive**: Adapts to different screen sizes
- **Accessibility**: Proper ARIA labels and keyboard navigation

### 2. Chat Panel
- **Conversations List**: Shows all users who have messaged the admin
- **Search**: Filter conversations by user name, email, or message content
- **Message View**: Full chat interface with message history
- **Real-time Updates**: Auto-refreshes every 10 seconds when open
- **Minimize/Maximize**: Can be minimized to header bar only
- **Dark Mode**: Full support for dark mode theme

### 3. Message Features
- **Send Messages**: Admin can reply to user messages
- **Message Status**: Shows read/unread status with icons
- **Timestamp**: Displays message time (today, yesterday, or date)
- **User Info**: Shows user name, email, and avatar initials
- **Auto-scroll**: Automatically scrolls to latest message
- **Enter to Send**: Press Enter to send message (Shift+Enter for new line)

### 4. User Experience
- **Smooth Animations**: Transitions and hover effects
- **Loading States**: Shows loading indicators during data fetch
- **Error Handling**: Graceful error handling with toast notifications
- **Empty States**: Helpful messages when no conversations exist
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Files Created/Modified

### New Files
1. `app/admindashboard/admin/admin-chat.js`
   - Main chat component
   - Handles conversations, messages, and UI state
   - Integrates with messages.php API

### Modified Files
1. `app/admindashboard/admin/client-wrapper.js`
   - Added AdminChat component import
   - Added AdminChat to render with userId prop

## API Integration

### Endpoints Used
1. **GET** `/messages.php?action=conversations&user_id={userId}`
   - Fetches all conversations for the admin
   - Returns conversations with last message, unread count, and user info

2. **GET** `/messages.php?action=messages&conversation_id={id}&user_id={userId}`
   - Fetches messages for a specific conversation
   - Supports virtual conversations (conversation_id=0) with other_user_id

3. **POST** `/messages.php?action=send_message`
   - Sends a message from admin to user
   - Creates conversation if it doesn't exist
   - Updates support_requests table for admin messages

### API Response Format
```json
{
  "success": true,
  "conversations": [
    {
      "id": 1,
      "participant1_id": 1,
      "participant2_id": 5,
      "created_at": "2025-01-15T10:30:00Z",
      "last_message": "Hello admin",
      "last_message_time": "2025-01-15T10:35:00Z",
      "unread_count": 2,
      "other_user": {
        "id": 5,
        "fname": "John",
        "lname": "Doe",
        "email": "john@example.com",
        "user_type_id": 4
      }
    }
  ]
}
```

## Database Schema

### Tables Used
1. **conversations**
   - Stores conversation records between users
   - Fields: id, participant1_id, participant2_id, created_at

2. **messages**
   - Stores individual messages
   - Fields: id, sender_id, receiver_id, message, timestamp, is_read
   - Admin messages use receiver_id = 1 (user_type_id) or admin userId

3. **support_requests**
   - Linked to messages sent to admin
   - Created when users message admin via mobile app
   - Source: 'mobile_app_chat'

## Styling

### Color Scheme
- **Primary**: Orange gradient (from-orange-500 to-orange-600)
- **Unread Badge**: Red (bg-red-500)
- **Message Bubbles**: 
  - Admin: Orange (bg-orange-500)
  - User: Gray (bg-gray-100 dark:bg-gray-700)
- **Background**: White/Dark gray (supports dark mode)

### Components Used
- shadcn/ui components (Button, Input, Badge, ScrollArea, Avatar)
- Lucide React icons
- Tailwind CSS for styling
- date-fns for date formatting

## Potential API Enhancements

### Current Limitation
The existing `conversations` endpoint may only return conversations from `coach_member_list` relationships. Users who message admin directly might not appear if they don't have a coach relationship.

### Recommended Enhancement
Add a new endpoint or enhance the existing one to return all users who have sent messages to admin:

```php
// Enhanced endpoint: get_all_admin_conversations
// Should return:
// 1. Conversations from coach_member_list (existing)
// 2. All unique users who have sent messages to admin (receiver_id = 1 or receiver_id = admin userId)
// 3. Support requests linked to messages
```

### Implementation Suggestion
```php
// In messages.php, add new action:
case 'get_all_admin_conversations':
    getAllAdminConversations($pdo, $userId);
    break;

function getAllAdminConversations($pdo, $adminId) {
    // Get all messages where receiver_id = adminId or receiver_id = 1 (admin user_type_id)
    // Group by sender_id
    // Return unique users with last message and unread count
}
```

## Usage

### For Admins
1. Click the floating message button (bottom-right)
2. View list of users who have messaged
3. Click on a user to open conversation
4. Type message and press Enter or click Send
5. Minimize/close chat panel as needed

### Unread Count
- Badge shows total unread messages across all conversations
- Updates automatically every 30 seconds when chat is closed
- Updates every 10 seconds when chat is open
- Pulsing animation draws attention to new messages

## Mobile Responsiveness

### Button
- Smaller on mobile (w-14 h-14)
- Larger on desktop (sm:w-16 sm:h-16)
- Positioned to avoid mobile browser UI

### Chat Panel
- Full width on mobile (w-[calc(100vw-2rem)])
- Fixed width on desktop (sm:w-96)
- Responsive height (max-h-[calc(100vh-3rem)])
- Touch-friendly interface

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for instant message delivery
2. **File Attachments**: Support for image/file sharing
3. **Message Reactions**: Emoji reactions to messages
4. **Typing Indicators**: Show when user is typing
5. **Message Search**: Search within conversation history
6. **Message Forwarding**: Forward messages to other admins
7. **Notifications**: Browser notifications for new messages
8. **Message Templates**: Pre-written response templates
9. **Conversation Notes**: Internal notes for admins
10. **Analytics**: Message statistics and response times

## Testing

### Test Cases
1. ✅ Open chat panel
2. ✅ View conversations list
3. ✅ Search conversations
4. ✅ Open conversation and view messages
5. ✅ Send message to user
6. ✅ Receive new messages (auto-refresh)
7. ✅ Unread count updates
8. ✅ Minimize/maximize chat
9. ✅ Close chat panel
10. ✅ Dark mode support
11. ✅ Mobile responsiveness
12. ✅ Error handling

## Troubleshooting

### No Conversations Showing
- Check if users have sent messages to admin
- Verify API endpoint is working
- Check browser console for errors
- Ensure userId is set correctly

### Messages Not Sending
- Check API endpoint availability
- Verify userId and receiver_id
- Check browser console for errors
- Ensure message is not empty

### Unread Count Not Updating
- Check if API returns unread_count correctly
- Verify messages have is_read = 0
- Check auto-refresh interval
- Clear browser cache if needed

## Notes

- The component requires a valid `userId` prop to function
- Messages are stored in the `messages` table
- Support requests are created when users message admin via mobile app
- The chat integrates with the existing messaging system
- All API calls use the same base URL: `https://api.cnergy.site/messages.php`

## Support

For issues or enhancements, refer to:
- API documentation: `messages.php`
- Database schema: See SQL file for table structures
- Component code: `app/admindashboard/admin/admin-chat.js`

