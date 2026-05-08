# 📊 FAQ System Architecture Diagram

## High-Level System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ADMIN DASHBOARD                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Sidebar Menu                                                │  │
│  │  • ホーム                                                     │  │
│  │  • 社員管理                                                   │  │
│  │  • 勤怠管理                                                   │  │
│  │  • 休暇管理                                                   │  │
│  │  • システム ◄── HERE                                          │  │
│  │    └─ お知らせ                                               │  │
│  │    └─ FAQ管理 ◄── CLICK HERE                                 │  │
│  │    └─ 設定                                                    │  │
│  │    └─ 監査ログ                                               │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              │ Click "FAQ管理"                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  admin.page.js                                               │  │
│  │  • Detects: /admin/faq                                       │  │
│  │  • Loads: ./faq/faq.page.js module                           │  │
│  │  • Calls: module.mount()                                     │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  faq.page.js (mount function)                               │  │
│  │  • Creates #adminContent container                           │  │
│  │  • Instantiates FaqAdminComponent                            │  │
│  │  • Calls component.init()                                    │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  FaqAdminComponent                                           │  │
│  │  • loadQuestions() → GET /api/faq/admin/questions            │  │
│  │  • render() → Display UI                                     │  │
│  │  • attachEventListeners() → Handle interactions              │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Rendered FAQ Admin Page                                     │  │
│  │                                                              │  │
│  │  [Stats: 6 total | 2 unanswered | 4 answered]               │  │
│  │                                                              │  │
│  │  [未回答]  [回答済み]  [すべて]                                │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────┐                  │  │
│  │  │ Q1: ログインIDを忘れました...           │  [回答] [削除]      │  │
│  │  └────────────────────────────────────────┘                  │  │
│  │  ┌────────────────────────────────────────┐                  │  │
│  │  │ Q2: パスワードをリセット...              │  [回答] [削除]      │  │
│  │  └────────────────────────────────────────┘                  │  │
│  │  ┌────────────────────────────────────────┐                  │  │
│  │  │ Q3: 打刻時間を修正できますか...         │  [削除]             │  │
│  │  │                                       │  (Already answered) │  │
│  │  └────────────────────────────────────────┘                  │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────┐                       │
│  │   admin.html                        │                       │
│  │   ├─ admin.page.js                  │                       │
│  │   │  └─ route() function            │                       │
│  │   │     └─ Detects /admin/faq       │                       │
│  │   │        └─ loadModule()          │                       │
│  │   │           └─ Imports faq.page.js│                       │
│  │   │              └─ Calls mount()   │                       │
│  │   │                 └─ Creates UI   │                       │
│  │   │                                 │                       │
│  │   ├─ faq-admin-component.js         │                       │
│  │   │  ├─ FaqAdminComponent class    │                       │
│  │   │  │  ├─ init()                   │                       │
│  │   │  │  │  └─ loadQuestions()       │ ──┐                   │
│  │   │  │  │     └─ fetch API          │   │                   │
│  │   │  │  │                           │   │ API Call          │
│  │   │  │  ├─ render()                 │   │                   │
│  │   │  │  │  └─ Display UI            │   │                   │
│  │   │  │  │                           │   │                   │
│  │   │  │  └─ submitAnswer()           │   │                   │
│  │   │  │     └─ POST /api/faq/admin/  │ ──┤                   │
│  │   │  │        questions/:id/answer  │   │                   │
│  │   │  │                              │   │                   │
│  │   └──────────────────────────────────   │                   │
│  │                                          │                   │
│  └──────────────────────────────────────────┼───────────────────┤
│                                             │                   │
│                                    HTTP/REST Calls              │
│                                             │                   │
└─────────────────────────────────────────────┼───────────────────┘
                                              │
                                              ▼
                        ┌──────────────────────────────┐
                        │   BACKEND SERVER             │
                        ├──────────────────────────────┤
                        │  Express.js Application      │
                        │                              │
                        │  ┌──────────────────────┐    │
                        │  │ /api/faq routes      │    │
                        │  ├──────────────────────┤    │
                        │  │ GET /admin/questions │    │
                        │  │   ↓                  │    │
                        │  │ faq.controller.js    │    │
                        │  │ getAllQuestions()    │    │
                        │  │   ↓                  │    │
                        │  │ faq.repository.js    │    │
                        │  │ getAllUserQuestions()│    │
                        │  │   ↓                  │    │
                        │  │ Database Query       │    │
                        │  │ SELECT * FROM        │    │
                        │  │ faq_user_questions   │    │
                        │  │   ↓ (results)        │    │
                        │  │ JSON Response        │    │
                        │  │                      │    │
                        │  │ POST /admin/questions│    │
                        │  │ /:id/answer          │    │
                        │  │   ↓                  │    │
                        │  │ faq.controller.js    │    │
                        │  │ answerQuestion()     │    │
                        │  │   ↓                  │    │
                        │  │ faq.repository.js    │    │
                        │  │ updateAnswer()       │    │
                        │  │   ↓                  │    │
                        │  │ Database Update      │    │
                        │  │ UPDATE                │    │
                        │  │ faq_user_questions   │    │
                        │  │                      │    │
                        │  └──────────────────────┘    │
                        │                              │
                        └──────────────────────────────┘
                                    │
                                    ▼
                        ┌──────────────────────────────┐
                        │   DATABASE (MySQL)           │
                        ├──────────────────────────────┤
                        │ Table: faq_items             │
                        │  └─ Sample FAQs (6 items)    │
                        │                              │
                        │ Table: faq_user_questions    │
                        │  ├─ id (PK)                  │
                        │  ├─ user_id (FK users.id)    │
                        │  ├─ question                 │
                        │  ├─ detail                   │
                        │  ├─ category                 │
                        │  ├─ status ('未回答'/'回答済み') │
                        │  ├─ admin_answer             │
                        │  ├─ answered_at              │
                        │  ├─ created_at               │
                        │  └─ updated_at               │
                        │                              │
                        └──────────────────────────────┘
```

---

## Data Flow: Answer Submission

```
Admin clicks "回答" button
        │
        ▼
Answer form appears
        │
        ▼
Admin types answer text
        │
        ▼
Admin clicks "送信" button
        │
        ▼
JavaScript event handler triggered
        │
        ▼
submitAnswer(questionId) called
        │
        ├─ Validate answer not empty
        │
        ├─ fetch() POST /api/faq/admin/questions/:id/answer
        │    ├─ Include credentials: 'include'
        │    ├─ Set Content-Type: application/json
        │    └─ Send body: { answer: "..." }
        │
        ▼
Backend Receives POST Request
        │
        ├─ Authentication middleware ✓
        ├─ Authorization check (admin/manager) ✓
        │
        ▼
faq.controller.answerQuestion()
        │
        ├─ Validate answer
        │
        ▼
faq.repository.updateAnswer()
        │
        ├─ UPDATE faq_user_questions
        │    SET status = '回答済み',
        │        admin_answer = ?,
        │        admin_answer_by = ?,
        │        answered_at = NOW()
        │    WHERE id = ?
        │
        ▼
Database Updated ✓
        │
        ▼
Backend returns { message: "Success" }
        │
        ▼
Browser receives 200 response
        │
        ├─ Show success toast: "✓ 回答を保存しました"
        ├─ Reload questions from API
        │
        ▼
faq.loadQuestions() called
        │
        ├─ fetch() GET /api/faq/admin/questions
        │
        ▼
Component.render() called
        │
        ├─ Question moves to "回答済み" tab
        ├─ Answer form closes
        ├─ Page updates without reload
        │
        ▼
Admin sees updated state ✓
```

---

## File Structure

```
tosouapp.com/
├── attendance/
│   └── backend/
│       └── src/
│           ├── static/
│           │   ├── js/
│           │   │   └── admin/
│           │   │       ├── admin.page.js ◄── MODIFIED (added FAQ route)
│           │   │       ├── faq-admin-component.js
│           │   │       └── faq/ ◄── NEW FOLDER
│           │   │           └── faq.page.js ◄── NEW FILE
│           │   │
│           │   └── html/
│           │       ├── admin.html (has FAQ menu link)
│           │       └── faq-test.html ◄── NEW FILE (optional)
│           │
│           ├── modules/
│           │   └── faq/
│           │       ├── faq.repository.js
│           │       ├── faq.controller.js
│           │       └── faq.routes.js
│           │
│           ├── routes/
│           │   ├── index.js (FAQ routes mounted)
│           │   └── ui.routes.js ◄── MODIFIED (added test route)
│           │
│           └── core/
│               └── bootstrap.js (FAQ tables auto-created)
```

---

## State Management

### Component State (FaqAdminComponent)

```javascript
{
  container: HTMLElement,           // DOM reference
  allQuestions: Array,              // All questions from API
  currentTab: 'unanswered' | 'answered' | 'all'  // Active tab
}
```

### Question Object Structure

```javascript
{
  id: 123,
  user_id: 456,
  question: "質問内容...",
  detail: "詳細...",
  category: "ログイン",
  status: "未回答" | "回答済み",
  admin_answer: "回答内容...",      // null if unanswered
  admin_answer_by: 789,              // admin user id
  answered_at: "2026-04-27T...",     // ISO timestamp
  created_at: "2026-04-27T...",
  name: "Employee Name",             // From join with users table
  employee_id: 456
}
```

---

## Error Handling Flow

```
Action Triggered
        │
        ▼
Try/Catch Block
        │
    ┌───┴───┐
    │       │
   ✓✓      ✗✗ Error Caught
    │       │
   Success  ├─ Log to console
    │       ├─ alert() to user
    │       ├─ Return gracefully
    │       │
    │       └─ Component state preserved
    │
    └─ Continue normally
```

---

## Security Considerations

```
┌─────────────────────────────────────────────┐
│  Request to /api/faq/admin/questions        │
└─────────────────────────────────────────────┘
                     │
                     ▼
    ┌────────────────────────────────┐
    │ Authentication Middleware      │
    │ • Check session cookie         │
    │ • Verify token not expired     │
    └────────────────────────────────┘
                     │
                     ├─ ✓ Token valid
                     │
                     ▼
    ┌────────────────────────────────┐
    │ Authorization Middleware       │
    │ • Check user role              │
    │ • Must be admin or manager     │
    └────────────────────────────────┘
                     │
                     ├─ ✓ Role check passes
                     │
                     ▼
    ┌────────────────────────────────┐
    │ Query Execution                │
    │ • Parameterized SQL            │
    │ • No SQL injection possible    │
    └────────────────────────────────┘
                     │
                     ├─ ✓ Safe query
                     │
                     ▼
    ┌────────────────────────────────┐
    │ Response                       │
    │ • HTML entities escaped        │
    │ • XSS prevention               │
    └────────────────────────────────┘
```

---

## Performance Characteristics

```
Operation              Time        Network     DB Query
────────────────────────────────────────────────────────
Load FAQ page          ~100ms      ✓ 1 call    ✓ 1 query
Load questions         ~200ms      ✓ 1 call    ✓ 1 query
Filter by status       0ms         ✗ 0 calls   ✗ 0 queries (client-side)
Submit answer          ~500ms      ✓ 1 call    ✓ 1 update
Reload after answer    ~200ms      ✓ 1 call    ✓ 1 query
```

---

This architecture provides a clean, modular system for managing FAQ questions and answers through the admin dashboard.
