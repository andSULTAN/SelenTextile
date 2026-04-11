"""
Production app models.
ProductModel — Mahsulot modeli (tikuv modeli).
WorkType     — Ish turi va narxi.
WorkLog      — Ishchi bajargan ish logi (narx snapshot bilan).
"""

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from datetime import timedelta
from accounts.models import Worker, CustomUser, AuditLog


# ──────────────────────────────────────────────
# Product Model (Mahsulot modeli)
# ──────────────────────────────────────────────
class ProductModel(models.Model):
    """
    Tikuv mahsulotining modeli.
    Masalan: "Futbolka FK-101", "Shim SH-200".
    """

    class Status(models.TextChoices):
        ACTIVE   = "active",   _("Faol")
        INACTIVE = "inactive", _("Nofaol")

    name = models.CharField(
        _("model nomi"),
        max_length=200,
        unique=True,
    )
    code = models.CharField(
        _("model kodi"),
        max_length=50,
        unique=True,
        blank=True,
        help_text=_("Ichki kod / artikul"),
    )
    description = models.TextField(
        _("tavsif"),
        blank=True,
    )
    status = models.CharField(
        _("holat"),
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    image = models.ImageField(
        _("rasm"),
        upload_to="products/%Y/%m/",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(_("yaratilgan vaqt"), auto_now_add=True)
    updated_at = models.DateTimeField(_("yangilangan vaqt"), auto_now=True)

    class Meta:
        verbose_name = _("Mahsulot modeli")
        verbose_name_plural = _("Mahsulot modellari")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


class ProductModelImage(models.Model):
    product_model = models.ForeignKey(ProductModel, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(_("rasm"), upload_to="products/%Y/%m/")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Model rasmi")
        verbose_name_plural = _("Model rasmlari")
        ordering = ['created_at']

    def __str__(self):
        return f"{self.product_model.name} rasmi"


# ──────────────────────────────────────────────
# Work Type (Ish turi)
# ──────────────────────────────────────────────
class WorkType(models.Model):
    """
    Bajarilishi mumkin bo'lgan ish turi va uning joriy narxi.
    Masalan: "Tikish - 5000 so'm", "Dazmollash - 2000 so'm".
    """

    name = models.CharField(
        _("ish turi nomi"),
        max_length=200,
    )
    product_model = models.ForeignKey(
        ProductModel,
        on_delete=models.CASCADE,
        related_name="work_types",
        verbose_name=_("mahsulot modeli"),
        help_text=_("Qaysi mahsulot modeliga tegishli"),
    )
    price = models.DecimalField(
        _("narx (so'm)"),
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text=_("Joriy birlik narxi"),
    )

    created_at = models.DateTimeField(_("yaratilgan vaqt"), auto_now_add=True)
    updated_at = models.DateTimeField(_("yangilangan vaqt"), auto_now=True)

    class Meta:
        verbose_name = _("Ish turi")
        verbose_name_plural = _("Ish turlari")
        ordering = ["product_model", "name"]
        unique_together = [("product_model", "name")]

    def __str__(self):
        return f"{self.product_model.name} → {self.name} ({self.price} so'm)"


# ──────────────────────────────────────────────
# Work Log (Ish jurnali)
# ──────────────────────────────────────────────
class WorkLog(models.Model):
    """
    Ishchi bajargan ish qayd etiladi.
    - `price_snapshot` — ish kiritilgan paytdagi narx (tarixiy).
    - `total_sum`      — quantity × price_snapshot (hisoblangan).
    - `manager`        — kim kiritgan.
    """

    worker = models.ForeignKey(
        Worker,
        on_delete=models.PROTECT,
        related_name="work_logs",
        verbose_name=_("ishchi"),
    )
    work_type = models.ForeignKey(
        WorkType,
        on_delete=models.PROTECT,
        related_name="work_logs",
        verbose_name=_("ish turi"),
    )
    quantity = models.PositiveIntegerField(
        _("ish soni"),
        validators=[MinValueValidator(1)],
    )
    price_snapshot = models.DecimalField(
        _("narx (snapshot)"),
        max_digits=12,
        decimal_places=2,
        help_text=_("Ish kiritilgan paytdagi birlik narxi"),
    )
    total_sum = models.DecimalField(
        _("jami summa"),
        max_digits=15,
        decimal_places=2,
        editable=False,
        help_text=_("quantity × price_snapshot — avtomatik hisoblanadi"),
    )
    work_date = models.DateField(
        _("ish sanasi"),
        help_text=_("Ish bajarilgan sana"),
    )
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="managed_work_logs",
        verbose_name=_("manager"),
        limit_choices_to={"role__in": ["admin", "manager"]},
        help_text=_("Ishni kiritgan manager"),
    )
    note = models.TextField(
        _("izoh"),
        blank=True,
    )

    created_at = models.DateTimeField(_("yaratilgan vaqt"), auto_now_add=True)
    updated_at = models.DateTimeField(_("yangilangan vaqt"), auto_now=True)

    class Meta:
        verbose_name = _("Ish jurnali")
        verbose_name_plural = _("Ish jurnallari")
        ordering = ["-work_date", "-created_at"]
        indexes = [
            models.Index(fields=["worker", "work_date"]),
            models.Index(fields=["work_type", "work_date"]),
            models.Index(fields=["manager", "work_date"]),
        ]

    def clean(self):
        super().clean()
        # Delete / Update Restriction (30 daqiqa qoidasi)
        if self.pk:
            # Demak yangi emas, Tahrirlanmoqda
            time_diff = timezone.now() - self.created_at
            if time_diff > timedelta(minutes=30):
                # Faqat Adminlargina 30 daqiqadan keyin tahrirlashi mumkin.
                # Model ichida user requestni olish qiyinroq, bu qoida viewlarda ham tasdiqlanishi kerak.
                # Agar menejer tarafdan kelib tushsa, ValidationError tashlaymiz
                # Biroq bu hozirgi kontekstda baribir blok qo'yadi.
                pass

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_val = None
        if not is_new:
            old_obj = WorkLog.objects.get(pk=self.pk)
            old_val = {'qty': old_obj.quantity, 'sum': str(old_obj.total_sum)}
            
            # Qo'shimcha tekshiruv: agar API dan 'admin' ekanligini bildirmasa
            time_diff = timezone.now() - old_obj.created_at
            if time_diff > timedelta(minutes=30):
                # Odatda View da request.user.role == 'ADMIN' tekshiriladi
                pass

        if not self.price_snapshot:
            self.price_snapshot = self.work_type.price

        self.total_sum = self.quantity * self.price_snapshot
        
        super().save(*args, **kwargs)

        # Audit yozamiz
        action_type = "CREATE" if is_new else "UPDATE"
        new_val = {'qty': self.quantity, 'sum': str(self.total_sum)}
        AuditLog.objects.create(
            model_name="WorkLog",
            record_id=self.pk,
            action=action_type,
            old_values=old_val,
            new_values=new_val,
            user=self.manager
        )

    def delete(self, *args, **kwargs):
        old_val = {'qty': self.quantity, 'sum': str(self.total_sum)}
        AuditLog.objects.create(
            model_name="WorkLog",
            record_id=self.pk,
            action="DELETE",
            old_values=old_val,
            new_values=None,
            user=self.manager
        )
        super().delete(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.worker.full_name} | {self.work_type.name} "
            f"× {self.quantity} = {self.total_sum} so'm"
        )
