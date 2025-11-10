# System Overview - Cnergy Gym Web Admin

## Architecture

### Backend
- **Language**: PHP
- **Database**: MySQL (`u773938685_cnergydb`)
- **API Pattern**: RESTful (GET, POST, PUT, DELETE)
- **API Base URL**: `https://api.cnergy.site/`
- **Database Connection**: PDO with error handling and UTF-8 encoding

### Frontend
- **Framework**: Next.js (React)
- **UI Library**: shadcn/ui components
- **Styling**: Tailwind CSS with dark mode support
- **State Management**: React hooks (useState, useEffect)
- **Forms**: React Hook Form with Zod validation

## Database Structure

### Key Tables
- `user` - All users (admins, staff, coaches, members)
  - User types: 1=Admin, 2=Staff, 3=Coach, 4=Member
  - Account statuses: pending, approved, rejected, deactivated
- `support_requests` - Support request submissions
- `activity_log` - System activity tracking
- `subscription` - Member subscriptions
- `sales` - Sales transactions
- `product` - Product inventory
- `coach_member_list` - Coach assignments
- `attendance` - Attendance records

### Support Requests Table Schema
```sql
support_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_email VARCHAR(255),
  subject VARCHAR(255),
  message TEXT,
  source VARCHAR(50), -- mobile_app_deactivation, mobile_app, web
  created_at DATETIME
)
```

## Support Requests System

### Current Implementation

#### Backend (`support_requests.php`)
- **Current Capabilities**: READ-ONLY
  - GET: Fetches all support requests
  - No POST/PUT/DELETE operations
  - Returns: id, user_email, subject, message, source, created_at
  - Orders by created_at DESC (newest first)

#### Frontend (`app/admindashboard/admin/supportrequests.js`)
- **Features**:
  - View all support requests in a list
  - Search functionality (email, subject, message, source)
  - View request details in a dialog
  - Source badges with color coding:
    - `mobile_app_deactivation`: Orange
    - `mobile_app`: Blue
    - `web`: Purple
  - Date formatting with date-fns
  - Refresh button to reload requests
  - Loading states and error handling

### Integration Points
- **Sidebar**: Listed as "Support Requests" with headset icon
- **Client Wrapper**: Rendered when `currentSection === "SupportRequests"`
- **API Endpoint**: `https://api.cnergy.site/support_requests.php`

## Activity Logging System

### Pattern
```php
require 'activity_logger.php';

logStaffActivity($pdo, $staffId, $action, $message, $category);
```

### Parameters
- `$pdo`: Database connection
- `$staffId`: User ID of admin/staff performing action
- `$action`: Action name (e.g., "Add Member", "Update Member Status")
- `$message`: Detailed message describing the action
- `$category`: Category for grouping (e.g., "Member Management", "Sales")

### Activity Categories
- Member Management
- Subscription Management
- Coach Management
- Sales
- Inventory Management
- Guest Management
- Coach Assignment
- Other

## Common API Patterns

### Database Connection
```php
$host = "localhost";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";

$pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
```

### CORS Headers
```php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
```

### Response Function
```php
function respond($payload, $code = 200) {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}
```

### Error Handling
```php
try {
    // Database operations
} catch (PDOException $e) {
    error_log('Error: ' . $e->getMessage());
    respond(['error' => 'Database error occurred'], 500);
}
```

## Frontend Component Patterns

### Common Imports
```javascript
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
```

### Data Fetching Pattern
```javascript
const fetchData = async () => {
  try {
    setIsLoading(true)
    const response = await fetch("https://api.cnergy.site/endpoint.php")
    const data = await response.json()
    setData(data)
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to fetch data",
      variant: "destructive",
    })
  } finally {
    setIsLoading(false)
  }
}
```

### Search/Filter Pattern
```javascript
const [searchQuery, setSearchQuery] = useState("")
const [filteredData, setFilteredData] = useState([])

useEffect(() => {
  if (searchQuery.trim() === "") {
    setFilteredData(data)
  } else {
    const filtered = data.filter(item =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredData(filtered)
  }
}, [searchQuery, data])
```

## User Roles & Permissions

### User Types
1. **Admin** (user_type_id: 1)
   - Full system access
   - Can manage all users, staff, coaches, members
   - Can view support requests
   - Can manage subscriptions, sales, inventory

2. **Staff** (user_type_id: 2)
   - Limited admin access
   - Can manage members, sales, attendance
   - Can process subscriptions
   - Can view support requests (likely)

3. **Coach** (user_type_id: 3)
   - Coach-specific features
   - Member assignments
   - Exercise/program management

4. **Member** (user_type_id: 4)
   - Customer access
   - View own subscriptions
   - Submit support requests

## Key Features

### Admin Dashboard Sections
1. Home
2. View Users (Members)
3. View Staff
4. View Coach
5. Staff Monitoring (Activity Logs)
6. Subscription Plans
7. Monitor Subscriptions
8. Sales
9. Attendance Tracking
10. Day Pass Access (Guest Management)
11. Coach Assignments
12. Exercises
13. Free Programs
14. Promotions
15. Merchandise
16. Announcement
17. **Support Requests**

### Common Features Across Modules
- Search functionality
- Filter by status/date/category
- Pagination or infinite scroll
- View details in dialog
- Create/Edit/Delete operations
- Status badges
- Date formatting
- Loading states
- Error handling with toast notifications
- Dark mode support
- Responsive design

## Support Requests - Enhancement Opportunities

### Potential Additions
1. **Status Management**
   - Add `status` field (pending, in_progress, resolved, closed)
   - Update status functionality
   - Status filter in frontend

2. **Response System**
   - Add `responses` table for admin replies
   - Reply functionality in frontend
   - Email notifications to users

3. **Assignment**
   - Assign requests to staff members
   - Add `assigned_to` field
   - Assignment dropdown in frontend

4. **Priority System**
   - Add `priority` field (low, medium, high, urgent)
   - Priority badges and filtering

5. **Notes/Internal Comments**
   - Internal notes for admin/staff
   - Separate from user-visible responses

6. **Activity Tracking**
   - Log when requests are viewed/updated
   - Track response times
   - Integration with activity_log system

7. **Email Integration**
   - Send email notifications when request is created
   - Send email when admin responds
   - Email templates

8. **Attachments**
   - Support for file uploads
   - Image/document attachments

9. **Categories/Tags**
   - Categorize requests (billing, technical, account, etc.)
   - Tag system for better organization

10. **Analytics**
    - Request statistics
    - Response time metrics
    - Resolution rates
    - Source analytics

## API Endpoints Reference

### Existing APIs
- `member_management.php` - Member CRUD operations
- `monitor_subscription.php` - Subscription management
- `sales_api_updated.php` - Sales and product management
- `staff_monitoring.php` - Activity logs and staff performance
- `support_requests.php` - Support requests (GET only)
- `attendance.php` - Attendance tracking
- `announcement_email_system.php` - Announcements and emails

### API Patterns
- GET: Fetch data (with optional query parameters)
- POST: Create new records
- PUT: Update existing records
- DELETE: Delete records
- OPTIONS: CORS preflight

## Authentication & Session

### Session Management
- PHP sessions for backend
- Session storage for frontend (user_id, role)
- Session validation via `session.php`
- Logout via `logout.php`

### User Context
- `userId` passed to components that need it
- Retrieved from sessionStorage or API
- Used for activity logging

## Error Handling

### Backend
- Try-catch blocks for database operations
- Error logging with `error_log()`
- JSON error responses with appropriate HTTP status codes
- Validation of input data

### Frontend
- Try-catch for API calls
- Toast notifications for errors
- Loading states during operations
- Error boundaries for React components

## Styling & UI

### Components
- shadcn/ui component library
- Consistent card-based layouts
- Dialog modals for forms/details
- Badge components for status
- Table components for data display
- Form components with validation

### Dark Mode
- Toggle in sidebar
- Persisted in localStorage
- Applied via Tailwind dark: classes
- System-wide support

## Next Steps for Support Requests Enhancement

When adding features to support requests, consider:

1. **Database Schema Updates**
   - Add new columns to `support_requests` table
   - Create related tables (responses, notes, etc.)
   - Add indexes for performance

2. **Backend API Updates**
   - Add POST endpoint for creating responses
   - Add PUT endpoint for updating status
   - Add DELETE endpoint if needed
   - Implement activity logging

3. **Frontend Updates**
   - Add response form component
   - Add status update functionality
   - Add assignment dropdown
   - Update UI to show new features
   - Add filters for new fields

4. **Integration**
   - Email notifications
   - Activity logging
   - User notifications
   - Analytics integration

## File Structure

```
/
├── app/
│   ├── admindashboard/
│   │   ├── admin/
│   │   │   ├── supportrequests.js (Frontend)
│   │   │   ├── sidebar.js
│   │   │   ├── client-wrapper.js
│   │   │   └── ... (other components)
│   │   └── page.js
│   └── ...
├── support_requests.php (Backend API)
├── member_management.php
├── monitor_subscription.php
├── sales_api_updated.php
├── staff_monitoring.php
└── ...
```

## Notes

- All APIs use the same database connection pattern
- Activity logging is consistent across all modules
- Error handling follows similar patterns
- Frontend components share common patterns and styles
- Support requests is currently the simplest module (read-only)
- Ready for enhancement with additional features

