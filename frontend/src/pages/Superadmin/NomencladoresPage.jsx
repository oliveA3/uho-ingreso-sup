import { useEffect, useState } from "react";
import {
  createSuperAdminCatalogItem,
  deleteSuperAdminCatalogItem,
  fetchSuperAdminCatalog,
  updateSuperAdminCatalogItem,
} from "../../services/api";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import StatusToggle from "../../components/Buttons/StatusToggle";

const catalogs = {
  provincias: {
    title: "Provincias",
    icon: "🗺️",
    fields: [{ name: "nombre", label: "Nombre", type: "text" }],
    activeField: "activa",
  },
  municipios: {
    title: "Municipios",
    icon: "🏘️",
    fields: [
      { name: "nombre", label: "Nombre", type: "text" },
      { name: "provincia", label: "Provincia", type: "select", optionsKey: "provincias" },
    ],
    activeField: "activo",
  },
  escuelas: {
    title: "Escuelas",
    icon: "🏫",
    fields: [
      { name: "nombre", label: "Nombre", type: "text" },
      { name: "codigo", label: "Código", type: "text" },
      { name: "descripcion", label: "Descripción", type: "text" },
      { name: "provincia", label: "Provincia", type: "select", optionsKey: "provincias" },
      { name: "municipio", label: "Municipio", type: "select", optionsKey: "municipios" },
    ],
    activeField: "activa",
  },
  carreras: {
    title: "Carreras",
    icon: "🎓",
    fields: [
      { name: "codigo", label: "Código", type: "text" },
      { name: "nombre", label: "Nombre", type: "text" },
      { name: "ces", label: "Universidad / CES", type: "select", optionsKey: "ces" },
      { name: "provincia", label: "Provincia", type: "select", optionsKey: "provincias" },
    ],
    activeField: "activa",
  },
  ces: {
    title: "CES / Universidades",
    icon: "🏛️",
    fields: [
        { name: "nombre", label: "Nombre", type: "text" },
    ],
    activeField: "activa",
  },
  asignaturas: {
    title: "Asignaturas",
    icon: "📐",
    fields: [{ name: "nombre", label: "Nombre", type: "text" }],
    activeField: "activa",
  },
};

function emptyForm(config) {
  return {
    ...Object.fromEntries(config.fields.map((field) => [field.name, ""])),
    [config.activeField]: true,
  };
}

export default function NomencladoresPage() {
  const [resource, setResource] = useState("provincias");
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [referenceOptions, setReferenceOptions] = useState({ ces: [], provincias: [], municipios: [] });
  const config = catalogs[resource];
  const filteredItems = items.filter((item) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [item.nombre, item.codigo]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
  const activeItems = filteredItems.filter((item) => item[config.activeField]).length;

  async function loadItems() {
    try {
      setError("");
      setItems(await fetchSuperAdminCatalog(resource));
    } catch (requestError) {
      setError(requestError.message);
      setNotice("");
    }
  }

  async function loadReferenceOptions() {
    try {
      const [ces, provincias, municipios] = await Promise.all([
        fetchSuperAdminCatalog("ces"),
        fetchSuperAdminCatalog("provincias"),
        fetchSuperAdminCatalog("municipios"),
      ]);
      setReferenceOptions({ ces, provincias, municipios });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    loadItems();
    if (["municipios", "escuelas", "carreras"].includes(resource)) loadReferenceOptions();
    setSearch("");
    setNotice("");
    setEditing(null);
    setForm(emptyForm(catalogs[resource]));
  }, [resource]);

  useEffect(() => {
    if (resource !== "escuelas" || !form.provincia) return;
    fetchSuperAdminCatalog("municipios", { provincia: form.provincia })
      .then((municipios) => setReferenceOptions((current) => ({ ...current, municipios })))
      .catch((requestError) => setError(requestError.message));
  }, [resource, form.provincia]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(config));
    setModalOpen(true);
  }

  function openEdit(item) {
    const municipality = referenceOptions.municipios.find((option) => option.id === item.municipio);
    setEditing(item);
    setForm({
      ...Object.fromEntries(config.fields.map((field) => [field.name, item[field.name] ?? ""])),
      [config.activeField]: item[config.activeField],
      provincia: municipality?.provincia ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      const payload = { ...form };
      if (resource === "escuelas") delete payload.provincia;
      config.fields.filter((field) => field.type === "number" || field.type === "select").forEach((field) => {
        payload[field.name] = Number(payload[field.name]);
      });
      if (editing) {
        await updateSuperAdminCatalogItem(resource, editing.id, payload);
      } else {
        await createSuperAdminCatalogItem(resource, payload);
      }
      setModalOpen(false);
      setNotice(`El registro de ${config.title.toLowerCase()} se creó correctamente.`);
      await loadItems();
    } catch (requestError) {
      setError(requestError.message);
      setNotice("");
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`¿Eliminar ${item.nombre || item.codigo}?`)) return;
    try {
      setError("");
      setNotice("");
      await deleteSuperAdminCatalogItem(resource, item.id);
      await loadItems();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleActive(item) {
    try {
      setError("");
      setNotice("");
      await updateSuperAdminCatalogItem(resource, item.id, {
        [config.activeField]: !item[config.activeField],
      });
      await loadItems();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">📚 Nomencladores</h1>
            <p className="mt-2 text-sm text-slate-600">Administra los catálogos.</p>
          </div>
          <button type="button" onClick={openCreate} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">
            + Nuevo registro
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(catalogs).map(([key, item]) => (
            <button key={key} type="button" onClick={() => setResource(key)} className={`rounded-3xl border p-5 text-left transition ${resource === key ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-slate-50 hover:bg-white"}`}>
              <span className="text-2xl">{item.icon}</span>
              <span className="mt-3 block text-sm font-semibold text-slate-900">{item.title}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-slate-900">{config.title}</h2>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
              {filteredItems.length} registrados / {activeItems} activados
            </span>
          </div>
        </div>
        {error && <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
        {notice && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
        <div className="mt-5">
          <label htmlFor="nomenclador-search" className="sr-only">Buscar nomenclador</label>
          <input
            id="nomenclador-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Buscar en ${config.title.toLowerCase()}...`}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
          />
        </div>
        <div className="table-scroll mt-5 overflow-x-auto rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-100 text-slate-500"><tr><th className="px-4 py-3">Registro</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 font-medium text-slate-900">{item.nombre || item.codigo}</td>
                  <td className="px-4 py-4"><StatusToggle active={item[config.activeField]} onClick={() => toggleActive(item)} title={item[config.activeField] ? "Desactivar registro" : "Activar registro"} /></td>
                  <td className="px-4 py-4"><EntityActionButton variant="edit" onClick={() => openEdit(item)}>Editar</EntityActionButton><EntityActionButton variant="delete" className="ml-2" onClick={() => handleDelete(item)}>Eliminar</EntityActionButton></td>
                </tr>
              ))}
              {!filteredItems.length && <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-500">{items.length ? "No se encontraron registros." : "No hay registros."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-900">
              {editing ? "Editar" : "Nuevo"} {config.title}
            </h2>
            <div className="mt-5 space-y-4">
              {config.fields.map((field) => (
                <label key={field.name} className="block text-sm font-semibold text-slate-700">
                  {field.label}
                  {field.type === "select" ? (
                    <select
                      required
                      value={form[field.name] ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setForm({
                          ...form,
                          [field.name]: value,
                          ...(resource === "escuelas" && field.name === "provincia" ? { municipio: "" } : {}),
                        });
                      }}
                      disabled={resource === "escuelas" && field.name === "municipio" && !form.provincia}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal"
                    >
                      <option value="">Selecciona una opción</option>
                      {referenceOptions[field.optionsKey].map((option) => (
                        <option key={option.id} value={option.id}>{option.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required={field.name === "nombre" || field.name === "codigo"}
                      type={field.type}
                      value={form[field.name] ?? ""}
                      onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal"
                    />
                  )}
                </label>
              ))}
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form[config.activeField])}
                  onChange={(event) => setForm({ ...form, [config.activeField]: event.target.checked })}
                  className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                Registro activo
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold">Cancelar</button>
              <button type="submit" className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
