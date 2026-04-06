from rest_framework import serializers
from .models import Sklad, Bichuv, Upakovka
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
