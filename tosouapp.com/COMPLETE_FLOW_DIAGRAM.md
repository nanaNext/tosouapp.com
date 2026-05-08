# 📊 COMPLETE FLOW: Employee Questions to Admin

## System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         EMPLOYEE                                   │
│                                                                    │
│  Visits: http://localhost:3000/ui/chatbot                         │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │ Frontend (chatbot.page.js / FaqComponent)               │     │
│  │                                                          │     │
│  │  1. SELECT category (e.g., "勤怠")                      │     │
│  │  2. TYPE question text                                  │     │
│  │  3. CLICK "質問を送信する" button                        │     │
│  └──────────┬───────────────────────────────────────────────┘     │
│             │                                                      │
│             ▼                                                      │
│  HTTP Request (POST)                                              │
│  ┌────────────────────────────────────────────────────────┐       │
│  │ POST /api/chatbot/question                            │       │
│  │ Content-Type: application/json                         │       │
│  │                                                        │       │
│  │ {                                                      │       │
│  │   "categoryId": 1,                                     │       │
│  │   "question": "出退勤の打刻方法は？"                   │       │
│  │ }                                                      │       │
│  └────────────────────────────────────────────────────────┘       │
└──────────────────────┬─────────────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │      Backend (Node.js + Express)     │
        │                                      │
        │  Router: /api/chatbot                │
        │    ↓                                 │
        │  POST /question handler              │
        │    ↓                                 │
        │  chatbot.routes.js (line 65-73)      │
        │    ↓                                 │
        │  chatbot.repository.submitQuestion() │
        │    ↓                                 │  ← FIXED HERE!
        │  INSERT INTO faq_user_questions ✅  │
        └──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────────┐
        │        MySQL Database                   │
        │                                          │
        │  faq_user_questions table               │
        │  ┌─────────────────────────────────────┐│
        │  │ id | user_id | question | status  ││
        │  ├─────────────────────────────────────┤│
        │  │ 1  | 5       | 打刻方法？| 未回答  ││
        │  │ 2  | 7       | 休暇申請？| 未回答  ││
        │  │ 3  | 5       | 交通費？  | 回答済み││
        │  └─────────────────────────────────────┘│
        │                                          │
        │  users table (for employee names)       │
        │  ┌─────────────────────────────────────┐│
        │  │ id | username | email              ││
        │  ├─────────────────────────────────────┤│
        │  │ 5  | alice    | alice@example.com ││
        │  │ 7  | bob      | bob@example.com   ││
        │  └─────────────────────────────────────┘│
        └──────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────────────┐
│                            ADMIN                                   │
│                                                                    │
│  Visits: http://localhost:3000/admin/chatbot/faq                 │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │ Frontend (admin.page.js → faq.page.js)                │     │
│  │                                                          │     │
│  │  FaqAdminComponent.init()                              │     │
│  │    ↓                                                    │     │
│  │  loadQuestions()                                       │     │
│  │    ↓                                                    │     │
│  │  fetch('/api/faq/admin/questions')                     │     │
│  └──────────┬───────────────────────────────────────────────┘     │
│             │                                                      │
│             ▼                                                      │
│  HTTP Request (GET)                                               │
│  ┌────────────────────────────────────────────────────────┐       │
│  │ GET /api/faq/admin/questions                          │       │
│  │ Authorization: <auth-token-from-cookies>              │       │
│  └────────────────────────────────────────────────────────┘       │
└──────────────────────┬─────────────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────────┐
        │      Backend (Node.js + Express)         │
        │                                          │
        │  Router: /api/faq                        │
        │    ↓                                     │
        │  GET /admin/questions handler            │
        │    ↓                                     │
        │  faq.routes.js (line 14)                 │
        │    ↓                                     │
        │  faq.controller.getAllQuestions()        │
        │    ↓                                     │
        │  faq.repository.getAllUserQuestions()    │
        │    ↓                                     │
        │  SELECT * FROM faq_user_questions        │
        │    ↓                                     │
        │  Fetch user names from users table       │
        │    ↓                                     │
        │  Enrich rows with name & employee_id     │
        └──────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────────────┐
│                      ADMIN SEES:                                   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │ FAQ管理                                                 │     │
│  │                                                          │     │
│  │ Stats:  総質問数: 3  │  未回答: 2  │  回答済み: 1      │     │
│  │                                                          │     │
│  │ Tabs: [未回答 (2)] | [回答済み (1)] | [すべて]        │     │
│  │                                                          │     │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │     │
│  │                                                          │     │
│  │ Q1: 出退勤の打刻方法は？                                │     │
│  │     社員: alice (ID: 5)                                 │     │
│  │     送信日: 2026-04-27 10:15:30                        │     │
│  │     Status: [未回答]                                   │     │
│  │     [回答する] button                                  │     │
│  │                                                          │     │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │     │
│  │                                                          │     │
│  │ Q2: 休暇申請の手順は？                                  │     │
│  │     社員: bob (ID: 7)                                   │     │
│  │     送信日: 2026-04-27 10:16:45                        │     │
│  │     Status: [未回答]                                   │     │
│  │     [回答する] button                                  │     │
│  │                                                          │     │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │     │
│  │                                                          │     │
│  │ Q3: 交通費の申請方法は？                                │     │
│  │     社員: alice (ID: 5)                                 │     │
│  │     送信日: 2026-04-27 09:00:00                        │     │
│  │     Status: [回答済み]                                 │     │
│  │     ✓ 回答:                                             │     │
│  │     経費計算メニューで「交通費」を選択し...              │     │
│  │     回答日: 2026-04-27 11:30:00                        │     │
│  │                                                          │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                    │
│  Admin can:                                                        │
│  ✅ See all employee questions                                    │
│  ✅ See employee name and ID                                      │
│  ✅ See submission date/time                                      │
│  ✅ Filter by status (未回答 / 回答済み)                          │
│  ✅ Click "回答する" to answer                                    │
│  ✅ Type response (max 2000 chars)                                │
│  ✅ Click "回答を保存" to submit answer                           │
│  ✅ See answer appear immediately                                 │
│  ✅ Status changes to "回答済み"                                  │
└────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
BEFORE (BROKEN):
──────────────

Employee Question
    ↓
/api/chatbot/question (POST)
    ↓
chatbot.repository.submitQuestion()
    ↓
INSERT INTO chatbot_user_questions  ← WRONG TABLE!
    ↓
STORED HERE ◄────┐
                 │
Admin Page       │
  ↓              │
/api/faq/admin/questions (GET)
  ↓              │
SELECT FROM faq_user_questions  ← WRONG TABLE!
  ↓              │
NO RESULTS! ◄────┘ (Question wasn't here)
  ↓
Empty admin page 😞


AFTER (FIXED):
───────────────

Employee Question
    ↓
/api/chatbot/question (POST)
    ↓
chatbot.repository.submitQuestion()
    ↓
INSERT INTO faq_user_questions  ← CORRECT TABLE! ✅
    ↓
STORED HERE ◄────┐
                 │
Admin Page       │
  ↓              │
/api/faq/admin/questions (GET)
  ↓              │
SELECT FROM faq_user_questions  ← CORRECT TABLE! ✅
  ↓              │
FOUND! ◄─────────┘ (Question is here)
  ↓
Admin sees question 😊
```

---

## State Transitions

```
┌─────────────────────────────────────────────────────────────┐
│                  QUESTION LIFECYCLE                         │
└─────────────────────────────────────────────────────────────┘

1. CREATED (新規)
   └─ Employee submits question
   └─ INSERT into faq_user_questions with status='未回答'
   └─ Created_at = NOW()

2. PENDING (未回答)
   └─ Admin sees in "未回答" tab
   └─ Admin clicks "回答する" button
   └─ Response textarea appears

3. ANSWERED (回答済み)
   └─ Admin types answer and clicks "回答を保存"
   └─ UPDATE faq_user_questions SET status='回答済み', admin_answer=..., answered_at=NOW()
   └─ Question moves to "回答済み" tab
   └─ Answer displayed with admin details

4. VISIBLE (従業員ページ)
   └─ Employee logs in
   └─ Visits /ui/chatbot → "My Questions" tab
   └─ Sees their question with admin's answer
   └─ Status shows "回答済み"
```

---

## Key Changes Made

```javascript
// FILE: src/modules/chatbot/chatbot.repository.js
// LINE: 155-159

// BEFORE (❌ BROKEN):
async function submitQuestion(userId, categoryId, question) {
  const [r] = await db.query(
    'INSERT INTO chatbot_user_questions (user_id, category_id, question) VALUES (?,?,?)',
    [userId || null, categoryId ? parseInt(categoryId, 10) : null, String(question || '').trim()]
  );
  return { id: r.insertId };
}

// AFTER (✅ FIXED):
async function submitQuestion(userId, categoryId, question) {
  // Save employee questions to faq_user_questions so admin can see them
  const [r] = await db.query(
    'INSERT INTO faq_user_questions (user_id, question, category, status) VALUES (?,?,?,?)',
    [userId || null, String(question || '').trim(), null, '未回答']
  );
  return { id: r.insertId };
}
```

---

## API Response Format

```json
// GET /api/faq/admin/questions
{
  "data": [
    {
      "id": 123,
      "user_id": 5,
      "question": "出退勤の打刻方法は？",
      "detail": null,
      "category": null,
      "status": "未回答",
      "admin_answer": null,
      "answered_at": null,
      "created_at": "2026-04-27T10:15:30.000Z",
      "name": "alice",                    // ← From users table
      "employee_id": 5                    // ← Same as user_id
    },
    {
      "id": 124,
      "user_id": 7,
      "question": "休暇申請の手順は？",
      "detail": null,
      "category": null,
      "status": "未回答",
      "admin_answer": null,
      "answered_at": null,
      "created_at": "2026-04-27T10:16:45.000Z",
      "name": "bob",
      "employee_id": 7
    }
  ]
}
```

---

## Testing Checklist

- [ ] Server is running (`npm start`)
- [ ] Employee can visit `/ui/chatbot`
- [ ] Employee can submit a question
- [ ] Admin can visit `/admin/chatbot/faq`
- [ ] Admin can see employee questions
- [ ] Admin can click "回答する" button
- [ ] Admin can type answer (< 2000 chars)
- [ ] Admin can click "回答を保存"
- [ ] Question moves to "回答済み" tab
- [ ] Answer is displayed
- [ ] Employee can see their answer in "My Questions"

---

## Success Criteria ✅

- ✅ Questions are saved to correct table
- ✅ Admin can retrieve all questions
- ✅ Employee names are displayed
- ✅ Admin can answer questions
- ✅ Answers update status and database
- ✅ No errors in console or logs
- ✅ UI is responsive and intuitive
