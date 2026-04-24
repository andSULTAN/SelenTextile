"""
Test ma'lumotlar yaratish skripti.
Ishlatish: python manage.py shell < seed_data.py
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.models import CustomUser, Worker
from production.models import ProductModel, WorkType, WorkLog
from datetime import date

# -- 1. Superuser / Manager --
admin_user, created = CustomUser.objects.get_or_create(
    username="admin",
    defaults={
        "role": "admin",
        "first_name": "Admin",
        "last_name": "User",
        "is_staff": True,
        "is_superuser": True,
    },
)
if created:
    admin_user.set_password("admin123")
    admin_user.save()
    print("[OK] Admin yaratildi: admin / admin123")

manager, created = CustomUser.objects.get_or_create(
    username="manager1",
    defaults={
        "role": "manager",
        "first_name": "Sardor",
        "last_name": "Alimov",
    },
)
if created:
    manager.set_password("manager123")
    manager.save()
    print("[OK] Manager yaratildi: manager1 / manager123")

# -- 2. Workers --
workers_data = [
    {"first_name": "Alisher", "last_name": "Karimov", "middle_name": "Bahodirovich", "code": "W-001", "phone": "+998901234567"},
    {"first_name": "Nilufar", "last_name": "Azimova", "middle_name": "Rustamovna", "code": "W-015", "phone": "+998901234568"},
    {"first_name": "Bobur", "last_name": "Toshmatov", "middle_name": "Sherzodovich", "code": "W-023", "phone": "+998901234569"},
    {"first_name": "Malika", "last_name": "Rahimova", "middle_name": "Anvarovna", "code": "W-008", "phone": "+998901234570"},
    {"first_name": "Jasur", "last_name": "Normatov", "middle_name": "Ilhomovich", "code": "W-042", "phone": "+998901234571"},
    {"first_name": "Dilnoza", "last_name": "Usmonova", "middle_name": "Karimovna", "code": "W-033", "phone": "+998901234572"},
]

for wd in workers_data:
    w, created = Worker.objects.get_or_create(code=wd["code"], defaults=wd)
    if created:
        print(f"  [Worker] Ishchi yaratildi: {w.full_name} ({w.code})")

# -- 3. Product Models --
models_data = [
    {"name": "Futbolka FK-101", "code": "FK-101", "status": "active"},
    {"name": "Shim SH-200", "code": "SH-200", "status": "active"},
    {"name": "Ko'ylak KR-305", "code": "KR-305", "status": "active"},
    {"name": "Kurtka KT-410", "code": "KT-410", "status": "inactive"},
]

for md in models_data:
    pm, created = ProductModel.objects.get_or_create(code=md["code"], defaults=md)
    if created:
        print(f"  [Model] Model yaratildi: {pm.name}")

# -- 4. Work Types --
work_types_data = [
    # FK-101
    {"name": "Tikish", "product_model__code": "FK-101", "price": 5000},
    {"name": "Dazmollash", "product_model__code": "FK-101", "price": 2000},
    {"name": "Qadoqlash", "product_model__code": "FK-101", "price": 1000},
    {"name": "Bichuv", "product_model__code": "FK-101", "price": 2000},
    # SH-200
    {"name": "Tikish", "product_model__code": "SH-200", "price": 7000},
    {"name": "Dazmollash", "product_model__code": "SH-200", "price": 2000},
    {"name": "Qadoqlash", "product_model__code": "SH-200", "price": 1500},
    # KR-305
    {"name": "Tikish", "product_model__code": "KR-305", "price": 6000},
    {"name": "Yoqa tikish", "product_model__code": "KR-305", "price": 3000},
    {"name": "Tugma tikish", "product_model__code": "KR-305", "price": 1500},
    {"name": "Dazmollash", "product_model__code": "KR-305", "price": 2500},
]

for wtd in work_types_data:
    pm = ProductModel.objects.get(code=wtd.pop("product_model__code"))
    wt, created = WorkType.objects.get_or_create(
        name=wtd["name"], product_model=pm, defaults={"price": wtd["price"]}
    )
    if created:
        print(f"  [WorkType] Ish turi yaratildi: {pm.name} -> {wt.name} ({wt.price} so'm)")

print("\n[FINISH] Test ma'lumotlar tayyor!")
