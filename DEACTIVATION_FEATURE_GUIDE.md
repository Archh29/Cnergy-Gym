# 🚫 Account Deactivation Feature

## Overview
The **Account Deactivation** feature allows administrators and staff to temporarily disable member accounts when account sharing is detected or for other policy violations. This is a non-destructive action that preserves all member data while preventing access to the gym.

---

## 🎯 Purpose

**Problem Solved:** Members sharing their accounts with friends/family to avoid paying for separate memberships.

**Solution:** Admin and staff can quickly deactivate accounts caught sharing, preventing unauthorized gym access while maintaining data integrity.

---

## ✅ Implementation Status

### Database Changes
- ✅ Added `deactivated` to `account_status` ENUM in `user` table
- ✅ Created `account_deactivation_log` table for audit trail
- ✅ Added automatic notification trigger when accounts are deactivated
- ✅ Added database index on `account_status` for performance

### Frontend Changes
- ✅ Updated Admin Dashboard validation schemas
- ✅ Updated Staff Dashboard validation schemas
- ✅ Added "Deactivated" status badge (gray with ban icon)
- ✅ Updated all account status filters and dropdowns

---

## 📋 How to Use

### For Administrators and Staff

#### 1. **Deactivating an Account**

**Via Edit Member Dialog:**
1. Navigate to **View Members** section
2. Click **Edit** button on the member you want to deactivate
3. In the Edit Member dialog, find the **Account Status** dropdown
4. Select **"Deactivated"** from the dropdown
5. Click **Save Changes**

**What happens:**
- ✅ Account status changes to "Deactivated"
- ✅ Member receives automatic notification about deactivation
- ✅ Deactivation is logged in `account_deactivation_log` table
- ✅ Member cannot log in or access gym facilities
- ✅ Gray badge with ban icon (🚫) appears next to member name

#### 2. **Identifying Deactivated Accounts**

**Visual Indicators:**
- **Badge:** Gray background with "DEACTIVATED" label
- **Icon:** Ban icon (🚫) next to status
- **Filter:** Use status filter dropdown to show only deactivated accounts

**In Member List:**
```
John Doe                          📧 john@example.com
🚫 DEACTIVATED    ♂ Male    ✏️ Edit    🗑️ Delete
```

#### 3. **Reactivating an Account**

If the member resolves the issue:
1. Click **Edit** on the deactivated member
2. Change **Account Status** to **"Approved"**
3. Click **Save Changes**
4. Member can now access the gym again

---

## 🎨 Status Badge Colors

| Status | Color | Icon | Use Case |
|--------|-------|------|----------|
| **Pending** | Yellow | 🕐 Clock | New registrations awaiting approval |
| **Approved** | Green | ✅ Check | Active members with gym access |
| **Rejected** | Red | ❌ X Circle | Registration denied |
| **Deactivated** | Gray | 🚫 Ban | Account sharing / policy violation |

---

## 🔒 Security Features

### Automatic Notifications
When an account is deactivated:
- Member receives notification: *"⚠️ Your account has been deactivated. Please contact gym administration for more information."*
- Notification type: Warning
- Status: Unread

### Audit Trail
Every deactivation is logged with:
- User ID (who was deactivated)
- Deactivated by (staff/admin who performed action)
- Timestamp
- Reason (optional)
- Notes (optional)

### Access Control
- ✅ Deactivated members **cannot log in**
- ✅ Deactivated members **cannot check in** via QR code
- ✅ Deactivated members **appear in reports** but are clearly marked
- ✅ All member data is **preserved** (no data loss)

---

## 🗂️ Database Schema

### Updated `user` Table
```sql
CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  ...
  `account_status` enum('pending','approved','rejected','deactivated') DEFAULT 'pending'
  ...
);
```

### New `account_deactivation_log` Table
```sql
CREATE TABLE `account_deactivation_log` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `deactivated_by` INT(11) NOT NULL,
  `reason` TEXT,
  `deactivated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`deactivated_by`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
```

---

## 📊 Common Use Cases

### 1. Account Sharing Detection
**Scenario:** Security cameras show two different people using the same QR code.

**Action:**
1. Identify the member account
2. Deactivate the account immediately
3. Add note: "Multiple persons using single account detected on [date]"
4. Contact member for clarification

### 2. Payment Disputes
**Scenario:** Member disputes charges and requests account freeze during investigation.

**Action:**
1. Temporarily deactivate account
2. Add note: "Payment dispute - pending resolution"
3. Reactivate once resolved

### 3. Policy Violations
**Scenario:** Member violates gym rules repeatedly.

**Action:**
1. Deactivate account
2. Add note: "Policy violation: [specific violation]"
3. Schedule meeting with member

### 4. Temporary Suspension
**Scenario:** Member requests temporary account hold (medical leave, travel, etc.).

**Action:**
1. Deactivate account with member's consent
2. Add note: "Temporary hold requested by member until [date]"
3. Reactivate on scheduled date

---

## 🔧 SQL Commands Reference

### Apply Database Changes
```bash
# Run this SQL file on your production database
mysql -u your_username -p your_database < ADD_DEACTIVATED_STATUS.sql
```

### View All Deactivated Accounts
```sql
SELECT id, email, fname, lname, account_status, created_at 
FROM `user` 
WHERE account_status = 'deactivated'
ORDER BY created_at DESC;
```

### View Deactivation History
```sql
SELECT 
    d.id, 
    u.email as deactivated_user,
    s.email as deactivated_by_staff,
    d.reason,
    d.notes,
    d.deactivated_at
FROM account_deactivation_log d
JOIN `user` u ON d.user_id = u.id
JOIN `user` s ON d.deactivated_by = s.id
ORDER BY d.deactivated_at DESC;
```

### Manually Deactivate an Account
```sql
UPDATE `user` 
SET `account_status` = 'deactivated' 
WHERE `id` = 123;  -- Replace 123 with actual user ID
```

### Reactivate an Account
```sql
UPDATE `user` 
SET `account_status` = 'approved' 
WHERE `id` = 123;  -- Replace 123 with actual user ID
```

---

## ⚠️ Important Notes

### Data Preservation
- ✅ **Member data is NOT deleted** when deactivated
- ✅ **Subscription history is preserved**
- ✅ **Workout logs remain intact**
- ✅ **Payment records are unchanged**

### Difference from Deletion
| Action | Data Preserved | Reversible | Use Case |
|--------|---------------|-----------|----------|
| **Deactivate** | ✅ Yes | ✅ Yes | Temporary suspension, policy violations |
| **Delete** | ❌ No | ❌ No | Permanent removal, data cleanup |

### Best Practices
1. **Always add notes** when deactivating to document the reason
2. **Communicate with members** before deactivating (unless emergency)
3. **Review deactivated accounts monthly** to decide on permanent actions
4. **Use rejection** for new signups you don't want to approve
5. **Use deactivation** for existing members with issues

---

## 🚀 Deployment Checklist

### Step 1: Database Update
- [ ] Backup your database before making changes
- [ ] Run `ADD_DEACTIVATED_STATUS.sql` on production database
- [ ] Verify the ENUM has all 4 values: pending, approved, rejected, deactivated
- [ ] Verify the `account_deactivation_log` table exists
- [ ] Test the notification trigger

### Step 2: Frontend Deployment
- [ ] Ensure all code changes are committed to git
- [ ] Run `npm run build` to verify build succeeds
- [ ] Deploy to production (automatic on Vercel)
- [ ] Clear browser cache on admin/staff devices
- [ ] Test Edit Member functionality
- [ ] Verify badge appears correctly

### Step 3: Testing
- [ ] Create a test member account
- [ ] Deactivate the test account via Admin dashboard
- [ ] Verify notification appears
- [ ] Try logging in with deactivated account (should fail)
- [ ] Reactivate the account
- [ ] Verify login works again

### Step 4: Training
- [ ] Brief admin team on new feature
- [ ] Brief staff team on when to use deactivation
- [ ] Document your internal process for handling account sharing
- [ ] Add to staff handbook/procedures

---

## 🐛 Troubleshooting

### Issue: "Invalid enum value" error
**Cause:** Database not updated with new ENUM value  
**Solution:** Run the SQL migration file

### Issue: Badge shows "Unknown"
**Cause:** Frontend code not deployed or cache issue  
**Solution:** Hard refresh browser (Ctrl+Shift+R)

### Issue: Can't see deactivated option in dropdown
**Cause:** Validation schema not updated  
**Solution:** Verify both admin and staff `viewmembers.js` files are updated

### Issue: Member can still log in after deactivation
**Cause:** Backend login validation may not check account_status  
**Solution:** Ensure your `login.php` endpoint checks for account_status = 'approved'

---

## 📞 Support

For questions or issues with this feature:
1. Check this documentation first
2. Review the SQL file: `ADD_DEACTIVATED_STATUS.sql`
3. Check browser console for errors
4. Review server logs for database errors

---

## 📝 Changelog

### Version 1.0 (January 2025)
- ✅ Initial implementation of deactivation feature
- ✅ Database schema updates
- ✅ Admin dashboard integration
- ✅ Staff dashboard integration
- ✅ Automatic notifications
- ✅ Audit trail logging

---

## 🔮 Future Enhancements

Potential improvements for future versions:
- [ ] Bulk deactivation for multiple accounts
- [ ] Scheduled reactivation (auto-reactivate on specific date)
- [ ] Deactivation reason dropdown (instead of free text)
- [ ] Email notification to members when deactivated
- [ ] Dashboard widget showing deactivation statistics
- [ ] Integration with attendance system to auto-flag suspicious activity

---

**Last Updated:** October 23, 2025  
**Maintained By:** Cnergy Gym Development Team

