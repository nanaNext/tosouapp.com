# 🔧 Chi tiết Fix - FAQ Admin "Unknown column 'name'" Error

## 🎯 Vấn đề Gốc

Khi bạn nhấn vào "FAQ管理" (FAQ Admin), trang hiển thị lỗi:

```
エラー: Failed to load questions: Unknown column 'uname' in 'field list'
```

## 🔍 Nguyên Nhân

1. **Query SQL** trong `faq.repository.js` tìm kiếm column `u.name`
2. **Database schema** bảng `users` không có column `name`
3. Chỉ có column `username` hoặc `email`

## ✅ Fix Đã Áp Dụng

### File Sửa
`c:\tosouapp.com\attendance\backend\src\modules\faq\faq.repository.js`

### Dòng 130 - Thay Đổi
**Trước**:
```javascript
u.name, u.id as employee_id
```

**Sau**:
```javascript
COALESCE(u.username, u.email, 'Unknown') as name, u.id as employee_id
```

### Giải Thích
- `COALESCE()` là function SQL lấy giá trị đầu tiên không NULL
- Nếu có `username` → dùng nó
- Nếu không có → dùng `email`
- Nếu cả hai không có → dùng 'Unknown'

## 🚀 Cách Khởi Động Server

### Cách 1: PowerShell (Recommended)
```powershell
cd "c:\tosouapp.com\attendance\backend"
npm start
```

### Cách 2: File Batch
Double-click:
```
c:\tosouapp.com\attendance\backend\start-server-keep-open.bat
```

### Cách 3: Qua Node trực tiếp
```powershell
node c:\tosouapp.com\attendance\backend\src\server.js
```

## 📊 Kiểm Tra Server Đã Chạy

```powershell
# Kiểm tra port 3000 hoặc 8080
netstat -ano | findstr "3000\|8080"

# Hoặc
curl http://localhost:3000/ping
```

Expected response:
```json
{"ok":true}
```

## 🧪 Test FAQ Admin

### Step 1: Mở Browser
```
http://localhost:3000/admin/faq
```
hoặc
```
http://localhost:8080/admin/faq
```

### Step 2: Login
- Dùng tài khoản **admin** hoặc **manager**

### Step 3: Xem Trang
Nên thấy:
- ✅ "FAQ管理" title
- ✅ Stats box (6 total | 2 unanswered | 4 answered)
- ✅ 3 tabs (未回答, 回答済み, すべて)
- ✅ Danh sách câu hỏi
- ❌ **KHÔNG** thấy error message

### Step 4: Test Function
- Click "未回答" tab → Filter works
- Click question → Can see full text
- Click "回答" button → Answer form appears
- Type answer → Click "送信"
- ✅ Answer saved successfully

## 🐛 Debug Nếu Còn Lỗi

### Lỗi 1: "Connection refused" port 3000/8080

```powershell
# Kill process cũ
Get-Process node | Stop-Process -Force

# Restart
npm start
```

### Lỗi 2: "Unknown column" vẫn hiện

```powershell
# Kiểm tra file được sửa đúng
Get-Content c:\tosouapp.com\attendance\backend\src\modules\faq\faq.repository.js | Select-String "COALESCE"
```

Nên thấy:
```
COALESCE(u.username, u.email, 'Unknown') as name
```

Nếu không thấy → file chưa save. Hãy mở file và lưu lại.

### Lỗi 3: Database Connection Error

```powershell
# Kiểm tra MySQL chạy
Get-Service MySQL* | Select Status

# Hoặc
mysql -u root -p -e "SELECT 1"
```

### Lỗi 4: 403 Forbidden

```
Error: Forbidden
```

Cần login với tài khoản có role **admin** hoặc **manager**

Kiểm tra:
```powershell
# Kết nối MySQL và kiểm tra user
mysql -u root -p database_name
SELECT id, username, email, role FROM users WHERE username='your_user';
```

## 📋 Checklist Fix

- [ ] Khởi động server: `npm start`
- [ ] Browser: http://localhost:3000/admin/faq
- [ ] Login với tài khoản admin
- [ ] Trang load không có lỗi
- [ ] Thấy FAQ stats và question list
- [ ] Không thấy "Unknown column" error
- [ ] Có thể click tabs để filter
- [ ] Có thể trả lời câu hỏi

## ✨ Success Indicators

Khi mọi thứ đúng:

```
✅ Console logs:
   🎯 Mounting FAQ Admin Page
   📥 Loading admin questions...
   Response status: 200
   ✅ Loaded X questions

✅ Page displays:
   - FAQ管理 title
   - Stats: 6 total | X unanswered | Y answered
   - Tabs: 未回答, 回答済み, すべて
   - Question list with details
   - Answer buttons that work
```

## 📞 Nếu Vẫn Có Vấn Đề

1. **Kiểm tra logs server**
   - Mở terminal nơi chạy `npm start`
   - Tìm error message
   - Share error message ở đây

2. **Check file sửa**
   - Verify line 130 trong `faq.repository.js`
   - Confirm có `COALESCE`

3. **Verify database**
   ```powershell
   mysql -u root -p
   USE tosouapp_dev;
   SHOW COLUMNS FROM users;
   ```

---

**Status**: ✅ Fix Applied and Ready
**Version**: navy-20260427-faqfix-db
