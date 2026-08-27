from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("gestion_escuela", "0008_fix_default_item_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="escalafonitem",
            name="fecha_revision",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]