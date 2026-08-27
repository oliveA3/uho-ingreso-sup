import { useEffect, useState } from "react";
import {
  createProvincialUser,
  deleteProvincialUser,
  fetchProvincialMunicipalities,
  fetchProvincialUsers,
  updateProvincialUser,
} from "../../services/api";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import StatusToggle from "../../components/Buttons/StatusToggle";

const emptyForm = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  municipio: "",
  password: "",
};

function displayName(user) {
  return `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function UsuariosPage() {
  const [users, setUsers] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");
      setUsers(await fetchProvincialUsers());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    fetchProvincialMunicipalities()
      .then(setMunicipios)
      .catch((requestError) => setError(requestError.message));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  }

  function openEdit(user) {
    setEditing(user);
    setForm({
      username: user.username || "",
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      municipio: String(user.municipio || ""),
      password: "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      const payload = { ...form, municipio: Number(form.municipio) };
      if (!payload.password) delete payload.password;
      if (editing) await updateProvincialUser(editing.id, payload);
      else await createProvincialUser(payload);
      setModalOpen(false);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleUser(user) {
    try {
      setError("");
      await updateProvincialUser(user.id, { is_active: !user.is_active });
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`¿Eliminar el usuario ${displayName(user)}?`)) return;
    try {
      setError("");
      await deleteProvincialUser(user.id);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = normalize(
      `${displayName(user)} ${user.username} ${user.email} ${user.municipio_nombre}`
    ).includes(normalize(search));
    const matchesStatus = !statusFilter || (statusFilter === "activo" ? user.is_active : !user.is_active);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Usuarios</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Representantes municipales</h1>
            <p className="mt-2 text-sm text-slate-600">Gestiona los usuarios de los municipios de tu provincia.</p>
          </div>
          <button type="button" onClick={openCreate} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">+ Nuevo</button>
        </div>
        {error && <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" placeholder="Buscar por nombre, usuario, correo o municipio" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
        <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-slate-500"><tr><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Municipio</th><th className="px-4 py-3">Correo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">Cargando usuarios...</td></tr> : filteredUsers.length === 0 ? <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No hay usuarios para mostrar.</td></tr> : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 font-medium text-slate-900">{displayName(user)}</td>
                  <td className="px-4 py-4 text-slate-600">{user.municipio_nombre || "-"}</td>
                  <td className="px-4 py-4 text-slate-600">{user.email}</td>
                  <td className="px-4 py-4"><StatusToggle active={user.is_active} onClick={() => toggleUser(user)} /></td>
                  <td className="px-4 py-4"><EntityActionButton variant="edit" onClick={() => openEdit(user)}>Editar</EntityActionButton><EntityActionButton variant="delete" className="ml-2" onClick={() => handleDelete(user)}>Eliminar</EntityActionButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-semibold text-slate-900">{editing ? "Editar representante" : "Nuevo representante"}</h2><div className="mt-5 space-y-4">{[["Nombre", "first_name"], ["Apellidos", "last_name"], ["Usuario", "username"], ["Correo", "email"]].map(([label, field]) => <label key={field} className="block text-sm font-semibold text-slate-700">{label}<input required value={form[field]} type={field === "email" ? "email" : "text"} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label>)}<label className="block text-sm font-semibold text-slate-700">Municipio<select required value={form.municipio} onChange={(event) => setForm({ ...form, municipio: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal"><option value="">Selecciona un municipio</option>{municipios.map((municipio) => <option key={municipio.id} value={municipio.id}>{municipio.nombre}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700">Contraseña{editing && <span className="font-normal text-slate-500"> (dejar vacía para conservarla)</span>}<input required={!editing} minLength="8" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold">Cancelar</button><button type="submit" className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">Guardar</button></div></form></div>}
    </div>
  );
}
