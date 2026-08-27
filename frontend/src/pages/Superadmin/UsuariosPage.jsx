import { useEffect, useState } from "react";
import {
  createSuperAdminUser,
  deleteSuperAdminUser,
  fetchSuperAdminCatalog,
  fetchSuperAdminUsers,
  updateSuperAdminUser,
} from "../../services/api";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import StatusToggle from "../../components/Buttons/StatusToggle";
import FeedbackMessage from "../../components/FeedbackMessage";

const roles = [
  ["superadmin", "Super Administrador"],
  ["jefe_comision", "Jefe de Comisión"],
  ["ingreso_provincial", "Repr. Provincial"],
  ["ingreso_municipal", "Repr. Municipal"],
  ["director_escuela", "Director de Escuela"],
  ["secretario_escuela", "Secretario de Escuela"],
];

const emptyForm = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  rol: "secretario_escuela",
  provincia: "",
  municipio: "",
  escuela: "",
  password: "",
  is_active: true,
};

export default function UsuariosPage() {
  const [users, setUsers] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [schools, setSchools] = useState([]);
  const [filters, setFilters] = useState({ rol: "", provincia: "", estado: "" });
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");
      setUsers(await fetchSuperAdminUsers(filters));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSuperAdminCatalog("provincias")
      .then(setProvinces)
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    setMunicipalities([]);
    setSchools([]);
    if (!form.provincia) return;
    fetchSuperAdminCatalog("municipios", { provincia: form.provincia })
      .then(setMunicipalities)
      .catch((requestError) => setError(requestError.message));
  }, [form.provincia]);

  useEffect(() => {
    setSchools([]);
    if (!form.municipio) return;
    fetchSuperAdminCatalog("escuelas", { municipio: form.municipio })
      .then(setSchools)
      .catch((requestError) => setError(requestError.message));
  }, [form.municipio]);

  const needsMunicipality = form.rol === "ingreso_municipal" || form.rol === "director_escuela" || form.rol === "secretario_escuela";
  const needsSchool = form.rol === "director_escuela" || form.rol === "secretario_escuela";

  useEffect(() => {
    loadUsers();
  }, [filters.rol, filters.provincia, filters.estado]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowPassword(false);
    setModalOpen(true);
  }

  function openEdit(user) {
    setEditing(user);
    setForm({
      username: user.username || "",
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      rol: user.rol || "superadmin",
      provincia: user.provincia || "",
      municipio: user.municipio || "",
      escuela: user.escuela || "",
      password: "",
      is_active: user.is_active,
    });
    setShowPassword(false);
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      const payload = {
        ...form,
        username: form.username.trim(),
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
      };
      ["provincia", "municipio", "escuela"].forEach((field) => {
        payload[field] = payload[field] ? Number(payload[field]) : null;
      });
      if (payload.rol === "superadmin") {
        payload.provincia = null;
        payload.municipio = null;
        payload.escuela = null;
      }
      if (!payload.password) delete payload.password;
      if (editing) {
        delete payload.username;
        await updateSuperAdminUser(editing.id, payload);
      } else {
        await createSuperAdminUser(payload);
      }
      setModalOpen(false);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleActive(user) {
    try {
      setError("");
      await updateSuperAdminUser(user.id, { is_active: !user.is_active });
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`¿Eliminar el usuario ${user.username}?`)) return;
    try {
      setError("");
      await deleteSuperAdminUser(user.id);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">👥 Usuarios</h1>
            <p className="mt-2 text-sm text-slate-600">Gestión global de usuarios en todo el sistema.</p>
          </div>
          <button type="button" onClick={openCreate} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">+ Nuevo usuario</button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <label className="space-y-2 text-sm text-slate-700">Rol
            <select value={filters.rol} onChange={(event) => setFilters({ ...filters, rol: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <option value="">Todos</option>
              {roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-700">Provincia
            <select value={filters.provincia} onChange={(event) => setFilters({ ...filters, provincia: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <option value="">Todas</option>
              {provinces.map((province) => <option key={province.id} value={province.id}>{province.nombre}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-700">Estado
            <select value={filters.estado} onChange={(event) => setFilters({ ...filters, estado: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </label>
        </div>

        {error && <FeedbackMessage type="error" className="mt-5 rounded-2xl">{error}</FeedbackMessage>}
        <div className="table-scroll mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead><tr className="bg-slate-100 text-left text-slate-700"><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Rol</th><th className="px-4 py-3">Alcance</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{user.username}</td>
                  <td className="px-4 py-3 text-slate-700">{[user.first_name, user.last_name].filter(Boolean).join(" ") || "Sin nombre"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">{user.rol_label}</span></td>
                  <td className="px-4 py-3 text-slate-700">{user.provincia_nombre || user.municipio_nombre || user.escuela_nombre || "Global"}</td>
                  <td className="px-4 py-3"><StatusToggle active={user.is_active} onClick={() => toggleActive(user)} /></td>
                  <td className="px-4 py-3"><EntityActionButton variant="edit" onClick={() => openEdit(user)}>Editar</EntityActionButton><EntityActionButton variant="delete" className="ml-2" onClick={() => handleDelete(user)}>Eliminar</EntityActionButton></td>
                </tr>
              ))}
              {!loading && !users.length && <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No hay usuarios para estos filtros.</td></tr>}
              {loading && <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">Cargando usuarios...</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-900">{editing ? "Editar usuario" : "Nuevo usuario"}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {["username", "email", "first_name", "last_name"].map((field) => <label key={field} className="text-sm font-semibold text-slate-700">{field === "first_name" ? "Nombre" : field === "last_name" ? "Apellidos" : field === "email" ? "Correo" : "Usuario"}<input required={!editing || field !== "username"} disabled={editing && field === "username"} type={field === "email" ? "email" : "text"} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label>)}
              <label className="text-sm font-semibold text-slate-700">Rol<select required value={form.rol} onChange={(event) => { const role = event.target.value; setForm({ ...form, rol: role, provincia: "", municipio: "", escuela: "" }); }} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal">{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {form.rol !== "superadmin" && <label className="text-sm font-semibold text-slate-700">Provincia{(needsMunicipality || needsSchool) && <span className="text-rose-600"> *</span>}<select required={needsMunicipality || needsSchool} value={form.provincia} onChange={(event) => setForm({ ...form, provincia: event.target.value, municipio: "", escuela: "" })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal"><option value="">Sin asignar</option>{provinces.map((province) => <option key={province.id} value={province.id}>{province.nombre}</option>)}</select></label>}
              {needsMunicipality && <label className="text-sm font-semibold text-slate-700">Municipio <span className="text-rose-600">*</span><select required value={form.municipio} onChange={(event) => setForm({ ...form, municipio: event.target.value, escuela: "" })} disabled={!form.provincia} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal disabled:bg-slate-100"><option value="">Selecciona un municipio</option>{municipalities.map((municipality) => <option key={municipality.id} value={municipality.id}>{municipality.nombre}</option>)}</select></label>}
              {needsSchool && <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Escuela <span className="text-rose-600">*</span><select required value={form.escuela} onChange={(event) => setForm({ ...form, escuela: event.target.value })} disabled={!form.municipio} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal disabled:bg-slate-100"><option value="">Selecciona una escuela</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.nombre}</option>)}</select></label>}
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 sm:col-span-2">
                <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                Usuario activo
              </label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Contraseña{editing && <span className="font-normal text-slate-500"> (dejar vacía para conservarla)</span>}
                <div className="relative mt-2">
                  <input required={!editing} minLength="8" type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-24 font-normal" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-lg text-slate-600 hover:bg-slate-100" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                    <span className={showPassword ? "" : "line-through decoration-2 opacity-60"} aria-hidden="true">👁</span>
                  </button>
                </div>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold">Cancelar</button><button type="submit" className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">Guardar</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
