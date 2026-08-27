import { useEffect, useState } from "react";
import {
  createProvincialSchool,
  deleteProvincialSchool,
  fetchProvincialDashboard,
  fetchProvincialMunicipalities,
  fetchProvincialProvinces,
  fetchProvincialSchools,
  updateProvincialSchool,
} from "../../services/api";
import FeedbackMessage from "../../components/FeedbackMessage";

const emptySchool = {
  nombre: "",
  codigo: "",
  descripcion: "",
  provincia: "",
  municipio: "",
  activa: true,
};

export default function MunicipiosPage({ user }) {
  const [dashboard, setDashboard] = useState(null);
  const [schools, setSchools] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [form, setForm] = useState(emptySchool);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMunicipio, setSelectedMunicipio] = useState(null);
  const [municipioSearch, setMunicipioSearch] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [dashboardData, schoolData] = await Promise.all([
        fetchProvincialDashboard(),
        fetchProvincialSchools(),
      ]);
      setDashboard(dashboardData);
      setSchools(schoolData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    fetchProvincialProvinces()
      .then((data) => {
        setProvinces(data);
        if (data.length === 1) {
          setForm((current) => ({ ...current, provincia: String(data[0].id) }));
        }
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    setMunicipalities([]);
    if (!form.provincia) return;
    fetchProvincialMunicipalities(form.provincia)
      .then(setMunicipalities)
      .catch((requestError) => setError(requestError.message));
  }, [form.provincia]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptySchool,
      provincia: selectedMunicipio?.provincia
        ? String(selectedMunicipio.provincia)
        : provinces.length === 1
          ? String(provinces[0].id)
          : "",
      municipio: selectedMunicipio ? String(selectedMunicipio.id) : "",
    });
    setModalOpen(true);
  }

  function openEdit(school) {
    const municipality = (dashboard?.municipios_lista || []).find(
      (item) => item.id === school.municipio
    );
    setEditing(school);
    setForm({
      nombre: school.nombre || "",
      codigo: school.codigo || "",
      descripcion: school.descripcion || "",
      provincia: municipality?.provincia ? String(municipality.provincia) : String(provinces[0]?.id || ""),
      municipio: String(school.municipio || ""),
      activa: school.activa,
    });
    setModalOpen(true);
  }

  function schoolsForMunicipio(municipioId) {
    return schools.filter((school) => school.municipio === municipioId);
  }

  function normalizeSearch(value) {
    return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      const { provincia, ...schoolFields } = form;
      const payload = { ...schoolFields, municipio: Number(form.municipio) };
      if (editing) await updateProvincialSchool(editing.id, payload);
      else await createProvincialSchool(payload);
      setModalOpen(false);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleDelete(school) {
    if (!window.confirm(`¿Eliminar la escuela ${school.nombre}?`)) return;
    try {
      await deleteProvincialSchool(school.id);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleSchool(school) {
    try {
      await updateProvincialSchool(school.id, { activa: !school.activa });
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const stats = [
    [dashboard?.municipios ?? "-", "Municipios"],
    [dashboard?.escuelas ?? "-", "Escuelas"],
    [dashboard?.representantes_municipales ?? "-", "Repr. Municipales"],
    [dashboard?.representantes_municipales ?? "-", "Usuarios Creados"],
  ];
  const normalizedMunicipioSearch = normalizeSearch(municipioSearch);
  const filteredMunicipios = (dashboard?.municipios_lista || []).filter((municipio) =>
    normalizeSearch(municipio.nombre).includes(normalizedMunicipioSearch)
  );
  const normalizedSchoolSearch = normalizeSearch(schoolSearch);
  const filteredSchools = selectedMunicipio
    ? schoolsForMunicipio(selectedMunicipio.id).filter((school) =>
        normalizeSearch(`${school.nombre} ${school.codigo || ""}`).includes(normalizedSchoolSearch)
      )
    : [];

  return (
    <div className="space-y-6">
      <p className="px-1 text-sm font-semibold text-slate-600">Provincia: {user?.provincia_nombre || "No asignada"}</p>
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Municipios y Escuelas</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Estructura territorial de la provincia</h1>
            <p className="mt-2 text-sm text-slate-600">Gestiona las escuelas de tu provincia.</p>
          </div>
        </div>
        {error && <FeedbackMessage type="error" className="mt-5 rounded-2xl">{error}</FeedbackMessage>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(([value, label]) => <div key={label} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center"><div className="text-3xl font-semibold text-slate-900">{value}</div><div className="mt-2 text-sm text-slate-600">{label}</div></div>)}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-xl font-semibold text-slate-900">Municipios</h2><p className="mt-1 text-sm text-slate-600">Selecciona un municipio para ver sus escuelas.</p></div>
        </div>
        <label className="mt-5 block max-w-md text-sm font-semibold text-slate-700">Buscar municipio<input type="search" value={municipioSearch} onChange={(event) => setMunicipioSearch(event.target.value)} placeholder="Nombre del municipio" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label>
        <div className="table-scroll mt-5"><table className="min-w-full border-collapse text-sm"><thead><tr className="bg-slate-100 text-left text-slate-700"><th className="px-4 py-3">Municipio</th><th className="px-4 py-3">Escuelas</th><th className="px-4 py-3">Representante Municipal</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr></thead><tbody>
          {filteredMunicipios.map((municipio) => <tr key={municipio.id} className="border-b border-slate-200 hover:bg-slate-50"><td className="px-4 py-3 font-medium text-slate-900">{municipio.nombre}</td><td className="px-4 py-3 text-slate-700">{municipio.escuelas_count}</td><td className="px-4 py-3 text-slate-700">{municipio.representante?.nombre || "Sin representante"}</td><td className="px-4 py-3 text-slate-700">{municipio.activo ? "Activo" : "Inactivo"}</td><td className="px-4 py-3"><button type="button" onClick={() => setSelectedMunicipio(municipio)} className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">👁 Ver escuelas</button></td></tr>)}
        </tbody></table></div>
      </section>

      {selectedMunicipio && <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"><div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-900">Escuelas de {selectedMunicipio.nombre}</h2><p className="mt-1 text-sm text-slate-600">Las escuelas sí pueden editarse.</p></div><button type="button" onClick={() => openCreate()} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">+ Agregar Escuela</button></div><label className="mt-5 block max-w-md text-sm font-semibold text-slate-700">Buscar escuela<input type="search" value={schoolSearch} onChange={(event) => setSchoolSearch(event.target.value)} placeholder="Nombre o código" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label><div className="table-scroll mt-5 overflow-x-auto"><table className="min-w-full border-collapse text-sm"><thead><tr className="bg-slate-100 text-left text-slate-700"><th className="px-4 py-3">Escuela</th><th className="px-4 py-3">Código</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr></thead><tbody>{filteredSchools.map((school) => <tr key={school.id} className="border-b border-slate-200"><td className="px-4 py-3 font-medium">{school.nombre}</td><td className="px-4 py-3">{school.codigo || "-"}</td><td className="px-4 py-3"><button type="button" onClick={() => toggleSchool(school)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold">{school.activa ? "Activo" : "Inactivo"}</button></td><td className="px-4 py-3"><button type="button" onClick={() => openEdit(school)} className="mr-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold">Editar</button><button type="button" onClick={() => handleDelete(school)} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">Eliminar</button></td></tr>)}</tbody></table></div></section>}

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><form onSubmit={handleSubmit} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-semibold text-slate-900">{editing ? "Editar escuela" : "Nueva escuela"}</h2><div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-slate-700">Nombre<input required value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label><label className="block text-sm font-semibold text-slate-700">Código<input value={form.codigo} onChange={(event) => setForm({ ...form, codigo: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label><label className="block text-sm font-semibold text-slate-700">Descripción<input value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label><label className="block text-sm font-semibold text-slate-700">Municipio<select required value={form.municipio} onChange={(event) => setForm({ ...form, municipio: event.target.value })} disabled={!form.provincia} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal disabled:bg-slate-100"><option value="">Selecciona un municipio</option>{municipalities.map((municipio) => <option key={municipio.id} value={municipio.id}>{municipio.nombre}</option>)}</select></label><label className="flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.activa} onChange={(event) => setForm({ ...form, activa: event.target.checked })} className="h-5 w-5" /> Escuela activa</label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold">Cancelar</button><button type="submit" className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">Guardar</button></div></form></div>}
    </div>
  );
}
