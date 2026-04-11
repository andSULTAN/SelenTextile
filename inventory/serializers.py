from rest_framework import serializers
from .models import Sklad, Bichuv, Upakovka, FabricInventory, BrakLog, BichuvKirim, BichuvChiqim
from production.serializers import ProductModelSerializer


class SkladSerializer(serializers.ModelSerializer):
    product_model_detail = ProductModelSerializer(source="product_model", read_only=True)

    class Meta:
        model = Sklad
        fields = '__all__'


class BichuvSerializer(serializers.ModelSerializer):
    product_model_detail = ProductModelSerializer(source="product_model", read_only=True)
    sklad_detail = SkladSerializer(source="sklad", read_only=True)

    class Meta:
        model = Bichuv
        fields = '__all__'


class UpakovkaSerializer(serializers.ModelSerializer):
    bichuv_detail = BichuvSerializer(source="bichuv", read_only=True)

    class Meta:
        model = Upakovka
        fields = '__all__'


class BrakLogSerializer(serializers.ModelSerializer):
    brak_type_display = serializers.CharField(
        source="get_brak_type_display", read_only=True
    )
    fabric_batch = serializers.CharField(
        source="fabric.batch_number", read_only=True
    )
    fabric_weaver = serializers.CharField(
        source="fabric.supplier_weaver", read_only=True
    )

    class Meta:
        model = BrakLog
        fields = [
            "id", "fabric", "fabric_batch", "fabric_weaver",
            "kg", "brak_type", "brak_type_display",
            "note", "created_by", "created_at",
        ]
        read_only_fields = ["id", "created_at", "fabric_batch", "fabric_weaver", "brak_type_display"]


class FabricInventorySerializer(serializers.ModelSerializer):
    available_kg = serializers.ReadOnlyField()
    total_brak_kg = serializers.ReadOnlyField()
    assigned_models_detail = ProductModelSerializer(
        source="assigned_models", many=True, read_only=True
    )

    class Meta:
        model = FabricInventory
        fields = '__all__'


class BichuvKirimSerializer(serializers.ModelSerializer):
    fabric_detail = FabricInventorySerializer(source="fabric", read_only=True)
    product_model_detail = ProductModelSerializer(source="product_model", read_only=True)
    batch_number = serializers.CharField(source="fabric.batch_number", read_only=True)

    class Meta:
        model = BichuvKirim
        fields = '__all__'


class BichuvChiqimSerializer(serializers.ModelSerializer):
    fabric_detail = FabricInventorySerializer(source="fabric", read_only=True)
    product_model_detail = ProductModelSerializer(source="product_model", read_only=True)
    batch_number = serializers.CharField(source="fabric.batch_number", read_only=True)
    kesim_label = serializers.SerializerMethodField()

    class Meta:
        model = BichuvChiqim
        fields = '__all__'

    def get_kesim_label(self, obj):
        return f"{obj.kesim_number}-kesim"

