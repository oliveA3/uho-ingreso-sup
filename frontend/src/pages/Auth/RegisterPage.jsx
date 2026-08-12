import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../../services/api";
import axios from "axios";

export default function RegisterPage() {
    const [form, setForm] = useState({
        username: "",
        ci: "",
        email: "",
        password: "",
        confirmPassword: "",
        whatsapp: "",
    });

    const [provincias, setProvincias] = useState([]);
    const [provinciaId, setProvinciaId] = useState("");
    const [municipios, setMunicipios] = useState([]);
    const [municipioId, setMunicipioId] = useState("");
    const [escuelas, setEscuelas] = useState([]);
    const [escuelaId, setEscuelaId] = useState("");

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get("/api/superadmin/provincias/").then((res) => setProvincias(res.data));
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
            });
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
            });
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
            setSuccess("Registro exitoso. Por favor inicia sesión.");
            setTimeout(() => navigate("/login"), 1200);
        } catch (err) {
            setError(err.message || "No se pudo crear la cuenta.");
        }
    };

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
            {error && (
                <div className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {error}
                </div>
            )}
            {success && (
                <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {success}
                </div>
            )}
            <form
                className="mt-6 grid gap-5 md:grid-cols-2"
                onSubmit={handleSubmit}
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
            </form>
        </div>
    );
}
