# 📱 ỨNG DỤNG CHẤM CÔNG NHÂN VIÊN HIỆN TRƯỜNG (EMPLOYEE PWA APP)
> **Ứng dụng di động PWA (Progressive Web App)** dành cho Nhân viên Kỹ thuật thực hiện Check-in / Check-out hằng ngày bằng Camera Quét mặt AI & Định vị GPS tự động.

---

## 📌 1. Tổng Quan Về App Nhân Viên

`CHAMCONG_APP` là ứng dụng Web PWA được thiết kế tối ưu cho trải nghiệm trên màn hình thiết bị di động (Smartphones, Tablets). Nhân viên kỹ thuật đi làm ngoài hiện trường chỉ cần mở ứng dụng trên điện thoại để thực hiện chấm công mà không cần cài đặt qua App Store hay Google Play.

### 🌟 Các Chức Năng Chính Của Nhân Viên:
1. **📸 Check-in / Check-out Bằng AI & GPS**: Bật Camera tự động nhận diện khuôn mặt chính chủ và kiểm tra tọa độ GPS xem có nằm trong bán kính cho phép của công trình/văn phòng hay không.
2. **📶 Chấm Công Ngoại Tuyến (Offline Sync)**: Khi làm việc tại công trình mất mạng/mất sóng, ứng dụng vẫn cho phép chụp ảnh xác thực và lưu tạm vào CSDL bộ nhớ điện thoại (**IndexedDB**). Ngay khi có mạng trở lại, ứng dụng sẽ tự động đồng bộ bản ghi lên Server.
3. **📅 Xem Ca & Lịch Phân Công Hôm Nay**: Hiển thị địa điểm làm việc, bản đồ geofence và ca làm việc được giao trong ngày.
4. **📊 Thống Kê Công Cá Nhân**: Theo dõi số giờ công đã tích lũy trong tháng, số ca làm đúng giờ, số lần đi trễ/về sớm và trạng thái phê duyệt của Admin.
5. **📝 Xin Nghỉ Phép & Đăng Ký Tăng Ca (OT)**: Gửi đơn xin nghỉ phép năm, nghỉ bệnh hoặc đăng ký làm thêm giờ trực tiếp trên App.
6. **🔔 Trung Tâm Thông Báo (Notifications)**: Nhận thông báo tức thì khi đơn xin nghỉ/OT được duyệt, hoặc khi có lịch phân công mới.

---

## 🛠️ 2. Công Nghệ Sử Dụng

- **Core Library:** ReactJS (React 19)
- **Routing:** React Router DOM (với Route Guard chốt chặn đăng nhập)
- **State Management:** Zustand (Quản lý trạng thái Auth, Chấm công, Offline Sync)
- **Offline Storage:** Dexie.js (Thư viện tương tác IndexedDB lưu trữ dữ liệu ngoại tuyến)
- **Build Tool & PWA:** Vite 5 + Service Worker (PWA Workbox hỗ trợ chạy độc lập Standalone)
- **HTTP Client:** Axios Interceptor (Tự động Renew Token, gửi header Vân tay thiết bị `X-Device-Fingerprint`)
- **Icon Set:** React Icons (Remix Icons)

---

## 📂 3. Cấu Trúc Thư Mục (`/CHAMCONG_APP/src`)

```text
CHAMCONG_APP/src/
├── api/              # Axios Client trung tâm (Interceptors xử lý Refresh Token & Fingerprint)
├── components/       # Component giao diện dùng chung:
│   ├── layout/       # BottomNavigation (Thanh điều hướng dưới), TopAppBar, OfflineBanner
│   ├── CustomModal.jsx
│   ├── FaceAttendanceCamera.jsx   # Camera quét mặt & Liveness check
│   └── FaceRegisterPage.jsx       # Trang chụp ảnh đăng ký khuôn mặt gốc
├── hooks/            # Custom Hooks (useAuth, useAttendance, useAssignment, useOffline...)
├── indexeddb/        # Cấu hình Dexie IndexedDB lưu trữ hàng chờ chấm công Offline
├── layouts/          # Khung giao diện ứng dụng di động (MainLayout, RouteGuardLayout)
├── pages/            # Các màn hình chính của ứng dụng:
│   ├── Dashboard.jsx            # Màn hình chính (Đồng hồ hệ thống, nút Check-in/out, Thống kê)
│   ├── Attendance.jsx           # Màn hình camera chấm công & Lịch sử cá nhân
│   ├── AttendanceCameraPage.jsx # Giao diện Camera chụp ảnh toàn màn hình
│   ├── Assignments.jsx          # Màn hình xem danh sách ca được phân công
│   ├── LeaveRequests.jsx        # Màn hình gửi & quản lý đơn nghỉ phép
│   ├── OvertimeRequests.jsx     # Màn hình gửi & quản lý đơn tăng ca (OT)
│   ├── SyncCenter.jsx           # Màn hình quản lý đồng bộ ngoại tuyến (Offline Sync)
│   ├── Notifications.jsx        # Màn hình trung tâm thông báo
│   └── Profile.jsx              # Màn hình hồ sơ cá nhân & đăng ký khuôn mặt
├── services/         # Tầng kết nối RESTful APIs tới Backend
├── store/            # Zustand Stores quản lý State (authStore, attendanceStore, syncStore)
├── utils/            # Tiện ích sinh vân tay WebAuthn, kiểm tra Face Biometrics
├── App.jsx           # Cấu hình Route chính của ứng dụng
└── main.jsx          # File điểm khởi chạy & Đăng ký PWA Service Worker
```

---

## 🚀 4. Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Cài đặt các thư viện
```bash
cd CHAMCONG_APP
npm install
```

### 2. Cấu hình biến môi trường (`.env`)
Tạo file `.env` tại thư mục gốc `CHAMCONG_APP`:
```env
VITE_API_URL=http://localhost:3000/api
```

### 3. Chạy ứng dụng ở chế độ Phát Triển (Development)
```bash
npm run dev
```
Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:5173` (hoặc mở trên điện thoại cùng mạng Wi-Fi bằng IP máy tính).

### 4. Đóng gói sản phẩm (Production Build)
```bash
npm run build
```
Các file tĩnh đã đóng gói sẽ nằm trong thư mục `CHAMCONG_APP/dist/`.

---

## 📲 5. Hướng Dẫn Thao Tác Chấm Công Cho Nhân Viên

1. **Đăng nhập**: Sử dụng tài khoản nhân viên do công ty cấp (Ví dụ: `employee01` / `Employee@123`).
2. **Đăng ký khuôn mặt lần đầu**: Vào mục *Cá nhân* ➔ Chọn *Đăng ký khuôn mặt gốc* và chụp ảnh rõ mặt.
3. **Thực hiện Check-in**:
   - Tại Màn hình chính, chọn **Bắt đầu Check-in**.
   - Cho phép ứng dụng truy cập **Vị trí GPS** và **Camera**.
   - Đưa khuôn mặt vào khung hình tròn và bấm **Chụp ảnh**.
   - Nếu GPS hợp lệ và khuôn mặt khớp ➔ Hệ thống báo **Chấm công thành công**.

---

## 🛡️ License & Copyright
Dự án được bảo hộ quyền sở hữu trí tuệ cho phân hệ ứng dụng chấm công di động.
