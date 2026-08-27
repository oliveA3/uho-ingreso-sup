import { useEffect, useState } from "react";
import {
  createMunicipalSchool,
  deleteMunicipalSchool,
  fetchMunicipalSchools,
  fetchMunicipalUsers,
  updateMunicipalSchool,
} from "../../services/api";

const emptyForm = { nombre: "", codigo: "", descripcion: "", activa: true };

export default function EscuelasPage({ user }) {
  const [schools, setSchools] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError("");
      const [schoolData, userData] = await Promise.all([fetchMunicipalSchools(), fetchMunicipalUsers()]);
      setSchools(schoolData);
      setUsers(userData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function openCreate() { setEditing(null); setForm({ ...emptyForm }); setModalOpen(true); }
  function openEdit(school) {
    setEditing(school);
    setForm({ nombre: school.nombre || "", codigo: school.codigo || "", descripcion: school.descripcion || "", activa: school.activa });
    setModalOpen(true);
  }
  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      if (editing) await updateMunicipalSchool(editing.id, form); else await createMunicipalSchool(form);
      setModalOpen(false);
      await loadData(false);
    } catch (requestError) { setError(requestError.message); }
  }
  async function toggleSchool(school) {
    try { await updateMunicipalSchool(school.id, { activa: !school.activa }); await loadData(false); }
    catch (requestError) { setError(requestError.message); }
  }
  async function handleDelete(school) {
    if (!window.confirm(`¿Eliminar la escuela ${school.nombre}?`)) return;
    try { await deleteMunicipalSchool(school.id); await loadData(false); }
    catch (requestError) { setError(requestError.message); }
  }

  const normalizedSearch = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const filteredSchools = schools.filter((school) => `${school.nombre} ${school.codigo || ""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedSearch));
  const activeUsers = users.filter((user) => user.is_active);
  const directors = activeUsers.filter((user) => user.rol === "director_escuela").length;
  const secretaries = activeUsers.filter((user) => user.rol === "secretario_escuela").length;

  return <div className="space-y-6">
    <p className="px-1 text-sm font-semibold text-slate-600">Municipio: {user?.municipio_nombre || "No asignado"}</p>
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Gestión municipal</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Escuelas</h1><p className="mt-2 text-sm text-slate-600">Crea y gestiona las escuelas de tu municipio.</p></div><button type="button" onClick={openCreate} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">+ Nueva escuela</button></div>{error && <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}<div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><p className="text-sm uppercase tracking-[0.18em] text-slate-500">Escuelas</p><p className="mt-3 text-3xl font-semibold text-slate-900">{schools.length}</p><p className="mt-1 text-sm text-slate-500">Registros totales</p></div><div className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><p className="text-sm uppercase tracking-[0.18em] text-slate-500">Secretarios</p><p className="mt-3 text-3xl font-semibold text-slate-900">{secretaries}</p><p className="mt-1 text-sm text-slate-500">Activos</p></div><div className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><p className="text-sm uppercase tracking-[0.18em] text-slate-500">Directores</p><p className="mt-3 text-3xl font-semibold text-slate-900">{directors}</p><p className="mt-1 text-sm text-slate-500">Activos</p></div></div></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o código" className="w-full max-w-md rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" /><div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-slate-500"><tr><th className="px-4 py-3">Escuela</th><th className="px-4 py-3">Código</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr></thead><tbody className="divide-y divide-slate-200">{loading ? <tr><td colSpan="4" className="px-4 py-8 text-center">Cargando escuelas...</td></tr> : filteredSchools.length === 0 ? <tr><td colSpan="4" className="px-4 py-8 text-center">No hay escuelas para mostrar.</td></tr> : filteredSchools.map((school) => <tr key={school.id}><td className="px-4 py-4 font-medium">{school.nombre}</td><td className="px-4 py-4">{school.codigo || "-"}</td><td className="px-4 py-4"><button type="button" onClick={() => toggleSchool(school)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold">{school.activa ? "Activa" : "Inactiva"}</button></td><td className="px-4 py-4"><button type="button" onClick={() => openEdit(school)} className="mr-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold">Editar</button><button type="button" onClick={() => handleDelete(school)} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">Eliminar</button></td></tr>)}</tbody></table></div></section>
    {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><form onSubmit={handleSubmit} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-semibold">{editing ? "Editar escuela" : "Nueva escuela"}</h2><div className="mt-5 space-y-4">{[["Nombre", "nombre"], ["Código", "codigo"], ["Descripción", "descripcion"]].map(([label, field]) => <label key={field} className="block text-sm font-semibold">{label}<input required={field === "nombre"} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label>)}<label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.activa} onChange={(event) => setForm({ ...form, activa: event.target.checked })} /> Escuela activa</label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="rounded-2xl border border-slate-200 px-5 py-3">Cancelar</button><button type="submit" className="rounded-2xl bg-sky-600 px-5 py-3 font-semibold text-white">Guardar</button></div></form></div>}
  </div>;
}
