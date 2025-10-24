# CNERGY GYM Announcement Email System

## Overview
This system automatically sends email announcements to all users whenever an admin creates an announcement. The system is integrated with your existing announcement.php API.

## Files Created/Updated

### 1. `announcement_email_system.php`
- **Purpose**: Core email service class that handles sending announcements to users
- **Features**:
  - Sends emails to all users or specific user types
  - Beautiful HTML email templates with different styles for different announcement types
  - Plain text fallback for email clients that don't support HTML
  - Automatic activity logging
  - Error handling and detailed reporting

### 2. `announcement.php` (Updated)
- **Purpose**: Your existing announcement API, now enhanced with email functionality
- **New Features**:
  - Automatically sends emails when announcements are created
  - Configurable email settings
  - Detailed email sending results

### 3. `test_announcement.php`
- **Purpose**: Test interface to verify the email system is working
- **Features**:
  - Test different announcement types
  - Test sending to different user groups
  - Visual feedback on email sending results

## How It Works

### 1. Creating an Announcement with Email
When you create an announcement via POST request to `announcement.php`, the system will:

1. Save the announcement to the database
2. Automatically send emails to all users (or specified user types)
3. Return both the announcement data and email sending results

### 2. Email Templates
The system includes beautiful HTML email templates with:
- **Different styles** for different announcement types (maintenance, promotion, emergency, etc.)
- **Responsive design** that works on all devices
- **Professional branding** with CNERGY GYM colors and logo
- **Plain text fallback** for email clients that don't support HTML

## Usage Examples

### Frontend Integration
```javascript
// Create announcement and send emails to all users
fetch('/announcement.php', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        title: 'Gym Maintenance Scheduled',
        content: 'We will be performing routine maintenance on our equipment this Saturday from 6 AM to 12 PM. The gym will remain open during this time, but some equipment may be temporarily unavailable.',
        status: 'active',
        priority: 'high',
        send_email: true,           // Enable email sending
        admin_id: 1,               // ID of admin creating the announcement
        announcement_type: 'maintenance', // Type of announcement
        send_to_all: true,         // Send to all users (default: all user types)
        user_types: ['admin', 'staff', 'coach', 'customer'] // Default includes all user types
    })
})
.then(response => response.json())
.then(data => {
    console.log('Announcement created:', data);
    if (data.email_result) {
        console.log('Email results:', data.email_result);
        console.log('Emails sent:', data.email_result.results.emails_sent);
        console.log('Emails failed:', data.email_result.results.emails_failed);
    }
});
```

### Send to Specific User Types Only
```javascript
fetch('/announcement.php', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        title: 'New Group Fitness Classes',
        content: 'We are excited to announce new group fitness classes starting next week!',
        status: 'active',
        priority: 'medium',
        send_email: true,
        admin_id: 1,
        announcement_type: 'promotion',
        send_to_all: false,        // Don't send to all users
        user_types: ['customer']   // Send only to customers (default is all user types)
    })
})
```

### Create Announcement Without Email
```javascript
fetch('/announcement.php', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        title: 'Draft Announcement',
        content: 'This is a draft announcement that will not be emailed.',
        status: 'active',
        priority: 'low',
        send_email: false          // Disable email sending
    })
})
```

## Available Options

### Announcement Types
- `general` - General announcements (default)
- `maintenance` - Maintenance notices
- `promotion` - Promotional offers
- `emergency` - Emergency notices
- `event` - Event announcements
- `policy` - Policy updates

### User Types
- `admin` - Administrators
- `staff` - Staff members
- `coach` - Coaches
- `customer` - Customers/Members

### Priority Levels
- `low` - Low priority
- `medium` - Medium priority
- `high` - High priority

## Testing the System

1. **Access the test interface**: Navigate to `test_announcement.php` in your browser
2. **Test different scenarios**: Use the test buttons to send announcements to different user groups
3. **Check email results**: The test interface will show you detailed results of email sending
4. **Verify emails**: Check that emails are actually being received by users

## Database Requirements

The system uses your existing database tables:
- `user` - User information and email addresses
- `usertype` - User type definitions
- `announcement` - Announcement storage
- `activity_log` - Activity logging

## Email Configuration

The system uses PHP's built-in `mail()` function with the following settings:
- **From Email**: `cnergyfitnessgym@cnergy.site`
- **From Name**: `CNERGY GYM`
- **Reply-To**: `cnergyfitnessgym@cnergy.site`

## Error Handling

The system includes comprehensive error handling:
- **Database connection errors**: Gracefully handled with error messages
- **Email sending failures**: Detailed error reporting for each failed email
- **Invalid input**: Validation for required fields
- **Activity logging**: All announcement activities are logged for audit purposes

## Security Features

- **CORS protection**: Only allows requests from trusted origins
- **Input validation**: All input is validated and sanitized
- **SQL injection protection**: Uses prepared statements
- **XSS protection**: HTML content is properly escaped

## Monitoring and Logging

The system logs all activities:
- **Email sending attempts**: Success/failure for each email
- **Database operations**: All CRUD operations are logged
- **Error messages**: Detailed error logging for troubleshooting
- **Activity tracking**: Admin actions are tracked in the activity log

## Troubleshooting

### Common Issues

1. **Emails not being sent**
   - Check PHP mail configuration
   - Verify SMTP settings
   - Check error logs for specific error messages

2. **Database connection errors**
   - Verify database credentials
   - Check database server status
   - Ensure database exists and is accessible

3. **CORS errors**
   - Verify allowed origins in the CORS configuration
   - Check that requests are coming from allowed domains

### Debug Mode
To enable debug mode, check the error logs for detailed information about email sending and database operations.

## Support

For technical support or questions about the announcement system, please check:
1. Error logs for specific error messages
2. Database connectivity and permissions
3. PHP mail configuration
4. CORS settings for your domain

The system is designed to be robust and handle errors gracefully while providing detailed feedback about the success or failure of operations.
