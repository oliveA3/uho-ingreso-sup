from django.db import migrations

# Datos que antes estaban fijos en el frontend (cesDetails.js). Solo se rellenan campos vacíos.
CES_INFO = [
    {
        "match": "universidad central marta abreu de las villas",
        "descripcion": "Universidad pública cubana con sede principal en Santa Clara, orientada a la formación de pregrado y posgrado, la investigación y la innovación.",
        "sede_principal": "Santa Clara, Villa Clara",
        "sitio_web": "https://www.uclv.edu.cu/"
    },
    {
        "match": "universidad de camaguey",
        "descripcion": "Institución de educación superior de Camagüey que desarrolla formación universitaria, posgrado e investigación para el territorio.",
        "sede_principal": "Camagüey, Camagüey",
        "sitio_web": "https://www.ucamaguey.edu.cu/"
    },
    {
        "match": "universidad de holguin",
        "descripcion": "Universidad pública de Holguín dedicada a la formación de profesionales, la investigación y la vinculación con el desarrollo económico y social de la provincia.",
        "sede_principal": "Holguín, Holguín",
        "sitio_web": "https://www.uho.edu.cu/"
    },
    {
        "match": "universidad de la habana",
        "descripcion": "La universidad más antigua de Cuba, con formación e investigación en ciencias, humanidades, economía, derecho y otras áreas del conocimiento.",
        "sede_principal": "La Habana, Cuba",
        "sitio_web": "https://www.uh.cu/"
    },
    {
        "match": "universidad de oriente",
        "descripcion": "Universidad pública con sede en Santiago de Cuba que aporta formación profesional, investigación y extensión universitaria al oriente del país.",
        "sede_principal": "Santiago de Cuba, Cuba",
        "sitio_web": "https://www.uo.edu.cu/"
    }
]


def normalize(value):
    import unicodedata

    text = unicodedata.normalize("NFKD", (value or "").strip().lower())
    return "".join(ch for ch in text if not unicodedata.combining(ch))


def fill_ces_info(apps, schema_editor):
    Ces = apps.get_model("superadmin", "Ces")
    by_name = {item["match"]: item for item in CES_INFO}
    for ces in Ces.objects.all():
        info = by_name.get(normalize(ces.nombre))
        if not info:
            continue
        if not ces.descripcion:
            ces.descripcion = info["descripcion"]
        if not ces.sede_principal:
            ces.sede_principal = info["sede_principal"]
        if not ces.sitio_web:
            ces.sitio_web = info["sitio_web"]
        ces.save(update_fields=["descripcion", "sede_principal", "sitio_web"])


class Migration(migrations.Migration):
    dependencies = [("superadmin", "0008_ces_sede_principal_sitio_web")]
    operations = [migrations.RunPython(fill_ces_info, migrations.RunPython.noop)]
