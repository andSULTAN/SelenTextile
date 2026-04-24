from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_customuser_permissions_list_and_roles"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="pin",
            field=models.CharField(
                blank=True,
                default="",
                help_text="4 xonali PIN (Manager/Cutter/Packer uchun kirish)",
                max_length=128,
                verbose_name="PIN kod",
            ),
        ),
    ]
