"""Generación de contraseñas temporales.

Sustituye a `UserManager.make_random_password()`, que está obsoleto desde Django
4.2 y se eliminó en 5.1: tenerlo en un solo sitio evita que la actualización haya
que repetirla en cada serializador.
"""
from django.utils.crypto import get_random_string

# Sin caracteres ambiguos (O/0, l/1/I) porque estas contraseñas se dictan o se
# copian desde un correo.
TEMPORARY_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
TEMPORARY_PASSWORD_LENGTH = 12


def generate_temporary_password():
    return get_random_string(TEMPORARY_PASSWORD_LENGTH, TEMPORARY_PASSWORD_ALPHABET)
