import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    changePendingEmail,
    register,
    verifyEmail,
} from "../../api/auth.service";
import { fetchRegistrationAvailability } from "../../api/landing.service";
import { normalizeCatalogList } from "../../api/httpClient";
import { fetchSuperAdminCatalog } from "../../api/superadmin.service";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import { Card, FormField, Input, Select } from "../../components";
import styles from "./RegisterPage.module.css";

const validateRegistrationField = (field, value, passwordValue = "") => {
    const trimmed = value.trim();

    if (field === "username") {
        if (!trimmed) return "Escribe un nombre de usuario.";
        if (trimmed.length < 4) return "El usuario debe tener al menos 4 caracteres.";
        return "";
    }

    if (field === "ci") {
        if (!trimmed) return "Escribe tu número de carnet de identidad.";
        if (!/^\d{11}$/.test(trimmed)) return "La CI debe tener 11 dígitos, sin letras ni espacios.";
        return "";
    }

    if (field === "email") {
        if (!trimmed) return "Escribe tu correo electrónico.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "El correo no tiene un formato válido.";
        return "";
    }

    if (field === "password") {
        if (!trimmed) return "Crea una contraseña.";
        if (trimmed.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
        return "";
    }

    if (field === "confirmPassword") {
        if (!trimmed) return "Confirma la contraseña.";
        if (trimmed !== passwordValue) return "Las contraseñas no coinciden.";
        return "";
    }

    if (field === "whatsapp") {
        if (!trimmed) return "";
        if (!/^\+?[0-9\s()-]{8,20}$/.test(trimmed)) return "El número de WhatsApp solo puede contener números y signos básicos.";
        return "";
    }

    return "";
};

export default function RegisterPage() {
    const [form, setForm] = useState({
        username: "",
        ci: "",
        email: "",
        whatsapp: "",
        password: "",
        confirmPassword: "",
        politicaPrivacidadAceptada: false,
    });

    const [provincias, setProvincias] = useState([]);
    const [provinciaId, setProvinciaId] = useState("");
    const [municipios, setMunicipios] = useState([]);
    const [municipioId, setMunicipioId] = useState("");
    const [escuelas, setEscuelas] = useState([]);
    const [escuelaId, setEscuelaId] = useState("");

    const [errors, setErrors] = useState({
        username: "",
        ci: "",
        email: "",
        whatsapp: "",
        password: "",
        confirmPassword: "",
        politicaPrivacidadAceptada: "",
    });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [registrationOpen, setRegistrationOpen] = useState(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [pendingVerification, setPendingVerification] = useState(false);
    const [editingPendingEmail, setEditingPendingEmail] = useState(false);
    const [changingPendingEmail, setChangingPendingEmail] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchSuperAdminCatalog("provincias")
            .then((data) => setProvincias(normalizeCatalogList(data)))
            .catch(() => setError("No se pudieron cargar las provincias."));
        fetchRegistrationAvailability()
            .then((data) => setRegistrationOpen(data.registro_estudiantil))
            .catch(() => setRegistrationOpen(false));
    }, []);

    useEffect(() => {
        if (!provinciaId) {
            setMunicipios([]);
            setEscuelas([]);
            setMunicipioId("");
            setEscuelaId("");
            return;
        }

        fetchSuperAdminCatalog("municipios", { provincia: provinciaId })
            .then((data) => {
                setMunicipios(normalizeCatalogList(data));
                setMunicipioId("");
                setEscuelas([]);
                setEscuelaId("");
            })
            .catch(() => setError("No se pudieron cargar los municipios."));
    }, [provinciaId]);

    useEffect(() => {
        if (!municipioId) {
            setEscuelas([]);
            setEscuelaId("");
            return;
        }

        fetchSuperAdminCatalog("escuelas", { municipio: municipioId })
            .then((data) => {
                setEscuelas(normalizeCatalogList(data));
                setEscuelaId("");
            })
            .catch(() => setError("No se pudieron cargar las escuelas."));
    }, [municipioId]);

    const updateField = (field) => (event) => {
        const value = event.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({
            ...prev,
            [field]: validateRegistrationField(
                field,
                value,
                field === "confirmPassword" ? form.password : form.confirmPassword,
            ),
        }));
        if (field === "password" && form.confirmPassword) {
            setErrors((prev) => ({
                ...prev,
                confirmPassword: validateRegistrationField("confirmPassword", form.confirmPassword, value),
            }));
        }
        if (field === "confirmPassword") {
            setErrors((prev) => ({
                ...prev,
                confirmPassword: validateRegistrationField("confirmPassword", value, form.password),
            }));
        }
        setError(null);
    };

    const getFormErrors = () => ({
        username: validateRegistrationField("username", form.username),
        ci: validateRegistrationField("ci", form.ci),
        email: validateRegistrationField("email", form.email),
        whatsapp: validateRegistrationField("whatsapp", form.whatsapp),
        password: validateRegistrationField("password", form.password),
        confirmPassword: validateRegistrationField("confirmPassword", form.confirmPassword, form.password),
        politicaPrivacidadAceptada: form.politicaPrivacidadAceptada ? "" : "Debes aceptar la política de privacidad.",
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        const nextErrors = getFormErrors();
        setErrors(nextErrors);

        if (nextErrors.username || nextErrors.ci || nextErrors.email || nextErrors.whatsapp || nextErrors.password || nextErrors.confirmPassword || nextErrors.politicaPrivacidadAceptada) {
            setError("Revisa los campos marcados antes de continuar.");
            return;
        }

        if (!escuelaId) {
            setError("Selecciona una escuela antes de continuar.");
            return;
        }

        try {
            await register({
                ci: form.ci,
                email: form.email,
                username: form.username,
                password: form.password,
                whatsapp: form.whatsapp,
                escuela: Number(escuelaId),
                politica_privacidad_aceptada: form.politicaPrivacidadAceptada,
            });
            setPendingVerification(true);
            setSuccess("Te enviamos un código de verificación a tu correo.");
        } catch (err) {
            setError(err.message || "No se pudo crear la cuenta.");
        }
    };

    const handleVerification = async (event) => {
        event.preventDefault();
        setError(null);
        try {
            await verifyEmail({ username: form.username, code: verificationCode });
            setSuccess("Correo verificado. Ya puedes iniciar sesión.");
            setTimeout(() => navigate("/login"), 1200);
        } catch (err) {
            setError(err.message || "No se pudo verificar el correo.");
        }
    };

    const handlePendingEmailChange = async () => {
        setError(null);
        setSuccess(null);
        setChangingPendingEmail(true);
        try {
            await changePendingEmail({ username: form.username, email: form.email });
            setVerificationCode("");
            setEditingPendingEmail(false);
            setSuccess("Correo actualizado. Te enviamos un nuevo código de verificación.");
        } catch (err) {
            setError(err.message || "No se pudo actualizar el correo.");
        } finally {
            setChangingPendingEmail(false);
        }
    };

    const registrationDisabled = import.meta.env.DEV
        ? registrationOpen === false
        : registrationOpen !== true;

    return (
        <Card as="div" className={styles.wrapper} padding="p-8">
            <div className="mb-6">
                <button type="button" onClick={() => navigate("/")} className={styles.backLink}>
                    ← Volver al inicio
                </button>
            </div>

            <h1 className={styles.title}>
                Registro estudiantil
            </h1>
            <p className={styles.subtitle}>
                Solo estudiantes de 12.º grado pueden registrarse en el sistema.
            </p>
            {!pendingVerification && <div className={styles.registrationNotice} role="note">
                <strong>Antes de registrarte</strong>
                <p>
                    Recopilaremos los datos necesarios para gestionar tu ingreso y te enviaremos un código al correo indicado.
                    La cuenta permanecerá inactiva hasta que confirmes ese código y aceptes la política de privacidad.
                </p>
            </div>}
            {registrationDisabled && <FeedbackMessage type="warning" className="mt-6 rounded-2xl">El registro estudiantil solo está disponible durante la Etapa 1 del proceso de ingreso.</FeedbackMessage>}
            {error && <FeedbackMessage type="error" className="mt-6 rounded-2xl">{error}</FeedbackMessage>}
            {success && <FeedbackMessage type="success" className="mt-6 rounded-2xl">{success}</FeedbackMessage>}
            {pendingVerification ? (
                <form onSubmit={handleVerification} className={styles.verificationForm} noValidate>
                    <p className={styles.verificationHint}>
                        Revisa tu correo e introduce el código de 6 dígitos. La cuenta permanecerá inactiva hasta verificarla.
                    </p>
                    <div className={styles.pendingEmailBox}>
                        <div className={styles.pendingEmailHeader}>
                            <span className={styles.pendingEmailLabel}>Código enviado a</span>
                            {!editingPendingEmail && <button type="button" onClick={() => setEditingPendingEmail(true)} className={styles.changeEmailLink}>Cambiar correo</button>}
                        </div>
                        {editingPendingEmail ? (
                            <div className={styles.pendingEmailEditRow}>
                                <Input type="email" value={form.email} onChange={updateField("email")} className={styles.pendingEmailInput} required invalid={Boolean(errors.email)} aria-describedby={errors.email ? "register-email-error" : undefined} />
                                <PrimaryButton type="button" onClick={handlePendingEmailChange} disabled={changingPendingEmail}>{changingPendingEmail ? "Actualizando..." : "Guardar correo"}</PrimaryButton>
                                <SecondaryButton onClick={() => setEditingPendingEmail(false)}>Cancelar</SecondaryButton>
                            </div>
                        ) : <p className={styles.pendingEmailValue}>{form.email}</p>}
                    </div>
                    <FormField label="Código de verificación" htmlFor="verification-code">
                        <Input
                            id="verification-code"
                            value={verificationCode}
                            onChange={(event) => setVerificationCode(event.target.value)}
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            required
                        />
                    </FormField>
                    <PrimaryButton type="submit">
                        Verificar correo
                    </PrimaryButton>
                </form>
            ) : <form
                onSubmit={handleSubmit}
                inert={registrationDisabled ? "" : undefined}
                className={`${styles.registerForm} ${registrationDisabled ? styles.registerFormDisabled : ""}`}
                noValidate
            >
                <FormField
                    htmlFor="register-username"
                    label="Usuario"
                    required
                    error={errors.username}
                    errorId="register-username-error"
                >
                    <Input
                        id="register-username"
                        value={form.username}
                        onChange={updateField("username")}
                        placeholder="maria.gonzalez25"
                        required
                        invalid={Boolean(errors.username)}
                        aria-describedby={errors.username ? "register-username-error" : undefined}
                    />
                </FormField>
                <FormField
                    htmlFor="register-ci"
                    label="CI"
                    required
                    error={errors.ci}
                    errorId="register-ci-error"
                >
                    <Input
                        id="register-ci"
                        value={form.ci}
                        onChange={updateField("ci")}
                        placeholder="06120000184"
                        maxLength={11}
                        required
                        invalid={Boolean(errors.ci)}
                        aria-describedby={errors.ci ? "register-ci-error" : undefined}
                    />
                </FormField>
                <FormField
                    htmlFor="register-provincia"
                    label="Provincia"
                    required
                >
                    <Select
                        id="register-provincia"
                        value={provinciaId}
                        onChange={(event) => setProvinciaId(event.target.value)}
                        required
                    >
                        <option value="">Selecciona una provincia</option>
                        {provincias.map((provincia) => (
                            <option key={provincia.id} value={provincia.id}>
                                {provincia.nombre}
                            </option>
                        ))}
                    </Select>
                </FormField>
                <FormField
                    htmlFor="register-municipio"
                    label="Municipio"
                    required
                >
                    <Select
                        id="register-municipio"
                        value={municipioId}
                        onChange={(event) => setMunicipioId(event.target.value)}
                        required
                        disabled={!municipios.length}
                    >
                        <option value="">Selecciona un municipio</option>
                        {municipios.map((municipio) => (
                            <option key={municipio.id} value={municipio.id}>
                                {municipio.nombre}
                            </option>
                        ))}
                    </Select>
                </FormField>
                <FormField
                    htmlFor="register-escuela"
                    label="Escuela"
                    className={styles.fieldSpan2}
                    required
                >
                    <Select
                        id="register-escuela"
                        value={escuelaId}
                        onChange={(event) => setEscuelaId(event.target.value)}
                        required
                        disabled={!escuelas.length}
                    >
                        <option value="">Selecciona una escuela</option>
                        {escuelas.map((escuela) => (
                            <option key={escuela.id} value={escuela.id}>
                                {escuela.nombre}
                            </option>
                        ))}
                    </Select>
                </FormField>
                <FormField
                    htmlFor="register-email"
                    label="Correo electrónico"
                    required
                    error={errors.email}
                    errorId="register-email-error"
                >
                    <Input
                        id="register-email"
                        type="email"
                        value={form.email}
                        onChange={updateField("email")}
                        placeholder="maria.gonzalez@correo.com"
                        required
                        invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? "register-email-error" : undefined}
                    />
                </FormField>
                <FormField
                    htmlFor="register-whatsapp"
                    label={<>WhatsApp <span className={styles.optionalHint}>(opcional)</span></>}
                    error={errors.whatsapp}
                    errorId="register-whatsapp-error"
                >
                    <Input
                        id="register-whatsapp"
                        type="tel"
                        value={form.whatsapp}
                        onChange={updateField("whatsapp")}
                        placeholder="+53 5 5555 5555"
                        invalid={Boolean(errors.whatsapp)}
                        aria-describedby={errors.whatsapp ? "register-whatsapp-error" : undefined}
                    />
                </FormField>
                <FormField
                    htmlFor="register-password"
                    label="Contraseña"
                    required
                    error={errors.password}
                    errorId="register-password-error"
                >
                    <div className={styles.passwordField}>
                        <Input
                            id="register-password"
                            type={showPassword ? "text" : "password"}
                            value={form.password}
                            onChange={updateField("password")}
                            className={styles.passwordInput}
                            placeholder="Crea una contraseña"
                            required
                            invalid={Boolean(errors.password)}
                            aria-describedby={errors.password ? "register-password-error" : undefined}
                        />
                        <button type="button" onClick={() => setShowPassword((visible) => !visible)} className={styles.toggleButton} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                            <svg viewBox="0 0 24 24" className={styles.toggleIcon} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                {showPassword ? <><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.5" /></> : <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.5 4 9.5 6a11.8 11.8 0 0 1-4.1 4.5M6.2 6.2C3.9 6.2 2.5 9.5 2.5 10c1 2 4.5 6 9.5 6 1 0 1.9-.2 2.7-.5" />}
                            </svg>
                        </button>
                    </div>
                </FormField>
                <FormField
                    htmlFor="register-confirm-password"
                    label="Repetir contraseña"
                    required
                    error={errors.confirmPassword}
                    errorId="register-confirm-password-error"
                >
                    <div className={styles.passwordField}>
                        <Input
                            id="register-confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={form.confirmPassword}
                            onChange={updateField("confirmPassword")}
                            className={styles.passwordInput}
                            placeholder="Repite la contraseña"
                            required
                            invalid={Boolean(errors.confirmPassword)}
                            aria-describedby={errors.confirmPassword ? "register-confirm-password-error" : undefined}
                        />
                        <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} className={styles.toggleButton} aria-label={showConfirmPassword ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"} title={showConfirmPassword ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"}>
                            <svg viewBox="0 0 24 24" className={styles.toggleIcon} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                {showConfirmPassword ? <><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.5" /></> : <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.5 4 9.5 6a11.8 11.8 0 0 1-4.1 4.5M6.2 6.2C3.9 6.2 2.5 9.5 2.5 10c1 2 4.5 6 9.5 6 1 0 1.9-.2 2.7-.5" />}
                            </svg>
                        </button>
                    </div>
                </FormField>
                <div className={styles.privacyConsentRow}>
                    <label className={styles.privacyConsentLabel} htmlFor="register-privacy-policy">
                        <input
                            id="register-privacy-policy"
                            type="checkbox"
                            checked={form.politicaPrivacidadAceptada}
                            onChange={(event) => {
                                const value = event.target.checked;
                                setForm((prev) => ({ ...prev, politicaPrivacidadAceptada: value }));
                                setErrors((prev) => ({
                                    ...prev,
                                    politicaPrivacidadAceptada: value ? "" : "Debes aceptar la política de privacidad.",
                                }));
                                setError(null);
                            }}
                        />
                        <span>
                            He leído y acepto la <a href="/politica-privacidad" target="_blank" rel="noreferrer">política de privacidad</a> del sistema.
                        </span>
                    </label>
                    {errors.politicaPrivacidadAceptada && <span className={styles.errorText}>{errors.politicaPrivacidadAceptada}</span>}
                </div>
                <PrimaryButton
                    type="submit"
                    className={styles.submitButton}
                >
                    Crear cuenta
                </PrimaryButton>
            </form>}
        </Card>
    );
}
