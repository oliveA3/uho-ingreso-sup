import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage";
import { fetchStudentProfile, updateStudentProfile } from "../../services/api";

const editableFields = [
  { name: "direccion", label: "Dirección", type: "text" },
  { name: "email", label: "Correo", type: "email" },
  { name: "whatsapp", label: "WhatsApp", type: "tel" },
  { name: "tutor_nombre", label: "Nombre del tutor", type: "text" },
  { name: "tutor_email", label: "Correo del tutor", type: "email" },
  { name: "tutor_telefono", label: "Teléfono del tutor", type: "tel" },
];

export default function EstudiantePerfilPage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudentProfile()
      .then((data) => {
        setProfile(data);
        setForm(Object.fromEntries(editableFields.map(({ name }) => [name, data[name] || ""])));
      })
      .catch((error) => setMessage({ type: "error", text: error.message }));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const data = await updateStudentProfile(form);
      setProfile(data);
      setMessage({ type: "success", text: "Los datos del perfil fueron actualizados." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">Cargando perfil...</div>;

  const fixedFields = [
    ["Nombre", profile.nombre],
    ["Apellidos", profile.apellidos],
    ["CI", profile.ci],
    ["Sexo", profile.sexo === "F" ? "Femenino" : "Masculino"],
    ["Escuela", profile.escuela],
    ["Provincia", profile.provincia],
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mi Perfil</h1>
          <p className="mt-2 text-sm text-slate-600">Datos personales y de contacto.</p>
        </div>

        {message && <FeedbackMessage type={message.type} className="mt-5 rounded-2xl">{message.text}</FeedbackMessage>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fixedFields.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{value || "-"}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 border-t border-slate-200 pt-6">
          <h2 className="text-base font-semibold text-slate-900">Datos editables</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {editableFields.map(({ name, label, type }) => (
              <label key={name} className="text-sm font-medium text-slate-700">
                <span className="mb-1 block">{label}</span>
                <input name={name} type={type} value={form[name] || ""} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500" />
              </label>
            ))}
          </div>
          <button type="submit" disabled={saving} className="mt-6 rounded-2xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </section>
    </div>
  );
}
