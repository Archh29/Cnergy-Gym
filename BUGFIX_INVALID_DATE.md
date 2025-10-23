# Bug Fix: Invalid Date Error

## Issue
**Error:** `Uncaught RangeError: Invalid time value at Date.toISOString()`

**Location:** `viewmembers.js` (both Admin and Staff dashboards)

**Trigger:** Clicking the Edit button on a member with an invalid birthday value in the database (e.g., `0000-00-00`, `null`, or malformed date strings).

## Root Cause
The code was calling `.toISOString()` on a Date object created from potentially invalid date values without first checking if the date was valid:

```javascript
// ❌ BEFORE (Problematic code)
bday: member.bday ? new Date(member.bday).toISOString().split("T")[0] : "",
```

When the database contains invalid dates like `"0000-00-00"` or other malformed values, `new Date("0000-00-00")` creates an Invalid Date object. Calling `.toISOString()` on an Invalid Date throws a `RangeError`.

## Solution

### 1. Created Date Utility Module (`lib/dateUtils.js`)
A reusable utility module with safe date handling functions:

```javascript
/**
 * Safely format a date to ISO string (YYYY-MM-DD)
 * @param {string|Date|null|undefined} dateValue - The date value to format
 * @param {string} fallback - Fallback value if date is invalid (default: "")
 * @returns {string} Formatted date string or fallback
 */
export function formatDateToISO(dateValue, fallback = "") {
  if (!dateValue) return fallback;
  
  const date = new Date(dateValue);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date value: ${dateValue}`);
    return fallback;
  }
  
  try {
    return date.toISOString().split("T")[0];
  } catch (error) {
    console.error(`Error formatting date: ${dateValue}`, error);
    return fallback;
  }
}
```

### 2. Updated View Members Components
Updated both admin and staff versions to use the safe utility function:

```javascript
// ✅ AFTER (Fixed code)
import { formatDateToISO } from "@/lib/dateUtils"

const handleEditMember = (member) => {
  setSelectedMember(member)
  editForm.reset({
    fname: member.fname || "",
    mname: member.mname || "",
    lname: member.lname || "",
    email: member.email || "",
    password: "",
    gender_id: member.gender_id?.toString() || "",
    bday: formatDateToISO(member.bday), // Safe date formatting
    user_type_id: member.user_type_id || 4,
    account_status: member.account_status || "pending",
  })
  setIsEditDialogOpen(true)
}
```

## Files Modified

1. **`lib/dateUtils.js`** (NEW)
   - Created comprehensive date utility module
   - Includes: `formatDateToISO`, `isValidDate`, `safeDate`, `formatDateLocalized`, `getCurrentDateISO`, `addDays`, `daysBetween`

2. **`app/admindashboard/admin/viewmembers.js`**
   - Added import: `import { formatDateToISO } from "@/lib/dateUtils"`
   - Updated `handleEditMember` to use `formatDateToISO(member.bday)`

3. **`app/staffdashboard/staff/viewmembers.js`**
   - Added import: `import { formatDateToISO } from "@/lib/dateUtils"`
   - Updated `handleEditMember` to use `formatDateToISO(member.bday)`

## Benefits

### Immediate
- ✅ Fixes the RangeError crash when editing members with invalid dates
- ✅ Graceful handling of null/undefined/malformed dates
- ✅ Console warnings for debugging invalid date values

### Long-term
- ✅ Reusable date utilities across the entire application
- ✅ Consistent date handling and formatting
- ✅ Better error handling and user experience
- ✅ Easier to maintain and extend

## Testing

### Test Cases
1. **Valid Date:** Member with proper birthday (e.g., `1990-05-15`) - Should work normally
2. **Invalid Date:** Member with `0000-00-00` birthday - Should return empty string, no crash
3. **Null Date:** Member with `null` birthday - Should return empty string
4. **Malformed Date:** Member with invalid date string - Should return empty string with console warning

### Expected Behavior
- Edit dialog opens successfully regardless of date validity
- Invalid dates display as empty input fields
- No JavaScript errors in console
- User can set a new valid date

## Recommendations

### Immediate Actions
- ✅ **COMPLETED:** Fix the immediate crash issue
- ⚠️ **TODO:** Clean up database records with invalid dates (`0000-00-00`)
- ⚠️ **TODO:** Add database constraints to prevent future invalid dates

### Future Enhancements
- Consider using the `dateUtils` module in other components:
  - `monitorsubscription.js` (lines 53, 242, 529)
  - `promotions.js` (lines 118-119, 191-192)
  - `staffmonitoring.js` (lines 127-182)
- Add date validation on the backend API
- Implement frontend date picker with validation
- Add input validation to prevent users from entering invalid dates

## Usage Examples

```javascript
import { 
  formatDateToISO, 
  isValidDate, 
  getCurrentDateISO,
  addDays,
  formatDateLocalized 
} from "@/lib/dateUtils"

// Format any date safely
const formattedDate = formatDateToISO("2024-05-15")  // "2024-05-15"
const invalidDate = formatDateToISO("0000-00-00")    // ""
const nullDate = formatDateToISO(null)                // ""

// Check if date is valid
if (isValidDate(member.bday)) {
  // Process valid date
}

// Get current date
const today = getCurrentDateISO()  // "2025-01-15"

// Add days to a date
const nextWeek = addDays(today, 7)  // "2025-01-22"

// Format for display
const displayDate = formatDateLocalized("2024-05-15")  // "May 15, 2024"
```

## Status
✅ **FIXED** - All changes implemented and tested successfully
✅ **NO LINTING ERRORS** - Code quality maintained

## Notes
- The utility module is designed to be defensive and fail gracefully
- Console warnings help identify data quality issues
- The module can be extended with more date utilities as needed

