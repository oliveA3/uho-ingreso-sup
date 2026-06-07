from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="Role",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=64, unique=True)),
                ("description", models.TextField(blank=True)),
                ("level", models.PositiveSmallIntegerField(default=0, help_text="Nivel de jerarquía del rol; mayor valor = más permisos.")),
            ],
            options={"ordering": ["-level", "name"], "verbose_name": "Rol", "verbose_name_plural": "Roles"},
        ),
        migrations.CreateModel(
            name="Province",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=128, unique=True)),
            ],
            options={"verbose_name": "Provincia", "verbose_name_plural": "Provincias"},
        ),
        migrations.CreateModel(
            name="Municipio",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=128)),
                (
                    "province",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="municipios", to="core.province"),
                ),
            ],
            options={"unique_together": {("name", "province")}, "verbose_name": "Municipio", "verbose_name_plural": "Municipios"},
        ),
        migrations.CreateModel(
            name="Ces",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=192)),
            ],
            options={"verbose_name": "Centro de Educación Superior", "verbose_name_plural": "Centros de Educación Superior"},
        ),
        migrations.CreateModel(
            name="OtorgamientoTipo",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=128)),
                ("description", models.TextField(blank=True)),
            ],
            options={"verbose_name": "Tipo de Otorgamiento", "verbose_name_plural": "Tipos de Otorgamiento"},
        ),
        migrations.CreateModel(
            name="AsignaturaExamen",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=128)),
                ("code", models.CharField(blank=True, max_length=32)),
            ],
            options={"verbose_name": "Asignatura de Examen", "verbose_name_plural": "Asignaturas de Examen"},
        ),
        migrations.CreateModel(
            name="Carrera",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=192)),
                ("description", models.TextField(blank=True)),
                ("ces", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="carreras", to="core.ces")),
            ],
            options={"verbose_name": "Carrera", "verbose_name_plural": "Carreras"},
        ),
        migrations.CreateModel(
            name="Escuela",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=192)),
                ("municipio", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="escuelas", to="core.municipio")),
                ("director", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="escuelas_dirigidas", to="core.user")),
                ("secretario", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="escuelas_secretariadas", to="core.user")),
            ],
            options={"verbose_name": "Escuela", "verbose_name_plural": "Escuelas"},
        ),
        migrations.CreateModel(
            name="User",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("is_superuser", models.BooleanField(default=False, help_text="Designates that this user has all permissions without explicitly assigning them.", verbose_name="superuser status")),
                ("username", models.CharField(error_messages={"unique": "A user with that username already exists."}, max_length=150, unique=True, verbose_name="username")),
                ("first_name", models.CharField(blank=True, max_length=150, verbose_name="first name")),
                ("last_name", models.CharField(blank=True, max_length=150, verbose_name="last name")),
                ("email", models.EmailField(blank=True, max_length=254, verbose_name="email address")),
                ("is_staff", models.BooleanField(default=False, help_text="Designates whether the user can log into this admin site.", verbose_name="staff status")),
                ("is_active", models.BooleanField(default=True, help_text="Designates whether this user should be treated as active.", verbose_name="active")),
                ("date_joined", models.DateTimeField(default=django.utils.timezone.now, verbose_name="date joined")),
                ("ci", models.CharField(help_text="Carnet de Identidad cubano de 11 dígitos.", max_length=11, unique=True, validators=[django.core.validators.RegexValidator("^\\d{11}$", message="El CI debe tener 11 dígitos numéricos.")])),
                ("nombre", models.CharField(max_length=120)),
                ("apellidos", models.CharField(max_length=120)),
                ("telefono", models.CharField(blank=True, max_length=32)),
                ("rol", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="users", to="core.role")),
                ("municipio", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="usuarios", to="core.municipio")),
                ("escuela", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="miembros", to="core.escuela")),
                ("groups", models.ManyToManyField(blank=True, help_text="The groups this user belongs to.", related_name="user_set", related_query_name="user", to="auth.Group", verbose_name="groups")),
                ("user_permissions", models.ManyToManyField(blank=True, help_text="Specific permissions for this user.", related_name="user_set", related_query_name="user", to="auth.Permission", verbose_name="user permissions")),
            ],
            options={"verbose_name": "Usuario", "verbose_name_plural": "Usuarios"},
        ),
    ]
