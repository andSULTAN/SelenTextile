from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SkladViewSet, BichuvViewSet, UpakovkaViewSet, BatchHistoryAPIView, BatchChainAnalysisAPIView

router = DefaultRouter()
router.register(r'sklad', SkladViewSet, basename='sklad')
router.register(r'bichuv', BichuvViewSet, basename='bichuv')
router.register(r'upakovka', UpakovkaViewSet, basename='upakovka')

urlpatterns = [
    path('', include(router.urls)),
    path('batch-history/', BatchHistoryAPIView.as_view(), name='batch-history'),
    path('chain-analysis/', BatchChainAnalysisAPIView.as_view(), name='chain-analysis'),
]
