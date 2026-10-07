from django.db import migrations


CAREERS = [
    {
        "codigo": "IND01",
        "nombre": "Ingeniería Industrial",
        "descripcion": "Forma profesionales para diseñar y mejorar sistemas productivos y de servicios, integrando personas, recursos, tecnología y procesos.",
        "campo_laboral": "Industrias, empresas de servicios, logística, gestión de calidad, planificación de operaciones y consultoría organizacional.",
        "requisitos": "Cumplir los requisitos de ingreso y aprobar las pruebas establecidas para la convocatoria vigente.",
        "perfil_egresado": "Profesional capaz de analizar procesos y proponer mejoras de productividad, calidad, seguridad y uso de recursos.",
    },
    {
        "codigo": "MEC01",
        "nombre": "Ingeniería Mecánica",
        "descripcion": "Prepara profesionales para proyectar, operar y mantener máquinas, equipos e instalaciones mecánicas.",
        "campo_laboral": "Empresas industriales, transporte, energía, mantenimiento, diseño mecánico y servicios técnicos especializados.",
        "requisitos": "Cumplir los requisitos de ingreso y aprobar las pruebas establecidas para la convocatoria vigente.",
        "perfil_egresado": "Profesional con fundamentos científicos y técnicos para resolver problemas de diseño, explotación y mantenimiento de sistemas mecánicos.",
    },
    {
        "codigo": "QUI01",
        "nombre": "Ingeniería Química",
        "descripcion": "Forma profesionales para diseñar, controlar y optimizar procesos de transformación de materias primas en productos útiles.",
        "campo_laboral": "Industrias química, alimentaria, azucarera, minera y energética, laboratorios, control de procesos y gestión ambiental.",
        "requisitos": "Cumplir los requisitos de ingreso y aprobar las pruebas establecidas para la convocatoria vigente.",
        "perfil_egresado": "Profesional capaz de desarrollar procesos industriales eficientes con atención a la calidad, la seguridad y el impacto ambiental.",
    },
    {
        "codigo": "TEL01",
        "nombre": "Ingeniería en Telecomunicaciones y Electrónica",
        "descripcion": "Prepara profesionales para diseñar, instalar y mantener sistemas electrónicos y redes de comunicación.",
        "campo_laboral": "Operadores de telecomunicaciones, redes, electrónica, automatización, radiocomunicaciones, soporte técnico e investigación.",
        "requisitos": "Cumplir los requisitos de ingreso y aprobar las pruebas establecidas para la convocatoria vigente.",
        "perfil_egresado": "Profesional con capacidad para integrar tecnologías electrónicas y de comunicación y resolver problemas de conectividad y transmisión de información.",
    },
    {
        "codigo": "TUR01",
        "nombre": "Licenciatura en Turismo",
        "descripcion": "Forma profesionales para planificar, gestionar y desarrollar servicios y destinos turísticos.",
        "campo_laboral": "Hoteles, agencias de viajes, turoperadores, entidades de gestión de destinos, eventos y servicios de hospitalidad.",
        "requisitos": "Cumplir los requisitos de ingreso y aprobar las pruebas establecidas para la convocatoria vigente.",
        "perfil_egresado": "Profesional preparado para gestionar productos y servicios turísticos con orientación al cliente, sostenibilidad y desarrollo local.",
    },
]


INFORMATION_FIELDS = ("descripcion", "campo_laboral", "requisitos", "perfil_egresado")


def seed_more_holguin_career_information(apps, schema_editor):
    Carrera = apps.get_model("superadmin", "Carrera")
    Ces = apps.get_model("superadmin", "Ces")
    Provincia = apps.get_model("superadmin", "Provincia")

    province = Provincia.objects.filter(nombre__iexact="Holguín").order_by("id").first()
    if province is None:
        return
    ces = Ces.objects.filter(carreras__provincia_id=province.id).order_by("id").first()
    if ces is None:
        ces = Ces.objects.filter(nombre__iexact="Universidad de Holguín").order_by("id").first()
    if ces is None:
        return

    for career_data in CAREERS:
        career = Carrera.objects.filter(codigo=career_data["codigo"]).first()
        if career is not None and career.provincia_id != province.id:
            continue
        if career is None:
            Carrera.objects.create(
                codigo=career_data["codigo"],
                nombre=career_data["nombre"],
                ces_id=ces.id,
                provincia_id=province.id,
                activa=True,
                **{field: career_data[field] for field in INFORMATION_FIELDS},
            )
            continue

        changed_fields = []
        for field in INFORMATION_FIELDS:
            if not (getattr(career, field) or "").strip():
                setattr(career, field, career_data[field])
                changed_fields.append(field)
        if changed_fields:
            career.save(update_fields=[*changed_fields, "fecha_ultima_modificacion"])


class Migration(migrations.Migration):
    dependencies = [
        ("superadmin", "0011_seed_holguin_career_information"),
    ]

    operations = [
        migrations.RunPython(seed_more_holguin_career_information, migrations.RunPython.noop),
    ]
