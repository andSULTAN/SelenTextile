from django.contrib import admin

from .models import ProductModel, WorkType, WorkLog


# ──────────────────────────────────────────────
# ProductModel Admin
# ──────────────────────────────────────────────
@admin.register(ProductModel)
class ProductModelAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "code")
    readonly_fields = ("created_at", "updated_at")


# ──────────────────────────────────────────────
# WorkType Admin
# ──────────────────────────────────────────────
class WorkTypeInline(admin.TabularInline):
    model = WorkType
    extra = 1


@admin.register(WorkType)
class WorkTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "product_model", "price", "updated_at")
    list_filter = ("product_model",)
    search_fields = ("name",)
    readonly_fields = ("created_at", "updated_at")


# WorkType inline ni ProductModel admin ga qo'shamiz
ProductModelAdmin.inlines = [WorkTypeInline]


# ──────────────────────────────────────────────
# WorkLog Admin
# ──────────────────────────────────────────────
@admin.register(WorkLog)
class WorkLogAdmin(admin.ModelAdmin):
    list_display = (
        "worker", "work_type", "quantity",
        "price_snapshot", "total_sum", "work_date", "manager",
    )
    list_filter = ("work_date", "work_type__product_model", "manager")
    search_fields = ("worker__first_name", "worker__last_name", "worker__code")
    readonly_fields = ("price_snapshot", "total_sum", "created_at", "updated_at")
    date_hierarchy = "work_date"
    raw_id_fields = ("worker",)
