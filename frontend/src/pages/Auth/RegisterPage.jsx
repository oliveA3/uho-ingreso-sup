import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRegistrationAvailability, register, verifyEmail } from "../../services/api";
import axios from "axios";
import FeedbackMessage from "../../components/FeedbackMessage";

export default function RegisterPage() {
    const [form, setForm] = useState({
        username: "",
        ci: "",
        email: "",
        password: "",
        confirmPassword: "",
        whatsapp: "",
        tutor_nombre: "",
        tutor_email: "",
        tutor_telefono: "",
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
    const navigate = useNavigate();

    useEffect(() => {
        axios.get("/api/superadmin/provincias/")
            .then((res) => setProvincias(res.data))
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

        axios
            .get(`/api/superadmin/municipios/?provincia=${provinciaId}`)
            .then((res) => {
                setMunicipios(res.data);
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

        axios
            .get(`/api/superadmin/escuelas/?municipio=${municipioId}`)
            .then((res) => {
                setEscuelas(res.data);
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
                tutor_nombre: form.tutor_nombre,
                tutor_email: form.tutor_email,
                tutor_telefono: form.tutor_telefono,
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

    const registrationDisabled = import.meta.env.DEV
        ? registrationOpen === false
        : registrationOpen !== true;

    return (
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 my-10 shadow-sm">
            {/* Botón Volver al Landing Page */}
            <div className="mb-6">
                <button
                    onClick={() => navigate("/")} // Asumiendo que "/" es tu landing page
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
                >
                    ← Volver al inicio
                </button>
            </div>

            <h1 className="text-2xl font-semibold text-slate-900">
                Registro estudiantil
            </h1>
            <p className="mt-2 text-sm text-slate-600">
                Solo estudiantes de 12grado pueden registrarse.
            </p>
            {registrationDisabled && <FeedbackMessage type="warning" className="mt-6 rounded-2xl">El registro estudiantil estará disponible durante la Etapa 1 o la Etapa 2 del proceso de ingreso.</FeedbackMessage>}
            {error && <FeedbackMessage type="error" className="mt-6 rounded-2xl">{error}</FeedbackMessage>}
            {success && <FeedbackMessage type="success" className="mt-6 rounded-2xl">{success}</FeedbackMessage>}
            {pendingVerification ? (
                <form onSubmit={handleVerification} className="mt-6 space-y-5">
                    <p className="text-sm text-slate-600">
                        Revisa tu correo e introduce el código de 6 dígitos. La cuenta permanecerá inactiva hasta verificarlo.
                    </p>
                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Código de verificación</span>
                        <input
                            value={verificationCode}
                            onChange={(event) => setVerificationCode(event.target.value)}
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            required
                        />
                    </label>
                    <button type="submit" className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
                        Verificar correo
                    </button>
                </form>
            ) : <form
                onSubmit={handleSubmit}
                inert={registrationDisabled ? "" : undefined}
                className={`mt-6 grid gap-5 md:grid-cols-2 ${registrationDisabled ? "pointer-events-none opacity-50 grayscale" : ""}`}
            >
                <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                        Usuario
                    </span>
                    <input
                        value={form.username}
                        onChange={updateField("username")}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                        placeholder="maria.gonzalez25"
                        required
                    />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                        CI
                    </span>
                    <input
                        value={form.ci}
                        onChange={updateField("ci")}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                        placeholder="06120000184"
                        maxLength={11}
                        required
                    />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Nombre del tutor</span>
                    <input value={form.tutor_nombre} onChange={updateField("tutor_nombre")} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none" />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Correo del tutor</span>
                    <input type="email" value={form.tutor_email} onChange={updateField("tutor_email")} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none" />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Teléfono del tutor</span>
                    <input value={form.tutor_telefono} onChange={updateField("tutor_telefono")} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none" />
                </label>
                <label className="block md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">
                        Provincia
                    </span>
                    <select
                        value={provinciaId}
                        onChange={(event) => setProvinciaId(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                        required
                    >
                        <option value="">Selecciona una provincia</option>
                        {provincias.map((provincia) => (
                            <option key={provincia.id} value={provincia.id}>
                                {provincia.nombre}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                        Municipio
                    </span>
                    <select
                        value={municipioId}
                        onChange={(event) => setMunicipioId(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                        required
                        disabled={!municipios.length}
                    >
                        <option value="">Selecciona un municipio</option>
                        {municipios.map((municipio) => (
                            <option key={municipio.id} value={municipio.id}>
                                {municipio.nombre}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="block md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">
                        Escuela
                    </span>
                    <select
                        value={escuelaId}
                        onChange={(event) => setEscuelaId(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                        required
                        disabled={!escuelas.length}
                    >
                        <option value="">Selecciona una escuela</option>
                        {escuelas.map((escuela) => (
                            <option key={escuela.id} value={escuela.id}>
                                {escuela.nombre}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="block md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">
                        Correo electrónico
                    </span>
                    <input
                        type="email"
                        value={form.email}
                        onChange={updateField("email")}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                        required
                    />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                        Whatsapp (opcional)
                    </span>
                    <input
                        value={form.whatsapp}
                        onChange={updateField("whatsapp")}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                        placeholder="+53 5 5555 5555"
                    />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                        Contraseña
                    </span>
                    <input
                        type="password"
                        value={form.password}
                        onChange={updateField("password")}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                        required
                    />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                        Repetir contraseña
                    </span>
                    <input
                        type="password"
                        value={form.confirmPassword}
                        onChange={updateField("confirmPassword")}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                        required
                    />
                </label>
                <button
                    type="submit"
                    className="md:col-span-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                    Crear cuenta
                </button>
            </form>}
        </div>
    );
}
