from django.contrib import admin

from .models import Sklad, Bichuv, Upakovka


# ──────────────────────────────────────────────
# Sklad Admin
# ──────────────────────────────────────────────
@admin.register(Sklad)
class SkladAdmin(admin.ModelAdmin):
    list_display = (
        "batch_number", "fabric_type", "color",
        "quantity", "roll_count", "status", "received_date",
    )
    list_filter = ("status", "fabric_type", "received_date")
    search_fields = ("batch_number", "fabric_type", "color")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "received_date"


# ──────────────────────────────────────────────
# Bichuv Admin
# ──────────────────────────────────────────────
@admin.register(Bichuv)
class BichuvAdmin(admin.ModelAdmin):
    list_display = (
        "batch_number", "product_model", "sklad",
        "quantity", "defect_count", "status", "cut_date",
    )
    list_filter = ("status", "cut_date")
    search_fields = ("batch_number",)
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "cut_date"
    raw_id_fields = ("sklad",)


# ──────────────────────────────────────────────
# Upakovka Admin
# ──────────────────────────────────────────────
@admin.register(Upakovka)
class UpakovkaAdmin(admin.ModelAdmin):
    list_display = (
        "batch_number", "product_model", "bichuv",
        "quantity", "box_count", "defect_count", "status", "pack_date",
    )
    list_filter = ("status", "pack_date")
    search_fields = ("batch_number",)
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "pack_date"
    raw_id_fields = ("bichuv",)
