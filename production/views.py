from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, F
from django.utils import timezone
import datetime

from .models import ProductModel, WorkType, WorkLog
from .serializers import (
    ProductModelSerializer,
    ProductModelListSerializer,
    WorkTypeSerializer,
    WorkLogSerializer,
    WorkLogCreateSerializer,
)


class ProductModelViewSet(viewsets.ModelViewSet):
    """
    ProductModel CRUD.
    GET /api/products/          — barcha modellar (work_types bilan)
    GET /api/products/?list=1   — yengil ro'yxat (select uchun)
    """
    queryset = ProductModel.objects.prefetch_related("work_types").all()

    def get_serializer_class(self):
        if self.request.query_params.get("list"):
            return ProductModelListSerializer
        return ProductModelSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class WorkTypeViewSet(viewsets.ModelViewSet):
    """
    WorkType CRUD.
    GET /api/work-types/?product_model=1  — model bo'yicha filtrlash
    """
    queryset = WorkType.objects.select_related("product_model").all()
    serializer_class = WorkTypeSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        product_model_id = self.request.query_params.get("product_model")
        if product_model_id:
            qs = qs.filter(product_model_id=product_model_id)
        return qs


class WorkLogViewSet(viewsets.ModelViewSet):
    """
    WorkLog CRUD API.

    GET    /api/work-logs/       — ro'yxat
    POST   /api/work-logs/       — yangi ish kiritish
    GET    /api/work-logs/{id}/  — bitta yozuv
    PUT    /api/work-logs/{id}/  — tahrirlash
    DELETE /api/work-logs/{id}/  — o'chirish
    """
    queryset = WorkLog.objects.select_related(
        "worker", "work_type", "work_type__product_model", "manager"
    ).all()

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return WorkLogCreateSerializer
        return WorkLogSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        # Saqlangan obyektni to'liq ma'lumot bilan qaytarish
        output = WorkLogSerializer(instance)
        return Response(output.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        qs = super().get_queryset()
        # Filter by worker
        worker_id = self.request.query_params.get("worker")
        if worker_id:
            qs = qs.filter(worker_id=worker_id)
        # Filter by date
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(work_date=date)
        # Filter by product model
        product_model_id = self.request.query_params.get("product_model")
        if product_model_id:
            qs = qs.filter(work_type__product_model_id=product_model_id)
        return qs

    @action(detail=False, methods=["get"], url_path="tv-dashboard")
    def tv_dashboard(self, request):
        """
        TV uchun real-time statistika: Bugungi TOP 10, Oylik TOP 10, va umumiy daromadlar.
        """
        today = timezone.localtime().date()
        first_day_of_month = today.replace(day=1)

        # 1. Bugungi TOP 10 ishchilar (jami summa bo'yicha)
        today_logs = WorkLog.objects.filter(work_date=today)
        top_today = (
            today_logs.values("worker__id", "worker__first_name", "worker__last_name", "worker__photo")
            .annotate(total_earned=Sum("total_sum"), total_items=Sum("quantity"))
            .order_by("-total_earned")[:10]
        )

        today_workers = []
        for rank, w in enumerate(top_today, start=1):
            name = f"{w['worker__last_name']} {w['worker__first_name']}"
            today_workers.append({
                "rank": rank,
                "id": w["worker__id"],
                "name": name,
                "photo": w["worker__photo"] if w.get("worker__photo") else None,
                "amount": float(w["total_earned"] or 0),
                "items": w["total_items"] or 0,
            })

        # 2. Oylik TOP 10 ishchilar
        month_logs = WorkLog.objects.filter(work_date__gte=first_day_of_month, work_date__lte=today)
        top_month = (
            month_logs.values("worker__id", "worker__first_name", "worker__last_name", "worker__photo")
            .annotate(total_earned=Sum("total_sum"), total_items=Sum("quantity"))
            .order_by("-total_earned")[:10]
        )

        month_workers = []
        for rank, w in enumerate(top_month, start=1):
            name = f"{w['worker__last_name']} {w['worker__first_name']}"
            month_workers.append({
                "rank": rank,
                "id": w["worker__id"],
                "name": name,
                "photo": w["worker__photo"] if w.get("worker__photo") else None,
                "amount": float(w["total_earned"] or 0),
                "items": w["total_items"] or 0,
            })

        # 3. Umumiy ko'rsatkichlar
        today_total = today_logs.aggregate(s=Sum("total_sum"))["s"] or 0
        month_total = month_logs.aggregate(s=Sum("total_sum"))["s"] or 0
        active_workers_today = today_logs.values("worker").distinct().count()

        # 4. Brak (Defect) foizi
        from inventory.models import Upakovka
        upakovka_stats = Upakovka.objects.filter(pack_date=today).aggregate(
            q=Sum("quantity"), d=Sum("defect_count")
        )
        q = upakovka_stats["q"] or 0
        d = upakovka_stats["d"] or 0
        total_p = q + d
        defect_percentage = round((d / total_p) * 100, 1) if total_p > 0 else 0

        return Response({
            "stats": {
                "today_total": float(today_total),
                "month_total": float(month_total),
                "active_workers_today": active_workers_today,
                "defect_percentage": defect_percentage,
            },
            "top_today": today_workers,
            "top_month": month_workers,
        })

