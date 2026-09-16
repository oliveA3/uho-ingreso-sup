import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    changePendingEmail,
    fetchRegistrationAvailability,
    fetchSuperAdminCatalog,
    register,
    verifyEmail,
} from "../../services/api";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import { Card, FormField, Input, Select } from "../../components";
import styles from "./RegisterPage.module.css";

export default function RegisterPage() {
    const [form, setForm] = useState({
        username: "",
        ci: "",
        email: "",
        whatsapp: "",
        password: "",
        confirmPassword: "",
    });

    const [provincias, setProvincias] = useState([]);
    const [provinciaId, setProvinciaId] = useState("");
    const [municipios, setMunicipios] = useState([]);
    const [municipioId, setMunicipioId] = useState("");
    const [escuelas, setEscuelas] = useState([]);
    const [escuelaId, setEscuelaId] = useState("");

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
            .then(setProvincias)
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
                setMunicipios(data);
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
                setEscuelas(data);
                setEscuelaId("");
            })
            .catch(() => setError("No se pudieron cargar las escuelas."));
    }, [municipioId]);

    const updateField = (field) => (event) => {
        setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (form.password !== form.confirmPassword) {
            setError("Las contraseñas no coinciden.");
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
                Solo estudiantes de 12grado pueden registrarse.
            </p>
            {registrationDisabled && <FeedbackMessage type="warning" className="mt-6 rounded-2xl">El registro estudiantil solo está disponible durante la Etapa 1 del proceso de ingreso.</FeedbackMessage>}
            {error && <FeedbackMessage type="error" className="mt-6 rounded-2xl">{error}</FeedbackMessage>}
            {success && <FeedbackMessage type="success" className="mt-6 rounded-2xl">{success}</FeedbackMessage>}
            {pendingVerification ? (
                <form onSubmit={handleVerification} className={styles.verificationForm}>
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
                                <Input type="email" value={form.email} onChange={updateField("email")} className={styles.pendingEmailInput} required />
                                <PrimaryButton type="button" onClick={handlePendingEmailChange} disabled={changingPendingEmail}>{changingPendingEmail ? "Actualizando..." : "Guardar correo"}</PrimaryButton>
                                <SecondaryButton onClick={() => setEditingPendingEmail(false)}>Cancelar</SecondaryButton>
                            </div>
                        ) : <p className={styles.pendingEmailValue}>{form.email}</p>}
                    </div>
                    <FormField label="Código de verificación">
                        <Input
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
            >
                <FormField label="Usuario">
                    <Input
                        value={form.username}
                        onChange={updateField("username")}
                        placeholder="maria.gonzalez25"
                        required
                    />
                </FormField>
                <FormField label="CI">
                    <Input
                        value={form.ci}
                        onChange={updateField("ci")}
                        placeholder="06120000184"
                        maxLength={11}
                        required
                    />
                </FormField>
                <FormField label="Provincia">
                    <Select
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
                <FormField label="Municipio">
                    <Select
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
                <FormField label="Escuela" className={styles.fieldSpan2}>
                    <Select
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
                <FormField label="Correo electrónico">
                    <Input
                        type="email"
                        value={form.email}
                        onChange={updateField("email")}
                        placeholder="maria.gonzalez@correo.com"
                        required
                    />
                </FormField>
                <FormField label={<>WhatsApp <span className={styles.optionalHint}>(opcional)</span></>}>
                    <Input
                        type="tel"
                        value={form.whatsapp}
                        onChange={updateField("whatsapp")}
                        placeholder="+53 5 5555 5555"
                    />
                </FormField>
                <FormField label="Contraseña">
                    <div className={styles.passwordField}>
                        <Input
                            type={showPassword ? "text" : "password"}
                            value={form.password}
                            onChange={updateField("password")}
                            className={styles.passwordInput}
                            placeholder="Crea una contraseña"
                            required
                        />
                        <button type="button" onClick={() => setShowPassword((visible) => !visible)} className={styles.toggleButton} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                            <svg viewBox="0 0 24 24" className={styles.toggleIcon} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                {showPassword ? <><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.5" /></> : <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.5 4 9.5 6a11.8 11.8 0 0 1-4.1 4.5M6.2 6.2C3.9 6.2 2.5 9.5 2.5 10c1 2 4.5 6 9.5 6 1 0 1.9-.2 2.7-.5" />}
                            </svg>
                        </button>
                    </div>
                </FormField>
                <FormField label="Repetir contraseña">
                    <div className={styles.passwordField}>
                        <Input
                            type={showConfirmPassword ? "text" : "password"}
                            value={form.confirmPassword}
                            onChange={updateField("confirmPassword")}
                            className={styles.passwordInput}
                            placeholder="Repite la contraseña"
                            required
                        />
                        <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} className={styles.toggleButton} aria-label={showConfirmPassword ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"} title={showConfirmPassword ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"}>
                            <svg viewBox="0 0 24 24" className={styles.toggleIcon} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                {showConfirmPassword ? <><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.5" /></> : <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.5 4 9.5 6a11.8 11.8 0 0 1-4.1 4.5M6.2 6.2C3.9 6.2 2.5 9.5 2.5 10c1 2 4.5 6 9.5 6 1 0 1.9-.2 2.7-.5" />}
                            </svg>
                        </button>
                    </div>
                </FormField>
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
