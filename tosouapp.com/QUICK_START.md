# ✅ EMPLOYEE QUESTIONS SETUP CHECKLIST

## 🚀 Quick Start (5 minutes)

- [ ] **Step 1**: Start the server
  ```bash
  cd c:\tosouapp.com
  npm start
  ```
  Wait for: `✅ Server running on port 3000`

- [ ] **Step 2**: Open employee page
  ```
  http://localhost:3000/ui/chatbot
  ```

- [ ] **Step 3**: Submit a test question
  - Select category: "勤怠" (Attendance)
  - Type question: "これはテスト質問です"
  - Click: "質問を送信する" button
  - See alert: "質問が送信されました"

- [ ] **Step 4**: Open admin page (login first if needed)
  ```
  http://localhost:3000/admin/chatbot/faq
  ```

- [ ] **Step 5**: Verify question appears
  - Should see: Question list with your test question
  - Should show: Employee name, date, status "未回答"

- [ ] **Step 6**: Answer the question
  - Click: "回答する" button
  - Type answer: "これはテスト回答です"
  - Click: "回答を保存"
  - See message: "✓ 回答を保存しました"
  - Question moves to "回答済み" tab

- [ ] **Step 7**: Employee verifies answer
  - Go back to: `/ui/chatbot` → "My Questions" tab
  - Should see: Your question with the admin's answer

## 🎯 All Tests Complete!

If all checkboxes above are checked ✅, then the system is **working perfectly**!

---

## 📊 What Changed

**File**: `attendance/backend/src/modules/chatbot/chatbot.repository.js` (Line 155)

**Before** (❌):
```javascript
'INSERT INTO chatbot_user_questions (...)'
```

**After** (✅):
```javascript
'INSERT INTO faq_user_questions (...)'
```

That's it! Just one table name changed.

---

## 🐛 Troubleshooting

### Admin page shows no questions
- ✅ Did you submit an employee question first? (Step 3)
- ✅ Is server running without errors? (Check console)
- ✅ Try refreshing the page (Ctrl+F5)
- ✅ Open F12 → Network tab, check for API errors

### Employee name shows "Unknown"
- ✅ This is expected if user doesn't have username/email
- ✅ Should still work - admin can see employee ID

### Submit button not working
- ✅ Check F12 console for errors
- ✅ Try a different category
- ✅ Try refreshing page

### Admin answer not saving
- ✅ Check user is logged in as admin
- ✅ Check F12 console for errors
- ✅ Try answering with a different text

---

## 📋 System Architecture

```
Employee
  ↓ submits question
  ↓
POST /api/chatbot/question
  ↓
chatbot.repository.submitQuestion()
  ↓
INSERT INTO faq_user_questions ← THE FIX!
  ↓
Admin
  ↓ views page
  ↓
GET /api/faq/admin/questions
  ↓
faq.repository.getAllUserQuestions()
  ↓
SELECT FROM faq_user_questions ← FINDS QUESTIONS!
  ↓
Admin sees question
  ↓ answers it
  ↓
POST /api/faq/admin/questions/:id/answer
  ↓
UPDATE faq_user_questions
  ↓
Employee sees answer
```

---

## 🎬 Demo Flow (5 minutes)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Employee submits question | Alert: "質問が送信されました" |
| 2 | Employee sees success | Question ID returned |
| 3 | Admin visits `/admin/chatbot/faq` | Sees question in list |
| 4 | Admin clicks "回答する" | Text area appears |
| 5 | Admin types response | Text saved in field |
| 6 | Admin clicks "回答を保存" | Alert: "✓ 回答を保存しました" |
| 7 | Page refreshes | Question in "回答済み" tab |
| 8 | Employee views "My Questions" | Sees admin's answer |
| 9 | ✅ SUCCESS | System working! |

---

## 🔍 Verification Commands

```bash
# Verify server is running
curl http://localhost:3000/health

# Verify chatbot API
curl http://localhost:3000/api/chatbot/ping

# Verify FAQ API
curl http://localhost:3000/api/faq

# Check questions in database
curl http://localhost:3000/api/faq/debug/all-questions
```

---

## 🎓 How It Works

1. **Employee** types question in `/ui/chatbot`
2. **Frontend** sends POST to `/api/chatbot/question`
3. **Backend** saves to `faq_user_questions` table ← **THE FIX**
4. **Admin** visits `/admin/chatbot/faq`
5. **Frontend** calls GET `/api/faq/admin/questions`
6. **Backend** queries `faq_user_questions` ← **FINDS QUESTIONS**
7. **Backend** joins user info (names)
8. **Frontend** displays everything nicely
9. **Admin** can answer questions
10. **Status** updates automatically

---

## ✅ Success Criteria

- [ ] Questions saved to database
- [ ] Admin can see them on page
- [ ] Employee names display
- [ ] Admin can click answer button
- [ ] Admin can type response
- [ ] Answer saves successfully
- [ ] Status changes to answered
- [ ] Employee can see answer
- [ ] No errors in console
- [ ] No errors in server logs

All checked? **🎉 YOU'RE DONE!**

---

## 📞 Need Help?

1. Check browser console: F12 → Console tab
2. Check network: F12 → Network tab (look for red errors)
3. Check server console: Look for error messages
4. Verify server is running: Check terminal output
5. Restart server if needed: Ctrl+C → npm start

---

**Created**: April 27, 2026  
**Status**: ✅ Ready to Test  
**Version**: 1.0
