from django.db import migrations


CAREER_INFORMATION = {
    "CIV01": {
        "descripcion": "Forma profesionales para planificar, diseñar y dirigir obras civiles, desde edificaciones hasta infraestructura vial e hidráulica.",
        "campo_laboral": "Proyectos de diseño, empresas constructoras, entidades de inversión y mantenimiento de infraestructura, y organismos de gestión territorial.",
        "requisitos": "Cumplir los requisitos de ingreso y aprobar las pruebas establecidas para la convocatoria vigente.",
        "perfil_egresado": "Profesional con bases científicas y técnicas para desarrollar soluciones constructivas seguras, funcionales y sostenibles.",
    },
    "ELC01": {
        "descripcion": "Forma profesionales para diseñar, operar y mantener sistemas eléctricos y contribuir a la generación, transmisión y uso eficiente de la energía.",
        "campo_laboral": "Empresas del sector eléctrico, industrias, proyectos de automatización y control, servicios técnicos e instituciones de investigación.",
        "requisitos": "Cumplir los requisitos de ingreso y aprobar las pruebas establecidas para la convocatoria vigente.",
        "perfil_egresado": "Profesional capaz de analizar y resolver problemas de ingeniería eléctrica con criterios de seguridad, eficiencia y responsabilidad social.",
    },
}


def seed_holguin_career_information(apps, schema_editor):
    Carrera = apps.get_model("superadmin", "Carrera")
    Provincia = apps.get_model("superadmin", "Provincia")
    province = Provincia.objects.filter(nombre__iexact="Holguín").order_by("id").first()
    if province is None:
        return

    for code, information in CAREER_INFORMATION.items():
        career = Carrera.objects.filter(codigo=code, provincia_id=province.id).first()
        if career is None:
            continue

        changed_fields = []
        for field, value in information.items():
            if not (getattr(career, field) or "").strip():
                setattr(career, field, value)
                changed_fields.append(field)
        if changed_fields:
            career.save(update_fields=[*changed_fields, "fecha_ultima_modificacion"])


class Migration(migrations.Migration):

    dependencies = [
        ("superadmin", "0010_carrera_additional_information"),
    ]

    operations = [
        migrations.RunPython(seed_holguin_career_information, migrations.RunPython.noop),
    ]