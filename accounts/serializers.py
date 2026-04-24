import re
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.hashers import make_password
from .models import Worker, AdvancePayment, CustomUser, PERMISSION_CHOICES, DEFAULT_ROLE_PERMISSIONS


class WorkerSerializer(serializers.ModelSerializer):
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


# ── System User Serializers ────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    """Read — tizim foydalanuvchilari ro'yxati uchun."""
    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            "id", "username", "first_name", "last_name", "phone",
            "role", "role_display", "permissions_list",
            "is_active", "full_name", "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserCreateSerializer(serializers.ModelSerializer):
    """Write — yangi foydalanuvchi yaratish."""
    password = serializers.CharField(write_only=True, min_length=6, required=False, allow_blank=True)
    confirm_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    pin = serializers.CharField(write_only=True, max_length=4, required=False, allow_blank=True)
    middle_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = CustomUser
        fields = [
            "username", "password", "confirm_password", "pin",
            "first_name", "last_name", "middle_name",
            "phone", "role", "permissions_list",
        ]

    def validate_phone(self, value):
        if value and not re.match(r"^\+998\d{9}$", value):
            raise serializers.ValidationError("Telefon formati: +998XXXXXXXXX (9 raqam)")
        return value

    def validate_pin(self, value):
        if value and (not value.isdigit() or len(value) != 4):
            raise serializers.ValidationError("PIN 4 ta raqamdan iborat bo'lishi kerak.")
        return value

    def validate(self, data):
        role = data.get("role", "manager")
        password = data.get("password", "")
        pin = data.get("pin", "")
        confirm = data.pop("confirm_password", "")

        if role == "admin":
            if not password:
                raise serializers.ValidationError({"password": "Admin uchun parol kiritilishi shart."})
            if password != confirm:
                raise serializers.ValidationError({"confirm_password": "Parollar mos kelmaydi."})
        else:
            if not pin and not password:
                raise serializers.ValidationError({"pin": "PIN yoki parol kiritilishi shart."})
            if password and password != confirm:
                raise serializers.ValidationError({"confirm_password": "Parollar mos kelmaydi."})
        return data

    def create(self, validated_data):
        password = validated_data.pop("password", "")
        raw_pin = validated_data.pop("pin", "")
        validated_data.pop("middle_name", "")

        if validated_data.get("permissions_list") is None:
            validated_data["permissions_list"] = DEFAULT_ROLE_PERMISSIONS.get(
                validated_data.get("role", "manager"), []
            )
        user = CustomUser(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        if raw_pin:
            user.pin = make_password(raw_pin)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Patch — tahrirlash."""
    pin = serializers.CharField(write_only=True, max_length=4, required=False, allow_blank=True)

    class Meta:
        model = CustomUser
        fields = ["first_name", "last_name", "phone", "role", "permissions_list", "is_active", "pin"]

    def validate_phone(self, value):
        if value and not re.match(r"^\+998\d{9}$", value):
            raise serializers.ValidationError("Telefon formati: +998XXXXXXXXX")
        return value

    def validate_pin(self, value):
        if value and (not value.isdigit() or len(value) != 4):
            raise serializers.ValidationError("PIN 4 ta raqamdan iborat bo'lishi kerak.")
        return value

    def update(self, instance, validated_data):
        raw_pin = validated_data.pop("pin", "")
        if raw_pin:
            instance.pin = make_password(raw_pin)
        return super().update(instance, validated_data)
