"""
Accounts app models.
CustomUser — Role-based foydalanuvchi modeli (Admin, Manager, TV).
Worker    — Ishchi profili: FISH, unique code, holat.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Sum
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


# ──────────────────────────────────────────────
# Custom User
# ──────────────────────────────────────────────
class CustomUser(AbstractUser):
    """
    Role-based foydalanuvchi.
    Django default User dan farqi: role maydoni qo'shilgan.
    """

    class Role(models.TextChoices):
        ADMIN   = "admin",   _("Admin")
        MANAGER = "manager", _("Manager")
        TV      = "tv",      _("TV (Monitor)")

    role = models.CharField(
        _("role"),
        max_length=10,
        choices=Role.choices,
        default=Role.MANAGER,
    )

    # Profil ma'lumotlari
    phone = models.CharField(
        _("telefon raqami"),
        max_length=20,
        blank=True,
    )

    created_at = models.DateTimeField(_("yaratilgan vaqt"), auto_now_add=True)
    updated_at = models.DateTimeField(_("yangilangan vaqt"), auto_now=True)

    class Meta:
        verbose_name = _("Foydalanuvchi")
        verbose_name_plural = _("Foydalanuvchilar")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"


# ──────────────────────────────────────────────
# Worker (Ishchi)
# ──────────────────────────────────────────────
class Worker(models.Model):
    """
    Ishlab chiqarish ishchisi.
    FISH = Familiya, Ism, Sharif, Huquqiy (to'liq ism).
    """

    class Status(models.TextChoices):
        ACTIVE   = "active",   _("Faol")
        INACTIVE = "inactive", _("Nofaol")
        ON_LEAVE = "on_leave", _("Ta'tilda")

    class Role(models.TextChoices):
        TIKUVCHI   = "tikuvchi",   _("Tikuvchi")
        BICHUVCHI  = "bichuvchi",  _("Bichuvchi")
        QADOQCHI   = "qadoqchi",   _("Qadoqchi")
        DAZMOLCHI  = "dazmolchi",  _("Dazmolchi")
        BOSHQA     = "boshqa",     _("Boshqa")

    first_name  = models.CharField(_("ism"), max_length=100)
    last_name   = models.CharField(_("familiya"), max_length=100)
    middle_name = models.CharField(_("sharif"), max_length=100, blank=True)

    code = models.CharField(
        _("ishchi kodi"),
        max_length=20,
        unique=True,
        db_index=True,
        help_text=_("Ishchi uchun unikal identifikatsiya kodi"),
    )

    phone = models.CharField(_("telefon"), max_length=20, blank=True)

    role = models.CharField(
        _("lavozim"),
        max_length=15,
        choices=Role.choices,
        default=Role.BOSHQA,
    )

    status = models.CharField(
        _("ish holati"),
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    is_active = models.BooleanField(
        _("faolmi?"),
        default=True,
        help_text=_("Nofaol ishchilar lookup va statistikadan chiqariladi"),
    )

    is_deleted = models.BooleanField(
        _("o'chirilganmi (arxivdami)?"),
        default=False,
        db_index=True,
    )

    photo = models.ImageField(
        _("rasm"),
        upload_to="workers/photos/%Y/%m/",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(_("yaratilgan vaqt"), auto_now_add=True)
    updated_at = models.DateTimeField(_("yangilangan vaqt"), auto_now=True)

    class Meta:
        verbose_name = _("Ishchi")
        verbose_name_plural = _("Ishchilar")
        ordering = ["-is_active", "last_name", "first_name"]

    def __str__(self):
        return f"{self.last_name} {self.first_name} ({self.code})"

    @classmethod
    def generate_code(cls):
        """Oxirgi raqamga +1 qo'shib yangi kod qaytaradi. Masalan: W-042 → W-043."""
        import re
        max_num = 0
        for code in cls.objects.values_list("code", flat=True):
            m = re.search(r"\d+", code)
            if m:
                max_num = max(max_num, int(m.group()))
        return f"W-{max_num + 1:03d}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    @property
    def full_name(self):
        """FISH qaytaradi."""
        parts = [self.last_name, self.first_name, self.middle_name]
        return " ".join([p for p in parts if p]).strip()

    @property
    def current_month_earned(self):
        """Ishchining joriy oyda bajargan ishlari umumiy summasi."""
        from production.models import WorkLog  # Circular import oldini olish uchun
        today = timezone.localdate()
        first_day_of_month = today.replace(day=1)
        res = WorkLog.objects.filter(
            worker=self, 
            work_date__gte=first_day_of_month, 
            work_date__lte=today
        ).aggregate(total=Sum('total_sum'))['total']
        return res if res else 0

    @property
    def current_month_advance(self):
        """Ishchining joriy oyda olgan jami avans summasi."""
        today = timezone.localdate()
        first_day_of_month = today.replace(day=1)
        res = AdvancePayment.objects.filter(
            worker=self, 
            date__gte=first_day_of_month, 
            date__lte=today
        ).aggregate(total=Sum('amount'))['total']
        return res if res else 0


# ──────────────────────────────────────────────
# Advance Payment (Avans)
# ──────────────────────────────────────────────
class AdvancePayment(models.Model):
    """
    Ishchiga berilgan bo'nak (avans) mablag'lari.
    """
    worker = models.ForeignKey(
        Worker, 
        on_delete=models.PROTECT, 
        related_name="advance_payments",
        verbose_name=_("ishchi")
    )
    amount = models.DecimalField(
        _("summa"), 
        max_digits=12, 
        decimal_places=2,
        help_text=_("Berilgan avans summasi")
    )
    date = models.DateField(
        _("sana"), 
        default=timezone.localdate
    )
    description = models.TextField(
        _("izoh"), 
        blank=True
    )
    manager = models.ForeignKey(
        CustomUser, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name="given_advances",
        verbose_name=_("menejer (bergan xodim)")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Avans")
        verbose_name_plural = _("Avanslar")
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.worker.full_name} — {self.amount} ({self.date})"


# ──────────────────────────────────────────────
# Salary Payment (Oylikni yopish)
# ──────────────────────────────────────────────
class SalaryPayment(models.Model):
    """
    Muayyan oy yakunida ishchiga oylik hisob-kitob qilinadi.
    total_work_sum: shu oydagi jami qilgan ishi
    total_advance_sum: joriy oydagi olingan avanslar
    net_salary = total_work_sum - total_advance_sum
    """
    worker = models.ForeignKey(
        Worker, 
        on_delete=models.CASCADE, 
        related_name="salary_payments",
        verbose_name=_("ishchi")
    )
    month = models.PositiveIntegerField(_("oy"))
    year = models.PositiveIntegerField(_("yil"))

    total_work_sum = models.DecimalField(
        _("jami ishlagan summasi"), 
        max_digits=15, 
        decimal_places=2,
        default=0
    )
    total_advance_sum = models.DecimalField(
        _("jami olgan avansi"), 
        max_digits=15, 
        decimal_places=2,
        default=0
    )
    net_salary = models.DecimalField(
        _("to'lanadigan summa"), 
        max_digits=15, 
        decimal_places=2,
        default=0,
        help_text=_("Xodimning qo'liga tegadigan(sof) oylik miqdori")
    )
    is_paid = models.BooleanField(
        _("to'landimi?"), 
        default=False
    )
    closed_at = models.DateTimeField(
        _("hisob-kitob yopilgan vaqt"), 
        auto_now_add=True
    )

    class Meta:
        verbose_name = _("Oylik hisob-kitob")
        verbose_name_plural = _("Oylik hisob-kitoblar")
        unique_together = ("worker", "month", "year")
        ordering = ["-year", "-month"]

    def __str__(self):
        return f"{self.worker.full_name} — {self.month}/{self.year} ({self.net_salary} so'm)"

    def clean(self):
        super().clean()
        # net_salary qo'lda kiritilmagan bo'lsa yoki qaytadan hisoblanishi kerak bo'lsa:
        if self.total_work_sum is not None and self.total_advance_sum is not None:
            self.net_salary = self.total_work_sum - self.total_advance_sum

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_val = None
        if not is_new:
            old_obj = SalaryPayment.objects.get(pk=self.pk)
            old_val = {
                'net_salary': str(old_obj.net_salary),
                'is_paid': old_obj.is_paid
            }

        self.clean()
        super().save(*args, **kwargs)

        action_type = "CREATE" if is_new else "UPDATE"
        new_val = {
            'net_salary': str(self.net_salary),
            'is_paid': self.is_paid
        }
        AuditLog.objects.create(
            model_name="SalaryPayment",
            record_id=self.pk,
            action=action_type,
            old_values=old_val,
            new_values=new_val
        )

    def delete(self, *args, **kwargs):
        old_val = {
            'net_salary': str(self.net_salary),
            'is_paid': self.is_paid
        }
        req_id = self.pk
        super().delete(*args, **kwargs)
        AuditLog.objects.create(
            model_name="SalaryPayment",
            record_id=req_id,
            action="DELETE",
            old_values=old_val
        )


# ──────────────────────────────────────────────
# Audit Log (Tarix va Kuzatuv)
# ──────────────────────────────────────────────
class AuditLog(models.Model):
    ACTION_CHOICES = (
        ('CREATE', 'Yaratish'),
        ('UPDATE', 'Tahrirlash'),
        ('DELETE', "O'chirish"),
    )

    model_name = models.CharField("Model", max_length=50) # Masalan: "WorkLog"
    record_id = models.IntegerField("Yozuv ID") # O'zgartirilgan yoki o'chirilgan yozuvning joriy ID si
    action = models.CharField("Amaliyot Turi", max_length=15, choices=ACTION_CHOICES)
    
    old_values = models.JSONField("Eski Qiymatlar", null=True, blank=True)
    new_values = models.JSONField("Yangi Qiymatlar", null=True, blank=True)
    
    user = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Bajaruvchi Shaxs")
    created_at = models.DateTimeField("Qayd Vaqti", auto_now_add=True)

    class Meta:
        verbose_name = "Audit Logi"
        verbose_name_plural = "Audit Loglari"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.model_name} #{self.record_id} - {self.action} by {self.user}"
