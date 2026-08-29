import { useEffect, useRef, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage";
import {
  createPlanPlaza,
  deletePlanPlaza,
  downloadPlanPlazaTemplate,
  fetchPlanPlazas,
  fetchProvincialCareers,
  fetchProvincialCes,
  fetchProvincialProvinces,
  fetchProvincialProceso,
  importPlanPlaza,
  updatePlanPlaza,
} from "../../services/api";

const types = [
  ["municipal", "Municipal"],
  ["provincial", "Provincial"],
];

const emptyForm = { carrera: "", cantidad_plazas: 1, otorgamiento_tipo: "municipal", ces: "", provincia: "", sexo: "A", proceso: "" };

export default function PlazasPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [careers, setCareers] = useState([]);
  const [ces, setCes] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [process, setProcess] = useState(null);
  const fileInput = useRef(null);

  async function load() {
    try {
      setError("");
      setItems(await fetchPlanPlazas());
    } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    Promise.all([
      fetchProvincialCareers(),
      fetchProvincialCes(),
      fetchProvincialProvinces(),
      fetchProvincialProceso(),
    ]).then(([careerData, cesData, provinceData, processData]) => {
      setCareers(careerData);
      setCes(cesData);
      setProvinces(provinceData);
      setProcess(processData);
      setForm((current) => ({ ...current, proceso: processData?.id || "" }));
    }).catch((requestError) => setError(requestError.message));
  }, []);
  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function save(event) {
    event.preventDefault();
    try {
      setError("");
      const payload = { ...form, carrera: Number(form.carrera), ces: Number(form.ces), provincia: Number(form.provincia), proceso: Number(form.proceso), cantidad_plazas: Number(form.cantidad_plazas) };
      if (editingId) await updatePlanPlaza(editingId, payload); else await createPlanPlaza(payload);
      setForm(emptyForm); setEditingId(null); setFormOpen(false); setNotice("Plan de plazas guardado."); await load();
    } catch (requestError) { setError(requestError.message); }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await importPlanPlaza(file);
      setNotice(`${result.inserted} registros insertados y ${result.updated} actualizados.`);
      if (result.errors?.length) {
        const detail = result.errors.map((item) => `${item.row}: ${item.error}`).join(" | ");
        setError(detail);
      } else {
        setError("");
      }
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      event.target.value = "";
    }
  }

  async function downloadTemplate() {
    try { const blob = await downloadPlanPlazaTemplate(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "plan-plazas-prueba.xlsx"; link.click(); URL.revokeObjectURL(url); }
    catch (requestError) { setError(requestError.message); }
  }

  function edit(item) {
    setEditingId(item.id);
    setForm({ proceso: item.proceso, carrera: item.carrera, cantidad_plazas: item.cantidad_plazas, otorgamiento_tipo: item.otorgamiento_tipo, ces: item.ces, provincia: item.provincia, sexo: item.sexo });
    setFormOpen(true);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm({ ...emptyForm, proceso: process?.id || "" });
    setFormOpen(true);
  }

  async function remove(item) { if (!window.confirm(`¿Eliminar ${item.nombre_carrera}?`)) return; try { await deletePlanPlaza(item.id); setNotice("Registro eliminado."); await load(); } catch (requestError) { setError(requestError.message); } }

  return <div className="space-y-6"><section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Etapa 3</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Gestión del Plan de Plazas</h1><p className="mt-3 text-sm text-slate-600">Importa y administra las plazas oficiales por carrera.</p></div><div className="flex flex-wrap gap-2"><input ref={fileInput} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} /><button type="button" onClick={() => fileInput.current?.click()} className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white">Importar Excel</button><button type="button" onClick={downloadTemplate} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">Excel de prueba</button><button type="button" onClick={openCreateForm} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Añadir carrera</button></div></div>{error && <FeedbackMessage type="error" className="mt-5 rounded-xl">{error}</FeedbackMessage>}{notice && <FeedbackMessage type="success" className="mt-5 rounded-xl">{notice}</FeedbackMessage>}</section>
  <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-100 text-left"><tr>{["Código", "Carrera", "Plazas", "Tipo", "CES", "Provincia", "Sexo", "Acciones"].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{loading && <tr><td colSpan="8" className="px-4 py-10 text-center text-slate-500">Cargando plan de plazas...</td></tr>}{!loading && !items.length && <tr><td colSpan="8" className="px-4 py-10 text-center text-slate-500">No hay registros.</td></tr>}{items.map((item) => <tr key={item.id}><td className="px-4 py-3">{item.codigo_carrera}</td><td className="px-4 py-3 font-medium">{item.nombre_carrera}</td><td className="px-4 py-3">{item.cantidad_plazas}</td><td className="px-4 py-3">{item.tipo_otorgamiento_label}</td><td className="px-4 py-3">{item.ces_nombre}</td><td className="px-4 py-3">{item.provincia_nombre}</td><td className="px-4 py-3">{item.sexo}</td><td className="flex gap-2 px-4 py-3"><button type="button" onClick={() => edit(item)} className="rounded-xl bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-700">Editar</button><button type="button" onClick={() => remove(item)} className="rounded-xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700">Eliminar</button></td></tr>)}</tbody></table></div></section>{formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-900">{editingId ? "Editar plaza" : "Añadir carrera al plan"}</h2><p className="mt-1 text-sm text-slate-600">Completa los datos del registro de plazas.</p></div><button type="button" onClick={() => { setFormOpen(false); setEditingId(null); setForm(emptyForm); }} className="text-2xl text-slate-500" aria-label="Cerrar">&times;</button></div><form onSubmit={save} className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Carrera<select required value={form.carrera} onChange={updateField("carrera")} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal"><option value="">Selecciona una carrera</option>{careers.map((career) => <option key={career.id} value={career.id}>{career.codigo} · {career.nombre}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Cantidad de plazas<input required min="1" type="number" value={form.cantidad_plazas} onChange={updateField("cantidad_plazas")} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label><label className="text-sm font-semibold text-slate-700">Tipo de otorgamiento<select value={form.otorgamiento_tipo} onChange={updateField("otorgamiento_tipo")} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal">{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">CES<select required value={form.ces} onChange={updateField("ces")} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal"><option value="">Selecciona un CES</option>{ces.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Provincia<select required value={form.provincia} onChange={updateField("provincia")} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal"><option value="">Selecciona una provincia</option>{provinces.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Proceso<select required value={form.proceso} onChange={updateField("proceso")} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal"><option value="">Selecciona un proceso</option>{process && <option value={process.id}>{new Date(process.anio).getFullYear()}</option>}</select></label><label className="text-sm font-semibold text-slate-700">Sexo<select value={form.sexo} onChange={updateField("sexo")} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal"><option value="A">A (Ambos)</option><option value="F">F (Mujeres)</option><option value="M">M (Hombres)</option></select></label><div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={() => { setFormOpen(false); setEditingId(null); setForm(emptyForm); }} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">Cancelar</button><button type="submit" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">{editingId ? "Actualizar" : "Añadir"}</button></div></form></div></div>}</div>;
}
