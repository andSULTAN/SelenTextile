#!/bin/bash

# =========================================================================
# PostgreSQL Bazani avto-zaxiralash (Backup) va Telegram ga yuborish skripti
# =========================================================================

# 1. Konfiguratsiyalar
CONTAINER_NAME="selentextile_db"
DB_USER="postgres"
DB_NAME="selenerp_db"

# Backup saqlanadigan papka qayerda?
BACKUP_DIR="/var/www/selen-textile/backups"
mkdir -p "$BACKUP_DIR"

# Fayl nomi (masalan: selenerp_2026-04-03_23-59-59.sql.gz)
DATE=$(date +"%Y-%m-%d_%H-%M")
FILE_NAME="selenerp_$DATE.sql.gz"
FILE_PATH="$BACKUP_DIR/$FILE_NAME"

# Telegram Bot sozlamalari (O'zingiznikini ./env dan olib qo'yasiz yoki to'g'ridan-to'g'ri yozasiz)
BOT_TOKEN="SZNING_TG_BOT_TOKEN_SHU_ERGA"
CHAT_ID="SIZNING_TG_CHAT_ID_RAQAMINGIZ"

# 2. Zaxira yaratish (Docker konteynerdan foydalanib pg_dump orqali olinadi)
# Eslatma: sudo ishlatish yoki root orqali ishlatilganingizga qarab -it shart emas, ba'zida faqat -i yetarli qilinadi.
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > "$FILE_PATH"

if [ $? -eq 0 ]; then
  echo "✅ Zaxira muvaffaqiyatli saqlandi: $FILE_PATH"

  # 3. Telegram orqali yuborish (Hajmi 50MB dan kichik bo'lsa tekinga o'tadi)
  MESSAGE="📂 SelenTextile Tizimi: Yangi baza zaxirasi muvaffaqiyatli olindi! Sana: $DATE"
  
  curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendDocument" \
    -F chat_id="$CHAT_ID" \
    -F caption="$MESSAGE" \
    -F document=@"$FILE_PATH" > /dev/null

  # 4. Vaqtinchalik yoki eski eskirgan arxivlarni tozalash (Masalan: oxirgi 7 kundagini saqlaymiz)
  find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -exec rm {} \;
  echo "🧹 7 kundan eski zaxiralar tozalandi."

else
  echo "❌ Xatolik yuz berdi: Bash qutisi datalarni yuklab ololmadi!"
  
  # Telegramga xato sms xabarni berish
  curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
    -d chat_id="$CHAT_ID" \
    -d text="⚠️ Diqqat! SelenTextile PostgreSQL zaxira nusxasini olish MUVAFFAQIYATSIZ yakunlandi!"
fi
