# Selen Textile — ERP / CRM Tizimi 🏭

Ushbu loyiha Selen Textile tikuvchilik fabrikasining ishchilari, ishlab chiqarish loglari (WorkLogs), qoldiq nazorati (Sklad, Bichuv, Upakovka) va real-time statistikasini boshqarish uchun yaratilgan to'liq miqyosli ERP tizimidir.

---

## 🛠 Texnologiyalar Do'koni (Tech Stack)
- **Backend**: Python 3.12, Django 6.x, Django REST Framework (DRF), PostgreSQL (Production).
- **Frontend**: Next.js 15 (App Router), Tailwind CSS v4, Framer Motion, Recharts, Lucide React.
- **Infratuzilma**: Docker, Redis, Celery, Nginx, GitHub Actions (CI/CD).
- **Hisobotlar**: OpenPyXL (Excel), ReportLab (PDF), Telegram Bot API (Backup Notifications).

---

## 🗺 Arxitektura va Modullar Qismi (v3.0 Yangilanishlari)

### 1. `accounts` (Moliya va Audit) - **YANGI**
- **Payroll Management**: Oyliklarni avtomatik hisoblash (Oylik ish - Avans = Sof oylik).
- **Excel Export**: Barcha xodimlarning oylik hisobotlarini bir tugma bilan Excel formatida yuklab olish (`/api/accounts/payroll/export/`).
- **Worker Management**: Ishchilarni aktiv/nofaol qilish (`toggle-active`) va tezkor qidiruv (Lookup API).
- **Audit Logging**: Har bir ish logi (WorkLog) va to'lovdagi o'zgarishlar tarixini (eski -> yangi qiymat) saqlash.

### 2. `production` (Ishlab chiqarish va Dashboard)
- **WorkLog 30-Min Rule**: Menejerlar kiritgan ishlarini faqat 30 daqiqa ichida tahrirlashi mumkin. Keyin tahrirlash bloklanadi (Faqat Admin uchun ochiq).
- **TV Dashboard API**: Fabrika ichidagi monitorlar uchun real-time statistika:
  - **Bugungi TOP-10**: Eng ko'p mahsulot tikkan ishchilar reytingi.
  - **Oylik TOP-10**: Jami summa bo'yicha oy yulduzlari.
  - **Sifat Nazorati**: Bugungi jami brak foizi (Alert tizimi bilan).

### 3. `inventory` (Zanjir Tahlili va Validatsiya)
- **Sklad → Bichuv → Upakovka**: Mahsulotning to'liq zanjirini (Batch Tracking) partiya raqami orqali kuzatish.
- **Qat'iy Validatsiyalar**:
  - Bichuv og'irligi Sklad dagi gazlamadan oshmasligi kerak.
  - Upakovka qilingan jami mahsulot (Tayyor + Brak) Bichuvdan chiqqan miqdordan oshmasligi kerak.
- **Waste Analysis**: Gazlama isrofini (Waste) va upakovka samaradorligini hisoblash.

---

## 💻 Frontend (Next.js) Imkoniyatlari

### 1. Premium TV Dashboard (`/tv-dashboard`)
- **Visuals**: Framer Motion animatsiyalari va Glassmorphism dizayn.
- **Real-time**: Har 5 soniyada ma'lumotlar yangilanib turadi.
- **Progress Bar**: Brak foizi 5% dan oshsa, vizual qizil ogohlantirish (Alert).

### 2. Admin & Payroll (`/admin/payroll`)
- Oyliklarni oyma-oy filtrlash va yopish (Pay) tugmasi.
- Xodimlar ro'yxatini boshqarish va aktivatsiya holatini o'zgartirish.

### 3. Sensorli POS Terminal (`/touch/*`)
- **Touch Advance**: Xodimlarga tezkor avans kiritish (Numpad).
- **Quick Logging**: Bichuv va Upakovka ma'lumotlarini sensorli ekran orqali tezkor kiritish.

---

## 🛡 Xavfsizlik va Avtomatlashtirish

### 1. Zaxiralash (Database Backup)
- `scripts/db_backup.sh`: Har kuni PostgreSQL bazasini zaxiralab, **Telegram Bot** orqali adminga yuboradi.
- 7 kundan eski zaxiralar avtomatik tozalanadi.

### 2. CI/CD Pipeline
- GitHub Actions orqali `main` branchiga push qilinganda serverdagi Docker konteynerlar avtomatik reload qilinadi.

---

## 🚀 Ishga tushirish (Production)
```bash
# Docker orqali barcha servislarni yoqish
docker-compose up --build -d

# Bazani sozlash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py collectstatic --noinput
```

*Oxirgi yangilanish: 2026-04-04 12:15 (v3.0 - Full Chain & Payroll Optimization)*
