import { useEffect, useState } from "react";
import {
  createProvincialCareer,
  deleteProvincialCareer,
  exportProvincialCareers,
  fetchProvincialCareers,
  fetchProvincialCes,
  fetchProvincialProvinces,
  importProvincialCareers,
  updateProvincialCareer,
} from "../../services/api";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import StatusToggle from "../../components/Buttons/StatusToggle";

const emptyForm = { codigo: "", nombre: "", ces: "", provincia: "" };
const normalize = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function CarrerasPage() {
  const [careers, setCareers] = useState([]);
  const [ces, setCes] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadCareers(showLoading = true) {
    try { if (showLoading) setLoading(true); setError(""); setCareers(await fetchProvincialCareers()); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    loadCareers();
    Promise.all([fetchProvincialProvinces(), fetchProvincialCes()]).then(([provinceData, cesData]) => { setProvinces(provinceData); setCes(cesData); }).catch((requestError) => setError(requestError.message));
  }, []);
  function openCreate() { setEditing(null); setForm({ ...emptyForm }); setModalOpen(true); }
  function openEdit(career) { setEditing(career); setForm({ codigo: career.codigo, nombre: career.nombre, ces: String(career.ces), provincia: String(career.provincia) }); setModalOpen(true); }
  async function handleSubmit(event) { event.preventDefault(); try { setBusy(true); setError(""); const payload = { ...form, ces: Number(form.ces), provincia: Number(form.provincia), activa: editing?.activa ?? true }; if (editing) await updateProvincialCareer(editing.id, payload); else await createProvincialCareer(payload); setModalOpen(false); await loadCareers(false); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } }
  async function toggleCareer(career) { try { await updateProvincialCareer(career.id, { activa: !career.activa }); await loadCareers(false); } catch (requestError) { setError(requestError.message); } }
  async function handleDelete(career) { if (!window.confirm(`¿Eliminar la carrera ${career.nombre}?`)) return; try { await deleteProvincialCareer(career.id); await loadCareers(false); } catch (requestError) { setError(requestError.message); } }
  async function handleImport(event) { const file = event.target.files?.[0]; if (!file) return; try { setBusy(true); setError(""); const result = await importProvincialCareers(file); setImportOpen(false); window.alert(`Catálogo reemplazado. ${result.inserted} carreras importadas.`); await loadCareers(false); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); event.target.value = ""; } }
  async function handleExport() { try { const blob = await exportProvincialCareers(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "carreras.xlsx"; link.click(); URL.revokeObjectURL(url); } catch (requestError) { setError(requestError.message); } }

  const filteredCareers = careers.filter((career) => normalize(career.nombre).includes(normalize(search)));
  return <div className="space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Catálogo de Carreras</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Lista de carreras</h1><p className="mt-2 text-sm text-slate-600">Gestiona el catálogo oficial.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={openCreate} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">+ Añadir Carrera</button><button type="button" onClick={() => setImportOpen(true)} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">Importar Excel</button><button type="button" onClick={handleExport} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold">Exportar Excel</button></div></div>{error && <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}</section>
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre" className="w-full max-w-md rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" /><div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200"><table className="min-w-full border-collapse text-sm"><thead className="bg-slate-100 text-left text-slate-500"><tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">CES</th><th className="px-4 py-3">Provincia</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="px-4 py-8 text-center">Cargando carreras...</td></tr> : filteredCareers.length === 0 ? <tr><td colSpan="6" className="px-4 py-8 text-center">No hay carreras para mostrar.</td></tr> : filteredCareers.map((career) => <tr key={career.id} className="border-b border-slate-200 last:border-b-0"><td className="px-4 py-4">{career.codigo}</td><td className="px-4 py-4 font-medium">{career.nombre}</td><td className="px-4 py-4">{career.ces_nombre}</td><td className="px-4 py-4">{career.provincia_nombre}</td><td className="px-4 py-4"><StatusToggle active={career.activa} activeLabel="Activa" inactiveLabel="Inactiva" onClick={() => toggleCareer(career)} /></td><td className="px-4 py-4"><EntityActionButton variant="edit" onClick={() => openEdit(career)}>Editar</EntityActionButton><EntityActionButton variant="delete" className="ml-2" onClick={() => handleDelete(career)}>Eliminar</EntityActionButton></td></tr>)}</tbody></table></div></section>
    {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-semibold">{editing ? "Editar carrera" : "Nueva carrera"}</h2><div className="mt-5 space-y-4">{[["Código", "codigo"], ["Nombre", "nombre"]].map(([label, field]) => <label key={field} className="block text-sm font-semibold">{label}<input required value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label>)}{[["CES", "ces", ces], ["Provincia", "provincia", provinces]].map(([label, field, options]) => <label key={field} className="block text-sm font-semibold">{label}<select required value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal"><option value="">Selecciona {label.toLowerCase()}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.nombre}</option>)}</select></label>)}</div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="rounded-2xl border border-slate-200 px-5 py-3">Cancelar</button><button disabled={busy} type="submit" className="rounded-2xl bg-sky-600 px-5 py-3 font-semibold text-white">{busy ? "Guardando..." : "Guardar"}</button></div></form></div>}
    {importOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-semibold">Importar carreras</h2><p className="mt-3 text-sm text-slate-600">El catálogo actual será reemplazado por las filas del Excel.</p><p className="mt-2 text-xs text-slate-500">Columnas: Código, Nombre, CES, Provincia.</p><input type="file" accept=".xlsx,.xls" onChange={handleImport} className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" /><div className="mt-6 flex justify-end"><button type="button" onClick={() => setImportOpen(false)} className="rounded-2xl border border-slate-200 px-5 py-3">Cancelar</button></div></div></div>}
  </div>;
}
