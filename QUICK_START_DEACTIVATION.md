# 🚀 Quick Start: Account Deactivation Feature

## ⚡ 3-Step Implementation

### Step 1: Update Database (5 minutes)
```bash
# 1. Login to your database (cPanel, phpMyAdmin, or MySQL CLI)
# 2. Select database: u773938685_cnergydb
# 3. Run the SQL file:
```

**Option A: Using phpMyAdmin**
1. Go to your hosting cPanel
2. Open phpMyAdmin
3. Select database `u773938685_cnergydb`
4. Click "SQL" tab
5. Copy and paste contents of `ADD_DEACTIVATED_STATUS.sql`
6. Click "Go"

**Option B: Using MySQL CLI**
```bash
mysql -u u773938685_archh29 -p u773938685_cnergydb < ADD_DEACTIVATED_STATUS.sql
```

**Verify it worked:**
```sql
-- Should show: enum('pending','approved','rejected','deactivated')
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'user' 
AND COLUMN_NAME = 'account_status';
```

---

### Step 2: Deploy Frontend (Automatic on Vercel)

Your Next.js app is already configured for Vercel. Changes deploy automatically:

```bash
# If you need to manually deploy:
git add .
git commit -m "Add account deactivation feature"
git push origin main
```

Vercel will automatically:
- ✅ Build your Next.js app
- ✅ Deploy to production
- ✅ Update https://www.cnergy.site

**Wait 2-3 minutes for deployment to complete.**

---

### Step 3: Test the Feature (2 minutes)

1. **Hard refresh your browser** (Ctrl+Shift+R / Cmd+Shift+R)
2. Login as **Admin** or **Staff**
3. Go to **View Members**
4. Click **Edit** on any member
5. In **Account Status** dropdown, you should see:
   - ⏰ Pending
   - ✅ Approved
   - ❌ Rejected
   - 🚫 **Deactivated** ← NEW!

6. Select **Deactivated** and click **Save**
7. Verify the gray "DEACTIVATED" badge appears with ban icon

---

## 🎯 How to Use

### Deactivate Account (Account Sharing Detected)
1. Go to **Admin Dashboard** → **View Members**
2. Find the member who is sharing their account
3. Click **Edit** button
4. Change **Account Status** to **"Deactivated"**
5. Click **Save Changes**

**Result:**
- ✅ Member account is immediately deactivated
- ✅ Member receives notification
- ✅ Member cannot log in
- ✅ Gray badge with 🚫 icon appears

### Reactivate Account (Issue Resolved)
1. Go to **View Members**
2. Filter by status: **Deactivated** (optional)
3. Click **Edit** on the deactivated member
4. Change **Account Status** to **"Approved"**
5. Click **Save Changes**

**Result:**
- ✅ Member can log in again
- ✅ Access to gym is restored
- ✅ Green badge with ✅ icon appears

---

## 📊 Status Overview

| Status | When to Use | Access | Badge Color |
|--------|-------------|--------|-------------|
| **Pending** | New registration, awaiting approval | ❌ No | Yellow |
| **Approved** | Active member, good standing | ✅ Yes | Green |
| **Rejected** | Registration denied | ❌ No | Red |
| **Deactivated** | Account sharing, policy violation | ❌ No | Gray |

---

## ⚠️ Important

### Before You Start
- ✅ **Backup your database** before running SQL
- ✅ Test on a **test account** first
- ✅ Brief your **admin/staff team** on the new feature

### After Deployment
- ✅ Clear browser cache on all admin/staff devices
- ✅ Test deactivation on a test account
- ✅ Verify notifications are working
- ✅ Train staff on when to use deactivation vs deletion

---

## 🆘 Troubleshooting

### Problem: Don't see "Deactivated" option
**Solution:** 
1. Hard refresh browser (Ctrl+Shift+R)
2. Check if Vercel deployment completed
3. Verify database was updated

### Problem: Database error when saving
**Solution:**
1. Verify SQL migration ran successfully
2. Check database user permissions
3. Review error console in browser

### Problem: Member can still login after deactivation
**Solution:**
Your backend `login.php` needs to check account status:
```php
// Add this check in login.php
if ($user['account_status'] !== 'approved') {
    echo json_encode([
        'success' => false,
        'message' => 'Account is not active. Please contact administration.'
    ]);
    exit;
}
```

---

## 📞 Need Help?

1. Check `DEACTIVATION_FEATURE_GUIDE.md` for detailed documentation
2. Review `ADD_DEACTIVATED_STATUS.sql` for database schema
3. Check browser console for JavaScript errors
4. Check database server logs for SQL errors

---

## ✅ Checklist

Before going live:
- [ ] Database backup created
- [ ] SQL migration executed successfully
- [ ] Vercel deployment completed
- [ ] Browser cache cleared
- [ ] Test account deactivated successfully
- [ ] Test account reactivated successfully
- [ ] Staff trained on new feature
- [ ] Policy documented for when to deactivate

---

**Ready to go! 🎉**

The deactivation feature is now ready to prevent account sharing and maintain gym security.

