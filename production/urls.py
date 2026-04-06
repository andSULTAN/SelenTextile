from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductModelViewSet, WorkTypeViewSet, WorkLogViewSet

router = DefaultRouter()
router.register(r"products", ProductModelViewSet, basename="product")
router.register(r"work-types", WorkTypeViewSet, basename="work-type")
router.register(r"work-logs", WorkLogViewSet, basename="work-log")

urlpatterns = [
    path("", include(router.urls)),
]
