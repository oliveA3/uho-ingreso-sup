import { useEffect, useState } from "react";
import { createMunicipalUser, deleteMunicipalUser, fetchMunicipalSchools, fetchMunicipalUsers, updateMunicipalUser } from "../../services/api";

const emptyForm = { username: "", email: "", first_name: "", last_name: "", rol: "director_escuela", escuela: "", password: "" };
const nameOf = (user) => `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;

export default function UsuariosPage() {
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [userData, schoolData] = await Promise.all([fetchMunicipalUsers(), fetchMunicipalSchools()]);
      setUsers(userData);
      setSchools(schoolData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function openCreate() { setEditing(null); setForm({ ...emptyForm }); setModalOpen(true); }
  function openEdit(user) {
    setEditing(user);
    setForm({ username: user.username || "", email: user.email || "", first_name: user.first_name || "", last_name: user.last_name || "", rol: user.rol, escuela: String(user.escuela || ""), password: "" });
    setModalOpen(true);
  }
  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      const payload = { ...form, escuela: Number(form.escuela) };
      if (!payload.password) delete payload.password;
      if (editing) await updateMunicipalUser(editing.id, payload); else await createMunicipalUser(payload);
      setModalOpen(false);
      await loadData();
    } catch (requestError) { setError(requestError.message); }
  }
  async function toggleUser(user) {
    try { await updateMunicipalUser(user.id, { is_active: !user.is_active }); await loadData(); }
    catch (requestError) { setError(requestError.message); }
  }
  async function handleDelete(user) {
    if (!window.confirm(`¿Eliminar el usuario ${nameOf(user)}?`)) return;
    try { await deleteMunicipalUser(user.id); await loadData(); }
    catch (requestError) { setError(requestError.message); }
  }

  const filteredUsers = users.filter((user) => `${nameOf(user)} ${user.username} ${user.email} ${user.escuela_nombre}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="municipal-users-page space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Gestión</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Usuarios</h1><p className="mt-2 text-sm text-slate-600">Crea Director y Secretario por escuela.</p></div><button type="button" onClick={openCreate} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">+ Nuevo usuario</button></div>{error && <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}</section>
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo o escuela" className="w-full max-w-md rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" /><div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-slate-500"><tr><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Escuela</th><th className="px-4 py-3">Rol</th><th className="px-4 py-3">Correo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="px-4 py-8 text-center">Cargando usuarios...</td></tr> : filteredUsers.length === 0 ? <tr><td colSpan="6" className="px-4 py-8 text-center">No hay usuarios para mostrar.</td></tr> : filteredUsers.map((user) => <tr key={user.id} className="border-b border-slate-200"><td className="px-4 py-4 font-medium">{nameOf(user)}</td><td className="px-4 py-4">{user.escuela_nombre || "-"}</td><td className="px-4 py-4">{user.rol_label}</td><td className="px-4 py-4">{user.email}</td><td className="px-4 py-4"><button type="button" onClick={() => toggleUser(user)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold">{user.is_active ? "Activo" : "Inactivo"}</button></td><td className="px-4 py-4"><button type="button" onClick={() => openEdit(user)} className="mr-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold">Editar</button><button type="button" onClick={() => handleDelete(user)} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">Eliminar</button></td></tr>)}</tbody></table></div></section>
    {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-semibold">{editing ? "Editar usuario" : "Nuevo usuario"}</h2><div className="mt-5 space-y-4">{[["Nombre", "first_name"], ["Apellidos", "last_name"], ["Usuario", "username"], ["Correo", "email"]].map(([label, field]) => <label key={field} className="block text-sm font-semibold">{label}<input required value={form[field]} type={field === "email" ? "email" : "text"} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label>)}<label className="block text-sm font-semibold">Rol<select required value={form.rol} onChange={(event) => setForm({ ...form, rol: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal"><option value="director_escuela">Director de Escuela</option><option value="secretario_escuela">Secretario de Escuela</option></select></label><label className="block text-sm font-semibold">Escuela<select required value={form.escuela} onChange={(event) => setForm({ ...form, escuela: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal"><option value="">Selecciona una escuela</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.nombre}</option>)}</select></label><label className="block text-sm font-semibold">Contraseña{editing && <span className="font-normal text-slate-500"> (dejar vacía para conservarla)</span>}<input required={!editing} minLength="8" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="rounded-2xl border border-slate-200 px-5 py-3">Cancelar</button><button type="submit" className="rounded-2xl bg-sky-600 px-5 py-3 font-semibold text-white">Guardar</button></div></form></div>}
  </div>;
}
