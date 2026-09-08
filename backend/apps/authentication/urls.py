from django.urls import path

from .views import ChangePendingEmailView, CsrfCookieView, CurrentUserView, LoginView, LogoutView, RegisterView, VerifyEmailView

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("register/", RegisterView.as_view(), name="register"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("change-pending-email/", ChangePendingEmailView.as_view(), name="change-pending-email"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("csrf/", CsrfCookieView.as_view(), name="csrf-cookie"),
]
