from rest_framework import serializers
from .models import Worker, AdvancePayment


class WorkerSerializer(serializers.ModelSerializer):
    """To'liq CRUD uchun Worker serializer."""
    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Worker
        fields = [
            "id", "first_name", "last_name", "middle_name",
            "code", "phone",
            "role", "role_display",
            "status", "status_display",
            "is_active",
            "photo", "full_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_full_name(self, obj):
        return obj.full_name


class WorkerLookupSerializer(serializers.ModelSerializer):
    """
    Worker Code bo'yicha tezkor qidirish uchun yengil serializer.
    Faqat FISH, role va is_active qaytaradi.
    """
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Worker
        fields = ["id", "code", "full_name", "first_name", "last_name", "middle_name",
                  "role", "status", "is_active"]

    def get_full_name(self, obj):
        return obj.full_name


class AdvancePaymentSerializer(serializers.ModelSerializer):
    worker_detail = WorkerSerializer(source="worker", read_only=True)
    manager_detail = serializers.SerializerMethodField()

    class Meta:
        model = AdvancePayment
        fields = '__all__'

    def get_manager_detail(self, obj):
        if obj.manager:
            return {"id": obj.manager.id, "username": obj.manager.username}
        return None

    def validate_worker(self, worker):
        if worker.status != "active":
            raise serializers.ValidationError("Faqat faol ishchilarga avans berish mumkin.")
        return worker
