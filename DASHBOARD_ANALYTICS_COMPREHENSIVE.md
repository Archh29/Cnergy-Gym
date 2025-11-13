# Dashboard & Analytics System - Comprehensive Guide

## Overview

The CNERGY Gym Web Admin system has a sophisticated dashboard and analytics system that provides real-time insights into gym operations, membership, revenue, and attendance. The system consists of three main dashboards:

1. **Admin Dashboard** (`app/admindashboard/admin/home.js`)
2. **Staff Dashboard** (`app/staffdashboard/staff/home.js`)
3. **Customer Dashboard** (`app/customerdashboard/customer/home.js`)

---

## Architecture

### Frontend Structure

```
app/
├── page.js                          # Main entry point - routes to appropriate dashboard
├── admindashboard/
│   ├── page.js                      # Admin dashboard wrapper
│   └── admin/
│       ├── home.js                  # Admin dashboard analytics component
│       └── client-wrapper.js        # Admin dashboard layout wrapper
├── staffdashboard/
│   ├── page.js                      # Staff dashboard wrapper
│   └── staff/
│       ├── home.js                  # Staff dashboard analytics component
│       └── client-wrapper.js        # Staff dashboard layout wrapper
└── customerdashboard/
    └── customer/
        └── home.js                  # Customer dashboard (basic)
```

### Backend API

- **API Endpoint**: `https://api.cnergy.site/admindashboard.php`
- **Method**: GET
- **Parameters**: `period` (today, week, month, year)
- **Response Format**: JSON

---

## Main Entry Point (`app/page.js`)

### Purpose
The root page acts as a router that determines which dashboard to display based on user role.

### Flow
1. **Session Check**: Reads `user_role` from `sessionStorage`
2. **Role-Based Routing**:
   - `admin` → Renders `AdminDashboard`
   - `staff` → Renders `StaffDashboard`
   - No valid session → Redirects to `/login`
3. **Loading State**: Shows "Loading..." while checking session

### Code Structure
```javascript
- Checks sessionStorage for user_role
- Conditionally renders AdminDashboard or StaffDashboard
- Handles authentication redirect
```

---

## Admin Dashboard (`app/admindashboard/admin/home.js`)

### Features

#### 1. **Summary Statistics Cards** (6 Cards)
Displays key metrics in a responsive grid:

1. **Annual Members**
   - Format: `Active / Total`
   - Shows: Active annual members vs total annual members
   - Trend indicator with percentage change
   - Icon: Users

2. **Total Users**
   - Format: `Active / Total`
   - Shows: All active users vs total users
   - Trend indicator
   - Icon: Users

3. **Sales Today**
   - Format: Currency (₱)
   - Shows: Today's revenue
   - Trend indicator
   - Icon: ₱ symbol

4. **Active Monthly Subscriptions**
   - Format: Number
   - Shows: Count of active monthly plan subscribers
   - Trend indicator
   - Icon: CreditCard

5. **Gym Check-ins Today**
   - Format: Number
   - Shows: Today's attendance count
   - Trend indicator
   - Icon: UserCheck

6. **Upcoming Expirations**
   - Format: Number
   - Shows: Memberships expiring in next 7 days
   - Trend indicator
   - Icon: AlertTriangle

#### 2. **Time Period Selector**
- Dropdown with options:
  - Today
  - This Week
  - This Month
  - This Year
- Updates all data when changed
- Stored in state: `timePeriod`

#### 3. **Charts Section**

**A. Membership Growth Chart (Line Chart)**
- **Type**: Line Chart (Recharts)
- **Data Source**: `membershipData` from API
- **X-Axis**: Date labels (formatted as "MMM dd" or time)
- **Y-Axis**: Member count
- **Features**:
  - Responsive container
  - Tooltip with member count and date
  - Grid lines
  - Active dot on hover
  - Dynamic title based on period

**B. Revenue Chart (Bar Chart)**
- **Type**: Bar Chart (Recharts)
- **Data Source**: `revenueData` from API
- **X-Axis**: Date labels
- **Y-Axis**: Revenue in ₱ (Philippine Peso)
- **Features**:
  - Currency formatting (₱)
  - Tooltip with revenue and period
  - Grid lines
  - Dynamic title based on period

#### 4. **Data Fetching Logic**

**API Call**:
```javascript
GET https://api.cnergy.site/admindashboard.php?period={period}
```

**Response Structure**:
```json
{
  "success": true,
  "summaryStats": {
    "members": {
      "active": { "value": 0, "trend": 0, "isPositive": true },
      "total": { "value": 0, "trend": 0, "isPositive": true }
    },
    "totalUsers": {
      "active": { "value": 0, "trend": 0, "isPositive": true },
      "total": { "value": 0, "trend": 0, "isPositive": true }
    },
    "salesToday": { "value": 0, "trend": 0, "isPositive": true },
    "activeSubscriptions": { "value": 0, "trend": 0, "isPositive": true },
    "checkinsToday": { "value": 0, "trend": 0, "isPositive": true },
    "upcomingExpirations": { "value": 0, "trend": 0, "isPositive": true }
  },
  "membershipData": [
    { "name": "Oct 17", "members": 10 },
    { "name": "Oct 18", "members": 15 }
  ],
  "revenueData": [
    { "name": "Oct 17", "revenue": 5000 },
    { "name": "Oct 18", "revenue": 7500 }
  ]
}
```

**Error Handling**:
- Auto-retry logic (max 3 retries)
- Exponential backoff (2s, 4s, 6s)
- Error display component with retry button
- Loading skeletons during fetch

#### 5. **Data Formatting**

**Date Formatting**:
- Handles multiple date formats:
  - Time format (HH:MM) → Converts to 12-hour with AM/PM
  - Month abbreviations (Jan, Feb, etc.)
  - Full date strings → Formats to "MMM dd"
  - Extracts day numbers from various formats

**Currency Formatting**:
- Philippine Peso (₱)
- Thousands separator
- Example: `₱15,678`

**Number Formatting**:
- Thousands separator
- Example: `1,234`

#### 6. **Trend Indicators**

**Component**: `TrendIndicator`
- Shows percentage change
- Green badge for positive trends (TrendingUp icon)
- Red badge for negative trends (TrendingDown icon)
- Hidden if trend is 0

#### 7. **Loading States**

**CardSkeleton Component**:
- Animated pulse effect
- Placeholder for card header and content
- Shown during data fetch

#### 8. **Error States**

**ErrorDisplay Component**:
- Red-themed card
- Shows error message
- Retry button
- Displays retry attempt count

---

## Staff Dashboard (`app/staffdashboard/staff/home.js`)

### Differences from Admin Dashboard

#### 1. **Fewer Summary Cards** (5 Cards)
- Removed: "Sales Today" card
- Same cards: Annual Members, Total Users, Active Monthly Subscriptions, Gym Check-ins, Upcoming Expirations

#### 2. **Date Filter Feature**
- **Calendar Component**: Allows selecting specific dates
- **Date Picker**: Uses shadcn/ui Calendar component
- **Filter Logic**: Filters membership data by selected date
- **Show All Button**: Clears date filter

#### 3. **Layout Differences**

**Chart Layout**:
- Membership Growth Chart: Takes 2 columns (lg:col-span-2)
- Quick Stats Panel: Takes 1 column

**Quick Stats Panel** (3 Cards):
1. **Today's Summary**
   - Check-ins count
   - Expiring soon count
   - Active members count
   - Color-coded icons

2. **Quick Actions**
   - Member Check-in button
   - New Member button
   - Expiring Memberships button
   - (Note: Currently static, not functional)

3. **Recent Activity**
   - Sample activity feed
   - Check-in events
   - New member registrations
   - Membership expirations
   - (Note: Currently static data)

#### 4. **Date Correction Logic**

**October Date Fix**:
- The staff dashboard has special logic to correct dates
- Extracts day numbers from API data
- Forces dates to current month/year
- Handles edge cases (invalid days, missing data)

**Code Logic**:
```javascript
// Extracts day from "Jul 17" → 17
// Creates new date: currentYear, currentMonth, 17
// Formats as "MMM dd"
```

---

## Dashboard Wrapper Components

### Admin Dashboard Wrapper (`app/admindashboard/page.js`)

**Purpose**: Server-side wrapper for admin dashboard
- Disables static generation (`force-dynamic`)
- Renders `AdminDashboardClient`

### Admin Dashboard Client (`app/admindashboard/admin/client-wrapper.js`)

**Features**:
1. **Layout Management**
   - Sidebar navigation
   - Top bar with search
   - Main content area
   - Responsive design

2. **Section Routing**
   - Manages `currentSection` state
   - Renders appropriate component based on section
   - Sections: Home, ViewUsers, ViewStaff, ViewCoach, etc.

3. **User Context**
   - Fetches user info from `session.php`
   - Stores `user_id` in sessionStorage
   - Handles authentication fallback

4. **Dark Mode**
   - Toggle in sidebar
   - Persisted in localStorage
   - Applied via Tailwind classes

5. **Global Features**
   - QR Scanner integration (from parent page.js)
   - Notification system
   - Error boundary
   - Global modal for notifications

6. **Sidebar Management**
   - Collapsible sidebar
   - Mobile-responsive (auto-collapse on small screens)
   - Backdrop overlay on mobile

### Staff Dashboard Wrapper (`app/staffdashboard/page.js`)

**Similar to Admin Dashboard** but:
- Uses `StaffDashboardClient`
- Has staff-specific sections
- Same QR scanner integration
- Same notification system

---

## Data Flow

### Complete Data Flow Diagram

```
User Login
    ↓
Session Storage (user_role, user_id)
    ↓
app/page.js (Route Decision)
    ↓
AdminDashboard / StaffDashboard
    ↓
Dashboard Wrapper (client-wrapper.js)
    ↓
Home Component (home.js)
    ↓
useEffect Hook
    ↓
fetchDashboardData()
    ↓
API Call: admindashboard.php?period={period}
    ↓
Backend Processing (PHP)
    ↓
Database Queries
    ↓
JSON Response
    ↓
State Updates (summaryStats, membershipData, revenueData)
    ↓
Component Re-render
    ↓
Charts & Cards Display
```

### State Management

**Main State Variables**:
```javascript
- membershipData: Array of {name, members}
- revenueData: Array of {name, revenue}
- summaryStats: Object with all metrics
- timePeriod: "today" | "week" | "month" | "year"
- loading: Boolean
- error: String | null
- retryCount: Number
```

**State Updates**:
- `timePeriod` change → Triggers `fetchDashboardData()`
- API response → Updates all data states
- Error → Sets error state, clears data
- Retry → Increments retryCount, retries fetch

---

## Chart Components

### Technology Stack
- **Library**: Recharts
- **Components Used**:
  - `LineChart` - Membership growth
  - `BarChart` - Revenue
  - `ResponsiveContainer` - Responsive sizing
  - `XAxis`, `YAxis` - Axes
  - `CartesianGrid` - Grid lines
  - `Line`, `Bar` - Data visualization
  - `ChartTooltip` - Hover tooltips

### Chart Configuration

**Membership Growth Chart**:
```javascript
- Type: Line (monotone)
- Data Key: "members"
- X-Axis: displayName (formatted dates)
- Y-Axis: Number (formatted with commas)
- Tooltip: Shows member count and date
- Color: hsl(var(--chart-1))
```

**Revenue Chart**:
```javascript
- Type: Bar
- Data Key: "revenue"
- X-Axis: displayName (formatted dates)
- Y-Axis: Currency (₱ with formatting)
- Tooltip: Shows revenue and period
- Color: hsl(var(--chart-2))
```

### Chart Data Formatting

**Input Format** (from API):
```json
[
  { "name": "Oct 17", "members": 10 },
  { "name": "Oct 18", "members": 15 }
]
```

**Processed Format** (for charts):
```json
[
  { "name": "Oct 17", "displayName": "Oct 17", "members": 10 },
  { "name": "Oct 18", "displayName": "Oct 18", "members": 15 }
]
```

**Date Formatting Logic**:
1. Check if already has `displayName` → Use it
2. Check if time format (HH:MM) → Convert to 12-hour
3. Check if month abbreviation → Keep as is
4. Try parsing as Date → Format to "MMM dd"
5. Extract day number → Create date with current month/year
6. Fallback → Use original name

---

## Error Handling & Resilience

### Error Types

1. **Network Errors**
   - Timeout (10 seconds)
   - Connection failures
   - CORS issues

2. **API Errors**
   - Invalid response format
   - `success: false` response
   - Missing data fields

3. **Data Errors**
   - Invalid date formats
   - Missing chart data
   - Null/undefined values

### Error Handling Strategy

**Network Errors**:
- Auto-retry with exponential backoff
- Max 3 retries
- Shows error message after all retries fail
- Manual retry button

**API Errors**:
- Validates `response.data.success`
- Checks for required fields
- Falls back to empty arrays/zero values
- Shows error message

**Data Errors**:
- Defensive programming (null checks)
- Default values (0, empty arrays)
- Date parsing with try-catch
- Graceful degradation

### Loading States

**During Fetch**:
- Shows `CardSkeleton` components
- Disables interactions
- Shows loading indicator

**After Error**:
- Shows `ErrorDisplay` component
- Allows manual retry
- Preserves previous data if available

---

## Performance Optimizations

### 1. **useCallback Hook**
- Wraps `fetchDashboardData` to prevent unnecessary re-renders
- Dependencies: `timePeriod`, `retryCount`

### 2. **Conditional Rendering**
- Only renders charts when data is available
- Skips formatting for empty arrays

### 3. **Memoization Opportunities**
- Chart data formatting could be memoized
- Trend calculations could be memoized

### 4. **API Timeout**
- 10-second timeout prevents hanging requests
- Fails fast for better UX

### 5. **Retry Logic**
- Prevents infinite retry loops
- Exponential backoff reduces server load

---

## Responsive Design

### Breakpoints

**Mobile (< 640px)**:
- Single column layout
- Collapsed sidebar
- Stacked cards
- Smaller chart heights

**Tablet (640px - 1024px)**:
- 2-column grid for cards
- Sidebar toggleable
- Medium chart sizes

**Desktop (> 1024px)**:
- 6-column grid for cards (admin)
- 5-column grid for cards (staff)
- Sidebar always visible
- Full chart sizes
- Side-by-side charts

### Responsive Classes

```javascript
- grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 (Admin cards)
- grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 (Staff cards)
- flex-col sm:flex-row (Header layout)
- text-lg sm:text-xl (Typography)
- p-3 sm:p-6 (Padding)
```

---

## Integration Points

### 1. **QR Scanner Integration**
- Global QR scanner in dashboard wrapper
- Processes attendance scans
- Shows notifications
- Updates check-in counts (indirectly via API refresh)

### 2. **Session Management**
- Reads from `sessionStorage`
- Validates via `session.php` API
- Handles authentication state

### 3. **Navigation**
- Sidebar navigation
- Section switching
- URL routing (Next.js)

### 4. **Dark Mode**
- Toggle in sidebar
- Persisted in localStorage
- Applied globally via Tailwind

---

## Backend API Expectations

### Expected Endpoint: `admindashboard.php`

**Request**:
```
GET /admindashboard.php?period=today
GET /admindashboard.php?period=week
GET /admindashboard.php?period=month
GET /admindashboard.php?period=year
```

**Expected Response Structure**:
```json
{
  "success": true,
  "summaryStats": {
    "members": {
      "active": {
        "value": 150,
        "trend": 5.2,
        "isPositive": true
      },
      "total": {
        "value": 200,
        "trend": 2.1,
        "isPositive": true
      }
    },
    "totalUsers": {
      "active": {
        "value": 500,
        "trend": 3.5,
        "isPositive": true
      },
      "total": {
        "value": 600,
        "trend": 1.2,
        "isPositive": true
      }
    },
    "salesToday": {
      "value": 15000,
      "trend": 10.5,
      "isPositive": true
    },
    "activeSubscriptions": {
      "value": 300,
      "trend": 2.3,
      "isPositive": true
    },
    "checkinsToday": {
      "value": 45,
      "trend": 5.0,
      "isPositive": true
    },
    "upcomingExpirations": {
      "value": 12,
      "trend": -2.0,
      "isPositive": false
    }
  },
  "membershipData": [
    { "name": "Oct 17", "members": 10 },
    { "name": "Oct 18", "members": 15 },
    { "name": "Oct 19", "members": 12 }
  ],
  "revenueData": [
    { "name": "Oct 17", "revenue": 5000 },
    { "name": "Oct 18", "revenue": 7500 },
    { "name": "Oct 19", "revenue": 6000 }
  ]
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error message here"
}
```

### Backend Calculations (Expected)

**Summary Stats**:
- **Annual Members**: Count from `subscription` table where `plan_id = 1` (annual plan)
- **Total Users**: Count from `user` table
- **Sales Today**: Sum from `sales` table for today
- **Active Subscriptions**: Count active monthly subscriptions
- **Check-ins Today**: Count from `attendance` table for today
- **Upcoming Expirations**: Count subscriptions expiring in next 7 days

**Trend Calculations**:
- Compare current period with previous period
- Calculate percentage change
- Determine if positive or negative

**Chart Data**:
- **Membership Data**: Group by date, count new members per day/week/month/year
- **Revenue Data**: Group by date, sum revenue per day/week/month/year

---

## Customization & Extensibility

### Adding New Metrics

1. **Update State**:
```javascript
const [summaryStats, setSummaryStats] = useState({
  // ... existing stats
  newMetric: { value: 0, trend: 0, isPositive: true }
})
```

2. **Add Card Component**:
```javascript
<Card>
  <CardHeader>
    <CardTitle>New Metric</CardTitle>
  </CardHeader>
  <CardContent>
    <div>{summaryStats.newMetric.value}</div>
    <TrendIndicator
      trend={summaryStats.newMetric.trend}
      isPositive={summaryStats.newMetric.isPositive}
    />
  </CardContent>
</Card>
```

3. **Update Backend API**:
- Add calculation in PHP
- Include in response JSON

### Adding New Charts

1. **Add State**:
```javascript
const [newChartData, setNewChartData] = useState([])
```

2. **Add Chart Component**:
```javascript
<Card>
  <CardHeader>
    <CardTitle>New Chart</CardTitle>
  </CardHeader>
  <CardContent>
    <ChartContainer config={{...}}>
      <ResponsiveContainer>
        <LineChart data={newChartData}>
          {/* Chart configuration */}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  </CardContent>
</Card>
```

3. **Update API Response**:
- Add data to backend response
- Update state in `fetchDashboardData`

---

## Testing Considerations

### Unit Tests
- Date formatting functions
- Currency formatting
- Number formatting
- Trend calculation

### Integration Tests
- API call with different periods
- Error handling
- Retry logic
- State updates

### E2E Tests
- Dashboard load
- Period switching
- Chart interactions
- Error recovery

---

## Known Issues & Limitations

### 1. **Date Formatting**
- Staff dashboard has special October date correction logic
- Suggests backend may return inconsistent date formats
- Frontend compensates with extensive date parsing

### 2. **Static Quick Actions**
- Staff dashboard quick action buttons are not functional
- Recent activity feed shows static data

### 3. **Customer Dashboard**
- Basic implementation with sample data
- Not fully integrated with backend

### 4. **Error Recovery**
- Retry logic may not handle all error types
- No offline mode or cached data

### 5. **Performance**
- No data caching
- Refetches on every period change
- Could benefit from React Query or SWR

---

## Future Enhancements

### 1. **Real-time Updates**
- WebSocket integration
- Live data updates
- Push notifications for important events

### 2. **Data Export**
- Export charts as images
- Export data as CSV/Excel
- PDF reports

### 3. **Advanced Filtering**
- Custom date ranges
- Multiple metric selection
- Comparison views

### 4. **Performance**
- Data caching
- Optimistic updates
- Virtual scrolling for large datasets

### 5. **Accessibility**
- Screen reader support
- Keyboard navigation
- High contrast mode

---

## Summary

The dashboard and analytics system is a comprehensive solution for monitoring gym operations. It provides:

- **Real-time Metrics**: 6 key performance indicators
- **Visual Analytics**: Interactive charts for membership and revenue
- **Flexible Time Periods**: Today, week, month, year views
- **Error Resilience**: Auto-retry, error handling, graceful degradation
- **Responsive Design**: Works on all device sizes
- **Role-Based Views**: Different dashboards for admin and staff
- **Trend Analysis**: Percentage changes with visual indicators

The system is well-structured, maintainable, and extensible, making it easy to add new features and metrics as needed.




