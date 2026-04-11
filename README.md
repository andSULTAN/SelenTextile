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

### 3. `inventory` (Zanjir Tahlili, Analytics va Media) - **v4.0 YANGILANISH**
- **Fabric Image Support**: Har bir mato kirimida uning haqiqiy rasmini yuklash va ro'yxatda (`preview`) ko'rish.
- **Multi-Model Assignment**: Bir partiya (Batch) matosiga bir vaqtning o'zida bir nechta tikuv modellarini biriktirish imkoniyati.
- **Cutting-Ready Media**: Har bir model uchun bir nechta rasmlarni (eskizlar) yuklash. Bichuv bo'limi uchun maxsus **Image Slider** (Slayd-shou) orqali rasmlarni batafsil ko'rish.
- **Stock Threshold Alerts**: `FabricInventory` dagi qoldiq belgilangan minimal miqdordan (`min_kg`) kamayganda, **Telegram Bot** orqali adminga avtomatik ogohlantirish yuborish.
- **Supplier Analytics**: To'quvchi va Bo'yoqchilar kesimida samaradorlik (Efficiency) va brak (Waste) foizini hisoblaydigan tahliliy API.
- **Integer Weights**: Hamma og'irliklar (Kg) va miqdorlar butun sonlar (`PositiveIntegerField`) shakliga o'tkazildi (Sklad xodimlari uchun soddalashtirildi).

---

## 💻 Frontend (Next.js) Imkoniyatlari

### 1. Premium TV Dashboard (`/tv-dashboard`)
- **Visuals**: Framer Motion animatsiyalari va Glassmorphism dizayn.
- **Real-time**: Har 5 soniyada ma'lumotlar yangilanib turadi.
- **Progress Bar**: Brak foizi 5% dan oshsa, vizual qizil ogohlantirish (Alert).

### 2. Admin & Payroll (`/admin/payroll`)
- Oyliklarni oyma-oy filtrlash va yopish (Pay) tugmasi.
- Xodimlar ro'yxatini boshqarish va aktivatsiya holatini o'zgartirish.

### 3. Inventory UI/UX (`/inventory/*`)
- **InventoryMenu**: Sidebar uchun maxsus "Sklad" menyusi: Glassmorphism dizayni, silliq toggle animatsiyasi va to'g'ridan-to'g'ri navigatsiya mantiqi.
- **Waste Analytics Graph**: `Recharts` yordamida eng ko'p brak beruvchi yetkazib beruvchilarning "Eng yomon Top-5" antireyting diagrammasi.
- **Touch Advance & Logging**: Xodimlarga tezkor avans kiritish (Numpad) va bichuv/upakovka loglarini sensorli ekran orqali kiritish.

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

*Oxirgi yangilanish: 2026-04-08 09:35 (v4.0 - Sklad Media, Analytics & Multiple Models)*
