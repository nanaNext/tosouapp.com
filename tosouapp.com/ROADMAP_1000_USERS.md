# Roadmap 1000 Users

## Muc tieu

Tai lieu nay dung de dua du an den muc:

- van hanh on cho khoang 1000 nhan vien
- giu duoc do on dinh trong 3-5 nam
- co nen tang de di tiep 10 nam neu tiep tuc dau tu dung cach

## Danh gia hien tai

Muc do hien tai:

- Local: khoang 8.2/10
- Production: khoang 7.8/10

Diem manh hien co:

- Da chuan hoa nhieu API quan trong
- Da sua mot loat loi production gan day
- Da co smoke/load script nhe cho cac API nong
- Da bo sung index ho tro cho attendance va leave
- Da them diem do cho `attendance_today_roster` va `leave_summary`
- Da them diem do cho `expenses_admin_list`, `expenses_admin_dashboard`, `admin_salary_preview`

Diem con thieu:

- Test coverage chua day
- Monitoring production con mong
- Con logic legacy o frontend
- Chua co bai do gan sat du lieu production
- Chua co ke hoach dai han cho du lieu attendance rat lon

## Viec bat buoc de du 3-5 nam

### 1. On dinh API contract

Can dat muc:

- moi endpoint quan trong tra ve format on dinh
- frontend khong duoc doan kieu du lieu
- cac man legacy phai co adapter neu chua kip viet lai

Checklist:

- [ ] Chot danh sach endpoint nhay cam: auth, users, attendance, leave, salary
- [ ] Viet test hoi quy cho response shape cua cac endpoint do
- [ ] Loai bo dan cac cho frontend iterate truc tiep len du lieu chua normalize

### 2. Tang do an toan khi sua code

Checklist:

- [ ] Co test unit cho `auth`
- [ ] Co test unit cho `leave`
- [ ] Co test hoi quy cho `attendance month`, `today roster`
- [ ] Co it nhat 1 smoke script cho cac luong admin chinh

### 3. Theo doi production tot hon

Checklist:

- [ ] Bat log query cham
- [ ] Co metric cho API cham
- [ ] Co health check DB va Redis
- [ ] Co cach xem loi production tap trung

### 4. Toi uu bang du lieu lon

Checklist:

- [ ] Ra soat index cho attendance, leave, salary, requests
- [ ] Ghi lai query nao dang la query nong
- [ ] Do p95 cua nhom API quan trong theo dinh ky

## Viec bat buoc de du 10 nam

### 1. Chien luoc du lieu

Can co:

- partition hoac archive cho bang attendance lon
- backup dinh ky
- test restore dinh ky
- quy tac luu tru file va log cu

Checklist:

- [ ] Xac dinh bang co toc do tang du lieu nhanh nhat
- [ ] Dinh nghia chinh sach archive theo nam hoac theo thang
- [ ] Co quy trinh restore thu tren moi truong test

### 2. Giam no ky thuat

Checklist:

- [ ] Giam dan cac man legacy quan trong
- [ ] Tach ro business logic khoi frontend neu dang bi tron
- [ ] Chot tai lieu nghiep vu cho leave, salary, attendance

### 3. Van hanh co quy trinh

Checklist:

- [ ] Co checklist truoc khi deploy
- [ ] Co rollback plan ro rang
- [ ] Co nguoi khac vao van doc va sua duoc he thong

### 4. Bao mat va cap nhat dependency

Checklist:

- [ ] Lich cap nhat dependency dinh ky
- [ ] Rà lai auth, refresh token, password reset, audit log
- [ ] Theo doi loi thu vien va cap nhat theo dot

## Viec nen lam ngay trong thang nay

Thu tu uu tien de lam that:

1. Day cac commit local can thiet len production theo dot an toan
2. Them them test hoi quy cho `leave`, `attendance`, `salary`
3. Chay smoke/load script voi bo du lieu gan thuc te hon
4. Bat dau gom metric cho cac API nong
5. Ra soat them index cho cac bang lien quan salary va expenses

## Viec nen lam ngay trong tuan nay

1. Hop nhat cac thay doi local dang co thanh tung dot nho, de review duoc
2. Chay lai smoke/load:
   - `20-50` iterations
   - `concurrency 3-5`
3. Ghi nhan p95 cho:
   - `attendance_today_roster`
   - `attendance_month`
   - `attendance_month_detail`
   - `leave_summary`
4. Rà `salary` va `expenses` de tim query nong tiep theo

## So do local moi nhat

- `expenses_admin_list`: avg `20ms`, p95 `49ms`
- `expenses_admin_dashboard`: avg `15ms`, p95 `22ms`
- `admin_salary_preview` truoc toi uu: avg `98ms`, p95 `146ms`
- `admin_salary_preview` sau toi uu buoc 1: avg `91ms`, p95 `113ms`
- `admin_salary_preview` sau toi uu buoc 2 (8 iterations): avg `94ms`, p95 `131ms`
- `admin_salary_preview` sau toi uu buoc 2 (20 iterations): avg `69ms`, p95 `98ms`

Nhan xet:

- `expenses` hien tai dang o muc on
- `salary` van la diem nen uu tien toi uu tiep
- huong dung nhat luc nay la tiep tuc mo sau `salary.service.js`
- benchmark ngan co dao dong, nhung vong dai hon cho thay xu huong da tot len ro

## Dinh huong toi uu tiep theo

Neu tiep tuc toi uu bang cach an toan, uu tien tiep theo nen la:

1. `salary`
2. `attendance_today_roster`
3. `leave_summary`
4. `attendance_month_detail`
5. `expenses`

## Nguyen tac lam viec

- Sua va kiem tra o local truoc
- Chi day production khi co lenh ro rang
- Khong deploy nhieu thay doi lon trong cung 1 dot
- Moi dot toi uu nen co test hoac script do di kem

## Ket luan

Du an hien tai da o muc kha on va co the phuc vu quy mo 1000 nguoi.

De dat muc yên tam 3-5 nam:

- can tiep tuc ky luat hoa test, monitoring va du lieu

De dat muc 10 nam:

- can coi day la mot he thong duoc van hanh bai ban, khong chi la mot bo code dang chay
