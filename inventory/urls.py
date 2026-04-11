from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SkladViewSet, BichuvViewSet, UpakovkaViewSet,
    FabricInventoryViewSet, BrakLogViewSet,
    BichuvKirimViewSet, BichuvChiqimViewSet,
    BatchHistoryAPIView, BatchChainAnalysisAPIView, FabricHistoryAPIView,
    StockAlertsAPIView, SupplierAnalyticsAPIView, FabricModelsAPIView,
)

router = DefaultRouter()
router.register(r'sklad', SkladViewSet, basename='sklad')
router.register(r'bichuv', BichuvViewSet, basename='bichuv')
router.register(r'upakovka', UpakovkaViewSet, basename='upakovka')
router.register(r'fabric', FabricInventoryViewSet, basename='fabric')
router.register(r'brak', BrakLogViewSet, basename='brak')
router.register(r'bichuv-kirim', BichuvKirimViewSet, basename='bichuv-kirim')
router.register(r'bichuv-chiqim', BichuvChiqimViewSet, basename='bichuv-chiqim')

urlpatterns = [
    path('', include(router.urls)),
    path('batch-history/', BatchHistoryAPIView.as_view(), name='batch-history'),
    path('chain-analysis/', BatchChainAnalysisAPIView.as_view(), name='chain-analysis'),
    path('fabric-history/', FabricHistoryAPIView.as_view(), name='fabric-history'),
    path('alerts/', StockAlertsAPIView.as_view(), name='alerts'),
    path('supplier-analytics/', SupplierAnalyticsAPIView.as_view(), name='supplier-analytics'),
    path('fabric-models/', FabricModelsAPIView.as_view(), name='fabric-models'),
]
