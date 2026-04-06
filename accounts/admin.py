from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _

from .models import CustomUser, Worker


# ──────────────────────────────────────────────
# Custom User Admin
# ──────────────────────────────────────────────
@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "get_full_name", "role", "phone", "is_active")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("username", "first_name", "last_name", "phone")

    fieldsets = UserAdmin.fieldsets + (
        (_("Qo'shimcha"), {"fields": ("role", "phone")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (_("Qo'shimcha"), {"fields": ("role", "phone")}),
    )


# ──────────────────────────────────────────────
# Worker Admin
# ──────────────────────────────────────────────
@admin.register(Worker)
class WorkerAdmin(admin.ModelAdmin):
    list_display = ("code", "last_name", "first_name", "middle_name", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("code", "first_name", "last_name", "middle_name")
    readonly_fields = ("created_at", "updated_at")
