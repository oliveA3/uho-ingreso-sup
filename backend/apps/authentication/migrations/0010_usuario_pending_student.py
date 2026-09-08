from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("authentication", "0009_emailverificationcode"),
    ]

    operations = [
        migrations.AddField(
            model_name="usuario",
            name="pending_student",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="pending_users",
                to="authentication.estudiante",
            ),
        ),
    ]