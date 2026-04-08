"""
Inventory app models — Ishlab chiqarish zanjiri.
Sklad    → Bichuv → Upakovka
Partiya raqami (batch_number) orqali bog'langan.

Oqim:  Gazlama skladi → Bichuvga beriladi → Tayyor mahsulot upakovkaga o'tadi.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from production.models import ProductModel


# ──────────────────────────────────────────────
# Abstract Base — barcha inventory modellari uchun
# ──────────────────────────────────────────────
class InventoryBase(models.Model):
    """Umumiy maydonlar barcha inventory modellari uchun."""

    batch_number = models.CharField(
        _("partiya raqami"),
        max_length=50,
        db_index=True,
        help_text=_("Ishlab chiqarish partiyasi identifikatori"),
    )
    product_model = models.ForeignKey(
        ProductModel,
        on_delete=models.PROTECT,
        verbose_name=_("mahsulot modeli"),
    )
    quantity = models.PositiveIntegerField(
        _("miqdor"),
        validators=[MinValueValidator(1)],
    )
    note = models.TextField(
        _("izoh"),
        blank=True,
    )

    created_at = models.DateTimeField(_("yaratilgan vaqt"), auto_now_add=True)
    updated_at = models.DateTimeField(_("yangilangan vaqt"), auto_now=True)

    class Meta:
        abstract = True

    @classmethod
    def get_batch_history(cls, batch_number):
        """
        Partiya raqami bo'yicha Sklad, Bichuv va Upakovka bosqichlaridagi
        barcha tarixni yig'ib beruvchi yordamchi funksiya.
        """
        from inventory.models import Sklad, Bichuv, Upakovka
        
        sklad_items = Sklad.objects.filter(batch_number=batch_number).values()
        bichuv_items = Bichuv.objects.filter(batch_number=batch_number).values()
        upakovka_items = Upakovka.objects.filter(batch_number=batch_number).values()

        return {
            "batch_number": batch_number,
            "sklad_log": list(sklad_items),
            "bichuv_log": list(bichuv_items),
            "upakovka_log": list(upakovka_items),
        }


# ──────────────────────────────────────────────
# Sklad (Gazlama ombori)
# ──────────────────────────────────────────────
class Sklad(InventoryBase):
    """
    Xom ashyo / gazlama ombori.
    Gazlama kelganda shu yerga kiritiladi.
    """

    class Status(models.TextChoices):
        RECEIVED  = "received",  _("Qabul qilingan")
        IN_USE    = "in_use",    _("Ishlatilmoqda")
        EXHAUSTED = "exhausted", _("Tugagan")

    fabric_type = models.CharField(
        _("gazlama turi"),
        max_length=200,
        help_text=_("Masalan: trikotaj, paxtali, sintetik"),
    )
    color = models.CharField(
        _("rang"),
        max_length=100,
        blank=True,
    )
    roll_count = models.PositiveIntegerField(
        _("rulonlar soni"),
        default=1,
    )
    status = models.CharField(
        _("holat"),
        max_length=10,
        choices=Status.choices,
        default=Status.RECEIVED,
    )
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="received_sklad_items",
        verbose_name=_("qabul qiluvchi"),
    )
    received_date = models.DateField(
        _("qabul qilingan sana"),
    )

    class Meta:
        verbose_name = _("Sklad (Gazlama)")
        verbose_name_plural = _("Sklad (Gazlamalar)")
        ordering = ["-received_date"]
        indexes = [
            models.Index(fields=["batch_number"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"Sklad #{self.batch_number} — {self.fabric_type} ({self.quantity} dona)"


# ──────────────────────────────────────────────
# Bichuv (Kesish / Bichish)
# ──────────────────────────────────────────────
class Bichuv(InventoryBase):
    """
    Gazlama bichilgandan keyingi bosqich.
    Sklad dan olingan gazlama bu yerda bichiladi.
    """

    class Status(models.TextChoices):
        PENDING     = "pending",     _("Kutilmoqda")
        IN_PROGRESS = "in_progress", _("Jarayonda")
        COMPLETED   = "completed",   _("Tugallangan")

    sklad = models.ForeignKey(
        Sklad,
        on_delete=models.PROTECT,
        related_name="bichuv_items",
        verbose_name=_("sklad partiyasi"),
        help_text=_("Qaysi sklad partiyasidan bichilgan"),
    )
    cut_date = models.DateField(
        _("bichilgan sana"),
    )
    cut_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cut_bichuv_items",
        verbose_name=_("bichuvchi"),
    )
    weight_kg = models.DecimalField(
        _("og'irligi (kg)"),
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text=_("Bichilgan jami qismlar og'irligi"),
    )
    defect_count = models.PositiveIntegerField(
        _("nuqsonli dona"),
        default=0,
        help_text=_("Bichish jarayonida aniqlangan nuqsonli donalar soni"),
    )
    status = models.CharField(
        _("holat"),
        max_length=12,
        choices=Status.choices,
        default=Status.PENDING,
    )

    class Meta:
        verbose_name = _("Bichuv")
        verbose_name_plural = _("Bichuvlar")
        ordering = ["-cut_date"]
        indexes = [
            models.Index(fields=["batch_number"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return (
            f"Bichuv #{self.batch_number} — {self.product_model.name} "
            f"({self.quantity} dona, {self.weight_kg} kg)"
        )

    @property
    def good_quantity(self):
        return self.quantity - self.defect_count

    def clean(self):
        super().clean()
        # 1-Tekshiruv: Bichuv og'irligi Sklad dan olingan kg dan oshib ketmasligi kerak.
        # Sklad modelidagi quantity ni biz xom ashyo og'irligi (kg yoki metr) deb hisoblaymiz.
        if self.sklad_id and self.weight_kg > 0:
            if self.weight_kg > self.sklad.quantity:
                raise ValidationError({
                    "weight_kg": _(
                        f"Xatolik: Bichuvdan chiqayotgan og'irlik ({self.weight_kg} kg) "
                        f"Sklad partiyasidagi xom ashyo miqdoridan ({self.sklad.quantity}) oshib ketdi!"
                    )
                })

        # FabricInventory available_kg validation
        if self.batch_number and getattr(self, 'weight_kg', 0) > 0:
            from django.db.models import Sum
            fabric = FabricInventory.objects.filter(batch_number=self.batch_number).first()
            if fabric:
                bichuv_qs = Bichuv.objects.filter(batch_number=self.batch_number)
                if self.pk:
                    bichuv_qs = bichuv_qs.exclude(pk=self.pk)
                used = bichuv_qs.aggregate(total=Sum("weight_kg"))["total"] or 0
                available = float(fabric.total_kg) - float(used) - float(fabric.waste_kg)
                if float(self.weight_kg) > available:
                    raise ValidationError({
                        "weight_kg": _(
                            f"Xatolik: Bichuvdan chiqayotgan og'irlik ({self.weight_kg} kg) "
                            f"FabricInventory qoldig'idan ({available:.2f} kg) oshib ketdi!"
                        )
                    })


# ──────────────────────────────────────────────
# Upakovka (Qadoqlash)
# ──────────────────────────────────────────────
class Upakovka(InventoryBase):
    """
    Tikib bo'lingan mahsulotlarni qadoqlash bosqichi.
    Bichuv dan tayyor mahsulot shu yerga o'tadi.
    """

    class Status(models.TextChoices):
        PENDING   = "pending",   _("Kutilmoqda")
        PACKED    = "packed",    _("Qadoqlangan")
        SHIPPED   = "shipped",  _("Jo'natilgan")

    bichuv = models.ForeignKey(
        Bichuv,
        on_delete=models.PROTECT,
        related_name="upakovka_items",
        verbose_name=_("bichuv partiyasi"),
        help_text=_("Qaysi bichuv partiyasidan kelgan"),
    )
    pack_date = models.DateField(
        _("qadoqlangan sana"),
    )
    packed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="packed_upakovka_items",
        verbose_name=_("qadoqlovchi"),
    )
    box_count = models.PositiveIntegerField(
        _("quti soni"),
        default=1,
        help_text=_("Nechta qutiga joylangan"),
    )
    defect_count = models.PositiveIntegerField(
        _("nuqsonli dona"),
        default=0,
    )
    status = models.CharField(
        _("holat"),
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )

    class Meta:
        verbose_name = _("Upakovka")
        verbose_name_plural = _("Upakovkalar")
        ordering = ["-pack_date"]
        indexes = [
            models.Index(fields=["batch_number"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return (
            f"Upakovka #{self.batch_number} — {self.product_model.name} "
            f"({self.quantity} dona, {self.box_count} quti)"
        )

    @property
    def good_quantity(self):
        return self.quantity - self.defect_count

    @property
    def defect_percentage(self):
        total = self.quantity + self.defect_count
        if total == 0:
            return 0
        return round((self.defect_count / total) * 100, 2)

    def clean(self):
        super().clean()
        # 2-Tekshiruv: Upakovkadagi (yaroqli + brak) jami mahsulot 
        # Bichuv dan chiqqan umumiy sondan oshmasligi kerak.
        if self.bichuv_id:
            total_attempted = self.quantity + self.defect_count
            if total_attempted > self.bichuv.quantity:
                raise ValidationError({
                    "quantity": _(
                        f"Xatolik: Upakovkadagi va brak mahsulotlar yig'indisi ({total_attempted}) "
                        f"Bichuvdan olingan mahsulot sonidan ({self.bichuv.quantity}) oshib ketdi!"
                    )
                })


# ──────────────────────────────────────────────
# Fabric Inventory (Yangi Gazlama Modeli)
# ──────────────────────────────────────────────
class FabricInventory(models.Model):
    class WasteType(models.TextChoices):
        DEFECT = "defect", _("Zavod braki (Defect)")
        CUTTING = "cutting", _("Qiyqindi (Cutting waste)")
        OTHER = "other", _("Boshqa (Other)")

    supplier_weaver = models.CharField(_("to'quvchi"), max_length=200, blank=True)
    supplier_dyer = models.CharField(_("bo'yoqchi"), max_length=200, blank=True)
    batch_number = models.CharField(_("partiya raqami"), max_length=50, unique=True, db_index=True)
    total_kg = models.PositiveIntegerField(_("jami kg"))
    roll_count = models.PositiveIntegerField(_("rulonlar soni"))
    assigned_models = models.ManyToManyField(ProductModel, related_name="fabric_batches", verbose_name=_("biriktirilgan modellar"), blank=True)
    fabric_image = models.ImageField(_("gazlama rasmi"), upload_to="fabrics/%Y/%m/", blank=True, null=True)
    waste_kg = models.PositiveIntegerField(_("isrof kg"), default=0)
    waste_type = models.CharField(_("isrof turi"), max_length=20, choices=WasteType.choices, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Fabric Inventory")
        verbose_name_plural = _("Fabric Inventories")

    def __str__(self):
        return f"{self.batch_number} ({self.total_kg} kg)"

    @property
    def available_kg(self):
        bichuv_used = (
            Bichuv.objects.filter(batch_number=self.batch_number)
            .aggregate(s=models.Sum('weight_kg'))['s'] or 0
        )
        brak_total = (
            self.brak_logs.aggregate(s=models.Sum('kg'))['s'] or 0
        )
        return float(self.total_kg) - float(bichuv_used) - float(self.waste_kg) - float(brak_total)

    @property
    def total_brak_kg(self):
        """waste_kg (kirimda kiritilgan) + BrakLog yig'indisi."""
        brak_sum = self.brak_logs.aggregate(s=models.Sum('kg'))['s'] or 0
        return float(self.waste_kg) + float(brak_sum)


# ──────────────────────────────────────────────
# Stock Threshold (Kam qoldiqni nazorat qilish)
# ──────────────────────────────────────────────
class StockThreshold(models.Model):
    product_model = models.ForeignKey(ProductModel, on_delete=models.CASCADE, related_name="thresholds", verbose_name=_("model"))
    material_type = models.CharField(_("xom-ashyo turi"), max_length=100, default="Gazlama")
    min_kg = models.PositiveIntegerField(_("minimal chegara (kg)"))

    class Meta:
        verbose_name = _("Zaxira chegarasi")
        verbose_name_plural = _("Zaxira chegaralari")

    def __str__(self):
        return f"{self.product_model.name} uchun min: {self.min_kg}kg"


# ──────────────────────────────────────────────
# BrakLog — operatsion brak qayd kitobi
# ──────────────────────────────────────────────
class BrakLog(models.Model):
    """
    Sklad partiyasi bo'yicha aniqlangan braklar.
    Har bir yozuv FabricInventory.available_kg ni kamaytiradi.
    """

    class BrakType(models.TextChoices):
        WEAVER = "tovuvchi",  _("To'quvchi braki")
        CUTTER = "bichuvchi", _("Bichuvchi braki")
        MIXED  = "aralash",   _("Ikkalasi (aralash)")

    fabric = models.ForeignKey(
        FabricInventory,
        on_delete=models.PROTECT,
        related_name="brak_logs",
        verbose_name=_("partiya"),
    )
    kg = models.PositiveIntegerField(_("brak kg"))
    brak_type = models.CharField(
        _("brak turi"), max_length=20, choices=BrakType.choices,
    )
    note = models.TextField(_("izoh"), blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name=_("kim kiritdi"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Brak logi")
        verbose_name_plural = _("Brak loglari")
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.fabric.batch_number} — {self.kg} kg "
            f"({self.get_brak_type_display()})"
        )


import requests
from django.db.models.signals import m2m_changed, post_save
from django.dispatch import receiver

@receiver(m2m_changed, sender=FabricInventory.assigned_models.through)
def fabric_assigned_models_changed(sender, instance, action, **kwargs):
    if action == "post_add":
        for pm in instance.assigned_models.all():
            pm.status = 'active'
            pm.save()

def send_telegram_alert(message):
    # Placeholder
    bot_token = "BOT_TOKEN"
    chat_id = "CHAT_ID"
    if not bot_token or bot_token == "BOT_TOKEN": return
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        requests.post(url, json={"chat_id": chat_id, "text": message, "parse_mode": "HTML"}, timeout=5)
    except:
        pass

@receiver(post_save, sender=Bichuv)
def check_stock_threshold_alert(sender, instance, **kwargs):
    try:
        fabric = FabricInventory.objects.filter(batch_number=instance.batch_number).first()
        if not fabric: return
        
        current_kg = fabric.available_kg
        
        assigned = fabric.assigned_models.all()
        for pm in assigned:
            threshold = StockThreshold.objects.filter(product_model=pm).first()
            if threshold and current_kg < threshold.min_kg:
                msg = f"⚠️ <b>DIQQAT!</b>\n\n<b>Model:</b> {pm.name}\n<b>Mato zaxirasi tugamoqda:</b> {current_kg} kg qoldi!\n<b>Partiya:</b> {fabric.batch_number}"
                send_telegram_alert(msg)
    except Exception:
        pass
