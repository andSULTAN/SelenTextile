from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Sum, Count
import datetime

# Models
from production.models import WorkLog
from inventory.models import Upakovka
from accounts.models import Worker, SalaryPayment

class DashboardStatsAPIView(APIView):
    """
    Recharts uchun oxirgi 7 kunlik statistika.
    Qaytaradi: { date, volume, defect_pct }
    """

    def get(self, request):
        today = timezone.localdate()
        stats = []

        for i in range(6, -1, -1):
            target_date = today - datetime.timedelta(days=i)
            # Volume dan (WorkLog)
            volume_sum = WorkLog.objects.filter(work_date=target_date).aggregate(s=Sum("quantity"))["s"] or 0
            
            # Brak (Upakovka)
            pack_agg = Upakovka.objects.filter(pack_date=target_date).aggregate(q=Sum("quantity"), d=Sum("defect_count"))
            q = pack_agg["q"] or 0
            d = pack_agg["d"] or 0
            total_packs = q + d
            defect_pct = round((d / total_packs) * 100, 1) if total_packs > 0 else 0

            stats.append({
                "date": target_date.strftime("%d-%b"),
                "volume": volume_sum,
                "defect_pct": defect_pct
            })

        return Response(stats)


class ReportExcelAPIView(APIView):
    """
    Barcha ishchilar oylik ko'rsatkichlari, yoki barcha jurnallarni Excelga chiqarish.
    (Hozir sodda yondashuvda qilingan oylik umumiy hisobot)
    """

    def get(self, request):
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Ishlab Chiqarish Hisoboti"

        headers = ["Ishchi Kodi", "F.I.Sh", "Jami Bajargan Ish Soni", "Jami Summa"]
        ws.append(headers)

        workers = Worker.objects.all()
        for w in workers:
            wlog = WorkLog.objects.filter(worker=w).aggregate(qty=Sum('quantity'), sm=Sum('total_sum'))
            ws.append([
                w.code, 
                w.full_name, 
                wlog['qty'] or 0, 
                float(wlog['sm'] or 0)
            ])

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = "attachment; filename=General_Report.xlsx"
        wb.save(response)
        return response


class WorkerPdfSlipAPIView(APIView):
    """
    Bitta ishchiga maxsus "Oylik hisob-kitob varaqasi" (PDF).
    """

    def get(self, request):
        worker_id = request.query_params.get("worker_id")
        if not worker_id:
            return HttpResponse("worker_id is required", status=400)

        worker = Worker.objects.filter(id=worker_id).first()
        if not worker:
            return HttpResponse("Worker not found", status=404)

        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A5
        import io

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=A5)
        width, height = A5

        p.setFont("Helvetica-Bold", 16)
        p.drawString(40, height - 50, "OYLIK HISOB-KITOB VARAQASI (SLIP)")
        
        p.setFont("Helvetica", 12)
        p.drawString(40, height - 90, f"Ishxona: Selen Textile (ERP)")
        p.drawString(40, height - 110, f"Sana: {timezone.localdate().strftime('%d.%m.%Y')}")
        
        p.line(40, height - 130, width - 40, height - 130)

        p.setFont("Helvetica-Bold", 14)
        p.drawString(40, height - 160, f"Xodim: {worker.full_name}")
        p.drawString(40, height - 180, f"ID Kod: {worker.code}")

        # Basic Stats calculation
        from accounts.models import AdvancePayment
        wlog = WorkLog.objects.filter(worker=worker).aggregate(sm=Sum('total_sum'))['sm'] or 0
        advances = AdvancePayment.objects.filter(worker=worker).aggregate(am=Sum('amount'))['am'] or 0
        net = float(wlog) - float(advances)

        p.setFont("Helvetica", 12)
        p.drawString(40, height - 220, f"Jami Ishlagan summasi: {float(wlog):,.2f} UZS")
        p.drawString(40, height - 240, f"Olingan Bo'nak (Avans): {float(advances):,.2f} UZS")
        
        p.line(40, height - 260, width - 40, height - 260)
        
        p.setFont("Helvetica-Bold", 16)
        p.drawString(40, height - 290, f"SOF QOLDIQ (QO'LGA TYEGADI): {net:,.2f} UZS")

        p.setFont("Helvetica-Oblique", 10)
        p.drawString(40, height - 340, "Imzo qismi: _____________")
        
        p.showPage()
        p.save()

        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{worker.code}_Slip.pdf"'
        return response
