"""Validación del titular único por alcance (provincia, municipio o escuela).

El modelo `Usuario` tiene restricciones únicas condicionadas a `is_active=True`:
una provincia tiene un solo jefe de comisión activo, una escuela un solo director
activo, etc. Comprobarlo antes de escribir convierte lo que seria un IntegrityError
(y un 500 opaco) en un error de validación legible, y mantener la condición
`is_active=True` aquí es lo que permite sustituir a un titular desactivándolo.
"""
from rest_framework import serializers

# rol -> (campo de alcance, mensaje cuando ya hay titular activo)
SCOPED_ROLES = {
    "jefe_comision": ("provincia", "Esta provincia ya tiene un jefe de comisión activo."),
    "ingreso_provincial": ("provincia", "Esta provincia ya tiene un representante provincial activo."),
    "ingreso_municipal": ("municipio", "Este municipio ya tiene un representante municipal activo."),
    "director_escuela": ("escuela", "Esta escuela ya tiene un director activo."),
    "secretario_escuela": ("escuela", "Esta escuela ya tiene un secretario activo."),
}


def validate_unique_active_holder(role, scope_values, instance=None):
    """Lanza ValidationError si el alcance ya tiene un titular activo con ese rol.

    `scope_values` es un dict con las claves `provincia`, `municipio` y `escuela`
    (las que apliquen); `instance` excluye al propio usuario al editar.
    """
    from apps.authentication.models import Usuario

    scope_field, message = SCOPED_ROLES.get(role, (None, None))
    if not scope_field:
        return
    scope_value = scope_values.get(scope_field)
    if not scope_value:
        return
    holders = Usuario.objects.filter(rol=role, is_active=True, **{scope_field: scope_value})
    if instance is not None and instance.pk:
        holders = holders.exclude(pk=instance.pk)
    if holders.exists():
        raise serializers.ValidationError({scope_field: message})
