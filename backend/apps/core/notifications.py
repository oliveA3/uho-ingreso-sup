from .models import Notificacion
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone


def notify_users(users, title, content, filter_students=True):
    from apps.gestion_escuela.models import EscalafonItem
    from apps.gestion_provincial.models import ETAPAS_NOMBRES

    current_year = timezone.now().year
    valid_users = []
    for user in users:
        if not user or not user.id:
            continue
        if filter_students and user.rol == "estudiante" and not EscalafonItem.objects.filter(
            estudiante__usuario=user,
            escalafon__proceso__anio__year=current_year,
            escalafon__proceso__etapa__nombre=ETAPAS_NOMBRES[1],
        ).exists():
            continue
        valid_users.append(user)

    user_ids = {user.id for user in valid_users}
    Notificacion.objects.bulk_create([
        Notificacion(usuario_id=user_id, titulo=title, contenido=content)
        for user_id in user_ids
    ])
    for user in valid_users:
        if user.email:
            send_mail(
                subject=title,
                message=content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )