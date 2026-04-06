from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login, logout
from django.db.models import Sum
from django.utils import timezone
import datetime
from django.http import HttpResponse

from .models import Worker, AdvancePayment, SalaryPayment
from .serializers import WorkerSerializer, WorkerLookupSerializer, AdvancePaymentSerializer
from production.models import WorkLog


class WorkerViewSet(viewsets.ModelViewSet):
    """
    Worker CRUD API.

    GET    /api/workers/                    — ro'yxat
    POST   /api/workers/                    — yangi ishchi (code avtomatik)
    GET    /api/workers/{id}/               — bitta ishchi
    PUT    /api/workers/{id}/               — to'liq tahrirlash
    PATCH  /api/workers/{id}/               — qisman tahrirlash
    DELETE /api/workers/{id}/               — o'chirish
    POST   /api/workers/{id}/toggle-active/ — faollik holatini almashtirish
    GET    /api/workers/lookup/?code=W-001  — faqat aktiv ishchi qidirish
    """
    queryset = Worker.objects.all()
    serializer_class = WorkerSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Filter by is_active
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")
        # Filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        # Filter by role
        role_filter = self.request.query_params.get("role")
        if role_filter:
            qs = qs.filter(role=role_filter)
        # Search by name or code
        search = self.request.query_params.get("search")
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(code__icontains=search)
            )
        return qs

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        """
        Ishchi faollik holatini almashtiradi (True ↔ False).
        POST /api/workers/{id}/toggle-active/
        """
        worker = self.get_object()
        worker.is_active = not worker.is_active
        worker.save(update_fields=["is_active"])
        return Response({
            "id": worker.id,
            "code": worker.code,
            "full_name": worker.full_name,
            "is_active": worker.is_active,
        })

    @action(detail=False, methods=["get"], url_path="lookup")
    def lookup(self, request):
        """
        Worker Code bo'yicha FISH qidirish — FAQAT aktiv ishchilar.
        GET /api/workers/lookup/?code=W-001
        """
        code = request.query_params.get("code", "").strip()
        if not code:
            return Response(
                {"detail": "code parametri kerak"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            worker = Worker.objects.get(code__iexact=code, is_active=True)
        except Worker.DoesNotExist:
            return Response(
                {"detail": "Faol ishchi topilmadi"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = WorkerLookupSerializer(worker)
        return Response(serializer.data)


class AdvancePaymentViewSet(viewsets.ModelViewSet):
    queryset = AdvancePayment.objects.all().order_by("-created_at")
    serializer_class = AdvancePaymentSerializer


def calculate_worker_payroll(worker, month, year):
    # Bir oylik intervalni yopiq oraliq sifatida aniqlaymiz
    first_day = datetime.date(year, month, 1)
    if month == 12:
        last_day = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
    else:
        last_day = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)

    # Hisob stoli
    total_work = WorkLog.objects.filter(
        worker=worker, work_date__gte=first_day, work_date__lte=last_day
    ).aggregate(s=Sum('total_sum'))['s'] or 0

    total_advance = AdvancePayment.objects.filter(
        worker=worker, date__gte=first_day, date__lte=last_day
    ).aggregate(s=Sum('amount'))['s'] or 0

    return {
        "total_work": float(total_work),
        "total_advance": float(total_advance),
        "net_salary": float(total_work - total_advance)
    }

class PayrollAPIView(APIView):

    def get(self, request):
        month = int(request.query_params.get("month", timezone.now().month))
        year = int(request.query_params.get("year", timezone.now().year))
        
        workers = Worker.objects.all()
        data = []

        for w in workers:
            closed_payment = SalaryPayment.objects.filter(worker=w, month=month, year=year).first()
            if closed_payment:
                data.append({
                    "worker_id": w.id,
                    "worker_name": w.full_name,
                    "worker_code": w.code,
                    "total_work": closed_payment.total_work_sum,
                    "total_advance": closed_payment.total_advance_sum,
                    "net_salary": closed_payment.net_salary,
                    "status": "Paid" if closed_payment.is_paid else "Closed"
                })
            else:
                pay_data = calculate_worker_payroll(w, month, year)
                data.append({
                    "worker_id": w.id,
                    "worker_name": w.full_name,
                    "worker_code": w.code,
                    "total_work": pay_data["total_work"],
                    "total_advance": pay_data["total_advance"],
                    "net_salary": pay_data["net_salary"],
                    "status": "Open"
                })

        return Response(data)

class PaySalaryAPIView(APIView):

    def post(self, request):
        worker_id = request.data.get("worker_id")
        month = int(request.data.get("month"))
        year = int(request.data.get("year"))

        worker = Worker.objects.filter(id=worker_id).first()
        if not worker:
            return Response({"error": "Worker not found"}, status=status.HTTP_404_NOT_FOUND)

        payment = SalaryPayment.objects.filter(worker=worker, month=month, year=year).first()
        if payment:
            return Response({"error": "Already closed/paid"}, status=status.HTTP_400_BAD_REQUEST)

        pay_data = calculate_worker_payroll(worker, month, year)
        
        sp = SalaryPayment.objects.create(
            worker=worker, month=month, year=year,
            total_work_sum=pay_data["total_work"],
            total_advance_sum=pay_data["total_advance"],
            net_salary=pay_data["net_salary"],
            is_paid=True
        )
        return Response({"message": "Tolov muvaffaqiyatli amalga oshdi va Oylik yopildi!"})

class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")
        if not username or not password:
            return Response({"error": "Login va parol kiritilishi shart."}, status=status.HTTP_400_BAD_REQUEST)
        user = authenticate(request, username=username, password=password)
        if not user:
            return Response({"error": "Noto'g'ri login yoki parol."}, status=status.HTTP_401_UNAUTHORIZED)
        login(request, user)
        from django.middleware.csrf import get_token
        csrf_token = get_token(request)
        response = Response({
            "id": user.id,
            "username": user.username,
            "full_name": user.get_full_name() or user.username,
            "role": user.role.upper(),
        })
        response.set_cookie("csrftoken", csrf_token, samesite="Lax")
        return response


class LogoutAPIView(APIView):
    def post(self, request):
        logout(request)
        return Response({"message": "Tizimdan chiqildi."})


class MeAPIView(APIView):
    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "full_name": user.get_full_name() or user.username,
            "role": user.role.upper(),
        })


class ExportPayrollExcelAPIView(APIView):

    def get(self, request):
        import openpyxl
        month = int(request.query_params.get("month", timezone.now().month))
        year = int(request.query_params.get("year", timezone.now().year))

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"Payroll {month}-{year}"

        headers = ["Ishchi Kodi", "F.I.Sh.", "Jami Ish (UZS)", "Avans (UZS)", "Sof Oylik Qoldiq", "Holat"]
        ws.append(headers)

        workers = Worker.objects.all()
        for w in workers:
            closed_payment = SalaryPayment.objects.filter(worker=w, month=month, year=year).first()
            if closed_payment:
                ws.append([
                    w.code, w.full_name, float(closed_payment.total_work_sum), float(closed_payment.total_advance_sum),
                    float(closed_payment.net_salary), "Yopilgan/To'langan" if closed_payment.is_paid else "Hisoblangan"
                ])
            else:
                pd = calculate_worker_payroll(w, month, year)
                ws.append([
                    w.code, w.full_name, pd["total_work"], pd["total_advance"],
                    pd["net_salary"], "Ochiq (To'lanmagan)"
                ])

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename=Payroll_{year}_{month}.xlsx'
        wb.save(response)
        return response

