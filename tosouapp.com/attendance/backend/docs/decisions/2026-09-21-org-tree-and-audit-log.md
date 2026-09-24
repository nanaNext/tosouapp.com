# Quyết định thiết kế: Cây tổ chức & Audit log bất biến

Ngày: 2026-09-21
Trạng thái: đã chốt hướng, chưa triển khai cây tổ chức (audit log đã triển khai)

## 1. Audit log bất biến ở tầng DB (đã triển khai)

**Quyết định:** thêm 2 trigger MySQL trên bảng `audit_logs`:
- `trg_audit_logs_no_update` — chặn mọi `UPDATE`.
- `trg_audit_logs_no_delete` — chặn mọi `DELETE`.

Cả hai `SIGNAL SQLSTATE '45000'` để lệnh bị từ chối ngay ở tầng DB, bất kể request đến từ đâu (app, migration thủ công, hay ai đó connect thẳng vào DB).

Migration: `attendance/backend/src/core/bootstrap.js`, id `20260921_01_audit_logs_append_only_trigger`.

**Phương án đã cân nhắc và loại bỏ:** thu hồi quyền UPDATE/DELETE của DB user của app trên riêng bảng này. Loại bỏ vì app hiện dùng **1 DB user/connection pool chung** cho mọi bảng (`core/database/mysql.js`) — muốn tách quyền theo bảng cần thêm 1 user/kết nối DB riêng chỉ để ghi audit log, là thay đổi hạ tầng lớn hơn nhiều so với "vài dòng SQL". Trigger đạt cùng mục tiêu mà không cần đổi kiến trúc kết nối.

**Xung đột đã phát hiện và xử lý:** `audit.repository.js` có sẵn hàm `pruneOldLogs(retentionDays)` (xóa log cũ theo hạn giữ) — nhưng grep toàn bộ repo xác nhận **không có nơi nào gọi hàm này** (không cron, không route, không worker). Giữ nguyên hàm (không xóa code người khác viết), nhưng đã ghi chú tại chỗ: nếu sau này thực sự cần xóa log theo retention, phải chủ động DROP/sửa lại trigger trước — biến việc xóa log thành một hành động tường minh, có dấu vết, không phải mặc định âm thầm.

**Rủi ro cần người vận hành xác nhận thủ công:** việc `CREATE TRIGGER` cần DB user của app có quyền `TRIGGER`. Trên MySQL quản lý (Railway...), quyền này có thể bị hạn chế. Migration bọc try/catch (im lặng bỏ qua nếu thiếu quyền, theo đúng convention phòng thủ đã dùng ở mọi migration khác trong file này) — nghĩa là **không thể chỉ nhìn log ứng dụng để biết chắc trigger đã được tạo thành công**. Cần tự tay thử 1 lệnh UPDATE/DELETE vào `audit_logs` trên môi trường thật để xác nhận bị từ chối.

## 2. Cây tổ chức (本部→部→課→係) — chốt hướng, chưa code

**Mô hình dữ liệu:**
- `departments` thêm cột `parent_id` (tự tham chiếu, NULL = gốc). Đây là thay đổi **cộng thêm, không phá vỡ**: các phòng ban phẳng hiện có (`部署` xây ở phiên trước, gắn `corporation_id`) tự động trở thành node gốc (parent_id NULL), không có gì thay đổi cho tới khi ai đó thực sự thêm node con.
- Thêm bảng closure table `department_closures (ancestor_id, descendant_id, depth)` để truy vấn nhanh "tất cả nhân viên thuộc nhánh X trở xuống" mà không cần recursive CTE — đánh đổi: ghi thêm 1 dòng closure mỗi khi cây thay đổi (hiếm khi xảy ra) để đọc nhanh hơn nhiều (thường xuyên xảy ra).
- `corporations → departments.corporation_id` (đã có) giữ nguyên, không đổi — 1 pháp nhân vẫn chứa nhiều node cây.

**Phân quyền:** không gắn role trực tiếp vào department. Thêm bảng `org_permissions (user_id, department_node_id, role, tenant_id)` — 1 bản ghi nghĩa là "user này có role này tại node này **và mọi node bên dưới**" (giải quyết qua closure table). Trưởng 課 có bản ghi tại node 課; trưởng 部 có bản ghi tại node 部 (tự động bao trùm mọi 課 con nhờ closure table), không cần tạo bản ghi lặp lại cho từng 課 con.

**Duyệt thay khi vắng:** bảng riêng `approval_delegations (delegator_user_id, delegate_user_id, department_node_id, start_date, end_date, reason, tenant_id)`. Có khoảng ngày rõ ràng — hết hạn tự động hết hiệu lực, không cần thao tác tắt thủ công.

**Điểm nối quan trọng với việc khác:** cảnh báo 36協定 (mục 1 trong kế hoạch tổng) phải lấy người duyệt qua 1 hàm gián tiếp `getApprovers(employeeId, {asOfDate})`, KHÔNG gọi thẳng "gửi admin". Hiện tại (chưa có cây) hàm này chỉ cần trả về admin/quản lý trực tiếp; khi cây tổ chức lên, đổi bên trong hàm này để leo theo `org_permissions` + `approval_delegations`, không phải sửa từng chỗ gọi cảnh báo.

## Việc cần làm tiếp (theo đúng thứ tự đã thống nhất)
1. Bảng `monthly_summaries` (khóa theo tenant, nhân viên, tháng) + `getApprovers()` (bản đơn giản: admin/quản lý trực tiếp) + cảnh báo chủ động.
2. Cây tổ chức + phân quyền theo trên (migration động, cần làm cẩn thận, tách khỏi mục 1).
3. Chuyển 月次締め + xuất file sang BullMQ (đã có sẵn trong dependencies), dựa trên `monthly_summaries` từ mục 1.
