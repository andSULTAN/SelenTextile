from django.urls import path
from .views import DashboardStatsAPIView, ReportExcelAPIView, WorkerPdfSlipAPIView

urlpatterns = [
    path("stats/", DashboardStatsAPIView.as_view(), name="report-stats"),
    path("excel/", ReportExcelAPIView.as_view(), name="report-excel"),
    path("pdf-slip/", WorkerPdfSlipAPIView.as_view(), name="report-pdf"),
]
