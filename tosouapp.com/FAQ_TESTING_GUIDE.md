# 🚀 How to Test the Fixed FAQ Admin System

## Quick Start

### Step 1: Ensure Server is Running
```bash
cd c:\tosouapp.com\attendance\backend
npm start
```
Wait for message: `Server listening on port 8080`

### Step 2: Login to Admin Dashboard
1. Open browser: http://localhost:8080/ui/login
2. Login with admin credentials
3. Navigate to Admin Dashboard

### Step 3: Access FAQ Management
1. Look for menu on left sidebar or top menu
2. Find "システム" (System) menu
3. Click "FAQ管理" (FAQ Management)
4. **Expected**: FAQ admin page loads showing questions

---

## What You Should See

### Page Structure
```
FAQ管理
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Stats Box 1]  [Stats Box 2]  [Stats Box 3]
  総質問数       未回答         回答済み
    6             X              Y

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[未回答]  [回答済み]  [すべて]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Question 1
├─ 質問内容: ログインIDを忘れてしまいました...
├─ ユーザー: [User Name]
├─ 質問日: [Date]
└─ [回答] [削除]

Question 2
├─ 質問内容: パスワードをリセットしたいのですが...
├─ ユーザー: [User Name]
├─ 質問日: [Date]
└─ [回答] [削除]

... (more questions)
```

---

## Functional Testing

### Test 1: View Questions
**Action**: Page loads FAQ admin section
**Expected**: 
- ✅ Questions display from database
- ✅ Stats show correct counts
- ✅ No JavaScript errors in console

**Check**: Open F12 → Console tab → no red errors

---

### Test 2: Filter by Status
**Action**: 
1. Click "未回答" tab
2. Click "回答済み" tab
3. Click "すべて" tab

**Expected**:
- ✅ Tab switches highlight correctly
- ✅ Question list updates for each filter
- ✅ "未回答" shows only unanswered questions
- ✅ "回答済み" shows only answered questions
- ✅ "すべて" shows all questions

---

### Test 3: Answer a Question
**Action**:
1. Click "回答" button on any unanswered question
2. An answer form appears
3. Type an answer in the text box
4. Click "送信" button

**Expected**:
- ✅ Form appears when clicking "回答"
- ✅ Can type in answer box
- ✅ "送信" button works
- ✅ Success notification appears
- ✅ Question moves to "回答済み" tab
- ✅ Answer persists on page refresh

**Check**: 
- F12 → Console: Should see "✅ Answer saved successfully"
- F12 → Network: POST `/api/faq/admin/questions/:id/answer` returns 200

---

### Test 4: Database Verification
**Action**: 
1. Login to database client (MySQL/MariaDB)
2. Query table: `SELECT * FROM faq_user_questions;`

**Expected**:
- ✅ Questions exist in database
- ✅ Answered questions have `admin_answer` filled
- ✅ Status shows "回答済み" or "未回答"

**Command**:
```sql
SELECT id, question, status, admin_answer, created_at 
FROM faq_user_questions 
ORDER BY created_at DESC;
```

---

## Troubleshooting

### Issue: "ページが見つかりません" (Page not found)
**Solutions**:
1. Check browser console (F12) for JavaScript errors
2. Verify route in admin.page.js (Line 724)
3. Restart server: `npm start`
4. Clear browser cache: Ctrl+Shift+Delete

---

### Issue: API Returns 403 Forbidden
**Solutions**:
1. Verify user has 'admin' or 'manager' role
2. Check if authentication cookie is set
3. Verify session is still active

---

### Issue: API Returns 500 Error
**Solutions**:
1. Check server logs for error message
2. Verify database tables exist: `SHOW TABLES LIKE 'faq%';`
3. Verify database user has permissions
4. Restart server

---

### Issue: Questions Don't Load
**Solutions**:
1. F12 → Network tab → check `/api/faq/admin/questions` response
2. Check if response body has `data: []` (empty array is OK)
3. Check server logs for database errors
4. Verify `faq_user_questions` table exists and has data

---

## Debug Console

Open F12 → Console tab and look for:

### ✅ Success Logs
```
🎯 Mounting FAQ Admin Page
📥 Loading admin questions...
Response status: 200
✅ Loaded 6 questions
```

### ❌ Error Logs
```
❌ Admin content host not found
❌ Error: Failed to load questions
```

---

## Manual Test Page (Optional)

**URL**: http://localhost:8080/faq-test (requires admin login)

**Features**:
- Test API endpoint
- Test navigation
- Test component mount
- View debug logs

**How to Use**:
1. Login as admin
2. Visit `/faq-test`
3. Click "GET /api/faq/admin/questions" button
4. Should see API response with questions
5. Click "Navigate to /admin/faq" button
6. Should redirect to FAQ page
7. Click "Test Component Mount" button
8. Should display live component with data

---

## Key Files Modified

1. ✅ Created: `src/static/js/admin/faq/faq.page.js`
2. ✅ Modified: `src/static/js/admin/admin.page.js` (Line 724)
3. ✅ Created: `src/static/html/faq-test.html` (optional)
4. ✅ Modified: `src/routes/ui.routes.js` (test route)

---

## API Endpoints Reference

All require admin/manager authentication:

```bash
# Get all user questions
GET /api/faq/admin/questions
Response: { data: [ {id, user_id, question, status, ...}, ... ] }

# Answer a question
POST /api/faq/admin/questions/:questionId/answer
Body: { answer: "Answer text" }
Response: { message: "Success" }
```

---

## Performance Notes

- Questions load via API → minimal page load time
- Filter operations are client-side → instant response
- Answer submission → 1-2 seconds API call
- Page refresh → reloads fresh data

---

## Support & Debugging

### Enable Verbose Logging
Add this to browser console before navigating to FAQ page:
```javascript
localStorage.setItem('DEBUG_FAQ', '1');
```

### Check Component Instance
In browser console:
```javascript
// Find the component element
document.querySelector('#faqAdminContainer')

// Check if it has data
document.querySelector('#faqAdminContainer')?.innerHTML
```

---

## Verification Checklist

Before declaring success, verify:

- [ ] Admin page loads without errors
- [ ] FAQ menu item visible in admin dashboard
- [ ] Clicking "FAQ管理" navigates to `/admin/faq`
- [ ] Questions display from database
- [ ] Stats show correct numbers
- [ ] Can filter by status (未回答/回答済み/すべて)
- [ ] Can click "回答" to show answer form
- [ ] Can submit answer via form
- [ ] Answer saved to database
- [ ] Page doesn't show blank after navigation
- [ ] No JavaScript errors in console
- [ ] API calls return 200 status

---

## Success Criteria

✅ **FAQ Admin System is working correctly when**:
1. Page loads without "ページが見つかりません"
2. Questions display from database
3. Admin can answer questions
4. Answers persist in database
5. Status updates correctly
6. No errors in console or logs

---

**Good luck! The FAQ system is now ready to use!** 🎉

If you have any issues, check the logs and troubleshooting section above.
