from rest_framework import serializers
from .models import ProductModel, WorkType, WorkLog
from accounts.serializers import WorkerLookupSerializer


class WorkTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkType
        fields = [
            "id", "name", "product_model", "price",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProductModelSerializer(serializers.ModelSerializer):
    """ProductModel + unga biriktirilgan WorkTypelar."""
    work_types = WorkTypeSerializer(many=True, read_only=True)

    class Meta:
        model = ProductModel
        fields = [
            "id", "name", "code", "description", "status", "image",
            "work_types",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProductModelListSerializer(serializers.ModelSerializer):
    """Select/dropdown uchun yengil ro'yxat."""
    class Meta:
        model = ProductModel
        fields = ["id", "name", "code", "status"]


class WorkLogSerializer(serializers.ModelSerializer):
    """WorkLog yaratish va ko'rish uchun."""
    worker_name = serializers.CharField(source="worker.full_name", read_only=True)
    work_type_name = serializers.CharField(source="work_type.name", read_only=True)
    product_model_name = serializers.CharField(
        source="work_type.product_model.name", read_only=True
    )
    manager_name = serializers.SerializerMethodField()

    def get_manager_name(self, obj):
        if obj.manager:
            return obj.manager.get_full_name() or obj.manager.username
        return None

    class Meta:
        model = WorkLog
        fields = [
            "id",
            "worker", "worker_name",
            "work_type", "work_type_name",
            "product_model_name",
            "quantity",
            "price_snapshot", "total_sum",
            "work_date",
            "manager", "manager_name",
            "note",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "price_snapshot", "total_sum",
            "worker_name", "work_type_name", "product_model_name",
            "manager_name",
            "created_at", "updated_at",
        ]


class WorkLogCreateSerializer(serializers.ModelSerializer):
    """
    Ish kiritish formasi uchun maxsus serializer.
    price_snapshot va total_sum model.save() da hisoblanadi.
    """

    class Meta:
        model = WorkLog
        fields = [
            "worker", "work_type", "quantity",
            "work_date", "manager", "note",
        ]

    def validate_worker(self, value):
        if value.status != "active":
            raise serializers.ValidationError("Ishchi faol emas.")
        return value
