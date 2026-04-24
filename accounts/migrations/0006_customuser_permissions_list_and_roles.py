from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_worker_is_deleted_alter_advancepayment_worker_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='permissions_list',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Granular huquqlar kodlari ro'yxati",
                verbose_name='huquqlar',
            ),
        ),
        # Role choices extension — CharField, no DB change needed
        migrations.AlterField(
            model_name='customuser',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin',   'Admin'),
                    ('manager', 'Manager'),
                    ('cutter',  'Bichuvchi'),
                    ('packer',  'Qadoqchi'),
                    ('tv',      'TV (Monitor)'),
                ],
                default='manager',
                max_length=10,
                verbose_name='role',
            ),
        ),
    ]
