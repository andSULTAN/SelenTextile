from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WorkerViewSet, AdvancePaymentViewSet,
    PayrollAPIView, PaySalaryAPIView, ExportPayrollExcelAPIView,
    LoginAPIView, LogoutAPIView, MeAPIView,
    UserManagementViewSet, PermissionChoicesAPIView,
    PinLoginView,
)

router = DefaultRouter()
router.register(r"workers", WorkerViewSet, basename="worker")
router.register(r"advances", AdvancePaymentViewSet, basename="advance")
router.register(r"users", UserManagementViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
    path("payroll/", PayrollAPIView.as_view(), name="payroll_list"),
    path("pay-salary/", PaySalaryAPIView.as_view(), name="pay_salary"),
    path("export-payroll/", ExportPayrollExcelAPIView.as_view(), name="export_payroll"),
    path("auth/login/", LoginAPIView.as_view(), name="auth_login"),
    path("auth/logout/", LogoutAPIView.as_view(), name="auth_logout"),
    path("auth/me/", MeAPIView.as_view(), name="auth_me"),
    path("permissions/", PermissionChoicesAPIView.as_view(), name="permissions_list"),
    path("touch/pin-login/", PinLoginView.as_view(), name="touch_pin_login"),
]
