# Sales System Comprehensive Analysis

## Overview
The sales system is a comprehensive Point of Sale (POS) and sales management system for the Cnergy Gym application. It handles multiple types of sales including products, subscriptions, coaching assignments, and day passes/guest sessions.

---

## Architecture

### Frontend Components
1. **Admin Sales Dashboard** (`app/admindashboard/admin/sales.js`)
   - Full-featured sales management interface for administrators
   - ~6,400+ lines of code
   - Advanced filtering, analytics, and reporting capabilities

2. **Staff Sales Dashboard** (`app/staffdashboard/staff/sales.js`)
   - Simplified sales interface for staff members
   - ~2,300+ lines of code
   - Focused on POS operations and basic sales

### Backend API
**File:** `sales_api_updated.php` (~1,400 lines)
- RESTful API handling GET, POST, PUT, DELETE requests
- Database: MySQL (`u773938685_cnergydb`)
- Timezone: Asia/Manila (UTC+8)
- Base URL: `https://api.cnergy.site/sales.php`

---

## Database Schema

### Core Tables

#### 1. `sales` Table
Main sales transaction table storing:
- `id` - Primary key
- `user_id` - Member ID (nullable for guest sales)
- `total_amount` - Total sale amount
- `sale_type` - Type: 'Product', 'Subscription', 'Coaching', 'Day Pass', 'Guest', 'Walk-in', 'Walkin'
- `sale_date` - Transaction timestamp
- `payment_method` - 'cash', 'card', 'online', etc.
- `transaction_status` - 'confirmed', 'pending', 'cancelled'
- `receipt_number` - Unique receipt identifier (format: RCPYYYYMMDD####)
- `cashier_id` - Staff/admin who processed the sale
- `change_given` - Change amount for cash transactions
- `notes` - Additional transaction notes

#### 2. `sales_details` Table
Line items for each sale:
- `id` - Primary key
- `sale_id` - Foreign key to `sales.id`
- `product_id` - Foreign key to `product.id` (nullable)
- `subscription_id` - Foreign key to `subscription.id` (nullable)
- `guest_session_id` - Foreign key to `guest_session.id` (nullable)
- `quantity` - Quantity sold
- `price` - Unit price at time of sale

#### 3. `product` Table
Product inventory:
- `id` - Primary key
- `name` - Product name
- `price` - Current price
- `stock` - Available quantity
- `category` - Product category
- `is_archived` - Soft delete flag (0 = active, 1 = archived)

#### 4. Related Tables
- `subscription` - Subscription records linked to subscription sales
- `member_subscription_plan` - Subscription plan definitions
- `coach_member_list` - Coaching assignments linked to coaching sales
- `guest_session` - Day pass/guest session records
- `user` - Member/user information
- `coaches` - Coach information

---

## Sale Types

### 1. Product Sales
- **Purpose:** Physical product sales (merchandise, supplements, etc.)
- **Process:**
  1. Staff/admin selects products and quantities
  2. System validates stock availability
  3. Cart calculates total
  4. Payment method selected (cash/card/online)
  5. Transaction processed
  6. Stock automatically decremented
  7. Receipt generated

### 2. Subscription Sales
- **Purpose:** Gym membership subscriptions
- **Process:**
  1. Member selects subscription plan
  2. Payment processed
  3. Sale record created in `sales` table
  4. Subscription record created/updated in `subscription` table
  5. Sales details link to subscription via `subscription_id`
- **Special Features:**
  - Multiple matching strategies to link sales to subscriptions:
    - Strategy 1: Exact date + amount match (within ₱10 tolerance)
    - Strategy 2: Amount match + date range (±14 days)
    - Strategy 3: Date match only (±7 days)
    - Strategy 4: Most recent subscription (within 60 days)
  - Supports discounted prices
  - Handles package plans (plan ID 5) by creating hidden individual plans

### 3. Coaching Sales
- **Purpose:** Personal training/coaching assignments
- **Process:**
  1. Member assigned to coach
  2. Rate type selected (monthly/session)
  3. Sale record created with `sale_type = 'Coaching'`
  4. Links to `coach_member_list` via `user_id` and `coach_id`
- **Features:**
  - Tracks coach assignments
  - Shows days remaining on assignments
  - Filters by coach, service type, status (active/expired)
  - Monthly rate vs per-session rate tracking

### 4. Day Pass / Guest Sales
- **Purpose:** One-time gym access for non-members
- **Process:**
  1. Guest information collected (with or without account)
  2. Day pass purchased
  3. Sale record created with `sale_type IN ('Day Pass', 'Guest', 'Walk-in', 'Walkin')`
  4. Links to `guest_session` table via `receipt_number` or `guest_session_id`
- **Features:**
  - Can be with account (registered user) or without account (walk-in)
  - Guest name stored separately
  - Receipt number links to guest session

---

## API Endpoints

### GET Requests

#### `?action=products`
- Returns all products (active or archived based on `archived` parameter)
- Response: `{ "products": [...] }`

#### `?action=sales`
- Returns sales data with filtering
- Query Parameters:
  - `sale_type` - Filter by sale type
  - `date_filter` - 'today', 'week', 'month', 'year', 'all'
  - `month` - Specific month (1-12)
  - `year` - Specific year
  - `custom_date` - Specific date (YYYY-MM-DD)
- Response: `{ "sales": [...] }`
- Includes complex joins to get:
  - Product details
  - Subscription details with plan information
  - Coach information
  - Guest information
  - Member names

#### `?action=analytics`
- Returns sales analytics
- Query Parameters: Same as sales endpoint
- Response:
```json
{
  "analytics": {
    "todaysSales": 0,
    "productsSoldToday": 0,
    "lowStockItems": 0,
    "monthlyRevenue": 0,
    "productSales": 0,
    "subscriptionSales": 0,
    "coachAssignmentSales": 0,
    "walkinSales": 0,
    "totalSales": 0
  }
}
```

#### `?action=coach_sales`
- Returns coach sales data
- Response: `{ "coaches": [...] }`

### POST Requests

#### `?action=sale`
- Creates a regular sale
- Body:
```json
{
  "total_amount": 1000,
  "sale_type": "Product",
  "sales_details": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 500
    }
  ],
  "staff_id": 123
}
```

#### `?action=pos_sale`
- Creates a POS transaction with payment details
- Body:
```json
{
  "total_amount": 1000,
  "sale_type": "Product",
  "payment_method": "cash",
  "amount_received": 1500,
  "sales_details": [...],
  "staff_id": 123,
  "notes": "Optional notes"
}
```

#### `?action=product`
- Adds a new product
- Body:
```json
{
  "name": "Product Name",
  "price": 100,
  "stock": 50,
  "category": "Category Name"
}
```

#### `?action=confirm_transaction`
- Confirms a pending transaction
- Body:
```json
{
  "sale_id": 123,
  "payment_method": "cash",
  "amount_received": 1500
}
```

#### `?action=edit_transaction`
- Edits an existing transaction
- Body:
```json
{
  "sale_id": 123,
  "payment_method": "card",
  "amount_received": 1000,
  "notes": "Updated notes"
}
```

### PUT Requests

#### `?action=stock`
- Updates product stock
- Body:
```json
{
  "product_id": 1,
  "quantity": 10,
  "type": "add" // or "remove"
}
```

#### `?action=product`
- Updates product information
- Body:
```json
{
  "id": 1,
  "name": "Updated Name",
  "price": 150,
  "category": "New Category"
}
```

#### `?action=restore`
- Restores an archived product
- Body:
```json
{
  "id": 1
}
```

### DELETE Requests

#### `?action=product`
- Archives a product (soft delete)
- Body:
```json
{
  "id": 1
}
```

---

## Key Features

### 1. POS System
- **Cart Management:** Add/remove products, update quantities
- **Stock Validation:** Prevents overselling
- **Payment Processing:** Cash, card, online payment methods
- **Change Calculation:** Automatic change calculation for cash payments
- **Receipt Generation:** Unique receipt numbers (RCP + date + random)
- **Transaction Confirmation:** Two-step confirmation process

### 2. Product Inventory Management
- **CRUD Operations:** Create, read, update, archive products
- **Stock Management:** Add/remove stock with validation
- **Category Organization:** Products organized by categories
- **Archive System:** Soft delete with restore capability
- **Low Stock Alerts:** Tracks products with stock < 10

### 3. Advanced Filtering & Search
- **Sale Type Filters:** Product, Subscription, Coaching, Day Pass
- **Date Filters:** Today, week, month, year, custom date range
- **Category Filters:** Filter products by category
- **Search Functionality:** Search by member name, product name, receipt number
- **Pagination:** 10-20 items per page depending on view

### 4. Analytics & Reporting
- **Sales Breakdown:** By type (Product, Subscription, Coaching, Day Pass)
- **Period Comparisons:** Today, week, month, year
- **Revenue Tracking:** Total revenue, period revenue
- **Product Metrics:** Products sold, low stock items
- **Coach Performance:** Sales by coach, member counts

### 5. Subscription Sales Integration
- **Automatic Linking:** Multiple strategies to match sales to subscriptions
- **Plan Information:** Displays plan name, duration, pricing
- **Discount Support:** Tracks discounted prices vs regular prices
- **Status Tracking:** Active, expired, pending subscriptions

### 6. Coaching Sales Integration
- **Assignment Tracking:** Links sales to coach-member assignments
- **Rate Types:** Monthly rate vs per-session rate
- **Status Management:** Active, expired assignments
- **Coach Filtering:** Filter sales by specific coach

### 7. Day Pass / Guest Sales
- **Account Options:** With account or without account
- **Guest Information:** Stores guest names separately
- **Session Tracking:** Links to guest_session table
- **Receipt Linking:** Uses receipt_number for matching

---

## Frontend Features (Admin Dashboard)

### Tabs/Views
1. **Analytics Dashboard**
   - Sales overview cards
   - Charts and graphs
   - Period comparisons
   - Sale type breakdowns

2. **POS / Point of Sale**
   - Product selection
   - Cart management
   - Payment processing
   - Receipt display

3. **Product Inventory**
   - Product list with filters
   - Add/edit products
   - Stock management
   - Archive/restore products

4. **All Sales**
   - Comprehensive sales list
   - Advanced filtering
   - Search functionality
   - Pagination

5. **Product Sales Dialog**
   - Filtered product sales view
   - Category and product filters
   - Date range filtering

6. **Subscription Sales Dialog**
   - Subscription sales view
   - Plan filtering
   - Status filtering
   - Day pass type filtering

7. **Coaching Sales Dialog**
   - Coaching sales view
   - Coach filtering
   - Service type filtering
   - Assignment status tracking

8. **Total Sales Dialog**
   - Unified sales view
   - Multiple filter options
   - Comprehensive search

---

## Frontend Features (Staff Dashboard)

### Simplified Interface
- **POS Focus:** Primary focus on processing sales
- **Product Sales:** Add products to cart and process
- **Basic Inventory:** View products and stock levels
- **Sales History:** View recent sales
- **Limited Analytics:** Basic sales metrics

---

## Data Flow

### Product Sale Flow
```
1. User selects product → Add to cart
2. Cart validates stock → Update quantities
3. User confirms → Payment method selected
4. POST /pos_sale → Backend validates
5. Transaction created → Stock decremented
6. Receipt generated → Activity logged
7. Frontend updates → Reload data
```

### Subscription Sale Flow
```
1. Subscription created (monitor_subscription.php)
2. Payment confirmed → Sale record created
3. Sales API links sale to subscription
4. Multiple matching strategies attempted
5. Plan information retrieved
6. Displayed in sales dashboard
```

### Coaching Sale Flow
```
1. Coach assignment created
2. Sale record created with sale_type='Coaching'
3. Links to coach_member_list
4. Coach information retrieved via JOIN
5. Assignment details displayed
```

---

## Error Handling

### Stock Validation
- Checks available stock before adding to cart
- Prevents overselling
- Shows error modal with available stock
- Validates on quantity updates

### Transaction Validation
- Validates payment method
- Ensures amount received >= total for cash
- Validates required fields
- Database transaction rollback on errors

### Subscription Matching
- Multiple fallback strategies
- Handles missing data gracefully
- Logs errors without breaking sales retrieval
- Fallback to plan table if subscription not found

---

## Activity Logging

### Staff Activity Tracking
- Uses `activity_logger.php` for centralized logging
- Logs all sales transactions
- Tracks product additions/updates
- Records stock changes
- Includes staff_id in all operations

### Log Details Include:
- Action type (e.g., "Process POS Sale")
- Description with details
- Category (e.g., "Sales")
- Timestamp
- Staff ID

---

## Receipt Number Generation

### Format
- Pattern: `RCP` + `YYYYMMDD` + `####` (4-digit random)
- Example: `RCP202412151234`
- Uniqueness: Checks database before generating
- Retry: Generates new number if duplicate found

---

## Timezone Handling

### Configuration
- PHP: `date_default_timezone_set('Asia/Manila')`
- MySQL: `SET time_zone = '+08:00'`
- All timestamps stored in Philippines time
- Frontend displays in local timezone

---

## Security Features

### Input Validation
- SQL injection prevention (prepared statements)
- XSS protection (data sanitization)
- Type validation (numeric checks)
- Required field validation

### Access Control
- Session-based authentication
- Staff ID tracking
- Activity logging for audit trail

---

## Performance Considerations

### Database Optimization
- Indexed columns (is_archived, sale_date, etc.)
- Efficient JOINs with proper indexes
- Pagination to limit result sets
- Query optimization for subscription matching

### Frontend Optimization
- Pagination (10-20 items per page)
- Filtered queries (reduces data transfer)
- Lazy loading of dialogs
- Efficient state management

---

## Known Issues / Edge Cases

### Subscription Matching
- Complex matching logic due to potential data inconsistencies
- Multiple fallback strategies needed
- May not always find perfect match

### Stock Management
- Race conditions possible with concurrent sales
- Stock validation at transaction time
- No real-time stock locking

### Guest Sales
- Multiple sale_type values ('Guest', 'Walk-in', 'Walkin', 'Day Pass')
- Matching logic handles all variations
- Receipt number linking for guest sessions

---

## Future Enhancement Opportunities

1. **Real-time Stock Locking:** Prevent overselling with concurrent transactions
2. **Barcode Scanning:** Add barcode support for products
3. **Receipt Printing:** Direct receipt printing functionality
4. **Refund System:** Handle returns and refunds
5. **Discount Codes:** Promotional code system
6. **Multi-currency:** Support for multiple currencies
7. **Export Functionality:** Export sales reports to CSV/Excel
8. **Email Receipts:** Send receipts via email
9. **Inventory Alerts:** Automated low stock notifications
10. **Sales Forecasting:** Predictive analytics

---

## File Structure Summary

```
Sales System Files:
├── Backend API
│   └── sales_api_updated.php (1,400 lines)
│
├── Frontend - Admin
│   └── app/admindashboard/admin/sales.js (6,400+ lines)
│
├── Frontend - Staff
│   └── app/staffdashboard/staff/sales.js (2,300+ lines)
│
├── Documentation
│   └── COACHING_SALES_CARD_DESIGN.md
│
└── Related Files
    ├── monitor_subscription.php (handles subscription sales)
    ├── activity_logger.php (centralized logging)
    └── cleanup_coaching_data.sql (data cleanup script)
```

---

## Key Functions Reference

### Backend (sales_api_updated.php)
- `handleGetRequest()` - Routes GET requests
- `handlePostRequest()` - Routes POST requests
- `handlePutRequest()` - Routes PUT requests
- `handleDeleteRequest()` - Routes DELETE requests
- `getProductsData()` - Retrieves products
- `getSalesData()` - Retrieves sales with complex joins
- `getAnalyticsData()` - Calculates analytics
- `createSale()` - Creates regular sale
- `createPOSSale()` - Creates POS transaction
- `addProduct()` - Adds new product
- `updateProductStock()` - Updates stock
- `updateProduct()` - Updates product info
- `archiveProduct()` - Archives product
- `restoreProduct()` - Restores archived product
- `generateReceiptNumber()` - Generates unique receipt
- `confirmTransaction()` - Confirms pending transaction
- `editTransaction()` - Edits transaction
- `getCoachSales()` - Retrieves coach sales

### Frontend (Admin)
- `loadProducts()` - Loads product list
- `loadSales()` - Loads sales data
- `loadAnalytics()` - Loads analytics
- `addToCart()` - Adds product to cart
- `handlePOSSale()` - Processes POS sale
- `handleAddProduct()` - Adds new product
- `handleStockUpdate()` - Updates stock
- `handleEditProduct()` - Edits product
- `loadCoaches()` - Loads coach list
- `loadMemberAssignments()` - Loads coaching assignments
- `loadSubscriptionPlans()` - Loads subscription plans

---

## Testing Recommendations

1. **Stock Validation:** Test overselling scenarios
2. **Subscription Matching:** Test various matching scenarios
3. **Payment Methods:** Test all payment types
4. **Date Filtering:** Test all date filter combinations
5. **Pagination:** Test with large datasets
6. **Concurrent Sales:** Test race conditions
7. **Error Handling:** Test error scenarios
8. **Receipt Generation:** Test uniqueness
9. **Archive/Restore:** Test product archiving
10. **Guest Sales:** Test with/without account scenarios

---

## Conclusion

The sales system is a comprehensive, feature-rich POS and sales management solution that handles multiple sale types, provides detailed analytics, and integrates with other system components (subscriptions, coaching, guest management). The codebase is well-structured with clear separation between admin and staff interfaces, robust error handling, and extensive filtering capabilities.

