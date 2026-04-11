from rest_framework import views, viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum
from django.db import transaction

from inventory.models import (
    Sklad, Bichuv, Upakovka, FabricInventory, StockThreshold, BrakLog,
    BichuvKirim, BichuvChiqim,
)
from inventory.serializers import (
    SkladSerializer, BichuvSerializer, UpakovkaSerializer,
    FabricInventorySerializer, BrakLogSerializer,
    BichuvKirimSerializer, BichuvChiqimSerializer,
)

class BatchHistoryAPIView(views.APIView):
    permission_classes = [AllowAny]
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
    permission_classes = [AllowAny]
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
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("status"):
            qs = qs.filter(status=self.request.query_params.get("status"))
        return qs


class BichuvViewSet(viewsets.ModelViewSet):
    queryset = Bichuv.objects.all().order_by("-cut_date")
    serializer_class = BichuvSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("status"):
            qs = qs.filter(status=self.request.query_params.get("status"))
        return qs

    def create(self, request, *args, **kwargs):
        """
        Bichuv saqlanishidan oldin FabricInventory qoldig'ini tekshiradi.
        Yetarli kg bo'lmasa 400 qaytaradi.
        """
        weight_kg = float(request.data.get("weight_kg", 0) or 0)
        batch_number = request.data.get("batch_number", "")

        if batch_number and weight_kg > 0:
            fabric = FabricInventory.objects.filter(batch_number=batch_number).first()
            if fabric:
                available = fabric.available_kg
                if weight_kg > available:
                    return Response(
                        {
                            "error": (
                                f"Sklad qoldig'i yetarli emas. "
                                f"Mavjud: {available:.0f} kg, "
                                f"So'ralgan: {weight_kg:.0f} kg"
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        return super().create(request, *args, **kwargs)


class UpakovkaViewSet(viewsets.ModelViewSet):
    queryset = Upakovka.objects.all().order_by("-pack_date")
    serializer_class = UpakovkaSerializer
    permission_classes = [AllowAny]


# ── BrakLog ──────────────────────────────────────────────────────
class BrakLogViewSet(viewsets.ModelViewSet):
    """
    POST /api/inventory/brak/  — yangi brak yozuvi
    GET  /api/inventory/brak/  — brak loglari ro'yxati
    GET  /api/inventory/brak/?fabric=<id>  — partiya bo'yicha filter
    """
    queryset = BrakLog.objects.select_related("fabric", "created_by").order_by("-created_at")
    serializer_class = BrakLogSerializer
    permission_classes = [AllowAny]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        fabric_id = self.request.query_params.get("fabric")
        if fabric_id:
            qs = qs.filter(fabric_id=fabric_id)
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        fabric_id = request.data.get("fabric")
        kg = int(request.data.get("kg", 0) or 0)

        if not fabric_id:
            return Response({"error": "fabric maydoni majburiy."}, status=status.HTTP_400_BAD_REQUEST)
        if kg <= 0:
            return Response({"error": "kg 0 dan katta bo'lishi kerak."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fabric = FabricInventory.objects.select_for_update().get(pk=fabric_id)
        except FabricInventory.DoesNotExist:
            return Response({"error": "Partiya topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        if kg > fabric.available_kg:
            return Response(
                {
                    "error": (
                        f"Sklad qoldig'i yetarli emas. "
                        f"Mavjud: {fabric.available_kg:.0f} kg, "
                        f"So'ralgan: {kg} kg"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user if request.user.is_authenticated else None)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED)

class FabricInventoryViewSet(viewsets.ModelViewSet):
    queryset = FabricInventory.objects.all().order_by("-created_at")
    serializer_class = FabricInventorySerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        import uuid
        from production.models import ProductModel, ProductModelImage

        data = request.data.copy()

        # Eski bir model nomi usuli (backwards compat)
        model_name = data.get("model_name")

        # Yangi: bir nechta model nomlari
        if hasattr(data, "getlist"):
            model_names = list(data.getlist("model_names"))
            assigned_ids = list(data.getlist("assigned_models"))
        else:
            raw_names = data.get("model_names", [])
            model_names = list(raw_names) if isinstance(raw_names, list) else ([raw_names] if raw_names else [])
            raw_ids = data.get("assigned_models", [])
            assigned_ids = list(raw_ids) if isinstance(raw_ids, list) else ([raw_ids] if raw_ids else [])

        # Eski usulni yangi ro'yxatga qo'shish
        if model_name and model_name not in model_names:
            model_names.append(str(model_name))

        for i, name in enumerate(model_names):
            name = name.strip()
            if not name:
                continue
            pm, _ = ProductModel.objects.get_or_create(
                name=name,
                defaults={"code": f"SC-{str(uuid.uuid4())[:8].upper()}"}
            )
            # Har bir model uchun rasmlar: model_images_0, model_images_1, ...
            if hasattr(request, "FILES"):
                for f in request.FILES.getlist(f"model_images_{i}"):
                    ProductModelImage.objects.create(product_model=pm, image=f)
                # Eski usul: model_images[i] yoki model_images (birinchi model uchun)
                if i == 0:
                    for key in request.FILES.keys():
                        if key.startswith("model_images["):
                            for f in request.FILES.getlist(key):
                                ProductModelImage.objects.create(product_model=pm, image=f)
            if str(pm.id) not in assigned_ids:
                assigned_ids.append(str(pm.id))

        if hasattr(data, "setlist"):
            data.setlist("assigned_models", assigned_ids)
        else:
            data["assigned_models"] = assigned_ids

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=201)

class FabricHistoryAPIView(views.APIView):
    permission_classes = [AllowAny]
    """
    API orqali partiya bo'yicha tarixni (sana, kg, model, brak) qaytaruvchi
    GET /api/inventory/fabric-history/?batch=XYZ
    """
    def get(self, request):
        batch = request.query_params.get("batch")
        if not batch:
            return Response({"error": "batch is required"}, status=400)
            
        fabric = FabricInventory.objects.filter(batch_number=batch).first()
        if not fabric:
            return Response({"error": "Fabric topilmadi"}, status=404)
            
        bichuv_history = Bichuv.objects.filter(batch_number=batch).select_related('product_model').order_by('-cut_date')
        
        history_list = []
        for b in bichuv_history:
            history_list.append({
                "date": b.cut_date,
                "kg": b.weight_kg,
                "model": b.product_model.name if b.product_model else None,
                "defect_count": b.defect_count,
            })
            
        return Response({
            "batch_number": fabric.batch_number,
            "total_kg": fabric.total_kg,
            "waste_kg": fabric.waste_kg,
            "available_kg": fabric.available_kg,
            "history": history_list
        })


class StockAlertsAPIView(views.APIView):
    permission_classes = [AllowAny]
    """
    Sklad bo'yicha zaxira ogohlantirishlari. 
    minimal chegaradan kam qolgan partiyalarni qaytaradi.
    GET /api/inventory/alerts/
    """
    def get(self, request):
        alerts = []
        fabrics = FabricInventory.objects.prefetch_related('assigned_models')
        for fabric in fabrics:
            available = fabric.available_kg
            for pm in fabric.assigned_models.all():
                threshold = StockThreshold.objects.filter(product_model=pm).first()
                if threshold and available < threshold.min_kg:
                    alerts.append({
                        "id": f"{fabric.id}-{pm.id}",
                        "batch_number": fabric.batch_number,
                        "model": pm.name,
                        "available_kg": available,
                        "min_kg": threshold.min_kg,
                        "material_type": threshold.material_type,
                        "alert_message": f"Zaxira kam! {available} kg qoldi (Min: {threshold.min_kg} kg)."
                    })
        return Response(alerts)


class SupplierAnalyticsAPIView(views.APIView):
    permission_classes = [AllowAny]
    """
    To'quvchi va Bo'yoqchi bo'yicha isrof tahlili.
    GET /api/inventory/supplier-analytics/
    """
    def get(self, request):
        weavers = FabricInventory.objects.values('supplier_weaver').annotate(
            t_kg=Sum('total_kg'),
            w_kg=Sum('waste_kg')
        )
        
        weavers_data = []
        for w in weavers:
            t = float(w['t_kg'] or 0)
            waste = float(w['w_kg'] or 0)
            eff = round(((t - waste) / t * 100), 2) if t > 0 else 100
            weavers_data.append({
                "supplier": w['supplier_weaver'],
                "type": "Weaver",
                "total_kg": t,
                "waste_kg": waste,
                "efficiency": eff
            })
            
        dyers = FabricInventory.objects.values('supplier_dyer').annotate(
            t_kg=Sum('total_kg'),
            w_kg=Sum('waste_kg')
        )
        
        dyers_data = []
        for d in dyers:
            t = float(d['t_kg'] or 0)
            waste = float(d['w_kg'] or 0)
            eff = round(((t - waste) / t * 100), 2) if t > 0 else 100
            dyers_data.append({
                "supplier": d['supplier_dyer'],
                "type": "Dyer",
                "total_kg": t,
                "waste_kg": waste,
                "efficiency": eff
            })
            
        return Response({
            "weavers": sorted(weavers_data, key=lambda x: x['efficiency']), 
            "dyers": sorted(dyers_data, key=lambda x: x['efficiency'])
        })


# ── BichuvKirim ──────────────────────────────────────────────
class BichuvKirimViewSet(viewsets.ModelViewSet):
    """
    Skladdan Bichuvga kirim.
    POST /api/inventory/bichuv-kirim/  — yangi kirim (yoki batch)
    GET  /api/inventory/bichuv-kirim/  — ro'yxat
    """
    queryset = BichuvKirim.objects.select_related(
        "fabric", "product_model"
    ).order_by("-created_at")
    serializer_class = BichuvKirimSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"], url_path="batch-create")
    @transaction.atomic
    def batch_create(self, request):
        """
        Bir nechta kirimlarni bitta so'rovda saqlash.
        Body: { "items": [ { fabric, product_model, weight_kg, roll_count }, ... ] }
        """
        items = request.data.get("items", [])
        if not items:
            return Response(
                {"error": "items ro'yxati bo'sh bo'lmasligi kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = []
        for item_data in items:
            serializer = self.get_serializer(data=item_data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            created.append(serializer.data)

        return Response(
            {"success": True, "count": len(created), "items": created},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="available-for-chiqim")
    def available_for_chiqim(self, request):
        """
        BichuvKirimda kirim qilingan partiya va modellarni qaytaradi.
        Chiqim formasida faqat kirim bo'lganlarni ko'rsatish uchun.
        GET /api/inventory/bichuv-kirim/available-for-chiqim/
        Response: [
          {
            "fabric_id": 1,
            "batch_number": "2309",
            "total_kg": 500,
            "total_rolls": 10,
            "models": [
              {"id": 1, "name": "M-34", "kirim_kg": 300, "kirim_rolls": 5},
              ...
            ]
          }, ...
        ]
        """
        from django.db.models import F
        from production.serializers import ProductModelSerializer

        # Barcha kirim yozuvlari
        kirim_qs = BichuvKirim.objects.select_related("fabric", "product_model").order_by("-created_at")

        # Fabric bo'yicha guruhlash
        fabric_map = {}
        for k in kirim_qs:
            fid = k.fabric_id
            if fid not in fabric_map:
                fabric_map[fid] = {
                    "fabric_id": fid,
                    "batch_number": k.fabric.batch_number if k.fabric else "",
                    "supplier_weaver": k.fabric.supplier_weaver if k.fabric else "",
                    "total_kg": 0,
                    "total_rolls": 0,
                    "models": {},
                }
            entry = fabric_map[fid]
            entry["total_kg"] += k.weight_kg
            entry["total_rolls"] += k.roll_count

            mid = k.product_model_id
            if mid not in entry["models"]:
                entry["models"][mid] = {
                    "id": mid,
                    "name": k.product_model.name if k.product_model else "",
                    "kirim_kg": 0,
                    "kirim_rolls": 0,
                }
            entry["models"][mid]["kirim_kg"] += k.weight_kg
            entry["models"][mid]["kirim_rolls"] += k.roll_count

        # Dict → list
        result = []
        for fid, entry in fabric_map.items():
            entry["models"] = list(entry["models"].values())
            result.append(entry)

        return Response(result)


# ── BichuvChiqim ─────────────────────────────────────────────
class BichuvChiqimViewSet(viewsets.ModelViewSet):
    """
    Bichuvdan tikuvga chiqim.
    POST /api/inventory/bichuv-chiqim/  — yangi chiqim
    GET  /api/inventory/bichuv-chiqim/  — ro'yxat
    """
    queryset = BichuvChiqim.objects.select_related(
        "fabric", "product_model"
    ).order_by("-created_at")
    serializer_class = BichuvChiqimSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        """kesim_number ni avtomatik hisoblash."""
        data = request.data.copy()
        fabric_id = data.get("fabric")
        model_id = data.get("product_model")

        if not data.get("kesim_number") and fabric_id and model_id:
            last = BichuvChiqim.objects.filter(
                fabric_id=fabric_id,
                product_model_id=model_id,
            ).order_by("-kesim_number").first()
            data["kesim_number"] = (last.kesim_number + 1) if last else 1

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="next-kesim")
    def next_kesim(self, request):
        """
        GET /api/inventory/bichuv-chiqim/next-kesim/?fabric=1&product_model=2
        → { "next_kesim": 3 }
        """
        fabric_id = request.query_params.get("fabric")
        model_id = request.query_params.get("product_model")
        if not fabric_id or not model_id:
            return Response({"error": "fabric va product_model kerak"}, status=400)

        last = BichuvChiqim.objects.filter(
            fabric_id=fabric_id,
            product_model_id=model_id,
        ).order_by("-kesim_number").first()
        next_num = (last.kesim_number + 1) if last else 1
        return Response({"next_kesim": next_num})


class FabricModelsAPIView(views.APIView):
    permission_classes = [AllowAny]
    """
    Partiya (fabric) ga biriktirilgan modellar ro'yxatini qaytaradi.
    GET /api/inventory/fabric-models/?fabric=1
    """
    def get(self, request):
        fabric_id = request.query_params.get("fabric")
        if not fabric_id:
            return Response({"error": "fabric parametri kerak"}, status=400)
        try:
            fabric = FabricInventory.objects.get(pk=fabric_id)
        except FabricInventory.DoesNotExist:
            return Response({"error": "Partiya topilmadi"}, status=404)

        from production.serializers import ProductModelSerializer
        models = fabric.assigned_models.all()
        serializer = ProductModelSerializer(models, many=True)
        return Response(serializer.data)
