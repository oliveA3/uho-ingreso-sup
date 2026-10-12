from django.urls import path

from .views import ChangePasswordView, ChangePendingEmailView, CookieTokenRefreshView, CsrfCookieView, CurrentUserView, LoginView, LogoutView, PasswordResetConfirmView, PasswordResetRequestView, RegisterView, ResendVerificationCodeView, VerifyEmailView

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", CookieTokenRefreshView.as_view(), name="token-refresh"),
    path("register/", RegisterView.as_view(), name="register"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification-code/", ResendVerificationCodeView.as_view(), name="resend-verification-code"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("change-pending-email/", ChangePendingEmailView.as_view(), name="change-pending-email"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("csrf/", CsrfCookieView.as_view(), name="csrf-cookie"),
]
