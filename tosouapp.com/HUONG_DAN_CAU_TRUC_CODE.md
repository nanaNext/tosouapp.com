# HƯỚNG DẪN KIẾN TRÚC & CHỈNH SỬA CODE ỨNG DỤNG CHẤM CÔNG (TOSOU APP)

Tài liệu này đóng vai trò như một "bản đồ" giúp bạn dễ dàng tìm kiếm và chỉnh sửa code trong tương lai.

## 1. TỔNG QUAN THƯ MỤC CHÍNH (`attendance/backend/src`)

Toàn bộ logic hoạt động của ứng dụng nằm trong thư mục `backend/src`. Dưới đây là ý nghĩa của từng thư mục con:

- `server.js`: **Điểm khởi chạy (Entry point)**. Khi app bắt đầu chạy, nó sẽ chạy file này đầu tiên. Chứa cấu hình Port và gọi các tính năng chạy ngầm (Cron Jobs).
- `app.js`: Cấu hình framework Express, khai báo các thư mục tĩnh (HTML, CSS, JS) và cài đặt middleware.
- `cron/`: Chứa các file chạy tự động ngầm. 
  - VD: `dbBackupCron.js` (Tự động sao lưu cơ sở dữ liệu MySQL).
- `services/`: Chứa các file logic nghiệp vụ độc lập.
  - VD: `shiftReminder.service.js` (Tự động kiểm tra chấm công thiếu và gửi Email nhắc nhở/báo cáo).
- `modules/`: **Nơi chứa xử lý chính của từng tính năng**.
  - `modules/attendance/`: Xử lý dữ liệu chấm công (lưu giờ check-in, check-out, tính giờ làm).
  - `modules/calendar/`: Quản lý lịch công ty, ngày nghỉ lễ, ngày đi làm thứ 7 của từng bộ phận.
  - `modules/users/`: Quản lý thông tin nhân viên, tài khoản, phòng ban (工事部, v.v.).
- `static/`: **Chứa giao diện hiển thị cho người dùng (Frontend)**.
  - `static/html/`: Các file khung giao diện (HTML).
  - `static/css/`: Các file màu sắc, thiết kế, hiệu ứng (VD: `portal.css` cho thanh menu trượt).
  - `static/js/pages/`: Nơi chứa code JS xử lý sự kiện bấm nút trên màn hình của người dùng.
    - VD: `attendance-monthly.events.js` (Xử lý sự kiện khi chọn tháng trong bảng chấm công).

---

## 2. HƯỚNG DẪN TÌM VÀ SỬA CÁC TÍNH NĂNG CỤ THỂ

### A. Sửa giao diện, nút bấm, bảng biểu (Frontend)
- **Muốn đổi màu, đổi khoảng cách, sửa lỗi hiển thị (như lỗi trượt màn hình Menu):**
  -> Vào `static/css/`. Chú ý các file `portal.css` (Giao diện chính), `attendance.css` (Bảng chấm công), `admin.css` (Trang quản trị).
- **Muốn sửa lỗi bấm nút không ăn, sửa điều kiện lọc tháng, hoặc hiện popup thông báo:**
  -> Vào `static/js/pages/`. Mỗi trang HTML sẽ có một file JS tương ứng ở đây.

### B. Sửa quy tắc nhắc nhở / Gửi Email tự động (Cron Job & Email)
- File chịu trách nhiệm chính: `services/shiftReminder.service.js`.
- **Nếu muốn đổi giờ gửi email hàng ngày:**
  Tìm đến hàm `cron.schedule('0 23 * * *', ...)` (Đang cài đặt là 23:00 mỗi ngày).
- **Nếu muốn đổi ngày gửi báo cáo tổng kết tháng:**
  Tìm đến hàm `cron.schedule('30 23 28-31 * *', ...)` (Đang cài đặt kiểm tra vào cuối tháng).
- **Nếu muốn sửa nội dung chữ trong Email gửi đi:**
  Tìm các hàm có chữ `sendEmail` bên trong file này, ở đó có chứa biến `html` quy định giao diện của Email.

### C. Sửa logic ngày nghỉ Thứ 7 (Bộ phận Công trình - 工事部)
- File xử lý chính: `modules/calendar/calendar.repository.js` hoặc `services/calendar.service.js`.
- Logic được định nghĩa: Nếu là bộ phận Công trình (工事部), hệ thống sẽ đếm số thứ tự của ngày Thứ 7 trong tháng. Chỉ Thứ 7 của tuần thứ 4 mới được tính là ngày nghỉ (`is_off = true`), các Thứ 7 khác (tuần 1,2,3,5) sẽ bị ép phải đi làm.

### D. Xử lý nhân viên Part-time (Baito)
- Để hệ thống không nhắc nhở vắng mặt hàng ngày cho Baito, tài khoản của họ phải được gán trường `employment_type = 'part_time'` trong cơ sở dữ liệu.
- Trong file `shiftReminder.service.js`, hệ thống có dòng lệnh `if (user.employment_type === 'part_time') continue;` để tự động bỏ qua nhóm này khỏi danh sách gửi email cảnh báo chưa chấm công.

---

## 3. LƯU Ý KHI CHỈNH SỬA
1. Trước khi sửa các file quan trọng ở Backend, hãy chạy thử ở môi trường **Local** (`npm start` hoặc `node src/server.js`) để đảm bảo không bị sập (crash) server.
2. Với các lỗi liên quan đến Giao diện (Frontend), khi sửa file `.js` hoặc `.css` xong, hãy nhớ ấn **Ctrl + F5** hoặc xóa Cache trên trình duyệt để thấy sự thay đổi.
3. Nếu bạn muốn thêm tính năng mới liên quan đến dữ liệu, luôn cập nhật file trong thư mục `modules/` (Backend API) trước, sau đó mới cập nhật ở `static/` (Frontend gọi API).