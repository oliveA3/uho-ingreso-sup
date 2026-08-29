from .models import Notificacion


def notify_users(users, title, content):
    user_ids = {user.id for user in users if user and user.id}
    Notificacion.objects.bulk_create([
        Notificacion(usuario_id=user_id, titulo=title, contenido=content)
        for user_id in user_ids
    ])