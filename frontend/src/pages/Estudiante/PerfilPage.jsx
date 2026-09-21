import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import { Card, FormField, Input } from "../../components";
import { fetchStudentProfile, updateStudentProfile } from "../../api/student.service";
import styles from "./PerfilPage.module.css";

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

  if (!profile) return <Card padding="p-8" className="text-sm text-slate-600">Cargando perfil...</Card>;

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
      <Card padding="p-6 sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mi Perfil</h1>
          <p className="mt-2 text-sm text-slate-600">Datos personales y de contacto.</p>
        </div>

        {message && <FeedbackMessage type={message.type} className="mt-5 rounded-2xl">{message.text}</FeedbackMessage>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fixedFields.map(([label, value]) => (
            <div key={label} className={styles.fixedFieldCard}>
              <p className={styles.fixedFieldLabel}>{label}</p>
              <p className={styles.fixedFieldValue}>{value || "-"}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className={styles.editableForm}>
          <h2 className="text-base font-semibold text-slate-900">Datos editables</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {editableFields.map(({ name, label, type }) => (
              <FormField key={name} htmlFor={name} label={<span className={styles.editableFieldLabel}>{label}</span>}>
                <Input id={name} name={name} type={type} value={form[name] || ""} onChange={handleChange} />
              </FormField>
            ))}
          </div>
          <PrimaryButton type="submit" disabled={saving} className="mt-6">
            {saving ? "Guardando..." : "Guardar cambios"}
          </PrimaryButton>
        </form>
      </Card>
    </div>
  );
}
