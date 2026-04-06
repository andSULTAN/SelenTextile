from rest_framework import views, viewsets
from rest_framework.response import Response
from django.db.models import Sum

from inventory.models import Sklad, Bichuv, Upakovka
from inventory.serializers import SkladSerializer, BichuvSerializer, UpakovkaSerializer

class BatchHistoryAPIView(views.APIView):
    """
    Partiya raqami bo'yicha (Sklad -> Bichuv -> Upakovka) tarixini ko'rsatuvchi API.
    GET /api/inventory/batch-history/?batch_number=XYZ-123
    """

    def get(self, request, *args, **kwargs):
        batch_number = request.query_params.get("batch_number")
        if not batch_number:
            return Response({"error": "batch_number parametri kiritilishi shart."}, status=400)

        history = Bichuv.get_batch_history(batch_number)
        return Response(history)


class BatchChainAnalysisAPIView(views.APIView):
    """
    Sklad, Bichuv, va Qadoqlash logikalari bo'yicha matematik qoldiq va samaradorlik "Chain Analytics".
    GET /api/inventory/chain-analysis/?batch_number=XYZ-123
    """

    def get(self, request):
        batch = request.query_params.get("batch_number")
        if not batch:
            return Response({"error": "batch_number = ?"}, status=400)
            
        sklad = Sklad.objects.filter(batch_number=batch).first()
        if not sklad:
            return Response({"error": "Bunday Partiya topilmadi"}, status=404)

        sklad_kg = float(sklad.quantity)

        bichuv_logs = Bichuv.objects.filter(sklad_id=sklad.id)
        bichuv_kg = float(bichuv_logs.aggregate(s=Sum('weight_kg'))['s'] or 0)
        bichuv_packs = float(bichuv_logs.aggregate(s=Sum('quantity'))['s'] or 0)

        remaining_kg = sklad_kg - bichuv_kg

        upakovka_logs = Upakovka.objects.filter(bichuv__sklad_id=sklad.id)
        upak_valid = float(upakovka_logs.aggregate(s=Sum('quantity'))['s'] or 0)
        upak_defect = float(upakovka_logs.aggregate(s=Sum('defect_count'))['s'] or 0)
        total_upak = upak_valid + upak_defect

        defect_percentage = round((upak_defect / total_upak) * 100, 2) if total_upak > 0 else 0
        efficiency_percentage = 100 - defect_percentage if total_upak > 0 else 100
        
        unpacked_pieces = bichuv_packs - total_upak

        return Response({
            "sklad_initial_kg": sklad_kg,
            "bichuv_used_kg": bichuv_kg,
            "sklad_remaining_kg": remaining_kg,
            
            "bichuv_total_pieces": bichuv_packs,
            "upakovka_valid_pieces": upak_valid,
            "upakovka_defect_pieces": upak_defect,
            "total_packed_pieces": total_upak,
            
            "unpacked_pieces_remaining": unpacked_pieces,
            "efficiency_percentage": efficiency_percentage,
            "defect_percentage": defect_percentage,
            "alert_red_flag": defect_percentage > 5.0
        })


class SkladViewSet(viewsets.ModelViewSet):
    queryset = Sklad.objects.all().order_by("-received_date")
    serializer_class = SkladSerializer
    
    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("status"):
            qs = qs.filter(status=self.request.query_params.get("status"))
        return qs


class BichuvViewSet(viewsets.ModelViewSet):
    queryset = Bichuv.objects.all().order_by("-cut_date")
    serializer_class = BichuvSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("status"):
            qs = qs.filter(status=self.request.query_params.get("status"))
        return qs


class UpakovkaViewSet(viewsets.ModelViewSet):
    queryset = Upakovka.objects.all().order_by("-pack_date")
    serializer_class = UpakovkaSerializer

