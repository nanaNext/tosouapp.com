# iizuka.it.com Attendance System

## Giới thiệu
Hệ thống chấm công dành cho công ty Nhật, hỗ trợ quản lý thời gian làm việc, tăng ca, phòng ban, lương, và phân quyền người dùng.

## Cấu trúc thư mục chính
- `src/` - Mã nguồn backend
  - `modules/` - Các module chức năng (auth, attendance, salary, ...)
  - `controllers/` - Controller chung
  - `core/` - Thành phần lõi (database, middleware, errors, logging)
  - `config/` - Cấu hình hệ thống
  - `routes/` - Định tuyến API
  - `services/` - Dịch vụ dùng chung
  - `utils/` - Tiện ích
  - `static/` - Tài nguyên tĩnh (assets, css, js, ...)
  - `resource/` - Tài nguyên upload
- `tests/` - Unit test & integration test
- `docker/` - Dockerfile & docker-compose

## Hướng dẫn cài đặt
1. Clone repository về máy:
   ```sh
   git clone <repo-url>
   ```
2. Cài đặt dependencies:
   ```sh
   cd attendance/backend
   npm install
   ```
3. Tạo file `.env` dựa trên `config/env.js` hoặc hướng dẫn trong README này.
4. Khởi động database (MySQL) và cấu hình kết nối trong `config/db.js`.
5. Chạy ứng dụng:
   ```sh
   npm start
   ```

## Hướng dẫn chạy bằng Docker
1. Cài Docker và Docker Compose.
2. Chạy lệnh:
   ```sh
   docker-compose up --build
   ```

## Hướng dẫn test
- Chạy unit test:
  ```sh
  npm run test:unit
  ```
- Chạy integration test:
  ```sh
  npm run test:integration
  ```

## Swagger API docs
Truy cập http://localhost:3000/api-docs để xem tài liệu API tự động sinh.

## Đóng góp & Hỗ trợ
- Vui lòng tạo issue hoặc pull request nếu bạn muốn đóng góp hoặc báo lỗi.
- Liên hệ: [nana123thanhcong@gmail.com]
